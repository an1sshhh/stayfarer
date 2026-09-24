import Image from "next/image";
import { imageUrl, scoreLabel } from "../lib/format";
import { HotelIllustration, Scene, type SceneTheme } from "./art";

export function Stars({ count, className = "" }: { count: number | null | undefined; className?: string }) {
  if (!count) return null;
  return (
    <span className={`inline-flex text-amber-400 ${className}`} aria-label={`${count} star property`} title={`${count}-star`}>
      {"★".repeat(count)}
    </span>
  );
}

/** Booking.com-style score chip; shows "New" until a property has published reviews. */
export function RatingBadge({ score, count, size = "md" }: { score: number; count: number; size?: "sm" | "md" }) {
  if (!count) {
    return (
      <span className="inline-flex items-center rounded-md bg-sand-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
        New on Stay Farer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`rounded-md rounded-bl-none bg-brand-600 font-bold text-white ${size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"}`}>
        {score.toFixed(1)}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">{scoreLabel(score)}</span>
        <span className="block text-xs text-slate-500">{count} review{count > 1 ? "s" : ""}</span>
      </span>
    </span>
  );
}

/**
 * Hotel/room/destination photo. Without an image it falls back to artwork:
 * a travel scene when `scene` is given (destinations), otherwise the hotel
 * illustration (`compact` drops its caption for small thumbnails).
 */
export function Photo({
  src,
  alt,
  sizes,
  className = "",
  priority,
  scene,
  compact,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  scene?: SceneTheme;
  compact?: boolean;
}) {
  const url = imageUrl(src);
  if (!url) return scene ? <Scene theme={scene} className={className} /> : <HotelIllustration compact={compact} />;
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "brand" | "accent" }) {
  const tones = {
    neutral: "bg-sand-100 text-slate-600",
    success: "bg-success-50 text-success-700",
    brand: "bg-brand-50 text-brand-700",
    accent: "bg-accent-50 text-accent-600",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
