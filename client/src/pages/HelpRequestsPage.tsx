import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/contexts/MessageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { toast } from "sonner";

export default function HelpRequestsPage() {
  const { helpRequests, createHelpRequest } = useMessages();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  function handleCreate() {
    const cleanTitle = title.trim();
    const cleanDescription = desc.trim();
    if (!cleanTitle) {
      toast.error("Lütfen yardım talebi için bir başlık girin.");
      return;
    }
    if (!user?.uid) {
      toast.error("Yardım talebi oluşturmak için önce oturum açmalısınız.");
      (window as any).__openAuthModal?.();
      return;
    }
    if (cleanTitle.length > 120 || cleanDescription.length > 2000) {
      toast.error("Başlık en fazla 120, açıklama en fazla 2000 karakter olabilir.");
      return;
    }
    createHelpRequest({ title: cleanTitle, description: cleanDescription, ownerId: user.uid });
    setTitle("");
    setDesc("");
  }

  return (
    <div className="min-h-screen bg-asphalt-light px-4 pt-6 page-surface-light">
      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Yardım Talepleri</h1>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kısa başlık" maxLength={120} className="w-full min-w-0 px-3 py-2 rounded-md bg-card-gradient border border-border text-sm" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" maxLength={2000} className="w-full min-w-0 px-3 py-2 rounded-md bg-card-gradient border border-border text-sm" />
          <Button className="w-full sm:w-auto" onClick={handleCreate} disabled={!title.trim()}>Yeni Talep</Button>
        </div>
      </div>

      <div className="space-y-3">
        {helpRequests.map((r) => (
          <Link key={r.id} href={`/chat/${r.id}`}>
            <Card className="p-4 bg-card-gradient border-border flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.title}</p>
                {r.localOnly && <p className="mt-1 text-[10px] font-semibold text-amber-500">Yalnızca bu cihazda kayıtlı; sunucuya kaydedilemedi.</p>}
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
