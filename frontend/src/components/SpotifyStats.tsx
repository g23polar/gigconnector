import type { SpotifyPublicData } from "../lib/types";

export default function SpotifyStats({ data }: { data: SpotifyPublicData }) {
  if (!data.connected) return null;

  return (
    <div>
      <div className="grid2" style={{ marginBottom: 14 }}>
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
    </div>
  );
}
