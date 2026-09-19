import { v } from "convex/values";
import { query } from "./_generated/server";

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("instrumentCategories").collect();
    return rows
      .filter((c) => c.active)
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  },
});

export const states = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("states").collect();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const districts = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }) => {
    const rows = await ctx.db.query("districts").collect();
    return rows
      .filter((d) => !state || d.state === state)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Officers with live workload counts, used by the assignment scheduler. */
export const officers = query({
  args: { district: v.optional(v.string()) },
  handler: async (ctx, { district }) => {
    const rows = await ctx.db.query("officers").collect();
    const filtered = rows.filter((o) => !district || o.district === district);
    const apps = await ctx.db.query("applications").collect();

    return filtered
      .map((o) => {
        const mine = apps.filter((a) => a.assignedOfficerId === o._id);
        return {
          ...o,
          pending: mine.filter((a) =>
            ["scheduled", "inspection_pending", "verification_in_progress"].includes(
              a.status,
            ),
          ).length,
          inReview: mine.filter((a) =>
            ["submitted", "under_review", "approved"].includes(a.status),
          ).length,
          total: mine.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const gatcs = query({
  args: { district: v.optional(v.string()) },
  handler: async (ctx, { district }) => {
    const rows = await ctx.db.query("gatcs").collect();
    return rows
      .filter((g) => !district || g.district === district)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
