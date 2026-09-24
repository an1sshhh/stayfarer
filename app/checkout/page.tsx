"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import HoldTimer from "../components/HoldTimer";
import { Photo, Stars } from "../components/ui";
import { api, useSession } from "../lib/api";
import { addDays, cancellationSummary, inr, longDate, mealLabel, nightsBetween, shortDate } from "../lib/format";
import { createOrderForBooking, payWithRazorpay, type PaymentOrder } from "../lib/razorpay";
import { readStay } from "../lib/stay";
import type { CancellationSlab, Offer, Pricing } from "../lib/types";
import { couponSummary } from "../components/OfferCard";
import { EmptyArt } from "../components/art";

type Quote = {
  available: boolean;
  nights: number;
  hotel: { id: number; name: string; city: string; address: string | null; image_url: string | null; star_category: number | null; check_in_time: string | null; check_out_time: string | null };
  roomType: { id: number; name: string; bed_type: string | null; max_occupancy: number };
  ratePlan: { id: number; name: string; price: string; meal_inclusion: string; refundable: boolean };
  cancellationPolicy: CancellationSlab[];
  pricing: Pricing;
  coupon: { code: string } | null;
};
type Config = { enabled: boolean; holdMinutes: number };

const REQUEST_CHIPS = ["Early check-in", "Late check-out", "High floor", "Twin beds", "Quiet room", "Airport pickup"];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>{children}</section>;
}

