export type Role = "artist" | "venue";

export type Artist = {
  id: string;
  name: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  travel_radius_miles: number;
  min_rate: number;
  max_rate: number;
  min_draw: number;
  max_draw: number;
  media_links: Record<string, unknown>;
  genres: string[];
};

export type Venue = {
  id: string;
  venue_name: string;
  description: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  min_budget: number;
  max_budget: number;
  amenities: Record<string, unknown>;
  genres: string[];
};

export type Bookmark = {
  id: string;
  type: "artist" | "venue";
  entity_id: string;
  created_at: string;
};
