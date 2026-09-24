"use client";

import { useMemo, useState } from "react";
import { isoDate, parseISO, todayISO } from "../../lib/format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MAX_NIGHTS = 30;

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(isoDate(new Date(year, month, d)));
  return cells;
}

/**
 * Two-month range calendar (one month on phones). First click picks
 * check-in, second picks check-out; clicking before check-in restarts.
 */
export default function DateRangeCalendar({
  checkIn,
  checkOut,
  onChange,
  onDone,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  onDone?: () => void;
}) {
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = parseISO(checkIn || today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [picking, setPicking] = useState<"in" | "out">("in");
  const [hover, setHover] = useState<string | null>(null);

  const months = useMemo(() => {
    const second = new Date(cursor.year, cursor.month + 1, 1);
    return [
      { year: cursor.year, month: cursor.month },
      { year: second.getFullYear(), month: second.getMonth() },
    ];
  }, [cursor]);

  const canGoBack = cursor.year > new Date().getFullYear() || cursor.month > new Date().getMonth();
  const rangeEnd = picking === "out" && hover && hover > checkIn ? hover : checkOut;

  function shift(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  function pick(day: string) {
    if (picking === "in" || day <= checkIn) {
      const nextOut = isoDate(new Date(parseISO(day).getTime() + 86400000));
      onChange(day, nextOut);
      setPicking("out");
      return;
    }
    const maxOut = isoDate(new Date(parseISO(checkIn).getTime() + MAX_NIGHTS * 86400000));
    onChange(checkIn, day > maxOut ? maxOut : day);
    setPicking("in");
    onDone?.();
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-sand-100 disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-xs font-medium text-slate-500">
          {picking === "in" ? "Select check-in date" : "Select check-out date"}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-sand-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {months.map(({ year, month }, idx) => (
          <div key={`${year}-${month}`} className={idx === 1 ? "hidden sm:block" : ""}>
            <p className="mb-2 text-center text-sm font-semibold text-slate-900">
              {new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-slate-400">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5 text-sm" onMouseLeave={() => setHover(null)}>
              {monthGrid(year, month).map((day, i) => {
                if (!day) return <span key={`e${i}`} />;
                const past = day < today;
                const isStart = day === checkIn;
                const isEnd = day === rangeEnd;
                const inRange = day > checkIn && day < rangeEnd;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={past}
                    onClick={() => pick(day)}
                    onMouseEnter={() => setHover(day)}
                    aria-label={parseISO(day).toDateString()}
                    aria-pressed={isStart || isEnd}
                    className={[
                      "relative h-9 w-full transition",
                      past ? "cursor-not-allowed text-slate-300" : "text-slate-800",
                      inRange ? "bg-brand-50" : "",
                      isStart ? "rounded-l-full bg-brand-600 font-semibold text-white" : "",
                      isEnd ? "rounded-r-full bg-brand-600 font-semibold text-white" : "",
                      !past && !isStart && !isEnd && !inRange ? "rounded-full hover:bg-sand-100" : "",
                    ].join(" ")}
                  >
                    {parseISO(day).getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
