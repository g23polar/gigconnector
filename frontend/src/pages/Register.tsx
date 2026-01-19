import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { register } from "../lib/api";
import type { Role } from "../lib/types";

export default function Register() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("artist");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = params.get("role");
    if (r === "artist" || r === "venue") setRole(r);
  }, [params]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (password.length < 8) {
        setErr("Password must be at least 8 characters.");
        setBusy(false);
        return;
      }

      await register(email, password, role);

      const next = params.get("next");
      if (next) {
        nav(decodeURIComponent(next));
        return;
      }

      nav(role === "artist" ? "/profile/artist" : "/profile/venue");
    } catch (e: any) {
      setErr(e.message ?? "Register failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="panel panelPad">
        <h2 className="h2">Create account</h2>
        {err && <div className="error" style={{ marginBottom: 10 }}>{err}</div>}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field">
            <label>Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="artist">Artist/Band</option>
              <option value="venue">Venue/Bar</option>
            </select>
          </div>

          <button className="btn btnPrimary" disabled={busy}>
            {busy ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="pMuted" style={{ marginTop: 12 }}>
          Already have an account? <Link to={`/login${params.get("next") ? `?next=${params.get("next")}` : ""}`}>Login</Link>
        </div>
      </div>
    </div>
  );
}
