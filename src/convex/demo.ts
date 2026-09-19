import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { roleValidator, ROLES } from "./schema";
import { DAY_MS, writeAudit } from "./helpers";

const HOUR = 3_600_000;

const ROLE_PROFILE: Record<
  string,
  { name: string; designation: string; state: string; district: string; code: string }
> = {
  lmo: {
    name: "Rajesh Sharma",
    designation: "Inspector, Legal Metrology",
    state: "Rajasthan",
    district: "Jaipur",
    code: "LMO-RJ-0114",
  },
  business: {
    name: "Nitin Agarwal",
    designation: "Authorised Signatory",
    state: "Rajasthan",
    district: "Jaipur",
    code: "BIZ-RJ-0021",
  },
  gatc: {
    name: "Sunil Joshi",
    designation: "Test Engineer",
    state: "Rajasthan",
    district: "Jaipur",
    code: "GATC-RJ-01",
  },
  dept_admin: {
    name: "Department Administrator",
    designation: "Deputy Controller",
    state: "Rajasthan",
    district: "Jaipur",
    code: "ADM-RJ-0007",
  },
  ministry: {
    name: "Ministry Administrator",
    designation: "Director, Legal Metrology",
    state: "Delhi",
    district: "New Delhi",
    code: "MoCA-0001",
  },
  admin: {
    name: "Department Administrator",
    designation: "Deputy Controller",
    state: "Rajasthan",
    district: "Jaipur",
    code: "ADM-RJ-0007",
  },
  user: { name: "Portal User", designation: "Stakeholder", state: "Rajasthan", district: "Jaipur", code: "USR-0001" },
  member: { name: "Portal User", designation: "Stakeholder", state: "Rajasthan", district: "Jaipur", code: "USR-0001" },
};

async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  entries: {
    type: "application" | "scheduling" | "verification" | "certificate" | "expiry" | "system";
    title: string;
    titleHi: string;
    body: string;
    bodyHi: string;
    link?: string;
  }[],
) {
  const base = Date.now();
  let i = 0;
  for (const e of entries) {
    await ctx.db.insert("notifications", {
      userId,
      type: e.type,
      title: e.title,
      titleHi: e.titleHi,
      body: e.body,
      bodyHi: e.bodyHi,
      link: e.link,
      read: i > 1,
      createdAt: base - i * 47 * 60_000,
      channelStates: { inApp: "delivered", email: "mock_dispatched", sms: "not_configured" },
    });
    i++;
  }
}

/**
 * Builds "today at HH:MM" in the officer's own timezone. Convex runs in UTC, so
 * the browser passes its UTC offset when claiming a demo workspace — otherwise a
 * 10:00 appointment would render as 15:30 for an officer in India.
 */
function makeSlotFactory(utcOffsetMinutes: number) {
  const offsetMs = utcOffsetMinutes * 60_000;
  const localMidnight = Math.floor((Date.now() + offsetMs) / DAY_MS) * DAY_MS;
  return (hour: number, minute: number) =>
    localMidnight + hour * HOUR + minute * 60_000 - offsetMs;
}

/**
 * Attaches the freshly signed-in demo account to a fully populated slice of the
 * seeded dataset so every role lands on a working, realistic workspace.
 */
