"use client";

import { useQueryUpdater } from "./useQueryUpdater";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top reviewed" },
  { value: "stars_desc", label: "Star rating" },
];

export default function SortBar() {
  const { params, update, pending } = useQueryUpdater();
  const current = params.get("sort") || "recommended";

  return (
    <div className={`flex items-center gap-2 transition ${pending ? "opacity-60" : ""}`}>
      <span className="hidden shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500 sm:inline">Sort by</span>
      <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 ring-1 ring-slate-200">
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => update({ sort: s.value === "recommended" ? null : s.value })}
            aria-pressed={current === s.value}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              current === s.value ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
