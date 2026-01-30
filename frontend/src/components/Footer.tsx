import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footerInner">
        {/* <div className="footerBrand">Gig Connecter
          <Link to="/"></Link>
        </div> */}
        <div className="footerLinks">
          <Link to="/">Gig Connector</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
