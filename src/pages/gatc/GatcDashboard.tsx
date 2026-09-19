import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import { Beaker, CheckCircle2, ClipboardList, Gauge, Info } from "lucide-react";
import { Link } from "react-router";

export default function GatcDashboard() {
  const { t } = useI18n();
  const overview = useQuery(api.dashboard.adminOverview, {});
  const certificates = useQuery(api.certificates.list, { limit: 6 });

  return (
    <AppShell title="GATC Workspace" breadcrumb={[{ label: "Test centre" }]}>
      <div className="mb-6 rounded-xl border border-[color-mix(in_oklab,var(--caution)_35%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-4">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-[color-mix(in_oklab,var(--caution)_70%,black)]" aria-hidden="true" />
          Version 1 of the prototype builds the Business → Department → Officer → Public
          certificate journey in full. The GATC testing workflow is scaffolded at read-only
          level: dashboards and records are live, but test-result entry ships in a later
          phase.
        </p>
      </div>

      <section className="mb-8">
        <SectionHeader title="Centre overview" icon={Gauge} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Referred instruments"
            value={overview?.metrics.instruments ?? "—"}
            icon={ClipboardList}
            tone="primary"
          />
          <StatCard
            label="Pending tests"
            value={overview?.metrics.pending ?? "—"}
            icon={Beaker}
            tone="caution"
          />
          <StatCard
            label="Tests completed"
            value={overview?.metrics.verified ?? "—"}
            icon={CheckCircle2}
            tone="verify"
          />
          <StatCard
            label="Active centres"
            value={overview?.metrics.activeGatcs ?? "—"}
            icon={Gauge}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Recently certified instruments"
          icon={CheckCircle2}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/certificates">{t("action.viewAll")}</Link>
            </Button>
          }
        />
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {certificates?.length ? (
            certificates.map((cert) => (
              <Link
                key={cert._id}
                to={`/dashboard/certificates/${cert._id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block gov-id text-sm font-medium">
                    {cert.certificateNumber}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {cert.instrumentType} · {formatDateTime(cert.verificationDate)}
                  </span>
                </span>
                <StatusBadge status={cert.status} />
              </Link>
            ))
          ) : (
            <EmptyState icon={Beaker} title="No test records yet" />
          )}
        </div>
      </section>
    </AppShell>
  );
}
