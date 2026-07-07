import type { ComponentType, SVGProps } from "react";
import type { Role } from "./types";
import {
  GridIcon,
  ListIcon,
  PlusIcon,
  SunIcon,
  UsersIcon,
  ChartIcon,
  LinkIcon,
  QrIcon,
  ShieldIcon,
  FileIcon,
  SettingsIcon,
  BuildingIcon,
} from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** show in the mobile bottom bar */
  mobile?: boolean;
  /** render as the raised center action on mobile */
  primary?: boolean;
};

export const roleMeta: Record<
  Role,
  { title: string; home: string; user: { name: string; email: string; location: string } }
> = {
  operator: {
    title: "Operator",
    home: "/operator",
    user: {
      name: "Amara Nwosu",
      email: "amara@cafsdrychain.io",
      location: "Oyo Solar Hub",
    },
  },
  admin: {
    title: "Administrator",
    home: "/admin",
    user: {
      name: "David Eze",
      email: "david@cafsdrychain.io",
      location: "HQ · Ibadan",
    },
  },
  auditor: {
    title: "Auditor",
    home: "/auditor",
    user: {
      name: "NAFDAC Regulator",
      email: "regulator@nafdac.gov.ng",
      location: "Abuja",
    },
  },
};

export const navByRole: Record<Role, NavItem[]> = {
  operator: [
    { label: "Overview", href: "/operator", icon: GridIcon, mobile: true },
    { label: "Batches", href: "/operator/batches", icon: ListIcon, mobile: true },
    { label: "Register", href: "/operator/register", icon: PlusIcon, mobile: true, primary: true },
    { label: "Drying", href: "/operator/drying", icon: SunIcon, mobile: true },
    { label: "Settings", href: "/operator/settings", icon: SettingsIcon, mobile: true },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: GridIcon, mobile: true },
    { label: "Batches", href: "/admin/batches", icon: ListIcon, mobile: true },
    { label: "Operators", href: "/admin/operators", icon: UsersIcon, mobile: true },
    { label: "Locations", href: "/admin/locations", icon: BuildingIcon },
    { label: "Reports", href: "/admin/reports", icon: ChartIcon, mobile: true },
    { label: "Blockchain", href: "/admin/blockchain", icon: LinkIcon, mobile: true },
    { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
  ],
  auditor: [
    { label: "Overview", href: "/auditor", icon: GridIcon, mobile: true },
    { label: "Verify", href: "/auditor/verify", icon: QrIcon, mobile: true },
    { label: "Audit trail", href: "/auditor/audit", icon: ShieldIcon, mobile: true },
    { label: "Reports", href: "/auditor/reports", icon: FileIcon, mobile: true },
    { label: "Settings", href: "/auditor/settings", icon: SettingsIcon, mobile: true },
  ],
};
