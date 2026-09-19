import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { formatDateTime } from "@/lib/format";
import { useI18n, statusKey } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileClock,
  Gauge,
  Landmark,
  MapPin,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function AdminDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [district, setDistrict] = useState<string>("all");

  const overview = useQuery(api.dashboard.adminOverview, {
    district: district === "all" ? undefined : district,
  });
  const districts = useQuery(api.masterData.districts, {});
  const queue = useQuery(api.applications.queue, {
    district: district === "all" ? undefined : district,
  });
  const expiry = useQuery(api.dashboard.expiryAnalysis, {});
  const metrics = overview?.metrics;

  return (
    <AppShell
      title={t("nav.dashboard")}
      breadcrumb={[{ label: t("nav.dashboard") }, { label: "Department" }]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="w-52 bg-card">
              <MapPin className="mr-1.5 size-4 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="All districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {districts?.map((d) => (
                <SelectItem key={d._id} value={d.name}>
                  {d.name} — {d.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild className="gap-2">
            <Link to="/dashboard/assignments">
              <ClipboardCheck className="size-4" aria-hidden="true" />
              Review desk
            </Link>
          </Button>
        </div>
      }
    >
      <section className="mb-6 rounded-2xl border border-primary/25 bg-primary p-5 text-primary-foreground sm:p-6">
        <p className="text-xs tracking-[0.14em] text-primary-foreground/60 uppercase">
          Legal Metrology Department
        </p>
        <h1 className="mt-1.5 font-display text-xl font-bold tracking-tight sm:text-2xl">
          Department operations centre
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-primary-foreground/75">
          Application pipeline, officer workload, verification outcomes and certificate
          validity across the jurisdiction.
        </p>
      </section>

      <section className="mb-8">
        <SectionHeader title="Key indicators" icon={Gauge} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total applications"
            value={metrics?.totalApplications ?? "—"}
            icon={ClipboardCheck}
            tone="primary"
            emphasis
          />
          <StatCard label="Pending" value={metrics?.pending ?? "—"} icon={FileClock} />
          <StatCard
            label="Verified"
            value={metrics?.verified ?? "—"}
            icon={BadgeCheck}
            tone="verify"
          />
          <StatCard
            label="Expiring in 30 days"
            value={metrics?.expiringSoon ?? "—"}
            icon={ShieldAlert}
            tone="caution"
          />
          <StatCard label="Registered instruments" value={metrics?.instruments ?? "—"} icon={Gauge} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Applications over time" subtitle="Submitted vs. verified, last six months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={overview?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="applications"
                name="Applications"
                stroke="var(--chart-1)"
                strokeWidth={2.2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="verified"
                name="Verified"
                stroke="var(--chart-3)"
                strokeWidth={2.2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Application pipeline" subtitle="Open volume by processing stage">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={overview?.lifecycle ?? []} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                type="category"
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={92}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Applications" radius={[0, 4, 4, 0]}>
                {(overview?.lifecycle ?? []).map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Instrument distribution" subtitle="Registered instruments by category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={overview?.byCategory ?? []} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                type="category"
                dataKey="type"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={132}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Instruments" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="District distribution" subtitle="Applications raised per district">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(overview?.byDistrict ?? []).slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="district"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                interval={0}
                angle={-20}
                height={50}
                textAnchor="end"
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Applications" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <SectionHeader
            title="Officer workload"
            description="Pending and completed inspections per officer"
            icon={Users}
          />
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Officer</th>
                  <th className="px-4 py-2.5 text-left font-medium">District</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pending</th>
                  <th className="px-4 py-2.5 text-right font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(overview?.officerWorkload ?? []).map((officer) => (
                  <tr key={officer.name} className="hover:bg-accent/60">
                    <td className="px-4 py-2.5 font-medium text-foreground">{officer.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{officer.district}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{officer.pending}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {officer.completed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!overview?.officerWorkload.length ? (
              <EmptyState icon={Users} title="No officers assigned yet" />
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <SectionHeader
              title="Applications ready to schedule"
              description="Documents approved, awaiting officer assignment"
              icon={ClipboardCheck}
              action={
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link to="/dashboard/assignments">
                    {t("action.viewAll")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {queue?.readyToScheduleList.length ? (
                queue.readyToScheduleList.map((application) => (
                  <button
                    key={application._id}
                    type="button"
                    onClick={() => navigate(`/dashboard/applications/${application._id}`)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block gov-id text-sm font-medium">
                        {application.applicationNumber}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {application.applicantName} · {application.district}
                      </span>
                    </span>
                    <StatusBadge status={application.status} />
                  </button>
                ))
              ) : (
                <EmptyState icon={ClipboardCheck} title="Nothing awaiting scheduling" />
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Certificate expiry analysis" icon={ShieldAlert} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="space-y-2.5">
                {(expiry?.buckets ?? []).map((bucket) => {
                  const max = Math.max(
                    ...(expiry?.buckets ?? []).map((b) => b.count),
                    1,
                  );
                  return (
                    <div key={bucket.days}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Within {bucket.days} days
                        </span>
                        <span className="font-semibold tabular-nums">{bucket.count}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-[var(--saffron)]"
                          style={{ width: `${(bucket.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                <div>
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Expired
                  </dt>
                  <dd className="mt-1 font-display text-lg font-bold tabular-nums text-destructive">
                    {expiry?.expired ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Revoked
                  </dt>
                  <dd className="mt-1 font-display text-lg font-bold tabular-nums">
                    {expiry?.revoked ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Active
                  </dt>
                  <dd className="mt-1 font-display text-lg font-bold tabular-nums text-[color-mix(in_oklab,var(--verify)_70%,black)]">
                    {expiry?.valid ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>

      <section className="mt-6">
        <SectionHeader
          title="State-wise summary"
          icon={Landmark}
          description="National comparison of application and instrument volumes."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(overview?.byState ?? []).map((row) => (
            <div key={row.state} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                  <Building2 className="size-4 text-primary" aria-hidden="true" />
                  {row.state}
                </p>
                <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Applications", value: row.applications },
                  { label: "Verified", value: row.verified },
                  { label: "Instruments", value: row.instruments },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 font-display text-base font-bold tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionHeader title="Recent decisions" icon={FileClock} />
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {(queue?.awaitingReviewList ?? []).slice(0, 5).map((application) => (
            <Link
              key={application._id}
              to={`/dashboard/applications/${application._id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="min-w-0">
                <span className="block gov-id text-sm font-medium">
                  {application.applicationNumber}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {application.applicantName} · submitted {formatDateTime(application.submittedAt)}
                </span>
              </span>
              <StatusBadge status={application.status} />
            </Link>
          ))}
          {!queue?.awaitingReviewList.length ? (
            <EmptyState icon={FileClock} title="Review queue is clear" />
          ) : null}
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Pipeline stages shown as {["submitted", "under_review", "approved", "scheduled"]
          .map((s) => t(statusKey(s)))
          .join(" → ")}
        .
      </p>
    </AppShell>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}
