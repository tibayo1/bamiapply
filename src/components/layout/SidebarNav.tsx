"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig, type NavItem } from "@/config/site";
import { Tooltip } from "@/components/ui/Tooltip";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}

function SidebarLink({ item, collapsed, active, onNavigate }: SidebarLinkProps) {
  const { label, href, icon: Icon } = item;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring transition-ui group relative flex h-9 items-center rounded-md text-body",
        collapsed ? "mx-auto w-9 justify-center" : "gap-2.5 px-2.5",
        active
          ? "bg-ink/[0.06] font-medium text-ink"
          : "text-ink-secondary hover:bg-ink/[0.04] hover:text-ink"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className={cn("accent-slash absolute top-1/2 h-4 -translate-y-1/2", collapsed ? "-left-[7px]" : "-left-[7px]")}
        />
      )}
      <Icon
        className={cn(
          "transition-ui h-[17px] w-[17px] shrink-0",
          active ? "text-brand" : "text-ink-muted group-hover:text-ink-secondary"
        )}
        strokeWidth={1.9}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <Tooltip label={label} enabled={collapsed}>
      {link}
    </Tooltip>
  );
}

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Navigation list shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-3 py-2">
      {siteConfig.appNav.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={isActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}

      <hr className="mx-1 my-2 border-line" />

      {siteConfig.appNavSecondary.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={isActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
