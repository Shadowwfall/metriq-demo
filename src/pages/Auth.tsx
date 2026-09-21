import { BrandMark, LanguageToggle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAppSeed } from "@/hooks/use-seed";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Gauge,
  Landmark,
  Loader2,
  Mail,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

type DemoRole = "business" | "lmo" | "gatc" | "dept_admin" | "ministry";

const DEMO_ROLES: {
  role: DemoRole;
  name: string;
  email: string;
  title: string;
  body: string;
  icon: typeof Store;
}[] = [
  {
    role: "business",
    name: "Business Demo",
    email: "business@demo.gov.in",
    title: "Business / instrument owner",
    body: "Register instruments, submit applications and download certificates.",
    icon: Store,
  },
  {
    role: "lmo",
    name: "LMO Demo",
    email: "lmo@demo.gov.in",
    title: "Legal Metrology Officer",
    body: "Today's schedule, mobile field verification, measurements and results.",
    icon: ShieldCheck,
  },
  {
    role: "gatc",
    name: "GATC Demo",
    email: "gatc@demo.gov.in",
    title: "Government Approved Test Centre",
    body: "Referral requests and recorded test outcomes.",
    icon: Gauge,
  },
  {
    role: "dept_admin",
    name: "Department Admin",
    email: "admin@demo.gov.in",
    title: "Department Administrator",
    body: "Review applications, assign officers and schedule inspections.",
    icon: Landmark,
  },
  {
    role: "ministry",
    name: "Ministry Admin",
    email: "ministry@demo.gov.in",
    title: "Ministry Administrator",
    body: "National monitoring, analytics and reports.",
    icon: Users,
  },
];

function resolveRedirect(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const claimRole = useMutation(api.demo.claimDemoRole);
  useAppSeed();

  const redirect = resolveRedirect(searchParams.get("returnTo"), redirectAfterAuth);

  const [mode, setMode] = useState<"roles" | "email">("roles");
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null);
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once the guest session exists, attach the selected demo workspace.
  useEffect(() => {
    if (!isAuthenticated || !pendingRole) return;
    let cancelled = false;
    (async () => {
      try {
        // Pass the browser's UTC offset so demo appointments land at local times.
        await claimRole({
          role: pendingRole,
          utcOffsetMinutes: -new Date().getTimezoneOffset(),
        });
      } catch (claimError) {
        console.warn("[MetriQ] demo workspace claim failed", claimError);
      }
      if (!cancelled) {
        setPendingRole(null);
        navigate(redirect, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, pendingRole, claimRole, navigate, redirect]);

  // Already signed in and no role handshake in flight.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !pendingRole) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, pendingRole, navigate, redirect]);

  const startDemo = async (role: DemoRole) => {
    setError(null);
    setPendingRole(role);
    try {
      await signIn("anonymous");
    } catch (demoError) {
      console.error(demoError);
      setPendingRole(null);
      setError("Could not start the demo session. Please try again.");
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
    } catch (emailError) {
      setError(
        emailError instanceof Error
          ? emailError.message
          : "Failed to send the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect, { replace: true });
    } catch {
      setError("The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="grid-backdrop absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* Context panel */}
        <div className="hidden flex-col justify-between border-r border-border p-10 lg:flex">
          <BrandMark />
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[color-mix(in_oklab,var(--saffron)_70%,black)] uppercase">
              Prototype access
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold text-foreground">
              MetriQ — Online Verification System for Weighing and Measuring Instruments
            </h1>              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                Sign in with your email to register your instruments, apply for
                verification and download certificates your customers can check with a
                single scan — you will set up your business workspace on first sign-in.
                Prefer to explore first? Choose a demo role with fictional records.
              </p>
            <ul className="mt-8 space-y-3">
              {[
                "Real role-scoped navigation and permissions",
                "Instrument registry, applications and certificates",
                "Mobile-first field verification with offline drafts",
                "Public QR certificate verification",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-[var(--verify)]"
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            {t("notice.prototype")}
          </p>
        </div>

        {/* Auth column */}
        <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <BrandMark />
            <LanguageToggle />
          </div>

          {mode === "roles" ? (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Login to Portal</CardTitle>
                <CardDescription>
                  Select a demo role to open its workspace. No password required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {DEMO_ROLES.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    disabled={loading || pendingRole !== null}
                    onClick={() => startDemo(item.role)}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors",
                      "hover:border-primary/40 hover:bg-accent focus-visible:border-primary focus-visible:outline-none",
                      "disabled:opacity-60",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.email}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                    {pendingRole === item.role ? (
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <ArrowRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}

                {error ? (
                  <p role="alert" className="pt-1 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <div className="pt-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[11px] tracking-wide uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        or use an email
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full gap-2"
                    onClick={() => setMode("email")}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    Sign in with email OTP
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              {step === "signIn" ? (
                <>
                  <CardHeader>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mb-2 w-fit gap-1.5 px-0 text-muted-foreground"
                      onClick={() => {
                        setMode("roles");
                        setError(null);
                      }}
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                      Demo roles
                    </Button>
                    <CardTitle className="font-display text-xl">
                      Sign in with email
                    </CardTitle>
                    <CardDescription>
                      We will email a six digit verification code to this address. New
                      here? Verifying the code creates your account.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleEmailSubmit}>
                    <CardContent className="space-y-3">
                      <div className="relative">
                        <Mail
                          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          name="email"
                          type="email"
                          required
                          placeholder="name@department.gov.in"
                          className="h-11 pl-9"
                          disabled={loading}
                          aria-label="Email address"
                        />
                      </div>
                      {error ? (
                        <p role="alert" className="text-sm text-destructive">
                          {error}
                        </p>
                      ) : null}
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="size-4" />
                        )}
                        Send verification code
                      </Button>
                    </CardContent>
                  </form>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Check your email</CardTitle>
                    <CardDescription>
                      Enter the code sent to {step.email}
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleOtpSubmit}>
                    <CardContent className="space-y-4">
                      <input type="hidden" name="email" value={step.email} />
                      <input type="hidden" name="code" value={otp} />
                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={loading}
                          aria-label="Verification code"
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {error ? (
                        <p role="alert" className="text-center text-sm text-destructive">
                          {error}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={loading || otp.length !== 6}
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Verify code
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setStep("signIn")}
                        disabled={loading}
                      >
                        Use a different email
                      </Button>
                    </CardContent>
                  </form>
                </>
              )}
            </Card>
          )}

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">
              <Building2 className="mr-1 inline size-3.5" aria-hidden="true" />
              Demo accounts are fictional and use only seeded prototype data.
            </p>
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
