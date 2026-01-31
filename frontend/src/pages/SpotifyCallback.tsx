import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function SpotifyCallback() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      setErr("Missing authorization parameters from Spotify.");
      return;
    }

    apiFetch("/spotify/callback", {
      method: "POST",
      body: { code, state },
    })
      .then(() => {
        nav("/profile/artist?spotify=connected", { replace: true });
      })
      .catch((e: any) => {
        setErr(e.message ?? "Failed to connect Spotify.");
      });
  }, [nav]);

  if (err) {
    return (
      <div className="container" style={{ maxWidth: 600, textAlign: "center", marginTop: 80 }}>
        <div className="error">{err}</div>
        <div style={{ marginTop: 16 }}>
          <a href="/profile/artist">Back to profile</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600, textAlign: "center", marginTop: 80 }}>
      <div className="smallMuted">Connecting Spotify...</div>
    </div>
  );
}
