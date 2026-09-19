import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Demo data seeding.
 *
 * Everything here is fictional and generated deterministically so that every
 * dashboard in the prototype looks populated. Seeding is split into small,
 * idempotent steps (each guarded by an `appSettings` row) so that no single
 * Convex mutation has to write hundreds of documents at once.
 */

export const SEED_STEPS = [
  "master",
  "organizations",
  "officers",
  "instruments-1",
  "instruments-2",
  "applications-1",
  "applications-2",
  "applications-3",
  "documents",
  "certificates",
  "audit",
] as const;

export type SeedStep = (typeof SEED_STEPS)[number];

/* ── deterministic pseudo random ──────────────────────────────────────────── */

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

/* ── reference data ──────────────────────────────────────────────────────── */

const STATES = [
  { code: "RJ", name: "Rajasthan", nameHi: "राजस्थान", region: "North" },
  { code: "DL", name: "Delhi", nameHi: "दिल्ली", region: "North" },
  { code: "MH", name: "Maharashtra", nameHi: "महाराष्ट्र", region: "West" },
  { code: "KA", name: "Karnataka", nameHi: "कर्नाटक", region: "South" },
  { code: "GJ", name: "Gujarat", nameHi: "गुजरात", region: "West" },
  { code: "UP", name: "Uttar Pradesh", nameHi: "उत्तर प्रदेश", region: "North" },
];

const DISTRICTS = [
  { name: "Jaipur", state: "Rajasthan", code: "JPR", lat: 26.9124, lng: 75.7873, nameHi: "जयपुर" },
  { name: "Jodhpur", state: "Rajasthan", code: "JDH", lat: 26.2389, lng: 73.0243, nameHi: "जोधपुर" },
  { name: "Udaipur", state: "Rajasthan", code: "UDR", lat: 24.5854, lng: 73.7125, nameHi: "उदयपुर" },
  { name: "Kota", state: "Rajasthan", code: "KOT", lat: 25.2138, lng: 75.8648, nameHi: "कोटा" },
  { name: "Ajmer", state: "Rajasthan", code: "AJM", lat: 26.4499, lng: 74.6399, nameHi: "अजमेर" },
  { name: "Alwar", state: "Rajasthan", code: "ALW", lat: 27.553, lng: 76.6346, nameHi: "अलवर" },
  { name: "Bikaner", state: "Rajasthan", code: "BKN", lat: 28.0229, lng: 73.3119, nameHi: "बीकानेर" },
  { name: "New Delhi", state: "Delhi", code: "NDL", lat: 28.6139, lng: 77.209, nameHi: "नई दिल्ली" },
  { name: "South Delhi", state: "Delhi", code: "SDL", lat: 28.5355, lng: 77.21, nameHi: "दक्षिण दिल्ली" },
  { name: "Mumbai", state: "Maharashtra", code: "MUM", lat: 19.076, lng: 72.8777, nameHi: "मुंबई" },
  { name: "Pune", state: "Maharashtra", code: "PUN", lat: 18.5204, lng: 73.8567, nameHi: "पुणे" },
  { name: "Nagpur", state: "Maharashtra", code: "NGP", lat: 21.1458, lng: 79.0882, nameHi: "नागपुर" },
  { name: "Bengaluru Urban", state: "Karnataka", code: "BLR", lat: 12.9716, lng: 77.5946, nameHi: "बेंगलुरु शहरी" },
  { name: "Mysuru", state: "Karnataka", code: "MYS", lat: 12.2958, lng: 76.6394, nameHi: "मैसूर" },
  { name: "Ahmedabad", state: "Gujarat", code: "AMD", lat: 23.0225, lng: 72.5714, nameHi: "अहमदाबाद" },
  { name: "Surat", state: "Gujarat", code: "SUR", lat: 21.1702, lng: 72.8311, nameHi: "सूरत" },
  { name: "Vadodara", state: "Gujarat", code: "VDR", lat: 22.3072, lng: 73.1812, nameHi: "वडोदरा" },
  { name: "Lucknow", state: "Uttar Pradesh", code: "LKO", lat: 26.8467, lng: 80.9462, nameHi: "लखनऊ" },
  { name: "Kanpur Nagar", state: "Uttar Pradesh", code: "KNP", lat: 26.4499, lng: 80.3319, nameHi: "कानपुर नगर" },
  { name: "Varanasi", state: "Uttar Pradesh", code: "VNS", lat: 25.3176, lng: 82.9739, nameHi: "वाराणसी" },
];

