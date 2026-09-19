import { QrCode as QrCodeBlock } from "@/components/qr-code";
import { StatusBadge } from "@/components/status-badge";
import { DataRow, LoadingBlock } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOnlineStatus } from "@/hooks/use-online";
import { compressImage, deviceLabel, distanceKm, formatClock, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { newRecordId, putRecord, type SyncState } from "@/lib/offline";
import { cn } from "@/lib/utils";
import type { FunctionArgs } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  ExternalLink,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

type Measurement = {
  id: string;
  testLoad: number;
  unit: string;
  observedReading: number;
  error: number;
  permissibleError: number;
  result: "pass" | "fail";
  notes?: string;
};

type Observations = {
  physicalCondition?: string;
  sealCondition?: string;
  displayCondition?: string;
  accuracy?: string;
  stampingStatus?: string;
  tamperingIndicators?: string;
  complianceNotes?: string;
};

type InspectionResult =
  | "verified"
  | "not_verified"
  | "requires_correction"
  | "re_inspection_required";

type Gps = { lat: number; lng: number; accuracy?: number; capturedAt: number; label?: string };
type Photo = { id: string; kind: string; dataUrl?: string; capturedAt: number; note?: string };
type DraftPatch = Omit<FunctionArgs<typeof api.inspections.saveDraft>, "id">;

const PHOTO_KINDS = [
  { kind: "front", label: "Front photograph" },
  { kind: "serial", label: "Serial number photograph" },
  { kind: "display", label: "Display photograph" },
  { kind: "location", label: "Location photograph" },
  { kind: "evidence", label: "Additional evidence" },
];

const STEPS = [
  "field.step1",
  "field.step2",
  "field.step3",
  "field.step4",
  "field.step5",
  "field.step6",
  "field.step7",
  "field.step8",
  "field.step9",
] as const;

const RESULT_OPTIONS: {
  value: InspectionResult;
  label: string;
  hint: string;
  tone: string;
}[] = [
  {
    value: "verified",
    label: "VERIFIED",
    hint: "All test loads fall within permissible error. Certificate will be issued automatically.",
    tone: "verify",
  },
  {
    value: "not_verified",
    label: "NOT VERIFIED",
    hint: "Instrument failed the accuracy test and cannot be certified.",
    tone: "danger",
  },
  {
    value: "requires_correction",
    label: "REQUIRES CORRECTION",
    hint: "Defects were observed. Instrument must be corrected before re-inspection.",
    tone: "caution",
  },
  {
    value: "re_inspection_required",
    label: "RE-INSPECTION REQUIRED",
    hint: "Testing could not be completed at this visit.",
    tone: "caution",
  },
];

function parseCapacity(capacity: string) {
  const match = capacity.replace(/,/g, "").match(/([\d.]+)/);
  return match ? Number(match[1]) : 50;
}

/* ── signature pad ──────────────────────────────────────────────────────── */

function SignaturePad({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#16305a";
    }
  }, []);

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-xl border border-dashed border-border bg-white"
        aria-label="Draw your signature"
        onPointerDown={(event) => {
          drawing.current = true;
          const ctx = canvasRef.current?.getContext("2d");
          const { x, y } = position(event);
          ctx?.beginPath();
          ctx?.moveTo(x, y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          const { x, y } = position(event);
          ctx?.lineTo(x, y);
          ctx?.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          const canvas = canvasRef.current;
          if (canvas) onChange(canvas.toDataURL("image/png"));
        }}
        onPointerLeave={() => {
          drawing.current = false;
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Sign inside the box using a finger, stylus or mouse.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            onChange(null);
          }}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </div>
      {value ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[color-mix(in_oklab,var(--verify)_70%,black)]">
          <Check className="size-3.5" aria-hidden="true" />
          Signature captured
        </p>
      ) : null}
    </div>
  );
}

/* ── main screen ────────────────────────────────────────────────────────── */

