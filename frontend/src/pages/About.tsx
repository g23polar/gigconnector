import { Panel } from "../ui/Card";

export default function About() {
  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <Panel>
        <div className="sectionTitle">About</div>
        <p className="sectionDesc">
          Gig Connecter helps artists and venues find each other, book shows, and
          track real performance metrics.
        </p>
        <div className="card">
          <div className="cardTitle">What you can do</div>
          <div className="cardMeta" style={{ marginTop: 8 }}>
            Build a profile, match with partners, create gigs, and verify ticket
            sales and earnings together.
          </div>
        </div>
      </Panel>


      <Panel>
        <div>className="card"{">"}
          <div className="cardMeta" style={{ marginTop: 8 }}>
              https://github.com/g23polar/gigconnector
          </div>
        </div>
      </Panel>
    </div>
  );
}
