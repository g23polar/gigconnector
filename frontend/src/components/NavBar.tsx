import { Link, useNavigate } from "react-router-dom";
import { clearToken, getRole, isAuthed } from "../lib/auth";

export default function NavBar() {
  const nav = useNavigate();
  const role = getRole();

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

        {/* Artists search for venues, venues search for artists */}
        {role === "artist" && <Link to="/search/venues">Find Venues</Link>}
        {role === "venue" && <Link to="/search/artists">Find Artists</Link>}
        {!role && (
          <>
            <Link to="/search/artists">Artists</Link>
            <Link to="/search/venues">Venues</Link>
          </>
        )}

        {isAuthed() && (
          <>
        
            <Link to="/bookmarks">Bookmarks</Link>
            <Link to="/matches">Matches</Link>
            <Link to="/matches/incoming">Requests</Link>
            <Link to="/matches/pending">Pending</Link>
          </>
        )}

        <div className="navRight">
          {isAuthed() ? (
        <><Link to="/onboarding">My Profile</Link><button className="btn btnGhost" onClick={logout}>
              Logout
            </button></>
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
