import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getRole, isAuthed } from "../lib/auth";

export default function NavBar() {
  const nav = useNavigate();
  const role = getRole();
  const [matchOpen, setMatchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"artists" | "venues">(
    role === "venue" ? "artists" : "venues"
  );
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

  useEffect(() => {
    if (role === "venue") {
      setSearchType("artists");
    } else if (role === "artist") {
      setSearchType("venues");
    }
  }, [role]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    const base = searchType === "artists" ? "/search/artists" : "/search/venues";
    nav(trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base);
  };

  return (
    <div className="nav">
      <div className="container navInner">
        {(role === "artist" || role === "venue") && (
          <Link to="/" style={{ color: "var(--text)", fontWeight: 800 }}>
            {role === "artist" ? "Artist | Gig Connector" : role == "venue" ? "Venue | Gig Connector" : "Gig Connector"}
          </Link>
        )}

        {(role !== "artist" && role !== "venue") && (
          <Link to="/" style={{ color: "var(--text)", fontWeight: 800 }}>
            {"Gig Connector"}
          </Link>
        )}


        <Link to="/search/venues">Find Venues</Link>
        <Link to="/search/artists">Find Artists</Link>

        <Link to="/leaderboard">Leaderboard</Link>
        {isAuthed() && (
          <>
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
          <form className="navSearch" onSubmit={submitSearch}>
            <input
              className="navSearchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${searchType}`}
              aria-label="Search artists or venues"
            />
            <select
              className="navSearchSelect"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as "artists" | "venues")}
              aria-label="Search type"
            >
              <option value="artists">Artists</option>
              <option value="venues">Venues</option>
            </select>
            <button className="btn btnGhost navSearchButton" type="submit">
              Search
            </button>
          </form>
          {isAuthed() ? (
            <>
              <Link to="/gigs">Your Gigs</Link>
              <Link to="/bookmarks">Bookmarks</Link>
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
