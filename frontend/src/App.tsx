import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import ProfileArtist from "./pages/ProfileArtist";
import ProfileVenue from "./pages/ProfileVenue";
import SearchArtists from "./pages/SearchArtists";
import SearchVenues from "./pages/SearchVenues";
import VenueEvents from "./pages/VenueEvents";
import Bookmarks from "./pages/Bookmarks";
import ArtistDetail from "./pages/ArtistDetail";
import VenueDetail from "./pages/VenueDetail";
import Matches from "./pages/Matches";
import MatchIncoming from "./pages/MatchIncoming";
import MatchPending from "./pages/MatchPending";
import GigsPage from "./pages/Gigs";
import GigDetail from "./pages/GigDetail";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";

export default function App() {
  return (
    <BrowserRouter>
      <div className="appShell">
        <NavBar />
        <main className="appMain">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile/artist"
              element={
                <ProtectedRoute>
                  <ProfileArtist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/venue"
              element={
                <ProtectedRoute>
                  <ProfileVenue />
                </ProtectedRoute>
              }
            />

            <Route
              path="/search/artists"
              element={
                <ProtectedRoute>
                  <SearchArtists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search/venues"
              element={
                <ProtectedRoute>
                  <SearchVenues />
                </ProtectedRoute>
              }
            />
            <Route path="/events" element={<VenueEvents />} />

            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/venues/:id" element={<VenueDetail />} />

            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <Bookmarks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/incoming"
              element={
                <ProtectedRoute>
                  <MatchIncoming />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/pending"
              element={
                <ProtectedRoute>
                  <MatchPending />
                </ProtectedRoute>
              }
            />

            <Route
              path="/gigs"
              element={
                <ProtectedRoute>
                  <GigsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gigs/:id"
              element={
                <ProtectedRoute>
                  <GigDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
