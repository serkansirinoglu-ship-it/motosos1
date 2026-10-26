import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

/**
 * CommunityService — Manages social posts, comments, likes, city feeds, and post moderation.
 */

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId?: string;
  authorName: string;
  authorEmail?: string;
  authorPhoto?: string;
  city: string;
  content: string;
  image?: string;
  tag?: string; // e.g. "Grup Sürüşü", "Rota Önerisi", "Tehlikeli Yol", "Sohbet"
  likes: string[]; // array of user emails/uids who liked
  comments: PostComment[];
  createdAt: string;
}

// No invented users, comments, sponsors, offers, or discount claims are shown as real data.
const INITIAL_POSTS: CommunityPost[] = [];

class CommunityService {
  private posts: CommunityPost[] = [...INITIAL_POSTS];

  /** Subscribe to server-backed community posts. No local fallback is presented as remote data. */
  public subscribeRemotePosts(onPosts: (posts: CommunityPost[]) => void, onError: (error: unknown) => void): () => void {
    if (!db) throw new Error("Firebase yapılandırılmamış; topluluk akışı sunucuya bağlanamadı.");
    const postsQuery = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"));
    return onSnapshot(postsQuery, (snapshot) => {
      const remotePosts = snapshot.docs.map((item) => {
        const data = item.data();
        const timestamp = data.createdAt;
        const createdAt = timestamp && typeof timestamp.toDate === "function" ? timestamp.toDate().toLocaleString("tr-TR") : "Tarih bekleniyor";
        return {
          id: item.id,
          authorId: String(data.authorId || ""),
          authorName: String(data.authorName || "Motorcu"),
          city: String(data.city || ""),
          content: String(data.content || ""),
          image: typeof data.image === "string" ? data.image : undefined,
          tag: typeof data.tag === "string" ? data.tag : undefined,
          likes: [],
          comments: [],
          createdAt,
        } satisfies CommunityPost;
      });
      this.posts = remotePosts;
      onPosts(remotePosts);
    }, onError);
  }

  /** Create a post only when Firebase Auth and Firestore are both available. */
  public async createRemotePost(input: { authorName: string; authorId: string; city: string; content: string; image?: string; tag?: string }): Promise<string> {
    if (!db || !auth?.currentUser?.uid) throw new Error("Gönderi için Firebase oturumu gerekli.");
    if (auth.currentUser.uid !== input.authorId) throw new Error("Oturum kimliği doğrulanamadı.");
    const content = input.content.trim();
    const authorName = input.authorName.trim();
    const city = input.city.trim();
    const image = input.image?.trim();
    if (!content || content.length > 5000 || !authorName || authorName.length > 80 || !city || city.length > 100 || (input.tag && input.tag.length > 80) || (image && !isAllowedCommunityImageUrl(image))) {
      throw new Error("Gönderi doğrulanamadı. Metin, şehir veya görsel adresini kontrol edin.");
    }
    const postRef = doc(collection(db, "communityPosts"));
    const payload: Record<string, unknown> = { id: postRef.id, authorId: input.authorId, authorName, city, content, likes: [], comments: [], createdAt: serverTimestamp() };
    if (image) payload.image = image;
    if (input.tag) payload.tag = input.tag;
    await setDoc(postRef, payload);
    return postRef.id;
  }

  /** Firestore rules are the final authority for owner-only deletion. */
  public async deleteRemotePost(postId: string, authorId: string): Promise<void> {
    if (!db || !auth?.currentUser?.uid) throw new Error("Gönderi silmek için giriş yapın.");
    if (!postId || auth.currentUser.uid !== authorId) throw new Error("Yalnızca kendi gönderinizi silebilirsiniz.");
    await deleteDoc(doc(db, "communityPosts", postId));
  }

  public getPosts(city?: string, tag?: string): CommunityPost[] {
    let list = [...this.posts];
    if (city && city !== 'Tümü') {
      list = list.filter((p) => p.city.toLowerCase() === city.toLowerCase());
    }
    if (tag && tag !== 'Tümü') {
      list = list.filter((p) => p.tag === tag);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createPost(post: Omit<CommunityPost, 'id' | 'likes' | 'comments' | 'createdAt'>): CommunityPost | null {
    const content = post.content.trim();
    const image = post.image?.trim();
    if (
      !content ||
      content.length > 5000 ||
      !post.authorName.trim() ||
      post.authorName.length > 80 ||
      !post.authorEmail.trim() ||
      !post.city.trim() ||
      post.city.length > 100 ||
      (post.tag !== undefined && post.tag.length > 80) ||
      (image !== undefined && image !== '' && !isAllowedCommunityImageUrl(image))
    ) return null;

    const newPost: CommunityPost = {
      ...post,
      content,
      image: image || undefined,
      id: `post-${Date.now()}`,
      likes: [],
      comments: [],
      createdAt: new Date().toLocaleString('tr-TR'),
    };
    this.posts.unshift(newPost);
    return newPost;
  }

  public toggleLike(postId: string, userEmail: string): boolean {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return false;
    const idx = post.likes.indexOf(userEmail);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(userEmail);
    }
    return true;
  }

  public addComment(postId: string, comment: Omit<PostComment, 'id' | 'postId' | 'createdAt'>): PostComment | null {
    const post = this.posts.find((p) => p.id === postId);
    const content = comment.content.trim();
    if (
      !post ||
      !content ||
      content.length > 1000 ||
      !comment.authorName.trim() ||
      comment.authorName.length > 80 ||
      !comment.authorEmail.trim()
    ) return null;
    const newComment: PostComment = {
      ...comment,
      content,
      id: `c-${Date.now()}`,
      postId,
      createdAt: new Date().toLocaleString('tr-TR'),
    };
    post.comments.push(newComment);
    return newComment;
  }

  public clearLocalSession(): void {
    this.posts = [];
  }

  public deletePost(postId: string): boolean {
    const initLen = this.posts.length;
    this.posts = this.posts.filter((p) => p.id !== postId);
    return this.posts.length < initLen;
  }
}

export const communityService = new CommunityService();
export default communityService;


/** Restrict remote images to explicit HTTP(S) URLs; reject javascript:, data:, and malformed values. */
export function isAllowedCommunityImageUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
