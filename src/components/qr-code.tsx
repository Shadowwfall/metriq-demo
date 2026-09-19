import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export function QrCode({
  value,
  size = 132,
  className,
  label,
  level = "M",
  includeMargin = false,
}: {
  value: string;
  size?: number;
  className?: string;
  label?: string;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
}) {
  return (
    <figure
      className={cn(
        "inline-flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-3",
        className,
      )}
    >
      {/* Vector version for crisp print output inside the certificate sheet */}
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        marginSize={includeMargin ? 2 : 1}
        bgColor="#ffffff"
        fgColor="#16305a"
        title={label ?? "Verification QR code"}
      />
      {label ? (
        <figcaption className="max-w-44 text-center text-[11px] leading-4 text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Canvas-backed QR with a PNG download — also reused for PDF embedding. */
export function QrDownload({
  value,
  fileName,
  size = 220,
  buttonLabel,
}: {
  value: string;
  fileName: string;
  size?: number;
  buttonLabel: string;
}) {
  const holder = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = holder.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${fileName}.png`;
    link.click();
  };

  return (
    <div ref={holder} className="inline-flex flex-col items-center gap-2">
      <div className="rounded-xl border border-border bg-white p-3">
        <QRCodeCanvas
          value={value}
          size={size}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#16305a"
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={download} className="gap-2">
        <Download className="size-3.5" />
        {buttonLabel}
      </Button>
    </div>
  );
}
