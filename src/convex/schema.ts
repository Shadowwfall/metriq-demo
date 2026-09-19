import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

/** Product roles. `admin`/`user`/`member` are kept for template compatibility. */
export const ROLES = {
  BUSINESS: "business",
  LMO: "lmo",
  GATC: "gatc",
  DEPT_ADMIN: "dept_admin",
  MINISTRY: "ministry",
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.BUSINESS),
  v.literal(ROLES.LMO),
  v.literal(ROLES.GATC),
  v.literal(ROLES.DEPT_ADMIN),
  v.literal(ROLES.MINISTRY),
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** ── Shared enums ─────────────────────────────────────────────────────────── */

export const applicationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("documents_required"),
  v.literal("approved"),
  v.literal("scheduled"),
  v.literal("inspection_pending"),
  v.literal("verification_in_progress"),
  v.literal("verified"),
  v.literal("rejected"),
  v.literal("cancelled"),
);
export type ApplicationStatus = Infer<typeof applicationStatusValidator>;

export const instrumentStatusValidator = v.union(
  v.literal("active"),
  v.literal("verification_due"),
  v.literal("verification_expired"),
  v.literal("under_verification"),
  v.literal("suspended"),
);
export type InstrumentStatus = Infer<typeof instrumentStatusValidator>;

export const certificateStatusValidator = v.union(
  v.literal("valid"),
  v.literal("expiring_soon"),
  v.literal("expired"),
  v.literal("revoked"),
);
export type CertificateStatus = Infer<typeof certificateStatusValidator>;

export const inspectionResultValidator = v.union(
  v.literal("verified"),
  v.literal("not_verified"),
  v.literal("requires_correction"),
  v.literal("re_inspection_required"),
);
export type InspectionResult = Infer<typeof inspectionResultValidator>;

export const documentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
);

export const measurementResultValidator = v.union(
  v.literal("pass"),
  v.literal("fail"),
);

/** Positional measurement row captured during field verification. */
export const measurementValidator = v.object({
  id: v.string(),
  testLoad: v.number(),
  unit: v.string(),
  observedReading: v.number(),
  error: v.number(),
  permissibleError: v.number(),
  result: measurementResultValidator,
  notes: v.optional(v.string()),
});

/** Structured observation checklist captured during field verification. */
export const observationValidator = v.object({
  physicalCondition: v.optional(v.string()),
  sealCondition: v.optional(v.string()),
  displayCondition: v.optional(v.string()),
  accuracy: v.optional(v.string()),
  stampingStatus: v.optional(v.string()),
  tamperingIndicators: v.optional(v.string()),
  complianceNotes: v.optional(v.string()),
});

export const gpsValidator = v.object({
  lat: v.number(),
  lng: v.number(),
  accuracy: v.optional(v.number()),
  capturedAt: v.number(),
  label: v.optional(v.string()),
});

export const photoValidator = v.object({
  id: v.string(),
  kind: v.string(),
  dataUrl: v.optional(v.string()),
  capturedAt: v.number(),
  note: v.optional(v.string()),
});

