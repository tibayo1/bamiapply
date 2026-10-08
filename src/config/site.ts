import {
  Briefcase,
  FileText,
  LayoutDashboard,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { brand } from "./brand";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Site-wide metadata and navigation.
 * Consumed by the sidebar, mobile drawer, top bar and Next.js metadata.
 */
export const siteConfig = {
  name: brand.productName,
  shortName: brand.shortName,
  tagline: brand.tagline,
  description: brand.description,
  url: `https://${brand.domain}`,

  /** Primary navigation inside the authenticated shell */
  appNav: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Applications", href: "/applications", icon: Briefcase },
    { label: "Career Profile", href: "/profile", icon: UserRound },
    { label: "Documents", href: "/documents", icon: FileText },
  ] satisfies NavItem[],

  /** Secondary navigation, shown below the separator */
  appNavSecondary: [
    { label: "Settings", href: "/settings", icon: Settings },
  ] satisfies NavItem[],
} as const;

/** All app nav items — handy for resolving the current section. */
export const allAppNav: NavItem[] = [
  ...siteConfig.appNav,
  ...siteConfig.appNavSecondary,
];

/** Resolve the nav item that owns a pathname (prefix match, longest first). */
export function resolveNavItem(pathname: string): NavItem | undefined {
  return [...allAppNav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
