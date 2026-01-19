import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getBrowserLocation } from "../lib/useGeo";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";
import { useNavigate } from "react-router-dom";
import { getToken } from "../lib/auth";


type ArtistResult = {
  id: string;
  name: string;
  city: string;
  state: string;
  min_rate: number;
  max_rate: number;
  min_draw: number;
  max_draw: number;
  genres: string[];
  media_links: Record<string, unknown>;
  distance_miles?: number | null;
};

export default function SearchArtists() {


  const nav = useNavigate();

  const [genres, setGenres] = useState("rock");
  const [lat, setLat] = useState<string>("40.7128");
  const [lng, setLng] = useState<string>("-74.0060");
  const [distance, setDistance] = useState<string>("25");
  const [minDraw, setMinDraw] = useState<string>("");
  const [maxRate, setMaxRate] = useState<string>("");

  const [items, setItems] = useState<ArtistResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    genres.split(",").map((s) => s.trim()).filter(Boolean).forEach((g) => params.append("genres", g));
    if (minDraw) params.set("min_draw", minDraw);
    if (maxRate) params.set("max_rate", maxRate);
    if (distance && lat && lng) {
      params.set("distance_miles", distance);
      params.set("lat", lat);
      params.set("lng", lng);
      params.set("sort", "distance");
    }
    return `/search/artists?${params.toString()}`;
  }, [genres, lat, lng, distance, minDraw, maxRate]);

  const run = async () => {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiFetch<ArtistResult[]>(url);
      setItems(data);
    } catch (e: any) {
      setErr(e.message ?? "Search failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = async () => {
    setErr(null);
    try {
      const pos = await getBrowserLocation();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
    } catch (e: any) {
      setErr(e.message ?? "Failed to read location");
    }
  };

  const bookmark = async (id: string) => {
  const token = getToken();
  if (!token) {
    const next = encodeURIComponent(`/search/artists`);
    nav(`/login?next=${next}`);
    return;
  }
  await apiFetch(`/bookmarks?to_entity_type=artist&to_entity_id=${encodeURIComponent(id)}`, { method: "POST" });
};


  return (
    <div className="container">
      <Panel className="">
        <div className="sectionTitle">Find artists</div>
        <p className="sectionDesc">
          Filter by genre and optionally by proximity. Use <span className="kbd">Bookmark</span> to save candidates.
        </p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="grid2" style={{ alignItems: "end" }}>
          <Field label="Genres" hint="Comma-separated">
            <input className="input" value={genres} onChange={(e) => setGenres(e.target.value)} />
          </Field>

          <div className="btnRow" style={{ justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={useMyLocation}>Use my location</Button>
            <Button variant="primary" onClick={run} disabled={busy}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>

          <Field label="Latitude">
            <input className="input" value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>

          <Field label="Longitude">
            <input className="input" value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>

          <Field label="Distance (miles)">
            <input className="input" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </Field>

          <div className="grid2" style={{ gridColumn: "1 / -1" }}>
            <Field label="Min draw">
              <input className="input" value={minDraw} onChange={(e) => setMinDraw(e.target.value)} />
            </Field>
            <Field label="Max rate">
              <input className="input" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
            </Field>
          </div>
        </div>
      </Panel>

      <div style={{ height: 14 }} />

      <div className="cardList">
        {items.map((a) => (
          <Card key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="cardTitle">{a.name}</div>
                <div className="cardMeta">
                  {a.city}, {a.state}
                  {a.distance_miles != null ? ` • ${a.distance_miles.toFixed(1)} mi` : ""}
                </div>

                <div className="pillRow">
                  {a.genres.slice(0, 6).map((g) => (
                    <Tag key={g}>{g}</Tag>
                  ))}
                </div>

                <div className="smallMuted" style={{ marginTop: 10 }}>
                  Rate: {a.min_rate}–{a.max_rate} • Draw: {a.min_draw}–{a.max_draw}
                </div>
              </div>

              <div className="btnRow" style={{ flexShrink: 0 }}>
                <Button variant="ghost" onClick={() => bookmark(a.id)}>Bookmark</Button>
              </div>
            </div>
          </Card>
        ))}

        {!busy && items.length === 0 && (
          <div className="smallMuted" style={{ padding: 8 }}>
            No results. Try a broader genre or increase distance.
          </div>
        )}
      </div>
    </div>
  );
}
