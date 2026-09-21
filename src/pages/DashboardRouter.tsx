import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, Store } from "lucide-react";
import { Link, Navigate } from "react-router";
import AdminDashboard from "./admin/AdminDashboard";
import BusinessDashboard from "./business/BusinessDashboard";
import GatcDashboard from "./gatc/GatcDashboard";
import LmoDashboard from "./lmo/LmoDashboard";

export default function DashboardRouter() {
  const profile = useQuery(api.profiles.current);

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  switch (profile?.role) {
    case "lmo":
      return <LmoDashboard />;
    case "business":
      // A business role without an organisation (e.g. demo role on a shared
      // account) routes to workspace setup instead of an empty dashboard.
      return profile.organization ? <BusinessDashboard /> : <Navigate to="/dashboard/onboarding" replace />;
    case "dept_admin":
    case "admin":
    case "ministry":
      return <AdminDashboard />;
    case "gatc":
      return <GatcDashboard />;
    case "user":
    case "member":
      // Fresh email-OTP accounts: one-time workspace registration unlocks the
      // instrument → application → certificate workflow.
      return <Navigate to="/dashboard/onboarding" replace />;
    default:
      return <FallbackHome />;
  }
}

function FallbackHome() {
  return (
    <AppShell title="Workspace" breadcrumb={[{ label: "Dashboard" }]}>
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-lg font-bold text-foreground">
          Choose how to continue
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This account is not attached to a workspace yet. Register your business
          establishment to use the portal as an instrument owner, or explore a
          pre-populated demo workspace.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link to="/dashboard/onboarding">
              <Store className="size-4" aria-hidden="true" />
              Register your business
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth">Choose a demo role</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/verify">Verify a certificate</Link>
          </Button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-base font-bold text-foreground">
          Verify a certificate without signing in
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Anyone can confirm a certificate by scanning its QR code or entering its ID on
          the public verification page.
        </p>
        <Button asChild variant="outline" className="mt-4 gap-2">
          <Link to="/verify">Open public verification</Link>
        </Button>
      </div>
    </AppShell>
  );
}
