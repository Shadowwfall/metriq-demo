import { BrandMark, LanguageToggle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAppSeed } from "@/hooks/use-seed";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  ClipboardCheck,
  Database,
  FilePlus2,
  Gauge,
  Landmark,
  LineChart,
  Lock,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

const HOW_IT_WORKS = [
  { title: "Register your instruments", body: "Add each weighing or measuring instrument with its manufacturer, model, serial number and capacity.", icon: FilePlus2 },
  { title: "Apply for verification", body: "Submit a new or re-verification application and attach the supporting documents.", icon: ClipboardCheck },
  { title: "Inspection scheduled for you", body: "The department reviews your documents, assigns a Legal Metrology Officer and books an appointment.", icon: MapPin },
  { title: "On-site verification", body: "The officer records GPS location, photographs, test loads and observations at your premises.", icon: ScanLine },
  { title: "Receive your certificate", body: "Once the result is approved, a digital certificate with a scannable QR code is issued to your account.", icon: BadgeCheck },
  { title: "Prove it anytime", body: "Customers and inspectors confirm the certificate in seconds by scanning the QR or entering its ID.", icon: QrCode },
];

const FEATURES = [
  { title: "Fully online verification", body: "One workflow from application to approved result — no paper forms, no office visits.", icon: ClipboardCheck },
  { title: "Digital certificates", body: "Each certificate carries a unique number and verification reference.", icon: BadgeCheck },
  { title: "QR authentication", body: "Any customer or inspector can scan the QR code and confirm validity instantly.", icon: QrCode },
  { title: "Works in the field", body: "Officers verify on mobile, even where connectivity is poor — records sync later.", icon: ScanLine },
  { title: "Expiry reminders", body: "Notifications arrive ahead of stamping validity lapses, so you never fall out of compliance.", icon: BellRing },
  { title: "One central registry", body: "All of your instruments, applications and certificates live in a single searchable record.", icon: Database },
  { title: "Compliance analytics", body: "District, state and category level monitoring for departments.", icon: LineChart },
  { title: "Secure access", body: "Role-based permissions and an append-only activity record on every action.", icon: Lock },
];

const STAKEHOLDERS = [
  { title: "Businesses and instrument owners", body: "Register instruments, track every application and keep all certificates in one place.", icon: Store },
  { title: "Legal Metrology Officers", body: "A clear daily schedule and a mobile workflow for on-site verification.", icon: ShieldCheck },
  { title: "Government Approved Test Centres", body: "Receive referrals and record test parameters and outcomes.", icon: Gauge },
  { title: "State departments", body: "Review applications, assign officers and monitor pendency across districts.", icon: Landmark },
  { title: "Ministry", body: "National oversight of verification volumes and compliance trends.", icon: Users },
  { title: "Customers and the public", body: "Verify any certificate instantly — no account required.", icon: Building2 },
];

function VerifyBox({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        navigate(`/verify/${encodeURIComponent(value.trim())}`);
      }}
      className={cn("w-full", compact ? "max-w-xl" : "max-w-2xl")}
    >
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row">
        <div className="relative flex-1">
          <QrCode
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("verify.placeholder")}
            aria-label={t("verify.placeholder")}
            className="h-11 border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" size="lg" className="h-11 gap-2">
          {t("action.verify")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 gap-2"
          onClick={() => navigate("/verify?scan=1")}
        >
          <ScanLine className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("verify.scanQr")}</span>
          <span className="sm:hidden">QR</span>
        </Button>
      </div>
    </form>
  );
}

export default function Landing() {
  const { t, lang } = useI18n();
  const { isAuthenticated } = useAuth();
  const totals = useQuery(api.verify.totals);
  useAppSeed();

  return (
    <div className="min-h-screen bg-background">
      {/* Public header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <BrandMark />
          <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--saffron)_45%,transparent)] bg-[color-mix(in_oklab,var(--saffron)_10%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[color-mix(in_oklab,var(--saffron)_68%,black)] md:inline-flex">
            Prototype
          </span>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              to="/verify"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
            >
              {t("verify.title")}
            </Link>
            <LanguageToggle className="hidden sm:inline-flex" />
            {isAuthenticated ? (
              <Button asChild className="gap-2">
                <Link to="/dashboard">
                  {t("nav.dashboard")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="gap-2">
                <Link to="/auth">{t("action.signIn")}</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-muted/30">
        <div className="grid-backdrop absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 lg:px-8 lg:pt-20 lg:pb-24">
          <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Landmark className="size-3.5 text-[var(--saffron)]" aria-hidden="true" />
                Legal Metrology · Digital Public Infrastructure
              </p>
              <h1 className="mt-5 font-display text-3xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Digital Verification for a Trusted Measurement Ecosystem
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                A unified platform for registration, verification, certification and
                lifecycle management of weighing and measuring instruments.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/verify">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Verify a Certificate
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to="/auth">
                    Login to Portal
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
                {[
                  { label: "Instruments tracked", value: "120+" },
                  { label: "Certificates issued", value: totals ? String(totals.issued) : "—" },
                  { label: "States covered", value: "6" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
          </div>
        </div>
      </section>

      {/* Verify banner */}
      <section className="border-b border-border bg-primary">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="font-display text-xl font-bold text-primary-foreground">
              Public Certificate Search
            </h2>
            <p className="mt-1 max-w-xl text-sm text-primary-foreground/70">
              Confirm that a weighing or measuring instrument currently holds a valid
              verification certificate.
            </p>
          </div>
          <div className="w-full lg:max-w-xl">
            <VerifyBox compact />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="How it works"
          title="From registration to a verifiable certificate, in six steps"
          body="MetriQ replaces manual paperwork with a single digital trail — you always know which stage your application is at."
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li
              key={step.title}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="gov-id text-xs text-muted-foreground">
                  STEP {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Platform features"
          title="Built like digital public infrastructure"
          body="Every capability is designed for verification integrity, transparency and auditability — for your records and for the public's trust."
        />
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-card p-5">
                <feature.icon className="size-5 text-[var(--saffron)]" aria-hidden="true" />
                <h3 className="mt-3 font-display text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Stakeholders"
          title="One ecosystem, six participants"
          body="Each participant gets a purpose-built workspace with permissions scoped to their role."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAKEHOLDERS.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer + CTA */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-xl font-bold text-foreground">
                  See the complete journey for yourself
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sign in with a demo role and follow an application from instrument
                  registration through on-site verification to a publicly verifiable
                  certificate.
                </p>
              </div>
              <Button asChild size="lg" className="gap-2 self-start">
                <Link to="/auth">
                  Login to Portal
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div className="mt-7 rounded-lg border border-[color-mix(in_oklab,var(--caution)_35%,transparent)] bg-[color-mix(in_oklab,var(--caution)_8%,transparent)] p-4">
              <p className="text-sm font-semibold text-foreground">
                {lang === "hi" ? t("notice.prototype") : t("notice.prototype")}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                MetriQ is a hackathon prototype inspired by the conceptual requirements of
                the Legal Metrology Act, 2009 and the Legal Metrology (General) Rules,
                2011. It is not an official Government of India service, contains no real
                personal data, and all integrations (DigiLocker, SMS, payments) are
                simulated for demonstration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-3 text-xs text-muted-foreground">{t("app.tagline")}</p>
          </div>
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            Prototype for demonstration purposes · Department of Consumer Affairs,
            Ministry of Consumer Affairs, Food &amp; Public Distribution — conceptual
            reference only.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold tracking-[0.16em] text-[color-mix(in_oklab,var(--saffron)_70%,black)] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
