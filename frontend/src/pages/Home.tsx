import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRole, isAuthed } from "../lib/auth";


export default function Home() {
  const artistNext = encodeURIComponent("/profile/artist");
  const venueNext = encodeURIComponent("/profile/venue");
  const authed = isAuthed();
  const role = getRole();
  const words = (role === "artist") ? ["venue?"] : ["musician?"];

  const [targetIndex, setTargetIndex] = useState(0);
  const [displayWord, setDisplayWord] = useState("");

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTargetIndex((i) => (i + 1) % words.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, [words.length]);

  useEffect(() => {
    const target = words[targetIndex];
    if (displayWord === target) return;

    const shouldDelete = !target.startsWith(displayWord);
    const next = shouldDelete
      ? displayWord.slice(0, -1)
      : target.slice(0, displayWord.length + 1);
    const timeout = shouldDelete ? 70 : 120;

    const timerId = setTimeout(() => setDisplayWord(next), timeout);
    return () => clearTimeout(timerId);
  }, [displayWord, targetIndex, words]);

  return (
    <div>
      
      <section className="homeHero">
        <div className="homeHeroBg" />
        <div className="homeHeroOverlay" />

        <div className="homeHeroInner">
          <div className="homeTopRow">
            {/* <div>TURN IT UP</div>
            <div>PARTY HARD</div> */}
          </div>
          <div className="homeTopRule" />

          <div className="homeHeadlineWrap">
            <h1 className="homeHeadline">LOOKING FOR</h1>
            <h1 className="homeHeadline">
              A{" "}
              <span className="typeWord">{displayWord || " "}</span>
              <span className="typeCursor">|</span>
            </h1>

            <div className="homeSubHeadline">Book your shows.</div> 

            <div className="homeSubHeadline">track events, ticket sales, and earnings.</div>

            <div className="homeCTA">

              {(role === "venue" || role === "artist") && (
                <Link className="btn" to="/dashboard">
                  Your metrics
                </Link>
              )}

              {role !== "venue" && (
                <Link className="btn" to="/search/venues">
                  Browse venues
                </Link>
              )}
              {role !== "artist" && (
                <Link className="btn" to="/search/artists">
                  Browse artists
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Second section (scroll down) */}
      {!authed && (
        <section id="choose" className="homeSecond">
          <div className="container">
            <div className="panel panelPad">
              <div className="sectionTitle">Choose your side</div>
              <p className="sectionDesc">
                Create a profile first. Then filter, browse, and bookmark options.
              </p>

              <div className="homeSplit">
                <div className="card">
                  <div className="cardTitle">I’m an artist</div>
                  <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                    Build your artist/band profile and start finding venues that fit.
                  </div>
                  <Link className="btn btnPrimary" to={`/register?role=artist&next=${artistNext}`}>
                    I’m an artist
                  </Link>
                </div>

                <div className="card">
                  <div className="cardTitle">I’m a venue</div>
                  <div className="cardMeta" style={{ marginTop: 6, marginBottom: 12 }}>
                    Create your venue profile and start discovering artists near you.
                  </div>
                  <Link className="btn btnPrimary" to={`/register?role=venue&next=${venueNext}`}>
                    I’m a venue
                  </Link>
                </div>
              </div>

              <div className="smallMuted" style={{ marginTop: 14 }}>
                Already have an account?{" "}
                <Link to={`/login?next=${artistNext}`}>Login</Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
