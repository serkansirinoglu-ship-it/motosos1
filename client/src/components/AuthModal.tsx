import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createUserProfile } from "../../../firebase";

type AuthMode = "login" | "register";

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
  }

  function closeModal() {
    resetForm();
    onClose();
  }

  function errorMessage(err: any): string {
    const code = err?.code || "";
    switch (code) {
      case "auth/email-already-in-use":
        return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "E-posta veya şifre hatalı.";
      case "auth/weak-password":
        return "Şifre çok zayıf; en az 6 karakter girin.";
      case "auth/invalid-email":
        return "Geçerli bir e-posta adresi girin.";
      default:
        return err?.message || "Bir hata oluştu, tekrar dene.";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("E-posta ve şifre gerekli.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const cred = await signUp(trimmedEmail, password);
        // Use Firebase's canonical authenticated email, not the raw form value.
        const profile = await createUserProfile(cred.user.uid, cred.user.email ?? "");
        if (!profile) {
          toast.error("Hesabın açıldı ancak profil kaydedilemedi. Profil ekranından tekrar deneyebilirsin.");
          closeModal();
          return;
        }
        toast.success("Hesabın oluşturuldu. Hoş geldin!");
      } else {
        await signIn(trimmedEmail, password);
        toast.success("Hoş geldin!");
      }
      closeModal();
    } catch (err: any) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="bg-card-gradient border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "login"
              ? "MotoGuard hesabına giriş yap."
              : "Koruyucu Kardeş topluluğuna katıl."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email" className="text-muted-foreground">
              E-posta
            </Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password" className="text-muted-foreground">
              Şifre
            </Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </Button>
        </form>

        <DialogFooter className="sm:justify-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setPassword("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;