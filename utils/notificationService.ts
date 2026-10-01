import { RequestItem, RequestStatus } from '../types/request';

export function getThaiStatusText(status: RequestStatus): string {
  switch (status) {
    case 'submitted':
      return 'ยื่นคำร้องแล้ว';
    case 'under_review':
      return 'อยู่ระหว่างตรวจสอบ';
    case 'action_required':
      return 'ต้องการข้อมูลเพิ่มเติม';
    case 'approved':
      return 'อนุมัติเรียบร้อยแล้ว';
    case 'rejected':
      return 'ปฏิเสธคำร้อง / ไม่อนุมัติ';
    case 'completed':
    case 'closed':
      return 'ดำเนินการเสร็จสิ้นแล้ว';
    case 'draft':
      return 'ร่างคำร้อง';
    default:
      return status;
  }
}

export function getStatusBadgeStyle(status: RequestStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'approved':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' };
    case 'completed':
    case 'closed':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
    case 'under_review':
      return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' };
    case 'action_required':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    case 'rejected':
      return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' };
    case 'submitted':
    default:
      return { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' };
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export async function triggerBrowserNotification(item: RequestItem, oldStatus?: RequestStatus) {
  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    const statusText = getThaiStatusText(item.status);
    const isApproved = item.status === 'approved';
    const isCompleted = item.status === 'completed' || item.status === 'closed';

    let title = `🔔 อัปเดตสถานะคำร้อง CCTV [${item.id}]`;
    let body = `คำร้อง "${item.title || 'คำร้องขอดูภาพ CCTV'}" เปลี่ยนสถานะเป็น "${statusText}"`;

    if (isApproved) {
      title = `✅ คำร้องได้รับอนุมัติแล้ว! [${item.id}]`;
      body = `เจ้าหน้าที่ได้อนุมัติคำร้อง "${item.title || 'คำร้องขอดูภาพ CCTV'}" เรียบร้อยแล้ว คลิกเพื่อดูขั้นตอนการรับไฟล์ภาพหรือนัดหมาย`;
    } else if (isCompleted) {
      title = `🎉 ดำเนินการเสร็จสิ้นแล้ว! [${item.id}]`;
      body = `คำร้อง "${item.title || 'คำร้องขอดูภาพ CCTV'}" ดำเนินการเสร็จสมบูรณ์แล้ว คลิกเพื่อดูบันทึกและประเมินความพึงพอใจ`;
    }

    const options: NotificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `request-status-${item.id}`,
      requireInteraction: true,
      data: {
        url: `/?trackId=${encodeURIComponent(item.id)}`,
        requestId: item.id,
        status: item.status
      }
    };

    // Prefer Service Worker registration showNotification so it works even when tab is closed/backgrounded
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return;
        }
      } catch (err) {
        console.warn('Service worker notification failed, falling back to Notification API:', err);
      }
    }

    // Fallback standard Notification if SW is not ready
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        const url = new URL(window.location.href);
        url.searchParams.set('trackId', item.id);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new CustomEvent('track-request-event', { detail: { trackId: item.id } }));
        notification.close();
      };
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
}

// Subtle browser audio notification chime using standard Web Audio API (no external asset required)
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Pleasant two-tone chime (E5 -> A5)
    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (err) {
    // Audio Context might be restricted before user gesture
  }
}

export interface NotificationSettingsConfig {
  browserPushEnabled: boolean;
  soundEnabled: boolean;
  followUpRemindersEnabled: boolean;
  followUpThresholdDays: number;
  smsNotificationsEnabled: boolean;
  smsPhoneNumber?: string;
}

const NOTIFICATION_SETTINGS_KEY = 'cctv_notification_settings_v1';
const DEFAULT_SETTINGS: NotificationSettingsConfig = {
  browserPushEnabled: false,
  soundEnabled: true,
  followUpRemindersEnabled: true,
  followUpThresholdDays: 7,
  smsNotificationsEnabled: true,
  smsPhoneNumber: ''
};

export function getNotificationSettings(): NotificationSettingsConfig {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotificationSettings(settings: Partial<NotificationSettingsConfig>): NotificationSettingsConfig {
  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('notification_settings_changed', { detail: updated }));
    } catch (e) {
      console.warn('Failed to save notification settings:', e);
    }
  }
  return updated;
}

export interface StalledRequestInfo {
  item: RequestItem;
  daysPending: number;
  lastMovedDate: Date;
  statusText: string;
}

/**
 * Finds requests whose status has not moved for more than the specified threshold days
 */
export function findStalledRequests(
  requests: RequestItem[],
  thresholdDays: number = 7
): StalledRequestInfo[] {
  const now = Date.now();
  const stalled: StalledRequestInfo[] = [];

  for (const req of requests) {
    // Only active requests that require attention (not finished or rejected or archived)
    if (req.isArchived) continue;
    if (['completed', 'closed', 'rejected', 'draft'].includes(req.status)) continue;

    // Calculate last time status changed or was updated
    let lastTimestampStr = req.updatedAt;
    if (req.statusHistory && req.statusHistory.length > 0) {
      // Find latest status transition timestamp
      const latestHistoryTime = req.statusHistory[0]?.timestamp;
      if (latestHistoryTime) {
        lastTimestampStr = latestHistoryTime;
      }
    }
    if (!lastTimestampStr) {
      lastTimestampStr = req.createdAt;
    }

    const lastMovedTime = new Date(lastTimestampStr).getTime();
    if (isNaN(lastMovedTime)) continue;

    const diffMs = now - lastMovedTime;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days >= thresholdDays) {
      stalled.push({
        item: req,
        daysPending: days,
        lastMovedDate: new Date(lastMovedTime),
        statusText: getThaiStatusText(req.status)
      });
    }
  }

  // Sort by longest pending first
  return stalled.sort((a, b) => b.daysPending - a.daysPending);
}