export const statusEventValidator = v.object({
  status: v.string(),
  at: v.number(),
  byName: v.string(),
  byRole: v.optional(v.string()),
  note: v.optional(v.string()),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // METRIQ profile fields
      phone: v.optional(v.string()),
      designation: v.optional(v.string()),
      employeeCode: v.optional(v.string()),
      jurisdictionDistrict: v.optional(v.string()),
      jurisdictionState: v.optional(v.string()),
      organizationId: v.optional(v.id("organizations")),
      language: v.optional(v.union(v.literal("en"), v.literal("hi"))),
      notificationPrefs: v.optional(
        v.object({
          inApp: v.boolean(),
          email: v.boolean(),
          sms: v.boolean(),
          expiryAlerts: v.boolean(),
        }),
      ),
      active: v.optional(v.boolean()),
      lastSeenAt: v.optional(v.number()),
    }).index("email", ["email"]),

    /** One-time demo state flag + master configuration. */
    appSettings: defineTable({
      key: v.string(),
      value: v.any(),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    /** ── Master data ─────────────────────────────────────────────────────── */

    states: defineTable({
      code: v.string(),
      name: v.string(),
      nameHi: v.string(),
      region: v.string(),
    }).index("by_code", ["code"]),

    districts: defineTable({
      stateCode: v.string(),
      state: v.string(),
      code: v.string(),
      name: v.string(),
      nameHi: v.string(),
      lat: v.number(),
      lng: v.number(),
    })
      .index("by_state", ["stateCode"])
      .index("by_name", ["name"]),

    instrumentCategories: defineTable({
      group: v.union(
        v.literal("weighing"),
        v.literal("weights"),
        v.literal("measuring"),
      ),
      name: v.string(),
      nameHi: v.string(),
      code: v.string(),
      unit: v.string(),
      testSteps: v.array(v.number()),
      maxPermissibleErrorPct: v.number(),
      requiresGatc: v.boolean(),
      validityMonths: v.number(),
      active: v.boolean(),
    }).index("by_group", ["group"]),

    /** ── Stakeholders ────────────────────────────────────────────────────── */

    organizations: defineTable({
      name: v.string(),
      contactPerson: v.string(),
      phone: v.string(),
      email: v.string(),
      gstin: v.optional(v.string()),
      kind: v.string(),
      addressLine: v.string(),
      state: v.string(),
      district: v.string(),
      pincode: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      ownerUserId: v.optional(v.id("users")),
      createdAt: v.number(),
    })
      .index("by_owner", ["ownerUserId"])
      .index("by_district", ["district"]),

    officers: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      employeeCode: v.string(),
      designation: v.string(),
      state: v.string(),
      district: v.string(),
      phone: v.string(),
      email: v.string(),
      activeAssignments: v.number(),
      completedAssignments: v.number(),
      isDemoSeeded: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_district", ["district"])
      .index("by_code", ["employeeCode"]),

    gatcs: defineTable({
      name: v.string(),
      code: v.string(),
      state: v.string(),
      district: v.string(),
      contactPerson: v.string(),
      phone: v.string(),
      accreditationNo: v.string(),
      capacity: v.number(),
      activeTests: v.number(),
    }).index("by_district", ["district"]),

    /** ── Registry ────────────────────────────────────────────────────────── */

    instruments: defineTable({
      instrumentCode: v.string(),
      categoryId: v.id("instrumentCategories"),
      categoryName: v.string(),
      group: v.string(),
      instrumentType: v.string(),
      manufacturer: v.string(),
      model: v.string(),
      serialNumber: v.string(),
      capacity: v.string(),
      accuracyClass: v.string(),
      organizationId: v.id("organizations"),
      ownerName: v.string(),
      locationLabel: v.string(),
      addressLine: v.string(),
      state: v.string(),
      district: v.string(),
      pincode: v.string(),
      lat: v.number(),
      lng: v.number(),
      status: instrumentStatusValidator,
      registeredAt: v.number(),
      lastVerificationAt: v.optional(v.number()),
      nextVerificationDue: v.optional(v.number()),
      activeCertificateId: v.optional(v.id("certificates")),
    })
      .index("by_code", ["instrumentCode"])
      .index("by_organization", ["organizationId"])
      .index("by_district", ["district"])
      .index("by_serial", ["serialNumber"])
      .index("by_status", ["status"]),

    /** ── Applications ────────────────────────────────────────────────────── */

    applications: defineTable({
      applicationNumber: v.string(),
      type: v.union(v.literal("new"), v.literal("re_verification")),
      organizationId: v.id("organizations"),
      instrumentId: v.id("instruments"),
      applicantName: v.string(),
      contactPhone: v.string(),
      contactEmail: v.string(),
      addressLine: v.string(),
      state: v.string(),
      district: v.string(),
      pincode: v.string(),
      instrumentCategory: v.string(),
      instrumentType: v.string(),
      manufacturer: v.string(),
      model: v.string(),
      serialNumber: v.string(),
      capacity: v.string(),
      accuracyClass: v.string(),
      locationOfInstrument: v.string(),
      intendedUse: v.string(),
      previousCertificateNumber: v.optional(v.string()),
      previousVerificationDate: v.optional(v.number()),
      status: applicationStatusValidator,
      priority: v.union(
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
      submittedAt: v.optional(v.number()),
      assignedOfficerId: v.optional(v.id("officers")),
      assignedGatcId: v.optional(v.id("gatcs")),
      scheduledAt: v.optional(v.number()),
      reviewedAt: v.optional(v.number()),
      reviewedBy: v.optional(v.string()),
      reviewNote: v.optional(v.string()),
      statusHistory: v.array(statusEventValidator),
      createdByUserId: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_number", ["applicationNumber"])
      .index("by_organization", ["organizationId"])
      .index("by_status", ["status"])
      .index("by_officer", ["assignedOfficerId"])
      .index("by_district", ["district"])
      .index("by_submitted", ["submittedAt"]),

    applicationDocuments: defineTable({
      applicationId: v.id("applications"),
      kind: v.string(),
      fileName: v.string(),
      fileType: v.string(),
      sizeKb: v.number(),
      dataUrl: v.optional(v.string()),
      uploadedBy: v.string(),
      uploadedAt: v.number(),
      status: documentStatusValidator,
      note: v.optional(v.string()),
    }).index("by_application", ["applicationId"]),

    /** ── Field verification ──────────────────────────────────────────────── */

    inspections: defineTable({
      applicationId: v.id("applications"),
      instrumentId: v.id("instruments"),
      officerId: v.optional(v.id("officers")),
      officerName: v.string(),
      gatcId: v.optional(v.id("gatcs")),
      status: v.union(
        v.literal("scheduled"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("synced"),
      ),
      scheduledAt: v.number(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      gps: v.optional(gpsValidator),
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
      photos: v.array(photoValidator),
      measurements: v.array(measurementValidator),
      observations: v.optional(observationValidator),
      result: v.optional(inspectionResultValidator),
      officerRemarks: v.optional(v.string()),
      signatureName: v.optional(v.string()),
      signatureDataUrl: v.optional(v.string()),
      signedAt: v.optional(v.number()),
      certificateId: v.optional(v.id("certificates")),
      capturedOffline: v.boolean(),
      syncedAt: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_application", ["applicationId"])
      .index("by_officer", ["officerId"])
      .index("by_status", ["status"])
      .index("by_scheduled", ["scheduledAt"]),

    /** ── Certification ───────────────────────────────────────────────────── */

    certificates: defineTable({
      certificateNumber: v.string(),
      verificationReference: v.string(),
      applicationId: v.id("applications"),
      instrumentId: v.id("instruments"),
      inspectionId: v.optional(v.id("inspections")),
      organizationId: v.id("organizations"),
      organizationName: v.string(),
      ownerName: v.string(),
      instrumentCode: v.string(),
      instrumentCategory: v.string(),
      instrumentType: v.string(),
      manufacturer: v.string(),
      model: v.string(),
      serialNumber: v.string(),
      capacity: v.string(),
      accuracyClass: v.string(),
      locationLabel: v.string(),
      state: v.string(),
      district: v.string(),
      verificationDate: v.number(),
      validUntil: v.number(),
      issuingAuthority: v.string(),
      officerId: v.optional(v.id("officers")),
      officerName: v.string(),
      result: v.string(),
      status: certificateStatusValidator,
      revokedReason: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_number", ["certificateNumber"])
      .index("by_instrument", ["instrumentId"])
      .index("by_organization", ["organizationId"])
      .index("by_status", ["status"])
      .index("by_valid_until", ["validUntil"])
      .index("by_district", ["district"]),

    certificateVerifications: defineTable({
      certificateNumber: v.string(),
      verifiedAt: v.number(),
      outcome: v.string(),
      source: v.string(),
      device: v.optional(v.string()),
      city: v.optional(v.string()),
    }).index("by_certificate", ["certificateNumber"]),

    /** ── Communication & governance ─────────────────────────────────────── */

    notifications: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("application"),
        v.literal("scheduling"),
        v.literal("verification"),
        v.literal("certificate"),
        v.literal("expiry"),
        v.literal("system"),
      ),
      title: v.string(),
      titleHi: v.optional(v.string()),
      body: v.string(),
      bodyHi: v.optional(v.string()),
      link: v.optional(v.string()),
      read: v.boolean(),
      createdAt: v.number(),
      channelStates: v.optional(
        v.object({
          inApp: v.string(),
          email: v.string(),
          sms: v.string(),
        }),
      ),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    auditLogs: defineTable({
      at: v.number(),
      actorUserId: v.optional(v.id("users")),
      actorName: v.string(),
      actorRole: v.string(),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      recordLabel: v.string(),
      detail: v.optional(v.string()),
      device: v.optional(v.string()),
    })
      .index("by_at", ["at"])
      .index("by_entity", ["entityType", "entityId"])
      .index("by_actor", ["actorUserId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
