import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser, pushHistory, writeAudit } from "./helpers";
import { ROLES } from "./schema";
import { withDerivedStatus } from "./certificates";

const OPEN_APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "documents_required",
  "approved",
  "scheduled",
  "inspection_pending",
  "verification_in_progress",
];

async function officerForUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("officers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

export const list = query({
  args: {
    status: v.optional(v.string()),
    district: v.optional(v.string()),
    search: v.optional(v.string()),
    scope: v.optional(
      v.union(v.literal("mine"), v.literal("unassigned"), v.literal("all")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const limit = Math.min(args.limit ?? 60, 300);
    let rows = await ctx.db.query("applications").collect();

    if (user.role === ROLES.BUSINESS && user.organizationId) {
      rows = rows.filter((r) => r.organizationId === user.organizationId);
    } else if (user.role === ROLES.LMO) {
      const officer = await officerForUser(ctx, user._id);
      rows = officer
        ? rows.filter((r) => r.assignedOfficerId === officer._id)
        : rows.filter((r) => r.district === user.jurisdictionDistrict);
    }

    const scope = args.scope ?? "all";
    if (scope === "unassigned") rows = rows.filter((r) => !r.assignedOfficerId);
    if (scope === "mine" && user.organizationId) {
      rows = rows.filter((r) => r.organizationId === user.organizationId);
    }

    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.district) rows = rows.filter((r) => r.district === args.district);

    const search = args.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (r) =>
          r.applicationNumber.toLowerCase().includes(search) ||
          r.applicantName.toLowerCase().includes(search) ||
          r.instrumentType.toLowerCase().includes(search) ||
          r.serialNumber.toLowerCase().includes(search) ||
          r.district.toLowerCase().includes(search),
      );
    }

    return rows
      .sort((a, b) => (b.submittedAt ?? b.createdAt) - (a.submittedAt ?? a.createdAt))
      .slice(0, limit);
  },
});

export const detail = query({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const application = await ctx.db.get(id);
    if (!application) return null;

    if (
      user.role === ROLES.BUSINESS &&
      user.organizationId &&
      application.organizationId !== user.organizationId
    ) {
      return null;
    }

    const [organization, instrument, documents] = await Promise.all([
      ctx.db.get(application.organizationId),
      ctx.db.get(application.instrumentId),
      ctx.db
        .query("applicationDocuments")
        .withIndex("by_application", (q) => q.eq("applicationId", application._id))
        .collect(),
    ]);

    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_application", (q) => q.eq("applicationId", application._id))
      .collect();

    const inspection = inspections.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
    const officer = application.assignedOfficerId
      ? await ctx.db.get(application.assignedOfficerId)
      : null;
    const gatc = application.assignedGatcId
      ? await ctx.db.get(application.assignedGatcId)
      : null;
    const cert = inspection?.certificateId ? await ctx.db.get(inspection.certificateId) : null;

    const auditRows = await ctx.db
      .query("auditLogs")
      .withIndex("by_entity", (q) => q.eq("entityType", "application").eq("entityId", String(id)))
      .collect();

    return {
      application,
      organization,
      instrument,
      documents: documents.sort((a, b) => b.uploadedAt - a.uploadedAt),
      inspection,
      officer,
      gatc,
      certificate: cert ? withDerivedStatus(cert) : null,
      auditLogs: auditRows.sort((a, b) => b.at - a.at),
    };
  },
});

