import { QrCode } from "@/components/qr-code";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export interface CertificateSheetData {
  certificateNumber: string;
  verificationReference: string;
  instrumentCode: string;
  instrumentCategory: string;
  instrumentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: string;
  accuracyClass: string;
  ownerName: string;
  locationLabel: string;
  district: string;
  state: string;
  verificationDate: number;
  validUntil: number;
  issuingAuthority: string;
  officerName: string;
  status: string;
  result: string;
}

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  valid: {
    label: "VALID",
    className:
      "bg-[color-mix(in_oklab,var(--verify)_16%,transparent)] text-[color-mix(in_oklab,var(--verify)_68%,black)] border-[color-mix(in_oklab,var(--verify)_45%,transparent)]",
  },
  expiring_soon: {
    label: "VALID — RENEWAL DUE",
    className:
      "bg-[color-mix(in_oklab,var(--caution)_16%,transparent)] text-[color-mix(in_oklab,var(--caution)_62%,black)] border-[color-mix(in_oklab,var(--caution)_45%,transparent)]",
  },
  expired: {
    label: "EXPIRED",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
  revoked: {
    label: "REVOKED",
    className: "bg-destructive/10 text-destructive border-destructive/40",
  },
};

/**
 * The certificate as it would appear on paper. Also the element the browser
 * print dialog targets, so `Print certificate` produces a clean A4 page.
 */
export function CertificateSheet({
  data,
  verifyUrl,
  className,
}: {
  data: CertificateSheetData;
  verifyUrl: string;
  className?: string;
}) {
  const chip = STATUS_CHIP[data.status] ?? STATUS_CHIP.valid;

  const rows: [string, string][] = [
    ["Instrument ID", data.instrumentCode],
    ["Instrument type", data.instrumentType],
    ["Category", data.instrumentCategory],
    ["Manufacturer", data.manufacturer],
    ["Model", data.model],
    ["Serial number", data.serialNumber],
    ["Capacity", data.capacity],
    ["Accuracy class", data.accuracyClass],
    ["Owner / establishment", data.ownerName],
    ["Location of instrument", data.locationLabel],
    ["District / State", `${data.district}, ${data.state}`],
    ["Verification date", formatDate(data.verificationDate)],
    ["Valid until", formatDate(data.validUntil)],
    ["Verifying officer", data.officerName],
  ];

  return (
    <article
      className={cn(
        "print-sheet mx-auto w-full max-w-3xl rounded-xl border border-border bg-white p-6 text-[#1c2838] shadow-sm sm:p-9",
        className,
      )}
      aria-label={`Digital verification certificate ${data.certificateNumber}`}
    >
      {/* Header */}
      <header className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#1d3b68] text-white">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="text-left">
            <p className="font-display text-[13px] leading-4 font-extrabold tracking-[0.14em] text-[#1d3b68]">
              METRIQ
            </p>
            <p className="text-[10px] leading-3 text-[#6e7887]">
              Digital Verification. Trusted Measurement.
            </p>
          </div>
        </div>
        <p className="mt-4 font-display text-base font-bold tracking-wide text-[#1d3b68] uppercase sm:text-lg">
          Government of India
        </p>
        <p className="mt-1 text-[11px] text-[#5a6473]">
          Ministry of Consumer Affairs, Food &amp; Public Distribution
        </p>
        <p className="text-[11px] text-[#5a6473]">
          Department of Consumer Affairs · Legal Metrology
        </p>
        <div className="mx-auto mt-3 h-[3px] w-28 rounded-full bg-[#e79a33]" />
      </header>

      {/* Title band */}
      <div className="mt-5 rounded-md bg-[#1d3b68] px-4 py-2.5 text-center">
        <h1 className="font-display text-sm font-bold tracking-[0.1em] text-white uppercase sm:text-base">
          Digital Verification Certificate
        </h1>
      </div>

      {/* Identity + QR */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10px] tracking-wide text-[#6e7887] uppercase">
            Certificate number
          </p>
          <p className="gov-id mt-0.5 text-lg font-bold text-[#16305a] sm:text-xl">
            {data.certificateNumber}
          </p>
          <p className="mt-3 text-[10px] tracking-wide text-[#6e7887] uppercase">
            Verification reference
          </p>
          <p className="gov-id mt-0.5 text-xs text-[#3c4859]">
            {data.verificationReference}
          </p>
          <span
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide",
              chip.className,
            )}
          >
            {chip.label}
          </span>
        </div>

        <QrCode
          value={verifyUrl}
          size={116}
          label="Scan to verify certificate authenticity"
          className="border-[#cdd4de]"
        />
      </div>

      {/* Detail grid */}
      <dl className="mt-6 grid gap-x-8 border-t border-[#e4e8ee] pt-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 border-b border-[#eef1f5] py-2"
          >
            <dt className="text-[10px] font-medium tracking-wide text-[#6e7887] uppercase">
              {label}
            </dt>
            <dd className="text-right text-[12.5px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-1 grid gap-x-8 sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#eef1f5] py-2">
          <dt className="text-[10px] font-medium tracking-wide text-[#6e7887] uppercase">
            Issuing authority
          </dt>
          <dd className="text-right text-[12.5px] font-semibold">{data.issuingAuthority}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-[#eef1f5] py-2">
          <dt className="text-[10px] font-medium tracking-wide text-[#6e7887] uppercase">
            Verification result
          </dt>
          <dd className="text-right text-[12.5px] font-semibold text-[#0f6b25] uppercase">
            {data.result}
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-md border border-[#e4e8ee] bg-[#f7f9fc] p-3 text-[11px] leading-5 text-[#5a6473]">
        This certificate records the outcome of a field verification carried out under the
        conceptual requirements of the Legal Metrology Act, 2009 and the Legal Metrology
        (General) Rules, 2011. The instrument described above was found to comply with the
        prescribed limits at the time of verification.
      </p>

      {/* Footer */}
      <footer className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[#cdd4de] pt-4">
        <div>
          <p className="text-[11px] font-bold text-[#1d3b68]">Digital certificate</p>
          <p className="mt-0.5 text-[10px] text-[#6e7887]">
            {data.issuingAuthority} · generated {formatDate(Date.now())}
          </p>
          <p className="mt-1 max-w-md text-[10px] leading-4 text-[#8a94a3]">
            PROTOTYPE DEMONSTRATION — not an official Government of India certificate and
            carries no legal validity.
          </p>
        </div>
        <p className="gov-id text-[10px] text-[#8a94a3]">{verifyUrl}</p>
      </footer>
    </article>
  );
}
