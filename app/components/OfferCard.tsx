import Image from "next/image";
import Link from "next/link";
import CopyCode from "./CopyCode";
import { Scene, asSceneTheme } from "./art";
import { imageUrl, inr, longDate } from "../lib/format";
import type { Offer } from "../lib/types";

/** Discount line for a coupon, e.g. "10% off up to ₹1,000 · min. booking ₹3,000". */
export function couponSummary(c: NonNullable<Offer["coupon"]>) {
  const main =
    c.discount_type === "percentage"
      ? `${Number(c.discount_value)}% off${c.max_discount ? ` up to ${inr(c.max_discount)}` : ""}`
      : `Flat ${inr(c.discount_value)} off`;
  return Number(c.min_booking_amount) > 0 ? `${main} · min. booking ${inr(c.min_booking_amount)}` : main;
}

/**
 * Offer banner as published from the admin panel: the admin's image, or the
 * chosen illustration when there isn't one, with copy laid over it.
 */
export default function OfferCard({ offer, size = "md" }: { offer: Offer; size?: "md" | "lg" }) {
  const src = imageUrl(offer.image_url);
  const href = offer.cta_url && offer.cta_url.startsWith("/") && !offer.cta_url.startsWith("//") ? offer.cta_url : "/hotels";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg">
      <div className={`relative overflow-hidden text-white ${size === "lg" ? "h-52" : "h-44"}`}>
        {src ? (
          <Image src={src} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" className="object-cover" />
        ) : (
          <Scene theme={asSceneTheme(offer.theme)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end gap-1 p-5">
          {offer.badge && (
            <span className="self-start rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
              {offer.badge}
            </span>
          )}
          <h3 className={`font-extrabold leading-tight drop-shadow ${size === "lg" ? "text-2xl" : "text-xl"}`}>{offer.title}</h3>
          {offer.subtitle && <p className="line-clamp-2 text-sm text-white/90 drop-shadow">{offer.subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {offer.coupon && <p className="text-sm font-semibold text-slate-800">{couponSummary(offer.coupon)}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          {offer.coupon ? <CopyCode code={offer.coupon.code} /> : <span />}
          <Link href={href} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-600">
            {offer.cta_label || "Book now"} →
          </Link>
        </div>
        {(offer.valid_until || offer.terms) && (
          <div className="border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
            {offer.valid_until && <span>Valid till {longDate(offer.valid_until)}</span>}
            {offer.terms && (
              <details className="mt-1 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer font-semibold text-brand-700">Terms &amp; conditions</summary>
                <p className="mt-1 whitespace-pre-line">{offer.terms}</p>
              </details>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
