import { RequestItem } from '../types/request';

/**
 * Generates the direct tracking URL for a request item.
 */
export const getRequestTrackingUrl = (requestId: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return `${origin}${pathname}?trackId=${encodeURIComponent(requestId)}`;
};

/**
 * Constructs the LINE share deep link text and URL for a request item.
 */
export const getLineShareUrl = (item: RequestItem): string => {
  const trackingUrl = getRequestTrackingUrl(item.id);
  const shareText = `📌 ระบบบริการคำร้องออนไลน์ (E-Petitions)\n` +
    `ขอแจ้งรหัสติดตามคำร้อง (Tracking ID): ${item.id}\n` +
    `เรื่อง: ${item.title}\n` +
    `ผู้ยื่นคำร้อง: ${item.applicant.prefix}${item.applicant.fullName}\n\n` +
    `ตรวจสอบและติดตามสถานะคำร้องเพิ่มเติมผ่านลิงก์นี้:\n${trackingUrl}`;

  return `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
};

/**
 * Triggers the LINE share deep link in a new browser window/tab.
 */
export const shareViaLine = (item: RequestItem): void => {
  const lineUrl = getLineShareUrl(item);
  window.open(lineUrl, '_blank', 'noopener,noreferrer');
};
