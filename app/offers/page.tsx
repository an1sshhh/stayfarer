import type { Metadata } from "next";
import Link from "next/link";
import OfferCard from "../components/OfferCard";
import { EmptyArt } from "../components/art";
import { serverFetch } from "../lib/server";
import type { Offer } from "../lib/types";

export const metadata: Metadata = {
  title: "Hotel offers & coupon codes — Stay Farer",
  description: "Current hotel deals and coupon codes on Stay Farer.",
};

const STEPS = [
  { n: 1, title: "Pick a deal", text: "Copy the coupon code from any offer below." },
  { n: 2, title: "Choose your stay", text: "Search, pick a hotel and select a room." },
  { n: 3, title: "Apply at checkout", text: "Paste the code in Coupons & offers — the discount shows instantly." },
];

export default async function OffersPage() {
  const offers = await serverFetch<Offer[]>("/api/offers");

  return (
    <main className="flex-1">
      <div className="bg-brand-900 px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-500">Deals &amp; coupons</p>
          <h1 className="mt-1 text-3xl font-extrabold">Offers for your next stay</h1>
          <p className="mt-1 max-w-xl text-sm text-white/75">
            Fresh deals from the Stay Farer team. Codes are checked live at checkout, so what you see here is what you get.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ol className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{s.n}</span>
              <span>
                <span className="block font-bold text-slate-900">{s.title}</span>
                <span className="block text-sm text-slate-500">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>

        {!offers ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface p-10 text-center ring-1 ring-slate-200">
            <EmptyArt kind="error" />
            <p className="mt-3 font-semibold text-slate-900">We couldn&apos;t load offers right now.</p>
            <p className="text-sm text-slate-500">Please refresh in a moment.</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface p-10 text-center ring-1 ring-slate-200">
            <EmptyArt kind="offers" />
            <p className="mt-3 font-semibold text-slate-900">No live offers right now</p>
            <p className="text-sm text-slate-500">New deals drop regularly — meanwhile, prices already include our best rates.</p>
            <Link href="/hotels" className="mt-4 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-bold text-white">Explore hotels</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} size="lg" />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
