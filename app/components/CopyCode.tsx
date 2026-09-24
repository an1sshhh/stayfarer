"use client";

import { useState } from "react";

export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-brand-500 bg-brand-50 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-brand-700 transition hover:bg-brand-100"
      aria-label={`Copy coupon code ${code}`}
    >
      {code}
      <span className="font-sans text-[11px] font-semibold tracking-normal text-brand-700">{copied ? "Copied ✓" : "Copy"}</span>
    </button>
  );
}
