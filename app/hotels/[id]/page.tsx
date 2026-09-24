import Link from "next/link";
import { notFound } from "next/navigation";
import ImageGallery from "../../components/ImageGallery";
import RoomOffers from "../../components/hotel/RoomOffers";
import SearchWidget from "../../components/search/SearchWidget";
import { amenityEmoji } from "../../components/AmenityIcon";
import { Photo, RatingBadge, Stars } from "../../components/ui";
import { serverFetch } from "../../lib/server";
import { API_URL, inr, longDate, nightsBetween, shortDate, titleCase } from "../../lib/format";
import { readStay, stayQuery } from "../../lib/stay";
import type { Amenity, RoomOffer } from "../../lib/types";

type HotelDetail = {
  id: number;
  name: string;
  description: string | null;
  city: string;
  state: string | null;
  address: string | null;
  pincode: string | null;
  hotel_type: string;
  star_category: number | null;
  check_in_time: string | null;
  check_out_time: string | null;
  image_url: string | null;
  images: { id: number; url: string; category: string }[];
  amenities: Amenity[];
  latitude: string | null;
  longitude: string | null;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  children_allowed: boolean;
  early_checkin_available: boolean;
  late_checkout_available: boolean;
  policy_notes: string | null;
  status: string;
  review_score: number;
  review_count: number;
  reviews: { id: number; rating: number; review_text: string | null; created_at: string; author: string }[];
};

const TABS = [
  { href: "#overview", label: "Overview" },
  { href: "#rooms", label: "Rooms" },
  { href: "#amenities", label: "Amenities" },
  { href: "#policies", label: "Policies" },
  { href: "#location", label: "Location" },
  { href: "#reviews", label: "Reviews" },
];

