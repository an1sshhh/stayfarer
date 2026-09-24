"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, useSession } from "../lib/api";
import { usePopover } from "./search/usePopover";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/hotels", label: "Hotels", icon: "🏨" },
  { href: "/offers", label: "Offers", icon: "🏷️" },
  { href: "/bookings", label: "My Trips", icon: "🧳" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession();
  // The mobile menu remembers which page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileOpen = menuPath === pathname;
  const setMobileOpen = (open: boolean) => setMenuPath(open ? pathname : null);
  const [accountOpen, setAccountOpen, accountRef] = usePopover();

  function logout() {
    clearSession();
    setAccountOpen(false);
    router.push("/");
    router.refresh();
  }

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;
  const initials = user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/brand/icon-badge.svg" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-[9px]" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Stay<span className="text-accent-500">Farer</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <a href="mailto:support@stayfarer.in" className="text-right text-xs leading-tight text-slate-500 hover:text-brand-700">
            <span className="block font-semibold text-slate-700">24×7 Support</span>
            support@stayfarer.in
          </a>
          {user ? (
            <div ref={accountRef} className="relative">
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                aria-expanded={accountOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {initials}
                </span>
                Hi, {user.name.split(" ")[0]}
                <span className="text-slate-400">▾</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-black/5">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link href="/bookings" onClick={() => setAccountOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                    🧳 My Trips
                  </Link>
                  <button onClick={logout} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    ↪ Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={loginHref}
              className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Login or Create account
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-surface px-4 py-3 md:hidden">
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm font-semibold text-slate-700">
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-slate-100 pt-3">
              <ThemeToggle inline />
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {user ? (
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-slate-600">Signed in as <b className="text-slate-900">{user.name}</b></span>
                  <button onClick={logout} className="text-sm font-semibold text-brand-700">Log out</button>
                </div>
              ) : (
                <Link href={loginHref} className="block rounded-lg bg-brand-600 py-2.5 text-center text-sm font-bold text-white">
                  Login or Create account
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
