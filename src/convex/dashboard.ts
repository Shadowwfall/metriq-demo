import { v } from "convex/values";
import { query } from "./_generated/server";
import { DAY_MS, requireUser, startOfToday } from "./helpers";
import { withDerivedStatus } from "./certificates";
import { ROLES } from "./schema";

const OPEN_STATUSES = [
  "submitted",
  "under_review",
  "documents_required",
  "approved",
  "scheduled",
  "inspection_pending",
  "verification_in_progress",
];

/* ── Legal Metrology Officer ────────────────────────────────────────────── */

export const lmoOverview = query({
  args: { district: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const officer = await ctx.db
      .query("officers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const district = args.district ?? officer?.district ?? user.jurisdictionDistrict ?? null;
    const state = officer?.state ?? user.jurisdictionState ?? null;

    const [applications, certificates, inspections, auditRows] = await Promise.all([
      ctx.db.query("applications").collect(),
      ctx.db.query("certificates").collect(),
      ctx.db.query("inspections").collect(),
      ctx.db.query("auditLogs").withIndex("by_at").order("desc").take(24),
    ]);

    const dayStart = startOfToday();
    const dayEnd = dayStart + DAY_MS;

    const mine = officer
      ? inspections.filter((i) => i.officerId === officer._id)
      : inspections.filter((i) => district && i.scheduledAt >= dayStart);

    const todayInspections = mine
      .filter(
        (i) =>
          i.scheduledAt >= dayStart &&
          i.scheduledAt < dayEnd &&
          i.status !== "completed" &&
          i.status !== "synced",
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);

    const completedToday = mine.filter(
      (i) => i.completedAt !== undefined && i.completedAt >= dayStart && i.completedAt < dayEnd,
    ).length;

    const stillOpen = (status: string) => status !== "completed" && status !== "synced";
    const now = Date.now();
    const overdue = mine.filter((i) => i.scheduledAt < now && stillOpen(i.status)).length;
    const awaitingCertificate = mine.filter(
      (i) => i.status === "completed" && i.result === "verified" && !i.certificateId,
    ).length;

    const scopedApplications = district
      ? applications.filter(
          (a) => a.district === district || a.assignedOfficerId === officer?._id,
        )
      : applications;

    const pendingVerification = scopedApplications.filter((a) =>
      OPEN_STATUSES.includes(a.status),
    ).length;

    const scopedCertificates = state ? certificates.filter((c) => c.state === state) : certificates;
    const expiringSoon = scopedCertificates.filter(
      (c) => c.status !== "revoked" && c.validUntil >= now && c.validUntil < now + 30 * DAY_MS,
    ).length;

    const todayList = [];
    for (const ins of todayInspections) {
      const [application, instrument] = await Promise.all([
        ctx.db.get(ins.applicationId),
        ctx.db.get(ins.instrumentId),
      ]);
      if (!application || !instrument) continue;
      todayList.push({
        inspection: ins,
        application,
        instrument,
        slaLabel:
          application.priority === "high"
            ? "Priority"
            : application.priority === "urgent"
              ? "Urgent"
              : "Standard",
      });
    }

    const queue = {
      newApplications: scopedApplications.filter((a) => a.status === "submitted").length,
      documentsToReview: scopedApplications.filter(
        (a) => a.status === "under_review" || a.status === "documents_required",
      ).length,
      reInspections: scopedApplications.filter(
        (a) => a.type === "re_verification" && OPEN_STATUSES.includes(a.status),
      ).length,
      pendingResults: mine.filter(
        (i) =>
          i.status === "in_progress" ||
          (i.status === "completed" && i.result === "verified" && !i.certificateId) ||
          (i.status === "scheduled" && i.scheduledAt < now),
      ).length,
      awaitingCertificate: mine.filter(
        (i) => i.status === "completed" && i.result === "verified" && !i.certificateId,
      ).length,
    };

    const recentActivity = [];
    for (const row of auditRows) {
      if (!row.actorRole || !["lmo", "system", "dept_admin", "business"].includes(row.actorRole)) continue;
      recentActivity.push(row);
      if (recentActivity.length >= 8) break;
    }

    return {
      officer,
      district,
      state,
      metrics: {
        todayInspections: todayInspections.length,
        pendingVerification,
        completedToday,
        expiringSoon,
        overdue,
        awaitingCertificate,
      },
      todayList,
      queue,
      recentActivity,
      workload: officer
        ? {
            active: officer.activeAssignments,
            completed: officer.completedAssignments,
            weekly: mine.filter((i) => (i.completedAt ?? i.scheduledAt) > now - 7 * DAY_MS).length,
          }
        : null,
    };
  },
});

/* ── Business / instrument owner ────────────────────────────────────────── */

export const businessOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const organizationId = user.organizationId;
    if (!organizationId) {
      return {
        organization: null,
        metrics: { instruments: 0, activeCertificates: 0, pendingApplications: 0, expiringSoon: 0 },
        instruments: [],
        applications: [],
        certificates: [],
        expiring: [],
      };
    }
    const organization = await ctx.db.get(organizationId);
    const [instruments, applications, certificates] = await Promise.all([
      ctx.db
        .query("instruments")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .collect(),
      ctx.db
        .query("applications")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .collect(),
      ctx.db
        .query("certificates")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .collect(),
    ]);

    const mapped = certificates.map(withDerivedStatus).sort((a, b) => b.verificationDate - a.verificationDate);
    const now = Date.now();

    return {
      organization,
      metrics: {
        instruments: instruments.length,
        activeCertificates: mapped.filter((c) => c.status === "valid" || c.status === "expiring_soon")
          .length,
        pendingApplications: applications.filter((a) => OPEN_STATUSES.includes(a.status)).length,
        expiringSoon: mapped.filter(
          (c) => c.validUntil >= now && c.validUntil < now + 60 * DAY_MS && c.status !== "revoked",
        ).length,
      },
      instruments: instruments.sort((a, b) => b.registeredAt - a.registeredAt).slice(0, 6),
      applications: applications
        .sort((a, b) => (b.submittedAt ?? b.createdAt) - (a.submittedAt ?? a.createdAt))
        .slice(0, 6),
      certificates: mapped.slice(0, 5),
      expiring: mapped
        .filter((c) => c.validUntil >= now - 30 * DAY_MS && c.status !== "revoked")
        .sort((a, b) => a.validUntil - b.validUntil)
        .slice(0, 5),
    };
  },
});

