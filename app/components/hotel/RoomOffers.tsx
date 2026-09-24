import Link from "next/link";
import { Photo } from "../ui";
import { amenityEmoji } from "../AmenityIcon";
import { cancellationSummary, inr, mealLabel, titleCase } from "../../lib/format";
import { stayQuery, type Stay } from "../../lib/stay";
import type { RoomOffer } from "../../lib/types";

/**
 * Room-by-rate table: one block per room type with its rate plans as rows,
 * the way MMT/Booking list "Room only / With breakfast / Non-refundable".
 */
export default function RoomOffers({
  hotelId,
  rooms,
  stay,
  nights,
  taxRate,
}: {
  hotelId: number;
  rooms: RoomOffer[];
  stay: Stay;
  nights: number;
  taxRate: number;
}) {
  const guests = stay.adults + stay.children;

  return (
    <div className="space-y-5">
      {rooms.map((room) => {
        const soldOut = room.available === false;
        const tooSmall = !room.fitsGuests;
        return (
          <div key={room.id} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
              {/* Room info */}
              <div className="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
                <div className="relative h-40 overflow-hidden rounded-xl bg-sand-100">
                  <Photo src={room.images[0]?.url} alt={room.name} sizes="260px" />
                  {room.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      +{room.images.length - 1} photos
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{room.name}</h3>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                  {room.size_label && <li>📐 {room.size_label}</li>}
                  {room.bed_type && <li>🛏️ {titleCase(room.bed_type)} bed</li>}
                  {room.room_view && <li>🪟 {titleCase(room.room_view)} view</li>}
                  <li>👥 Sleeps {room.max_occupancy} ({room.max_adults} adults{room.max_children ? `, ${room.max_children} children` : ""})</li>
                </ul>
                {room.amenities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {room.amenities.slice(0, 6).map((a) => (
                      <li key={a.id}>{amenityEmoji(a.name)} {a.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Rate plans */}
              <div className="divide-y divide-slate-100">
                {room.ratePlans.map((plan, idx) => {
                  const price = Number(plan.price);
                  const policy = cancellationSummary(plan.refundable, plan.cancellationPolicy, stay.checkIn);
                  const taxes = Math.round(price * taxRate);
                  const stayTotal = (price + taxes) * nights * stay.rooms;
                  const q = stayQuery(stay);
                  q.set("hotelId", String(hotelId));
                  q.set("roomTypeId", String(room.id));
                  q.set("ratePlanId", String(plan.id));
                  const cheapest = idx === 0 && room.ratePlans.length > 1;

                  return (
                    <div key={plan.id} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{plan.name}</p>
                          {cheapest && <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold uppercase text-accent-600">Best price</span>}
                        </div>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li className="text-slate-700">🍽️ {mealLabel(plan.meal_inclusion)}</li>
                          <li className={policy.free ? "font-medium text-success-700" : "text-slate-600"}>
                            {policy.free ? "✓" : "✕"} {policy.text}
                          </li>
                          {plan.inclusions.map((inc) => (
                            <li key={inc} className="text-slate-600">✓ {inc}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-row items-end justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:text-right">
                        <div className="sm:text-right">
                          <p className="text-2xl font-extrabold text-slate-900">{inr(price)}</p>
                          <p className="text-xs text-slate-500">+ {inr(taxes)} taxes &amp; fees / night</p>
                          <p className="mt-0.5 text-xs font-medium text-slate-600">
                            {inr(stayTotal)} total · {nights}N{stay.rooms > 1 ? ` × ${stay.rooms} rooms` : ""}
                          </p>
                        </div>
                        {soldOut ? (
                          <span className="rounded-lg bg-sand-100 px-4 py-2 text-sm font-bold text-slate-400">Sold out</span>
                        ) : tooSmall ? (
                          <span className="max-w-[160px] text-right text-xs font-medium text-amber-700">
                            Fits {room.max_occupancy * stay.rooms} of {guests} guests — add a room
                          </span>
                        ) : (
                          <Link
                            href={`/checkout?${q}`}
                            className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-accent-600"
                          >
                            Select room
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
