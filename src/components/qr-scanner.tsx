import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

/**
 * Camera based QR scanning.
 *
 * Uses the native `BarcodeDetector` when the browser provides it (Chrome on
 * Android/ChromeOS). Otherwise the component degrades to a clear message so the
 * user can type the certificate ID instead — never a dead end.
 */
export function QrScanner({
  onResult,
  onFallback,
}: {
  onResult: (text: string) => void;
  onFallback?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);

      const Ctor = (
        window as unknown as { BarcodeDetector: BarcodeDetectorCtor }
      ).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            stop();
            onResult(value);
            return;
          }
        } catch {
          /* frames occasionally fail to decode — keep scanning */
        }
        setTimeout(tick, 350);
      };
      setTimeout(tick, 600);
    } catch {
      setError(
        "Camera access was blocked. Allow camera permission, or type the certificate ID instead.",
      );
      setActive(false);
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  if (!supported) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
        <CameraOff className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">
          In-browser scanning is unavailable
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          This browser does not expose the Barcode Detection API. Enter the certificate
          ID, or open the QR link printed on the certificate.
        </p>
        {onFallback ? (
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onFallback}>
            Enter certificate ID instead
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="relative overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: "4 / 3" }}>
        <video
          ref={videoRef}
          muted
          playsInline
          className="size-full object-cover"
          aria-label="QR camera preview"
        />
        {active ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="size-40 rounded-xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}
        {!active ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <Camera className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-56 text-xs text-muted-foreground">
              Point the camera at the QR code printed on the certificate.
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        {active ? (
          <Button type="button" variant="outline" className="flex-1" onClick={stop}>
            Stop scanning
          </Button>
        ) : (
          <Button type="button" className="flex-1 gap-2" onClick={start} disabled={starting}>
            {starting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-4" aria-hidden="true" />
            )}
            Start camera
          </Button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        Camera frames are processed on this device and are never uploaded.
      </p>
    </div>
  );
}

/** Extracts the certificate token from a scanned URL or raw text. */
export function parseScannedValue(raw: string) {
  const value = raw.trim();
  const match = value.match(/\/verify\/([^/?#\s]+)/i);
  if (match) return decodeURIComponent(match[1]);
  const direct = value.match(/[A-Z]{2,3}-[A-Z]{2,3}-\d{4}-\d{4,6}/i);
  if (direct) return direct[0];
  return value;
}
