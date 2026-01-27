import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole, getToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel } from "../ui/Card";
import Tag from "../ui/Tag";
import type { Venue } from "../lib/types";

export default function VenueDetail() {
  const { id } = useParams();
  const venueId = id ?? "";
  const nav = useNavigate();

  const [item, setItem] = useState<Venue | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<"none" | "pending" | "matched">("none");

  const role = getRole();
  const isAuthed = !!getToken();

  const endpoint = useMemo(() => `/venue-profile/${encodeURIComponent(venueId)}`, [venueId]);

  useEffect(() => {
    if (!venueId) return;
    setErr(null);
    setBusy(true);
    apiFetch<Venue>(endpoint, { auth: false })
      .then(setItem)
      .catch((e: any) => setErr(e.message ?? "Failed to load venue"))
      .finally(() => setBusy(false));
  }, [venueId, endpoint]);

  useEffect(() => {
    if (!isAuthed || !venueId) return;
    apiFetch<{ id: string; to_entity_type: string; to_entity_id: string }[]>("/bookmarks")
      .then((list) => {
        const found = list.find((b) => b.to_entity_type === "venue" && b.to_entity_id === venueId);
        setBookmarkId(found?.id ?? null);
      })
      .catch(() => {});
    if (role === "artist") {
      Promise.all([
        apiFetch<{ target_type: string; target_id: string }[]>("/matches"),
        apiFetch<{ target_type: string; target_id: string }[]>("/matches/outgoing"),
      ])
        .then(([mutual, outgoing]) => {
          if (mutual.some((m) => m.target_type === "venue" && m.target_id === venueId)) {
            setMatchStatus("matched");
          } else if (outgoing.some((m) => m.target_type === "venue" && m.target_id === venueId)) {
            setMatchStatus("pending");
          }
        })
        .catch(() => {});
    }
  }, [isAuthed, venueId, role]);

  const bookmark = async () => {
    if (!isAuthed) {
      nav(`/login?next=${encodeURIComponent(`/venues/${venueId}`)}`);
      return;
    }
    try {
      if (bookmarkId) {
        await apiFetch(`/bookmarks/${encodeURIComponent(bookmarkId)}`, { method: "DELETE" });
        setBookmarkId(null);
      } else {
        const resp = await apiFetch<{ id: string }>(`/bookmarks?to_entity_type=venue&to_entity_id=${encodeURIComponent(venueId)}`, { method: "POST" });
        setBookmarkId(resp.id);
      }
    } catch {}
  };

  const match = async () => {
    if (role !== "artist") return;
    if (!isAuthed) {
      nav(`/login?next=${encodeURIComponent(`/venues/${venueId}`)}`);
      return;
    }
    setMatchMsg(null);
    setMatchBusy(true);
    try {
      if (matchStatus === "matched" || matchStatus === "pending") {
        await apiFetch(`/matches`, {
          method: "DELETE",
          body: { target_type: "venue", target_id: venueId },
        });
        setMatchStatus("none");
      } else {
        const resp = await apiFetch<{ matched?: boolean }>(`/matches`, {
          method: "POST",
          body: { target_type: "venue", target_id: venueId },
        });
        setMatchStatus(resp.matched ? "matched" : "pending");
      }
    } catch (e: any) {
      setMatchMsg(e.message ?? "Action failed");
    } finally {
      setMatchBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="smallMuted" style={{ marginBottom: 10 }}>
        <Link to="/search/venues">← Back to search</Link>
      </div>

      <Panel>
        {busy && <div className="smallMuted">Loading...</div>}
        {err && <div className="error">{err}</div>}

        {item && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="sectionTitle" style={{ marginBottom: 4 }}>{item.venue_name}</div>
                <div className="smallMuted">
                  {item.city}, {item.state}
                </div>

                {item.genres?.length > 0 && (
                  <div className="pillRow">
                    {item.genres.map((g) => (
                      <Tag key={g}>{g}</Tag>
                    ))}
                  </div>
                )}
              </div>

              <div className="btnRow" style={{ flexShrink: 0 }}>
                <Button variant="ghost" onClick={bookmark}>
                  {bookmarkId ? "Unbookmark" : "Bookmark"}
                </Button>
                {role === "artist" && (
                  matchStatus === "none" ? (
                    <Button variant="primary" onClick={match} disabled={matchBusy}>
                      {matchBusy ? "Matching..." : "Match"}
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={match} disabled={matchBusy}>
                      {matchBusy ? "..." : matchStatus === "matched" ? "Unmatch" : "Cancel request"}
                    </Button>
                  )
                )}
              </div>
            </div>
            {matchMsg && <div className="smallMuted">{matchMsg}</div>}

            {item.description && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">About</div>
                  <div className="smallMuted" style={{ whiteSpace: "pre-wrap" }}>{item.description}</div>
                </div>
              </>
            )}

            <div className="divider" />

            <div className="grid2">
              <div className="card">
                <div className="cardTitle">Commercials</div>
                <div className="cardMeta" style={{ marginTop: 8 }}>
                  Capacity: {item.capacity}
                  <br />
                  Budget: {item.min_budget}–{item.max_budget}
                </div>
              </div>

              <div className="card">
                <div className="cardTitle">Location</div>
                <div className="cardMeta" style={{ marginTop: 8 }}>
                  {item.city}, {item.state}, {item.country}
                </div>
              </div>
            </div>

            {/* Amenities (optional) */}
            {item.amenities && Object.keys(item.amenities).length > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">Amenities</div>
                  <div className="smallMuted">
                    {Object.entries(item.amenities).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: "var(--muted)" }}>{k}:</span>{" "}
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
