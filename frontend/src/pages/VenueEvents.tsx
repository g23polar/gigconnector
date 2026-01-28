import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole } from "../lib/auth";
import Button from "../ui/Button";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";
import type { VenueEvent, VenueEventPublic } from "../lib/types";

function isFutureOrToday(dateStr: string, today: Date) {
  const eventDate = new Date(`${dateStr}T00:00:00`);
  return eventDate >= today;
}

export default function VenueEvents() {
  const [events, setEvents] = useState<VenueEventPublic[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const isVenue = getRole() === "venue";

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  useEffect(() => {
    setErr(null);
    setBusy(true);

    if (isVenue) {
      apiFetch<VenueEvent[]>("/events/mine", { auth: true })
        .then((data) =>
          setEvents(
            data.map((e) => ({
              ...e,
              venue_id: "",
              venue_name: "",
              city: "",
              state: "",
            }))
          )
        )
        .catch((e: any) => setErr(e.message ?? "Failed to load events"))
        .finally(() => setBusy(false));
    } else {
      const suffix = showPast ? "?include_past=true" : "";
      apiFetch<VenueEventPublic[]>(`/events${suffix}`, { auth: false })
        .then(setEvents)
        .catch((e: any) => setErr(e.message ?? "Failed to load events"))
        .finally(() => setBusy(false));
    }
  }, [showPast, isVenue]);

  const upcoming = events.filter((e) => isFutureOrToday(e.date, today));
  const past = events.filter((e) => !isFutureOrToday(e.date, today));

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div className="sectionTitle">{isVenue ? "Your Events" : "Venue Events"}</div>
            <div className="smallMuted">
              {upcoming.length} upcoming{showPast ? ` • ${past.length} past` : ""}
            </div>
          </div>
          <div className="btnRow">
            <Button variant="ghost" onClick={() => setShowPast((v) => !v)}>
              {showPast ? "Hide past events" : "Show past events"}
            </Button>
          </div>
        </div>

        <div className="divider" />

        {busy && <div className="smallMuted">Loading…</div>}
        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        {!busy && !err && upcoming.length === 0 && (
          <Card>
            <div className="cardTitle">No upcoming events</div>
            <div className="cardMeta" style={{ marginTop: 6 }}>
              Check back later for new venue dates.
            </div>
          </Card>
        )}

        {!busy && !err && upcoming.length > 0 && (
          <div className="cardList">
            {upcoming.map((ev) => (
              <Card key={ev.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div className="cardTitle">{ev.title}</div>
                      {!isVenue && <Link className="smallMuted" to={`/venues/${ev.venue_id}`}>View venue</Link>}
                      {!isVenue && <Tag>Venue</Tag>}
                    </div>
                    {!isVenue && <div className="cardMeta">{ev.venue_name} • {ev.city}, {ev.state}</div>}
                    {ev.description && (
                      <div className="smallMuted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                        {ev.description}
                      </div>
                    )}
                  </div>
                  <div className="cardMeta" style={{ whiteSpace: "nowrap" }}>{ev.date}</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showPast && !busy && !err && past.length > 0 && (
          <>
            <div className="divider" />
            <div className="sectionTitle">Past Events</div>
            <div className="cardList">
              {past.map((ev) => (
                <Card key={ev.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div className="cardTitle">{ev.title}</div>
                        {!isVenue && <Link className="smallMuted" to={`/venues/${ev.venue_id}`}>View venue</Link>}
                        {!isVenue && <Tag>Venue</Tag>}
                      </div>
                      {!isVenue && <div className="cardMeta">{ev.venue_name} • {ev.city}, {ev.state}</div>}
                      {ev.description && (
                        <div className="smallMuted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                          {ev.description}
                        </div>
                      )}
                    </div>
                    <div className="cardMeta" style={{ whiteSpace: "nowrap" }}>{ev.date}</div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
