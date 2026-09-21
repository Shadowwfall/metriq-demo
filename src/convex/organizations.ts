import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser, writeAudit } from "./helpers";
import { ROLES } from "./schema";

/**
 * Self-service business registration for accounts that signed in with a real
 * email (email OTP). Creates the organisation, links it to the account and
 * grants the business / instrument-owner role so the full workflow unlocks.
 */
export const create = mutation({
  args: {
    name: v.string(),
    contactPerson: v.string(),
    phone: v.string(),
    kind: v.string(),
    gstin: v.optional(v.string()),
    addressLine: v.string(),
    state: v.string(),
    district: v.string(),
    pincode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const role = user.role;
    if (role && role !== ROLES.USER && role !== ROLES.MEMBER) {
      throw new Error("CONFLICT: this account already has a workspace");
    }
    if (user.organizationId) {
      throw new Error("CONFLICT: an organisation is already linked to this account");
    }

    const name = args.name.trim().slice(0, 120);
    const contactPerson = args.contactPerson.trim().slice(0, 80);
    const phone = args.phone.replace(/[\s-]/g, "");
    const addressLine = args.addressLine.trim().slice(0, 240);
    const state = args.state.trim();
    const district = args.district.trim();
    const pincode = args.pincode.trim();
    const gstin = args.gstin?.trim().toUpperCase();

    if (name.length < 3) throw new Error("VALIDATION: enter the establishment name");
    if (!contactPerson) throw new Error("VALIDATION: enter a contact person");
    if (!/^\+?\d{10,13}$/.test(phone)) {
      throw new Error("VALIDATION: enter a valid phone number, e.g. +91 98290 12345");
    }
    if (!addressLine) throw new Error("VALIDATION: enter the registered address");
    if (!state) throw new Error("VALIDATION: select the state");
    if (!district) throw new Error("VALIDATION: select the district");
    if (!/^\d{6}$/.test(pincode)) throw new Error("VALIDATION: PIN code must be exactly 6 digits");
    if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2}$/.test(gstin)) {
      throw new Error("VALIDATION: GSTIN must be 15 characters, e.g. 08ABCDE1234F1Z5");
    }

    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name,
      contactPerson,
      phone,
      email: user.email ?? "",
      gstin: gstin || undefined,
      kind: args.kind,
      addressLine,
      state,
      district,
      pincode,
      ownerUserId: user._id,
      createdAt: now,
    });

    await ctx.db.patch(user._id, {
      role: ROLES.BUSINESS,
      organizationId,
      phone,
      jurisdictionDistrict: district,
      jurisdictionState: state,
      active: true,
      lastSeenAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "system",
      title: "Welcome to MetriQ",
      titleHi: "MetriQ में आपका स्वागत है",
      body: `Your workspace for ${name} is ready. Register your first weighing or measuring instrument to apply for verification.`,
      bodyHi: `${name} के लिए आपका कार्यक्षेत्र तैयार है। सत्यापन हेतु आवेदन देने के लिए अपना पहला यंत्र पंजीकृत करें।`,
      link: "/dashboard/instruments/new",
      read: false,
      createdAt: now,
      channelStates: { inApp: "delivered", email: "mock_dispatched", sms: "not_configured" },
    });

    await writeAudit(ctx, {
      actorUserId: user._id,
      actorName: user.name ?? contactPerson,
      actorRole: ROLES.BUSINESS,
      action: "organization.created",
      entityType: "organization",
      entityId: String(organizationId),
      recordLabel: name,
      detail: `${kindLabel(args.kind)} · ${district}, ${state}`,
      device: "MetriQ Web",
    });

    return { organizationId };
  },
});

function kindLabel(kind: string) {
  return kind || "Business establishment";
}
