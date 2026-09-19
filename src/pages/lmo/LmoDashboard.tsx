import { AppShell } from "@/components/app-shell";
import { FieldMap, MapPointList, type MapPoint } from "@/components/field-map";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, GovId, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useOnlineStatus } from "@/hooks/use-online";
import { listQueue } from "@/lib/offline";
import { formatClock, formatRelative, initials } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CircleDashed,
  CloudUpload,
  ClipboardCheck,
  FileClock,
  FileSearch,
  Gauge,
  MapPin,
  Route,
  ScanLine,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return "greeting.morning" as const;
  if (hour < 17) return "greeting.afternoon" as const;
  return "greeting.evening" as const;
}

export default function LmoDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const overview = useQuery(api.dashboard.lmoOverview, {});
  const queue = useQuery(api.applications.queue, {});
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listQueue().then((rows) => {
      if (!cancelled) {
        setOfflineCount(rows.filter((r) => r.state === "pending" || r.state === "failed").length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const todayPoints: MapPoint[] = useMemo(
    () =>
      (overview?.todayList ?? []).map((row) => ({
        id: row.application._id,
        lat: row.instrument.lat,
        lng: row.instrument.lng,
        label: row.application.applicantName,
        sublabel: `${row.instrument.instrumentCode} · ${row.instrument.instrumentType}`,
        time: row.inspection.scheduledAt,
        state: row.inspection.status === "in_progress" ? "in_progress" : "pending",
      })),
    [overview],
  );

  const officerName = overview?.officer?.name ?? user?.name ?? "Officer";
  const jurisdiction = overview?.district
    ? `${overview.district}${overview.state ? `, ${overview.state}` : ""}`
    : "Jurisdiction not assigned";

  return (
    <AppShell
      title={t("nav.today")}
      breadcrumb={[{ label: t("nav.dashboard") }]}
    >
      {/* Greeting */}
      <section className="mb-6 rounded-2xl border border-primary/25 bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-base font-bold">
              {initials(officerName)}
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                {t(greetingKey())}
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/80">
                {officerName}
                {overview?.officer?.designation ? ` · ${overview.officer.designation}` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-primary-foreground/70">
                <MapPin className="size-3.5" aria-hidden="true" />
                {t("label.jurisdiction")}: {jurisdiction}
                {overview?.officer?.employeeCode ? (
                  <span className="gov-id ml-1 opacity-80">
                    {overview.officer.employeeCode}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="gap-2 bg-white/12 text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/dashboard/field")}
            >
              <ScanLine className="size-4" aria-hidden="true" />
              {t("nav.field")}
            </Button>
            <Button
              variant="secondary"
              className="gap-2 bg-white/12 text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/dashboard/schedule")}
            >
              <CalendarClock className="size-4" aria-hidden="true" />
              {t("nav.schedule")}
            </Button>
          </div>
        </div>

        {!online || offlineCount > 0 ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <CloudUpload className="size-4" aria-hidden="true" />
              <span className="font-medium">
                {offlineCount} record{offlineCount === 1 ? "" : "s"} waiting to sync
              </span>
              <span className="text-primary-foreground/70">
                {online ? "· connection available" : "· currently offline"}
              </span>
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/15 text-primary-foreground hover:bg-white/25"
              onClick={() => navigate("/dashboard/field")}
            >
              {t("action.syncNow")}
            </Button>
          </div>
        ) : null}
      </section>

      {/* Today's overview */}
      <section aria-labelledby="today-overview" className="mb-8">
        <SectionHeader
          id="today-overview"
          title={t("section.todayOverview")}
          icon={Gauge}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/dashboard/assignments">
                {t("action.viewAll")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("metric.todayInspections")}
            value={overview?.metrics.todayInspections ?? "—"}
            hint="Field appointments scheduled for today"
            icon={CalendarClock}
            tone="primary"
            emphasis
          />
          <StatCard
            label={t("metric.pendingVerification")}
            value={overview?.metrics.pendingVerification ?? "—"}
            hint={`Open applications in ${overview?.district ?? "your district"}`}
            icon={ClipboardCheck}
          />
          <StatCard
            label={t("metric.completedToday")}
            value={overview?.metrics.completedToday ?? "—"}
            hint="Results submitted today"
            icon={BadgeCheck}
            tone="verify"
          />
          <StatCard
            label={t("metric.expiringSoon")}
            value={overview?.metrics.expiringSoon ?? "—"}
            hint="Certificates lapsing within 30 days"
            icon={TriangleAlert}
            tone="caution"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* Today's inspections */}
        <section aria-labelledby="today-inspections">
          <SectionHeader
            id="today-inspections"
            title={t("section.todayInspections")}
            description="Ordered by appointment time. Open a record to begin the field workflow."
            icon={ScanLine}
          />

          {overview === undefined ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : overview.todayList.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={t("empty.todayInspections")}
              body={t("empty.todayInspectionsBody")}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard/assignments">{t("nav.assignments")}</Link>
                </Button>
              }
            />
          ) : (
            <ol className="space-y-3">
              {overview.todayList.map((row, index) => (
                <li
                  key={row.inspection._id}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="w-20 shrink-0">
                        <p className="font-display text-base font-bold tabular-nums text-foreground">
                          {formatClock(row.inspection.scheduledAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {index === 0 ? "Next up" : `Stop ${index + 1}`}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-foreground">
                          {row.application.applicantName}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {row.instrument.instrumentType}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <GovId className="text-xs">{row.instrument.instrumentCode}</GovId>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {row.instrument.locationLabel}, {row.application.district}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={row.inspection.status}
                            pulse={row.inspection.status === "in_progress"}
                          />
                          <StatusBadge status={row.application.status} />
                          {row.application.priority !== "normal" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_oklab,var(--caution)_65%,black)]">
                              <Timer className="size-3" aria-hidden="true" />
                              {row.slaLabel}
                            </span>
                          ) : null}
                          <span className="gov-id text-[11px] text-muted-foreground">
                            {row.application.applicationNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <Button
                        className="gap-2"
                        onClick={() =>
                          navigate(`/dashboard/field/${row.application._id}`)
                        }
                      >
                        <ScanLine className="size-4" aria-hidden="true" />
                        {row.inspection.status === "in_progress"
                          ? t("action.continue")
                          : t("action.startVerification")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          navigate(`/dashboard/applications/${row.application._id}`)
                        }
                      >
                        {t("action.viewDetails")}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6">
          <section aria-labelledby="field-ops">
            <SectionHeader
              id="field-ops"
              title={t("section.fieldOps")}
              icon={Route}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate("/dashboard/schedule")}
                >
                  <Route className="size-3.5" aria-hidden="true" />
                  {t("action.viewRoute")}
                </Button>
              }
            />
            <FieldMap points={todayPoints} />
            {todayPoints.length ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-4">
                <MapPointList points={todayPoints} />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="pending-apps">
            <SectionHeader
              id="pending-apps"
              title={t("section.pendingApplications")}
              icon={FileSearch}
              action={
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link to="/dashboard/assignments">
                    {t("action.viewAll")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: "queue.newApplications",
                  value: queue?.buckets.newApplications,
                  icon: FileClock,
                },
                {
                  key: "queue.documentsToReview",
                  value: queue?.buckets.documentsToReview,
                  icon: FileSearch,
                },
                {
                  key: "queue.reInspections",
                  value: queue?.buckets.reInspections,
                  icon: ShieldCheck,
                },
                {
                  key: "queue.pendingResults",
                  value: queue?.buckets.pendingResults,
                  icon: CircleDashed,
                },
              ].map((item) => (
                <Link
                  key={item.key}
                  to="/dashboard/assignments"
                  className="rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 focus-visible:border-primary"
                >
                  <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 font-display text-xl font-bold tabular-nums text-foreground">
                    {item.value ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    {t(item.key as "queue.newApplications")}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="recent-activity">
            <SectionHeader
              id="recent-activity"
              title={t("section.recentActivity")}
              icon={Users}
            />
            <div className="rounded-xl border border-border bg-card p-4">
              {overview?.recentActivity.length ? (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {overview.recentActivity.map((row) => (
                    <li key={row._id} className="relative">
                      <span
                        className="absolute top-1.5 -left-[1.34rem] size-2 rounded-full bg-[var(--saffron)] ring-4 ring-card"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-medium text-foreground">
                        {row.detail ?? row.action.replace(/\./g, " · ")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.actorName} · {formatRelative(row.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No recent activity recorded.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
