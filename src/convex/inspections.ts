import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { DAY_MS, pushHistory, requireUser, startOfToday, writeAudit } from "./helpers";
import { ROLES } from "./schema";
import { districtCode, stateCode } from "./instruments";

const gpsArg = v.object({
  lat: v.number(),
  lng: v.number(),
  accuracy: v.optional(v.number()),
  capturedAt: v.number(),
  label: v.optional(v.string()),
});

const photoArg = v.object({
  id: v.string(),
  kind: v.string(),
  dataUrl: v.optional(v.string()),
  capturedAt: v.number(),
  note: v.optional(v.string()),
});

const measurementArg = v.object({
  id: v.string(),
  testLoad: v.number(),
  unit: v.string(),
  observedReading: v.number(),
  error: v.number(),
  permissibleError: v.number(),
  result: v.union(v.literal("pass"), v.literal("fail")),
  notes: v.optional(v.string()),
});

const observationArg = v.object({
  physicalCondition: v.optional(v.string()),
  sealCondition: v.optional(v.string()),
  displayCondition: v.optional(v.string()),
  accuracy: v.optional(v.string()),
  stampingStatus: v.optional(v.string()),
  tamperingIndicators: v.optional(v.string()),
  complianceNotes: v.optional(v.string()),
});

const resultArg = v.union(
  v.literal("verified"),
  v.literal("not_verified"),
  v.literal("requires_correction"),
  v.literal("re_inspection_required"),
);

const officerWindow = v.union(
  v.literal("today"),
  v.literal("overdue"),
  v.literal("upcoming"),
  v.literal("completed"),
);

/**
 * An officer's inspection list, scoped to one view (today, overdue, upcoming or
 * completed) and optionally filtered by inspection status, district, priority
 * or an appointment date range.
 */
export const forOfficer = query({
  args: {
    window: v.optional(officerWindow),
    status: v.optional(v.string()),
    district: v.optional(v.string()),
    priority: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const officer = await ctx.db
      .query("officers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!officer) return [];

    const rows = await ctx.db
      .query("inspections")
      .withIndex("by_officer", (q) => q.eq("officerId", officer._id))
      .collect();

    const dayStart = startOfToday();
    const dayEnd = dayStart + DAY_MS;
    const now = Date.now();
    const window = args.window ?? "today";
    const open = (status: string) => status !== "completed" && status !== "synced";

    const scoped = rows.filter((r) => {
      if (window === "today") {
        return r.scheduledAt >= dayStart && r.scheduledAt < dayEnd && open(r.status);
      }
      if (window === "overdue") {
        return r.scheduledAt < now && open(r.status);
      }
      if (window === "completed") {
        return r.status === "completed" || r.status === "synced";
      }
      return r.scheduledAt >= dayEnd;
    });

    const enriched = [];
    for (const ins of scoped) {
      const [application, instrument] = await Promise.all([
        ctx.db.get(ins.applicationId),
        ctx.db.get(ins.instrumentId),
      ]);
      if (!application || !instrument) continue;

      if (args.status && ins.status !== args.status) continue;
      if (args.district && application.district !== args.district) continue;
      if (args.priority && application.priority !== args.priority) continue;
      if (args.from !== undefined && ins.scheduledAt < args.from) continue;
      if (args.to !== undefined && ins.scheduledAt > args.to) continue;

      enriched.push({
        inspection: ins,
        application,
        instrument,
        overdue: ins.scheduledAt < now && open(ins.status),
        awaitingCertificate:
          ins.status === "completed" && ins.result === "verified" && !ins.certificateId,
      });
    }

    if (window === "completed") {
      return enriched.sort(
        (a, b) => (b.inspection.completedAt ?? 0) - (a.inspection.completedAt ?? 0),
      );
    }
    return enriched.sort((a, b) => a.inspection.scheduledAt - b.inspection.scheduledAt);
  },
});

export const byApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }) => {
    await requireUser(ctx);
    const rows = await ctx.db
      .query("inspections")
      .withIndex("by_application", (q) => q.eq("applicationId", applicationId))
      .collect();
    const inspection = rows.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
    if (!inspection) return null;
    const application = await ctx.db.get(applicationId);
    const instrument = await ctx.db.get(inspection.instrumentId);
    if (!application || !instrument) return null;
    const [organization, category] = await Promise.all([
      ctx.db.get(application.organizationId),
      ctx.db.get(instrument.categoryId),
    ]);
    return { inspection, application, instrument, organization, category };
  },
});

