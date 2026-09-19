import { AppShell, LanguageToggle } from "@/components/app-shell";
import { DataRow, SectionHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { initials, deviceLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROLE_LABEL } from "@/lib/nav";
import { useMutation, useQuery } from "convex/react";
import { Loader2, LogOut, Save, ShieldCheck, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Profile() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.current);
  const updateProfile = useMutation(api.profiles.updateProfile);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefs, setPrefs] = useState({
    inApp: true,
    email: true,
    sms: false,
    expiryAlerts: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
    setPrefs(profile.notificationPrefs);
  }, [profile]);

  const role = profile?.role ?? "user";

  return (
    <AppShell
      title={t("nav.profile")}
      description="Account details, role, jurisdiction and notification preferences."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.profile") }]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
                {initials(profile?.name ?? profile?.email)}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-foreground">
                  {profile?.name ?? "Portal user"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABEL[role] ?? "Stakeholder"}
                </p>
                {profile?.employeeCode ? (
                  <p className="gov-id mt-0.5 text-xs text-muted-foreground">
                    {profile.employeeCode}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader title="Account details" icon={UserCog} />
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setSaving(true);
                try {
                  await updateProfile({ name, phone });
                  toast.success("Profile updated");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Update failed");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    className="mt-1.5"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Mobile number
                  </Label>
                  <Input
                    id="phone"
                    className="mt-1.5"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+91 98290 41100"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input className="mt-1.5" value={profile?.email ?? "—"} readOnly disabled />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email is managed by the sign-in provider and cannot be edited here.
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("label.language")}</Label>
                  <div className="mt-1.5">
                    <LanguageToggle />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies to navigation, forms, status labels and certificates.
                  </p>
                </div>
              </div>
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Save changes
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader
              title="Notification preferences"
              icon={ShieldCheck}
              description="Applies to application updates, scheduling and expiry reminders."
            />
            <div className="space-y-1">
              {[
                { key: "inApp" as const, label: "In-app notifications", hint: "Live in this prototype" },
                { key: "email" as const, label: "Email updates", hint: "Simulated — no email is sent" },
                { key: "sms" as const, label: "SMS alerts", hint: "Simulated — no SMS is sent" },
                { key: "expiryAlerts" as const, label: "Certificate expiry reminders", hint: "30 / 15 / 7 days before lapse" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <Switch
                    checked={prefs[item.key]}
                    onCheckedChange={(checked) =>
                      setPrefs((prev) => ({ ...prev, [item.key]: checked }))
                    }
                    aria-label={item.label}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={async () => {
                await updateProfile({ notificationPrefs: prefs });
                toast.success("Preferences saved");
              }}
            >
              Save preferences
            </Button>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Jurisdiction and access" icon={ShieldCheck} />
            <dl>
              <DataRow label="Role" value={ROLE_LABEL[role] ?? role} />
              <DataRow label="Employee / account code" value={profile?.employeeCode ?? "—"} mono />
              <DataRow label="Designation" value={profile?.designation ?? "—"} />
              <DataRow label="District" value={profile?.jurisdictionDistrict ?? "—"} />
              <DataRow label="State" value={profile?.jurisdictionState ?? "—"} />
              <DataRow
                label="Establishment"
                value={profile?.organization?.name ?? "Not linked"}
              />
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <SectionHeader title="Session" icon={UserCog} />
            <dl>
              <DataRow label="Device" value={deviceLabel()} />
              <DataRow label="Sign-in method" value="Prototype demo role" />
              <DataRow
                label="Language"
                value={profile?.language === "hi" ? "हिंदी" : "English"}
              />
            </dl>
            <Button
              variant="outline"
              className="mt-4 w-full gap-2"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t("action.signOut")}
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs leading-5 text-muted-foreground">
              This is a prototype account in a demonstration environment. Role switching is
              available from the sign-in screen so the complete workflow can be shown to
              reviewers.
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
