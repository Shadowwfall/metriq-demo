import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function GovId({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("gov-id text-foreground/85", className)}>{children}</span>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  icon: Icon,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          {title}
        </h2>
        <div className="rule-saffron mt-2 w-full max-w-40" aria-hidden="true" />
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "verify" | "caution" | "danger" | "primary";
  emphasis?: boolean;
}) {
  const toneRing: Record<string, string> = {
    default: "text-muted-foreground bg-muted",
    primary: "text-primary bg-primary/10",
    verify:
      "text-[color-mix(in_oklab,var(--verify)_75%,black)] bg-[color-mix(in_oklab,var(--verify)_14%,transparent)]",
    caution:
      "text-[color-mix(in_oklab,var(--caution)_65%,black)] bg-[color-mix(in_oklab,var(--caution)_16%,transparent)]",
    danger: "text-destructive bg-destructive/10",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-xs transition-colors",
        emphasis ? "border-primary/30 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              toneRing[tone],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      {Icon ? (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="font-display text-sm font-semibold text-foreground">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn("text-right text-sm font-medium text-foreground", mono && "gov-id")}>
        {value}
      </dd>
    </div>
  );
}

export function LoadingBlock({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}
