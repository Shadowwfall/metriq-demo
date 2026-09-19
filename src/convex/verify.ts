import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { derivedStatus } from "./certificates";
import { DAY_MS } from "./helpers";

/**
 * Public verification surface. No sign-in is required, mirroring the way a QR
 * code printed on a physical certificate has to resolve for anyone.
 * Only non-sensitive descriptive fields are returned.
 */
function publicView(cert: Doc<"certificates">, extra?: { location?: string }) {
  const status = derivedStatus(cert);
  return {
    certificateNumber: cert.certificateNumber,
    verificationReference: cert.verificationReference,
    status,
    instrumentCode: cert.instrumentCode,
    instrumentCategory: cert.instrumentCategory,
    instrumentType: cert.instrumentType,
    manufacturer: cert.manufacturer,
    model: cert.model,
    serialNumber: cert.serialNumber,
    capacity: cert.capacity,
    accuracyClass: cert.accuracyClass,
    verificationDate: cert.verificationDate,
    validUntil: cert.validUntil,
    issuingAuthority: cert.issuingAuthority,
    officerName: cert.officerName,
    state: cert.state,
    district: cert.district,
    location: extra?.location ?? cert.locationLabel,
    establishment: cert.organizationName,
    revokedReason: cert.status === "revoked" ? cert.revokedReason : undefined,
    result: cert.result,
  };
}

async function lookupCertificate(ctx: QueryCtx | MutationCtx, rawQuery: string) {
  const q = rawQuery.trim();
  if (!q) return null;
  const upper = q.toUpperCase();

  const byNumber = await ctx.db
    .query("certificates")
    .withIndex("by_number", (q2) => q2.eq("certificateNumber", upper))
    .unique();
  if (byNumber) return byNumber as Doc<"certificates">;

  const all: Doc<"certificates">[] = await ctx.db.query("certificates").collect();
  const lower = q.toLowerCase();
  return (
    all.find(
      (c) =>
        c.instrumentCode.toUpperCase() === upper ||
        c.verificationReference.toUpperCase() === upper ||
        c.serialNumber.toLowerCase() === lower ||
        c.certificateNumber === q,
    ) ?? null
  );
}

/** Read-only lookup used for live previews. */
export const lookup = query({
  args: { query: v.string() },
  handler: async (ctx, { query: value }) => {
    const cert = await lookupCertificate(ctx, value);
    if (!cert) return { found: false as const };
    return { found: true as const, certificate: publicView(cert) };
  },
});

/**
 * Verification action. Writes an append-only verification event so the
 * certificate detail page can show a genuine "verified online" history.
 */
export const check = mutation({
  args: {
    query: v.string(),
    source: v.optional(v.string()),
    device: v.optional(v.string()),
  },
  handler: async (ctx, { query: value, source, device }) => {
    const cert = await lookupCertificate(ctx, value);
    if (!cert) {
      return { found: false as const, outcome: "not_found" as const };
    }
    const status = derivedStatus(cert);
    const outcome = status;
    await ctx.db.insert("certificateVerifications", {
      certificateNumber: cert.certificateNumber,
      verifiedAt: Date.now(),
      outcome,
      source: source ?? "portal",
      device,
      city: cert.district,
    });
    return { found: true as const, outcome, certificate: publicView(cert) };
  },
});

/** Recent verification events, shown on the certificate page as a trust log. */
export const recentEvents = query({
  args: { certificateNumber: v.string() },
  handler: async (ctx, { certificateNumber }) => {
    const rows = await ctx.db
      .query("certificateVerifications")
      .withIndex("by_certificate", (q) => q.eq("certificateNumber", certificateNumber))
      .collect();
    return rows.sort((a, b) => b.verifiedAt - a.verifiedAt).slice(0, 8);
  },
});

/**
 * Public sample references used as demo hints on the landing and verify pages,
 * so no certificate identifier is hardcoded in the client.
 */
export const sampleCertificate = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("certificates").collect();
    if (rows.length === 0) return null;
    const now = Date.now();
    const healthy = rows.filter(
      (c) => c.status !== "revoked" && c.validUntil > now + 60 * DAY_MS,
    );
    const pick = (healthy.length ? healthy : rows).sort(
      (a, b) => b.validUntil - a.validUntil,
    )[0];
    return {
      certificateNumber: pick.certificateNumber,
      instrumentCode: pick.instrumentCode,
      verificationReference: pick.verificationReference,
      serialNumber: pick.serialNumber,
    };
  },
});

export const totals = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("certificates").collect();
    const now = Date.now();
    const active = rows.filter((c) => c.status !== "revoked" && c.validUntil >= now).length;
    return { issued: rows.length, active };
  },
});
