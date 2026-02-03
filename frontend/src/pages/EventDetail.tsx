import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Panel } from "../ui/Card";
import type { VenueEventPublic } from "../lib/types";

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const eventId = id ?? "";

  const [event, setEvent] = useState<VenueEventPublic | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setErr(null);
    setBusy(true);
    apiFetch<VenueEventPublic>(`/events/${encodeURIComponent(eventId)}`)
      .then(setEvent)
      .catch((e: any) => setErr(e.message ?? "Failed to load event"))
      .finally(() => setBusy(false));
  }, [eventId]);

  useEffect(() => {
    if (event) {
      document.title = `${event.title} — GigConnecter`;
    }
    return () => {
      document.title = "GigConnecter";
    };
  }, [event]);

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="smallMuted" style={{ marginBottom: 10 }}>
        <a onClick={() => nav(-1)} style={{ cursor: "pointer" }}>← Back to events</a>
      </div>

      <Panel>
        {busy && <div className="smallMuted">Loading...</div>}
        {err && <div className="error">{err}</div>}

        {event && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div className="sectionTitle" style={{ marginBottom: 4 }}>
                {event.title}
              </div>
              <div className="cardMeta">{event.date}</div>
            </div>

            <div className="divider" />

            <div>
              <div className="sectionTitle">Venue</div>
              <div className="smallMuted">
                <Link to={`/venues/${event.venue_id}`}>{event.venue_name}</Link>
                {" — "}
                {event.city}, {event.state}
              </div>
            </div>

            {event.description && (
              <>
                <div className="divider" />
                <div>
                  <div className="sectionTitle">About this event</div>
                  <div
                    className="smallMuted"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {event.description}
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
