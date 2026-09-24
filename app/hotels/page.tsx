import Link from "next/link";
import { Suspense } from "react";
import SearchWidget from "../components/search/SearchWidget";
import HotelResultCard from "../components/results/HotelResultCard";
import Filters from "../components/results/Filters";
import SortBar from "../components/results/SortBar";
import { serverFetch } from "../lib/server";
import { EmptyArt } from "../components/art";
import { nightsBetween, shortDate } from "../lib/format";
import { readStay, stayQuery } from "../lib/stay";
import type { SearchResponse } from "../lib/types";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PASSTHROUGH = ["sort", "stars", "types", "amenities", "rating", "minPrice", "maxPrice", "freeCancellation", "breakfast", "page"];

export default async function HotelsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const stay = readStay(params);
  const city = one(params.city) ?? one(params.query) ?? "";

  const api = stayQuery(stay);
  api.set("pageSize", "10");
  if (city) api.set("city", city);
  for (const key of PASSTHROUGH) {
    const v = one(params[key]);
    if (v) api.set(key, v);
  }
  const result = await serverFetch<SearchResponse>(`/api/hotels/search?${api}`);

  const detailQuery = stayQuery(stay).toString();
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  function pageHref(page: number) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const value = one(v);
      if (value && k !== "page") q.set(k, value);
    }
    if (page > 1) q.set("page", String(page));
    return `/hotels?${q}`;
  }

  return (
    <main className="flex-1">
      <div className="bg-brand-900 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SearchWidget variant="compact" initialDestination={city} initialStay={stay} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <nav className="mb-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-700">Home</Link>
          <span className="mx-1.5">›</span>
          <span className="text-slate-700">{city ? `Hotels in ${city}` : "All hotels"}</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {city ? `Hotels in ${city}` : "Hotels across India"}
            </h1>
            <p className="text-sm text-slate-500">
              {result ? `${result.total} ${result.total === 1 ? "property" : "properties"} available` : "Search unavailable"} ·{" "}
              {shortDate(stay.checkIn)} – {shortDate(stay.checkOut)} · {nights} night{nights > 1 ? "s" : ""} ·{" "}
              {stay.rooms} room{stay.rooms > 1 ? "s" : ""}, {stay.adults + stay.children} guest{stay.adults + stay.children > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            {result && (
              <Suspense>
                <Filters facets={result.facets} />
              </Suspense>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-4">
              <Suspense>
                <SortBar />
              </Suspense>
            </div>

            {!result ? (
              <div className="flex flex-col items-center rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-slate-200">
                <EmptyArt kind="error" />
                <p className="mt-3 font-semibold text-slate-900">We couldn&apos;t load hotels right now.</p>
                <p className="mt-1 text-sm text-slate-500">Please refresh the page in a moment.</p>
              </div>
            ) : result.data.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-slate-200">
                <EmptyArt kind="search" />
                <p className="mt-2 font-semibold text-slate-900">No properties match your search</p>
                <p className="mt-1 text-sm text-slate-500">Try different dates, fewer filters, or another destination.</p>
                <Link href={`/hotels?${detailQuery}`} className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">
                  See all properties
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {result.data.map((hotel) => (
                  <HotelResultCard key={hotel.id} hotel={hotel} query={detailQuery} nights={nights} rooms={stay.rooms} />
                ))}
              </div>
            )}

            {totalPages > 1 && result && (
              <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                {result.page > 1 && (
                  <Link href={pageHref(result.page - 1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-surface">‹ Prev</Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    aria-current={p === result.page ? "page" : undefined}
                    className={`min-w-9 rounded-lg px-3 py-2 text-center text-sm font-semibold ${p === result.page ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-surface"}`}
                  >
                    {p}
                  </Link>
                ))}
                {result.page < totalPages && (
                  <Link href={pageHref(result.page + 1)} className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-surface">Next ›</Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