/* ── Department administrator ───────────────────────────────────────────── */

export const adminOverview = query({
  args: { district: v.optional(v.string()), state: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    let [applications, certificates, instruments, officers, gatcs] = await Promise.all([
      ctx.db.query("applications").collect(),
      ctx.db.query("certificates").collect(),
      ctx.db.query("instruments").collect(),
      ctx.db.query("officers").collect(),
      ctx.db.query("gatcs").collect(),
    ]);

    if (args.district) {
      applications = applications.filter((a) => a.district === args.district);
      certificates = certificates.filter((c) => c.district === args.district);
      instruments = instruments.filter((i) => i.district === args.district);
      officers = officers.filter((o) => o.district === args.district);
      gatcs = gatcs.filter((g) => g.district === args.district);
    } else if (args.state) {
      applications = applications.filter((a) => a.state === args.state);
      certificates = certificates.filter((c) => c.state === args.state);
      instruments = instruments.filter((i) => i.state === args.state);
      officers = officers.filter((o) => o.state === args.state);
      gatcs = gatcs.filter((g) => g.state === args.state);
    }

    const now = Date.now();
    const mapped = certificates.map(withDerivedStatus);

    const byStatus = new Map<string, number>();
    for (const a of applications) byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);

    const byDistrict = new Map<string, number>();
    for (const a of applications) byDistrict.set(a.district, (byDistrict.get(a.district) ?? 0) + 1);

    const byState = new Map<string, { applications: number; verified: number; instruments: number }>();
    for (const a of applications) {
      const row = byState.get(a.state) ?? { applications: 0, verified: 0, instruments: 0 };
      row.applications++;
      if (a.status === "verified") row.verified++;
      byState.set(a.state, row);
    }
    for (const i of instruments) {
      const row = byState.get(i.state) ?? { applications: 0, verified: 0, instruments: 0 };
      row.instruments++;
      byState.set(i.state, row);
    }

    const months: { label: string; applications: number; verified: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date();
      ref.setMonth(ref.getMonth() - i, 1);
      ref.setHours(0, 0, 0, 0);
      const start = ref.getTime();
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
      months.push({
        label: ref.toLocaleString("en-IN", { month: "short" }),
        applications: applications.filter(
          (a) => (a.submittedAt ?? a.createdAt) >= start && (a.submittedAt ?? a.createdAt) < end,
        ).length,
        verified: applications.filter(
          (a) => a.status === "verified" && (a.submittedAt ?? a.createdAt) >= start && (a.submittedAt ?? a.createdAt) < end,
        ).length,
      });
    }

    const byCategory = new Map<string, number>();
    for (const i of instruments) byCategory.set(i.instrumentType, (byCategory.get(i.instrumentType) ?? 0) + 1);

    return {
      metrics: {
        totalApplications: applications.length,
        pending: applications.filter((a) => OPEN_STATUSES.includes(a.status)).length,
        verified: applications.filter((a) => a.status === "verified").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
        expiringSoon: mapped.filter(
          (c) => c.validUntil >= now && c.validUntil < now + 30 * DAY_MS && c.status !== "revoked",
        ).length,
        expired: mapped.filter((c) => c.status === "expired").length,
        instruments: instruments.length,
        activeOfficers: officers.length,
        activeGatcs: gatcs.length,
      },
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
      byDistrict: [...byDistrict.entries()]
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count),
      byState: [...byState.entries()].map(([state, row]) => ({ state, ...row })),
      months,
      byCategory: [...byCategory.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      officerWorkload: officers
        .map((o) => ({
          name: o.name,
          district: o.district,
          assigned: applications.filter((a) => a.assignedOfficerId === o._id).length,
          completed: o.completedAssignments,
          pending: applications.filter(
            (a) => a.assignedOfficerId === o._id && OPEN_STATUSES.includes(a.status),
          ).length,
        }))
        .sort((a, b) => b.pending - a.pending)
        .slice(0, 8),
      lifecycle: [
        { stage: "submitted", count: applications.filter((a) => a.status === "submitted").length },
        { stage: "under_review", count: applications.filter((a) => a.status === "under_review").length },
        { stage: "approved", count: applications.filter((a) => a.status === "approved").length },
        { stage: "scheduled", count: applications.filter((a) => ["scheduled", "inspection_pending"].includes(a.status)).length },
        { stage: "in_progress", count: applications.filter((a) => a.status === "verification_in_progress").length },
        { stage: "verified", count: applications.filter((a) => a.status === "verified").length },
        { stage: "rejected", count: applications.filter((a) => a.status === "rejected").length },
      ],
    };
  },
});

