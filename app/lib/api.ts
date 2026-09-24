"use client";

import { useMemo, useSyncExternalStore } from "react";
import { API_URL } from "./format";
import type { User } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("authchange", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("authchange", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function sessionSnapshot(): string | null {
  try {
    return localStorage.getItem("token") ? localStorage.getItem("user") : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user, kept in sync with login/logout in this and other tabs.
 * `undefined` during server render / hydration (unknown yet), `null` when signed out.
 */
export function useSession(): User | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, sessionSnapshot, () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, [raw]);
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("authchange"));
}

/** Client-side fetch against the API's `{ success, data, message }` envelope. */
export async function api<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && init.auth) clearSession();
  if (!res.ok) throw new ApiError(json.message || "Something went wrong", res.status);
  return json.data as T;
}
