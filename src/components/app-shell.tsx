import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAppSeed } from "@/hooks/use-seed";
import { useOnlineStatus } from "@/hooks/use-online";
import { useI18n } from "@/lib/i18n";
import { ROLE_LABEL, navForRole } from "@/lib/nav";
import { formatRelative, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Bell,
  BadgeCheck,
  ChevronRight,
  Files,
  Languages,
  LogOut,
  Menu,
  MoreHorizontal,
  Ruler,
  Search,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router";

/* ── brand ──────────────────────────────────────────────────────────────── */

export function BrandMark({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label="MetriQ home"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          inverted ? "bg-white/10 text-white" : "bg-primary text-primary-foreground",
        )}
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span
            className={cn(
              "block font-display text-sm font-extrabold tracking-[0.16em]",
              inverted ? "text-white" : "text-foreground",
            )}
          >
            MetriQ
          </span>
          <span
            className={cn(
              "block text-[10px] leading-3 tracking-wide",
              inverted ? "text-white/60" : "text-muted-foreground",
            )}
          >
            Online Verification System · Prototype
          </span>
        </span>
      ) : null}
    </Link>
  );
}

/* ── language toggle ────────────────────────────────────────────────────── */

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label="Select interface language"
    >
      <Languages className="mx-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />
      {(["en", "hi"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2 py-0.5 transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code === "en" ? "EN" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}

/* ── global search ──────────────────────────────────────────────────────── */

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const results = useQuery(api.dashboard.globalSearch, { term });
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setTerm("");
    navigate(to);
  };

  const hasResults =
    results &&
    (results.applications.length ||
      results.instruments.length ||
      results.certificates.length ||
      results.officers.length);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-56 justify-start gap-2 text-muted-foreground sm:flex lg:w-72"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="truncate text-sm">
          Search IDs, instruments, certificates…
        </span>
        <kbd className="ml-auto hidden rounded border border-border px-1 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12%] max-w-2xl translate-y-0 gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Global search</DialogTitle>
            <DialogDescription>
              Search applications, instruments, certificates and officers
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Certificate ID, instrument ID, serial number, applicant…"
              className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-slim">
            {term.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least two characters to search across the registry.
              </p>
            ) : !hasResults ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No records matched “{term}”.
              </p>
            ) : (
              <div className="space-y-3">
                {results!.applications.length ? (
                  <SearchGroup title="Applications">
                    {results!.applications.map((a) => (
                      <SearchRow
                        key={a._id}
                        icon={Files}
                        title={a.applicationNumber}
                        subtitle={`${a.applicantName} · ${a.instrumentType}`}
                        onClick={() => go(`/dashboard/applications/${a._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {results!.instruments.length ? (
                  <SearchGroup title="Instruments">
                    {results!.instruments.map((i) => (
                      <SearchRow
                        key={i._id}
                        icon={Ruler}
                        title={i.instrumentCode}
                        subtitle={`${i.instrumentType} · ${i.ownerName}`}
                        onClick={() => go(`/dashboard/instruments/${i._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {results!.certificates.length ? (
                  <SearchGroup title="Certificates">
                    {results!.certificates.map((c) => (
                      <SearchRow
                        key={c._id}
                        icon={BadgeCheck}
                        title={c.certificateNumber}
                        subtitle={`${c.instrumentType} · ${c.status.replace(/_/g, " ")}`}
                        onClick={() => go(`/dashboard/certificates/${c._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {results!.officers.length ? (
                  <SearchGroup title="Officers">
                    {results!.officers.map((o) => (
                      <SearchRow
                        key={o._id}
                        icon={ShieldCheck}
                        title={o.name}
                        subtitle={`${o.designation} · ${o.district}`}
                        onClick={() => go("/dashboard/assignments")}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SearchRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Files;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate gov-id text-sm text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

/* ── shell ──────────────────────────────────────────────────────────────── */

function NavList({
  role,
  onNavigate,
  variant = "sidebar",
}: {
  role: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "sheet";
}) {
  const { t } = useI18n();
  const items = navForRole(role);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              variant === "sidebar"
                ? cn(
                    "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--saffron)]",
                  )
                : cn(
                    "text-foreground/80 hover:bg-accent",
                    isActive && "bg-accent text-foreground",
                  ),
            )
          }
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({
  children,
  title,
  description,
  breadcrumb,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const profile = useQuery(api.profiles.current);
  const notifications = useQuery(api.notifications.list, { limit: 5 });
  useAppSeed();

  const role = profile?.role ?? "user";
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const primaryItems = navForRole(role).filter((i) => i.primary).slice(0, 5);

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex print:hidden">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <BrandMark inverted />
        </div>
        <div className="scrollbar-slim flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/45 uppercase">
            {t("nav.workspace")}
          </p>
          <NavList role={role} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/60 p-3">
            <p className="text-xs font-semibold text-sidebar-foreground">
              {ROLE_LABEL[role] ?? "Stakeholder"}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-sidebar-foreground/60">
              {profile?.jurisdictionDistrict
                ? `${profile.jurisdictionDistrict}${profile.jurisdictionState ? `, ${profile.jurisdictionState}` : ""}`
                : "Jurisdiction not assigned"}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur print:hidden">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>

            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate font-display text-base font-semibold text-foreground">
                {title}
              </p>
              {             breadcrumb?.length ? (
                <nav aria-label="Breadcrumb" className="mt-0.5 flex items-center gap-1">
                  {breadcrumb.map((crumb, i) => (
                    <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                      {i > 0 ? (
                        <ChevronRight
                          className="size-3 text-muted-foreground"
                          aria-hidden="true"
                        />
                      ) : null}
                      {crumb.to ? (
                        <Link
                          to={crumb.to}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <GlobalSearch />
              <LanguageToggle className="hidden sm:inline-flex" />
              {!online ? (
                <span
                  className="hidden items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--caution)_40%,transparent)] px-2.5 py-1 text-xs font-medium text-[color-mix(in_oklab,var(--caution)_70%,black)] sm:inline-flex"
                  role="status"
                >
                  <WifiOff className="size-3.5" aria-hidden="true" />
                  {t("label.offline")}
                </span>
              ) : null}

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              >
                <Link to="/dashboard/notifications">
                  <Bell className="size-5" />
                  {unread > 0 ? (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--saffron)] text-[10px] font-bold text-[var(--saffron-foreground)]">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 px-1.5 sm:px-2"
                    aria-label="Account menu"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(profile?.name ?? user?.name)}
                    </span>
                    <span className="hidden max-w-32 truncate text-sm font-medium xl:block">
                      {profile?.name ?? user?.name ?? "Portal user"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <span className="block truncate text-sm font-semibold">
                      {profile?.name ?? user?.name ?? "Portal user"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {ROLE_LABEL[role] ?? "Stakeholder"}
                    </span>
                    {profile?.employeeCode ? (
                      <span className="mt-1 block gov-id text-[11px] font-normal text-muted-foreground">
                        {profile.employeeCode}
                      </span>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                    {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/verify")}>
                    {t("verify.title")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">{t("label.language")}</span>
                    <LanguageToggle />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    {t("action.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-5 lg:hidden">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {description && !breadcrumb?.length ? (
              <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
                {description}
              </p>
            ) : null}
            {actions ? <div className="mb-5 flex flex-wrap gap-2">{actions}</div> : null}
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden print:hidden"
        >
          <div className="flex items-stretch">
            {primaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn("size-5", isActive && "text-primary")}
                      aria-hidden="true"
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium text-muted-foreground"
                >
                  <MoreHorizontal className="size-5" aria-hidden="true" />
                  {t("nav.menu")}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl">
                <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
                <div className="px-4 pt-6 pb-4">
                  <BrandMark />
                  <div className="mt-5">
                    <NavList
                      role={role}
                      variant="sheet"
                      onNavigate={() => setMoreOpen(false)}
                    />
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <LanguageToggle />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4" />
                      {t("action.signOut")}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}

/** Compact notification preview used on dashboards. */
export function NotificationPeek() {
  const { lang } = useI18n();
  const rows = useQuery(api.notifications.list, { limit: 4 });
  if (!rows?.length) return null;
  return (
    <ul className="space-y-2">
      {rows.map((n) => (
        <li key={n._id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--saffron)]" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {lang === "hi" && n.titleHi ? n.titleHi : n.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
