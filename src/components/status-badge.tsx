import { useI18n, statusKey } from "@/lib/i18n";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileClock,
  Loader2,
  MinusCircle,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "verified" | "progress" | "caution" | "danger" | "neutral";

const STATUS_MAP: Record<string, { tone: Tone; icon: LucideIcon }> = {
  verified: { tone: "verified", icon: CheckCircle2 },
  valid: { tone: "verified", icon: CheckCircle2 },
  active: { tone: "verified", icon: CheckCircle2 },
  synced: { tone: "verified", icon: CheckCircle2 },
  approved: { tone: "progress", icon: CheckCircle2 },
  scheduled: { tone: "progress", icon: Clock },
  inspection_pending: { tone: "progress", icon: Clock },
  submitted: { tone: "progress", icon: FileClock },
  under_review: { tone: "progress", icon: FileClock },
  verification_in_progress: { tone: "progress", icon: Loader2 },
  in_progress: { tone: "progress", icon: Loader2 },
  under_verification: { tone: "progress", icon: Loader2 },
  documents_required: { tone: "caution", icon: AlertTriangle },
  verification_due: { tone: "caution", icon: AlertTriangle },
  expiring_soon: { tone: "caution", icon: AlertTriangle },
  draft: { tone: "neutral", icon: MinusCircle },
  cancelled: { tone: "neutral", icon: Ban },
  rejected: { tone: "danger", icon: Ban },
  revoked: { tone: "danger", icon: ShieldAlert },
  expired: { tone: "danger", icon: ShieldAlert },
  verification_expired: { tone: "danger", icon: ShieldAlert },
  suspended: { tone: "danger", icon: Ban },
  not_found: { tone: "danger", icon: ShieldAlert },
};

const TONE_CLASS: Record<Tone, string> = {
  verified:
    "bg-[color-mix(in_oklab,var(--verify)_14%,transparent)] text-[color-mix(in_oklab,var(--verify)_72%,black)] border-[color-mix(in_oklab,var(--verify)_38%,transparent)] dark:text-[color-mix(in_oklab,var(--verify)_88%,white)]",
  progress: "bg-primary/10 text-primary border-primary/25 dark:text-primary",
  caution:
    "bg-[color-mix(in_oklab,var(--caution)_16%,transparent)] text-[color-mix(in_oklab,var(--caution)_62%,black)] border-[color-mix(in_oklab,var(--caution)_40%,transparent)] dark:text-[color-mix(in_oklab,var(--caution)_92%,white)]",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  pulse = false,
  className,
}: {
  status: string;
  pulse?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const config = STATUS_MAP[status] ?? { tone: "neutral" as Tone, icon: MinusCircle };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[config.tone],
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", pulse && "animate-spin")}
      />
      {t(statusKey(status))}
    </span>
  );
}

export function toneOf(status: string): Tone {
  return STATUS_MAP[status]?.tone ?? "neutral";
}
