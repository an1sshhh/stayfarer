"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function RoomBookingCard({ hotelId, room }: { hotelId: number; room: RoomType }) {
  const router = useRouter();
  const cheapestPlan =
    room.ratePlans && room.ratePlans.length > 0
      ? room.ratePlans.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b))
      : null;

  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(2));
  const [guests, setGuests] = useState(2);

  function handleBook() {
    if (!cheapestPlan) return;
    const params = new URLSearchParams({
      roomTypeId: String(room.id),
      ratePlanId: String(cheapestPlan.id),
      checkIn,
      checkOut,
      guests: String(guests),
    });
    router.push(`/hotels/${hotelId}/book?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold text-stone-900">{room.name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          {room.bed_type && <span>🛏️ {room.bed_type}</span>}
          <span>👤 Sleeps {room.max_occupancy ?? room.max_adults ?? "-"}</span>
        </p>
        {room.description && <p className="mt-2 text-sm text-stone-600">{room.description}</p>}

        {cheapestPlan && (
          <div className="mt-4 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-stone-500">Check-in</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-stone-500">Check-out</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-stone-500">Guests</label>
              <input
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-16 rounded-lg border border-stone-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        {cheapestPlan ? (
          <>
            <p className="text-xs text-stone-400">per night from</p>
            <p className="text-xl font-bold text-stone-900">
              ₹{Number(cheapestPlan.price).toLocaleString("en-IN")}
            </p>
            <button
              onClick={handleBook}
              className="mt-2 rounded-full bg-accent-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Book Now
            </button>
          </>
        ) : (
          <p className="text-sm text-stone-400">Price on request</p>
        )}
      </div>
    </div>
  );
}
