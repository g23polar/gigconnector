import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { Venue } from "../lib/types";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel } from "../ui/Card";

type VenueIn = {
  venue_name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  capacity: number;
  min_budget: number;
  max_budget: number;
  amenities: Record<string, unknown>;
  genre_names: string[];
};

export default function ProfileVenue() {
  const [model, setModel] = useState<VenueIn>({
    venue_name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "US",
    lat: null,
    lng: null,
    capacity: 0,
    min_budget: 0,
    max_budget: 0,
    amenities: {},
    genre_names: [],
  });

  const [genresText, setGenresText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Venue>(`/venue-profile/me`)
      .then((v) => {
        setModel((m) => ({
          ...m,
          venue_name: v.venue_name,
          description: v.description,
          city: v.city,
          state: v.state,
          country: v.country,
          capacity: v.capacity,
          min_budget: v.min_budget,
          max_budget: v.max_budget,
          amenities: v.amenities,
          genre_names: v.genres,
        }));
        setGenresText(v.genres.join(", "));
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!model.venue_name.trim()) {
      setErr("Venue name is required.");
      return;
    }
    if (!model.city.trim() || !model.state.trim()) {
      setErr("City and state are required.");
      return;
    }

    setBusy(true);
    try {
      const payload: VenueIn = {
        ...model,
        genre_names: genresText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await apiFetch(`/venue-profile`, { method: "POST", body: payload });
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
        <div className="sectionTitle">Venue profile</div>
        <p className="sectionDesc">
          This is what artists will see when filtering. Emphasize capacity, budget, and fit.
        </p>

        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
        {ok && <div className="ok" style={{ marginBottom: 12 }}>{ok}</div>}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <div className="sectionTitle">Basics</div>
            <div className="grid2">
              <Field label="Venue name">
                <input className="input" value={model.venue_name} onChange={(e) => setModel({ ...model, venue_name: e.target.value })} />
              </Field>

              <Field label="Genres" hint="Comma-separated (e.g., rock, indie, hip-hop)">
                <input className="input" value={genresText} onChange={(e) => setGenresText(e.target.value)} />
              </Field>
            </div>

            <Field label="Description" hint="One or two sentences about the room, vibe, and expectations.">
              <textarea value={model.description} onChange={(e) => setModel({ ...model, description: e.target.value })} />
            </Field>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Location</div>
            <Field label="Address" hint="Optional — useful for context; distance filtering uses lat/lng.">
              <input className="input" value={model.address} onChange={(e) => setModel({ ...model, address: e.target.value })} />
            </Field>

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
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Commercials</div>

            <Field label="Capacity">
              <input className="input" type="number" value={model.capacity} onChange={(e) => setModel({ ...model, capacity: Number(e.target.value) })} />
            </Field>

            <div className="grid2">
              <Field label="Budget (min)">
                <input className="input" type="number" value={model.min_budget} onChange={(e) => setModel({ ...model, min_budget: Number(e.target.value) })} />
              </Field>
              <Field label="Budget (max)">
                <input className="input" type="number" value={model.max_budget} onChange={(e) => setModel({ ...model, max_budget: Number(e.target.value) })} />
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
