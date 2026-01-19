import { Link, useNavigate } from "react-router-dom";
import { clearToken, isAuthed } from "../lib/auth";

export default function NavBar() {
  const nav = useNavigate();

  const logout = () => {
    clearToken();
    nav("/login");
  };

  return (
    <div className="nav">
      <div className="container navInner">
        <Link to="/" style={{ color: "var(--text)", fontWeight: 800 }}>
          Gig Connector
        </Link>
        <Link to="/search/artists">Artists</Link>
        <Link to="/search/venues">Venues</Link>
        <Link to="/onboarding">My Profile</Link>
        <Link to="/bookmarks">Bookmarks</Link>

        <div className="navRight">
          {isAuthed() ? (
            <button className="btn btnGhost" onClick={logout}>
              Logout
            </button>
          ) : (
            <Link className="btn btnGhost" to="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
