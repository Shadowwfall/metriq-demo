import { AppShell } from "@/components/app-shell";
import { FieldMap, MapPointList, type MapPoint } from "@/components/field-map";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, GovId, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { formatClock, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  MapPin,
  Route,
  ScanLine,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

function dayKey(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function Schedule() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const isOfficer = profile?.role === "lmo";
  const [view, setView] = useState<"day" | "week" | "month">("day");

  const today = useQuery(api.inspections.forOfficer, { window: "today" });
  const upcoming = useQuery(api.inspections.forOfficer, { window: "upcoming" });
  const completed = useQuery(api.inspections.forOfficer, { window: "completed" });
  const officers = useQuery(
    api.masterData.officers,
    profile?.jurisdictionDistrict && !isOfficer
      ? { district: profile.jurisdictionDistrict }
      : {},
  );

  const all = useMemo(
    () => [...(today ?? []), ...(upcoming ?? []), ...(completed ?? [])],
    [today, upcoming, completed],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, typeof all>();
    for (const row of all) {
      const key = dayKey(row.inspection.scheduledAt);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [all]);

  const visibleGroups = useMemo(() => {
    const now = Date.now();
    if (view === "day") {
      const start = dayKey(now);
      return grouped.filter(([key]) => key === start);
    }
    if (view === "week") {
      const start = dayKey(now);
      return grouped.filter(([key]) => key >= start && key < start + 7 * 86_400_000);
    }
    return grouped.filter(([key]) => key >= dayKey(now) && key < dayKey(now) + 31 * 86_400_000);
  }, [grouped, view]);

  const points: MapPoint[] = useMemo(
    () =>
      (today ?? []).map((row) => ({
        id: row.application._id,
        lat: row.instrument.lat,
        lng: row.instrument.lng,
        label: row.application.applicantName,
        sublabel: row.instrument.instrumentCode,
        time: row.inspection.scheduledAt,
        state: row.inspection.status === "in_progress" ? "in_progress" : "pending",
      })),
    [today],
  );

  return (
    <AppShell
      title={t("nav.schedule")}
      description="Inspection calendar, field route and officer availability."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.schedule") }]}
      actions={
        <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("metric.todayInspections")}
          value={today?.length ?? "—"}
          icon={CalendarDays}
          tone="primary"
          emphasis
        />
        <StatCard label="Upcoming (7 days)" value={upcoming?.length ?? "—"} icon={CalendarRange} />
        <StatCard
          label="Completed"
          value={completed?.length ?? "—"}
          icon={ClipboardCheck}
          tone="verify"
        />
        <StatCard
          label="Distance today"
          value={
            points.length > 1
              ? `${points.length} stops`
              : `${points.length} stop`
          }
          icon={Route}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section>
          <SectionHeader
            title={view === "day" ? "Today's calendar" : view === "week" ? "Next seven days" : "Next thirty days"}
            icon={CalendarDays}
          />
          {visibleGroups.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={view === "day" ? t("empty.todayInspections") : "No inspections in this window"}
              body={t("empty.todayInspectionsBody")}
            />
          ) : (
            <div className="space-y-5">
              {visibleGroups.map(([key, rows]) => (
                <div key={key}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatDate(key)}
                    <span className="font-normal normal-case">
                      · {rows.length} appointment{rows.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <ol className="space-y-2">
                    {rows
                      .sort((a, b) => a.inspection.scheduledAt - b.inspection.scheduledAt)
                      .map((row) => (
                        <li
                          key={row.inspection._id}
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3",
                            row.inspection.status === "in_progress"
                              ? "border-primary/40"
                              : "border-border",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span className="w-16 shrink-0 border-r border-border pr-3">
                              <span className="block font-display text-sm font-bold tabular-nums">
                                {formatClock(row.inspection.scheduledAt)}
                              </span>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {row.application.applicantName}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                <GovId className="text-xs">{row.instrument.instrumentCode}</GovId>
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3.5" aria-hidden="true" />
                                  {row.instrument.locationLabel}
                                </span>
                              </span>
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StatusBadge status={row.inspection.status} />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => navigate(`/dashboard/applications/${row.application._id}`)}
                            >
                              {t("action.viewDetails")}
                            </Button>
                            {["scheduled", "in_progress"].includes(row.inspection.status) ? (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => navigate(`/dashboard/field/${row.application._id}`)}
                              >
                                <ScanLine className="size-3.5" aria-hidden="true" />
                                {row.inspection.status === "in_progress" ? "Continue" : "Start"}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section>
            <SectionHeader title="Field route" icon={Route} />
            <FieldMap points={points} />
            {points.length ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-4">
                <MapPointList points={points} />
              </div>
            ) : null}
          </section>

          <section>
            <SectionHeader title="Officer availability" icon={Users} />
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <ul className="divide-y divide-border">
                {(officers ?? [])
                  .filter((o) => isOfficer || o.district === profile?.jurisdictionDistrict)
                  .slice(0, 8)
                  .map((officer) => (
                    <li key={officer._id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {officer.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {officer.designation} · {officer.district}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-display text-sm font-bold tabular-nums">
                            {officer.pending}
                          </span>
                          <span className="block text-[10px] tracking-wide text-muted-foreground uppercase">
                            pending
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {officer.inReview} in review
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {officer.completedAssignments} completed
                        </span>
                      </div>
                    </li>
                  ))}
                {!officers?.length ? <EmptyState icon={Users} title="No officers on record" /> : null}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