/* ── Global search ──────────────────────────────────────────────────────── */

export const globalSearch = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const user = await requireUser(ctx);
    const q = term.trim().toLowerCase();
    if (q.length < 2) return { applications: [], instruments: [], certificates: [], officers: [] };

    const [applications, instruments, certificates, officers] = await Promise.all([
      ctx.db.query("applications").collect(),
      ctx.db.query("instruments").collect(),
      ctx.db.query("certificates").collect(),
      ctx.db.query("officers").collect(),
    ]);

    const scopedApplications =
      user.role === ROLES.BUSINESS && user.organizationId
        ? applications.filter((a) => a.organizationId === user.organizationId)
        : applications;
    const scopedInstruments =
      user.role === ROLES.BUSINESS && user.organizationId
        ? instruments.filter((i) => i.organizationId === user.organizationId)
        : instruments;

    const match = (value: string) => value.toLowerCase().includes(q);

    return {
      applications: scopedApplications
        .filter(
          (a) =>
            match(a.applicationNumber) ||
            match(a.applicantName) ||
            match(a.serialNumber) ||
            match(a.district) ||
            match(a.instrumentType),
        )
        .slice(0, 6),
      instruments: scopedInstruments
        .filter(
          (i) =>
            match(i.instrumentCode) ||
            match(i.serialNumber) ||
            match(i.instrumentType) ||
            match(i.ownerName) ||
            match(i.district),
        )
        .slice(0, 6),
      certificates: certificates
        .filter(
          (c) =>
            match(c.certificateNumber) ||
            match(c.instrumentCode) ||
            match(c.serialNumber) ||
            match(c.organizationName) ||
            match(c.district),
        )
        .map(withDerivedStatus)
        .slice(0, 6),
      officers: officers
        .filter((o) => match(o.name) || match(o.employeeCode) || match(o.district))
        .slice(0, 4),
    };
  },
});

/* ── Expiry analysis ───────────────────────────────────────────────────── */

export const expiryAnalysis = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = (await ctx.db.query("certificates").collect()).map(withDerivedStatus);
    const now = Date.now();
    const active = rows.filter((c) => c.status !== "revoked");
    return {
      buckets: [7, 15, 30, 60, 90].map((days) => ({
        days,
        count: active.filter((c) => c.validUntil >= now && c.validUntil < now + days * DAY_MS).length,
      })),
      expired: active.filter((c) => c.validUntil < now).length,
      revoked: rows.filter((c) => c.status === "revoked").length,
      valid: active.filter((c) => c.validUntil >= now).length,
      list: active
        .filter((c) => c.validUntil >= now && c.validUntil < now + 90 * DAY_MS)
        .sort((a, b) => a.validUntil - b.validUntil)
        .slice(0, 25),
    };
  },
});
