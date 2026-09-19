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
import { daysUntil, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  BadgeCheck,
  CircleSlash,
  Plus,
  Ruler,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "verification_due", label: "Verification due" },
  { value: "verification_expired", label: "Verification expired" },
  { value: "under_verification", label: "Under verification" },
  { value: "suspended", label: "Suspended" },
];

export default function Instruments() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const isBusiness = profile?.role === "business";
  const rows = useQuery(api.instruments.list, {
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    organizationId: isBusiness ? (profile?.organization?._id as never) : undefined,
    limit: 60,
  });
  const summary = useQuery(api.instruments.byCategory, {});

  return (
    <AppShell
      title={t("nav.instruments")}
      description="Central registry of weighing, weight and measuring instruments."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.instruments") }]}
      actions={
        isBusiness ? (
          <Button className="gap-2" onClick={() => navigate("/dashboard/instruments/new")}>
            <Plus className="size-4" aria-hidden="true" />
            {t("action.registerInstrument")}
          </Button>
        ) : null
      }
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Instruments"
          value={isBusiness ? (rows?.length ?? "—") : (summary?.total ?? "—")}
          icon={Ruler}
          tone="primary"
          emphasis
        />
        <StatCard
          label={t("status.active")}
          value={rows?.filter((r) => r.status === "active").length ?? "—"}
          icon={BadgeCheck}
          tone="verify"
        />
        <StatCard
          label="Verification due / expired"
          value={
            rows?.filter((r) =>
              ["verification_due", "verification_expired"].includes(r.status),
            ).length ?? "—"
          }
          icon={TriangleAlert}
          tone="caution"
        />
        <StatCard
          label="Under verification"
          value={rows?.filter((r) => r.status === "under_verification").length ?? "—"}
          icon={CircleSlash}
        />
      </section>

      <SectionHeader
        title="Registry"
        icon={Ruler}
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
                placeholder="Instrument ID, serial, manufacturer, owner"
                className="h-9 w-full pl-9 sm:w-72"
                aria-label="Search instruments"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-48 bg-card" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
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
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No instruments found"
          body="Adjust the filters, or register a new instrument to start the verification journey."
          action={
            isBusiness ? (
              <Button size="sm" onClick={() => navigate("/dashboard/instruments/new")}>
                {t("action.registerInstrument")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Instrument</th>
                <th className="px-4 py-2.5 text-left font-medium">Owner</th>
                <th className="px-4 py-2.5 text-left font-medium">Location</th>
                <th className="px-4 py-2.5 text-left font-medium">Next due</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((instrument) => {
                const due = daysUntil(instrument.nextVerificationDue);
                return (
                  <tr
                    key={instrument._id}
                    className="cursor-pointer hover:bg-accent/60"
                    onClick={() => navigate(`/dashboard/instruments/${instrument._id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="block gov-id font-medium">
                        {instrument.instrumentCode}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {instrument.instrumentType} · {instrument.manufacturer}{" "}
                        {instrument.model}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="block truncate text-foreground">
                        {instrument.ownerName}
                      </span>
                      <span className="block text-xs">{instrument.serialNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="block truncate">{instrument.locationLabel}</span>
                      <span className="block text-xs">
                        {instrument.district}, {instrument.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{formatDate(instrument.nextVerificationDue)}</span>
                      {due !== null ? (
                        <span className="block text-xs text-muted-foreground">
                          {due >= 0 ? `${due} days` : `lapsed ${Math.abs(due)}d`}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={instrument.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
