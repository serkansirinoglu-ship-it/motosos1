import { beforeEach, describe, expect, it } from "vitest";
import { communityService, isAllowedCommunityImageUrl } from "./communityService";

const validPost = {
  authorName: "MotoGuard Rider",
  authorEmail: "rider@example.test",
  city: "İzmir",
  content: "Güvenli sürüş.",
  tag: "Sohbet",
};

describe("CommunityService input validation", () => {
  beforeEach(() => {
    // Clear any in-memory records left by another test in this module.
    for (const post of communityService.getPosts()) communityService.deletePost(post.id);
  });

  it("accepts a valid post and trims its content", () => {
    const post = communityService.createPost({ ...validPost, content: "  Güvenli sürüş.  " });
    expect(post?.content).toBe("Güvenli sürüş.");
  });

  it("rejects blank or oversized post content", () => {
    expect(communityService.createPost({ ...validPost, content: "   " })).toBeNull();
    expect(communityService.createPost({ ...validPost, content: "x".repeat(5001) })).toBeNull();
  });

  it("rejects oversized or invalid image URLs", () => {
    expect(communityService.createPost({ ...validPost, image: "javascript:alert(1)" })).toBeNull();
    expect(communityService.createPost({ ...validPost, image: "x".repeat(2049) })).toBeNull();
    expect(isAllowedCommunityImageUrl("https://images.example.test/photo.jpg")).toBe(true);
    expect(isAllowedCommunityImageUrl("http://images.example.test/photo.jpg")).toBe(true);
    expect(isAllowedCommunityImageUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedCommunityImageUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedCommunityImageUrl("not a URL")).toBe(false);
  });

  it("rejects invalid comments and accepts trimmed comments up to 1,000 characters", () => {
    const post = communityService.createPost(validPost);
    expect(post).not.toBeNull();
    if (!post) return;

    expect(communityService.addComment(post.id, {
      authorName: "Rider",
      authorEmail: "rider@example.test",
      content: " ".repeat(2),
    })).toBeNull();
    expect(communityService.addComment(post.id, {
      authorName: "Rider",
      authorEmail: "rider@example.test",
      content: "x".repeat(1001),
    })).toBeNull();
    expect(communityService.addComment(post.id, {
      authorName: "Rider",
      authorEmail: "rider@example.test",
      content: "  Teşekkürler.  ",
    })?.content).toBe("Teşekkürler.");
  });

  it("does not add a comment to a missing post", () => {
    expect(communityService.addComment("missing-post", {
      authorName: "Rider",
      authorEmail: "rider@example.test",
      content: "Yorum",
    })).toBeNull();
  });
});
