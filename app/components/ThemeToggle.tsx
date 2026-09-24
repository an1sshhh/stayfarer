"use client";

import { setThemePref, useThemePref, type ThemePref } from "../lib/theme";
import { usePopover } from "./search/usePopover";

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "🖥️" },
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

/** Light / Dark / System picker. "System" (the default) follows the device setting. */
export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const pref = useThemePref();
  const [open, setOpen, ref] = usePopover();
  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[0];

  if (inline) {
    return (
      <div className="flex items-center justify-between px-2">
        <span className="text-sm font-semibold text-slate-700">Theme</span>
        <div className="flex gap-1 rounded-lg bg-sand-100 p-1" role="radiogroup" aria-label="Theme">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={pref === o.value}
              onClick={() => setThemePref(o.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                pref === o.value ? "bg-surface text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Theme: ${current.label}`}
        aria-expanded={open}
        title={`Theme: ${current.label}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-base transition hover:bg-slate-50"
      >
        <span aria-hidden>{current.icon}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-slate-200" role="menu">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.value}
              onClick={() => {
                setThemePref(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-slate-50 ${
                pref === o.value ? "font-semibold text-brand-700" : "text-slate-700"
              }`}
            >
              <span aria-hidden>{o.icon}</span>
              <span className="flex-1">{o.label}</span>
              {pref === o.value && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
