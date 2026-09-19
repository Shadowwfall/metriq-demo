import type { Key } from "./i18n";
import {
  BadgeCheck,
  ClipboardList,
  FileBarChart,
  Files,
  GaugeCircle,
  History,
  LayoutDashboard,
  Ruler,
  ScanLine,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  labelKey: Key;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  primary?: boolean;
  /** Roles that may see this entry. */
  roles: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    labelKey: "nav.today",
    to: "/dashboard",
    icon: LayoutDashboard,
    end: true,
    primary: true,
    roles: ["lmo", "business", "dept_admin", "ministry", "gatc", "admin", "user", "member"],
  },
  {
    labelKey: "nav.assignments",
    to: "/dashboard/assignments",
    icon: ClipboardList,
    primary: true,
    roles: ["lmo", "dept_admin", "ministry", "admin"],
  },
  {
    labelKey: "nav.schedule",
    to: "/dashboard/schedule",
    icon: GaugeCircle,
    primary: true,
    roles: ["lmo", "dept_admin", "admin", "ministry"],
  },
  {
    labelKey: "nav.field",
    to: "/dashboard/field",
    icon: ScanLine,
    primary: true,
    roles: ["lmo", "dept_admin", "admin"],
  },
  {
    labelKey: "nav.instruments",
    to: "/dashboard/instruments",
    icon: Ruler,
    primary: true,
    roles: ["lmo", "business", "dept_admin", "ministry", "gatc", "admin"],
  },
  {
    labelKey: "nav.applications",
    to: "/dashboard/applications",
    icon: Files,
    primary: true,
    roles: ["business", "dept_admin", "ministry", "admin"],
  },
  {
    labelKey: "nav.certificates",
    to: "/dashboard/certificates",
    icon: BadgeCheck,
    primary: true,
    roles: ["lmo", "business", "dept_admin", "ministry", "gatc", "admin"],
  },
  {
    labelKey: "nav.reports",
    to: "/dashboard/reports",
    icon: FileBarChart,
    roles: ["lmo", "business", "dept_admin", "ministry", "admin"],
  },
  {
    labelKey: "nav.audit",
    to: "/dashboard/audit",
    icon: History,
    roles: ["lmo", "dept_admin", "ministry", "admin"],
  },
  {
    labelKey: "nav.profile",
    to: "/dashboard/profile",
    icon: UserCog,
    roles: ["lmo", "business", "dept_admin", "ministry", "gatc", "admin", "user", "member"],
  },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABEL: Record<string, string> = {
  lmo: "Legal Metrology Officer",
  business: "Business / Instrument Owner",
  dept_admin: "Department Administrator",
  ministry: "Ministry Administrator",
  gatc: "Government Approved Test Centre",
  admin: "Department Administrator",
  user: "Stakeholder",
  member: "Stakeholder",
};

export const VERIFY_ICON = ShieldCheck;
