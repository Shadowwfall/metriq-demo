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
import { useAuth } from "@/hooks/use-auth";
import { daysUntil, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  BadgeCheck,
  CalendarClock,
  Download,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "valid", label: "Valid" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
];

export default function Certificates() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = useQuery(api.profiles.current);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const organizationId =
    profile?.role === "business" ? (profile.organization?._id ?? undefined) : undefined;

  const rows = useQuery(api.certificates.list, {
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    organizationId: organizationId as never,
    limit: 80,
  });

  const counts = {
    valid: rows?.filter((r) => r.status === "valid").length ?? 0,
    expiring: rows?.filter((r) => r.status === "expiring_soon").length ?? 0,
    expired: rows?.filter((r) => r.status === "expired").length ?? 0,
    revoked: rows?.filter((r) => r.status === "revoked").length ?? 0,
  };

  return (
    <AppShell
      title={t("nav.certificates")}
      description="Digital verification certificates issued against registered instruments."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.certificates") }]}
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("status.valid")}
          value={counts.valid}
          icon={ShieldCheck}
          tone="verify"
          emphasis
        />
        <StatCard
          label={t("status.expiring_soon")}
          value={counts.expiring}
          icon={CalendarClock}
          tone="caution"
        />
        <StatCard label={t("status.expired")} value={counts.expired} icon={ShieldAlert} tone="danger" />
        <StatCard label={t("status.revoked")} value={counts.revoked} icon={ShieldAlert} tone="danger" />
      </section>

      <SectionHeader
        title="Certificate register"
        icon={BadgeCheck}
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
                placeholder="Certificate, instrument, serial or owner"
                className="h-9 w-full pl-9 sm:w-72"
                aria-label="Search certificates"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-44 bg-card" aria-label="Filter by status">
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
          icon={BadgeCheck}
          title="No certificates match this filter"
          body="Certificates appear here as soon as an officer marks an instrument as verified."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {rows.map((cert) => {
              const days = daysUntil(cert.validUntil);
              return (
                <li
                  key={cert._id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <GovId className="font-semibold">{cert.certificateNumber}</GovId>
                      <StatusBadge status={cert.status} />
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-foreground">
                      {cert.instrumentType} · {cert.ownerName}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="gov-id">{cert.instrumentCode}</span>
                      <span>
                        Verified {formatDate(cert.verificationDate)} · valid to{" "}
                        {formatDate(cert.validUntil)}
                      </span>
                      <span>{cert.district}, {cert.state}</span>
                      {days !== null ? (
                        <span
                          className={
                            days < 0
                              ? "text-destructive"
                              : days <= 30
                                ? "text-[color-mix(in_oklab,var(--caution)_65%,black)]"
                                : ""
                          }
                        >
                          {days >= 0 ? `${days} days left` : `lapsed ${Math.abs(days)}d ago`}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => navigate(`/verify/${cert.certificateNumber}`)}
                    >
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Verify
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => navigate(`/dashboard/certificates/${cert._id}`)}>
                      <Download className="size-3.5" aria-hidden="true" />
                      Open
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {profile?.role === "lmo" ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Certificates you issue appear here and in the owner&apos;s portal immediately.
          {user?.name ? ` Signed in as ${user.name}.` : ""}
        </p>
      ) : null}

      <div className="mt-6">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/reports">Open certificate expiry report</Link>
        </Button>
      </div>
    </AppShell>
  );
}