/** Queue summary used by the admin review desk and the LMO pending panel. */
export const queue = query({
  args: { district: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let rows = await ctx.db.query("applications").collect();
    if (args.district) rows = rows.filter((r) => r.district === args.district);
    else if (user.role === ROLES.LMO) {
      const officer = await officerForUser(ctx, user._id);
      if (officer) {
        rows = rows.filter(
          (r) => r.district === officer.district || r.assignedOfficerId === officer._id,
        );
      }
    }

    const buckets = {
      awaitingReview: rows.filter((r) => r.status === "submitted"),
      underReview: rows.filter((r) => r.status === "under_review"),
      documentsRequired: rows.filter((r) => r.status === "documents_required"),
      readyToSchedule: rows.filter((r) => r.status === "approved"),
      scheduled: rows.filter((r) => ["scheduled", "inspection_pending"].includes(r.status)),
      inProgress: rows.filter((r) => r.status === "verification_in_progress"),
      awaitingResult: rows.filter((r) =>
        ["inspection_pending", "verification_in_progress"].includes(r.status),
      ),
      reInspections: rows.filter(
        (r) => r.type === "re_verification" && OPEN_APPLICATION_STATUSES.includes(r.status),
      ),
      verified: rows.filter((r) => r.status === "verified"),
      rejected: rows.filter((r) => r.status === "rejected"),
      total: rows.length,
    };

    return {
      buckets: {
        awaitingReview: buckets.awaitingReview.length,
        underReview: buckets.underReview.length,
        documentsRequired: buckets.documentsRequired.length,
        readyToSchedule: buckets.readyToSchedule.length,
        scheduled: buckets.scheduled.length,
        inProgress: buckets.inProgress.length,
        awaitingResult: buckets.awaitingResult.length,
        reInspections: buckets.reInspections.length,
        verified: buckets.verified.length,
        rejected: buckets.rejected.length,
        total: buckets.total,
        // Dashboard-friendly aliases
        newApplications: buckets.awaitingReview.length,
        documentsToReview: buckets.underReview.length + buckets.documentsRequired.length,
        pendingResults: buckets.awaitingResult.length,
      },
      readyToScheduleList: buckets.readyToSchedule
        .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
        .slice(0, 8),
      awaitingReviewList: buckets.awaitingReview
        .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
        .slice(0, 8),
    };
  },
});

