import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { I18nProvider } from "@/lib/i18n";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const DashboardRouter = lazy(() => import("./pages/DashboardRouter.tsx"));
const Verify = lazy(() => import("./pages/Verify.tsx"));
const Assignments = lazy(() => import("./pages/lmo/Assignments.tsx"));
const Schedule = lazy(() => import("./pages/lmo/Schedule.tsx"));
const FieldList = lazy(() => import("./pages/lmo/FieldList.tsx"));
const FieldVerification = lazy(() => import("./pages/FieldVerification.tsx"));
const Instruments = lazy(() => import("./pages/Instruments.tsx"));
const InstrumentDetail = lazy(() => import("./pages/InstrumentDetail.tsx"));
const RegisterInstrument = lazy(() => import("./pages/RegisterInstrument.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Applications = lazy(() => import("./pages/Applications.tsx"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail.tsx"));
const NewApplication = lazy(() => import("./pages/NewApplication.tsx"));
const Certificates = lazy(() => import("./pages/Certificates.tsx"));
const CertificateDetail = lazy(() => import("./pages/CertificateDetail.tsx"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const AuditLog = lazy(() => import("./pages/AuditLog.tsx"));
const NotificationsPage = lazy(() => import("./pages/Notifications.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <I18nProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/:id" element={<Verify />} />

                {/* Authenticated workspace */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <DashboardRouter />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/onboarding"
                  element={
                    <RequireAuth>
                      <Onboarding />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/assignments"
                  element={
                    <RequireAuth>
                      <Assignments />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/schedule"
                  element={
                    <RequireAuth>
                      <Schedule />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/field"
                  element={
                    <RequireAuth>
                      <FieldList />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/field/:applicationId"
                  element={
                    <RequireAuth>
                      <FieldVerification />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/instruments"
                  element={
                    <RequireAuth>
                      <Instruments />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/instruments/new"
                  element={
                    <RequireAuth>
                      <RegisterInstrument />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/instruments/:instrumentId"
                  element={
                    <RequireAuth>
                      <InstrumentDetail />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/applications"
                  element={
                    <RequireAuth>
                      <Applications />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/applications/new"
                  element={
                    <RequireAuth>
                      <NewApplication />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/applications/:applicationId"
                  element={
                    <RequireAuth>
                      <ApplicationDetail />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/certificates"
                  element={
                    <RequireAuth>
                      <Certificates />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/certificates/:certificateId"
                  element={
                    <RequireAuth>
                      <CertificateDetail />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/reports"
                  element={
                    <RequireAuth>
                      <Reports />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/audit"
                  element={
                    <RequireAuth>
                      <AuditLog />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/notifications"
                  element={
                    <RequireAuth>
                      <NotificationsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/profile"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </I18nProvider>
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
