"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function SearchBar({ initialCity = "" }: { initialCity?: string }) {
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(2));
  const [guests, setGuests] = useState(2);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      city,
      checkIn,
      checkOut,
      guests: String(guests),
    });
    router.push(`/hotels?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-xl shadow-brand-900/10 ring-1 ring-black/5 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end sm:p-3"
    >
      <div className="sm:border-r sm:border-stone-200 sm:pr-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
          City or hotel
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Where are you going?"
          className="w-full rounded-lg border-0 px-2 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="sm:border-r sm:border-stone-200 sm:pr-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
          Check-in
        </label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full rounded-lg border-0 px-2 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="sm:border-r sm:border-stone-200 sm:pr-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
          Check-out
        </label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full rounded-lg border-0 px-2 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-400">
          Guests
        </label>
        <input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-16 rounded-lg border-0 px-2 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 sm:py-2.5"
      >
        Search
      </button>
    </form>
  );
}
