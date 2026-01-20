import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { Artist } from "../lib/types";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel } from "../ui/Card";

const POPULAR_GENRES = [
  "Rock",
  "Pop",
  "Hip Hop",
  "R&B",
  "Country",
  "Jazz",
  "Blues",
  "Electronic",
  "Folk",
  "Metal",
  "Punk",
  "Indie",
  "Classical",
  "Reggae",
  "Latin",
] as const;

type ArtistIn = {
  name: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  zip_code?: string | null;
  travel_radius_miles: number;
  min_rate: number;
  max_rate: number;
  min_draw: number;
  max_draw: number;
  media_links: Record<string, unknown>;
  genre_names: string[];
};

export default function ProfileArtist() {
  const [model, setModel] = useState<ArtistIn>({
    name: "",
    bio: "",
    city: "",
    state: "",
    country: "US",
    zip_code: null,
    travel_radius_miles: 25,
    min_rate: 0,
    max_rate: 0,
    min_draw: 0,
    max_draw: 0,
    media_links: {},
    genre_names: [],
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(e.target as Node)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    apiFetch<Artist>(`/artist-profile/me`)
      .then((a) => {
        setModel((m) => ({
          ...m,
          name: a.name,
          bio: a.bio,
          city: a.city,
          state: a.state,
          country: a.country,
          zip_code: a.zip_code ?? null,
          travel_radius_miles: a.travel_radius_miles,
          min_rate: a.min_rate,
          max_rate: a.max_rate,
          min_draw: a.min_draw,
          max_draw: a.max_draw,
          media_links: a.media_links,
          genre_names: a.genres,
        }));
        setSelectedGenres(a.genres);
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!model.name.trim()) {
      setErr("Name is required.");
      return;
    }
    if (!model.city.trim() || !model.state.trim()) {
      setErr("City and state are required.");
      return;
    }

    setBusy(true);
    try {
      const payload: ArtistIn = {
        ...model,
        genre_names: selectedGenres,
      };

      await apiFetch(`/artist-profile`, { method: "POST", body: payload });
      setOk("Saved.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 920 }}>
      <Panel>
        <div className="sectionTitle">Artist profile</div>
        <p className="sectionDesc">
          This is what venues will see when filtering. Keep it concise and specific.
        </p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
        {ok && <div className="ok" style={{ marginBottom: 12 }}>{ok}</div>}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <div className="sectionTitle">Basics</div>
            <div className="grid2">
              <Field label="Artist/Band name">
                <input className="input" value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} />
              </Field>

              <Field label="Genres" hint="Select all that apply">
                <div className="genreDropdown" ref={genreDropdownRef}>
                  <button
                    type="button"
                    className="genreDropdownTrigger"
                    onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                  >
                    <span>
                      {selectedGenres.length === 0
                        ? "Select genres..."
                        : selectedGenres.length === 1
                        ? selectedGenres[0]
                        : `${selectedGenres.length} genres selected`}
                    </span>
                    <span className="genreDropdownArrow">{genreDropdownOpen ? "▲" : "▼"}</span>
                  </button>
                  {genreDropdownOpen && (
                    <div className="genreDropdownMenu">
                      {POPULAR_GENRES.map((genre) => (
                        <label key={genre} className="genreDropdownItem">
                          <input
                            type="checkbox"
                            checked={selectedGenres.includes(genre)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGenres([...selectedGenres, genre]);
                              } else {
                                setSelectedGenres(selectedGenres.filter((g) => g !== genre));
                              }
                            }}
                          />
                          {genre}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            <Field label="Bio" hint="One or two sentences about your sound and what you're looking for.">
              <textarea value={model.bio} onChange={(e) => setModel({ ...model, bio: e.target.value })} />
            </Field>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Location</div>
            <div className="grid2">
              <Field label="City">
                <input className="input" value={model.city} onChange={(e) => setModel({ ...model, city: e.target.value })} />
              </Field>
              <Field label="State">
                <input className="input" value={model.state} onChange={(e) => setModel({ ...model, state: e.target.value })} />
              </Field>
            </div>

            <div className="grid2">
              <Field label="Zip Code" hint="US zip code — used for distance filtering in search.">
                <input
                  className="input"
                  value={model.zip_code ?? ""}
                  onChange={(e) => setModel({ ...model, zip_code: e.target.value || null })}
                  placeholder="e.g., 90210"
                  maxLength={10}
                />
              </Field>
              <Field label="Travel radius (miles)">
                <input
                  className="input"
                  type="number"
                  value={model.travel_radius_miles}
                  onChange={(e) => setModel({ ...model, travel_radius_miles: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Commercials</div>
            <div className="grid2">
              <Field label="Rate range (min)">
                <input className="input" type="number" value={model.min_rate} onChange={(e) => setModel({ ...model, min_rate: Number(e.target.value) })} />
              </Field>
              <Field label="Rate range (max)">
                <input className="input" type="number" value={model.max_rate} onChange={(e) => setModel({ ...model, max_rate: Number(e.target.value) })} />
              </Field>
            </div>

            <div className="grid2">
              <Field label="Expected draw (min)">
                <input className="input" type="number" value={model.min_draw} onChange={(e) => setModel({ ...model, min_draw: Number(e.target.value) })} />
              </Field>
              <Field label="Expected draw (max)">
                <input className="input" type="number" value={model.max_draw} onChange={(e) => setModel({ ...model, max_draw: Number(e.target.value) })} />
              </Field>
            </div>
          </div>

          <div className="btnRow">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving..." : "Save profile"}
            </Button>
            <span className="smallMuted">Tip: You can update this anytime.</span>
          </div>
        </form>
      </Panel>
    </div>
  );
}
