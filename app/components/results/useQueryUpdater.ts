"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Patch the current URL's query (null deletes a key) and reset to page 1. */
export function useQueryUpdater() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page");
    startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
  }

  return { params, update, pending };
}
