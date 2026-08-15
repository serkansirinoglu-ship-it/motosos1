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
  authorName: string;
  authorEmail: string;
  authorPhoto?: string;
  city: string;
  content: string;
  image?: string;
  tag?: string; // e.g. "Grup Sürüşü", "Rota Önerisi", "Tehlikeli Yol", "Sohbet"
  likes: string[]; // array of user emails/uids who liked
  comments: PostComment[];
  createdAt: string;
}

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    authorName: 'Motorcu Efe',
    authorEmail: 'efe@motoguard.tr',
    city: 'İzmir',
    content: 'Hafta sonu Karaburun kıyı rotası yapıyoruz. Çeşmealtı kavşağında saat 09:30 buluşma. Katılmak isteyen kardeşler yoruma yazsın! 🏍️💨',
    tag: 'Grup Sürüşü',
    likes: ['ahmet@motoguard.tr', 'can@motoguard.tr'],
    comments: [
      {
        id: 'c-1',
        postId: 'post-1',
        authorName: 'Ahmet Y.',
        authorEmail: 'ahmet@motoguard.tr',
        content: 'Harika fikir, depoyu fulleyip geliyorum!',
        createdAt: '2026-08-12 14:30',
      },
    ],
    createdAt: '2026-08-12 12:00',
  },
  {
    id: 'post-2',
    authorName: 'Selin Yıldız',
    authorEmail: 'selin@motoguard.tr',
    city: 'İstanbul',
    content: 'Şile otoyolunda viraj sonrasında mazot döküntüsü var, geçen arkadaşlar lütfen dikkat etsin! Kaskınız sağlam olsun.',
    tag: 'Tehlikeli Yol',
    likes: ['efe@motoguard.tr'],
    comments: [],
    createdAt: '2026-08-12 10:15',
  },
];

class CommunityService {
  private posts: CommunityPost[] = [...INITIAL_POSTS];

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

  public createPost(post: Omit<CommunityPost, 'id' | 'likes' | 'comments' | 'createdAt'>): CommunityPost {
    const newPost: CommunityPost = {
      ...post,
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
    if (!post) return null;
    const newComment: PostComment = {
      ...comment,
      id: `c-${Date.now()}`,
      postId,
      createdAt: new Date().toLocaleString('tr-TR'),
    };
    post.comments.push(newComment);
    return newComment;
  }

  public deletePost(postId: string): boolean {
    const initLen = this.posts.length;
    this.posts = this.posts.filter((p) => p.id !== postId);
    return this.posts.length < initLen;
  }
}

export const communityService = new CommunityService();
export default communityService;
