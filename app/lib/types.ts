export type Amenity = { id: number; name: string };

export type SearchHotel = {
  id: number;
  name: string;
  city: string;
  state: string | null;
  address: string | null;
  hotel_type: string;
  star_category: number | null;
  description: string | null;
  min_price: number;
  taxes_and_fees: number;
  review_score: number;
  review_count: number;
  free_cancellation: boolean;
  breakfast: boolean;
  amenities: Amenity[];
  images: string[];
};

export type SearchFacets = {
  price: { min: number; max: number };
  stars: Record<string, number>;
  types: Record<string, number>;
  amenities: (Amenity & { count: number })[];
  freeCancellation: number;
  breakfast: number;
};

export type SearchResponse = {
  data: SearchHotel[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  facets: SearchFacets;
};

export type CancellationSlab = { id?: number; days_before_checkin: number; refund_percent: number };

export type RatePlan = {
  id: number;
  name: string;
  price: string;
  meal_inclusion: string;
  refundable: boolean;
  inclusions: string[];
  cancellationPolicy: CancellationSlab[];
};

export type RoomOffer = {
  id: number;
  name: string;
  description: string | null;
  size_label: string | null;
  bed_type: string | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  room_view: string | null;
  images: { id: number; url: string }[];
  amenities: Amenity[];
  ratePlans: RatePlan[];
  available?: boolean | null;
  fitsGuests: boolean;
};

export type Pricing = {
  roomPrice: number;
  taxAmount: number;
  feeAmount: number;
  discountAmount: number;
  totalAmount: number;
};

export type Booking = {
  id: number;
  booking_ref: string;
  hotel_id: number;
  hotel_name: string;
  hotel_city?: string;
  hotel_address?: string | null;
  hotel_phone?: string | null;
  hotel_image_url?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  room_type_name: string | null;
  rate_plan_name: string | null;
  meal_inclusion?: string | null;
  refundable?: boolean | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  num_rooms: number;
  room_price: string;
  tax_amount: string;
  fee_amount: string;
  discount_amount: string;
  total_amount: string;
  booking_status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "refunded";
  payment_status: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  special_requests: string | null;
  hold_expires_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  payments?: { id: number; amount: string; status: string; method: string | null; razorpay_payment_id: string | null; captured_at: string | null; created_at: string }[];
  refunds?: { id: number; amount: string; status: string; reason: string | null; created_at: string }[];
  cancellationPolicy?: CancellationSlab[];
};

export type User = { id: number; name: string; email: string; role: string };

/** An offer published from the admin panel (GET /api/offers). */
export type Offer = {
  id: number;
  title: string;
  subtitle: string | null;
  badge: string | null;
  terms: string | null;
  image_url: string | null;
  theme: string;
  cta_label: string | null;
  cta_url: string | null;
  valid_until: string | null;
  coupon: {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: string;
    min_booking_amount: string;
    max_discount: string | null;
  } | null;
};
