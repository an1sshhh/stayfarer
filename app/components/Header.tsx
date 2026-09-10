"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type User = { id: number; name: string; email: string; role: string };

function readUser(): User | null {
  const stored = localStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    function onAuthChange() {
      setUser(readUser());
    }
    window.addEventListener("authchange", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("authchange", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/icon-badge.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-[9px]"
          />
          <span className="font-display text-xl font-medium uppercase tracking-[0.08em] text-brand-700">
            Stay Farer
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/hotels" className="text-stone-600 transition hover:text-brand-700">
            Hotels
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-stone-600">
                Hi, <span className="text-stone-900">{user.name.split(" ")[0]}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-full border border-stone-300 px-4 py-1.5 font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand-700 px-4 py-1.5 font-medium text-sand-50 transition hover:bg-brand-600"
            >
              Sign in
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-stone-700 sm:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200 bg-sand-50 px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/hotels" className="text-stone-700" onClick={() => setMenuOpen(false)}>
              Hotels
            </Link>
            {user ? (
              <>
                <span className="text-stone-600">Signed in as {user.name}</span>
                <button onClick={logout} className="text-left text-stone-700">
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="text-brand-700" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
