import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Panel, Card } from "../ui/Card";
import Tag from "../ui/Tag";

type MatchItem = {
  id: string;
  target_type: "artist" | "venue";
  target_id: string;
  name: string;
  city: string;
  state: string;
  created_at: string;
};

export default function Matches() {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiFetch<MatchItem[]>("/matches");
      setItems(data);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load matches");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div className="sectionTitle">Matches</div>
        <p className="sectionDesc">People you’ve matched with.</p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
        {busy && <div className="smallMuted">Loading...</div>}

        {!busy && items.length === 0 && !err && (
          <div className="smallMuted">No matches yet.</div>
        )}
      </Panel>

      <div style={{ height: 14 }} />

      {!busy && items.length > 0 && (
        <div className="cardList">
          {items.map((m) => {
            const href = m.target_type === "artist" ? `/artists/${m.target_id}` : `/venues/${m.target_id}`;
            return (
              <Card key={m.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <div className="cardTitle">{m.name}</div>
                      <Link className="smallMuted" to={href}>View</Link>
                      <Tag>{m.target_type === "artist" ? "Artist" : "Venue"}</Tag>
                    </div>
                    <div className="cardMeta">{m.city}, {m.state}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
