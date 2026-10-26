import { describe, expect, it } from "vitest";
import { businessService } from "./businessService";
import { communityService } from "./communityService";
import { adService } from "./adService";
import { marketplaceService } from "./marketplaceService";

describe("unverified demo data is not presented as real", () => {
  it("does not seed fabricated businesses, ratings, phone numbers, or addresses", () => {
    expect(businessService.getBusinesses()).toEqual([]);
  });

  it("does not seed fabricated community users, posts, likes, or comments", () => {
    expect(communityService.getPosts()).toEqual([]);
  });

  it("does not seed fake sponsors, discounts, or example advertising links", () => {
    expect(adService.getBanners()).toEqual([]);
  });

  it("does not seed example marketplace offers", () => {
    expect(marketplaceService.getListings()).toEqual([]);
  });
});
