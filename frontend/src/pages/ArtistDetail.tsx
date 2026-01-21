import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole, getToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel } from "../ui/Card";
import Tag from "../ui/Tag";
import type { Artist } from "../lib/types";

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

  const role = getRole();
  const liveRecording = item ? extractSingleMedia(item.media_links?.live_recording) : null;
  const uploads = item ? extractUploads(item.media_links?.uploads) : [];
  const linkEntries = item
    ? Object.entries(item.media_links ?? {}).filter(
        ([key]) => key !== "uploads" && key !== "live_recording"
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

  const bookmark = async () => {
    const token = getToken();
    if (!token) {
      nav(`/login?next=${encodeURIComponent(`/artists/${artistId}`)}`);
      return;
    }
    await apiFetch(`/bookmarks?to_entity_type=artist&to_entity_id=${encodeURIComponent(artistId)}`, { method: "POST" });
  };

  const match = async () => {
    if (role !== "venue") return;
    const token = getToken();
    if (!token) {
      nav(`/login?next=${encodeURIComponent(`/artists/${artistId}`)}`);
      return;
    }
    setMatchMsg(null);
    setMatchBusy(true);
    try {
      const resp = await apiFetch<{ matched?: boolean }>(`/matches`, {
        method: "POST",
        body: { target_type: "artist", target_id: artistId },
      });
      setMatchMsg(resp.matched ? "Matched." : "Match request sent.");
    } catch (e: any) {
      setMatchMsg(e.message ?? "Match failed");
    } finally {
      setMatchBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="smallMuted" style={{ marginBottom: 10 }}>
        <Link to="/search/artists">← Back to search</Link>
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
                <Button variant="ghost" onClick={bookmark}>Bookmark</Button>
                {role === "venue" && (
                  <Button variant="primary" onClick={match} disabled={matchBusy}>
                    {matchBusy ? "Matching..." : "Match"}
                  </Button>
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
                          <video controls src={liveRecording.url} style={{ width: "100%", maxHeight: 320 }} />
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
                          <video controls src={media.url} style={{ width: "100%", maxHeight: 320 }} />
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
          </div>
        )}
      </Panel>
    </div>
  );
}
