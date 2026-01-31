import type { SpotifyPublicData } from "../lib/types";

const formatDuration = (value: number | null) => {
  if (!value) return null;
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatReleaseDate = (value: string | null, precision: string | null) => {
  if (!value) return "--";
  if (precision === "year") return value;
  if (precision === "month") return value;
  return value;
};

export default function SpotifyStats({ data }: { data: SpotifyPublicData }) {
  if (!data.connected) return null;

  const topTracks = data.top_tracks.slice(0, 5);
  const releases = data.recent_releases.slice(0, 5);

  return (
    <div>
      <div className="grid2" style={{ marginBottom: 14 }}>
        {data.monthly_listeners != null && (
          <div className="kpiItem">
            <div className="kpiLabel">Monthly listeners</div>
            <div className="kpiValue">{data.monthly_listeners.toLocaleString()}</div>
          </div>
        )}
        {data.followers != null && (
          <div className="kpiItem">
            <div className="kpiLabel">Spotify Followers</div>
            <div className="kpiValue">{data.followers.toLocaleString()}</div>
          </div>
        )}
        {data.popularity != null && (
          <div className="kpiItem">
            <div className="kpiLabel">Popularity</div>
            <div className="kpiValue">{data.popularity}/100</div>
          </div>
        )}
      </div>
      {data.genres.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="smallMuted">
            Spotify Genres: {data.genres.join(", ")}
          </div>
        </div>
      )}
      {topTracks.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="cardTitle" style={{ marginBottom: 8 }}>Top tracks</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topTracks.map((track) => {
              const duration = formatDuration(track.duration_ms);
              return (
                <div key={`${track.name}-${track.track_url ?? "track"}`} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {track.album_image && (
                    <img
                      src={track.album_image}
                      alt={track.album_name ?? track.name}
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="cardTitle" style={{ fontSize: 14 }}>{track.name}</div>
                    <div className="cardMeta">
                      {track.album_name ?? "Single"}
                      {duration ? ` · ${duration}` : ""}
                    </div>
                  </div>
                  {track.preview_url && (
                    <audio controls src={track.preview_url} style={{ width: 160 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {releases.length > 0 && (
        <div className="card">
          <div className="cardTitle" style={{ marginBottom: 8 }}>Recent releases</div>
          <div style={{ display: "grid", gap: 10 }}>
            {releases.map((release) => (
              <div key={`${release.name}-${release.release_date ?? "release"}`} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {release.image && (
                  <img
                    src={release.image}
                    alt={release.name}
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="cardTitle" style={{ fontSize: 14 }}>{release.name}</div>
                  <div className="cardMeta">
                    {formatReleaseDate(release.release_date, release.release_date_precision)}
                    {release.album_type ? ` · ${release.album_type}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
