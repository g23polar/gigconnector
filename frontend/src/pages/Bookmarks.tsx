import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole } from "../lib/auth";
import Button from "../ui/Button";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";

type Bookmark = {
  id: string;
  to_entity_type: "artist" | "venue";
  to_entity_id: string;
  created_at?: string;
};

type ArtistResult = {
  id: string;
  name: string;
  city: string;
  state: string;
  min_rate: number;
  max_rate: number;
  genres: string[];
};

type VenueResult = {
  id: string;
  venue_name: string;
  city: string;
  state: string;
  capacity: number;
  min_budget: number;
  max_budget: number;
  genres: string[];
};

type Resolved =
  | { kind: "artist"; bookmarkId: string; entityId: string; artist: ArtistResult | null }
  | { kind: "venue"; bookmarkId: string; entityId: string; venue: VenueResult | null };

export default function Bookmarks() {
  const [raw, setRaw] = useState<Bookmark[]>([]);
  const [resolved, setResolved] = useState<Resolved[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const role = getRole();

  const counts = useMemo(() => {
    const a = raw.filter((b) => b.to_entity_type === "artist").length;
    const v = raw.filter((b) => b.to_entity_type === "venue").length;
    return { a, v, total: raw.length };
  }, [raw]);

  const load = async () => {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiFetch<Bookmark[]>("/bookmarks");
      setRaw(data);

      const mapped: Resolved[] = await Promise.all(
        data.map(async (b) => {
          try {
            if (b.to_entity_type === "artist") {
              const artist = await apiFetch<ArtistResult>(`/artist-profile/${encodeURIComponent(b.to_entity_id)}`, {
                auth: false,
              });
              return { kind: "artist", bookmarkId: b.id, entityId: b.to_entity_id, artist };
            } else {
              const venue = await apiFetch<VenueResult>(`/venue-profile/${encodeURIComponent(b.to_entity_id)}`, {
                auth: false,
              });
              return { kind: "venue", bookmarkId: b.id, entityId: b.to_entity_id, venue };
            }
          } catch {
            // If entity was deleted or endpoint fails, keep bookmark but show placeholder
            return b.to_entity_type === "artist"
              ? { kind: "artist", bookmarkId: b.id, entityId: b.to_entity_id, artist: null }
              : { kind: "venue", bookmarkId: b.id, entityId: b.to_entity_id, venue: null };
          }
        })
      );

      setResolved(mapped);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load bookmarks");
      setRaw([]);
      setResolved([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (bookmarkId: string) => {
    // optimistic remove
    const prevRaw = raw;
    const prevResolved = resolved;
    setRaw((r) => r.filter((b) => b.id !== bookmarkId));
    setResolved((r) => r.filter((x) => x.bookmarkId !== bookmarkId));

    try {
      await apiFetch(`/bookmarks/${encodeURIComponent(bookmarkId)}`, { method: "DELETE" });
    } catch (e: any) {
      // rollback
      setRaw(prevRaw);
      setResolved(prevResolved);
      setErr(e.message ?? "Failed to remove bookmark");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div className="sectionTitle">Bookmarks</div>
            <div className="smallMuted">
              {counts.total} total • {counts.a} artists • {counts.v} venues
            </div>
          </div>
          <div className="btnRow">
            {role !== "venue" && <Link className="btn" to="/search/venues">Search venues</Link>}
            {role !== "artist" && <Link className="btn" to="/search/artists">Search artists</Link>}
          </div>
        </div>

        <div className="divider" />

        {busy && <div className="smallMuted">Loading…</div>}
        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        {!busy && resolved.length === 0 && !err && (
          <Card>
            <div className="cardTitle">No bookmarks yet</div>
            <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
              Browse and bookmark artists or venues to build a shortlist.
            </div>
            <div className="btnRow">
              {role !== "venue" && <Link className="btn" to="/search/venues">Browse venues</Link>}
              {role !== "artist" && <Link className="btn" to="/search/artists">Browse artists</Link>}
            </div>
          </Card>
        )}

        {!busy && resolved.length > 0 && (
          <div className="cardList">
            {resolved.map((x) => {
              if (x.kind === "artist") {
                const a = x.artist;
                return (
                  <Card key={x.bookmarkId}>
                    {a ? (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                            <div className="cardTitle">{a.name}</div>
                            <Link className="smallMuted" to={`/artists/${a.id}`}>View</Link>
                            <Tag>Artist</Tag>
                          </div>
                          <div className="cardMeta">{a.city}, {a.state}</div>
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
                          <Button variant="ghost" onClick={() => remove(x.bookmarkId)}>Remove</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div>
                          <div className="cardTitle">Artist (unavailable)</div>
                          <div className="cardMeta">This profile may have been removed.</div>
                        </div>
                        <Button variant="ghost" onClick={() => remove(x.bookmarkId)}>Remove</Button>
                      </div>
                    )}
                  </Card>
                );
              }

              const v = x.venue;
              return (
                <Card key={x.bookmarkId}>
                  {v ? (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                          <div className="cardTitle">{v.venue_name}</div>
                          <Link className="smallMuted" to={`/venues/${v.id}`}>View</Link>
                          <Tag>Venue</Tag>
                        </div>
                        <div className="cardMeta">{v.city}, {v.state}</div>
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
                        <Button variant="ghost" onClick={() => remove(x.bookmarkId)}>Remove</Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <div>
                        <div className="cardTitle">Venue (unavailable)</div>
                        <div className="cardMeta">This profile may have been removed.</div>
                      </div>
                      <Button variant="ghost" onClick={() => remove(x.bookmarkId)}>Remove</Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
