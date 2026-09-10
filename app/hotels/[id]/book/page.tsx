"use client";

import { use, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type BookingResult = { id: number; total_amount: string; booking_status: string };

function BookForm({ hotelId }: { hotelId: string }) {
  const searchParams = useSearchParams();

  const roomTypeId = searchParams.get("roomTypeId") ?? "";
  const ratePlanId = searchParams.get("ratePlanId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = searchParams.get("guests") ?? "1";

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);

  const currentUrl =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  useEffect(() => {
    setAuthed(!!localStorage.getItem("token"));
  }, []);

  async function confirmBooking() {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hotelId: Number(hotelId),
          roomTypeId: Number(roomTypeId),
          ratePlanId: Number(ratePlanId),
          checkIn,
          checkOut,
          guests: Number(guests),
          numRooms: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not complete booking");
        return;
      }
      setResult(data.data);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  if (authed === null) {
    return <main className="flex-1" />;
  }

  return (
    <main className="flex min-h-[calc(100vh-140px)] flex-1 items-center justify-center bg-sand-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-lg shadow-brand-900/5">
        {result ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl text-brand-700">
              ✓
            </div>
            <h1 className="mb-2 font-display text-xl font-semibold text-stone-900">
              Booking confirmed!
            </h1>
            <p className="text-sm text-stone-500">
              Booking #{result.id} · Status: {result.booking_status}
            </p>
            <p className="mt-3 text-2xl font-bold text-stone-900">
              ₹{Number(result.total_amount).toLocaleString("en-IN")}
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-brand-700 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Back to home
            </Link>
          </div>
        ) : !authed ? (
          <div>
            <h1 className="mb-2 font-display text-xl font-semibold text-stone-900">
              Sign in to book
            </h1>
            <p className="mb-6 text-sm text-stone-600">
              Create a free account or sign in to complete this booking.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(currentUrl)}`}
                className="rounded-full bg-brand-700 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
              >
                Log in
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(currentUrl)}`}
                className="rounded-full border border-stone-300 py-2.5 text-center text-sm font-semibold text-stone-700 hover:bg-sand-50"
              >
                Create an account
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="mb-4 font-display text-xl font-semibold text-stone-900">
              Confirm your booking
            </h1>
            <dl className="mb-6 space-y-3 rounded-xl bg-sand-50 p-4 text-sm text-stone-600">
              <div className="flex justify-between">
                <dt>Check-in</dt>
                <dd className="font-medium text-stone-900">{checkIn}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Check-out</dt>
                <dd className="font-medium text-stone-900">{checkOut}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Guests</dt>
                <dd className="font-medium text-stone-900">{guests}</dd>
              </div>
            </dl>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              onClick={confirmBooking}
              disabled={submitting}
              className="w-full rounded-full bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50"
            >
              {submitting ? "Booking..." : "Confirm booking"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: hotelId } = use(params);
  return (
    <Suspense>
      <BookForm hotelId={hotelId} />
    </Suspense>
  );
}