export const get = query({
  args: { id: v.id("inspections") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const inspection = await ctx.db.get(id);
    if (!inspection) return null;
    const application = await ctx.db.get(inspection.applicationId);
    const instrument = await ctx.db.get(inspection.instrumentId);
    if (!application || !instrument) return null;
    const [organization, category] = await Promise.all([
      ctx.db.get(application.organizationId),
      ctx.db.get(instrument.categoryId),
    ]);
    return { inspection, application, instrument, organization, category };
  },
});

export const start = mutation({
  args: { id: v.id("inspections"), device: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new Error("NOT_FOUND");
    const application = await ctx.db.get(inspection.applicationId);
    if (!application) throw new Error("NOT_FOUND: application");
    const now = Date.now();

    if (inspection.status === "scheduled") {
      await ctx.db.patch(args.id, {
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(application._id, {
        status: "verification_in_progress",
        updatedAt: now,
        statusHistory: pushHistory(application.statusHistory, {
          status: "verification_in_progress",
          byName: user.name ?? inspection.officerName,
          byRole: "lmo",
          note: "Field verification started",
        }),
      });
      await writeAudit(ctx, {
        actorUserId: user._id,
        actorName: user.name ?? inspection.officerName,
        actorRole: user.role ?? "lmo",
        action: "inspection.started",
        entityType: "application",
        entityId: String(application._id),
        recordLabel: application.applicationNumber,
        detail: `Field verification started at ${application.locationOfInstrument}`,
        device: args.device,
      });
    }
    return { ok: true, startedAt: inspection.startedAt ?? now };
  },
});

/** Autosave target for the field workflow — called on every step transition. */
export const saveDraft = mutation({
  args: {
    id: v.id("inspections"),
    gps: v.optional(gpsArg),
    photos: v.optional(v.array(photoArg)),
    measurements: v.optional(v.array(measurementArg)),
    observations: v.optional(observationArg),
    instrumentIdentification: v.optional(
      v.object({
        instrumentCode: v.string(),
        manufacturer: v.string(),
        model: v.string(),
        serialNumber: v.string(),
        capacity: v.string(),
        category: v.string(),
        verifiedAt: v.number(),
      }),
    ),
    result: v.optional(resultArg),
    officerRemarks: v.optional(v.string()),
    signatureName: v.optional(v.string()),
    signatureDataUrl: v.optional(v.string()),
    capturedOffline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new Error("NOT_FOUND");
    if (inspection.status === "completed" || inspection.status === "synced") {
      throw new Error("CONFLICT: this inspection is already closed");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.gps) patch.gps = args.gps;
    if (args.photos) patch.photos = args.photos;
    if (args.measurements) patch.measurements = args.measurements;
    if (args.observations) patch.observations = args.observations;
    if (args.instrumentIdentification) patch.instrumentIdentification = args.instrumentIdentification;
    if (args.result) patch.result = args.result;
    if (args.officerRemarks !== undefined) patch.officerRemarks = args.officerRemarks.slice(0, 600);
    if (args.signatureName !== undefined) patch.signatureName = args.signatureName.slice(0, 80);
    if (args.signatureDataUrl !== undefined) {
      patch.signatureDataUrl = args.signatureDataUrl;
      patch.signedAt = Date.now();
    }
    if (args.capturedOffline !== undefined) patch.capturedOffline = args.capturedOffline;

    await ctx.db.patch(args.id, patch);
    void inspection;
    return { ok: true, savedAt: patch.updatedAt as number, by: user.name };
  },
});

async function nextCertificateNumber(ctx: MutationCtx, state: string) {
  const rows = await ctx.db.query("certificates").collect();
  const max = rows.reduce((acc, r) => {
    const n = Number(r.certificateNumber.split("-").pop());
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 1284);
  return `LM-${stateCode(state)}-${new Date().getUTCFullYear()}-${String(max + 1).padStart(6, "0")}`;
}

/**
 * Records the officer's field result and closes the inspection.
 *
 * A VERIFIED result is not certified here: the officer reviews the final report
 * and confirms it through `issueCertificate`, which creates the certificate,
 * the QR verification target and updates the instrument registry.
 */
export const submitResult = mutation({
  args: {
    id: v.id("inspections"),
    result: resultArg,
    officerRemarks: v.optional(v.string()),
    signatureName: v.string(),
    signatureDataUrl: v.optional(v.string()),
    measurements: v.array(measurementArg),
    observations: observationArg,
    gps: v.optional(gpsArg),
    photos: v.optional(v.array(photoArg)),
    capturedOffline: v.optional(v.boolean()),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new Error("NOT_FOUND");
    if (inspection.status === "completed" || inspection.status === "synced") {
      throw new Error("CONFLICT: this inspection has already been submitted");
    }
    if (args.measurements.length === 0) {
      throw new Error("VALIDATION: record at least one measurement before submitting");
    }
    if (!args.signatureName.trim()) {
      throw new Error("VALIDATION: officer signature is required");
    }

    const application = await ctx.db.get(inspection.applicationId);
    if (!application) throw new Error("NOT_FOUND: application");
    const instrument = await ctx.db.get(inspection.instrumentId);
    if (!instrument) throw new Error("NOT_FOUND: instrument");
    const category = await ctx.db.get(instrument.categoryId);
    const organization = await ctx.db.get(application.organizationId);

    const now = Date.now();
    const officer = inspection.officerId ? await ctx.db.get(inspection.officerId) : null;
    const officerName = args.signatureName.trim();
    const actor = user.name ?? officerName;

    await ctx.db.patch(args.id, {
      status: "completed",
      result: args.result,
      officerRemarks: args.officerRemarks?.slice(0, 600),
      signatureName: officerName,
      signatureDataUrl: args.signatureDataUrl,
      signedAt: now,
      completedAt: now,
      measurements: args.measurements,
      observations: args.observations,
      gps: args.gps ?? inspection.gps,
      photos: args.photos ?? inspection.photos,
      capturedOffline: args.capturedOffline ?? inspection.capturedOffline,
      officerName,
      updatedAt: now,
    });

    const passed = args.result === "verified";
    // A failed outcome returns the application to the scheduling desk so a fresh
    // appointment can be booked; only an approved result reaches "verified".
    const nextApplicationStatus = passed
      ? "verification_in_progress"
      : args.result === "not_verified"
        ? "rejected"
        : "approved";

    if (passed) {
      await ctx.db.patch(args.id, { status: "completed", updatedAt: now });
    } else {
      await ctx.db.patch(args.id, { status: "completed", syncedAt: now, updatedAt: now });
      await ctx.db.patch(instrument._id, {
        status:
          args.result === "not_verified"
            ? "verification_due"
            : args.result === "requires_correction"
              ? "suspended"
              : "under_verification",
      });
    }

    await ctx.db.patch(application._id, {
      status: nextApplicationStatus,
      updatedAt: now,
      statusHistory: pushHistory(application.statusHistory, {
        status: nextApplicationStatus,
        byName: officerName,
        byRole: "lmo",
        note: passed
          ? "Result VERIFIED — report ready to be approved"
          : `Result ${args.result.replace(/_/g, " ").toUpperCase()}`,
      }),
    });

    if (officer) {
      await ctx.db.patch(officer._id, {
        completedAssignments: officer.completedAssignments + 1,
        activeAssignments: Math.max(0, officer.activeAssignments - 1),
      });
    }

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: actor,
      actorRole: "lmo",
      action: "verification.result_submitted",
      entityType: "application",
      entityId: String(application._id),
      recordLabel: application.applicationNumber,
      detail: `${args.result.replace(/_/g, " ").toUpperCase()} · ${args.measurements.length} test loads recorded${
        args.capturedOffline ? " · captured offline, synced later" : ""
      }`,
      device: args.device,
    });

    if (passed) {
      const recipient = application.createdByUserId;
      if (recipient) {
        await ctx.db.insert("notifications", {
          userId: recipient,
          type: "verification",
          title: `Field verification completed for ${application.applicationNumber}`,
          titleHi: `${application.applicationNumber} हेतु क्षेत्र सत्यापन पूर्ण`,
          body: `${instrument.instrumentType} (${instrument.instrumentCode}) met the accuracy requirements. The digital certificate is issued as soon as the officer confirms the inspection report.`,
          bodyHi: `${instrument.instrumentType} (${instrument.instrumentCode}) शुद्धता मानकों पर खरा उतरा। रिपोर्ट की पुष्टि होते ही डिजिटल प्रमाणपत्र जारी किया जाएगा।`,
          link: `/dashboard/applications`,
          read: false,
          createdAt: now,
          channelStates: { inApp: "delivered", email: "mock_dispatched", sms: "not_configured" },
        });
      }
    }

    void category;
    void organization;
    void officer;

    return {
      ok: true,
      result: args.result,
      certificateId: null as Id<"certificates"> | null,
      certificateNumber: null as string | null,
    };
  },
});

/**
 * Approval gate for certification.
 *
 * The officer reviews the final inspection report, confirms the outcome and
 * issues the digital certificate. Issuing writes the certificate record, makes
 * the QR verification target live and updates the instrument registry.
 */
export const issueCertificate = mutation({
  args: {
    id: v.id("inspections"),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const inspection = await ctx.db.get(args.id);
    if (!inspection) throw new Error("NOT_FOUND");

    if (inspection.certificateId) {
      const existing = await ctx.db.get(inspection.certificateId);
      if (existing) {
        return {
          ok: true,
          alreadyIssued: true,
          certificateId: existing._id,
          certificateNumber: existing.certificateNumber,
        };
      }
    }
    if (inspection.status !== "completed") {
      throw new Error(
        "CONFLICT: submit the verification result before issuing the certificate",
      );
    }
    if (inspection.result !== "verified") {
      throw new Error("VALIDATION: a certificate can only be issued for a VERIFIED result");
    }

    const application = await ctx.db.get(inspection.applicationId);
    const instrument = await ctx.db.get(inspection.instrumentId);
    if (!application || !instrument) throw new Error("NOT_FOUND");
    const category = await ctx.db.get(instrument.categoryId);
    const organization = await ctx.db.get(application.organizationId);

    const now = Date.now();
    const validityMonths = category?.validityMonths ?? 12;
    const validUntil = now + validityMonths * 30 * DAY_MS;
    const certificateNumber = await nextCertificateNumber(ctx, instrument.state);
    const officerName =
      inspection.signatureName ?? inspection.officerName ?? user.name ?? "Legal Metrology Officer";

    const certificateId = await ctx.db.insert("certificates", {
      certificateNumber,
      verificationReference: `VRF-${districtCode(instrument.district)}-${certificateNumber.split("-").pop()}`,
      applicationId: application._id,
      instrumentId: instrument._id,
      inspectionId: args.id,
      organizationId: application.organizationId,
      organizationName: organization?.name ?? application.applicantName,
      ownerName: organization?.name ?? application.applicantName,
      instrumentCode: instrument.instrumentCode,
      instrumentCategory: instrument.categoryName,
      instrumentType: instrument.instrumentType,
      manufacturer: instrument.manufacturer,
      model: instrument.model,
      serialNumber: instrument.serialNumber,
      capacity: instrument.capacity,
      accuracyClass: instrument.accuracyClass,
      locationLabel: application.locationOfInstrument,
      state: instrument.state,
      district: instrument.district,
      verificationDate: now,
      validUntil,
      issuingAuthority: `${instrument.state} Legal Metrology Department`,
      officerId: inspection.officerId,
      officerName,
      result: "verified",
      status: "valid",
      createdAt: now,
    });

    await ctx.db.patch(args.id, {
      certificateId,
      status: "synced",
      syncedAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(instrument._id, {
      status: "active",
      lastVerificationAt: now,
      nextVerificationDue: validUntil,
      activeCertificateId: certificateId,
    });

    await ctx.db.patch(application._id, {
      status: "verified",
      updatedAt: now,
      statusHistory: pushHistory(application.statusHistory, {
        status: "verified",
        byName: officerName,
        byRole: "lmo",
        note: `Certificate ${certificateNumber} issued`,
      }),
    });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: officerName,
      actorRole: "lmo",
      action: "inspection.approved",
      entityType: "application",
      entityId: String(application._id),
      recordLabel: application.applicationNumber,
      detail: "Final inspection report approved — certificate issued",
      device: args.device,
    });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: "MetriQ System",
      actorRole: "system",
      action: "certificate.issued",
      entityType: "application",
      entityId: String(application._id),
      recordLabel: application.applicationNumber,
      detail: `Digital verification certificate ${certificateNumber} generated with QR verification link`,
    });

    const recipient = application.createdByUserId;
    if (recipient) {
      await ctx.db.insert("notifications", {
        userId: recipient,
        type: "certificate",
        title: `Certificate ${certificateNumber} has been issued`,
        titleHi: `प्रमाणपत्र ${certificateNumber} जारी किया गया`,
        body: `${instrument.instrumentType} (${instrument.instrumentCode}) is verified and valid until ${new Date(
          validUntil,
        ).toLocaleDateString("en-IN")}. Download the certificate or share its QR code for on-the-spot verification.`,
        bodyHi: `${instrument.instrumentType} (${instrument.instrumentCode}) सत्यापित है और ${new Date(
          validUntil,
        ).toLocaleDateString("en-IN")} तक वैध है। प्रमाणपत्र डाउनलोड करें या मौके पर सत्यापन हेतु उसका QR कोड साझा करें।`,
        link: "/dashboard/certificates",
        read: false,
        createdAt: now,
        channelStates: { inApp: "delivered", email: "mock_dispatched", sms: "not_configured" },
      });
    }

    return { ok: true, alreadyIssued: false, certificateId, certificateNumber };
  },
});

/** Batch sync of records captured while the device had no connectivity. */
export const syncOfflineBatch = mutation({
  args: {
    ids: v.array(v.id("inspections")),
    device: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== ROLES.LMO && ![ROLES.DEPT_ADMIN, ROLES.ADMIN].includes(user.role as never)) {
      throw new Error("FORBIDDEN");
    }
    const synced: string[] = [];
    for (const id of args.ids) {
      const inspection = await ctx.db.get(id);
      if (!inspection) continue;
      await ctx.db.patch(id, { syncedAt: Date.now(), capturedOffline: true, updatedAt: Date.now() });
      synced.push(String(id));
      await writeAudit(ctx, {
        actorUserId: user._id,
        actorName: user.name ?? "Field officer",
        actorRole: "lmo",
        action: "inspection.offline_synced",
        entityType: "inspection",
        entityId: String(id),
        recordLabel: `INSP-${String(id).slice(-6)}`,
        detail: "Offline field record synced to the central registry",
        device: args.device,
      });
    }
    return { synced: synced.length };
  },
});
