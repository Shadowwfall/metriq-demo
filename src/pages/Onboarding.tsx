import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, CheckCircle2, Loader2, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const ORG_KINDS = [
  "Retailer",
  "Manufacturer",
  "Trader",
  "Weighbridge operator",
  "Industrial establishment",
  "Individual instrument owner",
];

const DISTRICT_FALLBACKS = [
  "Jaipur",
  "Jodhpur",
  "Udaipur",
  "Kota",
  "Ajmer",
  "New Delhi",
  "Mumbai",
  "Pune",
  "Bengaluru Urban",
  "Ahmedabad",
  "Lucknow",
];

/**
 * One-time workspace setup for accounts that signed in with their own email
 * (email OTP). Registers the business establishment and unlocks the full
 * instrument → application → certificate workflow.
 */
export default function Onboarding() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const states = useQuery(api.masterData.states, {});
  const createOrg = useMutation(api.organizations.create);

  const [form, setForm] = useState({
    name: "",
    kind: "Retailer",
    contactPerson: "",
    phone: "",
    gstin: "",
    addressLine: "",
    state: "",
    district: "",
    pincode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the account once the profile arrives.
  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      contactPerson: prev.contactPerson || profile.name || user?.name || "",
      phone: prev.phone || profile.phone || "",
    }));
  }, [profile, user?.name]);

  const districts = useQuery(
    api.masterData.districts,
    form.state ? { state: form.state } : "skip",
  );
  const districtOptions = districts?.length
    ? districts.map((d) => d.name)
    : form.state
      ? DISTRICT_FALLBACKS
      : [];

  // A workspace already exists (or the account has a role) — nothing to onboard.
  useEffect(() => {
    if (profile && (profile.role !== "user" || profile.organization)) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createOrg({
        name: form.name,
        contactPerson: form.contactPerson,
        phone: form.phone,
        kind: form.kind,
        gstin: form.gstin.trim() ? form.gstin.trim() : undefined,
        addressLine: form.addressLine,
        state: form.state,
        district: form.district,
        pincode: form.pincode,
      });
      toast.success("Workspace created — welcome to MetriQ");
      navigate("/dashboard", { replace: true });
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Could not create the workspace";
      setError(message.replace(/^.*?:\s*/, ""));
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Set up your workspace"
      description="Register your business establishment to start using MetriQ."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: "Setup" }]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit}
          className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Business registration
              </h2>
              <p className="text-xs text-muted-foreground">
                These details identify your establishment on applications and certificates.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="org-name">Establishment name</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Sharma General Store"
                className="mt-1.5"
                required
                maxLength={120}
              />
            </div>

            <div>
              <Label htmlFor="org-kind">Type of establishment</Label>
              <Select value={form.kind} onValueChange={(v) => update("kind", v)}>
                <SelectTrigger id="org-kind" className="mt-1.5 w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="org-contact">Contact person</Label>
              <Input
                id="org-contact"
                value={form.contactPerson}
                onChange={(e) => update("contactPerson", e.target.value)}
                placeholder="Full name"
                className="mt-1.5"
                required
                maxLength={80}
              />
            </div>

            <div>
              <Label htmlFor="org-phone">Phone</Label>
              <Input
                id="org-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+91 98290 12345"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="org-gstin">
                GSTIN <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="org-gstin"
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                placeholder="08ABCDE1234F1Z5"
                className="mt-1.5 gov-id"
                maxLength={15}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="org-address">Registered address</Label>
              <Input
                id="org-address"
                value={form.addressLine}
                onChange={(e) => update("addressLine", e.target.value)}
                placeholder="Shop / building, street, locality"
                className="mt-1.5"
                required
                maxLength={240}
              />
            </div>

            <div>
              <Label htmlFor="org-state">State</Label>
              <Select
                value={form.state}
                onValueChange={(v) => {
                  update("state", v);
                  update("district", "");
                }}
              >
                <SelectTrigger id="org-state" className="mt-1.5 w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {(states ?? []).map((s) => (
                    <SelectItem key={s.code} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="org-district">District</Label>
              <Select
                value={form.district}
                onValueChange={(v) => update("district", v)}
                disabled={!form.state}
              >
                <SelectTrigger id="org-district" className="mt-1.5 w-full">
                  <SelectValue
                    placeholder={form.state ? "Select district" : "Select a state first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="org-pincode">PIN code</Label>
              <Input
                id="org-pincode"
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="302001"
                className="mt-1.5"
                required
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
              Create workspace
            </Button>
            <p className="text-xs text-muted-foreground">
              You can update these details later from your profile.
            </p>
          </div>
        </form>

        <aside className="rounded-xl border border-border bg-muted/40 p-5">
          <h3 className="font-display text-sm font-semibold text-foreground">
            What happens next
          </h3>
          <ol className="mt-4 space-y-4">
            {[
              {
                title: "Register your instruments",
                body: "Add each weighing or measuring instrument with its serial number and capacity.",
              },
              {
                title: "Apply for verification",
                body: "Submit an application with supporting documents — fully online.",
              },
              {
                title: "Inspection & certificate",
                body: "A Legal Metrology Officer verifies on site, and a QR-verifiable digital certificate is issued.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="gov-id flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-card p-3">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-[var(--verify)]"
              aria-hidden="true"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Creating a workspace signs you up as a business / instrument owner. Department
              roles are assigned by the administration.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
