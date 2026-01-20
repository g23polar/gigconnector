import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel } from "../ui/Card";
import Tag from "../ui/Tag";
import type { Artist } from "../lib/types";

export default function ArtistDetail() {
  const { id } = useParams();
  const artistId = id ?? "";
  const nav = useNavigate();

  const [item, setItem] = useState<Artist | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
              </div>
            </div>

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
            {item.media_links && Object.keys(item.media_links).length > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">Links</div>
                  <div className="smallMuted">
                    {Object.entries(item.media_links).map(([k, v]) => (
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
