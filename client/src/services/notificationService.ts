/**
 * NotificationService — Manages in-app notifications and push notifications.
 * Examples:
 * - "Yakınında bir MotoGuard yardım talebi var."
 * - "Yardım talebine cevap geldi."
 * - "Yeni mesajın var."
 */

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'sos' | 'message' | 'community' | 'system' | 'marketplace';
  targetUrl?: string;
  read: boolean;
  createdAt: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'MotoGuard’a Hoş Geldin!',
    body: 'Türkiye’nin motosiklet dayanışma ağına katıldın. Profilini güncelleyerek rozet kazanmaya başlayabilirsin.',
    type: 'system',
    targetUrl: '/profil',
    read: false,
    createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  },
];

class NotificationService {
  private notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
  private listeners: Array<(notes: AppNotification[]) => void> = [];

  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public notify(note: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): AppNotification {
    const newNote: AppNotification = {
      ...note,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    this.notifications.unshift(newNote);
    this.emitChange();

    // Trigger browser native notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNote.title, { body: newNote.body, icon: '/manifest-icon-192.png' });
      } catch (e) {
        console.error('Push notification trigger error', e);
      }
    }

    return newNote;
  }

  public markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
    this.emitChange();
  }

  public markAsRead(id: string): void {
    const n = this.notifications.find((x) => x.id === id);
    if (n) {
      n.read = true;
      this.emitChange();
    }
  }

  public subscribe(callback: (notes: AppNotification[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.notifications]);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private emitChange(): void {
    this.listeners.forEach((cb) => cb([...this.notifications]));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
