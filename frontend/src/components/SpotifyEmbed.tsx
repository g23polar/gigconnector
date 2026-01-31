export default function SpotifyEmbed({ spotifyArtistId }: { spotifyArtistId: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden" }}>
      <iframe
        src={`https://open.spotify.com/embed/artist/${spotifyArtistId}?utm_source=generator&theme=0`}
        width="100%"
        height="352"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify Artist"
        style={{ borderRadius: 12 }}
      />
    </div>
  );
}
