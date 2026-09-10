import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/icon-badge.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-[8px]"
            />
            <div>
              <p className="font-display text-base font-medium uppercase tracking-[0.08em] text-brand-700">
                Stay Farer
              </p>
              <p className="text-[11px] tracking-[0.15em] text-stone-400">
                BOUTIQUE STAYS, EVERY MILE
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
            <Link href="/hotels" className="hover:text-brand-700">
              Browse hotels
            </Link>
            <Link href="/login" className="hover:text-brand-700">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-brand-700">
              Create account
            </Link>
          </nav>
        </div>

        <p className="mt-8 text-xs text-stone-400">
          © {new Date().getFullYear()} Stay Farer. Prices shown are final, taxes included.
        </p>
      </div>
    </footer>
  );
}
