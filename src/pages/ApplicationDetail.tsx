import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { DataRow, EmptyState, GovId, LoadingBlock, SectionHeader } from "@/components/ui-bits";
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
import {
  deviceLabel,
  formatClock,
  formatDate,
  formatDateTime,
  formatRelative,
  humanFileSize,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  ScanLine,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserCog,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const FLOW = [
  "submitted",
  "under_review",
  "approved",
  "scheduled",
  "inspection_pending",
  "verification_in_progress",
  "verified",
];

function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const data = useQuery(
    api.applications.detail,
    applicationId ? { id: applicationId as Id<"applications"> } : "skip",
  );

  const review = useMutation(api.applications.review);
  const assign = useMutation(api.applications.assign);
  const cancelApplication = useMutation(api.applications.cancel);

  const officers = useQuery(api.masterData.officers, {});
  const gatcs = useQuery(api.masterData.gatcs, {});

  const [assignOpen, setAssignOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<"approve" | "request_correction" | "reject" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [officerId, setOfficerId] = useState("");
  const [gatcId, setGatcId] = useState("none");
  const [slot, setSlot] = useState(defaultSlot());
  const [priority, setPriority] = useState("normal");

  if (data === undefined) {
    return (
      <AppShell title="Application" breadcrumb={[{ label: t("nav.applications") }]}>
        <LoadingBlock rows={4} />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Application" breadcrumb={[{ label: t("nav.applications") }]}>
        <EmptyState
          icon={FileText}
          title="Application not found"
          body="This application does not exist or you do not have access to it."
          action={
            <Button asChild>
              <Link to="/dashboard/applications">{t("nav.applications")}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const application = data.application;
  const role = profile?.role ?? "user";
  const isAdmin = ["dept_admin", "ministry", "admin"].includes(role);
  const isOfficer = role === "lmo";
  const isBusiness = role === "business";
  const closed = ["verified", "rejected", "cancelled"].includes(application.status);

  const stageIndex = (() => {
    if (application.status === "rejected") return -1;
    if (application.status === "cancelled") return -2;
    if (application.status === "documents_required") return 1;
    if (application.status === "draft") return 0;
    const index = FLOW.indexOf(application.status);
    if (index >= 0) return index;
    return 0;
  })();

  const runReview = async (decision: "approve" | "request_correction" | "reject") => {
    setBusy(true);
    try {
      await review({
        id: application._id,
        decision,
        note: note.trim() || undefined,
        device: deviceLabel(),
      });
      toast.success(
        decision === "approve"
          ? "Documents approved — application is ready to schedule"
          : decision === "request_correction"
            ? "Correction requested from the applicant"
            : "Application rejected",
      );
      setReviewOpen(null);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^.*:\s*/, "") : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const runAssign = async () => {
    if (!officerId) {
      toast.error("Select an officer to schedule the inspection");
      return;
    }
    const scheduledAt = new Date(slot).getTime();
    if (Number.isNaN(scheduledAt)) {
      toast.error("Choose a valid date and time");
      return;
    }
    setBusy(true);
    try {
      await assign({
        id: application._id,
        officerId: officerId as Id<"officers">,
        scheduledAt,
        gatcId: gatcId === "none" ? undefined : (gatcId as Id<"gatcs">),
        priority: priority as "normal" | "high" | "urgent",
        device: deviceLabel(),
      });
      toast.success("Officer assigned and inspection scheduled");
      setAssignOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message.replace(/^.*:\s*/, "") : "Assignment failed");
    } finally {
      setBusy(false);
    }
  };

  const districtOfficers = (officers ?? []).filter(
    (o) => !application.district || o.district === application.district,
  );
  const officerPool = districtOfficers.length ? districtOfficers : (officers ?? []);

  return (
    <AppShell
      title={application.applicationNumber}
      breadcrumb={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.applications"), to: "/dashboard/applications" },
        { label: application.applicationNumber },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {isOfficer &&
          ["scheduled", "inspection_pending", "verification_in_progress"].includes(
            application.status,
          ) ? (
            <Button
              className="gap-2"
              onClick={() => navigate(`/dashboard/field/${application._id}`)}
            >
              <ScanLine className="size-4" aria-hidden="true" />
              {application.status === "verification_in_progress"
                ? t("action.continue")
                : t("action.startVerification")}
            </Button>
          ) : null}

          {isAdmin && !closed ? (
            <>
              {application.status === "approved" ||
              application.status === "scheduled" ||
              application.status === "inspection_pending" ? (
                <Button className="gap-2" onClick={() => setAssignOpen(true)}>
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  {application.assignedOfficerId ? "Reassign & reschedule" : "Assign & schedule"}
                </Button>
              ) : null}
              {["submitted", "under_review", "documents_required"].includes(application.status) ? (
                <>
                  <Button className="gap-2" onClick={() => setReviewOpen("approve")}>
                    <ThumbsUp className="size-4" aria-hidden="true" />
                    Approve documents
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setReviewOpen("request_correction")}
                  >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    Request correction
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => setReviewOpen("reject")}
                  >
                    <ThumbsDown className="size-4" aria-hidden="true" />
                    Reject
                  </Button>
                </>
              ) : null}
            </>
          ) : null}

          {data.certificate ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/dashboard/certificates/${data.certificate!._id}`)}
            >
              <BadgeCheck className="size-4" aria-hidden="true" />
              View certificate
            </Button>
          ) : null}

          {isBusiness && !closed ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                try {
                  await cancelApplication({ id: application._id, reason: "Withdrawn by applicant" });
                  toast.success("Application withdrawn");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not withdraw");
                }
              }}
            >
              <XCircle className="size-4" aria-hidden="true" />
              Withdraw
            </Button>
          ) : null}
        </div>
      }
    >
      {/* Header card */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="gov-id text-lg font-bold">{application.applicationNumber}</span>
              <StatusBadge status={application.status} />
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground uppercase">
                {application.type === "new" ? "New verification" : "Re-verification"}
              </span>
              {application.priority !== "normal" ? (
                <span className="rounded-full border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] px-2.5 py-0.5 text-[11px] font-medium text-[color-mix(in_oklab,var(--caution)_65%,black)] uppercase">
                  {application.priority} priority
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {application.applicantName} · {application.instrumentType} ·{" "}
              {application.district}, {application.state}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Submitted
              </dt>
              <dd className="font-medium">{formatDate(application.submittedAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Scheduled
              </dt>
              <dd className="font-medium">
                {application.scheduledAt ? formatDateTime(application.scheduledAt) : "Not scheduled"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Officer
              </dt>
              <dd className="font-medium">{data.officer?.name ?? "Unassigned"}</dd>
            </div>
          </dl>
        </div>

        {/* Lifecycle tracker */}
        <ol className="mt-6 flex flex-wrap items-center gap-2">
          {FLOW.map((stage, index) => {
            const done = stageIndex > index || application.status === "verified";
            const current = stageIndex === index && application.status !== "verified";
            return (
              <li key={stage} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    done
                      ? "border-[color-mix(in_oklab,var(--verify)_38%,transparent)] bg-[color-mix(in_oklab,var(--verify)_10%,transparent)] text-[color-mix(in_oklab,var(--verify)_68%,black)]"
                      : current
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                  ) : current ? (
                    <Clock className="size-3" aria-hidden="true" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current opacity-40" />
                  )}
                  {stage.replace(/_/g, " ")}
                </span>
                {index < FLOW.length - 1 ? (
                  <span className="hidden h-px w-4 bg-border sm:block" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {application.status === "rejected" ? (
          <p className="mt-4 rounded-lg border border-destructive/35 bg-destructive/8 p-3 text-sm text-destructive">
            Rejected{application.reviewNote ? `: ${application.reviewNote}` : ""}
          </p>
        ) : null}
        {application.status === "documents_required" ? (
          <p className="mt-4 rounded-lg border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] bg-[color-mix(in_oklab,var(--caution)_10%,transparent)] p-3 text-sm text-[color-mix(in_oklab,var(--caution)_62%,black)]">
            Additional documents requested{application.reviewNote ? `: ${application.reviewNote}` : ""}
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader title="Instrument details" icon={ShieldCheck} />
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <DataRow label="Instrument ID" value={data.instrument?.instrumentCode ?? "—"} mono />
              <DataRow label="Category" value={application.instrumentCategory} />
              <DataRow label="Type" value={application.instrumentType} />
              <DataRow label="Manufacturer" value={application.manufacturer} />
              <DataRow label="Model" value={application.model} mono />
              <DataRow label="Serial number" value={application.serialNumber} mono />
              <DataRow label="Capacity" value={application.capacity} />
              <DataRow label="Accuracy class" value={application.accuracyClass} />
              <DataRow label="Location" value={application.locationOfInstrument} />
              <DataRow label="Intended use" value={application.intendedUse} />
              <DataRow label="Previous certificate" value={application.previousCertificateNumber ?? "—"} mono />
              <DataRow
                label="Previous verification"
                value={formatDate(application.previousVerificationDate)}
              />
            </dl>
            {data.instrument ? (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={`/dashboard/instruments/${data.instrument._id}`}>
                  Open instrument record
                </Link>
              </Button>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader
              title="Documents"
              icon={FileText}
              description={`${data.documents.length} files uploaded with this application.`}
            />
            {data.documents.length ? (
              <ul className="divide-y divide-border">
                {data.documents.map((doc) => (
                  <li key={doc._id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {doc.dataUrl ? (
                        <img src={doc.dataUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {doc.fileName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {doc.kind} · {humanFileSize(doc.sizeKb)} · uploaded by {doc.uploadedBy} on{" "}
                        {formatDate(doc.uploadedAt)}
                      </span>
                    </span>
                    <StatusBadge status={doc.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={FileText} title="No documents attached" />
            )}
          </section>

          {data.inspection ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <SectionHeader title="Inspection record" icon={ScanLine} />
              <dl className="grid gap-x-8 sm:grid-cols-2">
                <DataRow label="Officer" value={data.inspection.officerName} />
                <DataRow label="Status" value={<StatusBadge status={data.inspection.status} />} />
                <DataRow
                  label="Started"
                  value={formatDateTime(data.inspection.startedAt)}
                />
                <DataRow
                  label="Completed"
                  value={formatDateTime(data.inspection.completedAt)}
                />
                <DataRow
                  label="GPS"
                  value={
                    data.inspection.gps
                      ? `${data.inspection.gps.lat.toFixed(4)}, ${data.inspection.gps.lng.toFixed(4)}`
                      : "Not captured"
                  }
                  mono
                />
                <DataRow
                  label="Test loads"
                  value={`${data.inspection.measurements.length} recorded`}
                />
              </dl>

              {data.inspection.measurements.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Test load</th>
                        <th className="px-3 py-2 text-left font-medium">Observed</th>
                        <th className="px-3 py-2 text-left font-medium">Error</th>
                        <th className="px-3 py-2 text-left font-medium">Permissible</th>
                        <th className="px-3 py-2 text-left font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.inspection.measurements.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 gov-id">
                            {row.testLoad} {row.unit}
                          </td>
                          <td className="px-3 py-2 gov-id">
                            {row.observedReading} {row.unit}
                          </td>
                          <td className="px-3 py-2 gov-id">
                            {row.error > 0 ? "+" : ""}
                            {row.error}
                          </td>
                          <td className="px-3 py-2 gov-id">±{row.permissibleError}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={row.result === "pass" ? "verified" : "rejected"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {data.inspection.photos.length ? (
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    Field evidence
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {data.inspection.photos.map((photo) =>
                      photo.dataUrl ? (
                        <figure key={photo.id} className="overflow-hidden rounded-lg border border-border">
                          <img
                            src={photo.dataUrl}
                            alt={`${photo.kind} evidence`}
                            className="h-24 w-full object-cover"
                          />
                          <figcaption className="border-t border-border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                            {photo.kind}
                          </figcaption>
                        </figure>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              {data.inspection.observations ? (
                <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                  {Object.entries(data.inspection.observations)
                    .filter(([, value]) => Boolean(value))
                    .map(([key, value]) => (
                      <DataRow
                        key={key}
                        label={key.replace(/([A-Z])/g, " $1").toLowerCase()}
                        value={String(value)}
                      />
                    ))}
                </dl>
              ) : null}

              {data.inspection.officerRemarks ? (
                <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Officer remarks: </span>
                  {data.inspection.officerRemarks}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Applicant" icon={Info} />
            <dl className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-1">
              <DataRow label="Establishment" value={data.organization?.name ?? "—"} />
              <DataRow label="Contact person" value={application.applicantName} />
              <DataRow label="Phone" value={application.contactPhone} />
              <DataRow label="Email" value={application.contactEmail} />
              <DataRow label="Address" value={application.addressLine} />
              <DataRow
                label="District / State"
                value={`${application.district}, ${application.state}`}
              />
              <DataRow label="Pincode" value={application.pincode} />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Assignment" icon={UserCog} />
            <dl>
              <DataRow label="Officer" value={data.officer?.name ?? "Unassigned"} />
              <DataRow label="Designation" value={data.officer?.designation ?? "—"} />
              <DataRow label="Employee code" value={data.officer?.employeeCode ?? "—"} mono />
              <DataRow label="GATC referral" value={data.gatc?.name ?? "Not referred"} />
              <DataRow
                label="Appointment"
                value={
                  application.scheduledAt
                    ? `${formatClock(application.scheduledAt)} · ${formatDate(application.scheduledAt)}`
                    : "Not scheduled"
                }
              />
            </dl>
            {isAdmin && !closed ? (
              <Button className="mt-4 w-full gap-2" size="sm" onClick={() => setAssignOpen(true)}>
                <CalendarPlus className="size-3.5" aria-hidden="true" />
                {application.assignedOfficerId ? "Reassign" : "Assign officer"}
              </Button>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Application timeline" icon={Clock} />
            <ol className="relative space-y-4 border-l border-border pl-4">
              {application.statusHistory.map((event, index) => (
                <li key={`${event.status}-${index}`} className="relative">
                  <span
                    className="absolute top-1.5 -left-[1.34rem] size-2 rounded-full bg-[var(--saffron)] ring-4 ring-card"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-foreground">
                    {event.status.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {event.byName}
                    {event.byRole ? ` · ${event.byRole.replace(/_/g, " ")}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDateTime(event.at)}
                  </p>
                  {event.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{event.note}</p>
                  ) : null}
                </li>
              ))}
              {application.statusHistory.length === 0 ? (
                <li className="text-sm text-muted-foreground">No status events yet.</li>
              ) : null}
            </ol>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Audit trail" icon={History} />
            {data.auditLogs.length ? (
              <ul className="space-y-3">
                {data.auditLogs.slice(0, 10).map((log) => (
                  <li key={log._id} className="border-b border-border/60 pb-2.5 last:border-0">
                    <p className="text-sm text-foreground">
                      {log.detail ?? log.action.replace(/\./g, " · ")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {log.actorName} · {log.actorRole} · {formatRelative(log.at)}
                    </p>
                    {log.device ? (
                      <p className="gov-id mt-0.5 text-[10px] text-muted-foreground">
                        {log.device}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No audit entries recorded.</p>
            )}
          </section>
        </aside>
      </div>

      {/* Review dialog */}
      <Dialog open={reviewOpen !== null} onOpenChange={(open) => !open && setReviewOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewOpen === "approve"
                ? "Approve documents"
                : reviewOpen === "request_correction"
                  ? "Request correction"
                  : "Reject application"}
            </DialogTitle>
            <DialogDescription>
              {application.applicationNumber} · {application.applicantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="review-note" className="text-sm font-medium">
              Note to the applicant
            </Label>
            <Textarea
              id="review-note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                reviewOpen === "approve"
                  ? "Documents verified against the submitted instrument details."
                  : reviewOpen === "request_correction"
                    ? "Please upload a legible copy of the purchase invoice."
                    : "Reason for rejection"
              }
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReviewOpen(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                variant={reviewOpen === "reject" ? "destructive" : "default"}
                onClick={() => reviewOpen && runReview(reviewOpen)}
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign officer and schedule inspection</DialogTitle>
            <DialogDescription>
              {application.applicationNumber} · {application.district}, {application.state}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Officer</Label>
              <Select value={officerId} onValueChange={setOfficerId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select an officer" />
                </SelectTrigger>
                <SelectContent>
                  {officerPool.map((officer) => (
                    <SelectItem key={officer._id} value={officer._id}>
                      {officer.name} · {officer.designation} · {officer.pending} pending
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Workload is shown as pending inspections already assigned.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="slot" className="text-sm font-medium">
                  Inspection date and time
                </Label>
                <Input
                  id="slot"
                  type="datetime-local"
                  className="mt-1.5"
                  value={slot}
                  onChange={(event) => setSlot(event.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">GATC referral (optional)</Label>
              <Select value={gatcId} onValueChange={setGatcId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="No referral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No referral</SelectItem>
                  {(gatcs ?? []).map((gatc) => (
                    <SelectItem key={gatc._id} value={gatc._id}>
                      {gatc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Weighbridges and fuel dispensing units normally require a GATC referral.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                The applicant receives an in-app notification. External SMS/email dispatch is
                simulated in this prototype and is not actually sent.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={runAssign} disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CalendarPlus className="size-4" aria-hidden="true" />
                )}
                Schedule inspection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden="true" />
        Site: {application.locationOfInstrument}, {application.addressLine}
      </p>
    </AppShell>
  );
}
