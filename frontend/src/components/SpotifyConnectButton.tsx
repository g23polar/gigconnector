import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import Button from "../ui/Button";
import type { SpotifyConnection } from "../lib/types";

export default function SpotifyConnectButton() {
  const [connection, setConnection] = useState<SpotifyConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SpotifyConnection>("/spotify/connection")
      .then(setConnection)
      .catch(() => {});
  }, []);

  const connect = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/spotify/authorize");
      window.location.href = url;
    } catch (e: any) {
      setErr(e.message ?? "Failed to start Spotify authorization");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/spotify/connection", { method: "DELETE" });
      setConnection({
        connected: false,
        spotify_artist_id: null,
        spotify_data: {},
        data_fetched_at: null,
      });
    } catch (e: any) {
      setErr(e.message ?? "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  if (!connection) return null;

  return (
    <div>
      {err && <div className="error" style={{ marginBottom: 8 }}>{err}</div>}
      {connection.connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="smallMuted">Spotify connected</span>
          <Button variant="ghost" onClick={disconnect} disabled={busy}>
            {busy ? "Disconnecting..." : "Disconnect"}
          </Button>
        </div>
      ) : (
        <Button variant="primary" onClick={connect} disabled={busy}>
          {busy ? "Connecting..." : "Connect with Spotify"}
        </Button>
      )}
    </div>
  );
}