function to12h(time: string | null, fallback: string) {
  if (!time) return fallback;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default async function HotelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const stay = readStay(await searchParams);
  const offersQuery = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    rooms: String(stay.rooms),
    guests: String(stay.adults + stay.children),
  });

  const [hotel, rooms, checkoutConfig] = await Promise.all([
    serverFetch<HotelDetail>(`/api/hotels/${id}`),
    serverFetch<RoomOffer[]>(`/api/hotels/${id}/room-offers?${offersQuery}`),
    serverFetch<{ taxPercent: number }>(`/api/checkout/config`),
  ]);
  if (!hotel || hotel.status !== "active") notFound();

  const roomList = rooms ?? [];
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const taxRate = (checkoutConfig?.taxPercent ?? 0) / 100;
  const bookable = roomList.filter((r) => r.available !== false && r.fitsGuests);
  const lowest = bookable.flatMap((r) => r.ratePlans.map((p) => Number(p.price))).sort((a, b) => a - b)[0];
  const galleryImages = hotel.images.length ? hotel.images : hotel.image_url ? [{ id: 0, url: hotel.image_url }] : [];
  const hasMap = hotel.latitude && hotel.longitude;
  const lat = Number(hotel.latitude);
  const lng = Number(hotel.longitude);
  const address = [hotel.address, hotel.city, hotel.state, hotel.pincode].filter(Boolean).join(", ");
  const listQuery = stayQuery(stay);
  listQuery.set("city", hotel.city);

  const rules = [
    { label: "Check-in", value: `From ${to12h(hotel.check_in_time, "2:00 PM")}` },
    { label: "Check-out", value: `Until ${to12h(hotel.check_out_time, "12:00 PM")}` },
    { label: "Children", value: hotel.children_allowed ? "Welcome" : "Not allowed" },
    { label: "Pets", value: hotel.pets_allowed ? "Allowed" : "Not allowed" },
    { label: "Smoking", value: hotel.smoking_allowed ? "Allowed in designated areas" : "Non-smoking property" },
    { label: "Early check-in / late check-out", value: [hotel.early_checkin_available && "Early check-in on request", hotel.late_checkout_available && "Late check-out on request"].filter(Boolean).join(" · ") || "Not available" },
  ];

  return (
    <main className="flex-1 pb-24 lg:pb-12">
      <div className="bg-brand-900 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SearchWidget variant="compact" initialDestination={hotel.name} initialHotelId={hotel.id} initialStay={stay} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="py-3 text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-700">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href={`/hotels?${listQuery}`} className="hover:text-brand-700">Hotels in {hotel.city}</Link>
          <span className="mx-1.5">›</span>
          <span className="text-slate-700">{hotel.name}</span>
        </nav>

        {/* Title */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">{titleCase(hotel.hotel_type)}</span>
              <Stars count={hotel.star_category} />
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{hotel.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              📍 {address}
              {hasMap && (
                <a href="#location" className="ml-2 font-semibold text-brand-700 hover:underline">Show on map</a>
              )}
            </p>
          </div>
          <RatingBadge score={hotel.review_score} count={hotel.review_count} />
        </div>

        <div className="mt-4">
          {galleryImages.length ? (
            <ImageGallery images={galleryImages} alt={hotel.name} apiUrl={API_URL} />
          ) : (
            <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80">
              <Photo src={null} alt={hotel.name} sizes="100vw" />
            </div>
          )}
        </div>
      </div>

      {/* Sticky tabs */}
      <nav className="sticky top-16 z-40 mt-5 border-y border-slate-200 bg-surface/95 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <a key={t.href} href={t.href} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:text-brand-700">
              {t.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <section id="overview" className="scroll-mt-32 pt-8">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">About this property</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {hotel.description || `${hotel.name} is a ${titleCase(hotel.hotel_type).toLowerCase()} in ${hotel.city}.`}
            </p>
            {hotel.amenities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 6).map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
                    {amenityEmoji(a.name)} {a.name}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section id="rooms" className="scroll-mt-32 pt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Choose your room</h2>
                <p className="text-sm text-slate-500">
                  {shortDate(stay.checkIn)} – {shortDate(stay.checkOut)} · {nights} night{nights > 1 ? "s" : ""} · {stay.rooms} room{stay.rooms > 1 ? "s" : ""}, {stay.adults + stay.children} guest{stay.adults + stay.children > 1 ? "s" : ""}
                </p>
              </div>
              {!stay.explicit && (
                <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">Showing prices for tomorrow — change dates above</p>
              )}
            </div>
            {roomList.length === 0 ? (
              <div className="rounded-2xl bg-surface p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                No rooms are open for booking at this property yet.
              </div>
            ) : (
              <>
                {bookable.length === 0 && (
                  <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                    No rooms fit this search. Try other dates or change the number of rooms/guests above.
                  </div>
                )}
                <RoomOffers hotelId={hotel.id} rooms={roomList} stay={stay} nights={nights} taxRate={taxRate} />
              </>
            )}
          </section>

          {hotel.amenities.length > 0 && (
            <section id="amenities" className="scroll-mt-32 pt-10">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">Amenities</h2>
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-5 ring-1 ring-slate-200 sm:grid-cols-3">
                {hotel.amenities.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-100">{amenityEmoji(a.name)}</span>
                    {a.name}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="policies" className="scroll-mt-32 pt-10">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Property policies</h2>
            <dl className="divide-y divide-slate-100 rounded-2xl bg-surface ring-1 ring-slate-200">
              {rules.map((r) => (
                <div key={r.label} className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-[220px_1fr]">
                  <dt className="font-semibold text-slate-900">{r.label}</dt>
                  <dd className="text-slate-600">{r.value}</dd>
                </div>
              ))}
              {hotel.policy_notes && (
                <div className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-[220px_1fr]">
                  <dt className="font-semibold text-slate-900">Good to know</dt>
                  <dd className="whitespace-pre-line text-slate-600">{hotel.policy_notes}</dd>
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-[220px_1fr]">
                <dt className="font-semibold text-slate-900">ID proof</dt>
                <dd className="text-slate-600">A valid government photo ID is required for every adult at check-in.</dd>
              </div>
            </dl>
          </section>

          <section id="location" className="scroll-mt-32 pt-10">
            <h2 className="mb-2 text-xl font-extrabold text-slate-900">Location</h2>
            <p className="mb-3 text-sm text-slate-600">{address}</p>
            {hasMap ? (
              <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <iframe
                  title={`Map of ${hotel.name}`}
                  loading="lazy"
                  className="h-72 w-full"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.006},${lng + 0.01},${lat + 0.006}&layer=mapnik&marker=${lat},${lng}`}
                />
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-surface px-4 py-2.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            ) : (
              <p className="rounded-2xl bg-surface p-5 text-sm text-slate-500 ring-1 ring-slate-200">Map location not provided by the property.</p>
            )}
          </section>

          <section id="reviews" className="scroll-mt-32 pt-10">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Guest reviews</h2>
            {hotel.reviews.length === 0 ? (
              <p className="rounded-2xl bg-surface p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                No reviews yet — guests can review after their stay.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {hotel.reviews.map((r) => (
                  <figure key={r.id} className="rounded-2xl bg-surface p-5 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between">
                      <figcaption className="font-semibold text-slate-900">{r.author}</figcaption>
                      <span className="rounded bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">{(r.rating * 2).toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{longDate(r.created_at.slice(0, 10))}</p>
                    {r.review_text && <blockquote className="mt-2 text-sm text-slate-700">“{r.review_text}”</blockquote>}
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sticky price summary (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 mt-8 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-slate-200">
            {lowest ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Starting from</p>
                <p className="text-3xl font-extrabold text-slate-900">
                  {inr(lowest)} <span className="text-sm font-medium text-slate-500">/ night</span>
                </p>
                <p className="text-xs text-slate-500">+ {inr(Math.round(lowest * taxRate))} taxes &amp; fees</p>
              </>
            ) : (
              <p className="font-semibold text-slate-900">Not available for these dates</p>
            )}
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Check-in</dt><dd className="font-semibold">{shortDate(stay.checkIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Check-out</dt><dd className="font-semibold">{shortDate(stay.checkOut)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Guests</dt><dd className="font-semibold">{stay.rooms} room{stay.rooms > 1 ? "s" : ""} · {stay.adults + stay.children} guest{stay.adults + stay.children > 1 ? "s" : ""}</dd></div>
            </dl>
            <a href="#rooms" className="mt-4 block rounded-xl bg-accent-500 py-3 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-accent-600">
              {lowest ? "Select a room" : "Change dates"}
            </a>
            <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
              <li>✓ Instant confirmation</li>
              <li>✓ Secure payment via Razorpay</li>
              <li>✓ No hidden charges</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      {lowest && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-slate-200 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
          <div>
            <p className="text-[11px] text-slate-500">From</p>
            <p className="text-lg font-extrabold text-slate-900">
              {inr(lowest)} <span className="text-xs font-normal text-slate-500">/night + taxes</span>
            </p>
          </div>
          <a href="#rooms" className="rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-bold uppercase text-white">Select room</a>
        </div>
      )}
    </main>
  );
}
