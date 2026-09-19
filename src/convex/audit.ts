import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const limit = Math.min(args.limit ?? 80, 300);

    let rows = args.entityId
      ? await ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (q) =>
            q.eq("entityType", args.entityType ?? "application").eq("entityId", args.entityId!),
          )
          .order("desc")
          .take(limit)
      : await ctx.db.query("auditLogs").withIndex("by_at").order("desc").take(limit);

    const search = args.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (r) =>
          r.actorName.toLowerCase().includes(search) ||
          r.action.toLowerCase().includes(search) ||
          r.recordLabel.toLowerCase().includes(search) ||
          (r.detail ?? "").toLowerCase().includes(search),
      );
    }
    return rows;
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const rows = await ctx.db.query("auditLogs").withIndex("by_at").order("desc").take(400);
    const byAction = new Map<string, number>();
    for (const r of rows) byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
    return {
      total: rows.length,
      byAction: [...byAction.entries()].map(([action, count]) => ({ action, count })),
    };
  },
});
