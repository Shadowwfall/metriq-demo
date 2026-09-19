import { AppShell } from "@/components/app-shell";
import { CertificateSheet } from "@/components/certificate-sheet";
import { DigiLockerDialog } from "@/components/digilocker-dialog";
import { QrDownload } from "@/components/qr-code";
import { QRCodeCanvas } from "qrcode.react";
import { StatusBadge } from "@/components/status-badge";
import { DataRow, EmptyState, LoadingBlock, SectionHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  daysUntil,
  deviceLabel,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Download,
  ExternalLink,
  History,
  Info,
  KeyRound,
  Loader2,
  Printer,
  Share2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

export default function CertificateDetail() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const { t } = useI18n();
  const profile = useQuery(api.profiles.current);
  const data = useQuery(
    api.certificates.get,
    certificateId ? { id: certificateId as Id<"certificates"> } : "skip",
  );
  const revoke = useMutation(api.certificates.revoke);
  const [digilockerOpen, setDigilockerOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [downloading, setDownloading] = useState(false);
  const qrHolderRef = useRef<HTMLDivElement>(null);

  const verifyUrl = useMemo(() => {
    if (typeof window === "undefined" || !data) return "";
    return `${window.location.origin}/verify/${data.certificate.certificateNumber}`;
  }, [data]);

  if (data === undefined) {
    return (
      <AppShell title="Certificate" breadcrumb={[{ label: t("nav.certificates") }]}>
        <LoadingBlock rows={4} />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Certificate" breadcrumb={[{ label: t("nav.certificates") }]}>
        <EmptyState
          icon={ShieldAlert}
          title="Certificate not found"
          body="The certificate reference does not exist or you do not have access to it."
          action={
            <Button asChild>
              <Link to="/dashboard/certificates">{t("nav.certificates")}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const cert = data.certificate;
  const days = daysUntil(cert.validUntil);
  const canRevoke =
    ["dept_admin", "ministry", "admin"].includes(profile?.role ?? "") &&
    cert.status !== "revoked";

  const sheetData = {
    certificateNumber: cert.certificateNumber,
    verificationReference: cert.verificationReference,
    instrumentCode: cert.instrumentCode,
    instrumentCategory: cert.instrumentCategory,
    instrumentType: cert.instrumentType,
    manufacturer: cert.manufacturer,
    model: cert.model,
    serialNumber: cert.serialNumber,
    capacity: cert.capacity,
    accuracyClass: cert.accuracyClass,
    ownerName: cert.ownerName,
    locationLabel: cert.locationLabel,
    district: cert.district,
    state: cert.state,
    verificationDate: cert.verificationDate,
    validUntil: cert.validUntil,
    issuingAuthority: cert.issuingAuthority,
    officerName: cert.officerName,
    status: cert.status,
    result: cert.result,
  };

  const handlePdf = async () => {
    setDownloading(true);
    try {
      // Reuse the on-screen QR canvas so the PDF needs no extra QR dependency.
      const canvas = qrHolderRef.current?.querySelector("canvas");
      const qrPng = canvas?.toDataURL("image/png");
      if (!qrPng) throw new Error("QR canvas unavailable");
      await downloadCertificatePdf(sheetData, verifyUrl, qrPng);
      toast.success("Certificate PDF downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Could not generate the PDF in this browser");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Certificate ${cert.certificateNumber}`,
      text: `Verify ${cert.instrumentType} certificate ${cert.certificateNumber}`,
      url: verifyUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(verifyUrl);
      toast.success("Verification link copied");
    } catch {
      toast.error("Sharing is unavailable in this browser");
    }
  };

  return (
    <AppShell
      title={cert.certificateNumber}
      breadcrumb={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.certificates"), to: "/dashboard/certificates" },
        { label: cert.certificateNumber },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={handlePdf} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            {t("action.downloadPdf")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            {t("action.print")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setDigilockerOpen(true)}
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {t("action.saveDigilocker")}
          </Button>
          {canRevoke ? (
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setRevokeOpen(true)}
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              Revoke
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="print-root grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {/* Off-screen QR source used when embedding the code into the PDF */}
          <div ref={qrHolderRef} className="hidden" aria-hidden="true">
            <QRCodeCanvas
              value={verifyUrl}
              size={512}
              level="M"
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#16305a"
            />
          </div>

          <CertificateSheet data={sheetData} verifyUrl={verifyUrl} />

          <div className="no-print mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <ExternalLink className="size-4 text-primary" aria-hidden="true" />
                Public verification link
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Anyone scanning the QR code on this certificate lands here. Each lookup is
                written to the verification log.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input readOnly value={verifyUrl} className="gov-id h-9 text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(verifyUrl);
                    toast.success("Link copied");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-start rounded-xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
                <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
                QR code
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Download the QR as a PNG for use on the instrument or in records.
              </p>
              <div className="mt-3">
                <QrDownload
                  value={verifyUrl}
                  fileName={`${cert.certificateNumber}-qr`}
                  size={150}
                  buttonLabel="Download QR"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="no-print space-y-6">
          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Validity" icon={BadgeCheck} />
            <div className="space-y-1">
              <DataRow label="Status" value={<StatusBadge status={cert.status} />} />
              <DataRow label="Verified on" value={formatDate(cert.verificationDate)} />
              <DataRow label="Valid until" value={formatDate(cert.validUntil)} />
              <DataRow
                label="Balance"
                value={
                  days !== null
                    ? days >= 0
                      ? `${days} days remaining`
                      : `lapsed ${Math.abs(days)} days ago`
                    : "—"
                }
              />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-2 rounded-full",
                  cert.status === "valid"
                    ? "bg-[var(--verify)]"
                    : cert.status === "expiring_soon"
                      ? "bg-[var(--caution)]"
                      : "bg-destructive",
                )}
                style={{
                  width: `${Math.max(
                    4,
                    Math.min(100, ((days ?? 0) / 365) * 100),
                  )}%`,
                }}
              />
            </div>
            {cert.status === "revoked" ? (
              <p className="mt-3 rounded-lg border border-destructive/35 bg-destructive/8 p-3 text-xs text-destructive">
                {cert.revokedReason ?? "Revoked by the issuing authority."}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Linked records" icon={Info} />
            <div className="space-y-1">
              <DataRow label="Application" value={data.application?.applicationNumber ?? "—"} mono />
              <DataRow label="Instrument" value={cert.instrumentCode} mono />
              <DataRow label="Inspection" value={data.inspection ? "Recorded" : "Not linked"} />
              <DataRow
                label="Registered address"
                value={data.organization ? `${data.organization.district}, ${data.organization.state}` : "—"}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {data.instrument ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/dashboard/instruments/${data.instrument._id}`}>
                    Open instrument record
                  </Link>
                </Button>
              ) : null}
              {data.application ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/dashboard/applications/${data.application._id}`}>
                    Open application
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to={`/verify/${cert.certificateNumber}`}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Preview public page
                </Link>
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Verification log" icon={History} />
            {data.verificationEvents.length ? (
              <ul className="space-y-2">
                {data.verificationEvents.slice(0, 6).map((event) => (
                  <li key={event._id} className="border-b border-border/60 pb-2 last:border-0">
                    <p className="text-sm text-foreground">{formatDateTime(event.verifiedAt)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.outcome.replace(/_/g, " ")} · {event.source}
                      {event.city ? ` · ${event.city}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No public lookups recorded yet.
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Last checked from {deviceLabel()}.
            </p>
          </section>

          {data.instrumentHistory.length > 1 ? (
            <section className="rounded-xl border border-border bg-card p-4">
              <SectionHeader title="Instrument history" icon={History} />
              <ul className="space-y-2">
                {data.instrumentHistory.slice(0, 6).map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span>
                      <span className="block gov-id text-xs">
                        {item.certificateNumber}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {formatDate(item.verificationDate)}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <DigiLockerDialog
        open={digilockerOpen}
        onOpenChange={setDigilockerOpen}
        certificateNumber={cert.certificateNumber}
        holderName={cert.ownerName}
      />

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke certificate</DialogTitle>
            <DialogDescription>
              Revoking invalidates {cert.certificateNumber} immediately. Public verification
              will report the certificate as revoked and the instrument will be suspended.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/35 bg-destructive/8 p-3">
            <p className="flex items-start gap-2 text-xs leading-5 text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This action is recorded in the audit trail and cannot be undone in the
              prototype.
            </p>
          </div>
          <Input
            value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)}
            placeholder="Reason for revocation"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRevokeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={revokeReason.trim().length < 5}
              onClick={async () => {
                try {
                  await revoke({ id: cert._id, reason: revokeReason.trim() });
                  toast.success("Certificate revoked");
                  setRevokeOpen(false);
                  setRevokeReason("");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Revocation failed");
                }
              }}
            >
              Confirm revocation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
