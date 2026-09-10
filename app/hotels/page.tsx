import Link from "next/link";
import SearchBar from "../components/SearchBar";
import HotelCard from "../components/HotelCard";
import type { Hotel } from "../lib/types";

async function getHotels(searchParams: {
  city?: string;
  query?: string;
}): Promise<Hotel[]> {
  const params = new URLSearchParams({ status: "active" });
  const search = searchParams.city || searchParams.query;
  if (search) params.set("search", search);

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotels?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; checkIn?: string; checkOut?: string; guests?: string }>;
}) {
  const params = await searchParams;
  const hotels = await getHotels(params);

  return (
    <main className="flex-1">
      <div className="bg-brand-900 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SearchBar initialCity={params.city ?? ""} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-stone-900">
          {params.city ? `Hotels in ${params.city}` : "All hotels"}
        </h1>
        <p className="mb-8 mt-1 text-sm text-stone-500">{hotels.length} properties found</p>

        {hotels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-sm text-stone-500">No hotels match your search.</p>
            <Link href="/hotels" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} apiUrl={process.env.NEXT_PUBLIC_API_URL} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
