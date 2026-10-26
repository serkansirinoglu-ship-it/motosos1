import { beforeEach, describe, expect, it } from "vitest";
import { marketplaceService, type ListingItem } from "./marketplaceService";

describe("MarketplaceService local listing lifecycle", () => {
  const createdIds: string[] = [];

  beforeEach(() => {
    for (const id of createdIds.splice(0)) marketplaceService.deleteListing(id);
  });

  it("does not expose hard-coded sample offers as real listings", () => {
    expect(marketplaceService.getListings()).toEqual([]);
  });

  it("creates, filters, and removes a session-local listing", () => {
    const input: Omit<ListingItem, "id" | "createdAt"> = {
      title: "Test kask",
      category: "Kask",
      price: 1200,
      city: "İzmir",
      description: "Test ilanı",
      sellerName: "Test satıcı",
    };
    const created = marketplaceService.createListing(input);
    expect(created).not.toBeNull();
    if (!created) throw new Error("Valid listing was rejected");
    createdIds.push(created.id);

    expect(marketplaceService.getById(created.id)).toEqual(created);
    expect(marketplaceService.getListings("Kask", "Test", "İzmir")).toContainEqual(created);
    expect(marketplaceService.deleteListing(created.id)).toBe(true);
    expect(marketplaceService.getById(created.id)).toBeUndefined();
  });

  it("rejects invalid data at the service boundary", () => {
    const base: Omit<ListingItem, "id" | "createdAt"> = {
      title: "Test kask",
      category: "Kask",
      price: 1200,
      city: "İzmir",
      description: "Test ilanı",
      sellerName: "Test satıcı",
    };

    expect(marketplaceService.createListing({ ...base, price: 0 })).toBeNull();
    expect(marketplaceService.createListing({ ...base, price: Number.NaN })).toBeNull();
    expect(marketplaceService.createListing({ ...base, title: "   " })).toBeNull();
    expect(marketplaceService.createListing({ ...base, title: "x".repeat(161) })).toBeNull();
    expect(marketplaceService.createListing({ ...base, description: "x".repeat(5001) })).toBeNull();
    expect(marketplaceService.createListing({ ...base, image: "javascript:alert(1)" })).toBeNull();
    expect(marketplaceService.createListing({ ...base, image: "data:image/svg+xml,test" })).toBeNull();
    const validImageListing = marketplaceService.createListing({ ...base, image: "https://example.test/image.png" });
    expect(validImageListing).not.toBeNull();
    if (validImageListing) createdIds.push(validImageListing.id);
  });
});
