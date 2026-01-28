import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole, getToken } from "../lib/auth";
import { useToast } from "../lib/useToast";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";

const POPULAR_GENRES = [
  "Rock",
  "Pop",
  "Hip Hop",
  "R&B",
  "Country",
  "Jazz",
  "Blues",
  "Electronic",
  "Folk",
  "Metal",
  "Punk",
  "Indie",
  "Classical",
  "Reggae",
  "Latin",
] as const;

type ArtistResult = {
  id: string;
  name: string;
  city: string;
  state: string;
  min_rate: number;
  max_rate: number;
  genres: string[];
  media_links: Record<string, unknown>;
  distance_miles?: number | null;
};

function csvToList(v: string) {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseGenresParam(params: URLSearchParams) {
  const all = params.getAll("genres");
  if (all.length > 0) return all.flatMap((g) => csvToList(g));
  const raw = params.get("genres") ?? "";
  return csvToList(raw);
}

export default function SearchArtists() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { msg, show } = useToast();
  const role = getRole();

  // Initialize from URL (shareable / refresh-safe)
  const [genres, setGenres] = useState<string[]>(() => parseGenresParam(params));
  const [zipCode, setZipCode] = useState(params.get("zip_code") ?? "");
  const [distance, setDistance] = useState(params.get("distance_miles") ?? "25");
  const [maxRate, setMaxRate] = useState(params.get("max_rate") ?? "");
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreDropdownRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ArtistResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isAuthed = !!getToken();

  const url = useMemo(() => {
    const p = new URLSearchParams();
    genres.forEach((g) => p.append("genres", g));
    if (maxRate) p.set("max_rate", maxRate);

    // distance filters only if we have zip code
    if (distance && zipCode) {
      p.set("distance_miles", distance);
      p.set("zip_code", zipCode);
      p.set("sort", "distance");
    }
    return `/search/artists?${p.toString()}`;
  }, [genres, zipCode, distance, maxRate]);

  const syncUrl = () => {
    const p = new URLSearchParams();
    genres.forEach((g) => p.append("genres", g));
    if (zipCode) p.set("zip_code", zipCode);
    if (distance) p.set("distance_miles", distance);
    if (maxRate) p.set("max_rate", maxRate);
    setParams(p, { replace: true });
  };

  const run = async () => {
    setErr(null);
    setBusy(true);
    setHasSearched(true);
    syncUrl();

    try {
      const data = await apiFetch<ArtistResult[]>(url);
      setItems(data);
    } catch (e: any) {
      setErr(e.message ?? "Search failed");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (role === "artist") {
      nav("/search/venues");
      return;
    }
    // Auto-run once on load with URL params
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const bookmark = async (id: string) => {
    if (!isAuthed) {
      show("Login to bookmark.");
      return;
    }
    try {
      await apiFetch(`/bookmarks?to_entity_type=artist&to_entity_id=${encodeURIComponent(id)}`, { method: "POST" });
      show("Bookmarked.");
    } catch (e: any) {
      show(e.message ?? "Bookmark failed");
    }
  };

  const loginForBookmark = () => {
    nav(`/login?next=${encodeURIComponent("/search/artists?" + params.toString())}`);
  };

  return (
    <div className="container">
      {msg && <div className="toast">{msg}</div>}

      <Panel>
        <div className="sectionTitle">Find artists</div>
        <p className="sectionDesc">
          Filter by genre and proximity. Browse freely; login is only required to bookmark.
        </p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="grid2" style={{ alignItems: "end" }}>
          <Field label="Genres" hint="Select all that apply">
            <div className="genreDropdown" ref={genreDropdownRef}>
              <button
                type="button"
                className="genreDropdownTrigger"
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
              >
                <span>
                  {genres.length === 0
                    ? "Select genres..."
                    : genres.length === 1
                    ? genres[0]
                    : `${genres.length} genres selected`}
                </span>
                <span className="genreDropdownArrow">{genreDropdownOpen ? "▲" : "▼"}</span>
              </button>
              {genreDropdownOpen && (
                <div className="genreDropdownMenu">
                  {POPULAR_GENRES.map((genre) => (
                    <label key={genre} className="genreDropdownItem">
                      <input
                        type="checkbox"
                        checked={genres.includes(genre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGenres([...genres, genre]);
                          } else {
                            setGenres(genres.filter((g) => g !== genre));
                          }
                        }}
                      />
                      {genre}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="btnRow" style={{ justifyContent: "flex-end" }}>
            <Button variant="primary" onClick={run} disabled={busy}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>

          <Field label="Your Zip Code" hint="US zip code for distance filtering">
            <input
              className="input"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g., 10001"
              maxLength={10}
            />
          </Field>

          <Field label="Distance (miles)">
            <input className="input" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </Field>

          <div className="grid2" style={{ gridColumn: "1 / -1" }}>
            <Field label="Max rate">
              <input className="input" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
            </Field>
          </div>
        </div>

        {!isAuthed && (
          <div className="smallMuted" style={{ marginTop: 12 }}>
            Want to save artists?{" "}
            <button className="btn btnGhost" onClick={loginForBookmark}>
              Login to bookmark
            </button>
          </div>
        )}
      </Panel>

      <div style={{ height: 14 }} />

      {busy && (
        <div className="smallMuted" style={{ padding: 8 }}>
          Loading results…
        </div>
      )}

      {!busy && items.length > 0 && (
        <div className="cardList">
          {items.map((a) => {
            return (
              <Card key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div className="cardTitle">{a.name}</div>
                    <Link className="smallMuted" to={`/artists/${a.id}`}>View</Link>
                  </div>

                  <div className="cardMeta">
                    {a.city}, {a.state}
                    {a.distance_miles != null ? ` • ${a.distance_miles} mi` : ""}
                  </div>

                  <div className="pillRow">
                    {a.genres.slice(0, 6).map((g) => (
                      <Tag key={g}>{g}</Tag>
                    ))}
                  </div>

                  <div className="smallMuted" style={{ marginTop: 10 }}>
                    Rate: {a.min_rate}–{a.max_rate}
                  </div>

                </div>

                <div className="btnRow" style={{ flexShrink: 0 }}>
                  <button
                    className={`btn btnGhost`}
                    onClick={() => bookmark(a.id)}
                    disabled={!isAuthed}
                    title={!isAuthed ? "Login to bookmark" : "Bookmark"}
                    style={!isAuthed ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    Bookmark
                  </button>
                </div>
              </div>
              </Card>
            );
          })}
        </div>
      )}

      {!busy && hasSearched && items.length === 0 && !err && (
        <Panel>
          <div className="sectionTitle">No results</div>
          <p className="sectionDesc">
            Try broader genres (e.g., <span className="kbd">rock, indie</span>), increase distance, or remove rate constraints.
          </p>
        </Panel>
      )}
    </div>
  );
}
