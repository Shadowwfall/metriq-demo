import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { daysUntil, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  CalendarClock,
  ClipboardList,
  Download,
  FileBarChart,
  Gauge,
  Printer,
  Ruler,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Nothing to export for this report");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = value === null || value === undefined ? "" : String(value);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("CSV exported");
}

export default function Reports() {
  const { t } = useI18n();
  const profile = useQuery(api.profiles.current);
  const overview = useQuery(api.dashboard.adminOverview, {});
  const expiry = useQuery(api.dashboard.expiryAnalysis, {});
  const officers = useQuery(api.masterData.officers, {});
  const certificates = useQuery(api.certificates.list, { limit: 100 });
  const instruments = useQuery(api.instruments.byCategory, {});
  const isBusiness = profile?.role === "business";

  return (
    <AppShell
      title={t("nav.reports")}
      description="Monitoring reports for verification activity, pendency and certificate validity."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.reports") }]}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      }
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={overview?.metrics.totalApplications ?? "—"}
          icon={ClipboardList}
          tone="primary"
          emphasis
        />
        <StatCard
          label="Certificates issued"
          value={certificates?.length ?? "—"}
          icon={FileBarChart}
          tone="verify"
        />
        <StatCard
          label="Expired certificates"
          value={expiry?.expired ?? "—"}
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="Active officers"
          value={overview?.metrics.activeOfficers ?? "—"}
          icon={Users}
        />
      </section>

      <Tabs defaultValue="verification">
        <TabsList className="flex-wrap">
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="pending">Pending applications</TabsTrigger>
          <TabsTrigger value="expiry">Expiring certificates</TabsTrigger>
          <TabsTrigger value="workload">Officer workload</TabsTrigger>
          <TabsTrigger value="categories">Instrument categories</TabsTrigger>
          <TabsTrigger value="state">State-wise</TabsTrigger>
        </TabsList>

        {/* Verification summary */}
        <TabsContent value="verification" className="mt-5">
          <SectionHeader
            title="Verification report"
            description="Applications by processing outcome across the jurisdiction."
            icon={FileBarChart}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCsv(
                    "verification-report",
                    (overview?.lifecycle ?? []).map((row) => ({
                      stage: row.stage,
                      applications: row.count,
                    })),
                  )
                }
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(overview?.lifecycle ?? []).map((row) => (
              <div key={row.stage} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {row.stage.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">{row.count}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{
                      width: `${
                        ((row.count || 0) /
                          Math.max(
                            1,
                            ...(overview?.lifecycle ?? []).map((l) => l.count),
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pending applications */}
        <TabsContent value="pending" className="mt-5">
          <SectionHeader
            title="Pending applications"
            description="Applications still moving through the verification pipeline."
            icon={ClipboardList}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCsv(
                    "pending-applications",
                    (overview?.byDistrict ?? []).map((row) => ({
                      district: row.district,
                      applications: row.count,
                    })),
                  )
                }
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </Button>
            }
          />
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">District</th>
                  <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                  <th className="px-4 py-2.5 text-left font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(overview?.byDistrict ?? []).map((row) => {
                  const total = Math.max(
                    1,
                    (overview?.byDistrict ?? []).reduce((acc, r) => acc + r.count, 0),
                  );
                  return (
                    <tr key={row.district}>
                      <td className="px-4 py-2.5 font-medium">{row.district}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.count}</td>
                      <td className="px-4 py-2.5">
                        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-[var(--saffron)]"
                            style={{ width: `${(row.count / total) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!overview?.byDistrict.length ? (
              <EmptyState icon={ClipboardList} title="No applications recorded" />
            ) : null}
          </div>
        </TabsContent>

        {/* Expiry */}
        <TabsContent value="expiry" className="mt-5">
          <SectionHeader
            title="Certificate expiry analysis"
            description="Stamping validity lapses used to schedule re-verification drives."
            icon={CalendarClock}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCsv(
                    "expiring-certificates",
                    (expiry?.list ?? []).map((cert) => ({
                      certificate: cert.certificateNumber,
                      instrument: cert.instrumentCode,
                      owner: cert.ownerName,
                      district: cert.district,
                      validUntil: formatDate(cert.validUntil),
                      daysRemaining: cert.daysRemaining,
                    })),
                  )
                }
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </Button>
            }
          />
          <div className="mb-5 grid gap-3 sm:grid-cols-5">
            {(expiry?.buckets ?? []).map((bucket) => (
              <div key={bucket.days} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {bucket.days} days
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {bucket.count}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Certificate</th>
                  <th className="px-4 py-2.5 text-left font-medium">Instrument</th>
                  <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-4 py-2.5 text-left font-medium">Valid until</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(expiry?.list ?? []).map((cert) => {
                  const days = daysUntil(cert.validUntil);
                  return (
                    <tr key={cert._id}>
                      <td className="px-4 py-2.5 gov-id">{cert.certificateNumber}</td>
                      <td className="px-4 py-2.5 gov-id text-muted-foreground">
                        {cert.instrumentCode}
                      </td>
                      <td className="px-4 py-2.5">{cert.ownerName}</td>
                      <td className="px-4 py-2.5">
                        {formatDate(cert.validUntil)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {days !== null ? `${days}d` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={cert.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!expiry?.list.length ? (
              <EmptyState icon={CalendarClock} title="Nothing expiring in the next 90 days" />
            ) : null}
          </div>
        </TabsContent>

        {/* Officer workload */}
        <TabsContent value="workload" className="mt-5">
          <SectionHeader
            title="Officer workload"
            description="Assignment distribution used to balance inspections across districts."
            icon={Users}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCsv(
                    "officer-workload",
                    (officers ?? []).map((o) => ({
                      officer: o.name,
                      code: o.employeeCode,
                      district: o.district,
                      pending: o.pending,
                      inReview: o.inReview,
                      completed: o.completedAssignments,
                    })),
                  )
                }
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </Button>
            }
          />
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Officer</th>
                  <th className="px-4 py-2.5 text-left font-medium">District</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pending</th>
                  <th className="px-4 py-2.5 text-right font-medium">In review</th>
                  <th className="px-4 py-2.5 text-right font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(officers ?? []).map((officer) => (
                  <tr key={officer._id}>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium">{officer.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {officer.employeeCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{officer.district}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{officer.pending}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{officer.inReview}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {officer.completedAssignments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-5">
          <SectionHeader
            title="Instrument category statistics"
            description="Registry composition by instrument group and type."
            icon={Ruler}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  exportCsv(
                    "instrument-categories",
                    (instruments?.byType ?? []).map((row) => ({
                      instrumentType: row.type,
                      count: row.count,
                    })),
                  )
                }
              >
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </Button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {(instruments?.byGroup ?? []).map((group) => (
              <div key={group.group} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {group.group}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {group.count}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {(instruments?.byType ?? []).map((row) => (
                <li key={row.type} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{row.type}</span>
                  <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-muted sm:block">
                    <div
                      className="h-2 rounded-full bg-[var(--chart-4)]"
                      style={{
                        width: `${(row.count / Math.max(1, instruments?.byType[0]?.count ?? 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>

        {/* State-wise (business users see a notice) */}
        <TabsContent value="state" className="mt-5">
          <SectionHeader
            title="State-wise statistics"
            description="National view of application and instrument volumes."
            icon={Gauge}
          />
          {isBusiness ? (
            <EmptyState
              icon={Gauge}
              title="State reports are restricted"
              body="National and state level aggregates are available to department and ministry accounts."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">State</th>
                    <th className="px-4 py-2.5 text-right font-medium">Applications</th>
                    <th className="px-4 py-2.5 text-right font-medium">Verified</th>
                    <th className="px-4 py-2.5 text-right font-medium">Instruments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(overview?.byState ?? []).map((row) => (
                    <tr key={row.state}>
                      <td className="px-4 py-2.5 font-medium">{row.state}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.applications}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.verified}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.instruments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
