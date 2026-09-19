import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router";
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
      return <BusinessDashboard />;
    case "dept_admin":
    case "admin":
    case "ministry":
      return <AdminDashboard />;
    case "gatc":
      return <GatcDashboard />;
    default:
      return <FallbackHome />;
  }
}

function FallbackHome() {
  return (
    <AppShell title="Workspace" breadcrumb={[{ label: "Dashboard" }]}>
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-lg font-bold text-foreground">
          Choose a role to continue
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This account has not been attached to a workspace yet. Sign in again and pick a
          demo role, or contact the department administrator to be assigned a role.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/auth">Choose a demo role</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/verify">Verify a certificate</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
