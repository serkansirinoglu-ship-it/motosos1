import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  snapshots: [] as Array<{ next: (snapshot: any) => void; error: (error: unknown) => void }>,
}));

vi.mock("firebase/app", () => ({ getApps: () => [{}] }));
vi.mock("firebase/auth", () => ({ getAuth: () => ({ currentUser: null }) }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  onSnapshot: vi.fn((_query: unknown, next: (snapshot: any) => void, error: (error: unknown) => void) => {
    mocks.snapshots.push({ next, error });
    return vi.fn();
  }),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => ({})),
  setDoc: vi.fn(),
}));

import { communityService } from "./communityService";
import { marketplaceService } from "./marketplaceService";

const postSnapshot = (id: string) => ({
  docs: [{
    id,
    data: () => ({
      authorId: "rider-1",
      authorName: "Rider",
      city: "Izmir",
      content: id,
      createdAt: { toDate: () => new Date("2026-10-01T00:00:00.000Z") },
    }),
  }],
});

const listingSnapshot = (id: string) => ({
  docs: [{
    id,
    data: () => ({
      sellerId: "rider-1",
      title: id,
      category: "Kask",
      price: 100,
      city: "Izmir",
      description: "Test listing",
      sellerName: "Rider",
      createdAt: { toDate: () => new Date("2026-10-01T00:00:00.000Z") },
    }),
  }],
});

describe("stale realtime feed callbacks", () => {
  beforeEach(() => {
    mocks.snapshots.length = 0;
    communityService.clearLocalSession();
    marketplaceService.clearLocalSession();
  });

  it("does not overwrite community cache or notify listeners for a stale snapshot", () => {
    let shouldApply = true;
    const onPosts = vi.fn();
    const onError = vi.fn();

    communityService.subscribeRemotePosts(onPosts, onError, () => shouldApply);
    const subscription = mocks.snapshots[0];

    subscription.next(postSnapshot("current-post"));
    expect(communityService.getPosts().map((post) => post.id)).toEqual(["current-post"]);
    expect(onPosts).toHaveBeenCalledTimes(1);

    shouldApply = false;
    subscription.next(postSnapshot("stale-post"));
    subscription.error(new Error("stale subscription error"));

    expect(communityService.getPosts().map((post) => post.id)).toEqual(["current-post"]);
    expect(onPosts).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not overwrite marketplace cache or notify listeners for a stale snapshot", () => {
    let shouldApply = true;
    const onListings = vi.fn();
    const onError = vi.fn();

    marketplaceService.subscribeRemoteListings(onListings, onError, () => shouldApply);
    const subscription = mocks.snapshots[0];

    subscription.next(listingSnapshot("current-listing"));
    expect(marketplaceService.getListings().map((listing) => listing.id)).toEqual(["current-listing"]);
    expect(onListings).toHaveBeenCalledTimes(1);

    shouldApply = false;
    subscription.next(listingSnapshot("stale-listing"));
    subscription.error(new Error("stale subscription error"));

    expect(marketplaceService.getListings().map((listing) => listing.id)).toEqual(["current-listing"]);
    expect(onListings).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