const CATEGORIES = [
  { code: "EWS", group: "weighing", name: "Electronic weighing scale", nameHi: "इलेक्ट्रॉनिक तुला", unit: "kg", steps: [0, 25, 50, 75, 100], mpe: 0.1, gatc: false },
  { code: "PLS", group: "weighing", name: "Platform scale", nameHi: "प्लेटफ़ॉर्म काँटा", unit: "kg", steps: [0, 25, 50, 100], mpe: 0.1, gatc: false },
  { code: "CTS", group: "weighing", name: "Counter scale", nameHi: "काउंटर काँटा", unit: "kg", steps: [0, 50, 100], mpe: 0.2, gatc: false },
  { code: "RWS", group: "weighing", name: "Retail weighing scale", nameHi: "फुटकर तुला", unit: "kg", steps: [0, 50, 100], mpe: 0.2, gatc: false },
  { code: "IWS", group: "weighing", name: "Industrial weighing scale", nameHi: "औद्योगिक तुला", unit: "kg", steps: [0, 25, 50, 75, 100], mpe: 0.1, gatc: false },
  { code: "WBR", group: "weighing", name: "Weighbridge", nameHi: "वाहन तुला", unit: "tonne", steps: [0, 25, 50, 75, 100], mpe: 0.05, gatc: true },
  { code: "CRS", group: "weighing", name: "Crane scale", nameHi: "क्रेन तुला", unit: "kg", steps: [0, 50, 100], mpe: 0.15, gatc: false },
  { code: "SWT", group: "weights", name: "Standard weights", nameHi: "मानक बाट", unit: "kg", steps: [100], mpe: 0.05, gatc: false },
  { code: "CWT", group: "weights", name: "Commercial weights", nameHi: "व्यापारिक बाट", unit: "kg", steps: [100], mpe: 0.1, gatc: false },
  { code: "KWT", group: "weights", name: "Counter weights", nameHi: "काउंटर बाट", unit: "g", steps: [100], mpe: 0.2, gatc: false },
  { code: "LMI", group: "measuring", name: "Length measuring instrument", nameHi: "लंबाई मापन यंत्र", unit: "m", steps: [0, 50, 100], mpe: 0.1, gatc: false },
  { code: "VMI", group: "measuring", name: "Volume measuring instrument", nameHi: "आयतन मापन यंत्र", unit: "litre", steps: [0, 50, 100], mpe: 0.2, gatc: false },
  { code: "MCT", group: "measuring", name: "Measuring container", nameHi: "मापन पात्र", unit: "litre", steps: [0, 50, 100], mpe: 0.3, gatc: false },
  { code: "FDU", group: "measuring", name: "Fuel dispensing unit", nameHi: "ईंधन वितरण यंत्र", unit: "litre", steps: [0, 25, 50, 100], mpe: 0.25, gatc: true },
  { code: "ORI", group: "measuring", name: "Other regulated instrument", nameHi: "अन्य विनियमित यंत्र", unit: "unit", steps: [0, 100], mpe: 0.5, gatc: false },
];

const ORGS = [
  { name: "Sharma General Store", person: "Mahesh Sharma", district: "Jaipur", kind: "Retail establishment" },
  { name: "Jaipur Weighing Solutions", person: "Nitin Agarwal", district: "Jaipur", kind: "Instrument dealer" },
  { name: "Pink City Wholesale", person: "Ramesh Choudhary", district: "Jaipur", kind: "Wholesale trader" },
  { name: "Aravali Industries", person: "Sanjay Meena", district: "Jodhpur", kind: "Manufacturer" },
  { name: "Marwar Grain Depot", person: "Bhagwan Singh", district: "Jodhpur", kind: "Wholesale trader" },
  { name: "Lake City Cement Works", person: "Deepak Jain", district: "Udaipur", kind: "Manufacturer" },
  { name: "Mewar Kirana Mart", person: "Kamlesh Suthar", district: "Udaipur", kind: "Retail establishment" },
  { name: "Rajasthan Agro Traders", person: "Om Prakash Yadav", district: "Kota", kind: "Wholesale trader" },
  { name: "Ajmer Steel & Hardware", person: "Farhan Qureshi", district: "Ajmer", kind: "Manufacturer" },
  { name: "Bikaner Wool Traders", person: "Sitaram Bishnoi", district: "Bikaner", kind: "Wholesale trader" },
  { name: "Sariska Fuels", person: "Jitendra Kumar", district: "Alwar", kind: "Fuel station" },
  { name: "Delhi Metro Hardware", person: "Vikas Arora", district: "New Delhi", kind: "Retail establishment" },
  { name: "Connaught Traders", person: "Naveen Sethi", district: "New Delhi", kind: "Wholesale trader" },
  { name: "Fortune Oils Depot", person: "Sandeep Kadam", district: "Mumbai", kind: "Manufacturer" },
  { name: "Deccan Weighing Systems", person: "Ashwin Deshpande", district: "Pune", kind: "Instrument dealer" },
  { name: "Nagpur Cotton Exchange", person: "Rohit Wankhede", district: "Nagpur", kind: "Wholesale trader" },
  { name: "Silicon Grocers", person: "Kiran Shetty", district: "Bengaluru Urban", kind: "Retail establishment" },
  { name: "Mysuru Sand & Aggregates", person: "Lokesh Gowda", district: "Mysuru", kind: "Manufacturer" },
  { name: "Sabarmati Chemical Works", person: "Paresh Shah", district: "Ahmedabad", kind: "Manufacturer" },
  { name: "Surat Textile Mills", person: "Alpesh Naik", district: "Surat", kind: "Manufacturer" },
  { name: "Vadodara Steel Depot", person: "Hitesh Solanki", district: "Vadodara", kind: "Wholesale trader" },
  { name: "Gomti Provision House", person: "Arun Tripathi", district: "Lucknow", kind: "Retail establishment" },
  { name: "Kanpur Tanneries Co-op", person: "Rajeev Nigam", district: "Kanpur Nagar", kind: "Manufacturer" },
  { name: "Kashi Gold Refiners", person: "Manoj Pandey", district: "Varanasi", kind: "Manufacturer" },
];

