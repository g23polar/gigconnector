import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login, loginWithGoogle } from "../lib/api";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email, password);

      const next = params.get("next");
      if (next) {
        nav(decodeURIComponent(next));
        return;
      }

      nav("/onboarding");
    } catch (e: any) {
      setErr(e.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (token: string) => {
    setErr(null);
    setGoogleBusy(true);
    try {
      await loginWithGoogle(token);
      const next = params.get("next");
      if (next) {
        nav(decodeURIComponent(next));
        return;
      }
      nav("/onboarding");
    } catch (e: any) {
      setErr(e.message ?? "Google login failed");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="panel panelPad">
        <h2 className="h2">Login</h2>
        {err && <div className="error" style={{ marginBottom: 10 }}>{err}</div>}

        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <GoogleAuthButton onCredential={onGoogle} onError={setErr} text="signin_with" />
          {googleBusy && <div className="smallMuted">Contacting Google...</div>}
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="btn btnPrimary" disabled={busy}>
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="pMuted" style={{ marginTop: 12 }}>
          No account?{" "}
          <Link to={`/register${params.get("next") ? `?next=${params.get("next")}` : ""}`}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
