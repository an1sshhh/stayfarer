"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestCounter, { occupancyLabel, type Occupancy } from "./GuestCounter";
import { usePopover } from "./usePopover";
import { API_URL, nightsBetween, shortDate } from "../../lib/format";
import { stayQuery, type Stay } from "../../lib/stay";

type Suggestions = {
  cities: { city: string; state: string | null; hotelCount: number }[];
  hotels: { id: number; name: string; city: string; state: string | null }[];
};

function FieldShell({
  label,
  children,
  onClick,
  active,
  compact,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-start rounded-xl border px-4 text-left transition ${
        compact ? "py-2" : "py-3"
      } ${active ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </button>
  );
}

/**
 * The OTA search box: destination autocomplete, range calendar, and a
 * rooms/guests picker. `variant="hero"` is the big homepage card;
 * `variant="compact"` is the one-line bar on results/detail pages.
 */
export default function SearchWidget({
  initialDestination = "",
  initialHotelId = null,
  initialStay,
  variant = "hero",
}: {
  initialDestination?: string;
  /** Pre-selects a property so "Search" re-checks that hotel (detail page). */
  initialHotelId?: number | null;
  initialStay: Stay;
  variant?: "hero" | "compact";
}) {
  const router = useRouter();
  const compact = variant === "compact";
  const [destination, setDestination] = useState(initialDestination);
  const [hotelId, setHotelId] = useState<number | null>(initialHotelId);
  const [checkIn, setCheckIn] = useState(initialStay.checkIn);
  const [checkOut, setCheckOut] = useState(initialStay.checkOut);
  const [occupancy, setOccupancy] = useState<Occupancy>({
    rooms: initialStay.rooms,
    adults: initialStay.adults,
    children: initialStay.children,
  });
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [destError, setDestError] = useState(false);

  const [destOpen, setDestOpen, destRef] = usePopover();
  const [datesOpen, setDatesOpen, datesRef] = usePopover();
  const [guestsOpen, setGuestsOpen, guestsRef] = usePopover();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced destination suggestions (also shows popular cities on focus).
  useEffect(() => {
    if (!destOpen) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${API_URL}/api/hotels/suggest?q=${encodeURIComponent(destination.trim())}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => setSuggestions(j.data ?? null))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [destination, destOpen]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = stayQuery({ checkIn, checkOut, ...occupancy });
    if (hotelId) {
      router.push(`/hotels/${hotelId}?${query}`);
      return;
    }
    if (!destination.trim() && !compact) {
      setDestError(true);
      setDestOpen(true);
      inputRef.current?.focus();
      return;
    }
    if (destination.trim()) query.set("city", destination.trim());
    router.push(`/hotels?${query}`);
  }

  const nights = nightsBetween(checkIn, checkOut);

  const destinationField = (
    <div ref={destRef} className="relative">
      <label
        className={`flex w-full flex-col rounded-xl border px-4 transition ${compact ? "py-2" : "py-3"} ${
          destOpen ? "border-brand-500 ring-2 ring-brand-500/20" : destError ? "border-red-400" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">City, area or property</span>
        <input
          ref={inputRef}
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            setHotelId(null);
            setDestError(false);
            setDestOpen(true);
          }}
          onFocus={() => setDestOpen(true)}
          placeholder="Where do you want to stay?"
          autoComplete="off"
          className={`w-full bg-transparent font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none ${
            compact ? "text-sm" : "text-lg"
          }`}
        />
      </label>
      {destError && <p className="mt-1 text-xs text-red-600">Please enter a city or property</p>}
      {destOpen && suggestions && (suggestions.cities.length > 0 || suggestions.hotels.length > 0) && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[300px] overflow-hidden rounded-xl bg-surface py-2 shadow-2xl ring-1 ring-black/5">
          {suggestions.cities.length > 0 && (
            <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {destination.trim() ? "Cities" : "Popular destinations"}
            </p>
          )}
          {suggestions.cities.map((c) => (
            <button
              key={`${c.city}-${c.state}`}
              type="button"
              onClick={() => {
                setDestination(c.city);
                setHotelId(null);
                setDestOpen(false);
                setDatesOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-sm">📍</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{c.city}</span>
                <span className="block truncate text-xs text-slate-500">{[c.state, "India"].filter(Boolean).join(", ")}</span>
              </span>
              <span className="text-xs text-slate-400">{c.hotelCount} {c.hotelCount === 1 ? "property" : "properties"}</span>
            </button>
          ))}
          {suggestions.hotels.length > 0 && (
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Properties</p>
          )}
          {suggestions.hotels.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setDestination(h.name);
                setHotelId(h.id);
                setDestOpen(false);
                setDatesOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-sm">🏨</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{h.name}</span>
                <span className="block truncate text-xs text-slate-500">{[h.city, h.state].filter(Boolean).join(", ")}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const datesField = (
    <div ref={datesRef} className="relative">
      <div className="grid grid-cols-2 gap-2">
        <FieldShell label="Check-in" active={datesOpen} compact={compact} onClick={() => setDatesOpen(!datesOpen)}>
          <span className={`font-semibold text-slate-900 ${compact ? "text-sm" : "text-lg"}`}>{shortDate(checkIn)}</span>
        </FieldShell>
        <FieldShell label="Check-out" active={datesOpen} compact={compact} onClick={() => setDatesOpen(!datesOpen)}>
          <span className={`font-semibold text-slate-900 ${compact ? "text-sm" : "text-lg"}`}>{shortDate(checkOut)}</span>
        </FieldShell>
      </div>
      {datesOpen && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,640px)] -translate-x-1/2 rounded-2xl bg-surface p-5 shadow-2xl ring-1 ring-black/5 lg:left-0 lg:translate-x-0">
          <DateRangeCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(i, o) => {
              setCheckIn(i);
              setCheckOut(o);
            }}
            onDone={() => {
              setDatesOpen(false);
              setGuestsOpen(true);
            }}
          />
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{nights}</span> night{nights > 1 ? "s" : ""} · {shortDate(checkIn)} – {shortDate(checkOut)}
            </p>
            <button
              type="button"
              onClick={() => setDatesOpen(false)}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-500"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const guestsField = (
    <div ref={guestsRef} className="relative">
      <FieldShell label="Rooms & guests" active={guestsOpen} compact={compact} onClick={() => setGuestsOpen(!guestsOpen)}>
        <span className={`truncate font-semibold text-slate-900 ${compact ? "text-sm" : "text-lg"}`}>
          {occupancyLabel(occupancy)}
        </span>
      </FieldShell>
      {guestsOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,320px)] rounded-2xl bg-surface px-5 py-2 shadow-2xl ring-1 ring-black/5">
          <GuestCounter value={occupancy} onChange={setOccupancy} />
          <button
            type="button"
            onClick={() => setGuestsOpen(false)}
            className="mb-2 mt-1 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-2 rounded-2xl bg-surface p-2 shadow-lg ring-1 ring-black/5 md:grid-cols-[1.3fr_1.5fr_1.1fr_auto]"
      >
        {destinationField}
        {datesField}
        {guestsField}
        <button
          type="submit"
          className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-accent-600"
        >
          {initialHotelId ? "Update" : "Search"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="relative rounded-3xl bg-surface p-4 pb-10 shadow-2xl shadow-brand-900/20 sm:p-6 sm:pb-12">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1.6fr_1.1fr]">
        {destinationField}
        {datesField}
        {guestsField}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Why book with us:</span>
        <span className="rounded-full bg-success-50 px-2.5 py-1 font-medium text-success-700">Free cancellation on most stays</span>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">Secure payments by Razorpay</span>
        <span className="rounded-full bg-sand-100 px-2.5 py-1 font-medium text-slate-600">Instant confirmation</span>
      </div>
      <button
        type="submit"
        className="absolute bottom-0 left-1/2 w-[min(80%,280px)] -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-r from-accent-500 to-[#ff8a4c] py-3.5 text-lg font-extrabold uppercase tracking-wider text-white shadow-lg shadow-accent-500/40 transition hover:brightness-105"
      >
        Search
      </button>
    </form>
  );
}
