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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOnlineStatus } from "@/hooks/use-online";
import { deviceLabel, formatClock, formatDate, formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  listQueue,
  patchRecord,
  removeRecord,
  type OfflineRecord,
  type SyncState,
} from "@/lib/offline";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  Loader2,
  MapPin,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  Timer,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const STATE_STYLE: Record<SyncState, string> = {
  pending:
    "border-[color-mix(in_oklab,var(--caution)_40%,transparent)] text-[color-mix(in_oklab,var(--caution)_65%,black)]",
  syncing: "border-primary/40 text-primary",
  synced:
    "border-[color-mix(in_oklab,var(--verify)_38%,transparent)] text-[color-mix(in_oklab,var(--verify)_70%,black)]",
  failed: "border-destructive/40 text-destructive",
};

const INSPECTION_STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "Verification in progress" },
  { value: "completed", label: "Result submitted" },
  { value: "synced", label: "Certificate issued" },
];

const PRIORITY_FILTERS = [
  { value: "all", label: "Any priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
];

export default function FieldList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<"today" | "overdue" | "upcoming" | "completed">("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [queue, setQueue] = useState<OfflineRecord[]>([]);
  const [syncing, setSyncing] = useState(false);

  const rows = useQuery(api.inspections.forOfficer, {
    window: tab,
    status: statusFilter === "all" ? undefined : statusFilter,
    district: districtFilter === "all" ? undefined : districtFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    from: dateFilter ? new Date(`${dateFilter}T00:00:00`).getTime() : undefined,
    to: dateFilter ? new Date(`${dateFilter}T23:59:59`).getTime() : undefined,
  });
  const districtOptions = useQuery(api.masterData.districts, {});
  const overview = useQuery(api.dashboard.lmoOverview, {});
  const submitResult = useMutation(api.inspections.submitResult);

  const filtersActive =
    statusFilter !== "all" || districtFilter !== "all" || priorityFilter !== "all" || dateFilter !== "";
  const clearFilters = () => {
    setStatusFilter("all");
    setDistrictFilter("all");
    setPriorityFilter("all");
    setDateFilter("");
  };

  const refreshQueue = useCallback(async () => {
    setQueue(await listQueue());
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue, tab]);

  const pending = queue.filter((r) => r.state !== "synced");

  const syncAll = async () => {
    if (!online) {
      toast.error("Still offline — records stay queued on this device.");
      return;
    }
    setSyncing(true);
    for (const record of pending) {
      await patchRecord(record.id, { state: "syncing", error: undefined });
      await refreshQueue();
      try {
        await submitResult({
          id: record.inspectionId as Id<"inspections">,
          result: record.payload.result as never,
          officerRemarks: record.payload.officerRemarks,
          signatureName: record.payload.signatureName,
          measurements: record.payload.measurements as never,
          observations: record.payload.observations as never,
          gps: record.payload.gps as never,
          photos: record.payload.photos as never,
          capturedOffline: true,
          device: deviceLabel(),
        });
        await patchRecord(record.id, { state: "synced", error: undefined });
        toast.success(
          record.result === "verified"
            ? `${record.applicationNumber} synced — open the record to approve and issue the certificate`
            : `${record.applicationNumber} synced`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        const alreadyClosed = /CONFLICT|already been submitted/i.test(message);
        await patchRecord(record.id, {
          state: alreadyClosed ? "synced" : "failed",
          error: alreadyClosed ? undefined : message.replace(/^.*:\s*/, ""),
        });
      }
      await refreshQueue();
    }
    setSyncing(false);
  };

  const clearSynced = async () => {
    for (const record of queue.filter((r) => r.state === "synced")) {
      await removeRecord(record.id);
    }
    await refreshQueue();
    toast.success("Synced records cleared from this device");
  };

  return (
    <AppShell
      title={t("nav.field")}
      description="Every inspection assigned to you, plus records captured without connectivity."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.field") }]}
    >
      {/* Offline panel */}
      <section
        className={cn(
          "mb-6 rounded-xl border p-4",
          pending.length
            ? "border-[color-mix(in_oklab,var(--caution)_40%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)]"
            : "border-border bg-card",
        )}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                online ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {pending.length ? (
                <CloudUpload className="size-4" aria-hidden="true" />
              ) : (
                <CloudOff className="size-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pending.length
                  ? `${pending.length} record${pending.length === 1 ? "" : "s"} waiting to sync`
                  : "All field records are synced"}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {online ? (
                  <>
                    <CloudUpload className="size-3.5" aria-hidden="true" />
                    Connection available
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3.5" aria-hidden="true" />
                    {t("label.offline")} — new records are stored on this device
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {queue.some((r) => r.state === "synced") ? (
              <Button variant="ghost" size="sm" onClick={clearSynced}>
                Clear synced
              </Button>
            ) : null}
            <Button
              size="sm"
              className="gap-2"
              onClick={syncAll}
              disabled={!pending.length || syncing || !online}
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden="true" />
              )}
              {t("action.syncNow")}
            </Button>
          </div>
        </div>

        {queue.length ? (
          <ul className="mt-4 space-y-2">
            {queue.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="gov-id text-sm font-medium">{record.applicationNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {record.instrumentType} · {record.locationLabel} ·{" "}
                    {formatRelative(record.updatedAt)}
                  </p>
                  {record.error ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      {record.error}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                      STATE_STYLE[record.state],
                    )}
                  >
                    {record.state === "syncing" ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    ) : record.state === "synced" ? (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    ) : (
                      <CloudOff className="size-3" aria-hidden="true" />
                    )}
                    {t(`label.${record.state}` as "label.pending")}
                  </span>
                  {record.state === "synced" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await removeRecord(record.id);
                        await refreshQueue();
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("metric.todayInspections")}
          value={overview?.metrics.todayInspections ?? "—"}
          icon={CalendarClock}
          tone="primary"
          emphasis
        />
        <StatCard
          label="Overdue"
          value={overview?.metrics.overdue ?? "—"}
          hint="Past the appointment time and still open"
          icon={Timer}
          tone="caution"
        />
        <StatCard
          label="Awaiting certificate"
          value={overview?.metrics.awaitingCertificate ?? "—"}
          hint="Verified results to approve"
          icon={BadgeCheck}
          tone="verify"
        />
        <StatCard
          label="Saved on this device"
          value={pending.length}
          hint={`${queue.filter((r) => r.state === "synced").length} already synced`}
          icon={CloudOff}
        />
      </section>

      <SectionHeader
        title="Assigned inspections"
        description="Filter the assigned list by status, date, district or priority."
        icon={ScanLine}
        action={
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="flex items-center gap-1.5 pr-1 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Filters
        </span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INSPECTION_STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="h-9 w-44" aria-label="Filter by district">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any district</SelectItem>
            {(districtOptions ?? [])
              .filter((d) => d.state === (overview?.state ?? d.state))
              .map((district) => (
                <SelectItem key={district._id} value={district.name}>
                  {district.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-40" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="h-9 w-44"
          aria-label="Filter by appointment date"
        />
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {rows === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            tab === "today"
              ? t("empty.todayInspections")
              : tab === "upcoming"
                ? "No upcoming inspections"
                : "No completed inspections yet"
          }
          body={tab === "today" ? t("empty.todayInspectionsBody") : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.inspection._id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <GovId className="font-semibold">{row.instrument.instrumentCode}</GovId>
                  <StatusBadge status={row.inspection.status} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">
                  {row.application.applicantName} · {row.instrument.instrumentType}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {row.instrument.locationLabel}, {row.application.district}
                  </span>
                  <span>
                    {formatClock(row.inspection.scheduledAt)} ·{" "}
                    {formatDate(row.inspection.scheduledAt)}
                  </span>
                  <span className="gov-id">{row.application.applicationNumber}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dashboard/applications/${row.application._id}`)}
                >
                  {t("action.viewDetails")}
                </Button>
                {["scheduled", "in_progress"].includes(row.inspection.status) ? (
                  <Button
                    className="gap-2"
                    onClick={() => navigate(`/dashboard/field/${row.application._id}`)}
                  >
                    <ScanLine className="size-4" aria-hidden="true" />
                    {row.inspection.status === "in_progress"
                      ? t("action.continue")
                      : t("action.startVerification")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
