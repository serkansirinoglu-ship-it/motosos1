import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/contexts/MessageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

export default function HelpRequestsPage() {
  const { helpRequests, createHelpRequest } = useMessages();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  function handleCreate() {
	if (!title) return;
	createHelpRequest({ title, description: desc, user: user?.email || null });
	setTitle("");
	setDesc("");
  }

  return (
	<div className="min-h-screen bg-asphalt px-4 pt-6">
	  <div className="flex items-center justify-between mb-4">
		<h1 className="font-display text-2xl font-bold text-white">Yardım Talepleri</h1>
		<div className="flex gap-2">
		  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kısa başlık" className="px-3 py-2 rounded-md bg-card-gradient border border-border text-sm" />
		  <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" className="px-3 py-2 rounded-md bg-card-gradient border border-border text-sm" />
		  <Button onClick={handleCreate}>Yeni Taleep</Button>
		</div>
	  </div>

	  <div className="space-y-3">
		{helpRequests.map((r) => (
		  <Link key={r.id} href={`/chat/${r.id}`}>
			<Card className="p-4 bg-card-gradient border-border flex items-center justify-between">
			  <div>
				<p className="font-semibold text-foreground">{r.title}</p>
				<p className="text-xs text-muted-foreground">{r.description}</p>
			  </div>
			  <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
			</Card>
		  </Link>
		))}
	  </div>
	</div>
  );
}
