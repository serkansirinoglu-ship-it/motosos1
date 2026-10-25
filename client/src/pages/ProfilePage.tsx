import { useState, useEffect } from "react";
import { Award, Shield, Star, Bike, MapPin, Settings, ChevronRight, User, Phone, Lock, Bell, Trash2, LogOut, Edit3, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { getUserProfile, updateUserProfile, createUserProfile } from "../../../firebase";
import TURKEY_PROVINCES from "@/lib/turkeyProvinces";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [motorcycle, setMotorcycle] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");

  // Contacts
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([
    { name: "", phone: "" },
    { name: "", phone: "" },
  ]);

  // Privacy toggles
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const p = await getUserProfile(user.uid);
      if (p) {
        setProfile(p);
        setDisplayName(p.displayName || user.displayName || "");
        setCity(p.city || "İstanbul");
        setMotorcycle(p.motorcycle || "");
        setPhotoURL(p.photoURL || "");
        setBio(p.bio || "");
        if (p.contacts && p.contacts.length) setContacts(p.contacts);
      } else {
        const created = await createUserProfile(user.uid, user.email || "");
        setProfile(created);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    const ok = await updateUserProfile(user.uid, {
      displayName: displayName.trim(),
      city,
      motorcycle: motorcycle.trim(),
      photoURL: photoURL.trim(),
      bio: bio.trim(),
      contacts: contacts.filter((c) => c.name || c.phone),
      privacyLocation: locationEnabled,
    });

    if (ok) {
      setProfile((prev: any) => ({
        ...prev,
        displayName,
        city,
        motorcycle,
        photoURL,
        bio,
      }));
      toast.success("Profiliniz güncellendi.");
      setIsEditOpen(false);
    } else {
      toast.error("Profil güncellenirken bir hata oluştu.");
    }
  };

  const handleDeleteAccount = () => {
    // Do not imply that deletion was requested or completed: no verified server-side
    // account/data deletion workflow is currently wired to this control.
    toast.error("Hesabınız silinmedi. Kalıcı hesap silme şu anda otomatik olarak kullanılamıyor.");
    setIsDeleteOpen(false);
  };

  const helpCount = profile?.helpCount || 0;
  const receivedHelpCount = profile?.receivedHelpCount || 0;
  const points = profile?.points || 0;
  const badges = profile?.badges || ["Yeni Motorcu"];

  return (
    <div className="min-h-screen bg-asphalt pb-8">
      <Header />

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Profile Card Header */}
        <Card className="bg-card-gradient border-border p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-amber-500 p-1">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <Bike className="w-10 h-10 text-primary" />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card text-white">
                <Shield className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold text-white uppercase truncate">
                  {profile?.displayName || user?.email?.split("@")[0] || "Motorcu Kardeş"}
                </h2>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-2 rounded-xl bg-card border border-border text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {profile?.city || "Şehir Belirtilmedi"}
              </p>

              {profile?.motorcycle && (
                <p className="text-xs font-semibold text-white/90 flex items-center gap-1 mt-1">
                  <Bike className="w-3.5 h-3.5 text-amber-400" /> {profile.motorcycle}
                </p>
              )}

              <div className="flex gap-1.5 mt-2 flex-wrap">
                {badges.map((b: string, i: number) => (
                  <span key={i} className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatBox value={String(helpCount)} label="Verilen Yardım" icon={Shield} />
          <StatBox value={String(points)} label="Yardım Puanı" icon={Star} />
          <StatBox value={String(receivedHelpCount)} label="Alınan Yardım" icon={Bike} />
        </div>

        {/* Emergency Contacts Section */}
        <Card className="bg-card-gradient border-border p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-400" />
            <h3 className="font-display text-xs font-bold text-white uppercase tracking-wider">
              Acil Durum İletişim Kişileri (Yakınların)
            </h3>
          </div>
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  placeholder={`Yakın ${i + 1} İsim`}
                  value={contacts[i]?.name || ""}
                  onChange={(e) => {
                    const c = [...contacts];
                    c[i] = { ...c[i], name: e.target.value };
                    setContacts(c);
                  }}
                  className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
                <input
                  placeholder="Telefon (05...)"
                  value={contacts[i]?.phone || ""}
                  onChange={(e) => {
                    const c = [...contacts];
                    c[i] = { ...c[i], phone: e.target.value };
                    setContacts(c);
                  }}
                  className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            ))}
            <button
              onClick={handleSaveProfile}
              className="w-full py-2 bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl text-xs font-bold transition-all mt-1"
            >
              Kişileri Kaydet
            </button>
          </div>
        </Card>

        {/* Preferences & Settings */}
        <Card className="bg-card-gradient border-border p-4 rounded-xl space-y-3">
          <h3 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Uygulama & Gizlilik Ayarları
          </h3>

          <div className="space-y-2">
            <ToggleRow
              icon={Bell}
              label="Push Bildirimleri"
              enabled={notifEnabled}
              onToggle={() => setNotifEnabled(!notifEnabled)}
            />
            <ToggleRow
              icon={MapPin}
              label="Konum Paylaşım İzni"
              enabled={locationEnabled}
              onToggle={() => setLocationEnabled(!locationEnabled)}
            />
          </div>
        </Card>

        {/* Account Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => signOut()}
            className="w-full bg-card hover:bg-muted border border-border text-foreground font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4 text-primary" /> Çıkış Yap
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="w-full bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Hesabımı Kalıcı Olarak Sil
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base tracking-wide">
                Profili Düzenle
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground uppercase block mb-1">Ad Soyad / Lakap</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground uppercase block mb-1">Şehir</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground"
                >
                  {TURKEY_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-muted-foreground uppercase block mb-1">Motosiklet Modeli</label>
                <input
                  placeholder="Örn: Honda Africa Twin / Yamaha MT-07"
                  value={motorcycle}
                  onChange={(e) => setMotorcycle(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground uppercase block mb-1">Profil Fotoğrafı URL</label>
                <input
                  placeholder="https://gorsel-linki.com/avatar.jpg"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold active:scale-95 transition-all shadow-md shadow-primary/30"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-sm bg-card-gradient border-destructive/50 p-5 rounded-2xl shadow-2xl text-center space-y-4">
            <Trash2 className="w-12 h-12 text-destructive mx-auto animate-bounce" />
            <div>
              <h3 className="font-display font-bold text-white uppercase text-base">Hesabını Silmek İstiyor musun?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Bu işlem geri alınamaz. Tüm rozetlerin, yardım puanların ve geçmişiniz silinecektir.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-destructive/30"
              >
                Evet, Hesabımı Sil
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatBox({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="bg-card-gradient border-border p-3 rounded-xl text-center">
      <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
      <p className="font-display text-lg font-extrabold text-white">{value}</p>
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
    </Card>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-foreground">{label}</span>
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors relative ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
            enabled ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}