function Checkout() {
  const router = useRouter();
  const sp = useSearchParams();
  const stay = useMemo(() => readStay(Object.fromEntries(sp.entries())), [sp]);
  const hotelId = Number(sp.get("hotelId"));
  const roomTypeId = Number(sp.get("roomTypeId"));
  const ratePlanId = Number(sp.get("ratePlanId"));
  const guests = stay.adults + stay.children;

  const user = useSession();
  const authed = user === undefined ? null : !!user;
  const [config, setConfig] = useState<Config | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadError, setLoadError] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);

  // null = untouched, so the fields show the signed-in user's details until edited.
  const [nameInput, setName] = useState<string | null>(null);
  const [emailInput, setEmail] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? "";
  const email = emailInput ?? user?.email ?? "";
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState<string[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [agree, setAgree] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applying, setApplying] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [pending, setPending] = useState<PaymentOrder | null>(null);
  const [, rerender] = useState(0);

  const baseBody = useMemo(
    () => ({ hotelId, roomTypeId, ratePlanId, checkIn: stay.checkIn, checkOut: stay.checkOut, guests, numRooms: stay.rooms }),
    [hotelId, roomTypeId, ratePlanId, stay, guests]
  );

  const loadQuote = useCallback(
    async (couponCode?: string) => {
      const data = await api<Quote>("/api/checkout/quote", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ ...baseBody, couponCode: couponCode || undefined }),
      });
      setQuote(data);
      return data;
    },
    [baseBody]
  );

  useEffect(() => {
    api<Config>("/api/checkout/config").then(setConfig).catch(() => setConfig({ enabled: false, holdMinutes: 15 }));
    api<Offer[]>("/api/offers?placement=checkout").then(setOffers).catch(() => {});
    if (!hotelId || !roomTypeId || !ratePlanId) return;
    api<Quote>("/api/checkout/quote", { method: "POST", auth: true, body: JSON.stringify(baseBody) })
      .then(setQuote)
      .catch((e) => setLoadError(e.message));
  }, [hotelId, roomTypeId, ratePlanId, baseBody]);

  async function applyCoupon(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setApplying(true);
    setCouponError("");
    try {
      await loadQuote(trimmed);
      setCouponInput(trimmed);
    } catch (e) {
      setCouponError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  async function removeCoupon() {
    setCouponInput("");
    setCouponError("");
    await loadQuote().catch(() => {});
  }

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter the lead guest's full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email — your voucher is sent here";
    if (phone.replace(/\D/g, "").length !== 10) next.phone = "Enter a 10-digit mobile number";
    if (!agree) next.agree = "Please accept the booking policies";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function runPayment(order: PaymentOrder) {
    setPending(order);
    const outcome = await payWithRazorpay(order);
    if (outcome.status === "paid") {
      router.replace(`/bookings/${outcome.booking.id}?status=success`);
      return;
    }
    setPaying(false);
    setPayError(outcome.status === "failed" ? outcome.message : "");
  }

  async function pay() {
    setPayError("");
    if (!authed) {
      router.push(`/login?next=${encodeURIComponent(`/checkout?${sp.toString()}`)}`);
      return;
    }
    if (!validate()) {
      document.getElementById("guest-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setPaying(true);
    try {
      if (pending) {
        await runPayment(await createOrderForBooking(pending.bookingId));
        return;
      }
      const specialRequests = [...requests, requestNote.trim()].filter(Boolean).join("; ");
      const { payment } = await api<{ booking: { id: number }; payment: PaymentOrder }>("/api/checkout/bookings", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          ...baseBody,
          couponCode: quote?.coupon?.code,
          guestName: name.trim(),
          guestEmail: email.trim(),
          guestPhone: phone.replace(/\D/g, ""),
          specialRequests: specialRequests || undefined,
        }),
      });
      await runPayment(payment);
    } catch (e) {
      setPaying(false);
      setPayError((e as Error).message);
    }
  }

  const error = !hotelId || !roomTypeId || !ratePlanId ? "This room selection is incomplete. Please pick a room again." : loadError;
  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <EmptyArt kind="error" />
        <h1 className="mt-3 text-xl font-extrabold text-slate-900">We couldn&apos;t prepare this booking</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <Link href={hotelId ? `/hotels/${hotelId}` : "/hotels"} className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
          Choose another room
        </Link>
      </main>
    );
  }

  if (!quote || authed === null || !config) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-surface" />
            <div className="h-72 rounded-2xl bg-surface" />
          </div>
          <div className="h-80 rounded-2xl bg-surface" />
        </div>
      </main>
    );
  }

  const policy = cancellationSummary(quote.ratePlan.refundable, quote.cancellationPolicy, stay.checkIn);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const p = quote.pricing;
  const holdExpired = pending?.holdExpiresAt ? new Date(pending.holdExpiresAt) < new Date() : false;

  return (
    <main className="flex-1 pb-28 lg:pb-12">
      <div className="bg-brand-900 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ol className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/75">
            <li>1. Select room ✓</li>
            <li aria-hidden>›</li>
            <li className="text-white">2. Review &amp; guest details</li>
            <li aria-hidden>›</li>
            <li>3. Pay</li>
          </ol>
          <h1 className="text-2xl font-extrabold">Review your booking</h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {/* Property + stay */}
          <Card>
            <div className="flex gap-4">
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-sand-100 sm:h-28 sm:w-36">
                <Photo src={quote.hotel.image_url} alt={quote.hotel.name} sizes="144px" compact />
              </div>
              <div className="min-w-0">
                <Stars count={quote.hotel.star_category} className="text-xs" />
                <h2 className="text-lg font-extrabold text-slate-900">{quote.hotel.name}</h2>
                <p className="text-sm text-slate-500">{[quote.hotel.address, quote.hotel.city].filter(Boolean).join(", ")}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-sand-50 p-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Check-in</p>
                <p className="font-bold text-slate-900">{shortDate(stay.checkIn)}</p>
                <p className="text-xs text-slate-500">From {quote.hotel.check_in_time ?? "14:00"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Check-out</p>
                <p className="font-bold text-slate-900">{shortDate(stay.checkOut)}</p>
                <p className="text-xs text-slate-500">Until {quote.hotel.check_out_time ?? "12:00"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stay</p>
                <p className="font-bold text-slate-900">{nights} night{nights > 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Rooms &amp; guests</p>
                <p className="font-bold text-slate-900">{stay.rooms} room{stay.rooms > 1 ? "s" : ""} · {guests} guest{guests > 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="font-bold text-slate-900">
                {stay.rooms} × {quote.roomType.name}
              </p>
              <ul className="mt-1.5 space-y-1 text-sm">
                <li className="text-slate-700">🏷️ {quote.ratePlan.name}</li>
                {mealLabel(quote.ratePlan.meal_inclusion).toLowerCase() !== quote.ratePlan.name.toLowerCase() && (
                  <li className="text-slate-700">🍽️ {mealLabel(quote.ratePlan.meal_inclusion)}</li>
                )}
                <li className={policy.free ? "font-semibold text-success-700" : "text-slate-600"}>{policy.free ? "✓" : "✕"} {policy.text}</li>
              </ul>
            </div>
            {!quote.available && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                This room just sold out for your dates. <Link href={`/hotels/${hotelId}`} className="underline">Pick another room</Link>.
              </p>
            )}
          </Card>

          {/* Cancellation policy */}
          <Card>
            <h2 className="text-lg font-extrabold text-slate-900">Cancellation policy</h2>
            {!quote.ratePlan.refundable ? (
              <p className="mt-2 text-sm text-slate-600">This is a non-refundable rate. No refund is due if you cancel, change or don&apos;t show up.</p>
            ) : quote.cancellationPolicy.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">Free cancellation — a full refund is due if you cancel before check-in.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {quote.cancellationPolicy.map((slab, i) => {
                  const until = addDays(stay.checkIn, -slab.days_before_checkin);
                  return (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${slab.refund_percent >= 100 ? "bg-success-600" : slab.refund_percent > 0 ? "bg-amber-500" : "bg-red-500"}`} />
                      <span className="text-slate-700">
                        Cancel {slab.days_before_checkin > 0 ? `${slab.days_before_checkin}+ days before check-in` : "on or after check-in day"}
:{" "}
                        <b className="text-slate-900">{slab.refund_percent}% refund</b>
                        {slab.days_before_checkin > 0 && <span className="text-slate-500"> (until {longDate(until)})</span>}
                      </span>
                    </li>
                  );
                })}
                <li className="text-xs text-slate-500">Cancellations are handled by our support team — email support@stayfarer.in with your booking reference.</li>
              </ol>
            )}
          </Card>

          {/* Guest details */}
          <Card>
            <div id="guest-details" className="scroll-mt-24" />
            <h2 className="text-lg font-extrabold text-slate-900">Guest details</h2>
            {!authed && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
                <p className="text-sm text-slate-800">
                  <b>Log in</b> to book faster and find this trip later under My Trips.
                </p>
                <div className="flex gap-2">
                  <Link href={`/login?next=${encodeURIComponent(`/checkout?${sp.toString()}`)}`} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-bold text-white">
                    Log in
                  </Link>
                  <Link href={`/register?next=${encodeURIComponent(`/checkout?${sp.toString()}`)}`} className="rounded-lg bg-surface px-4 py-1.5 text-sm font-bold text-brand-700 ring-1 ring-brand-200">
                    Sign up
                  </Link>
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Full name (as on ID)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${errors.name ? "border-red-400" : "border-slate-300 focus:border-brand-500"}`} />
                {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${errors.email ? "border-red-400" : "border-slate-300 focus:border-brand-500"}`} />
                {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile number</span>
                <div className={`flex overflow-hidden rounded-xl border focus-within:ring-2 focus-within:ring-brand-500/30 ${errors.phone ? "border-red-400" : "border-slate-300 focus-within:border-brand-500"}`}>
                  <span className="flex items-center bg-sand-50 px-3 text-sm font-semibold text-slate-600">+91</span>
                  <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} autoComplete="tel-national"
                    className="w-full px-3 py-2.5 text-sm focus:outline-none" placeholder="98765 43210" />
                </div>
                {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
              </label>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-slate-900">Special requests <span className="font-normal text-slate-500">(optional, subject to availability)</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                {REQUEST_CHIPS.map((chip) => {
                  const on = requests.includes(chip);
                  return (
                    <button key={chip} type="button" aria-pressed={on}
                      onClick={() => setRequests((r) => (on ? r.filter((x) => x !== chip) : [...r, chip]))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                      {on ? "✓ " : ""}{chip}
                    </button>
                  );
                })}
              </div>
              <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} rows={2} maxLength={500}
                placeholder="Anything else the property should know?"
                className="mt-3 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            </div>
          </Card>
        </div>

        {/* Price summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4">
            <Card className="!p-0">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-extrabold text-slate-900">Price breakup</h2>
              </div>
              <dl className="space-y-2.5 px-5 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">
                    {stay.rooms} room{stay.rooms > 1 ? "s" : ""} × {nights} night{nights > 1 ? "s" : ""}
                    <span className="block text-xs text-slate-400">{inr(quote.ratePlan.price)} per room per night</span>
                  </dt>
                  <dd className="font-semibold text-slate-900">{inr(p.roomPrice, { decimals: true })}</dd>
                </div>
                {p.discountAmount > 0 && (
                  <div className="flex justify-between text-success-700">
                    <dt>Coupon discount ({quote.coupon?.code})</dt>
                    <dd className="font-semibold">−{inr(p.discountAmount, { decimals: true })}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-600">Taxes</dt>
                  <dd className="font-semibold text-slate-900">{inr(p.taxAmount, { decimals: true })}</dd>
                </div>
                {p.feeAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Service fee</dt>
                    <dd className="font-semibold text-slate-900">{inr(p.feeAmount, { decimals: true })}</dd>
                  </div>
                )}
              </dl>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-5 py-4">
                <span className="font-extrabold text-slate-900">Total amount</span>
                <span className="text-2xl font-extrabold text-slate-900">{inr(p.totalAmount, { decimals: true })}</span>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Coupons &amp; offers</h2>
              {quote.coupon ? (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-success-600/30 bg-success-50 px-3 py-2.5">
                  <div>
                    <p className="font-mono text-sm font-bold text-success-700">{quote.coupon.code}</p>
                    <p className="text-xs text-success-700">You save {inr(p.discountAmount, { decimals: true })}</p>
                  </div>
                  <button type="button" onClick={removeCoupon} className="text-xs font-bold text-slate-500 hover:text-red-600">Remove</button>
                </div>
              ) : (
                <>
                  <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); applyCoupon(couponInput); }}>
                    <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      placeholder="Enter coupon code" aria-label="Coupon code"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-brand-500 focus:outline-none" />
                    <button type="submit" disabled={applying || !couponInput.trim()} className="rounded-xl px-4 text-sm font-bold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50">
                      {applying ? "…" : "Apply"}
                    </button>
                  </form>
                  {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
                  {offers.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {offers.filter((o) => o.coupon).slice(0, 3).map((o) => (
                        <li key={o.id}>
                          <button type="button" onClick={() => applyCoupon(o.coupon!.code)} disabled={applying}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left hover:border-brand-500 hover:bg-brand-50/50">
                            <span className="min-w-0">
                              <span className="block font-mono text-sm font-bold text-slate-900">{o.coupon!.code}</span>
                              <span className="block truncate text-xs text-slate-500">{o.title}</span>
                              <span className="block text-xs text-slate-500">{couponSummary(o.coupon!)}</span>
                            </span>
                            <span className="shrink-0 text-xs font-bold text-brand-700">Apply</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Card>

            <Card>
              {pending?.holdExpiresAt && !holdExpired && (
                <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  Room held for <HoldTimer until={pending.holdExpiresAt} onExpire={() => rerender((n) => n + 1)} /> — complete payment to confirm.
                </div>
              )}
              {holdExpired && (
                <div className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  Your room hold expired. <Link href={`/hotels/${hotelId}`} className="font-bold underline">Search again</Link>
                </div>
              )}
              {payError && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{payError}</p>}
              <label className="mb-3 flex items-start gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>I agree to the booking &amp; cancellation policies and confirm guests carry a valid photo ID.</span>
              </label>
              {errors.agree && <p className="-mt-2 mb-2 text-xs text-red-600">{errors.agree}</p>}
              <button type="button" onClick={pay} disabled={paying || !quote.available || !config.enabled || holdExpired}
                className="w-full rounded-xl bg-accent-500 py-3.5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-accent-500/30 transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                {paying ? "Processing…" : !authed ? "Log in to pay" : pending ? `Retry payment · ${inr(p.totalAmount, { decimals: true })}` : `Pay ${inr(p.totalAmount, { decimals: true })}`}
              </button>
              {!config.enabled && (
                <p className="mt-2 text-center text-xs font-medium text-red-700">Online payments are temporarily unavailable. Please try again later.</p>
              )}
              <p className="mt-3 text-center text-[11px] text-slate-500">
                🔒 Secured by Razorpay · UPI, cards, netbanking &amp; wallets
              </p>
              <p className="mt-1 text-center text-[11px] text-slate-400">
                Your room is held for {config.holdMinutes} minutes while you pay.
              </p>
            </Card>
          </div>
        </aside>
      </div>

      {/* Mobile pay bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-slate-200 bg-surface px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{inr(p.totalAmount, { decimals: true })}</p>
          <p className="text-[11px] text-slate-500">incl. taxes{p.discountAmount > 0 ? ` · saved ${inr(p.discountAmount)}` : ""}</p>
        </div>
        <button type="button" onClick={pay} disabled={paying || !quote.available || !config.enabled || holdExpired}
          className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-extrabold uppercase text-white disabled:opacity-50">
          {paying ? "…" : !authed ? "Log in to pay" : "Pay now"}
        </button>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
