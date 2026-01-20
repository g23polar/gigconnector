import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";
import Button from "../ui/Button";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";
import type { Artist, Venue } from "../lib/types";

type Me = { id: string; email: string; role: "artist" | "venue" };

export default function Onboarding() {
  const nav = useNavigate();

  const [me, setMe] = useState<Me | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const role = me?.role ?? (artist ? "artist" : venue ? "venue" : null);

  const logout = () => {
    clearToken();
    nav("/");
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
          const a = await apiFetch<Artist>("/artist-profile/me");
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
        const a = await apiFetch<Artist>("/artist-profile/me");
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
                      Rate: {artist.min_rate}–{artist.max_rate} • Draw: {artist.min_draw}–{artist.max_draw} • Travel:{" "}
                      {artist.travel_radius_miles} mi
                    </div>
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
                      Capacity: {venue.capacity} • Budget: {venue.min_budget}–{venue.max_budget}
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

            <div className="grid2">
              <Card>
                <div className="cardTitle">Browse</div>
                <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                  Explore and shortlist options.
                </div>
                <div className="btnRow">
                  <Link className="btn" to="/search/venues">Search venues</Link>
                  <Link className="btn" to="/search/artists">Search artists</Link>
                </div>
              </Card>

              <Card>
                <div className="cardTitle">Bookmarks</div>
                <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                  Your saved shortlist.
                </div>
                <Link className="btn btnPrimary" to="/bookmarks">View bookmarks</Link>
              </Card>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
