import Link from "next/link";
import SearchBar from "../components/SearchBar";

type Hotel = {
  id: number;
  name: string;
  city: string;
  hotel_type: string;
  star_category: number | null;
  image_url: string | null;
};

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
              <Link
                key={hotel.id}
                href={`/hotels/${hotel.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="h-44 w-full overflow-hidden bg-sand-200">
                  {hotel.image_url ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}${hotel.image_url}`}
                      alt={hotel.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-stone-900">{hotel.name}</h3>
                    {hotel.star_category ? (
                      <span className="shrink-0 text-xs font-medium text-accent-500">
                        {"★".repeat(hotel.star_category)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{hotel.city}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">
                    {hotel.hotel_type}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
