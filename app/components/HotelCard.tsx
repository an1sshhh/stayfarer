import Image from "next/image";
import Link from "next/link";
import type { Hotel } from "../lib/types";

export default function HotelCard({ hotel, apiUrl }: { hotel: Hotel; apiUrl?: string }) {
  return (
    <Link
      href={`/hotels/${hotel.id}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden bg-sand-200">
        {hotel.image_url ? (
          <Image
            src={`${apiUrl ?? ""}${hotel.image_url}`}
            alt={hotel.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
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
        <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">{hotel.hotel_type}</p>
      </div>
    </Link>
  );
}
