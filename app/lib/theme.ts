"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "theme";
const EVENT = "themechange";

/**
 * Runs in <head> before first paint (see layout.tsx). With no saved choice it
 * does nothing and the CSS media query follows the device, so there is never
 * a flash of the wrong theme.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function read(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, read, () => "system");
}

export function setThemePref(pref: ThemePref) {
  const root = document.documentElement;
  // Brief colour transition so the switch feels deliberate, removed right after.
  root.classList.add("theme-transition");
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Private mode etc.: the choice still applies for this page view.
  }
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  window.dispatchEvent(new Event(EVENT));
  window.setTimeout(() => root.classList.remove("theme-transition"), 250);
}
