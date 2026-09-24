import { redirect } from "next/navigation";

/** Old booking links (pre-checkout redesign) forward to the new checkout page. */
export default async function LegacyBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
  q.set("hotelId", id);
  redirect(`/checkout?${q}`);
}
