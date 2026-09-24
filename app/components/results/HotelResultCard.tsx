import Link from "next/link";
import ImageCarousel from "./ImageCarousel";
import { Chip, RatingBadge, Stars } from "../ui";
import { amenityEmoji } from "../AmenityIcon";
import { inr, titleCase } from "../../lib/format";
import type { SearchHotel } from "../../lib/types";

/** Horizontal OTA result card: photos | details | price column. */
export default function HotelResultCard({ hotel, query, nights, rooms }: { hotel: SearchHotel; query: string; nights: number; rooms: number }) {
  const href = `/hotels/${hotel.id}?${query}`;
  const stayTotal = (hotel.min_price + hotel.taxes_and_fees) * nights * rooms;

  return (
    <article className="group overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg hover:ring-brand-200">
      <Link href={href} className="grid grid-cols-1 md:grid-cols-[280px_1fr_200px]">
        <div className="relative h-52 md:h-full md:min-h-[220px]">
          <ImageCarousel images={hotel.images} alt={hotel.name} />
          <span className="absolute left-3 top-3 rounded-md bg-surface/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
            {titleCase(hotel.hotel_type)}
          </span>
        </div>

        <div className="min-w-0 p-4 md:border-r md:border-dashed md:border-slate-200 md:p-5">
          <div className="flex items-center gap-2">
            <Stars count={hotel.star_category} className="text-sm" />
          </div>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900 group-hover:text-brand-700">{hotel.name}</h3>
          <p className="text-sm text-brand-700">
            📍 {[hotel.address, hotel.city].filter(Boolean).join(", ")}
          </p>

          {hotel.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{hotel.description}</p>}

          {hotel.amenities.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {hotel.amenities.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-1">
                  <span aria-hidden>{amenityEmoji(a.name)}</span>
                  {a.name}
                </li>
              ))}
              {hotel.amenities.length > 5 && <li className="font-semibold text-brand-700">+{hotel.amenities.length - 5} more</li>}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {hotel.free_cancellation && <Chip tone="success">✓ Free cancellation</Chip>}
            {hotel.breakfast && <Chip tone="brand">☕ Breakfast available</Chip>}
            <Chip tone="neutral">⚡ Instant confirmation</Chip>
          </div>
        </div>

        <div className="flex flex-row items-end justify-between gap-3 border-t border-slate-100 p-4 md:flex-col md:items-end md:border-t-0 md:p-5">
          <RatingBadge score={hotel.review_score} count={hotel.review_count} size="sm" />
          <div className="text-right">
            <p className="text-2xl font-extrabold text-slate-900">{inr(hotel.min_price)}</p>
            <p className="text-xs text-slate-500">+ {inr(hotel.taxes_and_fees)} taxes &amp; fees / night</p>
            {(nights > 1 || rooms > 1) && (
              <p className="mt-1 text-xs font-medium text-slate-600">
                {inr(stayTotal)} for {nights} night{nights > 1 ? "s" : ""}
                {rooms > 1 ? `, ${rooms} rooms` : ""}
              </p>
            )}
            <span className="mt-3 inline-block rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white transition group-hover:bg-brand-500">
              View rooms
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