async function nextApplicationNumber(ctx: MutationCtx) {
  const rows = await ctx.db.query("applications").collect();
  const max = rows.reduce((acc, r) => {
    const n = Number(r.applicationNumber.split("-").pop());
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 1284);
  return `LM-${new Date().getUTCFullYear()}-${String(max + 1).padStart(6, "0")}`;
}

export const submit = mutation({
  args: {
    instrumentId: v.id("instruments"),
    type: v.union(v.literal("new"), v.literal("re_verification")),
    intendedUse: v.string(),
    locationOfInstrument: v.string(),
    previousCertificateNumber: v.optional(v.string()),
    previousVerificationDate: v.optional(v.number()),
    documents: v.array(
      v.object({
        kind: v.string(),
        fileName: v.string(),
        fileType: v.string(),
        sizeKb: v.number(),
        dataUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.organizationId) throw new Error("FORBIDDEN: no organisation linked to this account");
    const org = await ctx.db.get(user.organizationId);
    const instrument = await ctx.db.get(args.instrumentId);
    if (!org || !instrument) throw new Error("NOT_FOUND");
    if (instrument.organizationId !== org._id) {
      throw new Error("FORBIDDEN: this instrument belongs to another establishment");
    }
    if (args.documents.length === 0) {
      throw new Error("VALIDATION: attach at least one supporting document");
    }
    if (args.type === "re_verification" && !args.previousCertificateNumber) {
      throw new Error("VALIDATION: previous certificate number is required for re-verification");
    }

    const now = Date.now();
    const applicationNumber = await nextApplicationNumber(ctx);

    const id = await ctx.db.insert("applications", {
      applicationNumber,
      type: args.type,
      organizationId: org._id,
      instrumentId: instrument._id,
      applicantName: org.contactPerson,
      contactPhone: org.phone,
      contactEmail: org.email,
      addressLine: org.addressLine,
      state: org.state,
      district: org.district,
      pincode: org.pincode,
      instrumentCategory: instrument.categoryName,
      instrumentType: instrument.instrumentType,
      manufacturer: instrument.manufacturer,
      model: instrument.model,
      serialNumber: instrument.serialNumber,
      capacity: instrument.capacity,
      accuracyClass: instrument.accuracyClass,
      locationOfInstrument: args.locationOfInstrument,
      intendedUse: args.intendedUse,
      previousCertificateNumber: args.previousCertificateNumber,
      previousVerificationDate: args.previousVerificationDate,
      status: "submitted",
      priority: args.type === "re_verification" ? "high" : "normal",
      submittedAt: now,
      statusHistory: [
        {
          status: "submitted",
          at: now,
          byName: user.name ?? org.contactPerson,
          byRole: "business",
          note: `${args.type === "new" ? "New verification" : "Re-verification"} application submitted`,
        },
      ],
      createdByUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const doc of args.documents) {
      await ctx.db.insert("applicationDocuments", {
        applicationId: id,
        kind: doc.kind,
        fileName: doc.fileName,
        fileType: doc.fileType,
        sizeKb: doc.sizeKb,
        dataUrl: doc.dataUrl,
        uploadedBy: user.name ?? org.contactPerson,
        uploadedAt: now,
        status: "pending",
      });
    }

    await ctx.db.patch(instrument._id, { status: "under_verification" });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: user.name ?? org.contactPerson,
      actorRole: "business",
      action: "application.submitted",
      entityType: "application",
      entityId: String(id),
      recordLabel: applicationNumber,
      detail: `${instrument.instrumentCode} · ${instrument.instrumentType}`,
    });

    return { id, applicationNumber };
  },
});

export const review = mutation({
  args: {
    id: v.id("applications"),
    decision: v.union(
      v.literal("approve"),
      v.literal("request_correction"),
      v.literal("reject"),
    ),
    note: v.optional(v.string()),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (![ROLES.DEPT_ADMIN, ROLES.MINISTRY, ROLES.ADMIN].includes(user.role as never)) {
      throw new Error("FORBIDDEN: only department administrators can review applications");
    }
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("NOT_FOUND");
    if (["verified", "rejected", "cancelled"].includes(app.status)) {
      throw new Error("CONFLICT: this application is already closed");
    }

    const now = Date.now();
    const actor = user.name ?? "Department Administrator";
    const map = {
      approve: { status: "approved" as const, event: "approved", label: "Documents approved" },
      request_correction: {
        status: "documents_required" as const,
        event: "documents_required",
        label: "Additional documents requested",
      },
      reject: { status: "rejected" as const, event: "rejected", label: "Application rejected" },
    }[args.decision];

    await ctx.db.patch(args.id, {
      status: map.status,
      reviewedAt: now,
      reviewedBy: actor,
      reviewNote: args.note?.slice(0, 300),
      updatedAt: now,
      statusHistory: pushHistory(app.statusHistory, {
        status: map.event,
        byName: actor,
        byRole: user.role,
        note: args.note?.slice(0, 200) ?? map.label,
      }),
    });

    const docs = await ctx.db
      .query("applicationDocuments")
      .withIndex("by_application", (q) => q.eq("applicationId", args.id))
      .collect();
    for (const doc of docs) {
      if (args.decision === "approve") await ctx.db.patch(doc._id, { status: "verified" });
      if (args.decision === "request_correction" && doc.status === "pending") {
        await ctx.db.patch(doc._id, { status: "rejected", note: args.note?.slice(0, 160) });
      }
    }

    if (args.decision === "reject") {
      await ctx.db.patch(app.instrumentId, { status: "verification_due" });
    }

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: actor,
      actorRole: user.role ?? "dept_admin",
      action: `application.${map.event}`,
      entityType: "application",
      entityId: String(args.id),
      recordLabel: app.applicationNumber,
      detail: args.note?.slice(0, 240) ?? map.label,
      device: args.device,
    });

    return { ok: true, status: map.status };
  },
});

