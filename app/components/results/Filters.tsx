"use client";

import { useEffect, useState } from "react";
import { useQueryUpdater } from "./useQueryUpdater";
import { inr, titleCase } from "../../lib/format";
import type { SearchFacets } from "../../lib/types";

const RATINGS = [
  { value: "9", label: "Exceptional: 9+" },
  { value: "8", label: "Excellent: 8+" },
  { value: "7", label: "Very good: 7+" },
  { value: "6", label: "Good: 6+" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 px-4 py-4 last:border-0">
      <p className="mb-2.5 text-sm font-bold text-slate-900">{title}</p>
      {children}
    </div>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: React.ReactNode; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-slate-400">{count}</span>}
    </label>
  );
}

/** Builds four price buckets across the facet range, rounded to friendly numbers. */
function priceBuckets(min: number, max: number) {
  if (max <= min) return [];
  const round = (n: number) => (n < 2000 ? Math.round(n / 250) * 250 : Math.round(n / 1000) * 1000);
  const step = (max - min) / 4;
  const edges = [0, round(min + step), round(min + 2 * step), round(min + 3 * step)].filter((v, i, a) => i === 0 || v > a[i - 1]);
  return edges.map((lo, i) => ({ lo, hi: edges[i + 1] ?? null }));
}

function PriceRange({ initialMin, initialMax, onApply }: { initialMin: string; initialMax: string; onApply: (min: string, max: string) => void }) {
  const [minPrice, setMinPrice] = useState(initialMin);
  const [maxPrice, setMaxPrice] = useState(initialMax);
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(minPrice, maxPrice);
      }}
    >
      <input
        inputMode="numeric"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
        placeholder="Min"
        aria-label="Minimum price"
        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
      <span className="text-slate-400">–</span>
      <input
        inputMode="numeric"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
        placeholder="Max"
        aria-label="Maximum price"
        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
      <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-500">
        Go
      </button>
    </form>
  );
}

function FilterPanel({ facets }: { facets: SearchFacets }) {
  const { params, update, pending } = useQueryUpdater();
  const list = (key: string) => (params.get(key) ? params.get(key)!.split(",") : []);
  const toggleIn = (key: string, value: string) => {
    const cur = list(key);
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    update({ [key]: next.length ? next.join(",") : null });
  };

  const activeCount = ["stars", "types", "amenities", "rating", "minPrice", "maxPrice", "freeCancellation", "breakfast"].filter((k) => params.get(k)).length;
  const starKeys = Object.keys(facets.stars).map(Number).sort((a, b) => b - a);

  return (
    <div className={`transition ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Filters</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => update({ stars: null, types: null, amenities: null, rating: null, minPrice: null, maxPrice: null, freeCancellation: null, breakfast: null })}
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <Section title="Popular filters">
        <Check
          checked={params.get("freeCancellation") === "true"}
          onChange={() => update({ freeCancellation: params.get("freeCancellation") === "true" ? null : "true" })}
          label="Free cancellation"
          count={facets.freeCancellation}
        />
        <Check
          checked={params.get("breakfast") === "true"}
          onChange={() => update({ breakfast: params.get("breakfast") === "true" ? null : "true" })}
          label="Breakfast included"
          count={facets.breakfast}
        />
      </Section>

      <Section title="Price per night">
        <div className="space-y-0.5">
          {priceBuckets(facets.price.min, facets.price.max).map(({ lo, hi }) => {
            const active = (params.get("minPrice") ?? "") === (lo ? String(lo) : "") && (params.get("maxPrice") ?? "") === (hi ? String(hi) : "");
            return (
              <Check
                key={lo}
                checked={active && !!(params.get("minPrice") || params.get("maxPrice"))}
                onChange={() => (active ? update({ minPrice: null, maxPrice: null }) : update({ minPrice: lo ? String(lo) : null, maxPrice: hi ? String(hi) : null }))}
                label={hi ? `${lo ? inr(lo) : "Up to"}${lo ? " – " : " "}${inr(hi)}` : `${inr(lo)}+`}
              />
            );
          })}
        </div>
        {/* Re-keyed on the URL values so the inputs reset when filters change elsewhere. */}
        <PriceRange
          key={`${params.get("minPrice")}-${params.get("maxPrice")}`}
          initialMin={params.get("minPrice") ?? ""}
          initialMax={params.get("maxPrice") ?? ""}
          onApply={(min, max) => update({ minPrice: min || null, maxPrice: max || null })}
        />
      </Section>

      {starKeys.length > 0 && (
        <Section title="Star category">
          {starKeys.map((star) => (
            <Check
              key={star}
              checked={list("stars").includes(String(star))}
              onChange={() => toggleIn("stars", String(star))}
              label={star ? <span><span className="text-amber-400">{"★".repeat(star)}</span> {star} Star</span> : "Unrated"}
              count={facets.stars[star]}
            />
          ))}
        </Section>
      )}

      <Section title="Guest rating">
        {RATINGS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700">
            <input
              type="radio"
              name="rating"
              checked={params.get("rating") === r.value}
              onChange={() => update({ rating: r.value })}
              onClick={() => params.get("rating") === r.value && update({ rating: null })}
              className="h-4 w-4 accent-brand-600"
            />
            {r.label}
          </label>
        ))}
      </Section>

      {Object.keys(facets.types).length > 1 && (
        <Section title="Property type">
          {Object.entries(facets.types).map(([type, count]) => (
            <Check key={type} checked={list("types").includes(type)} onChange={() => toggleIn("types", type)} label={titleCase(type)} count={count} />
          ))}
        </Section>
      )}

      {facets.amenities.length > 0 && (
        <Section title="Amenities">
          {facets.amenities.map((a) => (
            <Check
              key={a.id}
              checked={list("amenities").includes(String(a.id))}
              onChange={() => toggleIn("amenities", String(a.id))}
              label={a.name}
              count={a.count}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

/** Sidebar on desktop; "Filters" button + bottom sheet on mobile. */
export default function Filters({ facets }: { facets: SearchFacets }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside className="hidden overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200 lg:block">
        <FilterPanel facets={facets} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 lg:hidden"
      >
        ⚙ Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface">
            <FilterPanel facets={facets} />
            <div className="sticky bottom-0 border-t border-slate-100 bg-surface p-3">
              <button type="button" onClick={() => setOpen(false)} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white">
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
