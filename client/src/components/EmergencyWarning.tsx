import { AlertTriangle, PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function EmergencyWarning() {
  return (
    <Card className="bg-gradient-to-r from-red-950/40 via-red-900/20 to-card border border-red-500/30 p-4 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              112 YASAL UYARI & ÖNEMLİ BİLGİLENDİRME
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              MotoGuard bir dijital dayanışma platformudur, <strong className="text-foreground">112 Acil Çağrı Merkezi yerine geçmez</strong>. Yaralanmalı veya acil tıbbi müdahale gerektiren durumlarda lütfen doğrudan 112'yi arayın.
            </p>
          </div>
        </div>
        <a
          href="tel:112"
          className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-95 transition-all shadow-md shadow-red-600/30"
        >
          <PhoneCall className="w-4 h-4" />
          112'Yİ ARA
        </a>
      </div>
    </Card>
  );
}
