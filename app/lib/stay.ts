import { addDays, isValidISO, todayISO } from "./format";

/** A search's stay parameters, normalised from URL query values. */
export type Stay = { checkIn: string; checkOut: string; rooms: number; adults: number; children: number };

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const int = (v: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function readStay(params: Raw): Stay & { explicit: boolean } {
  const rawIn = one(params.checkIn);
  const rawOut = one(params.checkOut);
  const explicit = isValidISO(rawIn) && isValidISO(rawOut) && rawOut > rawIn && rawIn >= todayISO();
  const checkIn = explicit ? rawIn! : todayISO(1);
  const checkOut = explicit ? rawOut! : addDays(checkIn, 1);
  const rooms = int(one(params.rooms), 1, 1, 8);
  // Older links only carry `guests`; treat them as adults.
  const adults = int(one(params.adults) ?? one(params.guests), 2, rooms, 32);
  const children = int(one(params.children), 0, 0, 24);
  return { checkIn, checkOut, rooms, adults, children, explicit };
}

export function stayQuery(stay: Stay): URLSearchParams {
  return new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    rooms: String(stay.rooms),
    adults: String(stay.adults),
    children: String(stay.children),
    guests: String(stay.adults + stay.children),
  });
}
