import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const DAY = 86_400_000;

export function startOfToday(reference = Date.now()) {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfToday(reference = Date.now()) {
  return startOfToday(reference) + DAY;
}

export function daysFromNow(days: number) {
  return Date.now() + days * DAY;
}

export const DAY_MS = DAY;

/** Throws when there is no signed-in user. Used by mutations/queries. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("UNAUTHENTICATED: sign in to continue");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("UNAUTHENTICATED: sign in to continue");
  return user;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  roles: string[],
) {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role ?? "user")) {
    throw new Error("FORBIDDEN: your role cannot perform this action");
  }
  return user;
}

/**
 * Append-only audit trail. Kept intentionally flat so the Audit Log screen can
 * render it without joins.
 */
export async function writeAudit(
  ctx: MutationCtx,
  entry: {
    actorUserId?: Id<"users">;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    recordLabel: string;
    detail?: string;
    device?: string;
  },
) {
  await ctx.db.insert("auditLogs", { ...entry, at: Date.now() });
}

export function pushHistory(
  history: Doc<"applications">["statusHistory"],
  event: { status: string; byName: string; byRole?: string; note?: string },
) {
  return [...history, { ...event, at: Date.now() }];
}

export function digits(value: string | number, pad: number) {
  return String(value).padStart(pad, "0");
}
