import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { roleValidator, ROLES } from "./schema";
import { writeAudit } from "./helpers";

/**
 * Everything the client needs to render role-aware navigation:
 * the account, its role, and the officer / organisation record attached to it.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const officer = await ctx.db
      .query("officers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const organization = user.organizationId
      ? await ctx.db.get(user.organizationId)
      : null;

    const unread = (
      await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).filter((n) => !n.read).length;

    return {
      id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? ROLES.USER,
      language: user.language ?? "en",
      phone: user.phone ?? null,
      designation: user.designation ?? officer?.designation ?? null,
      employeeCode: user.employeeCode ?? officer?.employeeCode ?? null,
      jurisdictionDistrict:
        user.jurisdictionDistrict ?? officer?.district ?? null,
      jurisdictionState: user.jurisdictionState ?? officer?.state ?? null,
      notificationPrefs: user.notificationPrefs ?? {
        inApp: true,
        email: true,
        sms: false,
        expiryAlerts: true,
      },
      officerId: officer?._id ?? null,
      organization,
      unreadNotifications: unread,
    };
  },
});

export const setRole = mutation({
  args: { role: roleValidator },
  handler: async (ctx, { role }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHENTICATED");
    await ctx.db.patch(userId, { role });
    return { ok: true };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    language: v.optional(v.union(v.literal("en"), v.literal("hi"))),
    notificationPrefs: v.optional(
      v.object({
        inApp: v.boolean(),
        email: v.boolean(),
        sms: v.boolean(),
        expiryAlerts: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHENTICATED");
    const patch: Record<string, unknown> = { lastSeenAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim().slice(0, 80);
    if (args.phone !== undefined) patch.phone = args.phone.trim().slice(0, 20);
    if (args.language !== undefined) patch.language = args.language;
    if (args.notificationPrefs !== undefined)
      patch.notificationPrefs = args.notificationPrefs;
    await ctx.db.patch(userId, patch);
    return { ok: true };
  },
});

export const employees = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("officers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const _touchAudit = mutation({
  args: { action: v.string(), detail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHENTICATED");
    const user = await ctx.db.get(userId);
    await writeAudit(ctx, {
      actorUserId: userId,
      actorName: user?.name ?? "Portal user",
      actorRole: user?.role ?? "user",
      action: args.action,
      entityType: "session",
      entityId: String(userId),
      recordLabel: user?.email ?? "session",
      detail: args.detail,
    });
    return { ok: true };
  },
});
