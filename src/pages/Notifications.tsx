import { AppShell } from "@/components/app-shell";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  Info,
  Mail,
  MessageSquare,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const TYPE_META: Record<string, { icon: typeof Bell; label: string }> = {
  application: { icon: ClipboardCheck, label: "Application" },
  scheduling: { icon: CalendarClock, label: "Scheduling" },
  verification: { icon: ScanLine, label: "Verification" },
  certificate: { icon: BadgeCheck, label: "Certificate" },
  expiry: { icon: TriangleAlert, label: "Expiry" },
  system: { icon: Info, label: "System" },
};

export default function Notifications() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const rows = useQuery(api.notifications.list, { limit: 60 });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unread = rows?.filter((n) => !n.read).length ?? 0;

  return (
    <AppShell
      title={t("nav.notifications")}
      description="Application status, scheduling, verification and expiry alerts."
      breadcrumb={[{ label: t("nav.dashboard"), to: "/dashboard" }, { label: t("nav.notifications") }]}
      actions={
        <Button
          variant="outline"
          className="gap-2"
          disabled={unread === 0}
          onClick={async () => {
            await markAllRead({});
            toast.success("All notifications marked as read");
          }}
        >
          <CheckCheck className="size-4" aria-hidden="true" />
          {t("action.markAllRead")}
        </Button>
      }
    >
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Unread" value={unread} icon={Bell} tone="primary" emphasis />
        <StatCard label="Total" value={rows?.length ?? "—"} icon={Info} />
        <StatCard
          label="Expiry alerts"
          value={rows?.filter((n) => n.type === "expiry").length ?? "—"}
          icon={TriangleAlert}
          tone="caution"
        />
      </section>

      <SectionHeader
        title="Notification centre"
        description="Outbound email and SMS delivery is simulated in this prototype; in-app delivery is live."
        icon={Bell}
      />

      {rows === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          body="Alerts about applications, scheduling, verification and certificate expiry will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((notification) => {
            const meta = TYPE_META[notification.type] ?? TYPE_META.system;
            return (
              <li
                key={notification._id}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-colors",
                  notification.read ? "border-border" : "border-primary/30 bg-primary/3",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                      notification.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    <meta.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {lang === "hi" && notification.titleHi
                          ? notification.titleHi
                          : notification.title}
                      </p>
                      {!notification.read ? (
                        <span className="rounded-full bg-[var(--saffron)] px-2 py-0.5 text-[10px] font-bold text-[var(--saffron-foreground)] uppercase">
                          New
                        </span>
                      ) : null}
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {lang === "hi" && notification.bodyHi
                        ? notification.bodyHi
                        : notification.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span>{formatRelative(notification.createdAt)}</span>
                      {notification.channelStates ? (
                        <>
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="size-3.5" aria-hidden="true" />
                            email: {notification.channelStates.email.replace(/_/g, " ")}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MessageSquare className="size-3.5" aria-hidden="true" />
                            sms: {notification.channelStates.sms.replace(/_/g, " ")}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {notification.link ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!notification.read) await markRead({ id: notification._id });
                          navigate(notification.link!);
                        }}
                      >
                        Open
                      </Button>
                    ) : null}
                    {!notification.read ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markRead({ id: notification._id })}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
