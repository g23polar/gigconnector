import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiUpload } from "../lib/api";
import { clearToken } from "../lib/auth";
import type { EventImportResult, Venue, VenueEvent } from "../lib/types";
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

type VenueIn = {
  venue_name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code?: string | null;
  capacity: number;
  max_budget: number;
  amenities: Record<string, unknown>;
  genre_names: string[];
};

export default function ProfileVenue() {
  const nav = useNavigate();
  const [model, setModel] = useState<VenueIn>({
    venue_name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "US",
    zip_code: null,
    capacity: 0,
    max_budget: 0,
    amenities: {},
    genre_names: [],
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", date: "" });
  const [eventBusy, setEventBusy] = useState(false);
  const [eventErr, setEventErr] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<EventImportResult | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    apiFetch<Venue>(`/venue-profile/me`)
      .then((v) => {
        setModel((m) => ({
          ...m,
          venue_name: v.venue_name,
          description: v.description,
          address: v.address,
          city: v.city,
          state: v.state,
          country: v.country,
          zip_code: v.zip_code ?? null,
          capacity: v.capacity,
          max_budget: v.max_budget,
          amenities: v.amenities,
          genre_names: v.genres,
        }));
        setSelectedGenres(v.genres);
        setEvents(v.events ?? []);
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
    if (!model.address.trim()) {
      setErr("Address is required.");
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
        genre_names: selectedGenres,
      };

      await apiFetch(`/venue-profile`, { method: "POST", body: payload });
      setOk("Saved.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const onAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) {
      setEventErr("Title and date are required.");
      return;
    }
    setEventErr(null);
    setEventBusy(true);
    try {
      const created = await apiFetch<VenueEvent>("/events", {
        method: "POST",
        body: newEvent,
      });
      setEvents((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewEvent({ title: "", description: "", date: "" });
    } catch (e: any) {
      setEventErr(e.message ?? "Failed to add event");
    } finally {
      setEventBusy(false);
    }
  };

  const onDeleteEvent = async (eventId: string) => {
    try {
      await apiFetch(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {}
  };

  const onImportCalendar = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setImportErr("Please select an .ics file.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".ics")) {
      setImportErr("Please select a valid .ics (iCalendar) file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImportErr("File is too large. Maximum size is 2 MB.");
      return;
    }

    setImportErr(null);
    setImportResult(null);
    setImportBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiUpload<EventImportResult>("/events/import", formData);
      setImportResult(result);

      if (result.imported > 0) {
        const updated = await apiFetch<VenueEvent[]>("/events/mine");
        setEvents(updated);
      }
    } catch (e: any) {
      setImportErr(e.message ?? "Failed to import calendar");
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDeleteAccount = async () => {
    if (!confirm("Delete your account and profile? This cannot be undone.")) return;
    setErr(null);
    setDeleteBusy(true);
    try {
      await apiFetch(`/users/me`, { method: "DELETE" });
      clearToken();
      nav("/");
    } catch (e: any) {
      setErr(e.message ?? "Failed to delete account");
    } finally {
      setDeleteBusy(false);
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

            <Field label="Description" hint="One or two sentences about the room, vibe, and expectations.">
              <textarea value={model.description} onChange={(e) => setModel({ ...model, description: e.target.value })} />
            </Field>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Location</div>
            <Field label="Address" hint="Address is required.">
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

            <Field label="Zip Code" hint="US zip code — used for distance filtering in search.">
              <input
                className="input"
                value={model.zip_code ?? ""}
                onChange={(e) => setModel({ ...model, zip_code: e.target.value || null })}
                placeholder="e.g., 90210"
                maxLength={10}
              />
            </Field>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Commercials</div>

            <Field label="Capacity">
              <input className="input" type="number" value={model.capacity} onChange={(e) => setModel({ ...model, capacity: Number(e.target.value) })} />
            </Field>

            <div className="grid2">
              <Field label="Maximum budget">
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

        <div className="divider" />

        <div>
          <div className="sectionTitle">Events</div>
          <p className="sectionDesc">
            Add upcoming events for artists to see on your profile.
          </p>

          {eventErr && <div className="error" style={{ marginBottom: 12 }}>{eventErr}</div>}

          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <div className="grid2">
              <Field label="Event title">
                <input
                  className="input"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Open Mic Night"
                  maxLength={200}
                />
              </Field>
              <Field label="Date">
                <input
                  className="input"
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description" hint="Optional — a short note about the event.">
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                style={{ minHeight: 60 }}
              />
            </Field>
            <div>
              <Button type="button" variant="primary" onClick={onAddEvent} disabled={eventBusy}>
                {eventBusy ? "Adding..." : "Add event"}
              </Button>
            </div>
          </div>

          <div style={{ padding: "14px 0", borderTop: `1px solid var(--border)` }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Import from calendar</div>
            <p className="smallMuted" style={{ marginBottom: 10 }}>
              Upload an .ics file to import events in bulk. Duplicates (same title and date) will be skipped.
            </p>

            {importErr && <div className="error" style={{ marginBottom: 12 }}>{importErr}</div>}

            {importResult && (
              <div className="ok" style={{ marginBottom: 12 }}>
                Imported {importResult.imported} event{importResult.imported !== 1 ? "s" : ""}.
                {importResult.skipped > 0 && (
                  <> Skipped {importResult.skipped} (duplicates or missing data).</>
                )}
                {importResult.errors.length > 0 && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", fontSize: 13 }}>
                      {importResult.errors.length} warning{importResult.errors.length !== 1 ? "s" : ""}
                    </summary>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="btnRow">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                style={{ fontSize: 13 }}
              />
              <Button type="button" onClick={onImportCalendar} disabled={importBusy}>
                {importBusy ? "Importing..." : "Import .ics"}
              </Button>
            </div>
          </div>

          {events.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {events.map((ev) => (
                <div className="card" key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="cardTitle">{ev.title}</div>
                    <div className="cardMeta">{ev.date}</div>
                    {ev.description && (
                      <div className="smallMuted" style={{ marginTop: 4 }}>{ev.description}</div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" onClick={() => onDeleteEvent(ev.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {events.length === 0 && (
            <div className="smallMuted">No events yet.</div>
          )}
        </div>

        <div className="divider" />


        <br></br>
        <br></br>
        <div>
          <div className="sectionTitle">Danger zone</div>
          <p className="sectionDesc">Delete your account and profile permanently.</p>
          <Button variant="ghost" onClick={onDeleteAccount} disabled={deleteBusy}>
            {deleteBusy ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