const OFFICERS = [
  { name: "Rajesh Sharma", code: "LMO-RJ-0114", designation: "Inspector", district: "Jaipur", state: "Rajasthan", completed: 24 },
  { name: "Meena Verma", code: "LMO-RJ-0121", designation: "Assistant Controller", district: "Jaipur", state: "Rajasthan", completed: 31 },
  { name: "Anil Kumar Gupta", code: "LMO-RJ-0142", designation: "Inspector", district: "Jodhpur", state: "Rajasthan", completed: 19 },
  { name: "Priya Nair", code: "LMO-RJ-0155", designation: "Inspector", district: "Udaipur", state: "Rajasthan", completed: 16 },
  { name: "Suresh Bansal", code: "LMO-RJ-0163", designation: "Inspector", district: "Kota", state: "Rajasthan", completed: 22 },
  { name: "Kavita Rathore", code: "LMO-RJ-0178", designation: "Assistant Controller", district: "Ajmer", state: "Rajasthan", completed: 27 },
  { name: "Devendra Singh", code: "LMO-DL-0221", designation: "Inspector", district: "New Delhi", state: "Delhi", completed: 34 },
  { name: "Ritu Malhotra", code: "LMO-MH-0309", designation: "Inspector", district: "Mumbai", state: "Maharashtra", completed: 29 },
  { name: "Ganesh Iyer", code: "LMO-MH-0322", designation: "Inspector", district: "Pune", state: "Maharashtra", completed: 21 },
  { name: "Shalini Rao", code: "LMO-KA-0407", designation: "Assistant Controller", district: "Bengaluru Urban", state: "Karnataka", completed: 25 },
  { name: "Harshad Patel", code: "LMO-GJ-0511", designation: "Inspector", district: "Ahmedabad", state: "Gujarat", completed: 18 },
  { name: "Vikram Yadav", code: "LMO-UP-0614", designation: "Inspector", district: "Lucknow", state: "Uttar Pradesh", completed: 20 },
];

const GATCS = [
  { name: "Regional Verification Centre, Jaipur", code: "GATC-RJ-01", district: "Jaipur", state: "Rajasthan", person: "Sunil Joshi", accreditation: "NABL-GATC-2019-0417" },
  { name: "Government Approved Test Centre, Jodhpur", code: "GATC-RJ-02", district: "Jodhpur", state: "Rajasthan", person: "Mahendra Purohit", accreditation: "NABL-GATC-2020-0662" },
  { name: "Central Instrument Test Centre, Udaipur", code: "GATC-RJ-03", district: "Udaipur", state: "Rajasthan", person: "Neha Chouhan", accreditation: "NABL-GATC-2021-0735" },
  { name: "Kota Weights & Measures Test Centre", code: "GATC-RJ-04", district: "Kota", state: "Rajasthan", person: "Rahul Mathur", accreditation: "NABL-GATC-2021-0819" },
  { name: "National Weighbridge Calibration Centre", code: "GATC-MH-01", district: "Mumbai", state: "Maharashtra", person: "Sudhir Kamath", accreditation: "NABL-GATC-2018-0203" },
  { name: "South India Instrument Test Centre", code: "GATC-KA-01", district: "Bengaluru Urban", state: "Karnataka", person: "Latha Krishnan", accreditation: "NABL-GATC-2022-0941" },
];

const MAKERS_WEIGHING = ["Avery India", "Essae Digitronics", "Thermoflux Systems", "Precision Weigh Tech", "Indus Scales"];
const MAKERS_WEIGHTS = ["Nagpur Weight Works", "Standard Bata Udyog", "Bharat Weights"];
const MAKERS_MEASURING = ["Perfect Measurements", "Kaveri Instruments", "FlowLine Dispensers", "Meridian Metrology"];

const STREETS = [
  "MI Road", "Johari Bazaar", "Station Road", "Industrial Area Phase II", "Sardarpura",
  "Nehru Nagar", "MG Road", "Transport Nagar", "Civil Lines", "Subhash Chowk",
  "Karol Bagh Market", "Lamington Road", "FC Road", "MIHAN Logistics Park", "Peenya Industrial Area",
  "Naroda GIDC", "Ring Road", "Hazratganj", "Panki Industrial Estate", "Sigra Market",
];

/* ── small helpers ───────────────────────────────────────────────────────── */

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

async function stepDone(ctx: MutationCtx, key: string) {
  const row = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return !!row;
}

async function markStep(ctx: MutationCtx, key: string, value: unknown = true) {
  await ctx.db.insert("appSettings", { key, value, updatedAt: Date.now() });
}

