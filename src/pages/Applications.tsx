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
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  BadgeCheck,
  ClipboardCheck,
  FileClock,
  FilePlus2,
  Files,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const STATUS_OPTIONS = [
  "all",
  "draft",
  "submitted",
  "under_review",
  "documents_required",
  "approved",
  "scheduled",
  "inspection_pending",
  "verification_in_progress",
  "verified",
  "rejected",
  "cancelled",
];

export default function Applications() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const rows = useQuery(api.applications.list, {
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    limit: 100,
  });

  const isBusiness = profile?.role === "business";

  return (
    <AppShell
      title={t("nav.applications")}
      description={
        isBusiness
          ? "Your verification and re-verification applications, with live status."
          : "All verification applications with their current processing stage."
      }
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.applications") }]}
      actions={
        isBusiness ? (
          <Button className="gap-2" onClick={() => navigate("/dashboard/applications/new")}>
            <FilePlus2 className="size-4" aria-hidden="true" />
            {t("action.newApplication")}
          </Button>
        ) : null
      }
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total"
          value={rows?.length ?? "—"}
          icon={Files}
          tone="primary"
          emphasis
        />
        <StatCard
          label="In review"
          value={
            rows?.filter((r) => ["submitted", "under_review", "documents_required"].includes(r.status))
              .length ?? "—"
          }
          icon={FileClock}
        />
        <StatCard
          label="Scheduled"
          value={
            rows?.filter((r) => ["approved", "scheduled", "inspection_pending"].includes(r.status))
              .length ?? "—"
          }
          icon={ClipboardCheck}
          tone="caution"
        />
        <StatCard
          label={t("status.verified")}
          value={rows?.filter((r) => r.status === "verified").length ?? "—"}
          icon={BadgeCheck}
          tone="verify"
        />
      </section>

      <SectionHeader
        title="Application register"
        icon={Files}
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
                placeholder="Application, applicant, serial"
                className="h-9 w-full pl-9 sm:w-64"
                aria-label="Search applications"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-48 bg-card" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All statuses" : option.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {rows === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Files}
          title="No applications match this filter"
          body={
            isBusiness
              ? "Register an instrument and submit a verification application to see it here."
              : "Adjust the status filter or clear the search term."
          }
          action={
            isBusiness ? (
              <Button size="sm" onClick={() => navigate("/dashboard/applications/new")}>
                {t("action.newApplication")}
              </Button>
            ) : undefined
          }
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
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {application.type === "new" ? "New verification" : "Re-verification"}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                    {application.applicantName} · {application.instrumentType}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="gov-id">{application.serialNumber}</span>
                    <span>{application.district}, {application.state}</span>
                    <span>
                      Submitted {formatDate(application.submittedAt ?? application.createdAt)}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/applications/${application._id}`)}
                >
                  {application.status === "submitted" ? "Review" : t("action.viewDetails")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
