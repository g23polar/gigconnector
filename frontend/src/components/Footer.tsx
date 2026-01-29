import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footerInner">
        <div className="footerBrand">Gig Connecter
          <Link to="/"></Link>
        </div>
        <div className="footerLinks">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
