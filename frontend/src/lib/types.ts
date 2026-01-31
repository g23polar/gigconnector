export type Role = "artist" | "venue" | "admin";

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

export type EventImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
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

export type SpotifyTopTrack = {
  name: string;
  preview_url: string | null;
  album_name: string | null;
  album_image: string | null;
  duration_ms: number | null;
  track_url: string | null;
};

export type SpotifyPublicData = {
  connected: boolean;
  spotify_artist_id: string | null;
  followers: number | null;
  popularity: number | null;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  top_tracks: SpotifyTopTrack[];
  artist_url: string | null;
};

export type SpotifyConnection = {
  connected: boolean;
  spotify_artist_id: string | null;
  spotify_data: Record<string, unknown>;
  data_fetched_at: string | null;
};
