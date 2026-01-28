import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { getRole } from "../lib/auth";
import type { Gig, GigStatus } from "../lib/types";
import { Card, Panel } from "../ui/Card";

type Tab = "all" | "upcoming" | "completed" | "cancelled";

type SeriesPoint = {
  label: string;
  value: number;
};

const statusClass = (s: GigStatus) =>
  s === "upcoming"
    ? "pill statusUpcoming"
    : s === "completed"
      ? "pill statusCompleted"
      : "pill statusCancelled";

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatCurrency = (cents: number | null) => {
  if (cents == null) return "--";
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCurrencyFromValue = (value: number) => {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const parseGigDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMonthLabel = (date: Date) =>
  date.toLocaleString("en-US", { month: "short", year: "2-digit" });

const buildSeries = (
  gigs: Gig[],
  valueGetter: (gig: Gig) => number | null
): SeriesPoint[] => {
  const totals = new Map<string, { date: Date; value: number }>();

  gigs.forEach((gig) => {
    if (gig.status !== "completed") return;
    const date = parseGigDate(gig.date);
    if (!date) return;
    const value = valueGetter(gig);
    if (value == null) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = totals.get(key) ?? {
      date: new Date(date.getFullYear(), date.getMonth(), 1),
      value: 0,
    };
    existing.value += value;
    totals.set(key, existing);
  });

  return Array.from(totals.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({ label: formatMonthLabel(entry.date), value: entry.value }));
};

function LineChart({ data, label }: { data: SeriesPoint[]; label: string }) {
  const width = 560;
  const height = 180;
  const paddingX = 32;
  const paddingY = 24;

  const values = data.map((point) => point.value);
  const maxValue = Math.max(0, ...values);
  const minValue = Math.min(0, ...values);
  const range = maxValue - minValue || 1;

  const step = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const baseline = height - paddingY;

  const points = data.map((point, index) => {
    const x = paddingX + index * step;
    const ratio = (point.value - minValue) / range;
    const y = paddingY + (1 - ratio) * (height - paddingY * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `M${points[0].x},${baseline} L${points
          .map((point) => `${point.x},${point.y}`)
          .join(" L")} L${points[points.length - 1].x},${baseline} Z`
      : `M${points[0].x},${baseline} L${points[0].x},${points[0].y} L${points[0].x},${baseline} Z`;

  const midY = paddingY + (baseline - paddingY) / 2;

  return (
    <svg
      className="chartSvg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <line className="chartGrid" x1={paddingX} x2={width - paddingX} y1={paddingY} y2={paddingY} />
      <line className="chartGrid" x1={paddingX} x2={width - paddingX} y1={midY} y2={midY} />
      <line className="chartGrid" x1={paddingX} x2={width - paddingX} y1={baseline} y2={baseline} />
      <path className="chartFill" d={areaPath} />
      <path className="chartLine" d={linePath} />
      {points.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}`}
          className="chartPoint"
          cx={point.x}
          cy={point.y}
          r={index === points.length - 1 ? 4 : 2}
        />
      ))}
    </svg>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  valueFormatter,
  style,
  ariaLabel,
}: {
  title: string;
  subtitle: string;
  data: SeriesPoint[];
  valueFormatter: (value: number) => string;
  style?: CSSProperties;
  ariaLabel: string;
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const latest = data.length ? data[data.length - 1].value : 0;

  return (
    <Card className="chartCard" {...(style ? { style } : {})}>
      <div className="chartHeader">
        <div>
          <div className="cardTitle">{title}</div>
          <div className="cardMeta" style={{ marginTop: 6 }}>
            {subtitle}
          </div>
        </div>
        <div className="chartStats">
          <div>
            <div className="chartStatLabel">Total</div>
            <div className="chartStatValue">{valueFormatter(total)}</div>
          </div>
          <div>
            <div className="chartStatLabel">Latest</div>
            <div className="chartStatValue">{valueFormatter(latest)}</div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="chartEmpty">No data yet. Add metrics to completed gigs.</div>
      ) : (
        <LineChart data={data} label={ariaLabel} />
      )}

      {data.length > 0 && (
        <div className="chartAxis">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const role = getRole();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
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

    load();
  }, []);

  const completedGigs = useMemo(
    () => gigs.filter((gig) => gig.status === "completed"),
    [gigs]
  );
  const upcomingGigs = useMemo(
    () => gigs.filter((gig) => gig.status === "upcoming"),
    [gigs]
  );
  const cancelledGigs = useMemo(
    () => gigs.filter((gig) => gig.status === "cancelled"),
    [gigs]
  );

  const ticketSeries = useMemo(
    () => buildSeries(completedGigs, (gig) => gig.tickets_sold),
    [completedGigs]
  );
  const earningsSeries = useMemo(
    () =>
      buildSeries(completedGigs, (gig) =>
        gig.gross_revenue_cents == null ? null : gig.gross_revenue_cents / 100
      ),
    [completedGigs]
  );

  const metrics = useMemo(() => {
    const totalGigs = gigs.length;
    const verifiedGigs = completedGigs.filter(
      (gig) => gig.artist_confirmed && gig.venue_confirmed
    ).length;

    const gigsWithTickets = completedGigs.filter((gig) => gig.tickets_sold != null);
    const totalTickets = gigsWithTickets.reduce(
      (sum, gig) => sum + (gig.tickets_sold ?? 0),
      0
    );
    const avgTickets = gigsWithTickets.length
      ? totalTickets / gigsWithTickets.length
      : null;

    const gigsWithAttendance = completedGigs.filter((gig) => gig.attendance != null);
    const totalAttendance = gigsWithAttendance.reduce(
      (sum, gig) => sum + (gig.attendance ?? 0),
      0
    );
    const avgAttendance = gigsWithAttendance.length
      ? totalAttendance / gigsWithAttendance.length
      : null;

    const gigsWithRevenue = completedGigs.filter(
      (gig) => gig.gross_revenue_cents != null
    );
    const totalRevenueCents = gigsWithRevenue.reduce(
      (sum, gig) => sum + (gig.gross_revenue_cents ?? 0),
      0
    );
    const avgRevenueCents = gigsWithRevenue.length
      ? totalRevenueCents / gigsWithRevenue.length
      : null;

    const gigsWithTicketPrice = completedGigs.filter(
      (gig) => gig.ticket_price_cents != null
    );
    const avgTicketPriceCents = gigsWithTicketPrice.length
      ? gigsWithTicketPrice.reduce(
          (sum, gig) => sum + (gig.ticket_price_cents ?? 0),
          0
        ) / gigsWithTicketPrice.length
      : null;

    const partnerIds = new Set(
      gigs.map((gig) =>
        role === "artist" ? gig.venue_profile_id : gig.artist_profile_id
      )
    );

    return {
      totalGigs,
      verifiedGigs,
      totalTickets,
      avgTickets,
      totalAttendance,
      avgAttendance,
      totalRevenueCents,
      avgRevenueCents,
      avgTicketPriceCents,
      uniquePartners: partnerIds.size,
      ticketDataCount: gigsWithTickets.length,
      attendanceDataCount: gigsWithAttendance.length,
      revenueDataCount: gigsWithRevenue.length,
    };
  }, [gigs, completedGigs, role]);

  const filteredGigs = useMemo(() => {
    if (tab === "all") return gigs;
    return gigs.filter((gig) => gig.status === tab);
  }, [gigs, tab]);

  const partnerLabel = role === "artist" ? "Venue" : role === "venue" ? "Artist" : "Partner";
  const title = role === "artist" ? "Artist dashboard" : role === "venue" ? "Venue dashboard" : "Dashboard";

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <Panel>
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
            <div className="sectionTitle">{title}</div>
            <div className="sectionDesc">
              Track gig performance, ticket sales, and earnings over time.
            </div>
          </div>
          <div className="btnRow" style={{ flexShrink: 0 }}>
            <Link className="btn btnGhost" to="/onboarding">
              Back to profile
            </Link>
            <Link className="btn btnPrimary" to="/gigs">
              Manage gigs
            </Link>
          </div>
        </div>

        <div className="divider" />

        <div className="kpi" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div className="kpiItem">
            <div className="kpiLabel">Total gigs</div>
            <div className="kpiValue">{metrics.totalGigs}</div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Upcoming</div>
            <div className="kpiValue">{upcomingGigs.length}</div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Completed</div>
            <div className="kpiValue">{completedGigs.length}</div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Verified</div>
            <div className="kpiValue">{metrics.verifiedGigs}</div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Total tickets</div>
            <div className="kpiValue">{formatNumber(metrics.totalTickets)}</div>
          </div>
          <div className="kpiItem">
            <div className="kpiLabel">Total earnings</div>
            <div className="kpiValue">{formatCurrency(metrics.totalRevenueCents)}</div>
          </div>
        </div>
      </Panel>

      <div style={{ height: 14 }} />

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {busy && <div className="smallMuted">Loading dashboard...</div>}

      {!busy && (
        <>
          <div className="dashboardGrid">
            <Card>
              <div className="sectionTitle">Metrics overview</div>
              <table className="metricsTable">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total gigs</td>
                    <td className="metricsValue">{metrics.totalGigs}</td>
                  </tr>
                  <tr>
                    <td>Upcoming gigs</td>
                    <td className="metricsValue">{upcomingGigs.length}</td>
                  </tr>
                  <tr>
                    <td>Completed gigs</td>
                    <td className="metricsValue">{completedGigs.length}</td>
                  </tr>
                  <tr>
                    <td>Cancelled gigs</td>
                    <td className="metricsValue">{cancelledGigs.length}</td>
                  </tr>
                  <tr>
                    <td>Verified gigs</td>
                    <td className="metricsValue">{metrics.verifiedGigs}</td>
                  </tr>
                  <tr>
                    <td>Unique {partnerLabel.toLowerCase()}s</td>
                    <td className="metricsValue">{metrics.uniquePartners}</td>
                  </tr>
                  <tr>
                    <td>Total tickets sold</td>
                    <td className="metricsValue">{formatNumber(metrics.totalTickets)}</td>
                  </tr>
                  <tr>
                    <td>Average tickets sold</td>
                    <td className="metricsValue">
                      {metrics.avgTickets == null
                        ? "--"
                        : formatNumber(metrics.avgTickets, 1)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total attendance</td>
                    <td className="metricsValue">{formatNumber(metrics.totalAttendance)}</td>
                  </tr>
                  <tr>
                    <td>Average attendance</td>
                    <td className="metricsValue">
                      {metrics.avgAttendance == null
                        ? "--"
                        : formatNumber(metrics.avgAttendance, 1)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total earnings</td>
                    <td className="metricsValue">{formatCurrency(metrics.totalRevenueCents)}</td>
                  </tr>
                  <tr>
                    <td>Average gross per gig</td>
                    <td className="metricsValue">
                      {metrics.avgRevenueCents == null
                        ? "--"
                        : formatCurrency(metrics.avgRevenueCents)}
                    </td>
                  </tr>
                  <tr>
                    <td>Average ticket price</td>
                    <td className="metricsValue">
                      {metrics.avgTicketPriceCents == null
                        ? "--"
                        : formatCurrency(metrics.avgTicketPriceCents)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="smallMuted" style={{ marginTop: 10 }}>
                Ticket, attendance, and revenue totals use completed gigs with metrics.
              </div>
            </Card>

            <div className="dashboardCharts">
              <ChartCard
                title="Total ticket sales"
                subtitle="Monthly totals from completed gigs"
                data={ticketSeries}
                valueFormatter={(value) => formatNumber(value)}
                style={{
                  "--chart": "#8ee3ff",
                  "--chartFade": "rgba(142,227,255,.2)",
                } as CSSProperties}
                ariaLabel="Total ticket sales over time"
              />
              <ChartCard
                title="Total earnings"
                subtitle="Monthly gross revenue from completed gigs"
                data={earningsSeries}
                valueFormatter={(value) => formatCurrencyFromValue(value)}
                style={{
                  "--chart": "#86efac",
                  "--chartFade": "rgba(134,239,172,.2)",
                } as CSSProperties}
                ariaLabel="Total earnings over time"
              />
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div className="sectionTitle">Listed gigs</div>
          <div className="sectionDesc">
            {role ? `All gigs linked to this ${role} profile.` : "All gigs linked to your profile."}
          </div>

          <div className="tabRow">
            {(["all", "upcoming", "completed", "cancelled"] as Tab[]).map((value) => (
              <button
                key={value}
                className={`tab${tab === value ? " tabActive" : ""}`}
                onClick={() => setTab(value)}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
                {value !== "all" && ` (${gigs.filter((gig) => gig.status === value).length})`}
                {value === "all" && ` (${gigs.length})`}
              </button>
            ))}
          </div>

          {filteredGigs.length === 0 && (
            <div className="smallMuted">No gigs to show.</div>
          )}

          {filteredGigs.length > 0 && (
            <div className="cardList">
              {filteredGigs.map((gig) => {
                const partnerName =
                  role === "artist" ? gig.venue_name : role === "venue" ? gig.artist_name : "Partner";
                const verified = gig.artist_confirmed && gig.venue_confirmed;
                return (
                  <Card key={gig.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
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
                          <span className="cardTitle">{gig.title}</span>
                          <span className={statusClass(gig.status)}>{gig.status}</span>
                          {verified && <span className="verifiedBadge">Verified</span>}
                        </div>
                        <div className="cardMeta">
                          {partnerName} &middot; {gig.date}
                        </div>
                        <div className="cardMeta">
                          Tickets: {gig.tickets_sold ?? "--"} &middot; Earnings: {formatCurrency(gig.gross_revenue_cents)}
                        </div>
                      </div>
                      <Link className="btn btnGhost" to={`/gigs/${gig.id}`}>
                        View
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
