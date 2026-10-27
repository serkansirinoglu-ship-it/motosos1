import { describe, expect, it } from "vitest";
import { buildNearbyServiceLinks } from "./nearbyServices";

describe("buildNearbyServiceLinks", () => {
  it("builds all supported nearby-service links for valid coordinates", () => {
    const links = buildNearbyServiceLinks(38.4237, 27.1428);

    expect(links.map((link) => link.key)).toEqual(["usta", "cekici", "lastikci", "benzinlik"]);
    expect(links).toHaveLength(4);
    expect(links[0].searchUrl).toContain("@38.4237,27.1428,14z");
    expect(links[0].directionsUrl).toContain("origin=38.4237,27.1428");
    expect(links[0].directionsUrl).toContain("destination=motosiklet%20usta%20tamirci");
    expect(links.every((link) => link.searchUrl.startsWith("https://www.google.com/maps/search/"))).toBe(true);
    expect(links.every((link) => link.directionsUrl.startsWith("https://www.google.com/maps/dir/?api=1&"))).toBe(true);
  });

  it.each([
    [Number.NaN, 10],
    [Number.POSITIVE_INFINITY, 10],
    [-91, 10],
    [91, 10],
    [10, Number.NaN],
    [10, Number.NEGATIVE_INFINITY],
    [10, -181],
    [10, 181],
  ])("rejects invalid coordinates (%s, %s)", (latitude, longitude) => {
    expect(buildNearbyServiceLinks(latitude, longitude)).toEqual([]);
  });

  it("accepts valid geographic boundary coordinates", () => {
    expect(buildNearbyServiceLinks(-90, -180)).toHaveLength(4);
    expect(buildNearbyServiceLinks(90, 180)).toHaveLength(4);
  });
});
