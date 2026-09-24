"use client";

import { api } from "./api";
import type { Booking } from "./types";

export type PaymentOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  bookingId: number;
  bookingRef: string;
  holdExpiresAt: string | null;
  description: string;
  prefill: { name: string | null; email: string | null; contact: string | null };
};

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayFailure = { error: { description?: string; reason?: string; metadata?: { order_id?: string; payment_id?: string } } };

type RazorpayInstance = { open: () => void; on: (event: "payment.failed", cb: (r: RazorpayFailure) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(el);
  });
  return scriptPromise;
}

export type PaymentOutcome =
  | { status: "paid"; booking: Booking }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

/**
 * Opens Razorpay Checkout for a server-created order and resolves once the
 * guest pays (and the server has verified the signature), closes the
 * window, or the attempt fails. Razorpay lets the guest retry inside the
 * same window after a failure, so "failed" only resolves when they close it.
 */
export async function payWithRazorpay(order: PaymentOrder): Promise<PaymentOutcome> {
  await loadScript();
  if (!window.Razorpay) throw new Error("Payment window unavailable");

  return new Promise<PaymentOutcome>((resolve) => {
    let lastFailure: string | null = null;
    let settled = false;
    const finish = (outcome: PaymentOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };

    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "Stay Farer",
      description: order.description,
      image: `${window.location.origin}/brand/icon-badge.svg`,
      prefill: {
        name: order.prefill.name ?? undefined,
        email: order.prefill.email ?? undefined,
        contact: order.prefill.contact ?? undefined,
      },
      notes: { booking_ref: order.bookingRef },
      theme: { color: "#1f58c4" },
      retry: { enabled: true, max_count: 3 },
      handler: async (resp: RazorpaySuccess) => {
        try {
          const booking = await api<Booking>("/api/checkout/verify", { method: "POST", auth: true, body: JSON.stringify(resp) });
          finish({ status: "paid", booking });
        } catch (err) {
          finish({
            status: "failed",
            message: `${(err as Error).message}. If money was debited, it will be confirmed automatically or refunded — reference ${order.bookingRef}.`,
          });
        }
      },
      modal: {
        confirm_close: true,
        ondismiss: () => finish(lastFailure ? { status: "failed", message: lastFailure } : { status: "dismissed" }),
      },
    });

    rzp.on("payment.failed", (resp) => {
      lastFailure = resp.error?.description || "Payment failed";
      api(`/api/checkout/bookings/${order.bookingId}/payment-failed`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          razorpay_order_id: resp.error?.metadata?.order_id ?? order.orderId,
          razorpay_payment_id: resp.error?.metadata?.payment_id,
          reason: lastFailure,
        }),
      }).catch(() => {});
    });

    rzp.open();
  });
}

/** Asks the server for a (re)usable order on an existing pending booking. */
export function createOrderForBooking(bookingId: number) {
  return api<PaymentOrder>(`/api/checkout/bookings/${bookingId}/pay`, { method: "POST", auth: true });
}
