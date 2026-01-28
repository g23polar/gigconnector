import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { Gig, GigStatus } from "../lib/types";
import { Panel } from "../ui/Card";

function centsToDisplay(cents: number | null): string {
  if (cents == null) return "---";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const [gig, setGig] = useState<Gig | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // metrics form
  const [tickets, setTickets] = useState("");
  const [attendance, setAttendance] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [revenue, setRevenue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const g = await apiFetch<Gig>(`/gigs/${id}`);
      setGig(g);
      // Pre-fill metrics form
      if (g.tickets_sold != null) setTickets(String(g.tickets_sold));
      if (g.attendance != null) setAttendance(String(g.attendance));
      if (g.ticket_price_cents != null)
        setTicketPrice(String(g.ticket_price_cents));
      if (g.gross_revenue_cents != null) setRevenue(String(g.gross_revenue_cents));
    } catch (e: any) {
      setErr(e.message ?? "Failed to load gig");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const submitMetrics = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setErr(null);
    setOk(null);
    try {
      const body: Record<string, number> = {};
      if (tickets) body.tickets_sold = parseInt(tickets, 10);
      if (attendance) body.attendance = parseInt(attendance, 10);
      if (ticketPrice) body.ticket_price_cents = parseInt(ticketPrice, 10);
      if (revenue) body.gross_revenue_cents = parseInt(revenue, 10);

      const updated = await apiFetch<Gig>(`/gigs/${id}/metrics`, {
        method: "PATCH",
        body,
      });
      setGig(updated);
      setOk("Metrics submitted.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to submit metrics");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmMetrics = async () => {
    if (!id) return;
    setErr(null);
    setOk(null);
    try {
      const updated = await apiFetch<Gig>(`/gigs/${id}/confirm`, {
        method: "POST",
      });
      setGig(updated);
      setOk("Metrics confirmed.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to confirm");
    }
  };

  const updateStatus = async (status: "completed" | "cancelled") => {
    if (!id) return;
    setErr(null);
    setOk(null);
    try {
      const updated = await apiFetch<Gig>(`/gigs/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setGig(updated);
      setOk(`Gig marked as ${status}.`);
    } catch (e: any) {
      setErr(e.message ?? "Failed to update status");
    }
  };

  if (busy) {
    return (
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="smallMuted">Loading...</div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="container" style={{ maxWidth: 980 }}>
        {err && <div className="error">{err}</div>}
        {!err && <div className="smallMuted">Gig not found.</div>}
      </div>
    );
  }

  const statusClass = (s: GigStatus) =>
    s === "upcoming"
      ? "pill statusUpcoming"
      : s === "completed"
        ? "pill statusCompleted"
        : "pill statusCancelled";

  // Determine if current user is the artist or venue
  // We don't have direct user_id → profile mapping on GigOut,
  // but we can use created_by_user_id and the confirmation state
  const hasMetrics = gig.tickets_sold != null || gig.attendance != null;
  const isCancelled = gig.status === "cancelled";
  const verified = gig.artist_confirmed && gig.venue_confirmed;


  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Link
        to="/gigs"
        className="smallMuted"
        style={{ display: "inline-block", marginBottom: 12 }}
      >
        &larr; Back to gigs
      </Link>

      <Panel>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span className="sectionTitle" style={{ margin: 0 }}>
                {gig.title}
              </span>
              <span className={statusClass(gig.status)}>{gig.status}</span>
              {verified && <span className="verifiedBadge">Verified</span>}
            </div>
            <div className="cardMeta" style={{ marginTop: 4 }}>
              {gig.date} &middot; {gig.artist_name} &middot; {gig.venue_name}
            </div>
          </div>
        </div>

        {/* Metrics display */}
        <div className="divider" />
        <div className="sectionTitle">Metrics</div>
        <div className="grid2">
          <div className="kpiItem">
            <div className="kpiLabel">Tickets Sold</div>
            <div className="kpiValue">
              {gig.tickets_sold != null ? gig.tickets_sold : "---"}
            </div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Attendance</div>
            <div className="kpiValue">
              {gig.attendance != null ? gig.attendance : "---"}
            </div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Ticket Price</div>
            <div className="kpiValue">
              {centsToDisplay(gig.ticket_price_cents)}
            </div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Gross Revenue</div>
            <div className="kpiValue">
              {centsToDisplay(gig.gross_revenue_cents)}
            </div>
          </div>
        </div>

        {/* Verification status */}
        <div className="divider" />
        <div className="sectionTitle">Verification</div>
        <div className="grid2">
          <div className="kpiItem">
            <div className="kpiLabel">Artist Confirmed</div>
            <div className="kpiValue">
              {gig.artist_confirmed ? "Yes" : "No"}
            </div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Venue Confirmed</div>
            <div className="kpiValue">
              {gig.venue_confirmed ? "Yes" : "No"}
            </div>
          </div>
        </div>

        {/* Feedback messages */}
        {err && (
          <div className="error" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}
        {ok && (
          <div className="ok" style={{ marginTop: 14 }}>
            {ok}
          </div>
        )}

        {/* Actions */}
        {!isCancelled && (
          <>
            <div className="divider" />
            <div className="sectionTitle">Submit Metrics</div>
            <form onSubmit={submitMetrics}>
              <div className="grid2" style={{ marginBottom: 10 }}>
                <div className="field">
                  <label>Tickets Sold</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={tickets}
                    onChange={(e) => setTickets(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Attendance</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid2" style={{ marginBottom: 10 }}>
                <div className="field">
                  <label>Ticket Price (cents)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    placeholder="e.g. 2500 for $25.00"
                  />
                </div>
                <div className="field">
                  <label>Gross Revenue (cents)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder="e.g. 50000 for $500.00"
                  />
                </div>
              </div>
              <button
                className="btn btnPrimary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : verified? "Edit Verified Metrics" : "Submit Metrics"}
              </button>
            </form>

            {/* Confirm button */}
            {hasMetrics && !isCancelled && !verified && (
              <div style={{ marginTop: 14 }}>
                <button className="btn" onClick={confirmMetrics}>
                  Confirm Metrics
                </button>
                <span className="smallMuted" style={{ marginLeft: 10 }}>
                  Both parties must confirm for verification.
                </span>
              </div>
            )}

            {/* Status buttons */}
            {gig.status === "upcoming" && (
              <>
                <div className="divider" />
                <div className="btnRow">
                  <button
                    className="btn"
                    onClick={() => updateStatus("completed")}
                  >
                    Mark as Completed
                  </button>
                  <button
                    className="btn btnGhost"
                    onClick={() => updateStatus("cancelled")}
                  >
                    Cancel Gig
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
