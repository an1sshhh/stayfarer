"use client";

import { useEffect, useState } from "react";

/** "Room held for 12:34" countdown; calls onExpire once when it hits zero. */
export default function HoldTimer({ until, onExpire }: { until: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(() => new Date(until).getTime() - Date.now());

  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(until).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);

  useEffect(() => {
    if (left <= 0) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);

  if (left <= 0) return <span className="font-semibold text-red-700">Hold expired</span>;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="font-mono font-bold tabular-nums">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
