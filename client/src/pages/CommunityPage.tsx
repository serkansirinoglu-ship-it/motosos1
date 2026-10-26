import { useState, useEffect } from "react";
import { Users, MapPin, Hash, Heart, MessageSquare, Plus, Flag, Trash2, Image, Send, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import TURKEY_PROVINCES from "@/lib/turkeyProvinces";
import { communityService, CommunityPost } from "@/services/communityService";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import ReportModal from "@/components/ReportModal";
import { toast } from "sonner";

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "groups">("feed");
  const [selectedCity, setSelectedCity] = useState<string>("Tümü");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // New post form state
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [tag, setTag] = useState("Grup Sürüşü");
  const [postCity, setPostCity] = useState("İstanbul");

  // Comment drawer state
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    setPosts(communityService.getPosts(selectedCity));
  }, [selectedCity]);

  const handleCreatePost = () => {
    if (!user) {
      (window as any).__openAuthModal?.();
      toast.error("Gönderi oluşturmak için giriş yapın.");
      return;
    }
    if (!content.trim()) {
      toast.error("Lütfen bir gönderi metni girin.");
      return;
    }

    communityService.createPost({
      authorName: user?.displayName || user?.email?.split("@")[0] || "Motorcu Kardeş",
      authorEmail: user?.email || "anonim@motoguard.tr",
      city: postCity,
      content: content.trim(),
      image: image.trim() || undefined,
      tag,
    });

    toast.success("Gönderi bu oturumda yerel olarak kaydedildi; diğer kullanıcılara yayınlanmadı.");
    setContent("");
    setImage("");
    setIsNewPostOpen(false);
    setPosts(communityService.getPosts(selectedCity));
  };

  const handleToggleLike = (postId: string) => {
    if (!user) {
      (window as any).__openAuthModal?.();
      return;
    }
    communityService.toggleLike(postId, user.email || "user@motoguard.tr");
    setPosts(communityService.getPosts(selectedCity));
  };

  const handleDeletePost = (postId: string) => {
    const target = communityService.getPosts().find((post) => post.id === postId);
    if (!user || !target || target.authorEmail !== user.email) {
      toast.error("Yalnızca kendi gönderinizi silebilirsiniz.");
      return;
    }
    communityService.deletePost(postId);
    toast.info("Gönderi bu oturumdan silindi.");
    setPosts(communityService.getPosts(selectedCity));
  };

  const handleAddComment = (postId: string) => {
    if (!user) {
      (window as any).__openAuthModal?.();
      toast.error("Yorum yapmak için giriş yapın.");
      return;
    }
    if (!commentText.trim()) return;
    communityService.addComment(postId, {
      authorName: user?.displayName || user?.email?.split("@")[0] || "Motorcu Kardeş",
      authorEmail: user?.email || "anonim@motoguard.tr",
      content: commentText.trim(),
    });
    setCommentText("");
    setPosts(communityService.getPosts(selectedCity));
  };

  return (
    <div className="min-h-screen bg-asphalt pb-8">
      <Header />

      <div className="px-4 pt-3 max-w-lg mx-auto">
        <Card className="bg-amber-500/10 border-amber-500/30 p-3 rounded-xl">
          <p className="text-[11px] text-amber-200 leading-relaxed">
            Bilgi: Gönderiler, beğeniler ve yorumlar şu anda yalnızca bu oturumda tutulur; diğer kullanıcılara yayınlanmaz ve kalıcı olarak senkronize edilmez.
          </p>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="px-4 pt-4 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              activeTab === "feed"
                ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                : "bg-card-gradient border-border text-muted-foreground"
            }`}
          >
            📢 Topluluk Akışı
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              activeTab === "groups"
                ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                : "bg-card-gradient border-border text-muted-foreground"
            }`}
          >
            👥 Şehir Grupları
          </button>
        </div>

        {activeTab === "feed" && (
          <button
            onClick={() => {
              if (!user) {
                (window as any).__openAuthModal?.();
              } else {
                setIsNewPostOpen(true);
              }
            }}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Paylaş
          </button>
        )}
      </div>

      {/* City Filter Pills for Feed */}
      {activeTab === "feed" && (
        <div className="px-4 pt-3 max-w-lg mx-auto">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {["Tümü", ...TURKEY_PROVINCES.slice(0, 15)].map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCity === city
                    ? "bg-primary/20 text-primary font-bold border border-primary/40"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed Content */}
      {activeTab === "feed" && (
        <div className="px-4 pt-3 space-y-4 max-w-lg mx-auto">
          {posts.length > 0 ? (
            posts.map((post) => {
              const isLiked = user?.email ? post.likes.includes(user.email) : false;
              const isOwner = user?.email === post.authorEmail;

              return (
                <Card key={post.id} className="bg-card-gradient border-border p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-xs uppercase">
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-xs">{post.authorName}</p>
                          {post.tag && (
                            <span className="text-[9px] font-extrabold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                              {post.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {post.city} • {post.createdAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReportTargetId(post.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"
                        title="Şikayet Et"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>

                  {post.image && (
                    <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                      <img src={post.image} alt="Gönderi" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-2 border-t border-border/50 text-xs">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-all ${
                        isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-primary text-primary" : ""}`} />
                      <span>{post.likes.length} Beğeni</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-semibold"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments.length} Yorum</span>
                    </button>
                  </div>

                  {/* Comments Drawer */}
                  {activeCommentPostId === post.id && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {post.comments.length > 0 ? (
                          post.comments.map((c) => (
                            <div key={c.id} className="bg-card p-2.5 rounded-xl border border-border text-xs space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="font-bold text-white">{c.authorName}</span>
                                <span>{c.createdAt}</span>
                              </div>
                              <p className="text-foreground">{c.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">İlk yorumu sen yaz...</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                          placeholder="Yorumunuzu yazın..."
                          className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="bg-primary text-white p-2 rounded-xl active:scale-95 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <Card className="bg-card-gradient border-border p-8 text-center rounded-xl">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Henüz bu şehirde gönderi yok.</p>
              <p className="text-xs text-muted-foreground mt-1">İlk gönderiyi sen paylaşarak motorcu kardeşlerine ulaş!</p>
            </Card>
          )}
        </div>
      )}

      {/* 81 Cities Groups */}
      {activeTab === "groups" && (
        <div className="px-4 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {TURKEY_PROVINCES.map((prov) => (
            <Link key={prov} href={`/group/${encodeURIComponent(prov)}`}>
              <Card className="bg-card-gradient border-border p-3.5 rounded-xl hover:border-primary/50 transition-all cursor-pointer active:scale-95 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs uppercase">{prov}</p>
                    <p className="text-[10px] text-muted-foreground">Canlı Moto Grubu</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
                  <span className="text-primary font-semibold">Gruba Katıl →</span>
                  <span className="text-green-400 font-bold">🟢 Aktif</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      {isNewPostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base tracking-wide">
                Yeni Gönderi Paylaş
              </h3>
              <button onClick={() => setIsNewPostOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Şehir</label>
                  <select
                    value={postCity}
                    onChange={(e) => setPostCity(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
                  >
                    {TURKEY_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Etiket</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
                  >
                    <option value="Grup Sürüşü">Grup Sürüşü</option>
                    <option value="Rota Önerisi">Rota Önerisi</option>
                    <option value="Tehlikeli Yol">Tehlikeli Yol</option>
                    <option value="Sohbet">Sohbet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Mesajınız</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Sürüş fikri, rota paylaşımı veya tavsiye yazabilirsiniz..."
                  className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Görsel URL (Opsiyonel)</label>
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://gorsel-linki.com/foto.jpg"
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsNewPostOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreatePost}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-primary/30"
                >
                  Paylaş
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Report Modal */}
      {reportTargetId && (
        <ReportModal
          isOpen={Boolean(reportTargetId)}
          onClose={() => setReportTargetId(null)}
          targetType="post"
          targetId={reportTargetId}
          reporterEmail={user?.email || undefined}
        />
      )}
    </div>
  );
}
