import Link from "next/link";
import SearchWidget from "./components/search/SearchWidget";
import HotelCard from "./components/HotelCard";
import OfferCard from "./components/OfferCard";
import { EmptyArt, HeroArt, sceneForPlace } from "./components/art";
import { Photo } from "./components/ui";
import { serverFetch } from "./lib/server";
import { inr } from "./lib/format";
import { readStay, stayQuery } from "./lib/stay";
import type { Offer, SearchResponse } from "./lib/types";

type Destination = { city: string; hotel_count: number; from_price: number; image_url: string | null };

const WHY = [
  { icon: "🔒", title: "Secure payments", text: "UPI, cards, netbanking & wallets via Razorpay — your details never touch our servers." },
  { icon: "⚡", title: "Instant confirmation", text: "Your voucher is ready the moment payment completes. No waiting on the hotel." },
  { icon: "↩️", title: "Flexible cancellation", text: "Most rates can be cancelled for free — the exact deadline is shown before you pay." },
  { icon: "🏷️", title: "Transparent pricing", text: "Room rate, taxes and discounts itemised upfront. What you see is what you pay." },
];

const FAQ = [
  {
    q: "How do I know my booking is confirmed?",
    a: "As soon as your payment succeeds you'll see a confirmation page with your booking reference (e.g. SF7K3Q9M). The same voucher is always available under My Trips.",
  },
  {
    q: "Which payment methods can I use?",
    a: "All major options supported by Razorpay: UPI (GPay, PhonePe, Paytm), credit and debit cards, netbanking and popular wallets.",
  },
  {
    q: "What happens if my payment fails?",
    a: "Your room stays on hold for a few minutes so you can retry from the same page or from My Trips. If no payment arrives the hold is released and you are not charged.",
  },
  {
    q: "How do cancellations and refunds work?",
    a: "Each rate shows its cancellation policy before you pay. To cancel, contact our support team with your booking reference — refunds go back to the original payment method, usually within 5–7 working days.",
  },
  {
    q: "Are taxes included in the price?",
    a: "Search results show the nightly room rate plus taxes separately; the checkout page shows the full breakdown and the exact total you'll pay.",
  },
];

export default async function Home() {
  const stay = readStay({});
  const [destinations, offers, featured] = await Promise.all([
    serverFetch<Destination[]>("/api/hotels/destinations"),
    serverFetch<Offer[]>("/api/offers"),
    serverFetch<SearchResponse>("/api/hotels/search?sort=recommended&pageSize=8"),
  ]);
  const query = stayQuery(stay).toString();

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative bg-brand-900 px-4 pb-28 pt-12 sm:px-6 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 10% 0%, rgba(45,108,223,.55), transparent 55%), radial-gradient(ellipse at 90% 20%, rgba(242,104,47,.30), transparent 50%), linear-gradient(180deg, #0c2350 0%, #102c63 100%)",
          }}
        />
        <HeroArt />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-8 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Book hotels, resorts &amp; villas</h1>
            <p className="mx-auto mt-3 max-w-xl text-white/75">
              Real-time availability, transparent prices and instant confirmation on stays across India.
            </p>
          </div>
          <SearchWidget initialStay={stay} />
        </div>
      </section>

      {/* Offers — only what's published from the admin panel */}
      {offers && offers.length > 0 && (
        <section id="offers" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16 sm:px-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Offers for you</h2>
              <p className="text-sm text-slate-500">Handpicked deals — apply the code at checkout</p>
            </div>
            <Link href="/offers" className="text-sm font-bold text-brand-700 hover:underline">
              All offers →
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {offers.slice(0, 6).map((o) => (
              <div key={o.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
                <OfferCard offer={o} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Destinations */}
      {destinations && destinations.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Popular destinations</h2>
          <p className="mb-5 text-sm text-slate-500">Where travellers are booking right now</p>
          <div className={`grid grid-cols-2 gap-4 ${destinations.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            {destinations.map((d, i) => (
              <Link
                key={d.city}
                href={`/hotels?city=${encodeURIComponent(d.city)}&${query}`}
                className={`group relative overflow-hidden rounded-2xl bg-sand-100 ${i === 0 && destinations.length >= 5 ? "col-span-2 row-span-2 min-h-[260px]" : "min-h-[160px]"}`}
              >
                <Photo scene={sceneForPlace(d.city)} src={d.image_url} alt={d.city} sizes="(min-width: 768px) 50vw, 100vw" className="transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className={`font-extrabold ${i === 0 && destinations.length >= 5 ? "text-2xl" : "text-lg"}`}>{d.city}</p>
                  <p className="text-xs text-white/85">
                    {d.hotel_count} {d.hotel_count === 1 ? "property" : "properties"} · from {inr(d.from_price)}/night
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Handpicked stays</h2>
            <p className="text-sm text-slate-500">Top-rated properties with great value</p>
          </div>
          <Link href={`/hotels?${query}`} className="text-sm font-bold text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
        {featured && featured.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.map((h) => (
              <HotelCard key={h.id} hotel={h} query={query} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-surface p-10 text-center">
            <EmptyArt kind="search" />
            <p className="mt-3 text-sm text-slate-500">No properties are open for booking yet. Check back soon.</p>
          </div>
        )}
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
          {WHY.map((w) => (
            <div key={w.title} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">{w.icon}</span>
              <div>
                <p className="font-bold text-slate-900">{w.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6">
        <h2 className="mb-5 text-center text-2xl font-extrabold text-slate-900">Frequently asked questions</h2>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                {f.q}
                <span className="text-brand-700 transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
