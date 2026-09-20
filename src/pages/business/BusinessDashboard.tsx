import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, GovId, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatDate, daysUntil } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FilePlus2,
  Files,
  Plus,
  Ruler,
  TriangleAlert,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function BusinessDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const overview = useQuery(api.dashboard.businessOverview, {});
  const metrics = overview?.metrics;

  return (
    <AppShell title={t("nav.dashboard")} breadcrumb={[{ label: t("nav.dashboard") }]}>
      <section className="mb-6 rounded-2xl border border-primary/25 bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs tracking-[0.14em] text-primary-foreground/60 uppercase">
              Establishment
            </p>
            <h1 className="mt-1.5 font-display text-xl font-bold tracking-tight sm:text-2xl">
              {overview?.organization?.name ?? "Your establishment"}
            </h1>
            <p className="mt-1.5 text-sm text-primary-foreground/75">
              {overview?.organization
                ? `${overview.organization.addressLine}, ${overview.organization.district}, ${overview.organization.state}`
                : "Link an establishment to begin registering instruments."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="gap-2 bg-white/12 text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/dashboard/instruments/new")}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("action.registerInstrument")}
            </Button>
            <Button
              variant="secondary"
              className="gap-2 bg-white/12 text-primary-foreground hover:bg-white/20"
              onClick={() => navigate("/dashboard/applications/new")}
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              {t("action.newApplication")}
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="biz-metrics" className="mb-8">
        <SectionHeader id="biz-metrics" title="Compliance overview" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("metric.registeredInstruments")}
            value={metrics?.instruments ?? "—"}
            icon={Ruler}
            tone="primary"
          />
          <StatCard
            label={t("metric.activeCertificates")}
            value={metrics?.activeCertificates ?? "—"}
            icon={BadgeCheck}
            tone="verify"
          />
          <StatCard
            label={t("metric.pendingApplications")}
            value={metrics?.pendingApplications ?? "—"}
            icon={Files}
          />
          <StatCard
            label={t("metric.expiringSoon")}
            value={metrics?.expiringSoon ?? "—"}
            hint="Within 60 days"
            icon={TriangleAlert}
            tone="caution"
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section aria-labelledby="my-instruments" className="min-w-0">
          <SectionHeader
            id="my-instruments"
            title={t("section.myInstruments")}
            icon={Ruler}
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/dashboard/instruments">
                  {t("action.viewAll")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview?.instruments.length ? (
              overview.instruments.map((instrument) => (
                <button
                  key={instrument._id}
                  type="button"
                  onClick={() => navigate(`/dashboard/instruments/${instrument._id}`)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {instrument.instrumentType}
                    </span>
                    <span className="mt-0.5 block truncate gov-id text-xs text-muted-foreground">
                      {instrument.instrumentCode}
                    </span>
                  </span>
                  <StatusBadge status={instrument.status} />
                </button>
              ))
            ) : (
              <EmptyState
                icon={Ruler}
                title="No instruments registered yet"
                body="Register your weighing or measuring instruments to apply for verification."
                action={
                  <Button size="sm" onClick={() => navigate("/dashboard/instruments/new")}>
                    {t("action.registerInstrument")}
                  </Button>
                }
              />
            )}
          </div>
        </section>

        <section aria-labelledby="recent-apps" className="min-w-0">
          <SectionHeader
            id="recent-apps"
            title={t("section.recentApplications")}
            icon={Files}
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/dashboard/applications">
                  {t("action.viewAll")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview?.applications.length ? (
              overview.applications.map((application) => (
                <button
                  key={application._id}
                  type="button"
                  onClick={() => navigate(`/dashboard/applications/${application._id}`)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate gov-id text-sm font-medium text-foreground">
                      {application.applicationNumber}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {application.instrumentType} · {formatDate(application.submittedAt)}
                    </span>
                  </span>
                  <StatusBadge status={application.status} />
                </button>
              ))
            ) : (
              <EmptyState
                icon={Files}
                title="No applications yet"
                body="Submit a verification application for a registered instrument."
              />
            )}
          </div>
        </section>

        <section aria-labelledby="expiring" className="min-w-0">
          <SectionHeader id="expiring" title={t("section.upcomingExpirations")} icon={CalendarClock} />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview?.expiring.length ? (
              overview.expiring.map((cert) => {
                const days = daysUntil(cert.validUntil);
                return (
                  <button
                    key={cert._id}
                    type="button"
                    onClick={() => navigate(`/dashboard/certificates/${cert._id}`)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate gov-id text-sm font-medium">{cert.certificateNumber}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {cert.instrumentType}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <StatusBadge status={cert.status} />
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {days !== null && days >= 0 ? `${days} days left` : "lapsed"}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <EmptyState icon={CalendarClock} title="Nothing expiring soon" />
            )}
          </div>
        </section>

        <section aria-labelledby="recent-certs" className="min-w-0">
          <SectionHeader
            id="recent-certs"
            title={t("section.recentCertificates")}
            icon={BadgeCheck}
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/dashboard/certificates">
                  {t("action.viewAll")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {overview?.certificates.length ? (
              overview.certificates.map((cert) => (
                <button
                  key={cert._id}
                  type="button"
                  onClick={() => navigate(`/dashboard/certificates/${cert._id}`)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0">
                    <GovId className="block truncate">{cert.certificateNumber}</GovId>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      Issued {formatDate(cert.verificationDate)} · valid to{" "}
                      {formatDate(cert.validUntil)}
                    </span>
                  </span>
                  <StatusBadge status={cert.status} />
                </button>
              ))
            ) : (
              <EmptyState icon={BadgeCheck} title="No certificates issued yet" />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