function makePhoto(kind: string, caption: string, tone: string) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='320'>` +
    `<rect width='480' height='320' fill='${tone}'/>` +
    `<rect x='28' y='28' width='424' height='264' fill='none' stroke='rgba(255,255,255,0.45)' stroke-width='2'/>` +
    `<text x='44' y='72' font-family='monospace' font-size='15' fill='rgba(255,255,255,0.9)'>${caption}</text>` +
    `<text x='44' y='268' font-family='monospace' font-size='12' fill='rgba(255,255,255,0.6)'>DEMO EVIDENCE IMAGE</text>` +
    `</svg>`;
  void kind;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

/* ── public API ──────────────────────────────────────────────────────────── */

export const seedStatus = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("appSettings").collect();
    const done = new Set(
      rows.filter((r) => r.key.startsWith("seed:")).map((r) => r.key.slice(5)),
    );
    const pending = SEED_STEPS.filter((s) => !done.has(s));
    return { complete: pending.length === 0, pending, doneCount: done.size };
  },
});

export const seedStep = mutation({
  args: { step: v.string() },
  handler: async (ctx, { step }) => {
    if (!(SEED_STEPS as readonly string[]).includes(step)) {
      return { ok: false, reason: "unknown-step" };
    }
    const key = `seed:${step}`;
    if (await stepDone(ctx, key)) return { ok: true, skipped: true };

    const now = Date.now();

    if (step === "master") {
      for (const s of STATES) await ctx.db.insert("states", s);
      for (const d of DISTRICTS) {
        await ctx.db.insert("districts", {
          stateCode: STATES.find((s) => s.name === d.state)?.code ?? "RJ",
          state: d.state,
          code: d.code,
          name: d.name,
          nameHi: d.nameHi,
          lat: d.lat,
          lng: d.lng,
        });
      }
      for (const c of CATEGORIES) {
        await ctx.db.insert("instrumentCategories", {
          group: c.group as "weighing" | "weights" | "measuring",
          name: c.name,
          nameHi: c.nameHi,
          code: c.code,
          unit: c.unit,
          testSteps: c.steps,
          maxPermissibleErrorPct: c.mpe,
          requiresGatc: c.gatc,
          validityMonths: 12,
          active: true,
        });
      }
      await markStep(ctx, key, { states: STATES.length, districts: DISTRICTS.length });
      return { ok: true };
    }

    if (step === "organizations") {
      const rand = rng(4021);
      for (let i = 0; i < ORGS.length; i++) {
        const o = ORGS[i];
        const d = DISTRICTS.find((x) => x.name === o.district)!;
        await ctx.db.insert("organizations", {
          name: o.name,
          contactPerson: o.person,
          phone: `+91 9${pad(Math.floor(rand() * 900000000) + 100000000, 9)}`.slice(0, 15),
          email: `${o.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@example.in`,
          gstin: `${d.code}${pad(Math.floor(rand() * 9000) + 1000, 4)}A${pad(Math.floor(rand() * 900) + 100, 3)}Z5`,
          kind: o.kind,
          addressLine: `${pad(Math.floor(rand() * 90) + 10, 2)}, ${STREETS[i % STREETS.length]}`,
          state: d.state,
          district: d.name,
          pincode: pad(Math.floor(rand() * 800000) + 110000, 6),
          lat: d.lat + (rand() - 0.5) * 0.06,
          lng: d.lng + (rand() - 0.5) * 0.06,
          createdAt: now - Math.floor(rand() * 400) * DAY,
        });
      }
      await markStep(ctx, key, { organizations: ORGS.length });
      return { ok: true };
    }

    if (step === "officers") {
      const rand = rng(7781);
      for (const o of OFFICERS) {
        await ctx.db.insert("officers", {
          name: o.name,
          employeeCode: o.code,
          designation: o.designation,
          state: o.state,
          district: o.district,
          phone: `+91 9${pad(Math.floor(rand() * 900000000) + 100000000, 9)}`.slice(0, 15),
          email: `${o.code.toLowerCase()}@lm.gov.example.in`,
          activeAssignments: 3 + Math.floor(rand() * 7),
          completedAssignments: o.completed,
          isDemoSeeded: true,
        });
      }
      for (const g of GATCS) {
        await ctx.db.insert("gatcs", {
          name: g.name,
          code: g.code,
          state: g.state,
          district: g.district,
          contactPerson: g.person,
          phone: `+91 9${pad(Math.floor(rand() * 900000000) + 100000000, 9)}`.slice(0, 15),
          accreditationNo: g.accreditation,
          capacity: 8 + Math.floor(rand() * 14),
          activeTests: Math.floor(rand() * 7),
        });
      }
      await markStep(ctx, key, { officers: OFFICERS.length, gatcs: GATCS.length });
      return { ok: true };
    }

    if (step === "instruments-1" || step === "instruments-2") {
      const orgs = await ctx.db.query("organizations").collect();
      const cats = await ctx.db.query("instrumentCategories").collect();
      const rand = rng(step === "instruments-1" ? 9137 : 3313);
      const orgsByDistrict = new Map<string, (typeof orgs)[number][]>();
      for (const o of orgs) {
        const list = orgsByDistrict.get(o.district) ?? [];
        list.push(o);
        orgsByDistrict.set(o.district, list);
      }

      const seq = new Map<string, number>();

      // Two anchor instruments from the demo scenario, created first.
      const anchors = [
        {
          district: "Jaipur",
          spec: { name: "Electronic Platform Scale", code: "PLS", group: "weighing" },
          org: "Jaipur Weighing Solutions",
          capacity: "500 kg",
          accuracy: "Class III",
          location: "Weighing bay, Main Godown",
        },
        {
          district: "Jaipur",
          spec: { name: "Electronic Weighing Scale", code: "EWS", group: "weighing" },
          org: "Sharma General Store",
          capacity: "50 kg",
          accuracy: "Class III",
          location: "Billing counter, Sales floor",
        },
      ];

      if (step === "instruments-1") {
        let sub = 0;
        for (const a of anchors) {
          const d = DISTRICTS.find((x) => x.name === a.district)!;
          const cat = cats.find((c) => c.code === a.spec.code)!;
          const org = orgs.find((o) => o.name === a.org)!;
          const code = `WM-${d.state === "Rajasthan" ? "RJ" : "XX"}-${d.code}-${pad(1842 + sub * 89, 7)}`;
          await ctx.db.insert("instruments", {
            instrumentCode: code,
            categoryId: cat._id,
            categoryName: a.spec.name,
            group: a.spec.group,
            instrumentType: a.spec.name,
            manufacturer: MAKERS_WEIGHING[sub],
            model: `AX-${400 + sub * 25}`,
            serialNumber: `SN${pad(482310 + sub * 4211, 8)}`,
            capacity: a.capacity,
            accuracyClass: a.accuracy,
            organizationId: org._id,
            ownerName: org.name,
            locationLabel: a.location,
            addressLine: org.addressLine,
            state: org.state,
            district: org.district,
            pincode: org.pincode,
            lat: org.lat!,
            lng: org.lng!,
            status: "active",
            registeredAt: now - (520 - sub * 40) * DAY,
            lastVerificationAt: now - (400 - sub * 30) * DAY,
            nextVerificationDue: now + (330 + sub * 30) * DAY,
          });
          sub++;
        }
      }

      const count = step === "instruments-1" ? 59 : 59;
      for (let i = 0; i < count; i++) {
        const cat = cats[Math.floor(rand() * cats.length)];
        const d = DISTRICTS[Math.floor(rand() * DISTRICTS.length)];
        const pool = orgsByDistrict.get(d.name);
        const org = pool && pool.length ? pool[Math.floor(rand() * pool.length)] : orgs[Math.floor(rand() * orgs.length)];
        const district = DISTRICTS.find((x) => x.name === org.district)!;
        const n = (seq.get(district.code) ?? 1900) + 1 + i;
        seq.set(district.code, n);
        const stateCode =
          STATES.find((s) => s.name === district.state)?.code ?? "RJ";
        const makers =
          cat.group === "weighing"
            ? MAKERS_WEIGHING
            : cat.group === "weights"
              ? MAKERS_WEIGHTS
              : MAKERS_MEASURING;
        const capacityByGroup =
          cat.group === "weighing"
            ? `${[10, 20, 50, 100, 200, 500, 1000, 5000][Math.floor(rand() * 8)]} kg`
            : cat.group === "weights"
              ? `${[1, 2, 5, 10, 20][Math.floor(rand() * 5)]} kg`
              : `${[5, 10, 20, 50, 100][Math.floor(rand() * 5)]} ${cat.unit}`;
        const statusRoll = rand();
        const status =
          statusRoll < 0.62
            ? "active"
            : statusRoll < 0.76
              ? "verification_due"
              : statusRoll < 0.9
                ? "verification_expired"
                : statusRoll < 0.97
                  ? "under_verification"
                  : "suspended";
        const lastVerified = now - Math.floor(rand() * 420) * DAY;
        await ctx.db.insert("instruments", {
          instrumentCode: `WM-${stateCode}-${district.code}-${pad(n, 7)}`,
          categoryId: cat._id,
          categoryName: cat.name,
          group: cat.group,
          instrumentType: cat.name,
          manufacturer: makers[Math.floor(rand() * makers.length)],
          model: `${cat.code}-${100 + Math.floor(rand() * 899)}`,
          serialNumber: `SN${pad(Math.floor(rand() * 9_000_000) + 1_000_000, 8)}`,
          capacity: capacityByGroup,
          accuracyClass: `Class ${rand() < 0.7 ? "III" : "II"}`,
          organizationId: org._id,
          ownerName: org.name,
          locationLabel: STREETS[(i + 3) % STREETS.length],
          addressLine: org.addressLine,
          state: org.state,
          district: org.district,
          pincode: org.pincode,
          lat: org.lat! + (rand() - 0.5) * 0.03,
          lng: org.lng! + (rand() - 0.5) * 0.03,
          status,
          registeredAt: now - Math.floor(rand() * 900) * DAY,
          lastVerificationAt: status === "active" ? lastVerified : lastVerified - 120 * DAY,
          nextVerificationDue:
            status === "verification_expired"
              ? now - Math.floor(rand() * 60 + 5) * DAY
              : now + Math.floor(rand() * 300 + 20) * DAY,
        });
      }
      await markStep(ctx, key, { instruments: count + (step === "instruments-1" ? 2 : 0) });
      return { ok: true };
    }

    if (step.startsWith("applications-")) {
      const instruments = await ctx.db.query("instruments").collect();
      const orgs = await ctx.db.query("organizations").collect();
      const officers = await ctx.db.query("officers").collect();
      const gatcs = await ctx.db.query("gatcs").collect();
      const idx = Number(step.split("-")[1]);
      const rand = rng(5501 + idx * 977);

      const STATUS_PLAN: { status: string; count: number }[] = [
        { status: "draft", count: 3 },
        { status: "submitted", count: 6 },
        { status: "under_review", count: 5 },
        { status: "documents_required", count: 3 },
        { status: "approved", count: 4 },
        { status: "scheduled", count: 8 },
        { status: "inspection_pending", count: 5 },
        { status: "verification_in_progress", count: 3 },
        { status: "verified", count: 34 },
        { status: "rejected", count: 5 },
        { status: "cancelled", count: 2 },
      ];
      const queue: string[] = [];
      for (const p of STATUS_PLAN) for (let i = 0; i < p.count; i++) queue.push(p.status);

      const perStep = Math.ceil(queue.length / 3); // 3 application steps
      const slice = queue.slice((idx - 1) * perStep, idx * perStep);

      // The two anchored instruments belong to the documented demo scenario and
      // must keep a single, pending application rather than a random one.
      const ANCHOR_CODES = ["WM-RJ-JPR-0001842", "WM-RJ-JPR-001931"];
      const pool = instruments.filter((x) => !ANCHOR_CODES.includes(x.instrumentCode));

      const appIndexBase = (idx - 1) * perStep;
      let n = 0;

      // Two anchored applications from the documented end-to-end demo scenario.
      if (idx === 1) {
        const anchors = [
          {
            number: "LM-2026-001842",
            instrumentCode: "WM-RJ-JPR-0001842",
            note: "Instrument registered for new verification",
          },
          {
            number: "LM-2026-001931",
            instrumentCode: "WM-RJ-JPR-001931",
            note: "Re-verification of existing stamped instrument",
          },
        ];
        for (const a of anchors) {
          const instrument = instruments.find((x) => x.instrumentCode === a.instrumentCode);
          if (!instrument) continue;
          const org = orgs.find((o) => o._id === instrument.organizationId)!;
          const submittedAt = now - 6 * DAY;
          const existing = await ctx.db
            .query("applications")
            .withIndex("by_number", (q) => q.eq("applicationNumber", a.number))
            .unique();
          if (existing) continue;
          await ctx.db.insert("applications", {
            applicationNumber: a.number,
            type: a.number.endsWith("1842") ? "new" : "re_verification",
            organizationId: org._id,
            instrumentId: instrument._id,
            applicantName: org.contactPerson,
            contactPhone: org.phone,
            contactEmail: org.email,
            addressLine: org.addressLine,
            state: org.state,
            district: org.district,
            pincode: org.pincode,
            instrumentCategory: instrument.categoryName,
            instrumentType: instrument.instrumentType,
            manufacturer: instrument.manufacturer,
            model: instrument.model,
            serialNumber: instrument.serialNumber,
            capacity: instrument.capacity,
            accuracyClass: instrument.accuracyClass,
            locationOfInstrument: instrument.locationLabel,
            intendedUse: "Trade transactions and weighment of goods",
            previousCertificateNumber: a.number.endsWith("1931") ? "LM-RJ-2025-000412" : undefined,
            previousVerificationDate: a.number.endsWith("1931") ? now - 384 * DAY : undefined,
            status: "approved",
            priority: "high",
            submittedAt,
            reviewedAt: submittedAt + 2 * DAY,
            reviewedBy: "Department Administrator",
            statusHistory: [
              { status: "submitted", at: submittedAt, byName: org.contactPerson, byRole: "business", note: a.note },
              { status: "under_review", at: submittedAt + DAY, byName: "Department Administrator", byRole: "dept_admin" },
              { status: "approved", at: submittedAt + 2 * DAY, byName: "Department Administrator", byRole: "dept_admin", note: "Documents verified" },
            ],
            createdAt: submittedAt,
            updatedAt: submittedAt + 2 * DAY,
          });
        }
      }
      for (const status of slice) {
        const i = appIndexBase + n;
        n++;
        const instrument = pool[(i * 7 + 11) % pool.length];
        const org = orgs.find((o) => o._id === instrument.organizationId)!;
        const officer =
          officers.filter((o) => o.district === instrument.district)[0] ??
          officers[i % officers.length];
        const gatc = gatcs.filter((g) => g.district === instrument.district)[0];

        const submittedAt = now - Math.floor(rand() * 210 + 2) * DAY;
        const isOpen = [
          "submitted",
          "under_review",
          "documents_required",
          "approved",
        ].includes(status);
        const isScheduled = [
          "scheduled",
          "inspection_pending",
          "verification_in_progress",
        ].includes(status);

        const history: { status: string; at: number; byName: string; byRole?: string; note?: string }[] = [];
        if (status !== "draft") {
          history.push({
            status: "submitted",
            at: submittedAt,
            byName: org.contactPerson,
            byRole: "business",
            note: "Application submitted with supporting documents",
          });
        }
        if (["under_review", "documents_required", "approved", "scheduled", "inspection_pending", "verification_in_progress", "verified", "rejected"].includes(status)) {
          history.push({ status: "under_review", at: submittedAt + DAY, byName: "Department Administrator", byRole: "dept_admin" });
        }
        if (status === "documents_required") {
          history.push({ status: "documents_required", at: submittedAt + 2 * DAY, byName: "Department Administrator", byRole: "dept_admin", note: "Purchase invoice legible copy required" });
        }
        if (["approved", "scheduled", "inspection_pending", "verification_in_progress", "verified"].includes(status)) {
          history.push({ status: "approved", at: submittedAt + 2 * DAY, byName: "Department Administrator", byRole: "dept_admin", note: "Documents verified" });
        }
        if (["scheduled", "inspection_pending", "verification_in_progress", "verified"].includes(status)) {
          history.push({ status: "scheduled", at: submittedAt + 3 * DAY, byName: "Department Administrator", byRole: "dept_admin" });
        }
        if (["inspection_pending", "verification_in_progress", "verified"].includes(status)) {
          history.push({ status: "inspection_pending", at: submittedAt + 3 * DAY + 3600_000, byName: officer.name, byRole: "lmo", note: `Assigned to ${officer.designation} ${officer.name}` });
        }
        if (["verification_in_progress", "verified"].includes(status)) {
          history.push({ status: "verification_in_progress", at: submittedAt + 4 * DAY, byName: officer.name, byRole: "lmo" });
        }
        if (status === "verified") {
          history.push({ status: "verified", at: submittedAt + 4 * DAY + 5400_000, byName: officer.name, byRole: "lmo", note: "Result submitted — instrument verified" });
        }
        if (status === "rejected") {
          history.push({ status: "rejected", at: submittedAt + 3 * DAY, byName: "Department Administrator", byRole: "dept_admin", note: "Instrument not available at declared location" });
        }
        if (status === "cancelled") {
          history.push({ status: "cancelled", at: submittedAt + DAY, byName: org.contactPerson, byRole: "business", note: "Withdrawn by applicant" });
        }

        const scheduledAt = isScheduled
          ? submittedAt + 5 * DAY + Math.floor(rand() * 8) * 3600_000
          : status === "verified"
            ? submittedAt + 4 * DAY
            : undefined;

        await ctx.db.insert("applications", {
          applicationNumber: `LM-2026-${pad(1200 + i * 3 + idx, 6)}`,
          type: rand() < 0.32 ? "re_verification" : "new",
          organizationId: org._id,
          instrumentId: instrument._id,
          applicantName: org.contactPerson,
          contactPhone: org.phone,
          contactEmail: org.email,
          addressLine: org.addressLine,
          state: org.state,
          district: org.district,
          pincode: org.pincode,
          instrumentCategory: instrument.categoryName,
          instrumentType: instrument.instrumentType,
          manufacturer: instrument.manufacturer,
          model: instrument.model,
          serialNumber: instrument.serialNumber,
          capacity: instrument.capacity,
          accuracyClass: instrument.accuracyClass,
          locationOfInstrument: instrument.locationLabel,
          intendedUse:
            instrument.group === "weighing"
              ? "Trade transactions and weighment of goods"
              : "Measurement for trade and commercial transactions",
          previousCertificateNumber:
            rand() < 0.35 ? `LM-RJ-2025-${pad(800 + i, 6)}` : undefined,
          previousVerificationDate: rand() < 0.35 ? now - 420 * DAY : undefined,
          status: status as never,
          priority: rand() < 0.15 ? "high" : rand() < 0.97 ? "normal" : "urgent",
          submittedAt: status === "draft" ? undefined : submittedAt,
          assignedOfficerId: isScheduled || status === "verified" ? officer._id : undefined,
          assignedGatcId: gatc && rand() < 0.25 ? gatc._id : undefined,
          scheduledAt,
          reviewedAt: history.some((h) => h.status === "approved") ? submittedAt + 2 * DAY : undefined,
          reviewedBy: history.some((h) => h.status === "approved") ? "Department Administrator" : undefined,
          statusHistory: history,
          createdAt: status === "draft" ? now - Math.floor(rand() * 12) * DAY : submittedAt,
          updatedAt: now - Math.floor(rand() * 3) * DAY,
        });
      }
      await markStep(ctx, key, { applications: slice.length });
      return { ok: true };
    }

    if (step === "documents") {
      const apps = await ctx.db.query("applications").collect();
      const rand = rng(6143);
      const KINDS = [
        ["Previous certificate", "pdf", "application/pdf", "Business user"],
        ["Purchase invoice", "pdf", "application/pdf", "Business user"],
        ["Instrument photograph", "jpg", "image/jpeg", "Business user"],
        ["GST registration certificate", "pdf", "application/pdf", "Business user"],
        ["Inspection evidence", "jpg", "image/jpeg", "Legal Metrology Officer"],
      ];
      let inserted = 0;
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        const count = 2 + Math.floor(rand() * 2);
        for (let k = 0; k < count; k++) {
          const [name, ext, mime, by] = KINDS[(i + k) % KINDS.length];
          const isPhoto = mime === "image/jpeg";
          const status =
            app.status === "submitted" || app.status === "under_review"
              ? "pending"
              : app.status === "documents_required"
                ? k === 1
                  ? "rejected"
                  : "pending"
                : "verified";
          await ctx.db.insert("applicationDocuments", {
            applicationId: app._id,
            kind: name,
            fileName: `${name.toLowerCase().replace(/\s+/g, "-")}-${pad(1000 + i * 4 + k, 4)}.${ext}`,
            fileType: mime,
            sizeKb: 120 + Math.floor(rand() * 900),
            dataUrl: isPhoto
              ? makePhoto(name.toLowerCase().replace(/\s+/g, "-"), name.toUpperCase(), "#4a6b96")
              : undefined,
            uploadedBy: by,
            uploadedAt: (app.submittedAt ?? app.createdAt) + k * 3600_000,
            status,
          });
          inserted++;
        }
      }
      await markStep(ctx, key, { documents: inserted });
      return { ok: true };
    }

    if (step === "certificates") {
      const apps = await ctx.db.query("applications").collect();
      const verified = apps.filter((a) => a.status === "verified");
      const officers = await ctx.db.query("officers").collect();
      const rand = rng(8123);
      let seq = 1000;
      let certs = 0;

      for (const app of verified) {
        const officer =
          officers.filter((o) => o._id === app.assignedOfficerId)[0] ??
          officers[Math.floor(rand() * officers.length)];
        const stateCode = STATES.find((s) => s.name === app.state)?.code ?? "RJ";
        const verificationDate = app.submittedAt! + 4 * DAY + 5400_000;
        const roll = rand();
        let validUntil: number;
        let status: string;
        if (roll < 0.2) {
          validUntil = now - Math.floor(rand() * 150 + 10) * DAY; // expired
          status = "expired";
        } else if (roll < 0.4) {
          validUntil = now + Math.floor(rand() * 28 + 1) * DAY; // expiring soon
          status = "expiring_soon";
        } else if (roll < 0.46) {
          validUntil = now + Math.floor(rand() * 200 + 40) * DAY;
          status = "revoked";
        } else {
          validUntil = now + Math.floor(rand() * 300 + 35) * DAY;
          status = "valid";
        }
        seq += 1 + Math.floor(rand() * 3);
        const certificateNumber = `LM-${stateCode}-${new Date(verificationDate).getUTCFullYear()}-${pad(seq, 6)}`;

        const instrument = await ctx.db.get(app.instrumentId);
        const org = await ctx.db.get(app.organizationId);
        if (!instrument || !org) continue;

        const certificateId = await ctx.db.insert("certificates", {
          certificateNumber,
          verificationReference: `VRF-${app.district.slice(0, 3).toUpperCase()}-${pad(seq, 5)}`,
          applicationId: app._id,
          instrumentId: app.instrumentId,
          organizationId: app.organizationId,
          organizationName: org.name,
          ownerName: org.name,
          instrumentCode: instrument.instrumentCode,
          instrumentCategory: app.instrumentCategory,
          instrumentType: app.instrumentType,
          manufacturer: app.manufacturer,
          model: app.model,
          serialNumber: app.serialNumber,
          capacity: app.capacity,
          accuracyClass: app.accuracyClass,
          locationLabel: app.locationOfInstrument,
          state: app.state,
          district: app.district,
          verificationDate,
          validUntil,
          issuingAuthority: `${app.state} Legal Metrology Department`,
          officerId: officer?._id,
          officerName: officer?.name ?? "Legal Metrology Officer",
          result: "verified",
          status: status as never,
          createdAt: verificationDate,
        });
        certs++;

        const inspectionId = await ctx.db.insert("inspections", {
          applicationId: app._id,
          instrumentId: app.instrumentId,
          officerId: officer?._id,
          officerName: officer?.name ?? "Legal Metrology Officer",
          status: "synced",
          scheduledAt: verificationDate - 3600_000,
          startedAt: verificationDate - 3000_000,
          completedAt: verificationDate,
          gps: {
            lat: instrument.lat,
            lng: instrument.lng,
            accuracy: 6 + Math.floor(rand() * 14),
            capturedAt: verificationDate - 3000_000,
            label: `${instrument.locationLabel}, ${instrument.district}`,
          },
          photos: [
            { id: `ph-${certificateId}-1`, kind: "front", dataUrl: makePhoto("front", "INSTRUMENT — FRONT VIEW", "#3f5f8a"), capturedAt: verificationDate - 2800_000 },
            { id: `ph-${certificateId}-2`, kind: "serial", dataUrl: makePhoto("serial", "SERIAL NUMBER PLATE", "#546d8d"), capturedAt: verificationDate - 2700_000 },
            { id: `ph-${certificateId}-3`, kind: "display", dataUrl: makePhoto("display", "DISPLAY READING", "#3c6b6b"), capturedAt: verificationDate - 2600_000 },
          ],
          measurements: [0, 25, 50, 100].map((pct, k) => {
            const load = Math.max(1, Math.round((parseFloat(app.capacity) || 50) * (pct / 100)));
            const error = Number(((rand() - 0.45) * 2 * (parseFloat(app.capacity) || 50) * 0.001).toFixed(3));
            const permissible = Number(((parseFloat(app.capacity) || 50) * 0.001).toFixed(3));
            return {
              id: `m-${certificateId}-${k}`,
              testLoad: load,
              unit: "kg",
              observedReading: Number((load + error).toFixed(3)),
              error,
              permissibleError: permissible,
              result: (Math.abs(error) <= permissible ? "pass" : "fail") as "pass" | "fail",
            };
          }),
          observations: {
            physicalCondition: "Good",
            sealCondition: "Intact",
            displayCondition: "Clear and legible",
            accuracy: "Within permissible limits",
            stampingStatus: "Previous stamping present",
            tamperingIndicators: "None observed",
            complianceNotes: "Instrument found suitable for trade use.",
          },
          result: "verified",
          officerRemarks: "Verification completed successfully. Instrument complies with prescribed limits.",
          signatureName: officer?.name ?? "Legal Metrology Officer",
          signedAt: verificationDate,
          certificateId,
          capturedOffline: false,
          syncedAt: verificationDate,
          updatedAt: verificationDate,
        });

        await ctx.db.patch(certificateId, { inspectionId });
        await ctx.db.patch(instrument._id, {
          activeCertificateId: certificateId,
          lastVerificationAt: verificationDate,
          nextVerificationDue: validUntil,
          status: status === "expired" ? "verification_expired" : status === "expiring_soon" ? "verification_due" : "active",
        });
        await ctx.db.patch(app._id, { status: "verified" as never });
      }
      await markStep(ctx, key, { certificates: certs });
      return { ok: true };
    }

    if (step === "audit") {
      const apps = await ctx.db.query("applications").collect();
      const officers = await ctx.db.query("officers").collect();
      const rand = rng(2467);
      const sample = apps.slice(0, 40);
      const devices = [
        "Chrome 140 · Windows 11",
        "MetriQ Android PWA · Android 14",
        "Safari 18 · iPadOS 18",
        "Chrome 141 · Android 15",
      ];
      for (let i = 0; i < sample.length; i++) {
        const app = sample[i];
        const officer = officers[i % officers.length];
        const base = app.submittedAt ?? app.createdAt;
        const rows: { at: number; name: string; role: string; action: string; entity: string; detail: string }[] = [
          { at: base, name: app.applicantName, role: "business", action: "application.submitted", entity: "application", detail: `Application ${app.applicationNumber} submitted with supporting documents` },
          { at: base + DAY, name: "Department Administrator", role: "dept_admin", action: "application.reviewed", entity: "application", detail: "Documents verified and application approved" },
          { at: base + 3 * DAY, name: "Department Administrator", role: "dept_admin", action: "application.officer_assigned", entity: "application", detail: `Assigned to ${officer.name} (${officer.employeeCode})` },
        ];
        if (app.status === "verified") {
          rows.push(
            { at: base + 4 * DAY, name: officer.name, role: "lmo", action: "inspection.started", entity: "application", detail: "Field verification started at instrument location" },
            { at: base + 4 * DAY + 5400_000, name: officer.name, role: "lmo", action: "verification.result_submitted", entity: "application", detail: "Result VERIFIED — all test loads within permissible error" },
            { at: base + 4 * DAY + 5460_000, name: "MetriQ System", role: "system", action: "certificate.issued", entity: "application", detail: "Digital verification certificate generated" },
          );
        }
        for (const r of rows) {
          await ctx.db.insert("auditLogs", {
            at: r.at,
            actorName: r.name,
            actorRole: r.role,
            action: r.action,
            entityType: r.entity,
            entityId: String(app._id),
            recordLabel: app.applicationNumber,
            detail: r.detail,
            device: devices[i % devices.length],
          });
        }
      }
      await markStep(ctx, key, { auditLogs: sample.length * 3 });
      return { ok: true };
    }

    return { ok: true };
  },
});
