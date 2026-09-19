import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, writeAudit } from "./helpers";
import { ROLES } from "./schema";
import { withDerivedStatus } from "./certificates";

const STATE_CODES: Record<string, string> = {
  Rajasthan: "RJ",
  Delhi: "DL",
  Maharashtra: "MH",
  Karnataka: "KA",
  Gujarat: "GJ",
  "Uttar Pradesh": "UP",
};

const DISTRICT_CODES: Record<string, string> = {
  Jaipur: "JPR",
  Jodhpur: "JDH",
  Udaipur: "UDR",
  Kota: "KOT",
  Ajmer: "AJM",
  Alwar: "ALW",
  Bikaner: "BKN",
  "New Delhi": "NDL",
  "South Delhi": "SDL",
  Mumbai: "MUM",
  Pune: "PUN",
  Nagpur: "NGP",
  "Bengaluru Urban": "BLR",
  Mysuru: "MYS",
  Ahmedabad: "AMD",
  Surat: "SUR",
  Vadodara: "VDR",
  Lucknow: "LKO",
  "Kanpur Nagar": "KNP",
  Varanasi: "VNS",
};

export function districtCode(name: string) {
  return DISTRICT_CODES[name] ?? name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

export function stateCode(name: string) {
  return STATE_CODES[name] ?? name.slice(0, 2).toUpperCase();
}

export const list = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    let rows = args.organizationId
      ? await ctx.db
          .query("instruments")
          .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
          .collect()
      : await ctx.db.query("instruments").collect();

    if (args.district) rows = rows.filter((r) => r.district === args.district);
    if (args.state) rows = rows.filter((r) => r.state === args.state);
    if (args.status) rows = rows.filter((r) => r.status === args.status);

    const search = args.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (r) =>
          r.instrumentCode.toLowerCase().includes(search) ||
          r.serialNumber.toLowerCase().includes(search) ||
          r.instrumentType.toLowerCase().includes(search) ||
          r.manufacturer.toLowerCase().includes(search) ||
          r.ownerName.toLowerCase().includes(search) ||
          r.district.toLowerCase().includes(search),
      );
    }
    rows.sort((a, b) => b.registeredAt - a.registeredAt);
    return rows.slice(0, Math.min(args.limit ?? 50, 400));
  },
});

export const find = query({
  args: {
    id: v.optional(v.id("instruments")),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const instrument = args.id
      ? await ctx.db.get(args.id)
      : args.code
        ? await ctx.db
            .query("instruments")
            .withIndex("by_code", (q) => q.eq("instrumentCode", args.code!))
            .unique()
        : null;
    if (!instrument) return null;

    const [organization, certificates, applications] = await Promise.all([
      ctx.db.get(instrument.organizationId),
      ctx.db
        .query("certificates")
        .withIndex("by_instrument", (q) => q.eq("instrumentId", instrument._id))
        .collect(),
      ctx.db
        .query("applications")
        .filter((q) => q.eq(q.field("instrumentId"), instrument._id))
        .collect(),
    ]);

    const history = certificates.map(withDerivedStatus).sort((a, b) => b.verificationDate - a.verificationDate);
    const inspectionIds = applications.map((a) => a._id);
    const inspections = [];
    for (const id of inspectionIds) {
      const rows = await ctx.db
        .query("inspections")
        .withIndex("by_application", (q) => q.eq("applicationId", id))
        .collect();
      inspections.push(...rows);
    }

    return {
      instrument,
      organization,
      certificates: history,
      applications: applications.sort((a, b) => b.createdAt - a.createdAt),
      inspections: inspections.sort((a, b) => b.updatedAt - a.updatedAt),
    };
  },
});

export const register = mutation({
  args: {
    categoryId: v.id("instrumentCategories"),
    instrumentType: v.string(),
    manufacturer: v.string(),
    model: v.string(),
    serialNumber: v.string(),
    capacity: v.string(),
    accuracyClass: v.string(),
    locationLabel: v.string(),
    addressLine: v.string(),
    state: v.string(),
    district: v.string(),
    pincode: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== ROLES.BUSINESS && user.role !== ROLES.DEPT_ADMIN && user.role !== ROLES.ADMIN) {
      throw new Error("FORBIDDEN: only business accounts can register instruments");
    }
    if (!user.organizationId) throw new Error("FORBIDDEN: no organisation linked to this account");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("NOT_FOUND: instrument category");

    const serial = args.serialNumber.trim();
    if (serial.length < 3) throw new Error("VALIDATION: serial number is too short");

    const existing = await ctx.db
      .query("instruments")
      .withIndex("by_serial", (q) => q.eq("serialNumber", serial))
      .first();
    if (existing) {
      throw new Error(`VALIDATION: an instrument with serial number ${serial} is already registered`);
    }

    const org = await ctx.db.get(user.organizationId);
    if (!org) throw new Error("NOT_FOUND: organisation");

    const district = args.district.trim() || org.district;
    const state = args.state.trim() || org.state;

    const siblings = await ctx.db
      .query("instruments")
      .withIndex("by_district", (q) => q.eq("district", district))
      .collect();
    const sequence =
      siblings.reduce((max, s) => {
        const n = Number(s.instrumentCode.split("-").pop());
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 1800) + 1;

    const instrumentCode = `WM-${stateCode(state)}-${districtCode(district)}-${String(sequence).padStart(7, "0")}`;

    const id = await ctx.db.insert("instruments", {
      instrumentCode,
      categoryId: category._id,
      categoryName: category.name,
      group: category.group,
      instrumentType: args.instrumentType.trim() || category.name,
      manufacturer: args.manufacturer.trim(),
      model: args.model.trim(),
      serialNumber: serial,
      capacity: args.capacity.trim(),
      accuracyClass: args.accuracyClass.trim(),
      organizationId: org._id,
      ownerName: org.name,
      locationLabel: args.locationLabel.trim(),
      addressLine: args.addressLine.trim() || org.addressLine,
      state,
      district,
      pincode: args.pincode.trim() || org.pincode,
      lat: args.lat ?? org.lat ?? 26.9124,
      lng: args.lng ?? org.lng ?? 75.7873,
      status: "verification_due",
      registeredAt: Date.now(),
    });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: user.name ?? org.contactPerson,
      actorRole: user.role ?? "business",
      action: "instrument.registered",
      entityType: "instrument",
      entityId: String(id),
      recordLabel: instrumentCode,
      detail: `${args.instrumentType} · ${args.manufacturer} ${args.model}`,
    });

    return { id, instrumentCode };
  },
});

export const byCategory = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("instruments").collect();
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.group, (counts.get(r.group) ?? 0) + 1);
    const byType = new Map<string, number>();
    for (const r of rows) byType.set(r.instrumentType, (byType.get(r.instrumentType) ?? 0) + 1);
    return {
      total: rows.length,
      byGroup: [...counts.entries()].map(([group, count]) => ({ group, count })),
      byType: [...byType.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

export const dueForVerification = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("instruments").collect();
    const scoped = args.organizationId
      ? rows.filter((r) => r.organizationId === args.organizationId)
      : rows;
    return scoped
      .filter((r) => r.status === "verification_due" || r.status === "verification_expired")
      .sort((a, b) => (a.nextVerificationDue ?? 0) - (b.nextVerificationDue ?? 0))
      .slice(0, 40);
  },
});

export type InstrumentId = Id<"instruments">;