export const assign = mutation({
  args: {
    id: v.id("applications"),
    officerId: v.id("officers"),
    scheduledAt: v.number(),
    gatcId: v.optional(v.id("gatcs")),
    priority: v.optional(
      v.union(v.literal("normal"), v.literal("high"), v.literal("urgent")),
    ),
    note: v.optional(v.string()),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (![ROLES.DEPT_ADMIN, ROLES.MINISTRY, ROLES.ADMIN].includes(user.role as never)) {
      throw new Error("FORBIDDEN: only department administrators can assign officers");
    }
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("NOT_FOUND");
    const officer = await ctx.db.get(args.officerId);
    if (!officer) throw new Error("NOT_FOUND: officer");

    const now = Date.now();
    const actor = user.name ?? "Department Administrator";

    await ctx.db.patch(args.id, {
      assignedOfficerId: officer._id,
      assignedGatcId: args.gatcId,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      priority: args.priority ?? app.priority,
      updatedAt: now,
      statusHistory: pushHistory(
        pushHistory(app.statusHistory, {
          status: "scheduled",
          byName: actor,
          byRole: user.role,
          note: `Inspection scheduled for ${new Date(args.scheduledAt).toLocaleString("en-IN")}`,
        }),
        {
          status: "inspection_pending",
          byName: officer.name,
          byRole: "lmo",
          note: `Assigned to ${officer.designation} ${officer.name} (${officer.employeeCode})`,
        },
      ),
    });

    const existing = await ctx.db
      .query("inspections")
      .withIndex("by_application", (q) => q.eq("applicationId", args.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        officerId: officer._id,
        officerName: officer.name,
        gatcId: args.gatcId,
        scheduledAt: args.scheduledAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("inspections", {
        applicationId: args.id,
        instrumentId: app.instrumentId,
        officerId: officer._id,
        officerName: officer.name,
        gatcId: args.gatcId,
        status: "scheduled",
        scheduledAt: args.scheduledAt,
        photos: [],
        measurements: [],
        capturedOffline: false,
        updatedAt: now,
      });
    }

    await ctx.db.patch(officer._id, {
      activeAssignments: officer.activeAssignments + 1,
    });
    await ctx.db.patch(app.instrumentId, { status: "under_verification" });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: actor,
      actorRole: user.role ?? "dept_admin",
      action: "application.officer_assigned",
      entityType: "application",
      entityId: String(args.id),
      recordLabel: app.applicationNumber,
      detail: `Assigned to ${officer.name} (${officer.employeeCode}) · ${
        args.gatcId ? "GATC referral raised" : "direct inspection"
      }`,
      device: args.device,
    });

    // Mock outbound notification — queued in-app only, no external SMS is sent.
    await ctx.db.insert("notifications", {
      userId: app.createdByUserId ?? user._id,
      type: "scheduling",
      title: `Inspection scheduled for ${app.applicationNumber}`,
      titleHi: `${app.applicationNumber} के लिए निरीक्षण निर्धारित`,
      body: `${officer.designation} ${officer.name} will inspect ${app.instrumentType} at ${app.locationOfInstrument} on ${new Date(args.scheduledAt).toLocaleString("en-IN")}.`,
      bodyHi: `${officer.designation} ${officer.name} ${new Date(args.scheduledAt).toLocaleString("en-IN")} को ${app.locationOfInstrument} पर निरीक्षण करेंगे।`,
      link: "/dashboard/applications",
      read: false,
      createdAt: now,
      channelStates: { inApp: "delivered", email: "mock_dispatched", sms: "not_configured" },
    });

    return { ok: true };
  },
});

export const cancel = mutation({
  args: { id: v.id("applications"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("NOT_FOUND");
    const isOwner =
      user.role === ROLES.BUSINESS && user.organizationId === app.organizationId;
    const isAdmin = [ROLES.DEPT_ADMIN, ROLES.MINISTRY, ROLES.ADMIN].includes(user.role as never);
    if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");
    if (["verified", "rejected", "cancelled"].includes(app.status)) {
      throw new Error("CONFLICT: this application is already closed");
    }

    await ctx.db.patch(args.id, {
      status: "cancelled",
      updatedAt: Date.now(),
      statusHistory: pushHistory(app.statusHistory, {
        status: "cancelled",
        byName: user.name ?? "Applicant",
        byRole: user.role,
        note: args.reason?.slice(0, 200) ?? "Withdrawn",
      }),
    });
    await ctx.db.patch(app.instrumentId, { status: "verification_due" });
    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: user.name ?? "Applicant",
      actorRole: user.role ?? "business",
      action: "application.cancelled",
      entityType: "application",
      entityId: String(args.id),
      recordLabel: app.applicationNumber,
      detail: args.reason?.slice(0, 200),
    });
    return { ok: true };
  },
});

export const timeline = query({
  args: { id: v.id("applications") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const app = await ctx.db.get(id);
    return app?.statusHistory ?? [];
  },
});

export const forInstrument = query({
  args: { instrumentId: v.id("instruments") },
  handler: async (ctx, { instrumentId }) => {
    await requireUser(ctx);
    const rows = await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("instrumentId"), instrumentId))
      .collect();
    return rows
      .map((r) => ({ _id: r._id, applicationNumber: r.applicationNumber, status: r.status, type: r.type }))
      .sort((a, b) => a.applicationNumber.localeCompare(b.applicationNumber));
  },
});

export type ApplicationDoc = Doc<"applications">;
