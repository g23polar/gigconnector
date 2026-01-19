import { Link } from "react-router-dom";

export default function Home() {
  const artistNext = encodeURIComponent("/profile/artist");
  const venueNext = encodeURIComponent("/profile/venue");

  return (
    <div>
      <section className="homeHero">
        <div className="homeHeroBg" />
        <div className="homeHeroOverlay" />

        <div className="homeHeroInner">
          <div className="homeTopRow">
            <div>TURN IT UP</div>
            <div>PARTY HARD</div>
          </div>
          <div className="homeTopRule" />

          <div className="homeHeadlineWrap">
            <h1 className="homeHeadline">LOOKING FOR</h1>
            <h1 className="homeHeadline">A BAND?</h1>

            <div className="homeSubHeadline">FIND YOUR BAND / VENUE</div>

            <div className="homeCTA">
              <a className="btn btnPrimary" href="#choose">
                Get started
              </a>
              <Link className="btn" to="/search/venues">
                Browse venues
              </Link>
              <Link className="btn" to="/search/artists">
                Browse artists
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Second section (scroll down) */}
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
    </div>
  );
}
