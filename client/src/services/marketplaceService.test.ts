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
    createdIds.push(created.id);

    expect(marketplaceService.getById(created.id)).toEqual(created);
    expect(marketplaceService.getListings("Kask", "Test", "İzmir")).toContainEqual(created);
    expect(marketplaceService.deleteListing(created.id)).toBe(true);
    expect(marketplaceService.getById(created.id)).toBeUndefined();
  });
});
