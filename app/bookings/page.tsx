"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BookingStatus, { refundLabel } from "../components/BookingStatus";
import { Photo } from "../components/ui";
import { EmptyArt } from "../components/art";
import { api, getToken } from "../lib/api";
import { inr, nightsBetween, shortDate, todayISO } from "../lib/format";
import type { Booking } from "../lib/types";

type Tab = "upcoming" | "completed" | "cancelled";

function bucket(b: Booking): Tab {
  if (b.booking_status === "cancelled" || b.booking_status === "refunded") return "cancelled";
  if (b.booking_status === "checked_out" || b.check_out < todayISO()) return "completed";
  return "upcoming";
}

const EMPTY: Record<Tab, string> = {
  upcoming: "No upcoming trips. Time to plan one?",
  completed: "Stays you've completed will show up here.",
  cancelled: "You have no cancelled bookings.",
};

export default function MyTripsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/bookings");
      return;
    }
    api<Booking[]>("/api/bookings/mine", { auth: true })
      .then(setBookings)
      .catch((e) => {
        if (e.status === 401) router.replace("/login?next=/bookings");
        else setError(e.message);
      });
  }, [router]);

  const counts = { upcoming: 0, completed: 0, cancelled: 0 };
  bookings?.forEach((b) => counts[bucket(b)]++);
  const visible = (bookings ?? [])
    .filter((b) => bucket(b) === tab)
    .sort((a, b) => (tab === "upcoming" ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in)));

  return (
    <main className="flex-1">
      <div className="bg-brand-900 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-extrabold">My Trips</h1>
          <p className="text-sm text-white/75">View vouchers, complete pending payments and track refunds</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex gap-1 rounded-xl bg-surface p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex" role="tablist">
          {(["upcoming", "completed", "cancelled"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition sm:flex-none ${tab === t ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {t} {bookings && <span className="ml-1 opacity-75">({counts[t]})</span>}
            </button>
          ))}
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        {!bookings && !error ? (
          <div className="space-y-3">
            {[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface" />)}
          </div>
        ) : bookings && visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-slate-200">
            <EmptyArt kind="trips" />
            <p className="mt-2 font-semibold text-slate-900">{EMPTY[tab]}</p>
            <Link href="/hotels" className="mt-4 inline-block rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-bold text-white">Explore hotels</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {visible.map((b) => {
              const awaitingPayment = b.booking_status === "pending" && b.hold_expires_at && new Date(b.hold_expires_at) > new Date();
              const nights = nightsBetween(b.check_in, b.check_out);
              return (
                <li key={b.id}>
                  <Link href={`/bookings/${b.id}`} className="group grid grid-cols-1 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200 transition hover:shadow-md sm:grid-cols-[180px_1fr_auto]">
                    <div className="relative h-36 bg-sand-100 sm:h-full">
                      <Photo src={b.hotel_image_url} alt={b.hotel_name} sizes="180px" />
                    </div>
                    <div className="min-w-0 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <BookingStatus booking={b} />
                        {refundLabel(b.payment_status) && <span className="text-xs font-semibold text-slate-500">{refundLabel(b.payment_status)}</span>}
                      </div>
                      <h2 className="mt-1.5 text-lg font-bold text-slate-900 group-hover:text-brand-700">{b.hotel_name}</h2>
                      <p className="text-sm text-slate-500">{b.hotel_city}</p>
                      <p className="mt-2 text-sm text-slate-700">
                        <b>{shortDate(b.check_in)}</b> → <b>{shortDate(b.check_out)}</b> · {nights} night{nights > 1 ? "s" : ""} · {b.num_rooms} × {b.room_type_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 p-4 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:p-5">
                      <div className="sm:text-right">
                        <p className="font-mono text-xs font-semibold text-slate-500">{b.booking_ref}</p>
                        <p className="text-lg font-extrabold text-slate-900">{inr(b.total_amount, { decimals: true })}</p>
                      </div>
                      <span className={`rounded-lg px-4 py-2 text-sm font-bold ${awaitingPayment ? "bg-accent-500 text-white" : "text-brand-700 ring-1 ring-brand-200"}`}>
                        {awaitingPayment ? "Complete payment" : "View voucher"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
