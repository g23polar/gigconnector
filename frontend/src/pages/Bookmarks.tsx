import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { Bookmark } from "../lib/types";

export default function Bookmarks() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const data = await apiFetch<Bookmark[]>(`/bookmarks`);
      setItems(data);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load bookmarks");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    await apiFetch(`/bookmarks/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Bookmarks</h2>
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((b) => (
          <div key={b.id} style={{ border: "1px solid #ddd", padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{b.type.toUpperCase()}</div>
              <div style={{ color: "#666" }}>Entity ID: {b.entity_id}</div>
            </div>
            <button onClick={() => remove(b.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
