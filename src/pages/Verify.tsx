import { BrandMark, LanguageToggle } from "@/components/app-shell";
import { QrScanner, parseScannedValue } from "@/components/qr-scanner";
import { GovId } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAppSeed } from "@/hooks/use-seed";
import { deviceLabel, formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

type Outcome = "valid" | "expiring_soon" | "expired" | "revoked" | "not_found";

const OUTCOME_STYLE: Record<
  Outcome,
  { ring: string; bg: string; text: string; icon: typeof CheckCircle2; labelKey: string }
> = {
  valid: {
    ring: "border-[color-mix(in_oklab,var(--verify)_45%,transparent)]",
    bg: "bg-[color-mix(in_oklab,var(--verify)_12%,transparent)]",
    text: "text-[color-mix(in_oklab,var(--verify)_70%,black)] dark:text-[color-mix(in_oklab,var(--verify)_90%,white)]",
    icon: CheckCircle2,
    labelKey: "verify.verified",
  },
  expiring_soon: {
    ring: "border-[color-mix(in_oklab,var(--caution)_45%,transparent)]",
    bg: "bg-[color-mix(in_oklab,var(--caution)_14%,transparent)]",
    text: "text-[color-mix(in_oklab,var(--caution)_62%,black)] dark:text-[color-mix(in_oklab,var(--caution)_92%,white)]",
    icon: Clock,
    labelKey: "verify.verified",
  },
  expired: {
    ring: "border-destructive/40",
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: AlertTriangle,
    labelKey: "verify.expired",
  },
  revoked: {
    ring: "border-destructive/40",
    bg: "bg-destructive/10",
    text: "text-destructive",
    icon: ShieldAlert,
    labelKey: "verify.revoked",
  },
  not_found: {
    ring: "border-border",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: XCircle,
    labelKey: "verify.notFound",
  },
};

export default function Verify() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  useAppSeed();

  const [term, setTerm] = useState(id ?? "");
  const [submitted, setSubmitted] = useState<string | null>(id ?? null);
  const [scanOpen, setScanOpen] = useState(searchParams.get("scan") === "1");
  const [showRaw, setShowRaw] = useState(false);

  const liveLookup = useQuery(
    api.verify.lookup,
    term.trim().length >= 4 ? { query: term.trim() } : "skip",
  );
  const sample = useQuery(api.verify.sampleCertificate);
  const check = useMutation(api.verify.check);
  const result = useQuery(
    api.verify.recentEvents,
    submitted ? { certificateNumber: submitted } : "skip",
  );

  const [outcome, setOutcome] = useState<{
    found: boolean;
    outcome: Outcome;
    certificate?: Record<string, unknown>;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  // Run an auditable verification whenever the route target changes.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const res = await check({
          query: id,
          source: "public-portal",
          device: deviceLabel(),
        });
        if (cancelled) return;
        setOutcome(res as never);
        setSubmitted(res.found ? (res as { certificate?: { certificateNumber?: string } }).certificate?.certificateNumber ?? id : id);
      } catch {
        if (!cancelled) setOutcome({ found: false, outcome: "not_found" });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, check]);

  const runCheck = useCallback(
    async (value: string) => {
      const query = value.trim();
      if (!query) return;
      setScanOpen(false);
      setSearchParams({}, { replace: true });
      navigate(`/verify/${encodeURIComponent(query)}`);
    },
    [navigate, setSearchParams],
  );

  const previewCertificate = useMemo(() => {
    if (!liveLookup?.found) return null;
    return liveLookup.certificate;
  }, [liveLookup]);

  const activeOutcome: Outcome | null = outcome
    ? (outcome.outcome as Outcome)
    : null;
  const cert = outcome?.certificate as
    | {
        certificateNumber: string;
        instrumentCode: string;
        instrumentType: string;
        instrumentCategory: string;
        manufacturer: string;
        model: string;
        serialNumber: string;
        capacity: string;
        verificationDate: number;
        validUntil: number;
        issuingAuthority: string;
        officerName: string;
        state: string;
        district: string;
        establishment: string;
        location: string;
        revokedReason?: string;
        verificationReference: string;
      }
    | undefined;

  const style = OUTCOME_STYLE[activeOutcome ?? "not_found"];
  const OutcomeIcon = style.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <BrandMark compact />
          <span className="font-display text-sm font-extrabold tracking-[0.16em] text-foreground">
            MetriQ
          </span>
          <span className="hidden rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:inline">
            Online Verification System · Weighing & Measuring Instruments
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("verify.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("verify.subtitle")}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runCheck(term);
          }}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("verify.placeholder")}
              aria-label={t("verify.placeholder")}
              className="h-11 border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 gap-2" disabled={!term.trim()}>
            {t("action.verify")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 gap-2"
            onClick={() => setScanOpen((open) => !open)}
            aria-expanded={scanOpen}
          >
            <ScanLine className="size-4" aria-hidden="true" />
            {t("verify.scanQr")}
          </Button>
        </form>

        {previewCertificate && !id ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <QrCode className="size-3.5" aria-hidden="true" />
            Matches{" "}
            <span className="gov-id text-foreground">{previewCertificate.certificateNumber}</span>
            — press Verify to log an official check.
          </p>
        ) : null}

        {scanOpen ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <QrScanner
              onResult={(raw) => runCheck(parseScannedValue(raw))}
              onFallback={() => setScanOpen(false)}
            />
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-sm font-semibold text-foreground">
                How QR verification works
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every digital certificate carries a QR code that resolves to this page
                with the certificate reference pre-filled. The reference is looked up in
                the central registry and each lookup is written to an append-only
                verification log.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Certificate number",
                  "Instrument ID",
                  "Serial number",
                  "Verification reference",
                ].map((line) => (
                  <p key={line} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-[var(--verify)]"
                      aria-hidden="true"
                    />
                    {line} can be searched directly
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Result panel */}
        {checking ? (
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-6">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Querying the certificate registry…
            </p>
          </div>
        ) : activeOutcome ? (
          <section aria-live="polite" className="mt-8">
            <div className={cn("rounded-2xl border-2 p-6 sm:p-8", style.ring, style.bg)}>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <span
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-full bg-card",
                    style.text,
                  )}
                >
                  <OutcomeIcon className="size-8" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-display text-xl font-extrabold tracking-tight sm:text-2xl",
                      style.text,
                    )}
                  >
                    {activeOutcome === "not_found"
                      ? t("verify.notFound")
                      : activeOutcome === "revoked"
                        ? t("verify.revoked")
                        : activeOutcome === "expired"
                          ? t("verify.expired")
                          : `✓ ${t("verify.verified")}`}
                  </p>
                  {cert ? (
                    <p className="mt-1 text-sm text-foreground/75">
                      {activeOutcome === "expiring_soon"
                        ? `Certificate valid until ${formatDate(cert.validUntil)} — renewal due soon.`
                        : activeOutcome === "expired"
                          ? `Stamping validity ended on ${formatDate(cert.validUntil)}.`
                          : activeOutcome === "revoked"
                            ? cert.revokedReason ?? "Certificate withdrawn by the issuing authority."
                            : `${cert.instrumentType} held by ${cert.establishment} is currently verified.`}
                    </p>
                  ) : (
                    <p className="mt-1 max-w-xl text-sm text-foreground/75">
                      No certificate matched this reference. Check the certificate ID or
                      instrument ID and try again.
                    </p>
                  )}
                </div>
              </div>

              {cert ? (
                <dl className="mt-7 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                  <Detail label={t("verify.label.certificateId")} value={cert.certificateNumber} mono />
                  <Detail label={t("verify.label.instrumentId")} value={cert.instrumentCode} mono />
                  <Detail
                    label={t("verify.label.instrument")}
                    value={`${cert.instrumentType}`}
                  />
                  <Detail label="Manufacturer / Model" value={`${cert.manufacturer} ${cert.model}`} />
                  <Detail label="Serial number" value={cert.serialNumber} mono />
                  <Detail label="Capacity / Class" value={`${cert.capacity} · ${cert.instrumentCategory}`} />
                  <Detail label={t("verify.label.verifiedOn")} value={formatDate(cert.verificationDate)} />
                  <Detail
                    label={t("verify.label.validUntil")}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        {formatDate(cert.validUntil)}
                        {activeOutcome === "valid" ? (
                          <BadgeCheck className="size-3.5 text-[var(--verify)]" aria-hidden="true" />
                        ) : null}
                      </span>
                    }
                  />
                  <Detail label={t("verify.label.issuedBy")} value={cert.issuingAuthority} />
                  <Detail label={t("verify.label.officer")} value={cert.officerName} />
                  <Detail
                    label={t("verify.label.location")}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {cert.location}
                      </span>
                    }
                  />
                  <Detail
                    label={t("verify.label.state")}
                    value={`${cert.district}, ${cert.state}`}
                  />
                  <Detail
                    label={t("verify.label.establishment")}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {cert.establishment}
                      </span>
                    }
                  />
                  <Detail label="Verification reference" value={cert.verificationReference} mono />
                </dl>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {t("verify.online")} {formatDateTime(Date.now())}
                </span>
                {cert ? (
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="hover:text-foreground"
                  >
                    {showRaw ? "Hide" : "Show"} raw registry payload
                  </button>
                ) : null}
              </div>

              {showRaw && cert ? (
                <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-border bg-card p-3 text-[11px] leading-4 text-muted-foreground">
                  {JSON.stringify(cert, null, 2)}
                </pre>
              ) : null}
            </div>

            {result?.length ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                  <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                  Verification history for this certificate
                </h2>
                <ul className="mt-3 divide-y divide-border/60">
                  {result.map((event) => (
                    <li
                      key={event._id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {formatDateTime(event.verifiedAt)}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {event.source}
                        </span>
                        <span className="gov-id text-xs">{event.device ?? "—"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : !id ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Recognised reference formats
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Certificate ID", sample: sample?.certificateNumber },
                { label: "Instrument ID", sample: sample?.instrumentCode },
                { label: "Verification reference", sample: sample?.verificationReference },
                { label: "Serial number", sample: sample?.serialNumber },
              ]
                .filter((item): item is { label: string; sample: string } =>
                  Boolean(item.sample),
                )
                .map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runCheck(item.sample)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <GovId>{item.sample}</GovId>
                  </button>
                ))}
              {!sample ? (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Demo registry records are being prepared. Reload in a moment to see live
                  sample references.
                </p>
              ) : null}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Demo references are seeded sample records. In production, values would be
              generated per certificate at issuance.
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-[color-mix(in_oklab,var(--caution)_35%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-4">
          <p className="text-xs leading-5 text-muted-foreground">
            <AlertTriangle
              className="mr-1.5 inline size-3.5 align-[-2px] text-[color-mix(in_oklab,var(--caution)_70%,black)]"
              aria-hidden="true"
            />
            {lang === "hi" ? t("verify.disclaimer") : t("verify.disclaimer")}
          </p>
        </div>
      </main>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn("text-right text-sm font-medium text-foreground", mono && "gov-id")}>
        {value}
      </dd>
    </div>
  );
}
