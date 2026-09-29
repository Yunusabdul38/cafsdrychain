"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { navByRole, roleMeta, type NavItem } from "@/lib/nav";
import { useAuthStore } from "@/lib/store/auth";
import { useIdleLogout } from "@/lib/hooks/useIdleLogout";
import { useSessionWatch } from "@/lib/hooks/useSessionWatch";
import IdleWarning from "@/components/dashboard/IdleWarning";
import { useLogout } from "@/lib/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import { LoadingState } from "@/components/dashboard/States";
import { LogoutIcon, MoreVerticalIcon, PlusIcon } from "@/components/icons";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export default function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuthStore();
  const { warning, staySignedIn } = useIdleLogout();
  useSessionWatch();
  const logout = useLogout();
  const nav = navByRole[role];
  const meta = roleMeta[role];

  // Collapsed by default, restoring the saved preference on first render.
  // localStorage is unavailable during SSR, hence the guard.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
  });

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  // The overflow sheet closes on navigation. Both of these must stay above the
  // auth guard's early return below: hooks after a conditional return change
  // the hook count between renders and React throws.
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Auth + role guard.
  useEffect(() => {
    if (status === "unauthenticated") {
      const reason = useAuthStore.getState().signOutReason;
      router.replace(reason ? `/login?reason=${reason}` : "/login");
    } else if (status === "authenticated" && user && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/operator");
    }
  }, [status, user, role, router]);

  if (status !== "authenticated" || !user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f8f4]">
        <LoadingState label="Loading your workspace…" />
      </div>
    );
  }

  const onLogout = async () => {
    await logout.mutateAsync().catch(() => { });
    router.replace("/login");
  };

  const isActive = (href: string) =>
    pathname === href || (href !== meta.home && pathname.startsWith(href + "/"));

  const mobileItems = nav.filter((n) => n.mobile);
  // Sidebar items the bottom bar has no room for. They go in the More sheet,
  // along with logout — on a phone the sidebar that carries it is gone.
  const overflowItems = nav.filter((n) => !n.mobile);

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      {warning && <IdleWarning onStay={staySignedIn} />}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-black/[0.08] bg-white lg:flex transition-[width] duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Header: logo + toggle */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-black/[0.06] transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed && <Logo href="/" />}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-mint hover:text-brand-dark"
          >
            {collapsed ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 py-3">
            <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {meta.title}
            </span>
          </div>
        )}
        {collapsed && <div className="py-1" />}

        <nav className="flex-1 space-y-1 px-2">
          {nav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="border-t border-black/[0.06] p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <Avatar name={user.name} />
              <button
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
                className="text-muted transition-colors hover:text-brand-dark"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-dark">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted">
                  {user.location ?? user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                aria-label="Log out"
                className="text-muted transition-colors hover:text-brand-dark"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main column — pad shifts with sidebar width */}
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out",
          collapsed ? "lg:pl-[68px]" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.08] bg-white px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted">
              Welcome back,{" "}
              <span className="font-medium text-brand-dark">
                {user.name.split(" ")[0]}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* <button
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.1] text-brand-dark transition-colors hover:bg-mint"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" />
            </button> */}
            <div className="hidden items-center gap-2 sm:flex lg:hidden">
              <Avatar name={user.name} />
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-black/[0.08] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/[0.12]" />
            <ul className="p-3">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-mint text-brand"
                          : "text-brand-dark hover:bg-black/[0.03]"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-black/[0.06] pt-1">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-brand-dark transition-colors hover:bg-black/[0.03]"
                >
                  <LogoutIcon className="h-5 w-5" />
                  Log out
                </button>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Mobile bottom nav (app-style) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white lg:hidden">
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            if (item.primary) {
              return (
                <li key={item.href} className="flex items-center">
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#f6f8f4] bg-brand text-white"
                  >
                    <PlusIcon className="h-6 w-6" />
                  </Link>
                </li>
              );
            }
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-brand" : "text-muted"
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" />
                  {item.label}
                </Link>
              </li>
            );
          })}

          {overflowItems.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={cn(
                  "flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  moreOpen || overflowItems.some((i) => isActive(i.href))
                    ? "text-brand"
                    : "text-muted"
                )}
              >
                <MoreVerticalIcon className="h-[22px] w-[22px]" />
                More
              </button>
            </li>
          )}
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5",
        active
          ? "bg-brand-dark text-white"
          : "text-brand-dark/70 hover:bg-mint hover:text-brand-dark"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && item.label}
    </Link>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-semibold text-brand">
      {initials}
    </span>
  );
}
