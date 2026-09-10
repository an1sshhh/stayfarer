import Link from "next/link";
import { notFound } from "next/navigation";
import ImageGallery from "../../components/ImageGallery";
import RoomBookingCard from "../../components/RoomBookingCard";
import { amenityEmoji } from "../../components/AmenityIcon";

type HotelImage = { id: number; url: string; category: string; is_primary: boolean };
type Amenity = { id: number; name: string };

type Hotel = {
  id: number;
  name: string;
  description: string | null;
  city: string;
  address: string | null;
  hotel_type: string;
  star_category: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  image_url: string | null;
  images: HotelImage[];
  amenities: Amenity[];
  latitude: string | null;
  longitude: string | null;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  children_allowed: boolean;
};

type RatePlan = { id: number; name: string; price: string };
type RoomType = {
  id: number;
  name: string;
  description: string | null;
  bed_type: string | null;
  max_adults: number | null;
  max_occupancy: number | null;
  ratePlans?: RatePlan[];
};

async function getHotel(id: string): Promise<Hotel | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotels/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function getRoomTypes(id: string): Promise<RoomType[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotels/${id}/room-types`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  const rooms: RoomType[] = json.data ?? [];

  return Promise.all(
    rooms.map(async (room) => {
      const detailRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/room-types/${room.id}`, {
        cache: "no-store",
      });
      if (!detailRes.ok) return room;
      const detailJson = await detailRes.json();
      return { ...room, ratePlans: detailJson.data?.ratePlans };
    })
  );
}

