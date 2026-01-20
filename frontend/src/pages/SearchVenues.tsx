import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";
import { useToast } from "../lib/useToast";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";

type VenueResult = {
  id: string;
  venue_name: string;
  city: string;
  state: string;
  capacity: number;
  min_budget: number;
  max_budget: number;
  genres: string[];
  amenities: Record<string, unknown>;
  distance_miles?: number | null;
};

function csvToList(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SearchVenues() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { msg, show } = useToast();

  // Initialize from URL (shareable / refresh-safe)
  const [genres, setGenres] = useState(params.get("genres") ?? "");
  const [zipCode, setZipCode] = useState(params.get("zip_code") ?? "");
  const [distance, setDistance] = useState(params.get("distance_miles") ?? "25");
  const [minCapacity, setMinCapacity] = useState(params.get("min_capacity") ?? "");
  const [budgetMax, setBudgetMax] = useState(params.get("budget_max") ?? "");

  const [items, setItems] = useState<VenueResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isAuthed = !!getToken();

  const url = useMemo(() => {
    const p = new URLSearchParams();
    csvToList(genres).forEach((g) => p.append("genres", g));

    if (minCapacity) p.set("min_capacity", minCapacity);
    if (budgetMax) p.set("budget_max", budgetMax);

    // distance filters only if we have zip code
    if (distance && zipCode) {
      p.set("distance_miles", distance);
      p.set("zip_code", zipCode);
      p.set("sort", "distance");
    }
    return `/search/venues?${p.toString()}`;
  }, [genres, zipCode, distance, minCapacity, budgetMax]);

  const syncUrl = () => {
    const p = new URLSearchParams();
    p.set("genres", genres);
    if (zipCode) p.set("zip_code", zipCode);
    if (distance) p.set("distance_miles", distance);
    if (minCapacity) p.set("min_capacity", minCapacity);
    if (budgetMax) p.set("budget_max", budgetMax);
    setParams(p, { replace: true });
  };

  const run = async () => {
    setErr(null);
    setBusy(true);
    setHasSearched(true);
    syncUrl();

    try {
      const data = await apiFetch<VenueResult[]>(url, { auth: false });
      setItems(data);
    } catch (e: any) {
      setErr(e.message ?? "Search failed");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Auto-run once on load with URL params
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookmark = async (id: string) => {
    if (!isAuthed) {
      show("Login to bookmark.");
      return;
    }
    try {
      await apiFetch(
        `/bookmarks?to_entity_type=venue&to_entity_id=${encodeURIComponent(id)}`,
        { method: "POST" }
      );
      show("Bookmarked.");
    } catch (e: any) {
      show(e.message ?? "Bookmark failed");
    }
  };

  const loginForBookmark = () => {
    nav(`/login?next=${encodeURIComponent("/search/venues?" + params.toString())}`);
  };

  return (
    <div className="container">
      {msg && <div className="toast">{msg}</div>}

      <Panel>
        <div className="sectionTitle">Find venues</div>
        <p className="sectionDesc">
          Filter by genre and proximity. Browse freely; login is only required to bookmark.
        </p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="grid2" style={{ alignItems: "end" }}>
          <Field label="Genres" hint="Comma-separated (e.g., rock, indie)">
            <input className="input" value={genres} onChange={(e) => setGenres(e.target.value)} />
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
            <Field label="Min capacity">
              <input className="input" value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} />
            </Field>
            <Field label="Budget max">
              <input className="input" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </Field>
          </div>
        </div>

        {!isAuthed && (
          <div className="smallMuted" style={{ marginTop: 12 }}>
            Want to save venues?{" "}
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
          {items.map((v) => (
            <Card key={v.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div className="cardTitle">{v.venue_name}</div>
                    <Link className="smallMuted" to={`/venues/${v.id}`}>View</Link>
                  </div>

                  <div className="cardMeta">
                    {v.city}, {v.state}
                    {v.distance_miles != null ? ` • ${v.distance_miles} mi` : ""}
                  </div>

                  <div className="pillRow">
                    {v.genres.slice(0, 6).map((g) => (
                      <Tag key={g}>{g}</Tag>
                    ))}
                  </div>

                  <div className="smallMuted" style={{ marginTop: 10 }}>
                    Capacity: {v.capacity} • Budget: {v.min_budget}–{v.max_budget}
                  </div>
                </div>

                <div className="btnRow" style={{ flexShrink: 0 }}>
                  <button
                    className="btn btnGhost"
                    onClick={() => bookmark(v.id)}
                    disabled={!isAuthed}
                    title={!isAuthed ? "Login to bookmark" : "Bookmark"}
                    style={!isAuthed ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    Bookmark
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!busy && hasSearched && items.length === 0 && !err && (
        <Panel>
          <div className="sectionTitle">No results</div>
          <p className="sectionDesc">
            Try broader genres (e.g., <span className="kbd">rock, indie</span>), increase distance, or relax capacity/budget constraints.
          </p>
        </Panel>
      )}
    </div>
  );
}
