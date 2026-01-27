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
