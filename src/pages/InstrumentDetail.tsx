import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { DataRow, EmptyState, GovId, LoadingBlock, SectionHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "convex/react";
import {
  BadgeCheck,
  CalendarClock,
  FileText,
  History,
  MapPin,
  Ruler,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

export default function InstrumentDetail() {
  const { instrumentId } = useParams<{ instrumentId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const data = useQuery(
    api.instruments.find,
    instrumentId ? { id: instrumentId as Id<"instruments"> } : "skip",
  );
  if (data === undefined) {
    return (
      <AppShell title="Instrument" breadcrumb={[{ label: t("nav.instruments") }]}>
        <LoadingBlock rows={4} />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Instrument" breadcrumb={[{ label: t("nav.instruments") }]}>
        <EmptyState
          icon={Ruler}
          title="Instrument not found"
          body="This instrument is not in the registry, or it belongs to another establishment."
          action={
            <Button asChild>
              <Link to="/dashboard/instruments">{t("nav.instruments")}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const instrument = data.instrument;
  const active = data.certificates[0] ?? null;
  const due = daysUntil(instrument.nextVerificationDue);
  const openApplication = data.applications.find((a) =>
    [
      "draft",
      "submitted",
      "under_review",
      "documents_required",
      "approved",
      "scheduled",
      "inspection_pending",
      "verification_in_progress",
    ].includes(a.status),
  );

  const timeline = [
    ...data.applications.map((a) => ({
      id: `app-${a._id}`,
      at: a.submittedAt ?? a.createdAt,
      title: `Application ${a.applicationNumber}`,
      body: `${a.type === "new" ? "New verification" : "Re-verification"} · ${a.status.replace(/_/g, " ")}`,
      status: a.status,
      to: `/dashboard/applications/${a._id}`,
    })),
    ...data.certificates.map((c) => ({
      id: `cert-${c._id}`,
      at: c.verificationDate,
      title: `Certificate ${c.certificateNumber}`,
      body: `Issued ${formatDate(c.verificationDate)} · valid to ${formatDate(c.validUntil)}`,
      status: c.status,
      to: `/dashboard/certificates/${c._id}`,
    })),
    {
      id: "registered",
      at: instrument.registeredAt,
      title: "Instrument registered",
      body: `${instrument.manufacturer} ${instrument.model} added to the registry`,
      status: "draft",
      to: undefined,
    },
  ]
    .filter((row) => row.at)
    .sort((a, b) => b.at - a.at);

  return (
    <AppShell
      title={instrument.instrumentCode}
      breadcrumb={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.instruments"), to: "/dashboard/instruments" },
        { label: instrument.instrumentCode },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {active ? (
            <Button className="gap-2" onClick={() => navigate(`/dashboard/certificates/${active._id}`)}>
              <BadgeCheck className="size-4" aria-hidden="true" />
              Open certificate
            </Button>
          ) : null}
          {openApplication ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/dashboard/applications/${openApplication._id}`)}
            >
              <FileText className="size-4" aria-hidden="true" />
              Open application
            </Button>
          ) : null}
          {profile?.role === "business" ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/dashboard/applications/new?instrument=${instrument._id}`)}
            >
              Apply for verification
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  {instrument.categoryName}
                </p>
                <h1 className="mt-1 font-display text-xl font-bold tracking-tight">
                  {instrument.instrumentType}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {instrument.locationLabel}, {instrument.district}, {instrument.state}
                </p>
              </div>
              <StatusBadge status={instrument.status} />
            </div>

            <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
              <DataRow label="Instrument ID" value={instrument.instrumentCode} mono />
              <DataRow label="Serial number" value={instrument.serialNumber} mono />
              <DataRow label="Manufacturer" value={instrument.manufacturer} />
              <DataRow label="Model" value={instrument.model} mono />
              <DataRow label="Capacity" value={instrument.capacity} />
              <DataRow label="Accuracy class" value={instrument.accuracyClass} />
              <DataRow label="Owner" value={instrument.ownerName} />
              <DataRow label="Registered on" value={formatDate(instrument.registeredAt)} />
              <DataRow
                label="Last verification"
                value={formatDate(instrument.lastVerificationAt)}
              />
              <DataRow
                label="Next verification due"
                value={
                  instrument.nextVerificationDue ? (
                    <span className="inline-flex items-center gap-2">
                      {formatDate(instrument.nextVerificationDue)}
                      {due !== null ? (
                        <span
                          className={
                            due < 0
                              ? "text-xs text-destructive"
                              : due <= 30
                                ? "text-xs text-[color-mix(in_oklab,var(--caution)_65%,black)]"
                                : "text-xs text-muted-foreground"
                          }
                        >
                          {due >= 0 ? `in ${due}d` : `lapsed ${Math.abs(due)}d`}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    "Not yet verified"
                  )
                }
              />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader title="Current certificate" icon={BadgeCheck} />
            {active ? (
              <>
                <dl className="grid gap-x-8 sm:grid-cols-2">
                  <DataRow label="Certificate" value={active.certificateNumber} mono />
                  <DataRow label="Status" value={<StatusBadge status={active.status} />} />
                  <DataRow label="Verified on" value={formatDate(active.verificationDate)} />
                  <DataRow label="Valid until" value={formatDate(active.validUntil)} />
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to={`/dashboard/certificates/${active._id}`}>
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Certificate
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/verify/${active.certificateNumber}`}>
                      <ScanLine className="size-3.5" aria-hidden="true" />
                      Public verification
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="No active certificate"
                body="This instrument has not completed a successful verification yet."
              />
            )}
          </section>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="inspection">Inspections</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <ol className="relative space-y-5 border-l border-border pl-5">
                {timeline.map((row) => (
                  <li key={row.id} className="relative">
                    <span
                      className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-[var(--saffron)] ring-4 ring-card"
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-display text-sm font-semibold text-foreground">
                        {row.title}
                      </p>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(row.at)}
                    </p>
                    {row.to ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0 text-xs"
                        onClick={() => navigate(row.to!)}
                      >
                        Open record
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ol>
            </TabsContent>

            <TabsContent value="inspection" className="mt-4">
              {data.inspections.length ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {data.inspections.map((inspection) => (
                    <li key={inspection._id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-medium">
                            {inspection.officerName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDateTime(inspection.scheduledAt)} ·{" "}
                            {inspection.measurements.length} test loads ·{" "}
                            {inspection.photos.length} photographs
                          </span>
                        </span>
                        <StatusBadge status={inspection.status} />
                      </div>
                      {inspection.officerRemarks ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {inspection.officerRemarks}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={History} title="No inspections recorded yet" />
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {data.applications.length ? (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {data.applications.map((application) => (
                    <li
                      key={application._id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <span>
                        <GovId>{application.applicationNumber}</GovId>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatDate(application.submittedAt ?? application.createdAt)}
                        </span>
                      </span>
                      <StatusBadge status={application.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FileText} title="No documents uploaded yet" />
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Documents are attached per application. Open an application to review or
                download its files.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Compliance position" icon={CalendarClock} />
            <div className="space-y-1">
              <DataRow
                label="Current status"
                value={<StatusBadge status={instrument.status} />}
              />
              <DataRow
                label="Days to renewal"
                value={due !== null ? `${due} days` : "—"}
              />
              <DataRow
                label="Verifications"
                value={`${data.certificates.length} certificate${data.certificates.length === 1 ? "" : "s"}`}
              />
              <DataRow label="Applications" value={data.applications.length} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Location" icon={MapPin} />
            <p className="text-sm text-foreground">{instrument.addressLine}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {instrument.district}, {instrument.state} — {instrument.pincode}
            </p>
            <p className="gov-id mt-2 text-xs text-muted-foreground">
              {instrument.lat.toFixed(5)}, {instrument.lng.toFixed(5)}
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
