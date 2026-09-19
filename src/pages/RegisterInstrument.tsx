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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function RegisterInstrument() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const categories = useQuery(api.masterData.categories, {});
  const register = useMutation(api.instruments.register);

  const [categoryId, setCategoryId] = useState("");
  const [form, setForm] = useState({
    instrumentType: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    capacity: "",
    accuracyClass: "Class III",
    locationLabel: "",
    addressLine: "",
    district: "",
    state: "",
    pincode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; instrumentCode: string } | null>(null);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const org = profile?.organization;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Select an instrument category.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        categoryId: categoryId as Id<"instrumentCategories">,
        instrumentType: form.instrumentType,
        manufacturer: form.manufacturer,
        model: form.model,
        serialNumber: form.serialNumber,
        capacity: form.capacity,
        accuracyClass: form.accuracyClass,
        locationLabel: form.locationLabel,
        addressLine: form.addressLine || org?.addressLine || "",
        state: form.state || org?.state || "",
        district: form.district || org?.district || "",
        pincode: form.pincode || org?.pincode || "",
      });
      setCreated(result);
      toast.success(`Instrument ${result.instrumentCode} registered`);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Registration failed";
      setError(message.replace(/^.*:\s*/, ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <AppShell
        title={t("action.registerInstrument")}
        breadcrumb={[
          { label: t("nav.dashboard"), to: "/dashboard" },
          { label: t("nav.instruments"), to: "/dashboard/instruments" },
          { label: "Register" },
        ]}
      >
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--verify)_14%,transparent)] text-[color-mix(in_oklab,var(--verify)_70%,black)]">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-lg font-bold">Instrument registered</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The instrument has been added to the central registry with identifier{" "}
            <span className="gov-id font-semibold text-foreground">{created.instrumentCode}</span>.
            Submit a verification application to have it inspected and certified.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              className="gap-2"
              onClick={() =>
                navigate(`/dashboard/applications/new?instrument=${created.id}`)
              }
            >
              Apply for verification
            </Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/instruments/${created.id}`)}>
              View instrument
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard/instruments")}>
              Back to registry
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={t("action.registerInstrument")}
      description="Register a weighing or measuring instrument in the central registry."
      breadcrumb={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.instruments"), to: "/dashboard/instruments" },
        { label: "Register" },
      ]}
      actions={
        <Button asChild variant="ghost" className="gap-1.5">
          <Link to="/dashboard/instruments">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to registry
          </Link>
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/8 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">
            Instrument classification
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instrument category" required>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name} ({category.group})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Instrument type as marked" hint="Optional — defaults to the category">
              <Input
                className="mt-1.5"
                value={form.instrumentType}
                onChange={(e) => update("instrumentType", e.target.value)}
                placeholder="Electronic Platform Scale"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">
            Manufacturer details
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Manufacturer" required>
              <Input
                className="mt-1.5"
                required
                value={form.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
                placeholder="Avery India"
              />
            </Field>
            <Field label="Model" required>
              <Input
                className="mt-1.5"
                required
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="AX-425"
              />
            </Field>
            <Field label="Serial number" required hint="Must be unique in the registry">
              <Input
                className="mt-1.5"
                required
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
                placeholder="SN00482310"
              />
            </Field>
            <Field label="Capacity / range" required>
              <Input
                className="mt-1.5"
                required
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                placeholder="500 kg"
              />
            </Field>
            <Field label="Accuracy class">
              <Select
                value={form.accuracyClass}
                onValueChange={(value) => update("accuracyClass", value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Class I", "Class II", "Class III", "Class IIII"].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 font-display text-sm font-semibold">
            Installation location
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location within premises" required>
              <Input
                className="mt-1.5"
                required
                value={form.locationLabel}
                onChange={(e) => update("locationLabel", e.target.value)}
                placeholder="Weighing bay, Main Godown"
              />
            </Field>
            <Field label="Address" hint={`Defaults to ${org?.addressLine ?? "establishment address"}`}>
              <Input
                className="mt-1.5"
                value={form.addressLine}
                onChange={(e) => update("addressLine", e.target.value)}
                placeholder={org?.addressLine}
              />
            </Field>
            <Field label="District" hint={`Defaults to ${org?.district ?? "establishment district"}`}>
              <Input
                className="mt-1.5"
                value={form.district}
                onChange={(e) => update("district", e.target.value)}
                placeholder={org?.district}
              />
            </Field>
            <Field label="State" hint={`Defaults to ${org?.state ?? "establishment state"}`}>
              <Input
                className="mt-1.5"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                placeholder={org?.state}
              />
            </Field>
            <Field label="Pincode">
              <Input
                className="mt-1.5"
                value={form.pincode}
                onChange={(e) => update("pincode", e.target.value)}
                placeholder={org?.pincode}
              />
            </Field>
          </div>
          <p className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            An inspector will verify these details on site. The registered location is used
            as the reference point when the officer captures GPS coordinates during
            verification.
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Register instrument
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/instruments")}>
            {t("action.cancel")}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