const SUBNAV = [
  { href: "#overview", label: "Overview" },
  { href: "#amenities", label: "Amenities" },
  { href: "#rooms", label: "Rooms" },
  { href: "#location", label: "Location" },
];

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hotel, roomTypes] = await Promise.all([getHotel(id), getRoomTypes(id)]);
  if (!hotel) notFound();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const lowestPrice = roomTypes
    .flatMap((room) => room.ratePlans ?? [])
    .map((plan) => Number(plan.price))
    .filter((price) => !Number.isNaN(price))
    .sort((a, b) => a - b)[0];

  const galleryImages =
    hotel.images.length > 0
      ? hotel.images
      : hotel.image_url
      ? [{ id: "primary", url: hotel.image_url }]
      : [];

  const mapUrl =
    hotel.latitude && hotel.longitude
      ? `https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}`
      : null;

  const houseRules = [
    { label: "Children", allowed: hotel.children_allowed },
    { label: "Pets", allowed: hotel.pets_allowed },
    { label: "Smoking", allowed: hotel.smoking_allowed },
  ];

  return (
    <main className="flex-1 pb-28 sm:pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-stone-500 sm:px-6">
          <Link href="/" className="hover:text-brand-700">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/hotels" className="hover:text-brand-700">
            Hotels
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/hotels?city=${encodeURIComponent(hotel.city)}`} className="hover:text-brand-700">
            {hotel.city}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-stone-700">{hotel.name}</span>
        </div>
      </div>

      {/* Title block */}
      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {hotel.hotel_type}
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-stone-900 sm:text-3xl">
                {hotel.name}
              </h1>
              <p className="mt-1.5 flex items-center gap-1 text-sm text-stone-500">
                <span aria-hidden>📍</span>
                {hotel.address ? `${hotel.address}, ` : ""}
                {hotel.city}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 font-semibold text-brand-700 hover:underline"
                  >
                    View on map
                  </a>
                )}
              </p>
            </div>
            {hotel.star_category && (
              <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                {"★".repeat(hotel.star_category)} rated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <ImageGallery images={galleryImages} alt={hotel.name} apiUrl={apiUrl} />
      </div>

      {/* Sticky sub-nav */}
      <nav className="sticky top-[65px] z-40 mt-5 border-y border-stone-200 bg-sand-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 text-sm font-medium text-stone-600 sm:px-6">
          {SUBNAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 border-b-2 border-transparent py-3 transition hover:text-brand-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {hotel.description && (
              <section id="overview" className="scroll-mt-32 border-b border-stone-200 py-8">
                <h2 className="mb-3 font-display text-lg font-semibold text-stone-900">
                  About this property
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">
                  {hotel.description}
                </p>
              </section>
            )}

            {hotel.amenities.length > 0 && (
              <section id="amenities" className="scroll-mt-32 border-b border-stone-200 py-8">
                <h2 className="mb-4 font-display text-lg font-semibold text-stone-900">
                  What this place offers
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {hotel.amenities.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 text-sm text-stone-700">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-base">
                        {amenityEmoji(a.name)}
                      </span>
                      {a.name}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="scroll-mt-32 border-b border-stone-200 py-8">
              <h2 className="mb-3 font-display text-lg font-semibold text-stone-900">House rules</h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-stone-600 sm:grid-cols-4">
                <div className="rounded-xl bg-sand-100 p-3">
                  <p className="text-xs text-stone-400">Check-in</p>
                  <p className="font-semibold text-stone-900">{hotel.check_in_time ?? "2:00 PM"}</p>
                </div>
                <div className="rounded-xl bg-sand-100 p-3">
                  <p className="text-xs text-stone-400">Check-out</p>
                  <p className="font-semibold text-stone-900">{hotel.check_out_time ?? "11:00 AM"}</p>
                </div>
                {houseRules.map((rule) => (
                  <div key={rule.label} className="rounded-xl bg-sand-100 p-3">
                    <p className="text-xs text-stone-400">{rule.label}</p>
                    <p className="font-semibold text-stone-900">
                      {rule.allowed ? "Allowed" : "Not allowed"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section id="rooms" className="scroll-mt-32 py-8">
              <h2 className="mb-1 font-display text-lg font-semibold text-stone-900">
                Available rooms
              </h2>
              <p className="mb-4 text-sm text-stone-500">
                {roomTypes.length > 0
                  ? "Prices shown are per night, taxes included."
                  : undefined}
              </p>
              {roomTypes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
                  No rooms listed yet for this property.
                </p>
              ) : (
                <div className="space-y-4">
                  {roomTypes.map((room) => (
                    <RoomBookingCard key={room.id} hotelId={hotel.id} room={room} />
                  ))}
                </div>
              )}
            </section>

            {mapUrl && (
              <section id="location" className="scroll-mt-32 border-t border-stone-200 py-8">
                <h2 className="mb-3 font-display text-lg font-semibold text-stone-900">Location</h2>
                <p className="mb-3 text-sm text-stone-600">
                  {hotel.address ? `${hotel.address}, ` : ""}
                  {hotel.city}
                </p>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-sand-50"
                >
                  📍 Open in Google Maps
                </a>
              </section>
            )}
          </div>

          {/* Sticky sidebar (desktop) */}
          <aside className="hidden h-fit lg:sticky lg:top-[130px] lg:col-span-1 lg:block">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display font-semibold text-stone-900">Stay details</h2>
              {lowestPrice && (
                <div className="mb-4 rounded-xl bg-brand-50 p-4">
                  <p className="text-xs text-brand-700">Starting from</p>
                  <p className="text-2xl font-bold text-brand-900">
                    ₹{lowestPrice.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-brand-700"> / night</span>
                  </p>
                </div>
              )}
              <dl className="mb-5 space-y-3 text-sm text-stone-600">
                <div className="flex justify-between border-b border-stone-100 pb-3">
                  <dt>Check-in</dt>
                  <dd className="font-medium text-stone-900">{hotel.check_in_time ?? "2:00 PM"}</dd>
                </div>
                <div className="flex justify-between border-b border-stone-100 pb-3">
                  <dt>Check-out</dt>
                  <dd className="font-medium text-stone-900">{hotel.check_out_time ?? "11:00 AM"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Property type</dt>
                  <dd className="font-medium capitalize text-stone-900">{hotel.hotel_type}</dd>
                </div>
              </dl>
              <a
                href="#rooms"
                className="block w-full rounded-full bg-accent-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
              >
                {roomTypes.length > 0 ? "View rooms" : "Check availability"}
              </a>
              <p className="mt-3 text-center text-xs text-stone-400">
                Prices shown include taxes
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      {lowestPrice && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden">
          <div>
            <p className="text-[11px] text-stone-400">Starting from</p>
            <p className="text-lg font-bold text-stone-900">
              ₹{lowestPrice.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-stone-500"> /night</span>
            </p>
          </div>
          <a
            href="#rooms"
            className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
          >
            View rooms
          </a>
        </div>
      )}
    </main>
  );
}
