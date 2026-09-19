import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { compressImage, humanFileSize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

type PendingDoc = {
  id: string;
  kind: string;
  fileName: string;
  fileType: string;
  sizeKb: number;
  dataUrl?: string;
};

const KINDS = [
  "Previous certificate",
  "Purchase invoice",
  "Instrument photograph",
  "GST registration certificate",
  "Identity proof",
];

export default function NewApplication() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const instrumentFromQuery = searchParams.get("instrument");

  const profile = useQuery(api.profiles.current);
  const instruments = useQuery(
    api.instruments.list,
    profile?.organization
      ? { organizationId: profile.organization._id as Id<"organizations">, limit: 80 }
      : "skip",
  );
  const submitApplication = useMutation(api.applications.submit);

  const [instrumentId, setInstrumentId] = useState<string>(instrumentFromQuery ?? "");
  const [type, setType] = useState<"new" | "re_verification">("new");
  const [intendedUse, setIntendedUse] = useState("Trade transactions and weighment of goods");
  const [location, setLocation] = useState("");
  const [previousCertNumber, setPreviousCertNumber] = useState("");
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [kind, setKind] = useState(KINDS[1]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select an eligible instrument if none chosen yet.
  const defaultInstrument = useMemo(() => {
    if (!instruments?.length) return null;
    const notDue = instruments.find((i) => i.status !== "suspended") ?? instruments[0];
    return notDue;
  }, [instruments]);

  useEffect(() => {
    if (!instrumentId && defaultInstrument) setInstrumentId(defaultInstrument._id);
  }, [instrumentId, defaultInstrument]);

  useEffect(() => {
    if (!instrumentId || instruments === undefined) return;
    const chosen = instruments.find((i) => i._id === instrumentId);
    if (chosen) setLocation(chosen.locationLabel);
  }, [instrumentId, instruments]);

  const chosenInstrument = instruments?.find((i) => i._id === instrumentId);

  const addDoc = async (file: File | null) => {
    if (!file) return;
    const dataUrl = file.type.startsWith("image/")
      ? await compressImage(file)
      : undefined;
    setDocs((prev) => [
      ...prev,
      {
        id: `d-${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        kind,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        sizeKb: Math.round(file.size / 1024) || 1,
        dataUrl,
      },
    ]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!instrumentId) {
      setError("Select the instrument to be verified.");
      return;
    }
    if (docs.length === 0) {
      setError("Attach at least one supporting document.");
      return;
    }
    if (type === "re_verification" && !previousCertNumber.trim()) {
      setError("Provide the previous certificate number for a re-verification request.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitApplication({
        instrumentId: instrumentId as Id<"instruments">,
        type,
        intendedUse,
        locationOfInstrument: location || chosenInstrument?.locationLabel || "",
        previousCertificateNumber: type === "re_verification" ? previousCertNumber.trim() : undefined,
        documents: docs.map(({ id: _omit, ...rest }) => rest),
      });
      toast.success(`Application ${result.applicationNumber} submitted`);
      navigate(`/dashboard/applications/${result.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message.replace(/^.*:\s*/, "")
          : "Submission failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={t("action.newApplication")}
      description="Submit a new or re-verification application for a registered instrument."
      breadcrumb={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.applications"), to: "/dashboard/applications" },
        { label: "New application" },
      ]}
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/8 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">
            Instrument and verification type
          </legend>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Registered instrument</Label>
              <Select value={instrumentId} onValueChange={setInstrumentId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select an instrument" />
                </SelectTrigger>
                <SelectContent>
                  {instruments?.map((instrument) => (
                    <SelectItem key={instrument._id} value={instrument._id}>
                      {instrument.instrumentCode} · {instrument.instrumentType} ·{" "}
                      {instrument.status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chosenInstrument ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {chosenInstrument.manufacturer} {chosenInstrument.model} ·{" "}
                  {chosenInstrument.serialNumber} · {chosenInstrument.capacity}
                </p>
              ) : null}
            </div>

            <div>
              <Label className="text-sm font-medium">Verification type</Label>
              <RadioGroup
                className="mt-2 grid gap-2 sm:grid-cols-2"
                value={type}
                onValueChange={(value) => setType(value as typeof type)}
              >
                {(["new", "re_verification"] as const).map((option) => (
                  <Label
                    key={option}
                    className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 transition-colors has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-accent"
                  >
                    <RadioGroupItem value={option} />
                    <span>
                      <span className="block text-sm font-medium">
                        {option === "new" ? "New Verification" : "Re-verification"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option === "new"
                          ? "First stamping or an unregulated instrument is being brought into trade."
                          : "Previous stamping is about to expire or has expired."}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {type === "re_verification" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Previous certificate number" required>
                  <Input
                    className="mt-1.5"
                    value={previousCertNumber}
                    onChange={(event) => setPreviousCertNumber(event.target.value)}
                    placeholder="LM-RJ-2025-000412"
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">Use and location</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="use" className="text-sm font-medium">
                Intended use
              </Label>
              <Input
                id="use"
                className="mt-1.5"
                required
                value={intendedUse}
                onChange={(event) => setIntendedUse(event.target.value)}
                placeholder="Trade transactions and weighment of goods"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location of instrument at the time of verification
              </Label>
              <Input
                id="location"
                className="mt-1.5"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Billing counter, Sales floor"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The officer verifies the instrument at this exact location. Leave blank to
                use the registered site.
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">
            Supporting documents
          </legend>
          <p className="text-sm text-muted-foreground">
            Attach purchase documents, previous certificates, GST records or
            instrument photographs. Images are compressed on the device.
          </p>

          <div className="mt-4 space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                  {doc.dataUrl ? (
                    <img src={doc.dataUrl} alt="" className="size-full object-cover" />
                  ) : doc.fileType.startsWith("image/") ? (
                    <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{doc.fileName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {doc.kind} · {humanFileSize(doc.sizeKb)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${doc.fileName}`}
                  onClick={() => setDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
              <div className="min-w-0 flex-1">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">
                  Document type
                </Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="shrink-0">
                <input
                  type="file"
                  accept="image/*,.pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    void addDoc(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  <Upload className="size-4" aria-hidden="true" />
                  Attach file
                </span>
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              {docs.length} file{docs.length === 1 ? "" : "s"} attached. Each file should be
              legible on a single photograph.
            </p>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Submit application
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/applications")}>
            {t("action.cancel")}
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Once submitted, the department reviews your documents. If they are
          accepted, an inspection is scheduled automatically and a notification is
          dispatched to your portal.
        </p>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}
