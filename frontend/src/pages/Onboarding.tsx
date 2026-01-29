import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL, apiFetch } from "../lib/api";
import { clearToken, getToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";
import type { Artist, Venue } from "../lib/types";

type Me = { id: string; email: string; role: "artist" | "venue" | "admin" };

export default function Onboarding() {
  const nav = useNavigate();

  const [me, setMe] = useState<Me | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  const role = me?.role ?? (artist ? "artist" : venue ? "venue" : null);

  const logout = () => {
    clearToken();
    nav("/");
  };

  const downloadLogs = async () => {
    setDownloadErr(null);
    setDownloadBusy(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated.");

      const res = await fetch(`${API_URL}/relationship-logs/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to download logs (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "relationship-history.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setDownloadErr(error?.message ?? "Failed to download logs.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const load = async () => {
    setErr(null);
    setBusy(true);
    try {
      // Preferred: /users/me
      const meResp = await apiFetch<Me>("/users/me");
      setMe(meResp);

      if (meResp.role === "artist") {
        try {
          const a = await apiFetch<Artist>("/artist-profile/me?include_media=false");
          setArtist(a);
        } catch {
          setArtist(null);
        }
      } else if (meResp.role === "venue") {
        try {
          const v = await apiFetch<Venue>("/venue-profile/me");
          setVenue(v);
        } catch {
          setVenue(null);
        }
      }
    } catch (e: any) {
      // Fallback if /users/me does not exist:
      // Try to infer role by probing /artist-profile/me then /venue-profile/me
      try {
        const a = await apiFetch<Artist>("/artist-profile/me?include_media=false");
        setArtist(a);
        setMe({ id: "me", email: "—", role: "artist" });
      } catch {
        try {
          const v = await apiFetch<Venue>("/venue-profile/me");
          setVenue(v);
          setMe({ id: "me", email: "—", role: "venue" });
        } catch {
          setErr(e?.message ?? "Failed to load profile");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = useMemo(() => {
    if (role === "artist" && artist) return artist.name;
    if (role === "venue" && venue) return venue.venue_name;
    if (role === "artist") return "Artist profile";
    if (role === "venue") return "Venue profile";
    return "My profile";
  }, [role, artist, venue]);

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div className="sectionTitle">{title}</div>
            <div className="smallMuted">
              {me?.email && me.email !== "—" ? me.email : "Signed in"}
              {role ? ` • ${role}` : ""}
            </div>
          </div>

          <div className="btnRow" style={{ flexShrink: 0 }}>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>
        </div>

        <div className="divider" />

        {busy && <div className="smallMuted">Loading…</div>}
        {err && <div className="error">{err}</div>}

        {!busy && !err && (
          <>
            {/* Summary */}
            {role === "artist" && (
              <Card>
                {artist ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cardTitle">{artist.name}</div>
                        <div className="cardMeta">
                          {artist.city}, {artist.state}
                        </div>
                        <div className="pillRow">
                          {artist.genres?.slice(0, 8).map((g) => (
                            <Tag key={g}>{g}</Tag>
                          ))}
                        </div>
                      </div>
                      <div className="btnRow" style={{ flexShrink: 0 }}>
                        <Link className="btn btnPrimary" to="/profile/artist">
                          Edit profile
                        </Link>
                      </div>
                    </div>

                    <div className="smallMuted">
                      Minimum rate: {artist.min_rate} • Travel:{" "}
                      {artist.travel_radius_miles} mi
                    </div>
                    {String(artist.media_links?.spotify ?? "").trim() && (
                      <div className="smallMuted">
                        Spotify:{" "}
                        <a href={String(artist.media_links?.spotify)} target="_blank" rel="noreferrer">
                          {String(artist.media_links?.spotify)}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div className="cardTitle">No artist profile yet</div>
                      <div className="cardMeta">Create one to appear in venue searches.</div>
                    </div>
                    <Link className="btn btnPrimary" to="/profile/artist">
                      Create profile
                    </Link>
                  </div>
                )}
              </Card>
            )}

            {role === "venue" && (
              <Card>
                {venue ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cardTitle">{venue.venue_name}</div>
                        <div className="cardMeta">
                          {venue.city}, {venue.state}
                        </div>
                        <div className="pillRow">
                          {venue.genres?.slice(0, 8).map((g) => (
                            <Tag key={g}>{g}</Tag>
                          ))}
                        </div>
                      </div>
                      <div className="btnRow" style={{ flexShrink: 0 }}>
                        <Link className="btn btnPrimary" to="/profile/venue">
                          Edit profile
                        </Link>
                      </div>
                    </div>

                    <div className="smallMuted">
                      Capacity: {venue.capacity} • Max budget: {venue.max_budget}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div className="cardTitle">No venue profile yet</div>
                      <div className="cardMeta">Create one to appear in artist searches.</div>
                    </div>
                    <Link className="btn btnPrimary" to="/profile/venue">
                      Create profile
                    </Link>
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <div className="divider" />

            <div className="grid2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>

              {/* TODO: don't know if i want to have these routes here yet */}

              {/* <Card>
                <div className="cardTitle">Browse</div>
                <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                  Explore and shortlist options.
                </div>
                <div className="btnRow">
                  {role !== "venue" && <Link className="btn" to="/search/venues">Search venues</Link>}
                  {role !== "artist" && <Link className="btn" to="/search/artists">Search artists</Link>}
                </div>
              </Card> */}

              {/* <Card>
                <div className="cardTitle">Bookmarks</div>
                <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                  Your saved shortlist.
                </div>
                <Link className="btn btnPrimary" to="/bookmarks">View bookmarks</Link>
              </Card> */}

              {role && (
                <Card>
                  <div className="cardTitle">Dashboard</div>
                  <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                    Track gigs, ticket sales, and earnings.
                  </div>
                  <Link className="btn btnPrimary" to="/dashboard">Open dashboard</Link>
                </Card>
              )}

              <Card>
                <div className="cardTitle">Relationship history</div>
                <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                  Download your relationship history (CSV).
                </div>
                <Button variant="primary" onClick={downloadLogs} disabled={downloadBusy}>
                  {downloadBusy ? "Preparing..." : "Download CSV"}
                </Button>
                {downloadErr && (
                  <div className="error" style={{ marginTop: 10 }}>
                    {downloadErr}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
