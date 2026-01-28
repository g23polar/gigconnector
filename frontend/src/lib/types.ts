export type Role = "artist" | "venue";

export type Artist = {
  id: string;
  name: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  zip_code?: string | null;
  travel_radius_miles: number;
  min_rate: number;
  max_rate: number;
  min_draw: number;
  max_draw: number;
  media_links: Record<string, unknown>;
  genres: string[];
};

export type VenueEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
};

export type VenueEventPublic = {
  id: string;
  title: string;
  description: string;
  date: string;
  venue_id: string;
  venue_name: string;
  city: string;
  state: string;
};

export type Venue = {
  id: string;
  venue_name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code?: string | null;
  capacity: number;
  min_budget: number;
  max_budget: number;
  amenities: Record<string, unknown>;
  genres: string[];
  events: VenueEvent[];
};

export type Bookmark = {
  id: string;
  type: "artist" | "venue";
  entity_id: string;
  created_at: string;
};

export type GigStatus = "upcoming" | "completed" | "cancelled";

export type Gig = {
  id: string;
  artist_profile_id: string;
  venue_profile_id: string;
  artist_name: string;
  venue_name: string;
  title: string;
  date: string;
  status: GigStatus;
  tickets_sold: number | null;
  attendance: number | null;
  ticket_price_cents: number | null;
  gross_revenue_cents: number | null;
  artist_confirmed: boolean;
  venue_confirmed: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
};

export type GigHistoryItem = {
  gig_id: string;
  venue_name: string;
  date: string;
  attendance: number | null;
  tickets_sold: number | null;
  verified: boolean;
};

export type ArtistStats = {
  artist_profile_id: string;
  artist_name: string;
  total_gigs: number;
  verified_gigs: number;
  avg_attendance: number | null;
  avg_tickets_sold: number | null;
  total_tickets_sold: number | null;
  unique_venues_count: number;
  gig_history: GigHistoryItem[];
};
