import { describe, expect, it } from "vitest";
import { parseProfileMusicUrl } from "./profileMusic";

describe("parseProfileMusicUrl", () => {
  it.each(["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://music.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?t=20"])("normalizes supported YouTube links: %s", (input) => {
    expect(parseProfileMusicUrl(input)).toEqual({ provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
  });
  it.each(["https://open.spotify.com/track/0123456789012345678901", "https://open.spotify.com/album/0123456789012345678901", "https://open.spotify.com/playlist/0123456789012345678901"])("normalizes supported Spotify links: %s", (input) => {
    expect(parseProfileMusicUrl(input)?.provider).toBe("spotify");
    expect(parseProfileMusicUrl(input)?.embedUrl).toContain("/embed/");
  });
  it.each(["", "not a url", "http://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=short", "https://youtu.be/short", "https://open.spotify.com/artist/0123456789012345678901", "https://open.spotify.com/track/not-a-valid-id", "javascript:alert(1)", "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ"])("rejects unsupported or unsafe links: %s", (input) => {
    expect(parseProfileMusicUrl(input)).toBeNull();
  });
  it("rejects non-string and oversized values", () => {
    expect(parseProfileMusicUrl(null)).toBeNull();
    expect(parseProfileMusicUrl(42)).toBeNull();
    expect(parseProfileMusicUrl("https://youtube.com/" + "a".repeat(2048))).toBeNull();
  });
});