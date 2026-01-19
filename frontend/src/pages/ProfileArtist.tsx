import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { Artist } from "../lib/types";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel } from "../ui/Card";

type ArtistIn = {
  name: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
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
    lat: null,
    lng: null,
    travel_radius_miles: 25,
    min_rate: 0,
    max_rate: 0,
    min_draw: 0,
    max_draw: 0,
    media_links: {},
    genre_names: [],
  });

  const [genresText, setGenresText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          travel_radius_miles: a.travel_radius_miles,
          min_rate: a.min_rate,
          max_rate: a.max_rate,
          min_draw: a.min_draw,
          max_draw: a.max_draw,
          media_links: a.media_links,
          genre_names: a.genres,
        }));
        setGenresText(a.genres.join(", "));
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
        genre_names: genresText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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

              <Field label="Genres" hint="Comma-separated (e.g., rock, indie, punk)">
                <input className="input" value={genresText} onChange={(e) => setGenresText(e.target.value)} />
              </Field>
            </div>

            <Field label="Bio" hint="One or two sentences about your sound and what you’re looking for.">
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
              <Field label="Latitude" hint="Optional — used for distance filtering.">
                <input
                  className="input"
                  type="number"
                  value={model.lat ?? ""}
                  onChange={(e) => setModel({ ...model, lat: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
              <Field label="Longitude" hint="Optional — used for distance filtering.">
                <input
                  className="input"
                  type="number"
                  value={model.lng ?? ""}
                  onChange={(e) => setModel({ ...model, lng: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            </div>

            <Field label="Travel radius (miles)">
              <input
                className="input"
                type="number"
                value={model.travel_radius_miles}
                onChange={(e) => setModel({ ...model, travel_radius_miles: Number(e.target.value) })}
              />
            </Field>
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
