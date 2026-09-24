"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BookingStatus from "../../components/BookingStatus";
import HoldTimer from "../../components/HoldTimer";
import { Photo } from "../../components/ui";
import { EmptyArt } from "../../components/art";
import { api, getToken } from "../../lib/api";
import { addDays, cancellationSummary, inr, longDate, mealLabel, shortDate, titleCase } from "../../lib/format";
import { createOrderForBooking, payWithRazorpay } from "../../lib/razorpay";
import type { Booking } from "../../lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Voucher({ id }: { id: string }) {
  const router = useRouter();
  const justPaid = useSearchParams().get("status") === "success";
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const load = useCallback(() => {
    api<Booking>(`/api/bookings/${id}`, { auth: true })
      .then(setBooking)
      .catch((e) => {
        if (e.status === 401) router.replace(`/login?next=/bookings/${id}`);
        else setError(e.status === 403 || e.status === 404 ? "We couldn't find this booking on your account." : e.message);
      });
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/bookings/${id}`);
      return;
    }
    load();
  }, [id, load, router]);

  async function completePayment() {
    if (!booking) return;
    setPaying(true);
    setPayError("");
    try {
      const outcome = await payWithRazorpay(await createOrderForBooking(booking.id));
      if (outcome.status === "paid") {
        setBooking(outcome.booking);
        router.replace(`/bookings/${booking.id}?status=success`);
      } else if (outcome.status === "failed") {
        setPayError(outcome.message);
      }
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <EmptyArt kind="search" />
        <p className="mt-2 font-semibold text-slate-900">{error}</p>
        <Link href="/bookings" className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Go to My Trips</Link>
      </main>
    );
  }
  if (!booking) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-10">
        <div className="h-28 animate-pulse rounded-2xl bg-surface" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface" />
      </main>
    );
  }

  const b = booking;
  const holdActive = b.booking_status === "pending" && b.hold_expires_at && new Date(b.hold_expires_at) > new Date();
  const holdLapsed = b.booking_status === "pending" && b.hold_expires_at && !holdActive;
  const paid = b.payments?.find((p) => ["captured", "refunded", "partially_refunded"].includes(p.status));
  const policy = cancellationSummary(!!b.refundable, b.cancellationPolicy ?? [], b.check_in);

  return (
    <main className="flex-1 pb-12">
      {justPaid && b.booking_status === "confirmed" && (
        <div className="bg-success-600 px-4 py-6 text-white sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-2xl text-success-600">✓</span>
            <div>
              <h1 className="text-xl font-extrabold">Booking confirmed!</h1>
              <p className="text-sm text-white/90">
                Payment received. Your reference is <b className="font-mono">{b.booking_ref}</b> — keep it handy at check-in.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href="/bookings" className="text-sm font-semibold text-brand-700 hover:underline">← My Trips</Link>
          <button onClick={() => window.print()} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-surface">
            🖨 Print / Save PDF
          </button>
        </div>

        {holdActive && (
          <div className="no-print mb-5 flex flex-col gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-amber-900">Payment pending</p>
              <p className="text-sm text-amber-900">
                Your room is held for <HoldTimer until={b.hold_expires_at!} onExpire={load} />. Complete payment to confirm this booking.
              </p>
              {payError && <p className="mt-1 text-sm font-medium text-red-700">{payError}</p>}
            </div>
            <button onClick={completePayment} disabled={paying}
              className="shrink-0 rounded-xl bg-accent-500 px-6 py-3 text-sm font-extrabold uppercase text-white hover:bg-accent-600 disabled:opacity-60">
              {paying ? "Opening…" : `Pay ${inr(b.total_amount, { decimals: true })}`}
            </button>
          </div>
        )}
        {holdLapsed && (
          <div className="no-print mb-5 rounded-2xl bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
            The payment window for this booking has closed and the room is being released. <Link href={`/hotels/${b.hotel_id}`} className="font-bold underline">Book again</Link>
          </div>
        )}

        <article className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200">
          {/* Voucher header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-brand-900 px-5 py-4 text-white sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/75">Hotel voucher</p>
              <p className="font-mono text-xl font-extrabold tracking-wider">{b.booking_ref}</p>
            </div>
            <BookingStatus booking={b} />
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_300px]">
            <div className="p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                  <Photo src={b.hotel_image_url} alt={b.hotel_name} sizes="96px" compact />
                </div>
                <div className="min-w-0">
                  <Link href={`/hotels/${b.hotel_id}`} className="text-lg font-extrabold text-slate-900 hover:text-brand-700">{b.hotel_name}</Link>
                  <p className="text-sm text-slate-500">{[b.hotel_address, b.hotel_city].filter(Boolean).join(", ")}</p>
                  {b.hotel_phone && <p className="text-sm text-slate-500">☎ {b.hotel_phone}</p>}
                  {b.latitude && b.longitude && (
                    <a href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">
                      Get directions ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-sand-50 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Check-in</p>
                  <p className="font-bold text-slate-900">{shortDate(b.check_in)}</p>
                  <p className="text-xs text-slate-500">from {b.check_in_time ?? "14:00"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Check-out</p>
                  <p className="font-bold text-slate-900">{shortDate(b.check_out)}</p>
                  <p className="text-xs text-slate-500">until {b.check_out_time ?? "12:00"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-bold text-slate-900">{b.nights} night{b.nights > 1 ? "s" : ""}</p>
                </div>
              </div>

              <dl className="mt-5 divide-y divide-slate-100">
                <Row label="Room" value={`${b.num_rooms} × ${b.room_type_name ?? "Room"}`} />
                <Row label="Rate plan" value={b.rate_plan_name ?? "—"} />
                <Row label="Meals" value={mealLabel(b.meal_inclusion)} />
                <Row label="Guests" value={`${b.guests} guest${b.guests > 1 ? "s" : ""}`} />
                <Row label="Lead guest" value={b.guest_name ?? "—"} />
                <Row label="Contact" value={[b.guest_email, b.guest_phone && `+91 ${b.guest_phone}`].filter(Boolean).join(" · ") || "—"} />
                {b.special_requests && <Row label="Requests" value={b.special_requests} />}
                <Row label="Booked on" value={longDate(b.created_at.slice(0, 10))} />
              </dl>

              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-900">Cancellation policy</p>
                <p className={`mt-1 text-sm ${policy.free ? "text-success-700" : "text-slate-600"}`}>{policy.text}</p>
                {(b.cancellationPolicy?.length ?? 0) > 0 && b.refundable && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {b.cancellationPolicy!.map((s, i) => (
                      <li key={i}>
                        • {s.days_before_checkin > 0 ? `Until ${longDate(addDays(b.check_in, -s.days_before_checkin))}` : "On check-in day"}: {s.refund_percent}% refund
                      </li>
                    ))}
                  </ul>
                )}
                {["pending", "confirmed"].includes(b.booking_status) && (
                  <p className="mt-2 text-xs text-slate-500">
                    Need to cancel or change dates? Email <a href={`mailto:support@stayfarer.in?subject=Cancellation ${b.booking_ref}`} className="font-semibold text-brand-700">support@stayfarer.in</a> with your reference.
                  </p>
                )}
              </div>

              {b.booking_status === "cancelled" && (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-bold">Booking cancelled{b.cancelled_at ? ` on ${longDate(b.cancelled_at.slice(0, 10))}` : ""}</p>
                  {b.cancellation_reason && <p className="mt-0.5">{b.cancellation_reason}</p>}
                </div>
              )}
            </div>

            {/* Payment column */}
            <div className="border-t border-slate-100 bg-sand-50/60 p-5 sm:p-6 md:border-l md:border-t-0">
              <p className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Payment summary</p>
              <dl className="mt-3">
                <Row label="Room charges" value={inr(b.room_price, { decimals: true })} />
                {Number(b.discount_amount) > 0 && <Row label="Discount" value={<span className="text-success-700">−{inr(b.discount_amount, { decimals: true })}</span>} />}
                <Row label="Taxes" value={inr(b.tax_amount, { decimals: true })} />
                {Number(b.fee_amount) > 0 && <Row label="Fees" value={inr(b.fee_amount, { decimals: true })} />}
              </dl>
              <div className="mt-2 flex justify-between border-t border-dashed border-slate-300 pt-3">
                <span className="font-extrabold text-slate-900">Total</span>
                <span className="text-xl font-extrabold text-slate-900">{inr(b.total_amount, { decimals: true })}</span>
              </div>

              <div className="mt-4 rounded-xl bg-surface p-3 text-sm ring-1 ring-slate-200">
                {paid ? (
                  <>
                    <p className="font-semibold text-success-700">✓ Paid {inr(paid.amount, { decimals: true })}</p>
                    <p className="text-xs text-slate-500">
                      {paid.method ? `via ${titleCase(paid.method)}` : "Online"}
                      {paid.captured_at ? ` · ${longDate(paid.captured_at.slice(0, 10))}` : ""}
                    </p>
                    {paid.razorpay_payment_id && <p className="mt-0.5 break-all font-mono text-[11px] text-slate-400">{paid.razorpay_payment_id}</p>}
                  </>
                ) : b.booking_status === "pending" && !b.hold_expires_at ? (
                  <p className="text-slate-600">Payment to be settled with the property.</p>
                ) : (
                  <p className="text-slate-600">No payment received.</p>
                )}
              </div>

              {(b.refunds?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {b.refunds!.map((r) => (
                    <div key={r.id} className="rounded-xl bg-surface p-3 text-sm ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-900">Refund {inr(r.amount, { decimals: true })}</p>
                      <p className="text-xs text-slate-500">
                        {r.status === "completed" ? "Credited to your original payment method" : r.status === "failed" ? "Refund failed — our team will contact you" : "Processing · usually 5–7 working days"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

export default function BookingVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Voucher id={id} />
    </Suspense>
  );
}
