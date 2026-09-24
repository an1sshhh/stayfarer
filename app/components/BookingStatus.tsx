import type { Booking } from "../lib/types";

const LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Awaiting payment", tone: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", tone: "bg-success-50 text-success-700" },
  checked_in: { label: "Checked in", tone: "bg-brand-50 text-brand-700" },
  checked_out: { label: "Completed", tone: "bg-sand-100 text-slate-700" },
  cancelled: { label: "Cancelled", tone: "bg-red-50 text-red-700" },
  refunded: { label: "Refunded", tone: "bg-sand-100 text-slate-700" },
};

export function statusOf(b: Pick<Booking, "booking_status" | "payment_status" | "hold_expires_at">) {
  // A pending booking with no online hold is one an admin will confirm (e.g. pay at hotel).
  if (b.booking_status === "pending" && !b.hold_expires_at) return { label: "Pending confirmation", tone: "bg-amber-100 text-amber-800" };
  return LABELS[b.booking_status] ?? { label: b.booking_status, tone: "bg-sand-100 text-slate-700" };
}

export default function BookingStatus({ booking }: { booking: Pick<Booking, "booking_status" | "payment_status" | "hold_expires_at"> }) {
  const s = statusOf(booking);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${s.tone}`}>{s.label}</span>;
}

export function refundLabel(paymentStatus: string) {
  if (paymentStatus === "refunded") return "Refunded in full";
  if (paymentStatus === "partially_refunded") return "Partially refunded";
  return null;
}
