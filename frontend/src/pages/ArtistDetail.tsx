import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole, getToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel } from "../ui/Card";
import Tag from "../ui/Tag";
import LazyVideo from "../ui/LazyVideo";
import type { Artist, ArtistStats } from "../lib/types";

type MediaItem = {
  name: string;
  url: string;
  type: string;
};

const extractUploads = (value: unknown): MediaItem[] => {
  if (!Array.isArray(value)) return [];
  const items: MediaItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : "";
    if (!url) continue;
    items.push({
      name: typeof record.name === "string" ? record.name : "Untitled",
      url,
      type: typeof record.type === "string" ? record.type : "",
    });
  }
  return items;
};

const extractSingleMedia = (value: unknown): MediaItem | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";
  if (!url) return null;
  return {
    name: typeof record.name === "string" ? record.name : "Untitled",
    url,
    type: typeof record.type === "string" ? record.type : "",
  };
};

export default function ArtistDetail() {
  const { id } = useParams();
  const artistId = id ?? "";
  const nav = useNavigate();

  const [item, setItem] = useState<Artist | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState<string | null>(null);
  const [matchBusy, setMatchBusy] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<"none" | "pending" | "matched">("none");
  const [stats, setStats] = useState<ArtistStats | null>(null);

  const role = getRole();
  const isAuthed = !!getToken();
  const liveRecording = item ? extractSingleMedia(item.media_links?.live_recording) : null;
  const uploads = item ? extractUploads(item.media_links?.uploads) : [];
  const linkEntries = item
    ? Object.entries(item.media_links ?? {}).filter(
        ([key]) => key !== "uploads" && key !== "live_recording" && key !== "location_place_id"
      )
    : [];

  const endpoint = useMemo(() => `/artist-profile/${encodeURIComponent(artistId)}`, [artistId]);

  useEffect(() => {
    if (!artistId) return;
    setErr(null);
    setBusy(true);
    apiFetch<Artist>(endpoint, { auth: false })
      .then(setItem)
      .catch((e: any) => setErr(e.message ?? "Failed to load artist"))
      .finally(() => setBusy(false));
  }, [artistId, endpoint]);

  useEffect(() => {
    if (!isAuthed || !artistId) return;
    apiFetch<{ id: string; to_entity_type: string; to_entity_id: string }[]>("/bookmarks")
      .then((list) => {
        const found = list.find((b) => b.to_entity_type === "artist" && b.to_entity_id === artistId);
        setBookmarkId(found?.id ?? null);
      })
      .catch(() => {});
    if (role === "venue") {
      Promise.all([
        apiFetch<{ target_type: string; target_id: string }[]>("/matches"),
        apiFetch<{ target_type: string; target_id: string }[]>("/matches/outgoing"),
      ])
        .then(([mutual, outgoing]) => {
          if (mutual.some((m) => m.target_type === "artist" && m.target_id === artistId)) {
            setMatchStatus("matched");
          } else if (outgoing.some((m) => m.target_type === "artist" && m.target_id === artistId)) {
            setMatchStatus("pending");
          }
        })
        .catch(() => {});
    }
  }, [isAuthed, artistId, role]);

  useEffect(() => {
    if (!artistId) return;
    apiFetch<ArtistStats>(`/gigs/stats/${encodeURIComponent(artistId)}`, { auth: false })
      .then(setStats)
      .catch(() => {});
  }, [artistId]);

  const bookmark = async () => {
    if (!isAuthed) {
      nav(`/login?next=${encodeURIComponent(`/artists/${artistId}`)}`);
      return;
    }
    try {
      if (bookmarkId) {
        await apiFetch(`/bookmarks/${encodeURIComponent(bookmarkId)}`, { method: "DELETE" });
        setBookmarkId(null);
      } else {
        const resp = await apiFetch<{ id: string }>(`/bookmarks?to_entity_type=artist&to_entity_id=${encodeURIComponent(artistId)}`, { method: "POST" });
        setBookmarkId(resp.id);
      }
    } catch {}
  };

  const match = async () => {
    if (role !== "venue") return;
    if (!isAuthed) {
      nav(`/login?next=${encodeURIComponent(`/artists/${artistId}`)}`);
      return;
    }
    setMatchMsg(null);
    setMatchBusy(true);
    try {
      if (matchStatus === "matched" || matchStatus === "pending") {
        await apiFetch(`/matches`, {
          method: "DELETE",
          body: { target_type: "artist", target_id: artistId },
        });
        setMatchStatus("none");
      } else {
        const resp = await apiFetch<{ matched?: boolean }>(`/matches`, {
          method: "POST",
          body: { target_type: "artist", target_id: artistId },
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
        {role === "artist" ? (
          <Link to="/search/venues">← Back to search</Link>
        ) : (
          <Link to="/search/artists">← Back to search</Link>
        )}
      </div>

      <Panel>
        {busy && <div className="smallMuted">Loading...</div>}
        {err && <div className="error">{err}</div>}

        {item && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="sectionTitle" style={{ marginBottom: 4 }}>{item.name}</div>
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
                {role === "venue" && (
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

            {item.bio && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">About</div>
                  <div className="smallMuted" style={{ whiteSpace: "pre-wrap" }}>{item.bio}</div>
                </div>
              </>
            )}

            <div className="divider" />

            <div className="grid2">
              <div className="card">
                <div className="cardTitle">Commercials</div>
                <div className="cardMeta" style={{ marginTop: 8 }}>
                  Rate: {item.min_rate}–{item.max_rate}
                </div>
              </div>

              <div className="card">
                <div className="cardTitle">Location</div>
                <div className="cardMeta" style={{ marginTop: 8 }}>
                  {item.city}, {item.state}, {item.country}
                  <br />
                  Travel radius: {item.travel_radius_miles} miles
                </div>
              </div>
            </div>

            {/* Media links (optional) */}
            {(liveRecording || uploads.length > 0) && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">Media</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {liveRecording && liveRecording.type.startsWith("video/") && (
                      <div className="card">
                        <div className="cardTitle" style={{ marginBottom: 8 }}>
                          Live performance
                        </div>
                        {liveRecording.type.startsWith("video/") && (
                          <LazyVideo controls src={liveRecording.url} style={{ width: "100%", maxHeight: 320 }} />
                        )}
                      </div>
                    )}
                    {uploads.map((media, idx) => (
                      <div key={`${media.name}-${idx}`} className="card">
                        <div className="cardTitle" style={{ marginBottom: 8 }}>{media.name}</div>
                        {media.type.startsWith("image/") && (
                          <img
                            src={media.url}
                            alt={media.name}
                            style={{ maxWidth: "100%", borderRadius: 8 }}
                          />
                        )}
                        {media.type.startsWith("audio/") && (
                          <audio controls src={media.url} style={{ width: "100%" }} />
                        )}
                        {media.type.startsWith("video/") && (
                          <LazyVideo controls src={media.url} style={{ width: "100%", maxHeight: 320 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {linkEntries.length > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">Links</div>
                  <div className="smallMuted">
                    {linkEntries.map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: "var(--muted)" }}>{k}:</span>{" "}
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {stats && stats.total_gigs > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">Performance Stats</div>
                  <div className="grid2" style={{ marginBottom: 14 }}>
                    <div className="kpiItem">
                      <div className="kpiLabel">Total Gigs</div>
                      <div className="kpiValue">{stats.total_gigs}</div>
                    </div>
                    <div className="kpiItem">
                      <div className="kpiLabel">Verified Gigs</div>
                      <div className="kpiValue">{stats.verified_gigs}</div>
                    </div>
                    <div className="kpiItem">
                      <div className="kpiLabel">Avg Attendance</div>
                      <div className="kpiValue">{stats.avg_attendance ?? "---"}</div>
                    </div>
                    <div className="kpiItem">
                      <div className="kpiLabel">Total Tickets Sold</div>
                      <div className="kpiValue">{stats.total_tickets_sold ?? "---"}</div>
                    </div>
                    <div className="kpiItem">
                      <div className="kpiLabel">Avg Tickets Sold</div>
                      <div className="kpiValue">{stats.avg_tickets_sold ?? "---"}</div>
                    </div>
                    <div className="kpiItem">
                      <div className="kpiLabel">Unique Venues</div>
                      <div className="kpiValue">{stats.unique_venues_count}</div>
                    </div>
                  </div>

                  {stats.gig_history.length > 0 && (
                    <>
                      <div className="sectionTitle" style={{ fontSize: 14 }}>Gig History</div>
                      <div className="cardList">
                        {stats.gig_history.map((h) => (
                          <div className="card" key={h.gig_id}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span className="cardTitle">{h.venue_name}</span>
                                {h.verified && <span className="verifiedBadge">Verified</span>}
                              </div>
                              <span className="cardMeta">{h.date}</span>
                            </div>
                            <div className="cardMeta">
                              {h.attendance != null && `Attendance: ${h.attendance}`}
                              {h.attendance != null && h.tickets_sold != null && " | "}
                              {h.tickets_sold != null && `Tickets: ${h.tickets_sold}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
