import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import { History, Search, ShieldCheck, Activity, MonitorSmartphone } from "lucide-react";
import { useState } from "react";

const ROLE_LABEL: Record<string, string> = {
  lmo: "Legal Metrology Officer",
  business: "Business",
  dept_admin: "Department Admin",
  ministry: "Ministry",
  admin: "Administrator",
  system: "METRIQ System",
  gatc: "GATC",
  user: "Portal user",
};

export default function AuditLog() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const rows = useQuery(api.audit.list, { search: search.trim() || undefined, limit: 120 });
  const summary = useQuery(api.audit.summary, {});

  return (
    <AppShell
      title={t("nav.audit")}
      description="Append-only record of significant actions taken across the platform."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.audit") }]}
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Recorded events"
          value={summary?.total ?? "—"}
          icon={Activity}
          tone="primary"
          emphasis
        />
        <StatCard
          label="Distinct action types"
          value={summary?.byAction.length ?? "—"}
          icon={ShieldCheck}
        />
        <StatCard
          label="Shown in this view"
          value={rows?.length ?? "—"}
          icon={History}
        />
      </section>

      <SectionHeader
        title="Audit trail"
        icon={History}
        action={
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, actor or record"
              className="h-9 w-full pl-9 sm:w-72"
              aria-label="Search audit log"
            />
          </div>
        }
      />

      {rows === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit entries match this filter"
          body="Try a different search term."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-medium">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-left font-medium">Record</th>
                <th className="px-4 py-2.5 text-left font-medium">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row._id} className="align-top hover:bg-accent/50">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-foreground">{row.actorName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_LABEL[row.actorRole] ?? row.actorRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="gov-id text-xs text-foreground">
                      {row.action.replace(/\./g, " · ")}
                    </span>
                    {row.detail ? (
                      <span className="mt-0.5 block max-w-md text-xs text-muted-foreground">
                        {row.detail}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 gov-id text-xs text-muted-foreground">
                    {row.recordLabel}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MonitorSmartphone className="size-3.5" aria-hidden="true" />
                      {row.device ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">
        Audit entries record the timestamp, actor, role, action, affected record and the
        device that originated the request. Personal identifiers are limited to the acting
        account; no contact details or document contents are duplicated into the log.
      </p>
    </AppShell>
  );
}
