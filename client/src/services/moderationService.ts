/**
 * ModerationService — Manages user reports, content moderation, blocking, and abuse controls.
 */

export interface ReportItem {
  id: string;
  targetType: 'post' | 'listing' | 'user' | 'message' | 'sos';
  targetId: string;
  reason: string;
  reportedBy: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

class ModerationService {
  private reports: ReportItem[] = [];
  private blockedUsers: Set<string> = new Set();

  public submitReport(report: Omit<ReportItem, 'id' | 'status' | 'createdAt'>): ReportItem {
    const newReport: ReportItem = {
      ...report,
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toLocaleString('tr-TR'),
    };
    this.reports.unshift(newReport);
    return newReport;
  }

  public getReports(status?: ReportItem['status']): ReportItem[] {
    if (!status) return [...this.reports];
    return this.reports.filter((r) => r.status === status);
  }

  public resolveReport(id: string, action: 'resolved' | 'dismissed'): boolean {
    const r = this.reports.find((x) => x.id === id);
    if (!r) return false;
    r.status = action;
    return true;
  }

  public blockUser(userIdentifier: string): void {
    this.blockedUsers.add(userIdentifier.toLowerCase());
  }

  public unblockUser(userIdentifier: string): void {
    this.blockedUsers.delete(userIdentifier.toLowerCase());
  }

  public isUserBlocked(userIdentifier: string): boolean {
    return this.blockedUsers.has(userIdentifier.toLowerCase());
  }
}

export const moderationService = new ModerationService();
export default moderationService;