export default function FieldVerification() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const online = useOnlineStatus();

  const data = useQuery(
    api.inspections.byApplication,
    applicationId ? { applicationId: applicationId as Id<"applications"> } : "skip",
  );
  const startInspection = useMutation(api.inspections.start);
  const saveDraft = useMutation(api.inspections.saveDraft);
  const submitResult = useMutation(api.inspections.submitResult);
  const issueCertificateNow = useMutation(api.inspections.issueCertificate);

  const [step, setStep] = useState(0);
  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "ready" | "denied">("idle");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [observations, setObservations] = useState<Observations>({});
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [remarks, setRemarks] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [idConfirmed, setIdConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState<SyncState | null>(null);
  const [completed, setCompleted] = useState<{
    certificateId?: string | null;
    certificateNumber?: string | null;
  } | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const hydrated = useRef<string | null>(null);

  const inspection = data?.inspection;
  const application = data?.application;
  const instrument = data?.instrument;
  const organization = data?.organization;
  const category = data?.category;

  // Present once a certificate exists for this inspection — either because the
  // officer issued it in this session or on an earlier visit.
  const issuedCertificate = useQuery(
    api.certificates.get,
    inspection?.certificateId ? { id: inspection.certificateId } : "skip",
  );
  const certificateId = completed?.certificateId ?? inspection?.certificateId ?? null;
  const certificateNumber =
    completed?.certificateNumber ?? issuedCertificate?.certificate.certificateNumber ?? null;

  // Hydrate local state from the persisted inspection record once.
  useEffect(() => {
    if (!inspection || !instrument) return;
    if (hydrated.current === inspection._id) return;
    hydrated.current = inspection._id;

    setGps(inspection.gps ?? null);
    setGpsStatus(inspection.gps ? "ready" : "idle");
    setPhotos((inspection.photos as Photo[]) ?? []);
    setObservations((inspection.observations as Observations) ?? {});
    setResult((inspection.result as InspectionResult) ?? null);
    setRemarks(inspection.officerRemarks ?? "");
    setSignature(inspection.signatureDataUrl ?? null);
    setIdConfirmed(Boolean(inspection.instrumentIdentification));

    // An inspection that was already submitted reopens on the report review
    // screen, where the certificate can still be approved and issued.
    if (inspection.status === "completed" || inspection.status === "synced") {
      setQueued("synced");
      setCompleted({
        certificateId: inspection.certificateId ?? null,
        certificateNumber: null,
      });
    }

    const saved = (inspection.measurements as Measurement[]) ?? [];
    if (saved.length) {
      setMeasurements(saved);
    } else if (category) {
      const capacity = parseCapacity(instrument.capacity);
      const unit = category.unit === "tonne" ? "kg" : category.unit;
      const multiplier = category.unit === "tonne" ? 1000 : 1;
      setMeasurements(
        category.testSteps
          .filter((pct) => pct > 0)
          .map((pct, index) => {
            const testLoad = Number(
              ((capacity * multiplier * pct) / 100).toFixed(2),
            );
            const permissibleError = Number(
              Math.max(testLoad * (category.maxPermissibleErrorPct / 100), 0.001).toFixed(3),
            );
            return {
              id: `m-${index}`,
              testLoad,
              unit,
              observedReading: testLoad,
              error: 0,
              permissibleError,
              result: "pass" as const,
            };
          }),
      );
    }
  }, [inspection, instrument, category]);

  const currentStep = STEPS[step];

  const persist = useCallback(
    async (patch: DraftPatch) => {
      if (!inspection) return;
      setSaving(true);
      try {
        await saveDraft({ id: inspection._id, ...patch });
      } catch (error) {
        console.warn("[METRIQ] draft autosave failed", error);
      } finally {
        setSaving(false);
      }
    },
    [inspection, saveDraft],
  );

  const captureGps = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("denied");
      return;
    }
    setGpsStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: Gps = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
          capturedAt: Date.now(),
          label: instrument ? `${instrument.locationLabel}, ${instrument.district}` : undefined,
        };
        setGps(next);
        setGpsStatus("ready");
        void persist({ gps: next });
        toast.success("Location captured");
      },
      () => {
        setGpsStatus("denied");
        toast.error("Location permission was denied. You can use the registered address.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [instrument, persist]);

  const useRegistryLocation = useCallback(() => {
    if (!instrument) return;
    const next: Gps = {
      lat: instrument.lat,
      lng: instrument.lng,
      capturedAt: Date.now(),
      label: `${instrument.locationLabel}, ${instrument.district}`,
    };
    setGps(next);
    setGpsStatus("ready");
    void persist({ gps: next });
    toast.info("Using the registered instrument location");
  }, [instrument, persist]);

  const addPhoto = async (kind: string, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files can be attached as field evidence");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      const next = [
        ...photos.filter((p) => p.kind !== kind),
        { id: newRecordId(), kind, dataUrl, capturedAt: Date.now() },
      ];
      setPhotos(next);
      void persist({ photos: next });
      toast.success(`${kind} photograph attached`);
    } catch {
      toast.error("Could not process that image");
    }
  };

  const updateMeasurement = (id: string, patch: Partial<Measurement>) => {
    setMeasurements((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        merged.error = Number((merged.observedReading - merged.testLoad).toFixed(3));
        merged.result = Math.abs(merged.error) <= merged.permissibleError ? "pass" : "fail";
        return merged;
      }),
    );
  };

  const addMeasurement = () => {
    const previous = measurements[measurements.length - 1];
    const unit = previous?.unit ?? "kg";
    setMeasurements((rows) => [
      ...rows,
      {
        id: newRecordId(),
        testLoad: previous ? Number((previous.testLoad + 10).toFixed(2)) : 10,
        unit,
        observedReading: previous ? Number((previous.testLoad + 10).toFixed(2)) : 10,
        error: 0,
        permissibleError: Number(((previous?.testLoad ?? 10) * 0.001).toFixed(3)),
        result: "pass",
      },
    ]);
  };

  const goNext = async () => {
    if (step === 0 && inspection && inspection.status === "scheduled") {
      try {
        await startInspection({ id: inspection._id, device: deviceLabel() });
      } catch (error) {
        console.warn(error);
      }
    }
    if (step === 3) void persist({ photos });
    if (step === 4) void persist({ measurements });
    if (step === 5) void persist({ observations });
    if (step === 6) void persist({ result: result ?? undefined, officerRemarks: remarks });
    if (step === 7) {
      void persist({
        signatureDataUrl: signature ?? undefined,
        signatureName: data?.inspection.officerName,
      });
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!inspection || !result) return;
    setSubmitting(true);
    const payload = {
      result,
      officerRemarks: remarks,
      signatureName: signaturePayloadName,
      signatureDataUrl: signature ?? undefined,
      measurements: measurements.map((m) => ({
        id: m.id,
        testLoad: m.testLoad,
        unit: m.unit,
        observedReading: m.observedReading,
        error: m.error,
        permissibleError: m.permissibleError,
        result: m.result,
        notes: m.notes,
      })),
      observations,
      gps: gps ?? undefined,
      photos,
      capturedOffline: !online,
      device: deviceLabel(),
    };

    try {
      await submitResult({ id: inspection._id, ...payload });
      setQueued("synced");
      setCompleted({ certificateId: null, certificateNumber: null });
      toast.success(
        result === "verified"
          ? "Result submitted — review the report to issue the certificate"
          : "Verification result submitted",
      );
    } catch (error) {
      // No connectivity (or server rejection): persist locally and retry later.
      const message = error instanceof Error ? error.message : "Submission failed";
      if (!online) {
        await putRecord({
          id: newRecordId(),
          inspectionId: String(inspection._id),
          applicationNumber: application?.applicationNumber ?? "",
          instrumentCode: instrument?.instrumentCode ?? "",
          instrumentType: instrument?.instrumentType ?? "",
          locationLabel: instrument?.locationLabel ?? "",
          result,
          payload: {
            result,
            officerRemarks: remarks,
            signatureName: signaturePayloadName,
            measurements: payload.measurements,
            observations,
            gps: gps ?? undefined,
            photos,
          },
          state: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setQueued("pending");
        toast.warning("Saved offline. Sync from the Field Verification screen.");
      } else {
        toast.error(message.replace(/^.*:\s*/, ""));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** The approval gate: the officer confirms the reported outcome to certify. */
  const approveAndIssue = async () => {
    if (!inspection) return;
    setIssuing(true);
    try {
      const res = await issueCertificateNow({ id: inspection._id, device: deviceLabel() });
      setCompleted({
        certificateId: res.certificateId ?? null,
        certificateNumber: res.certificateNumber ?? null,
      });
      setConfirmIssue(false);
      toast.success(`Certificate ${res.certificateNumber} issued`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message.replace(/^.*:\s*/, "")
          : "Could not issue the certificate",
      );
    } finally {
      setIssuing(false);
    }
  };

  const officerName = inspection?.officerName ?? "Legal Metrology Officer";
  const [signatureName, setSignatureName] = useState(officerName);
  useEffect(() => {
    setSignatureName(officerName);
  }, [officerName]);
  const signaturePayloadName = signatureName.trim() || officerName;

  const failing = measurements.filter((m) => m.result === "fail").length;
  const distance =
    gps && instrument
      ? distanceKm(gps, { lat: instrument.lat, lng: instrument.lng })
      : null;

  const gpsPoints = useMemo(() => {
    if (!gps || !instrument) return [];
    const latDelta = gps.lat - instrument.lat;
    const lngDelta = gps.lng - instrument.lng;
    const scale = Math.max(Math.abs(latDelta), Math.abs(lngDelta), 0.0008);
    return [
      { x: 50 - (lngDelta / scale) * 34, y: 50 + (latDelta / scale) * 34, kind: "target" },
      { x: 50, y: 50, kind: "self" },
    ];
  }, [gps, instrument]);

  if (applicationId && data === undefined) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (!inspection || !application || !instrument) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto size-6 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 font-display text-lg font-bold">Inspection not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This assignment does not exist, or it has not yet been assigned to an officer.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard/field">Back to field list</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── report review, certificate approval and confirmation ────────────── */
  if (completed || queued === "pending") {
    const verified = result === "verified";
    const issued = Boolean(certificateNumber);
    const passedLoads = measurements.filter((m) => m.result === "pass").length;
    const verifyUrl =
      certificateNumber && typeof window !== "undefined"
        ? `${window.location.origin}/verify/${certificateNumber}`
        : "";

    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <span
              className={cn(
                "mx-auto flex size-14 items-center justify-center rounded-full",
                queued === "pending"
                  ? "bg-[color-mix(in_oklab,var(--caution)_16%,transparent)] text-[color-mix(in_oklab,var(--caution)_65%,black)]"
                  : issued
                    ? "bg-[color-mix(in_oklab,var(--verify)_14%,transparent)] text-[color-mix(in_oklab,var(--verify)_70%,black)]"
                    : "bg-primary/10 text-primary",
              )}
            >
              {queued === "pending" ? (
                <CloudOff className="size-7" aria-hidden="true" />
              ) : issued ? (
                <BadgeCheck className="size-7" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-7" aria-hidden="true" />
              )}
            </span>
            <h1 className="mt-4 font-display text-xl font-bold tracking-tight">
              {queued === "pending"
                ? "Record saved on this device"
                : issued
                  ? "Certificate issued"
                  : verified
                    ? "Result ready for approval"
                    : "Result submitted"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {queued === "pending"
                ? "This device has no connectivity. The record is stored locally and uploads when you tap Sync now on the field verification screen."
                : issued
                  ? "The certificate is live. Its QR code resolves to the public verification page and the instrument registry now shows the next verification due date."
                  : verified
                    ? "Review the final inspection report below and confirm the result to generate the digital certificate."
                    : "The instrument registry has been updated with the outcome of this inspection."}
            </p>
          </div>

          {queued === "pending" ? null : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-sm font-semibold text-foreground">
                Final inspection report
              </h2>
              <dl className="mt-2">
                <DataRow label="Application" value={application.applicationNumber} mono />
                <DataRow label="Establishment" value={application.applicantName} />
                <DataRow
                  label="Instrument"
                  value={`${instrument.instrumentType} · ${instrument.instrumentCode}`}
                  mono
                />
                <DataRow label="Serial number" value={instrument.serialNumber} mono />
                <DataRow
                  label="Test loads"
                  value={`${passedLoads} of ${measurements.length} within permissible error`}
                />
                {failing > 0 ? (
                  <DataRow label="Failed loads" value={`${failing}`} />
                ) : null}
                <DataRow
                  label="Location captured"
                  value={gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "Not captured"}
                  mono
                />
                <DataRow label="Photographs" value={`${photos.length} attached`} />
                <DataRow label="Signed by" value={signature ? signaturePayloadName : "Not signed"} />
                <DataRow
                  label="Recorded result"
                  value={result ? result.replace(/_/g, " ").toUpperCase() : "—"}
                />
              </dl>
              {remarks.trim() ? (
                <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Officer remarks: </span>
                  {remarks}
                </p>
              ) : null}

              {issued && verifyUrl ? (
                <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5 sm:flex-row sm:items-start">
                  <QrCodeBlock
                    value={verifyUrl}
                    size={116}
                    label="Scan to verify this certificate"
                  />
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">
                      Certificate number
                    </p>
                    <p className="gov-id mt-1 text-base font-semibold text-foreground">
                      {certificateNumber}
                    </p>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="truncate">{verifyUrl}</span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!issued && verified && queued !== "pending" ? (
              <Button
                size="lg"
                className="gap-2"
                onClick={() => setConfirmIssue(true)}
                disabled={issuing}
              >
                <BadgeCheck className="size-4" aria-hidden="true" />
                Approve and issue certificate
              </Button>
            ) : null}
            {certificateId ? (
              <Button
                size="lg"
                className="gap-2"
                onClick={() => navigate(`/dashboard/certificates/${certificateId}`)}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Open certificate, download or print PDF
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate("/dashboard/field")}>
              Back to my inspections
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>

        <Dialog open={confirmIssue} onOpenChange={setConfirmIssue}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm result and issue certificate</DialogTitle>
              <DialogDescription>
                {application.applicationNumber} · {instrument.instrumentCode}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                You are confirming a <span className="font-semibold text-foreground">VERIFIED</span>{" "}
                outcome for {instrument.instrumentType} held by {application.applicantName}. A
                digital certificate with a unique QR verification code will be generated, and the
                instrument registry will show the new verification due date.
              </p>
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                Issued certificates are publicly verifiable. A certificate can only be withdrawn
                later by a department administrator.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmIssue(false)}
                  disabled={issuing}
                >
                  Back to report
                </Button>
                <Button className="flex-1 gap-2" onClick={approveAndIssue} disabled={issuing}>
                  {issuing ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <BadgeCheck className="size-4" aria-hidden="true" />
                  )}
                  Confirm and issue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── workflow ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to field list"
            onClick={() => navigate("/dashboard/field")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">
              {application.applicationNumber}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {t(currentStep)} · Step {step + 1} of {STEPS.length}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saving ? (
              <span className="text-[11px] text-muted-foreground">Saving…</span>
            ) : (
              <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                <Check className="size-3" aria-hidden="true" />
                Draft saved
              </span>
            )}
            {!online ? (
              <span className="flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color-mix(in_oklab,var(--caution)_65%,black)]">
                <WifiOff className="size-3" aria-hidden="true" />
                Offline
              </span>
            ) : null}
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {/* Step 1 — summary */}
        {step === 0 ? (
          <section className="space-y-4">
            <StepHeading
              index={1}
              title={t("field.step1")}
              body="Confirm the appointment details before travelling to the site."
            />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="gov-id text-sm font-semibold">
                    {application.applicationNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Submitted {formatDate(application.submittedAt)}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <dl className="mt-4">
                <DataRow label="Applicant" value={application.applicantName} />
                <DataRow label="Establishment" value={organization?.name ?? "—"} />
                <DataRow
                  label="Instrument"
                  value={`${instrument.instrumentType} · ${instrument.categoryName}`}
                />
                <DataRow label="Instrument ID" value={instrument.instrumentCode} mono />
                <DataRow
                  label="Appointment"
                  value={`${formatClock(inspection.scheduledAt)} · ${formatDate(inspection.scheduledAt)}`}
                />
                <DataRow
                  label="Location"
                  value={`${application.locationOfInstrument}, ${application.district}`}
                />
                <DataRow label="Intended use" value={application.intendedUse} />
                {application.previousCertificateNumber ? (
                  <DataRow
                    label="Previous certificate"
                    value={application.previousCertificateNumber}
                    mono
                  />
                ) : null}
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--saffron)]" aria-hidden="true" />
                Carry verified test weights and standard equipment appropriate to this
                instrument category.
              </p>
            </div>
          </section>
        ) : null}

        {/* Step 2 — location */}
        {step === 1 ? (
          <section className="space-y-4">
            <StepHeading
              index={2}
              title={t("field.step2")}
              body="Capture the on-site location to anchor the verification record."
            />
            <div className="rounded-xl border border-border bg-card p-4">
              <dl>
                <DataRow label="Declared address" value={application.addressLine} />
                <DataRow
                  label="Site"
                  value={`${application.locationOfInstrument}, ${application.district}`}
                  mono={false}
                />
                <DataRow
                  label="Pincode"
                  value={application.pincode}
                />
                <DataRow
                  label="Registered coordinates"
                  value={`${instrument.lat.toFixed(4)}, ${instrument.lng.toFixed(4)}`}
                  mono
                />
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LocateFixed
                    className={cn(
                      "size-4",
                      gpsStatus === "ready" ? "text-[var(--verify)]" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">
                    {gpsStatus === "ready"
                      ? "GPS captured"
                      : gpsStatus === "locating"
                        ? "Acquiring GPS…"
                        : gpsStatus === "denied"
                          ? "GPS unavailable"
                          : "GPS not captured"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={gpsStatus === "ready" ? "outline" : "default"}
                  className="gap-1.5"
                  onClick={captureGps}
                  disabled={gpsStatus === "locating"}
                >
                  {gpsStatus === "locating" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="size-3.5" />
                  )}
                  {gpsStatus === "ready" ? "Recapture" : "Capture GPS"}
                </Button>
              </div>

              {gps ? (
                <div className="mt-3 space-y-3">
                  <dl>
                    <DataRow label="Latitude" value={gps.lat.toFixed(6)} mono />
                    <DataRow label="Longitude" value={gps.lng.toFixed(6)} mono />
                    <DataRow
                      label="Accuracy"
                      value={gps.accuracy ? `±${gps.accuracy} m` : "Not reported"}
                    />
                    {distance !== null ? (
                      <DataRow
                        label="Distance from registry"
                        value={`${distance.toFixed(2)} km`}
                      />
                    ) : null}
                  </dl>

                  <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-muted/40">
                    <div className="grid-backdrop absolute inset-0 opacity-70" aria-hidden="true" />
                    <svg viewBox="0 0 100 100" className="relative size-full">
                      <line
                        x1={gpsPoints[0]?.x ?? 50}
                        y1={gpsPoints[0]?.y ?? 50}
                        x2={gpsPoints[1]?.x ?? 50}
                        y2={gpsPoints[1]?.y ?? 50}
                        stroke="var(--primary)"
                        strokeWidth="0.7"
                        strokeDasharray="2 1.5"
                      />
                      <circle cx={gpsPoints[0]?.x} cy={gpsPoints[0]?.y} r="3" fill="var(--saffron)" />
                      <circle cx={gpsPoints[1]?.x} cy={gpsPoints[1]?.y} r="3" fill="var(--verify)" />
                      <text
                        x={gpsPoints[0]?.x ?? 50}
                        y={(gpsPoints[0]?.y ?? 50) - 5}
                        fontSize="4"
                        textAnchor="middle"
                        fill="currentColor"
                      >
                        registered
                      </text>
                      <text
                        x={gpsPoints[1]?.x ?? 50}
                        y={(gpsPoints[1]?.y ?? 50) + 9}
                        fontSize="4"
                        textAnchor="middle"
                        fill="currentColor"
                      >
                        this device
                      </text>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Location is used to confirm that verification took place at the declared
                    site.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={useRegistryLocation}
                  >
                    <MapPin className="size-3.5" aria-hidden="true" />
                    Use registered location
                  </Button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Step 3 — identification */}
        {step === 2 ? (
          <section className="space-y-4">
            <StepHeading
              index={3}
              title={t("field.step3")}
              body="Match the physical instrument against its registry record."
            />
            <div className="rounded-xl border border-border bg-card p-4">
              <dl>
                <DataRow label="Instrument ID" value={instrument.instrumentCode} mono />
                <DataRow label="Category" value={instrument.categoryName} />
                <DataRow label="Manufacturer" value={instrument.manufacturer} />
                <DataRow label="Model" value={instrument.model} mono />
                <DataRow label="Serial number" value={instrument.serialNumber} mono />
                <DataRow label="Capacity" value={instrument.capacity} />
                <DataRow label="Accuracy class" value={instrument.accuracyClass} />
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <Label htmlFor="scan" className="text-sm font-medium">
                Scan or enter the instrument ID
              </Label>
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <ScanLine
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="scan"
                    value={scanValue}
                    onChange={(event) => setScanValue(event.target.value)}
                    placeholder={instrument.instrumentCode}
                    className="h-11 pl-9 gov-id"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setScanValue(instrument.instrumentCode)}
                >
                  Autofill
                </Button>
              </div>

              {scanValue.trim() ? (
                scanValue.trim().toUpperCase() === instrument.instrumentCode.toUpperCase() ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_oklab,var(--verify)_38%,transparent)] bg-[color-mix(in_oklab,var(--verify)_10%,transparent)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--verify)_70%,black)]">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Matches the registry record
                  </p>
                ) : (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    Does not match the registry value — verify the serial plate before continuing
                  </p>
                )
              ) : null}

              <Button
                type="button"
                variant={idConfirmed ? "outline" : "default"}
                className="mt-3 w-full gap-2"
                onClick={() => {
                  setIdConfirmed(true);
                  void persist({
                    instrumentIdentification: {
                      instrumentCode: instrument.instrumentCode,
                      manufacturer: instrument.manufacturer,
                      model: instrument.model,
                      serialNumber: instrument.serialNumber,
                      capacity: instrument.capacity,
                      category: instrument.categoryName,
                      verifiedAt: Date.now(),
                    },
                  });
                  toast.success("Instrument identity confirmed");
                }}
              >
                <QrCode className="size-4" aria-hidden="true" />
                {idConfirmed ? "Identity already confirmed" : "Confirm instrument identity"}
              </Button>
            </div>
          </section>
        ) : null}

        {/* Step 4 — photographs */}
        {step === 3 ? (
          <section className="space-y-4">
            <StepHeading
              index={4}
              title={t("field.step4")}
              body="Attach site evidence. Images are compressed on the device before upload."
            />
            <div className="space-y-3">
              {PHOTO_KINDS.map((item) => {
                const photo = photos.find((p) => p.kind === item.kind);
                return (
                  <div
                    key={item.kind}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {photo?.dataUrl ? (
                        <img
                          src={photo.dataUrl}
                          alt={`${item.label} evidence`}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Camera className="size-5 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {photo ? `Captured ${formatClock(photo.capturedAt)}` : "Not captured"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(event) => {
                            void addPhoto(item.kind, event.target.files?.[0] ?? null);
                            event.target.value = "";
                          }}
                        />
                        <span
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                            photo
                              ? "border-border bg-card text-foreground hover:bg-accent"
                              : "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
                          )}
                        >
                          {photo ? (
                            <ImagePlus className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Camera className="size-3.5" aria-hidden="true" />
                          )}
                          {photo ? "Replace" : "Capture"}
                        </span>
                      </label>
                      {photo ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${item.label}`}
                          onClick={() => {
                            const next = photos.filter((p) => p.kind !== item.kind);
                            setPhotos(next);
                            void persist({ photos: next });
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {photos.length} of {PHOTO_KINDS.length} evidence images attached.
            </p>
          </section>
        ) : null}

        {/* Step 5 — measurements */}
        {step === 4 ? (
          <section className="space-y-4">
            <StepHeading
              index={5}
              title={t("field.step5")}
              body={
                category
                  ? `Permissible error limit for this category is ${category.maxPermissibleErrorPct}% of the applied load.`
                  : "Record each applied test load and the observed reading."
              }
            />
            <div className="space-y-3">
              {measurements.map((row, index) => (
                <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Test {index + 1}</p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        row.result === "pass"
                          ? "border-[color-mix(in_oklab,var(--verify)_38%,transparent)] text-[color-mix(in_oklab,var(--verify)_70%,black)]"
                          : "border-destructive/35 text-destructive",
                      )}
                    >
                      {row.result === "pass" ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        <TriangleAlert className="size-3.5" aria-hidden="true" />
                      )}
                      {row.result === "pass" ? "PASS" : "FAIL"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Test load ({row.unit})
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="mt-1"
                        value={row.testLoad}
                        onChange={(event) =>
                          updateMeasurement(row.id, {
                            testLoad: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Observed reading ({row.unit})
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="mt-1"
                        value={row.observedReading}
                        onChange={(event) =>
                          updateMeasurement(row.id, {
                            observedReading: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                        Error
                      </p>
                      <p className="gov-id mt-0.5 text-sm font-semibold">
                        {row.error > 0 ? "+" : ""}
                        {row.error} {row.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                        Permissible error
                      </p>
                      <p className="gov-id mt-0.5 text-sm font-semibold">
                        ±{row.permissibleError} {row.unit}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() =>
                        setMeasurements((rows) => rows.filter((r) => r.id !== row.id))
                      }
                      disabled={measurements.length <= 1}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={addMeasurement}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add another test load
            </Button>

            <div
              className={cn(
                "rounded-xl border p-4 text-sm",
                failing > 0
                  ? "border-destructive/35 bg-destructive/8 text-destructive"
                  : "border-[color-mix(in_oklab,var(--verify)_32%,transparent)] bg-[color-mix(in_oklab,var(--verify)_8%,transparent)]",
              )}
            >
              <p className="font-medium">
                {failing > 0
                  ? `${failing} of ${measurements.length} test loads exceed the permissible error.`
                  : `All ${measurements.length} test loads are within permissible error.`}
              </p>
            </div>
          </section>
        ) : null}

        {/* Step 6 — observations */}
        {step === 5 ? (
          <section className="space-y-4">
            <StepHeading
              index={6}
              title={t("field.step6")}
              body="Record the physical condition of the instrument and any compliance concerns."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ObservationSelect
                label="Physical condition"
                value={observations.physicalCondition}
                options={["Good", "Minor wear", "Damaged", "Corroded"]}
                onChange={(v) => setObservations((o) => ({ ...o, physicalCondition: v }))}
              />
              <ObservationSelect
                label="Seal condition"
                value={observations.sealCondition}
                options={["Intact", "Broken", "Missing", "Replaced"]}
                onChange={(v) => setObservations((o) => ({ ...o, sealCondition: v }))}
              />
              <ObservationSelect
                label="Display condition"
                value={observations.displayCondition}
                options={["Clear and legible", "Faded", "Not working"]}
                onChange={(v) => setObservations((o) => ({ ...o, displayCondition: v }))}
              />
              <ObservationSelect
                label="Accuracy"
                value={observations.accuracy}
                options={[
                  "Within permissible limits",
                  "Marginal deviation",
                  "Outside permissible limits",
                ]}
                onChange={(v) => setObservations((o) => ({ ...o, accuracy: v }))}
              />
              <ObservationSelect
                label="Stamping status"
                value={observations.stampingStatus}
                options={[
                  "Previous stamping present",
                  "Stamping not legible",
                  "No stamping found",
                ]}
                onChange={(v) => setObservations((o) => ({ ...o, stampingStatus: v }))}
              />
              <ObservationSelect
                label="Tampering indicators"
                value={observations.tamperingIndicators}
                options={["None observed", "Suspected adjustment", "Seal tampered"]}
                onChange={(v) => setObservations((o) => ({ ...o, tamperingIndicators: v }))}
              />
            </div>
            <div>
              <Label htmlFor="compliance" className="text-sm font-medium">
                Compliance notes
              </Label>
              <Textarea
                id="compliance"
                className="mt-1.5"
                rows={4}
                value={observations.complianceNotes ?? ""}
                onChange={(event) =>
                  setObservations((o) => ({ ...o, complianceNotes: event.target.value }))
                }
                placeholder="Describe any defect, non-compliance or corrective advice issued."
              />
            </div>
          </section>
        ) : null}

        {/* Step 7 — result */}
        {step === 6 ? (
          <section className="space-y-4">
            <StepHeading
              index={7}
              title={t("field.step7")}
              body="Select the verification outcome. A VERIFIED result issues the certificate immediately."
            />
            <div className="space-y-2.5">
              {RESULT_OPTIONS.map((option) => {
                const active = result === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResult(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "w-full rounded-xl border-2 p-4 text-left transition-colors",
                      active
                        ? option.tone === "verify"
                          ? "border-[color-mix(in_oklab,var(--verify)_55%,transparent)] bg-[color-mix(in_oklab,var(--verify)_10%,transparent)]"
                          : option.tone === "danger"
                            ? "border-destructive/50 bg-destructive/8"
                            : "border-[color-mix(in_oklab,var(--caution)_50%,transparent)] bg-[color-mix(in_oklab,var(--caution)_10%,transparent)]"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-display text-sm font-bold tracking-wide">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                        aria-hidden="true"
                      >
                        {active ? <Check className="size-3.5" /> : null}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{option.hint}</p>
                  </button>
                );
              })}
            </div>

            {failing > 0 && result === "verified" ? (
              <p className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] bg-[color-mix(in_oklab,var(--caution)_10%,transparent)] p-3 text-sm text-[color-mix(in_oklab,var(--caution)_62%,black)]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {failing} test load(s) are outside the permissible error. Review the result
                before marking the instrument VERIFIED.
              </p>
            ) : null}

            <div>
              <Label htmlFor="remarks" className="text-sm font-medium">
                Officer remarks
              </Label>
              <Textarea
                id="remarks"
                className="mt-1.5"
                rows={4}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Summary of the verification performed, including test loads applied and outcome."
              />
            </div>
          </section>
        ) : null}

        {/* Step 8 — signature */}
        {step === 7 ? (
          <section className="space-y-4">
            <StepHeading
              index={8}
              title={t("field.step8")}
              body="Prototype digital approval. The signature image is stored with the inspection record."
            />
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--caution)_35%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-3 text-xs leading-5 text-muted-foreground">
              This is a demonstration signature workflow. It is not a legally valid digital
              signature and no certifying authority is involved.
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <Label htmlFor="signName" className="text-sm font-medium">
                Officer name
              </Label>
              <Input
                id="signName"
                value={signatureName}
                onChange={(event) => setSignatureName(event.target.value)}
                className="mt-1.5"
              />
              <p className="mt-4 text-sm font-medium">Signature</p>
              <div className="mt-1.5">
                <SignaturePad
                  value={signature}
                  onChange={(dataUrl) => {
                    setSignature(dataUrl);
                    void persist({
                      signatureDataUrl: dataUrl ?? undefined,
                      signatureName: signatureName,
                    });
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* Step 9 — submit */}
        {step === 8 ? (
          <section className="space-y-4">
            <StepHeading
              index={9}
              title={t("field.step9")}
              body="Review the captured record. Submitting locks the verification result."
            />
            <div className="rounded-xl border border-border bg-card p-4">
              <dl>
                <DataRow label="Application" value={application.applicationNumber} mono />
                <DataRow label="Instrument" value={instrument.instrumentCode} mono />
                <DataRow label="Result" value={result ? result.replace(/_/g, " ").toUpperCase() : "Not selected"} />
                <DataRow
                  label="Test loads"
                  value={`${measurements.length} recorded · ${measurements.filter((m) => m.result === "pass").length} pass`}
                />
                <DataRow label="GPS" value={gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "Not captured"} mono />
                <DataRow label="Photographs" value={`${photos.length} attached`} />
                <DataRow
                  label="Observations"
                  value={`${Object.values(observations).filter(Boolean).length} fields completed`}
                />
                <DataRow label="Signed by" value={signaturePayloadName} />
                <DataRow
                  label="Capture mode"
                  value={online ? "Online" : "Offline — will queue"}
                />
              </dl>
            </div>

            {!online ? (
              <p className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] bg-[color-mix(in_oklab,var(--caution)_10%,transparent)] p-3 text-sm text-[color-mix(in_oklab,var(--caution)_62%,black)]">
                <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                No connectivity detected. The record will be stored on this device and can be
                synced from the Field Verification list.
              </p>
            ) : null}

            {!result ? (
              <p className="rounded-xl border border-destructive/35 bg-destructive/8 p-3 text-sm text-destructive">
                Select a verification result before submitting.
              </p>
            ) : null}

            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!result || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {t("action.submit")}
            </Button>
          </section>
        ) : null}
      </main>

      {/* Sticky navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={goBack}
            disabled={step === 0}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("action.back")}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="flex-[1.4] gap-1.5" onClick={goNext}>
              {t("action.next")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              className="flex-[1.4] gap-1.5"
              onClick={handleSubmit}
              disabled={!result || submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {t("action.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeading({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[color-mix(in_oklab,var(--saffron)_68%,black)] uppercase">
        Step {index} of 9
      </p>
      <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {body ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p> : null}
    </div>
  );
}

function ObservationSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