export const claimDemoRole = mutation({
  args: {
    role: roleValidator,
    displayName: v.optional(v.string()),
    utcOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { role, displayName, utcOffsetMinutes }) => {
    const atToday = makeSlotFactory(utcOffsetMinutes ?? 0);
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHENTICATED: sign in first");

    const profile = ROLE_PROFILE[role] ?? ROLE_PROFILE.user;
    const name = (displayName?.trim() || profile.name).slice(0, 80);
    const now = Date.now();

    const languages = await ctx.db.get(userId);

    await ctx.db.patch(userId, {
      role,
      name,
      designation: profile.designation,
      employeeCode: profile.code,
      jurisdictionDistrict: profile.district,
      jurisdictionState: profile.state,
      language: languages?.language ?? "en",
      lastSeenAt: now,
      active: true,
    });

    const result: Record<string, unknown> = { role, name };

    /* ── Legal Metrology Officer ────────────────────────────────────────── */
    if (role === ROLES.LMO) {
      let officer = await ctx.db
        .query("officers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!officer) {
        const officerId = await ctx.db.insert("officers", {
          userId,
          name,
          employeeCode: `${profile.code}-DEMO`,
          designation: "Inspector",
          state: profile.state,
          district: profile.district,
          phone: "+91 98290 41100",
          email: "lmo@demo.gov.in",
          activeAssignments: 0,
          completedAssignments: 0,
          isDemoSeeded: false,
        });
        officer = (await ctx.db.get(officerId))!;
      } else if (officer.name !== name) {
        await ctx.db.patch(officer._id, { name });
      }

      // Only build the field calendar the first time this account claims LMO.
      if (officer.activeAssignments === 0) {
        const apps = await ctx.db.query("applications").collect();
        const byNumber = new Map(apps.map((a) => [a.applicationNumber, a]));

        const anchorNumbers = ["LM-2026-001842", "LM-2026-001931"];
        const slots = [
          { hour: 10, minute: 0 },
          { hour: 12, minute: 30 },
          { hour: 14, minute: 0 },
          { hour: 15, minute: 30 },
          { hour: 16, minute: 45 },
        ];

        const queue: typeof apps = [];
        for (const n of anchorNumbers) {
          const app = byNumber.get(n);
          if (app) queue.push(app);
        }
        for (const app of apps) {
          if (queue.length >= 5) break;
          if (app.status === "approved" && !queue.some((q) => q._id === app._id)) {
            queue.push(app);
          }
        }
        for (const app of apps) {
          if (queue.length >= 5) break;
          if (app.status === "submitted" && !queue.some((q) => q._id === app._id)) {
            queue.push(app);
          }
        }

        let slot = 0;
        for (const app of queue.slice(0, 5)) {
          const scheduledAt = atToday(slots[slot].hour, slots[slot].minute);
          slot++;
          await ctx.db.patch(app._id, {
            status: "scheduled",
            assignedOfficerId: officer._id,
            scheduledAt,
            priority: slot <= 2 ? "high" : app.priority,
            updatedAt: now,
            statusHistory: [
              ...app.statusHistory,
              { status: "scheduled", at: now, byName: "Department Administrator", byRole: "dept_admin", note: `Inspection scheduled for ${new Date(scheduledAt).toLocaleString("en-IN")}` },
              { status: "inspection_pending", at: now, byName: name, byRole: "lmo", note: `Assigned to ${name}` },
            ],
          });
          await ctx.db.insert("inspections", {
            applicationId: app._id,
            instrumentId: app.instrumentId,
            officerId: officer._id,
            officerName: name,
            status: "scheduled",
            scheduledAt,
            photos: [],
            measurements: [],
            capturedOffline: false,
            updatedAt: now,
          });
          await ctx.db.patch(app.instrumentId, { status: "under_verification" });
        }

        await ctx.db.patch(officer._id, {
          activeAssignments: Math.min(5, queue.length),
          completedAssignments: 24,
        });
        result.assigned = Math.min(5, queue.length);

        // 3 inspections already completed today, for the "Completed Today" card.
        const completed = await ctx.db
          .query("inspections")
          .withIndex("by_status", (q) => q.eq("status", "synced"))
          .collect();
        const todaySlots = [atToday(9, 15), atToday(11, 20), atToday(13, 40)];
        let done = 0;
        for (const ins of completed) {
          if (done >= 3) break;
          if (ins.officerId === officer._id) continue;
          const completedAt = todaySlots[done];
          if (completedAt > Date.now()) continue;
          await ctx.db.patch(ins._id, { officerId: officer._id, officerName: name, completedAt });
          if (ins.certificateId) {
            await ctx.db.patch(ins.certificateId, { officerId: officer._id, officerName: name });
          }
          done++;
        }
        result.completedToday = done;
      }

      // A demo session that was first claimed on an earlier day would otherwise
      // open an empty field calendar. Re-anchor the officer's open inspections
      // onto today's slots so "Today's Inspections" is never blank.
      const dayStart = atToday(0, 0);
      const dayEnd = dayStart + DAY_MS;
      const own = await ctx.db
        .query("inspections")
        .withIndex("by_officer", (q) => q.eq("officerId", officer._id))
        .collect();

      const scheduledToday = own.filter(
        (ins) =>
          ins.scheduledAt >= dayStart &&
          ins.scheduledAt < dayEnd &&
          ins.status !== "completed" &&
          ins.status !== "synced",
      );

      if (scheduledToday.length === 0) {
        const slots = [
          { hour: 10, minute: 0 },
          { hour: 12, minute: 30 },
          { hour: 14, minute: 0 },
          { hour: 15, minute: 30 },
          { hour: 16, minute: 45 },
        ];
        const open = own
          .filter((ins) => ins.status !== "completed" && ins.status !== "synced")
          .sort((a, b) => a.scheduledAt - b.scheduledAt)
          .slice(0, slots.length);

        for (let i = 0; i < open.length; i++) {
          const scheduledAt = atToday(slots[i].hour, slots[i].minute);
          await ctx.db.patch(open[i]._id, { scheduledAt, updatedAt: now });
          const linked = await ctx.db.get(open[i].applicationId);
          if (linked) {
            await ctx.db.patch(linked._id, { scheduledAt, updatedAt: now });
          }
        }
        if (open.length) result.rescheduled = open.length;
      }

      // Keep the "Completed Today" card meaningful on return visits too.
      const completedToday = own.filter(
        (ins) =>
          ins.completedAt !== undefined &&
          ins.completedAt >= dayStart &&
          ins.completedAt < dayEnd,
      ).length;

      if (completedToday === 0) {
        const pastSlots = [atToday(9, 15), atToday(11, 20), atToday(13, 40)];
        const recentlyClosed = own
          .filter((ins) => ins.completedAt !== undefined)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
          .slice(0, pastSlots.length);
        let i = 0;
        for (const ins of recentlyClosed) {
          const completedAt = pastSlots[i];
          if (completedAt >= Date.now()) break;
          await ctx.db.patch(ins._id, { completedAt, updatedAt: now });
          i++;
        }
        if (i) result.recompleted = i;
      }

      const latestCertificate = (
        await ctx.db.query("certificates").collect()
      ).sort((a, b) => b.createdAt - a.createdAt)[0];
      const certRef = latestCertificate?.certificateNumber ?? "LM-RJ-2026-001064";

      await notify(ctx, userId, [
        {
          type: "scheduling",
          title: "Inspection scheduled for today",
          titleHi: "आज के लिए निरीक्षण निर्धारित",
          body: "5 field inspections are scheduled in Jaipur district. First appointment is at 10:00 AM.",
          bodyHi: "जयपुर जिले में 5 क्षेत्र निरीक्षण निर्धारित हैं। पहली नियुक्ति सुबह 10:00 बजे है।",
          link: "/dashboard",
        },
        {
          type: "verification",
          title: "New inspection assigned — WM-RJ-JPR-001842",
          titleHi: "नया निरीक्षण सौंपा गया — WM-RJ-JPR-001842",
          body: "Jaipur Weighing Solutions · Electronic Platform Scale. Report to the declared site with test weights.",
          bodyHi: "जयपुर वेइंग सॉल्यूशंस · इलेक्ट्रॉनिक प्लेटफ़ॉर्म काँटा। परीक्षण बाट के साथ घोषित स्थल पर पहुँचें।",
          link: "/dashboard/assignments",
        },
        {
          type: "application",
          title: "2 applications awaiting document review",
          titleHi: "2 आवेदन दस्तावेज़ समीक्षा हेतु लंबित",
          body: "Purchase invoices for two Jaipur applications need verification before scheduling.",
          bodyHi: "शेड्यूलिंग से पहले जयपुर के दो आवेदनों के क्रय चालान सत्यापित करने हैं।",
          link: "/dashboard/assignments",
        },
        {
          type: "certificate",
          title: `Certificate ${certRef} issued`,
          titleHi: `प्रमाणपत्र ${certRef} जारी`,
          body: "Digital verification certificate generated and dispatched to the applicant over the portal.",
          bodyHi: "डिजिटल सत्यापन प्रमाणपत्र बनाया गया और पोर्टल पर आवेदक को भेजा गया।",
          link: "/dashboard/certificates",
        },
        {
          type: "expiry",
          title: "8 certificates expiring within 30 days",
          titleHi: "30 दिनों में 8 प्रमाणपत्र समाप्त हो रहे हैं",
          body: "Re-verification reminders were queued to instrument owners in your jurisdiction.",
          bodyHi: "आपके क्षेत्राधिकार के यंत्र स्वामियों को पुनः सत्यापन अनुस्मारक कतारबद्ध किए गए।",
          link: "/dashboard/certificates",
        },
        {
          type: "system",
          title: "Offline field mode ready",
          titleHi: "ऑफ़लाइन फ़ील्ड मोड तैयार",
          body: "Field forms are cached on this device. Records captured without network sync automatically.",
          bodyHi: "फ़ील्ड फ़ॉर्म इस डिवाइस पर सुरक्षित हैं। नेटवर्क के बिना दर्ज रिकॉर्ड स्वतः सिंक हो जाएँगे।",
        },
      ]);
    }

    /* ── Business / instrument owner ───────────────────────────────────── */
    if (role === ROLES.BUSINESS) {
      let org = await ctx.db
        .query("organizations")
        .filter((q) => q.eq(q.field("name"), "Jaipur Weighing Solutions"))
        .first();
      if (!org) org = await ctx.db.query("organizations").first();
      if (org) {
        await ctx.db.patch(userId, {
          organizationId: org._id,
          phone: org.phone,
          jurisdictionDistrict: org.district,
          jurisdictionState: org.state,
        });
        if (!org.ownerUserId) {
          await ctx.db.patch(org._id, { ownerUserId: userId });
        }
      }
      const ownCertificate = org
        ? (
            await ctx.db
              .query("certificates")
              .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
              .collect()
          ).sort((a, b) => b.createdAt - a.createdAt)[0]
        : undefined;
      const ownRef = ownCertificate?.certificateNumber ?? "your certificate";

      await notify(ctx, userId, [
        {
          type: "certificate",
          title: `Certificate ${ownRef} is valid`,
          titleHi: `प्रमाणपत्र ${ownRef} वैध है`,
          body: "Download the digital certificate or share the QR code for on-the-spot verification.",
          bodyHi: "डिजिटल प्रमाणपत्र डाउनलोड करें या मौके पर सत्यापन हेतु QR कोड साझा करें।",
          link: "/dashboard/certificates",
        },
        {
          type: "application",
          title: "Application LM-2026-001931 documents approved",
          titleHi: "आवेदन LM-2026-001931 के दस्तावेज़ स्वीकृत",
          body: "An officer has been assigned. Inspection is scheduled for today at 12:30 PM.",
          bodyHi: "एक अधिकारी नियुक्त किया गया है। निरीक्षण आज दोपहर 12:30 बजे निर्धारित है।",
          link: "/dashboard/applications",
        },
        {
          type: "expiry",
          title: "Re-verification due for 2 instruments",
          titleHi: "2 यंत्रों का पुनः सत्यापन देय है",
          body: "Submit a re-verification application before the stamping validity lapses.",
          bodyHi: "मुहर वैधता समाप्त होने से पहले पुनः सत्यापन आवेदन जमा करें।",
          link: "/dashboard/instruments",
        },
        {
          type: "system",
          title: "Welcome to METRIQ",
          titleHi: "METRIQ में आपका स्वागत है",
          body: "This is a prototype demonstration environment. Records shown are fictional demo data.",
          bodyHi: "यह एक प्रोटोटाइप प्रदर्शन वातावरण है। दिखाए गए रिकॉर्ड काल्पनिक डेमो डेटा हैं।",
        },
      ]);
    }

    /* ── GATC ────────────────────────────────────────────────────────────── */
    if (role === ROLES.GATC) {
      const gatc = await ctx.db.query("gatcs").first();
      await notify(ctx, userId, [
        {
          type: "verification",
          title: "Testing request received",
          titleHi: "परीक्षण अनुरोध प्राप्त हुआ",
          body: "A weighbridge has been referred to your centre for capacity testing.",
          bodyHi: "एक वाहन तुला क्षमता परीक्षण हेतु आपके केंद्र को भेजी गई है।",
        },
        {
          type: "system",
          title: "GATC module is a demo surface",
          titleHi: "GATC मॉड्यूल एक डेमो सतह है",
          body: "Version 1 focuses on the Business → Admin → LMO → Public certificate journey.",
          bodyHi: "संस्करण 1 व्यवसाय → प्रशासन → अधिकारी → सार्वजनिक प्रमाणपत्र यात्रा पर केंद्रित है।",
        },
      ]);
      result.gatc = gatc?.name ?? null;
    }

    /* ── Administrators ──────────────────────────────────────────────────── */
    if (role === ROLES.DEPT_ADMIN || role === ROLES.MINISTRY || role === ROLES.ADMIN) {
      await notify(ctx, userId, [
        {
          type: "application",
          title: "Applications awaiting review",
          titleHi: "समीक्षा हेतु लंबित आवेदन",
          body: "Submitted applications are queued for document verification and officer assignment.",
          bodyHi: "जमा आवेदन दस्तावेज़ सत्यापन और अधिकारी नियुक्ति हेतु कतार में हैं।",
          link: "/dashboard/applications",
        },
        {
          type: "expiry",
          title: "Certificates expiring this quarter",
          titleHi: "इस तिमाही में समाप्त होने वाले प्रमाणपत्र",
          body: "Expiry reminders have been queued for the affected establishments.",
          bodyHi: "प्रभावित प्रतिष्ठानों के लिए समाप्ति अनुस्मारक कतारबद्ध किए गए हैं।",
          link: "/dashboard/reports",
        },
        {
          type: "system",
          title: "Prototype environment",
          titleHi: "प्रोटोटाइप वातावरण",
          body: "METRIQ is a demonstration prototype. It is not an official Government of India service.",
          bodyHi: "METRIQ एक प्रदर्शन प्रोटोटाइप है। यह भारत सरकार की आधिकारिक सेवा नहीं है।",
        },
      ]);
    }

    await writeAudit(ctx, {
      actorUserId: userId,
      actorName: name,
      actorRole: role,
      action: "session.role_claimed",
      entityType: "user",
      entityId: String(userId),
      recordLabel: profile.code,
      detail: `Demo workspace initialised for ${role} role`,
      device: "METRIQ Web",
    });

    return result;
  },
});
