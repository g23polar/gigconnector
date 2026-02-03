import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { clearToken } from "../lib/auth";
import type { Artist, SpotifyPublicData } from "../lib/types";
import Button from "../ui/Button";
import { Field } from "../ui/Field";
import { Panel } from "../ui/Card";
import LazyVideo from "../ui/LazyVideo";
import SpotifyConnectButton from "../components/SpotifyConnectButton";
import SpotifyStats from "../components/SpotifyStats";
import SpotifyEmbed from "../components/SpotifyEmbed";

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
  min_draw: number;
  max_draw: number;
  media_links: Record<string, unknown>;
  genre_names: string[];
};

type MediaItem = {
  name: string;
  url: string;
  type: string;
  size: number;
};

type PlaceComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlaceResult = {
  address_components?: PlaceComponent[];
  formatted_address?: string;
  place_id?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

const MAX_PROFILE_MEDIA_BYTES = 15 * 1024 * 1024;
const GOOGLE_PLACES_SCRIPT_ATTR = "data-google-places";
let googlePlacesPromise: Promise<void> | null = null;

const loadGooglePlaces = (apiKey: string) => {
  if (window.google?.maps?.places) return Promise.resolve();
  if (googlePlacesPromise) return googlePlacesPromise;
  googlePlacesPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[${GOOGLE_PLACES_SCRIPT_ATTR}]`);
    if (existing) {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Places.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute(GOOGLE_PLACES_SCRIPT_ATTR, "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Places."));
    document.head.appendChild(script);
  });
  return googlePlacesPromise;
};

const normalizeUploads = (value: unknown): MediaItem[] => {
  if (!Array.isArray(value)) return [];
  const items: MediaItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : "";
    if (!url) continue;
    items.push({
      name: typeof record.name === "string" ? record.name : "Untitled",
      url,
      type: typeof record.type === "string" ? record.type : "",
      size: typeof record.size === "number" ? record.size : 0,
    });
  }
  return items;
};

const normalizeSingleMedia = (value: unknown): MediaItem | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";
  if (!url) return null;
  return {
    name: typeof record.name === "string" ? record.name : "Untitled",
    url,
    type: typeof record.type === "string" ? record.type : "",
    size: typeof record.size === "number" ? record.size : 0,
  };
};

export default function ProfileArtist() {
  const nav = useNavigate();
  const placesInputRef = useRef<HTMLInputElement>(null);
  const [placesReady, setPlacesReady] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesStatus, setPlacesStatus] = useState<string | null>(null);
  const [model, setModel] = useState<ArtistIn>({
    name: "",
    bio: "",
    city: "",
    state: "",
    country: "US",
    zip_code: null,
    travel_radius_miles: 25,
    min_rate: 0,
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
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);
  const [spotifyData, setSpotifyData] = useState<SpotifyPublicData | null>(null);

  const fetchSpotifyData = (profileId: string) => {
    apiFetch<SpotifyPublicData>(`/spotify/public/${encodeURIComponent(profileId)}`)
      .then(setSpotifyData)
      .catch(() => setSpotifyData(null));
  };

  // Fetch Spotify data once we have the artist profile ID
  useEffect(() => {
    if (!artistProfileId) return;
    fetchSpotifyData(artistProfileId);
  }, [artistProfileId]);

  // Detect Spotify OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") === "connected") {
      setOk("Spotify connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      if (artistProfileId) fetchSpotifyData(artistProfileId);
    }
  }, [artistProfileId]);

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
    apiFetch<Artist>(`/artist-profile/me?include_media=false`)
      .then((a) => {
        setArtistProfileId(a.id);
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
          min_draw: a.min_draw,
          max_draw: a.max_draw,
          media_links: a.media_links,
          genre_names: a.genres,
        }));
        setSelectedGenres(a.genres);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setPlacesError("Missing Google Maps API key.");
      return;
    }
    let active = true;
    loadGooglePlaces(apiKey)
      .then(() => {
        if (!active) return;
        setPlacesReady(true);
      })
      .catch((error: any) => {
        if (!active) return;
        setPlacesError(error?.message ?? "Failed to load Google Places.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!placesReady || !placesInputRef.current || !window.google?.maps?.places) return;
    const autocomplete = new window.google.maps.places.Autocomplete(placesInputRef.current, {
      types: ["geocode"],
    });
    if (autocomplete.setFields) {
      autocomplete.setFields(["address_component", "formatted_address", "place_id"]);
    }
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace() as PlaceResult;
      const components = place.address_components ?? [];
      const findComponent = (type: string) =>
        components.find((c) => c.types.includes(type));
      const city =
        findComponent("locality")?.long_name ??
        findComponent("postal_town")?.long_name ??
        findComponent("administrative_area_level_2")?.long_name ??
        "";
      const state = findComponent("administrative_area_level_1")?.short_name ?? "";
      const country = findComponent("country")?.short_name ?? "";
      const zip = findComponent("postal_code")?.long_name ?? "";

      setModel((m) => ({
        ...m,
        city: city || m.city,
        state: state || m.state,
        country: country || m.country,
        zip_code: zip || m.zip_code,
        media_links: {
          ...m.media_links,
          location_place_id: place.place_id ?? "",
        },
      }));
      setPlacesStatus(place.formatted_address ? `Verified: ${place.formatted_address}` : "Verified.");
      setErr(null);
    });
    return () => {
      if (listener) listener.remove();
    };
  }, [placesReady]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!model.name.trim()) {
      setErr("Name is required.");
      return;
    }
    const spotifyLink = String(model.media_links?.spotify ?? "").trim();
    if (spotifyLink) {
      try {
        const url = new URL(spotifyLink);
        const host = url.hostname.toLowerCase();
        if (!host.endsWith("spotify.com")) {
          setErr("Spotify link must be a spotify.com URL.");
          return;
        }
      } catch {
        setErr("Spotify link must be a valid URL.");
        return;
      }
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

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const onMediaSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    await handleMediaSelection(e, "uploads", true);
  };

  const onLiveRecordingSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    await handleMediaSelection(e, "live_recording", false);
  };

  const handleMediaSelection = async (
    e: ChangeEvent<HTMLInputElement>,
    target: "uploads" | "live_recording",
    allowMultiple: boolean
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!allowMultiple && files.length > 1) {
      setErr("Please select a single live recording.");
      e.target.value = "";
      return;
    }
    setErr(null);
    setOk(null);

    const invalid = files.find((file) => {
      if (target === "live_recording") {
        return !file.type.startsWith("video/");
      }
      return !(
        file.type.startsWith("image/") ||
        file.type.startsWith("audio/") ||
        file.type.startsWith("video/")
      );
    });
    if (invalid) {
      setErr(
        target === "live_recording"
          ? `"${invalid.name}" must be a video file.`
          : `"${invalid.name}" is not an image, audio, or video file.`
      );
      e.target.value = "";
      return;
    }

    const uploads = normalizeUploads(model.media_links?.uploads);
    const liveRecording = normalizeSingleMedia(model.media_links?.live_recording);
    const existingTotal =
      uploads.reduce((sum, item) => sum + item.size, 0) +
      (target === "live_recording" ? 0 : liveRecording?.size ?? 0);
    const newTotal = files.reduce((sum, file) => sum + file.size, 0);
    if (existingTotal + newTotal > MAX_PROFILE_MEDIA_BYTES) {
      setErr("Total media size exceeds 15MB for this profile.");
      e.target.value = "";
      return;
    }

    setUploadBusy(true);
    try {
      const newItems = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type,
          url: await readFileAsDataUrl(file),
          size: file.size,
        }))
      );
      if (target === "live_recording") {
        setModel({
          ...model,
          media_links: { ...model.media_links, live_recording: newItems[0] },
        });
        setOk("Live recording added. Remember to save your profile.");
        return;
      }
      setModel({
        ...model,
        media_links: { ...model.media_links, uploads: [...uploads, ...newItems] },
      });
      setOk("Media added. Remember to save your profile.");
    } catch (error: any) {
      setErr(error?.message ?? "Failed to add media.");
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  const onRemoveUpload = (index: number) => {
    const uploads = normalizeUploads(model.media_links?.uploads);
    const next = uploads.filter((_, idx) => idx !== index);
    setModel({
      ...model,
      media_links: { ...model.media_links, uploads: next },
    });
  };

  const onRemoveLiveRecording = () => {
    const { live_recording, ...rest } = model.media_links ?? {};
    setModel({
      ...model,
      media_links: { ...rest },
    });
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

  const liveItem = normalizeSingleMedia(model.media_links?.live_recording);
  const uploadItems = normalizeUploads(model.media_links?.uploads);
  const hasPlaceId = Boolean((model.media_links as Record<string, unknown> | undefined)?.location_place_id);

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

            <Field label="Spotify" hint="Connect your Spotify account for rich stats and embedded player.">
              <SpotifyConnectButton />
            </Field>

            {spotifyData?.connected && (
              <div style={{ marginBottom: 14 }}>
                <SpotifyStats data={spotifyData} />
                {spotifyData.spotify_artist_id && (
                  <SpotifyEmbed spotifyArtistId={spotifyData.spotify_artist_id} />
                )}
              </div>
            )}

            <Field label="Spotify link" hint="Or paste a link manually (optional)">
              <input
                className="input"
                value={String(model.media_links?.spotify ?? "")}
                onChange={(e) =>
                  setModel({
                    ...model,
                    media_links: { ...model.media_links, spotify: e.target.value },
                  })
                }
              />
            </Field>

            <Field
              label="Live performance recording"
              hint="Optional: one video recording (15MB total max)."
            >
              <input
                className="input"
                type="file"
                accept="video/*"
                onChange={onLiveRecordingSelected}
                disabled={uploadBusy}
              />
              {liveItem && (
                <div className="card" style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div className="smallMuted">{liveItem.name}</div>
                      {liveItem.type.startsWith("video/") && (
                        <LazyVideo
                          controls
                          src={liveItem.url}
                          style={{ width: "100%", maxHeight: 220 }}
                        />
                      )}
                    </div>
                    <Button type="button" variant="ghost" onClick={onRemoveLiveRecording}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </Field>

            <Field
              label="Additional media"
              hint="Optional images, audio, or video (15MB total max)."
            >
              <input
                className="input"
                type="file"
                accept="image/*,audio/*,video/*"
                multiple
                onChange={onMediaSelected}
                disabled={uploadBusy}
              />
              {uploadItems.length > 0 && (
                <div className="card" style={{ marginTop: 10 }}>
                  {uploadItems.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}
                    >
                      <div style={{ flex: 1 }}>
                        {!item.type.startsWith("image/") && (
                          <div className="smallMuted">{item.name}</div>
                        )}
                        {item.type.startsWith("image/") && (
                          <img
                            src={item.url}
                            alt={item.name}
                            style={{ maxWidth: 220, maxHeight: 140, borderRadius: 8 }}
                          />
                        )}
                        {item.type.startsWith("audio/") && (
                          <audio controls src={item.url} style={{ width: "100%" }} />
                        )}
                        {item.type.startsWith("video/") && (
                          <LazyVideo controls src={item.url} style={{ width: "100%", maxHeight: 220 }} />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onRemoveUpload(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div className="divider" />

          <div>
            <div className="sectionTitle">Location</div>
            <Field
              label="Verify location"
              hint="Use Google to validate and autofill city/state/zip."
            >
              <input
                ref={placesInputRef}
                className="input"
                placeholder="Search for your city or address"
                disabled={!!placesError || !placesReady}
              />
              {placesError && <div className="smallMuted" style={{ marginTop: 6 }}>{placesError}</div>}
              {placesStatus && (
                <div className="smallMuted" style={{ marginTop: 6 }}>
                  {placesStatus}
                </div>
              )}
              {!placesStatus && hasPlaceId && (
                <div className="smallMuted" style={{ marginTop: 6 }}>
                  Location verified with Google.
                </div>
              )}
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
              <Field label="Minimum rate">
                <input className="input" type="number" value={model.min_rate} onChange={(e) => setModel({ ...model, min_rate: Number(e.target.value) })} />
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
