import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getRole, isAuthed } from "../lib/auth";

export default function NavBar() {
  const nav = useNavigate();
  const role = getRole();
  const [matchOpen, setMatchOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const logout = () => {
    clearToken();
    nav("/login");
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setMatchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
            <div className="navDropdown" ref={dropRef}>
              <button
                className="navDropdownToggle"
                onClick={() => setMatchOpen((v) => !v)}
              >
                Matching ▾
              </button>
              {matchOpen && (
                <div className="navDropdownMenu">
                  <Link to="/matches" onClick={() => setMatchOpen(false)}>Matches</Link>
                  <Link to="/matches/incoming" onClick={() => setMatchOpen(false)}>Requests</Link>
                  <Link to="/matches/pending" onClick={() => setMatchOpen(false)}>Your pending requests</Link>
                </div>
              )}
            </div>
          </>
        )}

        <div className="navRight">
          {isAuthed() ? (
            <>
              {role === "venue" &&<Link to="/events">Your Events</Link>}
              <Link to="/onboarding">My Profile</Link>
              <button className="btn btnGhost" onClick={logout}>
                Logout
              </button>
            </>
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
