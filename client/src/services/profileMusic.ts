export type ProfileMusicEmbed =
  | { provider: "youtube"; embedUrl: string; canonicalUrl: string }
  | { provider: "spotify"; embedUrl: string; canonicalUrl: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/** Accept only known YouTube video and Spotify track/album/playlist links. */
export function parseProfileMusicUrl(input: unknown): ProfileMusicEmbed | null {
  if (typeof input !== "string" || input.trim().length === 0 || input.length > 2048) return null;

  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host) && url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return { provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/" + id, canonicalUrl: "https://www.youtube.com/watch?v=" + id };
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (!YOUTUBE_ID.test(id) || id.includes("/")) return null;
    return { provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/" + id, canonicalUrl: "https://www.youtube.com/watch?v=" + id };
  }

  if (host === "open.spotify.com") {
    const match = url.pathname.match(/^\/(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/);
    if (!match || !SPOTIFY_ID.test(match[2])) return null;
    const kind = match[1];
    const id = match[2];
    return { provider: "spotify", embedUrl: "https://open.spotify.com/embed/" + kind + "/" + id, canonicalUrl: "https://open.spotify.com/" + kind + "/" + id };
  }

  return null;
}