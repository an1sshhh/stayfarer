import Link from "next/link";
import SearchBar from "./components/SearchBar";

type Hotel = {
  id: number;
  name: string;
  city: string;
  hotel_type: string;
  star_category: number | null;
  image_url: string | null;
};

async function getFeaturedHotels(): Promise<Hotel[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotels?status=active`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const hotels: Hotel[] = json.data ?? [];
    return hotels.slice(0, 6);
  } catch {
    return [];
  }
}

const DESTINATIONS = ["Goa", "Mumbai", "Jaipur", "Manali", "Bengaluru", "Udaipur"];

const TRUST_POINTS = [
  { label: "Transparent pricing", detail: "taxes included, no surprises at checkout" },
  { label: "Live availability", detail: "real-time inventory across every listing" },
  { label: "Secure sign-in", detail: "your bookings, safely under one account" },
];

export default async function Home() {
  const hotels = await getFeaturedHotels();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-brand-900 px-4 pb-24 pt-16 text-sand-50 sm:px-6 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(193,99,61,0.35), transparent 45%), radial-gradient(circle at 85% 0%, rgba(61,74,79,0.5), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent-500">
            Boutique stays, every mile
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Find your next stay
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Handpicked hotels, resorts, and villas — booked in minutes, at prices that
            already include tax.
          </p>
        </div>

        <div className="relative mx-auto mt-8 max-w-4xl">
          <SearchBar />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-lg shadow-brand-900/5 ring-1 ring-black/5 sm:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <div key={point.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-900">{point.label}</p>
                <p className="text-xs text-stone-500">{point.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="mb-4 font-display text-xl font-semibold text-stone-900">
          Popular destinations
        </h2>
        <div className="flex flex-wrap gap-2">
          {DESTINATIONS.map((city) => (
            <Link
              key={city}
              href={`/hotels?city=${encodeURIComponent(city)}`}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-900">Featured hotels</h2>
            <p className="text-sm text-stone-500">Popular picks from across the country</p>
          </div>
          <Link href="/hotels" className="text-sm font-semibold text-brand-700 hover:underline">
            View all →
          </Link>
        </div>

        {hotels.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">
            No hotels available yet. Check back soon, or explore all listings.
          </p>
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
      </section>
    </main>
  );
}
