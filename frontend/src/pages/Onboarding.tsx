import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Link } from "react-router-dom";
import type { Role } from "../lib/types";

export default function Onboarding() {
  const [role, setRole] = useState<Role | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ role: Role }>(`/users/me`)
      .then((me) => setRole(me.role))
      .catch(() => {
        // backend may not have /users/me; let user pick
        setErr("Could not infer role from API. Choose your profile type below.");
      });
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>My Profile</h2>
      {err && <div style={{ color: "#666", marginBottom: 12 }}>{err}</div>}

      {role ? (
        <div style={{ display: "grid", gap: 8 }}>
          {role === "artist" ? (
            <Link to="/profile/artist">Edit Artist Profile</Link>
          ) : (
            <Link to="/profile/venue">Edit Venue Profile</Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <Link to="/profile/artist">I am an Artist/Band</Link>
          <Link to="/profile/venue">I am a Venue/Bar</Link>
        </div>
      )}
    </div>
  );
}
