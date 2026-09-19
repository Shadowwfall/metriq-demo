import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DAY_MS, requireUser, writeAudit } from "./helpers";
import { ROLES } from "./schema";

export type DerivedStatus = "valid" | "expiring_soon" | "expired" | "revoked";

/** Status is derived from validity dates so records never look stale. */
export function derivedStatus(cert: Doc<"certificates">, now = Date.now()): DerivedStatus {
  if (cert.status === "revoked") return "revoked";
  if (cert.validUntil < now) return "expired";
  if (cert.validUntil < now + 30 * DAY_MS) return "expiring_soon";
  return "valid";
}

export function withDerivedStatus(cert: Doc<"certificates">) {
  const now = Date.now();
  const status = derivedStatus(cert, now);
  return {
    ...cert,
    status,
    daysRemaining: Math.ceil((cert.validUntil - now) / DAY_MS),
    verifyPath: `/verify/${cert.certificateNumber}`,
  };
}

export const list = query({
  args: {
    status: v.optional(v.string()),
    district: v.optional(v.string()),
    search: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const limit = Math.min(args.limit ?? 60, 200);

    let rows = args.organizationId
      ? await ctx.db
          .query("certificates")
          .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
          .collect()
      : await ctx.db.query("certificates").collect();

    if (args.district) rows = rows.filter((c) => c.district === args.district);
    const search = args.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (c) =>
          c.certificateNumber.toLowerCase().includes(search) ||
          c.instrumentCode.toLowerCase().includes(search) ||
          c.serialNumber.toLowerCase().includes(search) ||
          c.organizationName.toLowerCase().includes(search) ||
          c.instrumentType.toLowerCase().includes(search) ||
          c.district.toLowerCase().includes(search),
      );
    }

    const mapped = rows.map(withDerivedStatus);
    const filtered = args.status ? mapped.filter((c) => c.status === args.status) : mapped;
    return filtered
      .sort((a, b) => b.verificationDate - a.verificationDate)
      .slice(0, limit);
  },
});

export const get = query({
  args: {
    id: v.optional(v.id("certificates")),
    certificateNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const cert = args.id
      ? await ctx.db.get(args.id)
      : args.certificateNumber
        ? await ctx.db
            .query("certificates")
            .withIndex("by_number", (q) => q.eq("certificateNumber", args.certificateNumber!))
            .unique()
        : null;
    if (!cert) return null;

    const [instrument, application, inspection, organization, verificationEvents] =
      await Promise.all([
        ctx.db.get(cert.instrumentId),
        ctx.db.get(cert.applicationId),
        cert.inspectionId ? ctx.db.get(cert.inspectionId) : Promise.resolve(null),
        ctx.db.get(cert.organizationId),
        ctx.db
          .query("certificateVerifications")
          .withIndex("by_certificate", (q) =>
            q.eq("certificateNumber", cert.certificateNumber),
          )
          .collect(),
      ]);

    const documents = application
      ? await ctx.db
          .query("applicationDocuments")
          .withIndex("by_application", (q) => q.eq("applicationId", application._id))
          .collect()
      : [];

    const history = cert.inspectionId
      ? await ctx.db
          .query("certificates")
          .withIndex("by_instrument", (q) => q.eq("instrumentId", cert.instrumentId))
          .collect()
      : [];

    return {
      certificate: withDerivedStatus(cert),
      instrument,
      application,
      organization,
      inspection,
      documents,
      verificationEvents: verificationEvents.sort((a, b) => b.verifiedAt - a.verifiedAt),
      instrumentHistory: history
        .map(withDerivedStatus)
        .sort((a, b) => b.verificationDate - a.verificationDate),
    };
  },
});

export const revoke = mutation({
  args: { id: v.id("certificates"), reason: v.string() },
  handler: async (ctx, { id, reason }) => {
    const user = await requireUser(ctx);
    if (![ROLES.DEPT_ADMIN, ROLES.MINISTRY, ROLES.ADMIN].includes(user.role as never)) {
      throw new Error("FORBIDDEN: only department administrators can revoke certificates");
    }
    const cert = await ctx.db.get(id);
    if (!cert) throw new Error("NOT_FOUND");
    await ctx.db.patch(id, {
      status: "revoked",
      revokedReason: reason.slice(0, 240),
      revokedAt: Date.now(),
    });
    await ctx.db.patch(cert.instrumentId, { status: "suspended" });
    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: user.name ?? "Administrator",
      actorRole: user.role ?? "dept_admin",
      action: "certificate.revoked",
      entityType: "certificate",
      entityId: String(id),
      recordLabel: cert.certificateNumber,
      detail: reason.slice(0, 240),
    });
    return { ok: true };
  },
});

export const expiringSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = (await ctx.db.query("certificates").collect()).map(withDerivedStatus);
    const buckets = [7, 30, 60, 90];
    return buckets.map((days) => ({
      days,
      count: rows.filter(
        (c) => c.status !== "revoked" && c.daysRemaining > 0 && c.daysRemaining <= days,
      ).length,
    }));
  },
});
