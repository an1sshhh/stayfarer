import Link from "next/link";
import type { SearchHotel } from "../lib/types";
import { inr, titleCase } from "../lib/format";
import { Chip, Photo, RatingBadge, Stars } from "./ui";

/** Vertical card used in homepage grids. */
export default function HotelCard({ hotel, query }: { hotel: SearchHotel; query?: string }) {
  return (
    <Link
      href={query ? `/hotels/${hotel.id}?${query}` : `/hotels/${hotel.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden bg-sand-100">
        <Photo
          src={hotel.images[0]}
          alt={hotel.name}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-md bg-surface/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
          {titleCase(hotel.hotel_type)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Stars count={hotel.star_category} className="text-xs" />
        <h3 className="mt-0.5 line-clamp-1 font-bold text-slate-900 group-hover:text-brand-700">{hotel.name}</h3>
        <p className="text-sm text-slate-500">{[hotel.city, hotel.state].filter(Boolean).join(", ")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hotel.free_cancellation && <Chip tone="success">Free cancellation</Chip>}
          {hotel.breakfast && <Chip tone="brand">Breakfast available</Chip>}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <RatingBadge score={hotel.review_score} count={hotel.review_count} size="sm" />
          <div className="text-right">
            <p className="text-lg font-extrabold text-slate-900">{inr(hotel.min_price)}</p>
            <p className="text-[11px] text-slate-500">+ {inr(hotel.taxes_and_fees)} taxes / night</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
