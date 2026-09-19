import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, GovId, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { formatClock, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  ClipboardCheck,
  FileSearch,
  MapPin,
  ScanLine,
  Search,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const STATUS_FILTERS = [
  { value: "all", label: "All open work" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "documents_required", label: "Documents required" },
  { value: "approved", label: "Ready to schedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "inspection_pending", label: "Inspection pending" },
  { value: "verification_in_progress", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export default function Assignments() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const isOfficer = profile?.role === "lmo";

  const [status, setStatus] = useState(isOfficer ? "all" : "submitted");
  const [search, setSearch] = useState("");

  const queue = useQuery(api.applications.queue, {});
  const rows = useQuery(api.applications.list, {
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    limit: 80,
  });

  return (
    <AppShell
      title={isOfficer ? t("nav.assignments") : "Review desk"}
      description={
        isOfficer
          ? "Applications in your jurisdiction and the inspections assigned to you."
          : "Verify documents, approve applications and assign officers to inspections."
      }
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.assignments") }]}
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("queue.newApplications")}
          value={queue?.buckets.newApplications ?? "—"}
          icon={FileSearch}
          tone="primary"
          emphasis
        />
        <StatCard
          label={t("queue.documentsToReview")}
          value={queue?.buckets.documentsToReview ?? "—"}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Ready to schedule"
          value={queue?.buckets.readyToSchedule ?? "—"}
          icon={Timer}
          tone="caution"
        />
        <StatCard
          label="Verified"
          value={queue?.buckets.verified ?? "—"}
          icon={ShieldCheck}
          tone="verify"
        />
      </section>

      <SectionHeader
        title={isOfficer ? "Work queue" : "Application queue"}
        icon={ClipboardCheck}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search application or applicant"
                className="h-9 w-full pl-9 sm:w-64"
                aria-label="Search applications"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-52 bg-card" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {rows === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No applications match this filter"
          body="Try a different status filter or clear the search term."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {rows.map((application) => (
              <li
                key={application._id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <GovId className="font-semibold">{application.applicationNumber}</GovId>
                    <StatusBadge status={application.status} />
                    {application.type === "re_verification" ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        Re-verification
                      </span>
                    ) : null}
                    {application.priority !== "normal" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_oklab,var(--caution)_65%,black)]">
                        <Timer className="size-3" aria-hidden="true" />
                        {application.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                    {application.applicantName} · {application.instrumentType}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {application.district}, {application.state}
                    </span>
                    <span>
                      Submitted {formatDate(application.submittedAt ?? application.createdAt)}
                    </span>
                    {application.scheduledAt ? (
                      <span>
                        Scheduled {formatClock(application.scheduledAt)} ·{" "}
                        {formatDate(application.scheduledAt)}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
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
                  <Button
                    variant={isOfficer ? "ghost" : "default"}
                    onClick={() => navigate(`/dashboard/applications/${application._id}`)}
                  >
                    {isOfficer ? t("action.viewDetails") : "Review"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
