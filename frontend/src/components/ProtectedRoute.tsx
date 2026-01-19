import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../lib/auth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!isAuthed()) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
