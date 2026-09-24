"use client";

export type Occupancy = { rooms: number; adults: number; children: number };

export const MAX_ROOMS = 8;
const MAX_GUESTS_PER_ROOM = 4;

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-lg leading-none text-brand-700 transition hover:border-brand-500 disabled:border-slate-200 disabled:text-slate-300"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-lg leading-none text-brand-700 transition hover:border-brand-500 disabled:border-slate-200 disabled:text-slate-300"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Rooms / adults / children steppers that keep the combination sensible. */
export default function GuestCounter({ value, onChange }: { value: Occupancy; onChange: (v: Occupancy) => void }) {
  const cap = value.rooms * MAX_GUESTS_PER_ROOM;
  return (
    <div className="divide-y divide-slate-100">
      <Stepper
        label="Rooms"
        hint={`Up to ${MAX_ROOMS}`}
        value={value.rooms}
        min={1}
        max={MAX_ROOMS}
        onChange={(rooms) => onChange({ ...value, rooms, adults: Math.max(value.adults, rooms) })}
      />
      <Stepper
        label="Adults"
        hint="13 years & above"
        value={value.adults}
        min={value.rooms}
        max={cap - value.children}
        onChange={(adults) => onChange({ ...value, adults })}
      />
      <Stepper
        label="Children"
        hint="0 – 12 years"
        value={value.children}
        min={0}
        max={cap - value.adults}
        onChange={(children) => onChange({ ...value, children })}
      />
    </div>
  );
}

export function occupancyLabel({ rooms, adults, children }: Occupancy): string {
  const parts = [`${rooms} Room${rooms > 1 ? "s" : ""}`, `${adults} Adult${adults > 1 ? "s" : ""}`];
  if (children) parts.push(`${children} Child${children > 1 ? "ren" : ""}`);
  return parts.join(", ");
}
