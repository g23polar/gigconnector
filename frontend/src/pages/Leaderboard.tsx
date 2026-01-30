import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Panel } from "../ui/Card";

type VenueEntry = {
  venue_profile_id: string;
  venue_name: string;
  city: string;
  state: string;
  total_gigs: number;
  verified_gigs: number;
  total_attendance: number | null;
  avg_attendance: number | null;
  total_tickets_sold: number | null;
  total_gross_revenue_cents: number | null;
  unique_artists: number;
};

type ArtistEntry = {
  artist_profile_id: string;
  artist_name: string;
  city: string;
  state: string;
  total_gigs: number;
  verified_gigs: number;
  total_attendance: number | null;
  avg_attendance: number | null;
  total_tickets_sold: number | null;
  unique_venues: number;
};

type LeaderboardData = {
  city: string | null;
  state: string | null;
  venues: VenueEntry[];
  artists: ArtistEntry[];
};

type Tab = "venues" | "artists";
type SortVenue = "gigs" | "attendance" | "tickets" | "revenue";
type SortArtist = "gigs" | "attendance" | "tickets";

const fmtNum = (v: number | null) =>
  v == null ? "--" : v.toLocaleString("en-US");

const fmtCurrency = (cents: number | null) => {
  if (cents == null) return "--";
  const d = cents / 100;
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

function sortVenues(list: VenueEntry[], by: SortVenue): VenueEntry[] {
  const copy = [...list];
  switch (by) {
    case "gigs":
      return copy.sort((a, b) => b.total_gigs - a.total_gigs);
    case "attendance":
      return copy.sort((a, b) => (b.total_attendance ?? 0) - (a.total_attendance ?? 0));
    case "tickets":
      return copy.sort((a, b) => (b.total_tickets_sold ?? 0) - (a.total_tickets_sold ?? 0));
    case "revenue":
      return copy.sort(
        (a, b) => (b.total_gross_revenue_cents ?? 0) - (a.total_gross_revenue_cents ?? 0)
      );
  }
}

function sortArtists(list: ArtistEntry[], by: SortArtist): ArtistEntry[] {
  const copy = [...list];
  switch (by) {
    case "gigs":
      return copy.sort((a, b) => b.total_gigs - a.total_gigs);
    case "attendance":
      return copy.sort((a, b) => (b.total_attendance ?? 0) - (a.total_attendance ?? 0));
    case "tickets":
      return copy.sort((a, b) => (b.total_tickets_sold ?? 0) - (a.total_tickets_sold ?? 0));
  }
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("venues");
  const [venueSort, setVenueSort] = useState<SortVenue>("gigs");
  const [artistSort, setArtistSort] = useState<SortArtist>("gigs");

  useEffect(() => {
    apiFetch<string[]>("/leaderboards/cities", { auth: false }).then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setBusy(true);
      setErr(null);
      try {
        const params = city ? `?city=${encodeURIComponent(city)}` : "";
        const d = await apiFetch<LeaderboardData>(`/leaderboards${params}`, {
          auth: false,
        });
        setData(d);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load leaderboard");
      } finally {
        setBusy(false);
      }
    };
    load();
  }, [city]);

  const venues = data ? sortVenues(data.venues, venueSort) : [];
  const artists = data ? sortArtists(data.artists, artistSort) : [];

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <Panel>
        <div className="sectionTitle" style={{ fontSize: 22 }}>
          Local Scene Leaderboard
        </div>
        <div className="sectionDesc">
          See which venues and artists are leading the local scene — most gigs,
          highest attendance, biggest ticket sales.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="input"
            style={{ width: "auto", minWidth: 200 }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="tabRow" style={{ marginBottom: 0 }}>
            <button
              className={`tab${tab === "venues" ? " tabActive" : ""}`}
              onClick={() => setTab("venues")}
            >
              Venues{data ? ` (${data.venues.length})` : ""}
            </button>
            <button
              className={`tab${tab === "artists" ? " tabActive" : ""}`}
              onClick={() => setTab("artists")}
            >
              Artists{data ? ` (${data.artists.length})` : ""}
            </button>
          </div>
        </div>
      </Panel>

      <div style={{ height: 14 }} />

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {busy && <div className="smallMuted">Loading leaderboard...</div>}

      {!busy && tab === "venues" && (
        <>
          <div className="lbSortRow">
            <span className="smallMuted">Sort by:</span>
            {(
              [
                ["gigs", "Most gigs"],
                ["attendance", "Attendance"],
                ["tickets", "Tickets sold"],
                ["revenue", "Revenue"],
              ] as [SortVenue, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                className={`tab${venueSort === key ? " tabActive" : ""}`}
                onClick={() => setVenueSort(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {venues.length === 0 && (
            <div className="smallMuted" style={{ marginTop: 12 }}>
              No venues with gigs found{city ? ` in ${city}` : ""}.
            </div>
          )}

          <div className="lbList">
            {venues.map((v, i) => (
              <Link
                key={v.venue_profile_id}
                className="lbCard"
                to={`/venues/${v.venue_profile_id}`}
              >
                <div className="lbRank">{i + 1}</div>
                <div className="lbInfo">
                  <div className="lbName">{v.venue_name}</div>
                  <div className="cardMeta">
                    {v.city}
                    {v.state ? `, ${v.state}` : ""}
                  </div>
                </div>
                <div className="lbStats">
                  <div className="lbStat">
                    <div className="lbStatValue">{v.total_gigs}</div>
                    <div className="lbStatLabel">Gigs</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{fmtNum(v.total_attendance)}</div>
                    <div className="lbStatLabel">Attendance</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{fmtNum(v.total_tickets_sold)}</div>
                    <div className="lbStatLabel">Tickets</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{fmtCurrency(v.total_gross_revenue_cents)}</div>
                    <div className="lbStatLabel">Revenue</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{v.unique_artists}</div>
                    <div className="lbStatLabel">Artists</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{v.verified_gigs}</div>
                    <div className="lbStatLabel">Verified</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!busy && tab === "artists" && (
        <>
          <div className="lbSortRow">
            <span className="smallMuted">Sort by:</span>
            {(
              [
                ["gigs", "Most gigs"],
                ["attendance", "Attendance"],
                ["tickets", "Tickets sold"],
              ] as [SortArtist, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                className={`tab${artistSort === key ? " tabActive" : ""}`}
                onClick={() => setArtistSort(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {artists.length === 0 && (
            <div className="smallMuted" style={{ marginTop: 12 }}>
              No artists with gigs found{city ? ` in ${city}` : ""}.
            </div>
          )}

          <div className="lbList">
            {artists.map((a, i) => (
              <Link
                key={a.artist_profile_id}
                className="lbCard"
                to={`/artists/${a.artist_profile_id}`}
              >
                <div className="lbRank">{i + 1}</div>
                <div className="lbInfo">
                  <div className="lbName">{a.artist_name}</div>
                  <div className="cardMeta">
                    {a.city}
                    {a.state ? `, ${a.state}` : ""}
                  </div>
                </div>
                <div className="lbStats">
                  <div className="lbStat">
                    <div className="lbStatValue">{a.total_gigs}</div>
                    <div className="lbStatLabel">Gigs</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{fmtNum(a.total_attendance)}</div>
                    <div className="lbStatLabel">Attendance</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{fmtNum(a.total_tickets_sold)}</div>
                    <div className="lbStatLabel">Tickets</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{a.unique_venues}</div>
                    <div className="lbStatLabel">Venues</div>
                  </div>
                  <div className="lbStat">
                    <div className="lbStatValue">{a.verified_gigs}</div>
                    <div className="lbStatLabel">Verified</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
