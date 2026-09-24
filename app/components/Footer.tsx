import Link from "next/link";

const COLUMNS = [
  {
    title: "Stay Farer",
    links: [
      { href: "/hotels", label: "Search hotels" },
      { href: "/offers", label: "Offers & coupons" },
      { href: "/bookings", label: "My Trips" },
    ],
  },
  {
    title: "Popular stays",
    links: [
      { href: "/hotels?city=Goa", label: "Hotels in Goa" },
      { href: "/hotels?city=Udaipur", label: "Hotels in Udaipur" },
      { href: "/hotels?city=Rishikesh", label: "Hotels in Rishikesh" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "mailto:support@stayfarer.in", label: "support@stayfarer.in" },
      { href: "/#faq", label: "FAQs" },
      { href: "/bookings", label: "Manage a booking" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-brand-900 text-white/75">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <p className="text-lg font-extrabold text-white">
            Stay<span className="text-accent-500">Farer</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-white/55">
            Hand-picked hotels, resorts and villas across India — booked in minutes with instant confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded border border-white/15 px-2 py-1">UPI</span>
            <span className="rounded border border-white/15 px-2 py-1">Cards</span>
            <span className="rounded border border-white/15 px-2 py-1">Netbanking</span>
            <span className="rounded border border-white/15 px-2 py-1">Wallets</span>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-white">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/55 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Stay Farer. All rights reserved.</p>
          <p>Payments secured by Razorpay · 256-bit SSL</p>
        </div>
      </div>
    </footer>
  );
}
