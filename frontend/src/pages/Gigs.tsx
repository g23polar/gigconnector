import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole } from "../lib/auth";
import type { Artist, Gig, GigStatus, Venue } from "../lib/types";
import { Panel, Card } from "../ui/Card";

type MatchItem = {
  id: string;
  target_type: "artist" | "venue";
  target_id: string;
  name: string;
  city: string;
  state: string;
};

type Tab = "upcoming" | "completed" | "all";

export default function Gigs() {
  const role = getRole();
  const isAdmin = role === "admin";
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // create-gig form state
  const [showCreate, setShowCreate] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("upcoming");

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<Gig[]>("/gigs");
      setGigs(data);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load gigs");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Fetch matches + own profile when create form opens
  useEffect(() => {
    if (!showCreate) return;
    (async () => {
      try {
        const [m, profile] = await Promise.all([
          apiFetch<MatchItem[]>("/matches"),
          role === "artist"
            ? apiFetch<Artist>("/artist-profile/me")
            : apiFetch<Venue>("/venue-profile/me"),
        ]);
        setMatches(m);
        setMyProfileId(profile.id);
      } catch (e: any) {
        setCreateErr(e.message ?? "Failed to load matches");
      }
    })();
  }, [showCreate, role]);

  const filtered =
    tab === "all"
      ? gigs
      : gigs.filter((g) => g.status === (tab as GigStatus));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !title.trim() || !date || !myProfileId) return;
    setCreating(true);
    setCreateErr(null);

    const match = matches.find((m) => m.target_id === selectedMatch);
    if (!match) return;

    const body =
      role === "artist"
        ? {
            artist_profile_id: myProfileId,
            venue_profile_id: match.target_id,
            title: title.trim(),
            date,
          }
        : {
            artist_profile_id: match.target_id,
            venue_profile_id: myProfileId,
            title: title.trim(),
            date,
          };

    try {
      const created = await apiFetch<Gig>("/gigs", {
        method: "POST",
        body,
      });
      setGigs((prev) => [created, ...prev]);
      setShowCreate(false);
      setTitle("");
      setDate("");
      setSelectedMatch("");
    } catch (e: any) {
      setCreateErr(e.message ?? "Failed to create gig");
    } finally {
      setCreating(false);
    }
  };

  const statusClass = (s: GigStatus) =>
    s === "upcoming"
      ? "pill statusUpcoming"
      : s === "completed"
        ? "pill statusCompleted"
        : "pill statusCancelled";

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div className="sectionTitle">Your Gigs</div>
            <p className="sectionDesc">
              Track shows with your matches and build verified stats.
            </p>
          </div>
          {!isAdmin && (
            <button
              className="btn btnPrimary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? "Cancel" : "Create Gig"}
            </button>
          )}
        </div>

        {showCreate && !isAdmin && (
          <>
            <div className="divider" />
            <form onSubmit={onSubmit}>
              <div className="grid2" style={{ marginBottom: 10 }}>
                <div className="field">
                  <label>Match partner</label>
                  <select
                    className="input"
                    value={selectedMatch}
                    onChange={(e) => setSelectedMatch(e.target.value)}
                    required
                  >
                    <option value="">Select a match...</option>
                    {matches.map((m) => (
                      <option key={m.target_id} value={m.target_id}>
                        {m.name} ({m.target_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Gig title</label>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Friday Night Live"
                    required
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="grid2" style={{ marginBottom: 10 }}>
                <div className="field">
                  <label>Date</label>
                  <input
                    className="input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btnPrimary"
                    type="submit"
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
              {createErr && (
                <div className="error" style={{ marginTop: 8 }}>
                  {createErr}
                </div>
              )}
            </form>
          </>
        )}
      </Panel>

      <div style={{ height: 14 }} />

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      <div className="tabRow">
        {(["upcoming", "completed", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab${tab === t ? " tabActive" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t !== "all" &&
              ` (${gigs.filter((g) => g.status === t).length})`}
            {t === "all" && ` (${gigs.length})`}
          </button>
        ))}
      </div>

      {busy && <div className="smallMuted">Loading...</div>}

      {!busy && filtered.length === 0 && (
        <div className="smallMuted">No gigs to show.</div>
      )}

      {!busy && filtered.length > 0 && (
        <div className="cardList">
          {filtered.map((g) => {
            const partnerName =
              role === "artist" ? g.venue_name : g.artist_name;
            const verified = g.artist_confirmed && g.venue_confirmed;
            return (
              <Card key={g.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="cardTitle">{g.title}</span>
                      <span className={statusClass(g.status)}>{g.status}</span>
                      {verified && (
                        <span className="verifiedBadge">Verified</span>
                      )}
                    </div>
                    <div className="cardMeta">
                      {partnerName} &middot; {g.date}
                    </div>
                    {g.attendance != null && (
                      <div className="cardMeta">
                        Attendance: {g.attendance}
                        {g.tickets_sold != null &&
                          ` | Tickets: ${g.tickets_sold}`}
                      </div>
                    )}
                  </div>
                  <Link className="btn btnGhost" to={`/gigs/${g.id}`}>
                    View
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
