/**
 * SOSService — Core engine for MotoGuard Emergency Help & Companion Rider system.
 * Categories: Lastik, Akü, Yakıt, Arıza, Kaza, Çekici, Diğer.
 * Statuses: Bekleniyor, Yanıt geliyor, Yardım bulundu, Tamamlandı, İptal edildi.
 */

export type SOSHelpCategory = 'lastik' | 'aku' | 'yakit' | 'ariza' | 'kaza' | 'cekici' | 'diger';
export type SOSStatus = 'bekleniyor' | 'yanit_geliyor' | 'yardim_bulundu' | 'tamamlandi' | 'iptal_edildi';

export interface SOSRequestItem {
  id: string;
  requesterId: string;
  requesterEmail: string;
  requesterName?: string;
  category: SOSHelpCategory;
  latitude: number;
  longitude: number;
  note?: string;
  status: SOSStatus;
  helpersCount: number;
  acceptedBy?: string;
  createdAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
}

export const CATEGORY_LABELS: Record<SOSHelpCategory, { label: string; iconName: string; desc: string }> = {
  lastik: { label: 'Lastik', iconName: 'Bike', desc: 'Patlak / İnik Lastik' },
  aku: { label: 'Akü', iconName: 'Zap', desc: 'Akü Bitti / Takviye Lazım' },
  yakit: { label: 'Yakıt', iconName: 'Fuel', desc: 'Benzin Bitti' },
  ariza: { label: 'Arıza', iconName: 'Wrench', desc: 'Mekanik / Elektrik Arıza' },
  kaza: { label: 'Kaza', iconName: 'AlertTriangle', desc: 'Maddi Hasarlı Kaza' },
  cekici: { label: 'Çekici', iconName: 'Truck', desc: 'Çekici Desteği' },
  diger: { label: 'Diğer', iconName: 'HelpCircle', desc: 'Diğer Yol Yardım Talebi' },
};

export const STATUS_LABELS: Record<SOSStatus, { label: string; color: string }> = {
  bekleniyor: { label: 'Bekleniyor', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  yanit_geliyor: { label: 'Yanıt Geliyor', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  yardim_bulundu: { label: 'Yardım Bulundu', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  tamamlandi: { label: 'Tamamlandı', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
  iptal_edildi: { label: 'İptal Edildi', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
};

class SOSService {
  private activeRequests: SOSRequestItem[] = [];
  private idSequence = 0;

  public getActiveRequests(): SOSRequestItem[] {
    return this.activeRequests.filter(
      (r) => r.status === 'bekleniyor' || r.status === 'yanit_geliyor' || r.status === 'yardim_bulundu'
    );
  }

  public getAllRequests(): SOSRequestItem[] {
    return [...this.activeRequests];
  }

  public createRequest(data: Omit<SOSRequestItem, 'id' | 'status' | 'helpersCount' | 'createdAt'>): SOSRequestItem {
    const newItem: SOSRequestItem = {
      ...data,
      id: `sos-${Date.now()}-${++this.idSequence}`,
      status: 'bekleniyor',
      helpersCount: 0,
      createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    this.activeRequests.unshift(newItem);
    return newItem;
  }

  public updateStatus(id: string, newStatus: SOSStatus, acceptedBy?: string): boolean {
    const req = this.activeRequests.find((r) => r.id === id);
    if (!req) return false;
    if (req.status === 'tamamlandi' || req.status === 'iptal_edildi') return false;
    req.status = newStatus;
    if (acceptedBy) {
      req.acceptedBy = acceptedBy;
      req.helpersCount += 1;
    }
    if (newStatus === 'tamamlandi') {
      req.resolvedAt = new Date().toISOString();
    } else if (newStatus === 'iptal_edildi') {
      req.cancelledAt = new Date().toISOString();
    }
    return true;
  }
}

export const sosService = new SOSService();
export default sosService;
