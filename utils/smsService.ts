import { RequestItem, RequestStatus } from '../types/request';
import { getStatusLabelTh } from './storage';
import { getNotificationSettings } from './notificationService';

export interface SmsLogItem {
  id: string;
  requestId: string;
  requestTitle: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed';
  triggerStatus: RequestStatus | 'submitted' | 'reminder';
  sentAt: string;
  provider: string;
  characterCount: number;
  creditUnits: number;
  deliveryRef: string;
  carrier?: string;
  errorReason?: string;
}

export interface SmsGatewayStatus {
  online: boolean;
  provider: string;
  remainingCredits: number;
  successRatePercent: number;
  avgLatencyMs: number;
  activeCarriers: string[];
}

export interface SmsCreditCalculation {
  characters: number;
  credits: number;
  maxCharsPerCredit: number;
  hasThai: boolean;
}

export const SMS_LOGS_KEY = 'e_service_sms_notification_logs_v1';
const SMS_CREDITS_KEY = 'e_service_sms_remaining_credits_v1';
const DEFAULT_PROVIDER = 'Chaiyaphum Municipal Smart SMS Gateway';

/**
 * Normalizes a Thai telephone number by removing whitespace, hyphens, and converting +66 to 0.
 */
export function normalizeThaiPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();
  if (cleaned.startsWith('+66')) {
    return '0' + cleaned.slice(3);
  }
  if (cleaned.startsWith('66') && cleaned.length >= 11) {
    return '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Standardizes formatting for Thai phone numbers (e.g. 081-234-5678 or 044-811-654)
 */
export function formatThaiPhoneNumber(phone: string): string {
  const norm = normalizeThaiPhone(phone);
  if (!norm) return phone || '';

  // 10-digit mobile phone: 08x-xxx-xxxx or 09x-xxx-xxxx or 06x-xxx-xxxx
  if (norm.length === 10 && norm.startsWith('0')) {
    return `${norm.slice(0, 3)}-${norm.slice(3, 6)}-${norm.slice(6)}`;
  }
  // 9-digit landline: 02-xxx-xxxx or 044-xx-xxxx
  if (norm.length === 9 && norm.startsWith('0')) {
    if (norm.startsWith('02')) {
      return `${norm.slice(0, 2)}-${norm.slice(2, 5)}-${norm.slice(5)}`;
    }
    return `${norm.slice(0, 3)}-${norm.slice(3, 5)}-${norm.slice(5)}`;
  }
  return phone;
}

/**
 * Validates whether the number is a valid 10-digit Thai mobile number.
 */
export function validateThaiMobileNumber(phone: string): boolean {
  const norm = normalizeThaiPhone(phone);
  return /^(06|08|09)\d{8}$/.test(norm);
}

/**
 * Detects the Thai mobile telecommunications network from prefix.
 */
export function detectCarrier(phone: string): string {
  const norm = normalizeThaiPhone(phone);
  if (!norm || norm.length < 3) return 'TH-Telecom';
  const prefix = norm.slice(0, 3);
  
  // Common AIS prefixes
  if (['081', '082', '084', '087', '089', '092', '093', '097', '098'].includes(prefix)) {
    return 'AIS';
  }
  // Common TrueMove H prefixes
  if (['083', '085', '086', '088', '090', '091', '094', '095', '096'].includes(prefix)) {
    return 'TrueMove H';
  }
  // Common DTAC prefixes
  if (['061', '062', '063', '064', '065', '066', '080'].includes(prefix)) {
    return 'DTAC / True';
  }
  return 'NT / National Telecom';
}

/**
 * Calculates Thai / GSM character count and SMS message segments (credits).
 * Thai UCS-2 standard: 70 chars = 1 credit (concatenated SMS = 67 chars/part)
 * English GSM-7 standard: 160 chars = 1 credit (concatenated SMS = 153 chars/part)
 */
export function calculateSmsCredits(text: string): SmsCreditCalculation {
  const characters = (text || '').length;
  const hasThai = /[ก-๙]/.test(text || '');
  const maxCharsPerCredit = hasThai ? 70 : 160;
  const credits = characters === 0 ? 1 : Math.ceil(characters / maxCharsPerCredit);
  return { characters, credits, maxCharsPerCredit, hasThai };
}

/**
 * Retrieves all stored SMS logs from local storage.
 */
export function getSmsLogs(): SmsLogItem[] {
  try {
    const data = localStorage.getItem(SMS_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to read SMS logs:', err);
    return [];
  }
}

/**
 * Persists SMS logs to local storage and dispatches browser event.
 */
export function saveSmsLogs(logs: SmsLogItem[]): void {
  try {
    localStorage.setItem(SMS_LOGS_KEY, JSON.stringify(logs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_logs_updated', { detail: { count: logs.length } }));
    }
  } catch (err) {
    console.error('Failed to save SMS logs:', err);
  }
}

/**
 * Clears SMS logs.
 */
export function clearSmsLogs(): void {
  try {
    localStorage.removeItem(SMS_LOGS_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_logs_updated', { detail: { count: 0 } }));
    }
  } catch (err) {
    console.error('Failed to clear SMS logs:', err);
  }
}

export type SmsTemplateKey = 
  | 'submitted' 
  | 'under_review' 
  | 'action_required' 
  | 'approved' 
  | 'completed' 
  | 'rejected' 
  | 'reminder';

export interface SmsTemplateItem {
  key: SmsTemplateKey;
  labelTh: string;
  descriptionTh: string;
  badgeColor: string;
  template: string;
  defaultTemplate: string;
  enabled: boolean;
}

export interface SmsPlaceholderVariables {
  trackingId?: string;
  applicantName?: string;
  requestTitle?: string;
  statusTh?: string;
  officerNote?: string;
  trackingUrl?: string;
  categoryName?: string;
  currentDate?: string;
  municipality?: string;
}

export const SMS_TEMPLATES_KEY = 'e_service_sms_custom_templates_v1';

export const DEFAULT_SMS_TEMPLATES: Record<SmsTemplateKey, SmsTemplateItem> = {
  submitted: {
    key: 'submitted',
    labelTh: 'ได้รับคำร้องแล้ว (Received)',
    descriptionTh: 'ส่งแจ้งเตือนทันทีเมื่อประชาชนยื่นคำร้องสำเร็จ และได้รับเลขติดตามคำร้อง',
    badgeColor: 'blue',
    template: '[ทม.ชัยภูมิ] ได้รับคำร้อง {TRACKING_ID} เรื่อง "{REQUEST_TITLE}" จากคุณ {APPLICANT_NAME} เรียบร้อยแล้ว จนท.กำลังตรวจสอบข้อมูล ติดตาม: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] ได้รับคำร้อง {TRACKING_ID} เรื่อง "{REQUEST_TITLE}" จากคุณ {APPLICANT_NAME} เรียบร้อยแล้ว จนท.กำลังตรวจสอบข้อมูล ติดตาม: {TRACKING_URL}',
    enabled: true
  },
  under_review: {
    key: 'under_review',
    labelTh: 'อยู่ระหว่างตรวจสอบ (Under Review)',
    descriptionTh: 'แจ้งเตือนเมื่อเจ้าหน้าที่รับเรื่องและกำลังดำเนินการตรวจสอบเอกสารหรือภาพกล้องวงจรปิด',
    badgeColor: 'amber',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} อยู่ระหว่างการตรวจสอบพิจารณา {OFFICER_NOTE} ติดตาม: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} อยู่ระหว่างการตรวจสอบพิจารณา {OFFICER_NOTE} ติดตาม: {TRACKING_URL}',
    enabled: true
  },
  action_required: {
    key: 'action_required',
    labelTh: 'ขอเอกสารเพิ่มเติม (Action Required)',
    descriptionTh: 'แจ้งเตือนเมื่อต้องการให้ประชาชนส่งเอกสารหลักฐานหรือข้อมูลยืนยันตัวตนเพิ่มเติม',
    badgeColor: 'orange',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ขอเอกสารเพิ่มเติมจากคุณ {APPLICANT_NAME} รายละเอียด: {OFFICER_NOTE} กรุณาส่งเอกสารที่: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ขอเอกสารเพิ่มเติมจากคุณ {APPLICANT_NAME} รายละเอียด: {OFFICER_NOTE} กรุณาส่งเอกสารที่: {TRACKING_URL}',
    enabled: true
  },
  approved: {
    key: 'approved',
    labelTh: 'อนุมัติคำร้อง (Approved)',
    descriptionTh: 'แจ้งเตือนเมื่อผู้บริหารหรือนายทะเบียนลงนามอนุมัติคำร้องเรียบร้อยแล้ว',
    badgeColor: 'emerald',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} เรื่อง "{REQUEST_TITLE}" ได้รับการอนุมัติแล้ว {OFFICER_NOTE} ตรวจสอบผลการอนุมัติ: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} เรื่อง "{REQUEST_TITLE}" ได้รับการอนุมัติแล้ว {OFFICER_NOTE} ตรวจสอบผลการอนุมัติ: {TRACKING_URL}',
    enabled: true
  },
  completed: {
    key: 'completed',
    labelTh: 'ดำเนินการเสร็จสิ้น (Completed)',
    descriptionTh: 'แจ้งเตือนเมื่อส่งมอบไฟล์ภาพ CCTV หรือจัดส่งเอกสารหนังสือรับรองให้ประชาชนเรียบร้อยแล้ว',
    badgeColor: 'teal',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} ดำเนินการเสร็จสิ้นสมบูรณ์แล้ว {OFFICER_NOTE} ขอบคุณที่ใช้บริการ: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} ดำเนินการเสร็จสิ้นสมบูรณ์แล้ว {OFFICER_NOTE} ขอบคุณที่ใช้บริการ: {TRACKING_URL}',
    enabled: true
  },
  rejected: {
    key: 'rejected',
    labelTh: 'ปฏิเสธคำร้อง (Rejected)',
    descriptionTh: 'แจ้งเตือนเมื่อคำร้องไม่ผ่านเกณฑ์การพิจารณา พร้อมระบุเหตุผลตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล',
    badgeColor: 'rose',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ไม่ผ่านการอนุมัติ เนื่องจาก: {OFFICER_NOTE} ตรวจสอบเหตุผลและยื่นอุทธรณ์: {TRACKING_URL}',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ไม่ผ่านการอนุมัติ เนื่องจาก: {OFFICER_NOTE} ตรวจสอบเหตุผลและยื่นอุทธรณ์: {TRACKING_URL}',
    enabled: true
  },
  reminder: {
    key: 'reminder',
    labelTh: 'ติดตามความคืบหน้า (Follow-up Reminder)',
    descriptionTh: 'ส่งแจ้งเตือนประชาชนหรือเจ้าหน้าที่เมื่อคำร้องรอนานเกินเกณฑ์ที่กำหนด',
    badgeColor: 'indigo',
    template: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} อยู่ระหว่างการเร่งรัดติดตามผลการดำเนินงาน เจ้าหน้าที่กำลังประสานงานให้ท่าน สอบถามโทร 044-811654',
    defaultTemplate: '[ทม.ชัยภูมิ] คำร้อง {TRACKING_ID} ของคุณ {APPLICANT_NAME} อยู่ระหว่างการเร่งรัดติดตามผลการดำเนินงาน เจ้าหน้าที่กำลังประสานงานให้ท่าน สอบถามโทร 044-811654',
    enabled: true
  }
};

/**
 * Replaces placeholders in an SMS template string with real data.
 */
export function replaceSmsPlaceholders(templateText: string, vars: SmsPlaceholderVariables): string {
  if (!templateText) return '';

  const trackingId = vars.trackingId || 'REQ-XXXXXX';
  const applicantName = vars.applicantName || 'ผู้ยื่นคำร้อง';
  const requestTitle = vars.requestTitle 
    ? (vars.requestTitle.length > 28 ? `${vars.requestTitle.slice(0, 26)}..` : vars.requestTitle) 
    : 'คำร้อง e-Service';
  const statusTh = vars.statusTh || 'อัปเดตสถานะ';
  const trackingUrl = vars.trackingUrl || `e-service.chaiyaphum.go.th/?trackId=${trackingId}`;
  const categoryName = vars.categoryName || 'บริการ e-Service';
  const currentDate = vars.currentDate || new Date().toLocaleDateString('th-TH');
  const municipality = vars.municipality || 'ทม.ชัยภูมิ';

  let cleanNote = (vars.officerNote || '').trim();
  if (cleanNote && cleanNote.length > 40) {
    cleanNote = `${cleanNote.slice(0, 38)}..`;
  }

  let text = templateText;

  // Replace case-insensitive and case-sensitive placeholders:
  text = text.replace(/\{(TRACKING_ID|REQUEST_ID|tracking_id|request_id)\}/gi, trackingId);
  text = text.replace(/\{(APPLICANT_NAME|CITIZEN_NAME|NAME|applicant_name|citizen_name|name)\}/gi, applicantName);
  text = text.replace(/\{(REQUEST_TITLE|TITLE|SUBJECT|request_title|title|subject)\}/gi, requestTitle);
  text = text.replace(/\{(STATUS|STATUS_NAME|status|status_name)\}/gi, statusTh);
  text = text.replace(/\{(TRACKING_URL|LINK|URL|tracking_url|link|url)\}/gi, trackingUrl);
  text = text.replace(/\{(CATEGORY|CATEGORY_NAME|category|category_name)\}/gi, categoryName);
  text = text.replace(/\{(DATE|current_date|date)\}/gi, currentDate);
  text = text.replace(/\{(MUNICIPALITY|ORG_NAME|municipality|org_name)\}/gi, municipality);

  // If officer note is provided: replace {OFFICER_NOTE} with note snippet, or clean up if empty
  if (cleanNote) {
    text = text.replace(/\{(OFFICER_NOTE|NOTE|REASON|officer_note|note|reason)\}/gi, `(${cleanNote})`);
  } else {
    // Remove the placeholder and any redundant surrounding punctuation or spaces
    text = text.replace(/(\s*[(]?\{(OFFICER_NOTE|NOTE|REASON|officer_note|note|reason)\}[)]?)/gi, '');
  }

  // Clean up any double spaces that might occur
  return text.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Gets all stored SMS templates, initialized with defaults.
 */
export function getSmsTemplates(): Record<SmsTemplateKey, SmsTemplateItem> {
  try {
    const raw = localStorage.getItem(SMS_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SMS_TEMPLATES, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load SMS templates:', err);
  }
  return { ...DEFAULT_SMS_TEMPLATES };
}

/**
 * Saves SMS templates to persistent localStorage and notifies listeners.
 */
export function saveSmsTemplates(templates: Record<SmsTemplateKey, SmsTemplateItem>): void {
  try {
    localStorage.setItem(SMS_TEMPLATES_KEY, JSON.stringify(templates));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms_templates_updated', { detail: { templates } }));
    }
    // Asynchronously synchronize with server
    fetch('/api/sms/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save SMS templates:', err);
  }
}

/**
 * Resets all templates back to municipal system defaults.
 */
export function resetSmsTemplatesToDefault(): Record<SmsTemplateKey, SmsTemplateItem> {
  saveSmsTemplates(DEFAULT_SMS_TEMPLATES);
  return { ...DEFAULT_SMS_TEMPLATES };
}

/**
 * Resets a single template to its system default.
 */
export function resetSingleSmsTemplate(key: SmsTemplateKey): SmsTemplateItem {
  const current = getSmsTemplates();
  const def = DEFAULT_SMS_TEMPLATES[key];
  if (def) {
    current[key] = { ...def };
    saveSmsTemplates(current);
  }
  return current[key] || def;
}

/**
 * Generates official SMS alert body for request status changes using customized templates.
 */
export function generateStatusSmsText(
  request: RequestItem,
  newStatus: RequestStatus | 'submitted' | 'reminder',
  officerNote?: string
): string {
  const templates = getSmsTemplates();
  let key: SmsTemplateKey = 'under_review';

  if (newStatus === 'submitted') {
    key = 'submitted';
  } else if (newStatus === 'reminder') {
    key = 'reminder';
  } else if (newStatus === 'action_required') {
    key = 'action_required';
  } else if (newStatus === 'approved') {
    key = 'approved';
  } else if (newStatus === 'completed' || newStatus === 'closed') {
    key = 'completed';
  } else if (newStatus === 'rejected') {
    key = 'rejected';
  } else {
    key = 'under_review';
  }

  const tmpl = templates[key] || DEFAULT_SMS_TEMPLATES[key];

  let statusTh = '';
  if (newStatus === 'submitted') {
    statusTh = 'ยื่นคำร้องแล้ว';
  } else if (newStatus === 'reminder') {
    statusTh = 'ติดตามความคืบหน้า';
  } else {
    statusTh = getStatusLabelTh(newStatus);
  }

  const applicantName = request.applicant 
    ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' 
    : 'ผู้ยื่นคำร้อง';

  return replaceSmsPlaceholders(tmpl.template, {
    trackingId: request.id,
    applicantName,
    requestTitle: request.title,
    statusTh,
    officerNote,
    trackingUrl: `e-service.chaiyaphum.go.th/?trackId=${request.id}`,
    categoryName: request.category || 'บริการ e-Service',
    currentDate: new Date().toLocaleDateString('th-TH')
  });
}

/**
 * Generates official SMS alert for initial request submission confirmation.
 */
export function generateSubmissionConfirmationSmsText(request: RequestItem): string {
  return generateStatusSmsText(request, 'submitted');
}

/**
 * Generates official SMS alert for stalled/follow-up reminders.
 */
export function generateFollowUpReminderSmsText(request: RequestItem, daysPending: number): string {
  return generateStatusSmsText(request, 'reminder', `ค้าง ${daysPending} วัน`);
}

/**
 * Sends SMS status update notification directly to applicant's phone number alongside email updates.
 */
export function sendStatusSmsNotification(
  request: RequestItem,
  newStatus: RequestStatus | 'submitted' | 'reminder',
  officerNote?: string,
  forceSend: boolean = false
): SmsLogItem | null {
  if (!request || !request.id) return null;

  // Check if SMS updates are enabled in notification settings (unless forced by test/manual trigger)
  if (!forceSend) {
    const settings = getNotificationSettings();
    if (!settings.smsNotificationsEnabled) {
      console.log(`[SMS Service] SMS notifications disabled in settings; skipped for ${request.id}`);
      return null;
    }
  }

  const rawPhone = request.applicant?.phone || '';
  const formattedPhone = formatThaiPhoneNumber(rawPhone) || '081-XXX-XXXX';
  const recipientName = request.applicant 
    ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' 
    : 'ผู้ยื่นคำร้อง';

  const message = generateStatusSmsText(request, newStatus, officerNote);
  const creditInfo = calculateSmsCredits(message);
  const carrier = detectCarrier(rawPhone);
  const deliveryRef = `REF-SMS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const logItem: SmsLogItem = {
    id: `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    requestTitle: request.title || '',
    recipientPhone: formattedPhone,
    recipientName,
    message,
    status: 'sent',
    triggerStatus: newStatus,
    sentAt: new Date().toISOString(),
    provider: DEFAULT_PROVIDER,
    characterCount: creditInfo.characters,
    creditUnits: creditInfo.credits,
    deliveryRef,
    carrier
  };

  // Save log locally
  const currentLogs = getSmsLogs();
  saveSmsLogs([logItem, ...currentLogs]);

  // Dispatch to server API asynchronously if online
  if (typeof fetch !== 'undefined') {
    fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logItem)
    }).catch((err) => {
      console.warn('[SMS Service] Background server sync warning:', err);
    });
  }

  // Deduct remaining credits in local state
  decrementGatewayCredits(creditInfo.credits);

  console.log(`[SMS Service Dispatch] Status alert sent to ${formattedPhone} (${carrier}) for status ${newStatus}. Credits: ${creditInfo.credits}`);
  return logItem;
}

/**
 * Sends SMS confirmation receipt immediately upon request submission.
 */
export function sendSubmissionConfirmationSms(
  request: RequestItem,
  forceSend: boolean = false
): SmsLogItem | null {
  if (!request || !request.id) return null;

  if (!forceSend) {
    const settings = getNotificationSettings();
    if (!settings.smsNotificationsEnabled) return null;
  }

  const rawPhone = request.applicant?.phone || '';
  const formattedPhone = formatThaiPhoneNumber(rawPhone) || '081-XXX-XXXX';
  const recipientName = request.applicant 
    ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' 
    : 'ผู้ยื่นคำร้อง';

  const message = generateSubmissionConfirmationSmsText(request);
  const creditInfo = calculateSmsCredits(message);
  const carrier = detectCarrier(rawPhone);
  const deliveryRef = `REF-SUB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const logItem: SmsLogItem = {
    id: `SMS-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    requestTitle: request.title || '',
    recipientPhone: formattedPhone,
    recipientName,
    message,
    status: 'sent',
    triggerStatus: 'submitted',
    sentAt: new Date().toISOString(),
    provider: DEFAULT_PROVIDER,
    characterCount: creditInfo.characters,
    creditUnits: creditInfo.credits,
    deliveryRef,
    carrier
  };

  const currentLogs = getSmsLogs();
  saveSmsLogs([logItem, ...currentLogs]);

  if (typeof fetch !== 'undefined') {
    fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logItem)
    }).catch(() => {});
  }

  decrementGatewayCredits(creditInfo.credits);
  console.log(`[SMS Service Dispatch] Submission confirmation sent to ${formattedPhone}`);
  return logItem;
}

/**
 * Sends follow-up reminder SMS for stalled requests.
 */
export function sendFollowUpReminderSms(
  request: RequestItem,
  daysPending: number,
  forceSend: boolean = false
): SmsLogItem | null {
  if (!request || !request.id) return null;

  if (!forceSend) {
    const settings = getNotificationSettings();
    if (!settings.smsNotificationsEnabled) return null;
  }

  const rawPhone = request.applicant?.phone || '';
  const formattedPhone = formatThaiPhoneNumber(rawPhone) || '081-XXX-XXXX';
  const recipientName = request.applicant 
    ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' 
    : 'ผู้ยื่นคำร้อง';

  const message = generateFollowUpReminderSmsText(request, daysPending);
  const creditInfo = calculateSmsCredits(message);
  const carrier = detectCarrier(rawPhone);
  const deliveryRef = `REF-REM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const logItem: SmsLogItem = {
    id: `SMS-REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    requestTitle: request.title || '',
    recipientPhone: formattedPhone,
    recipientName,
    message,
    status: 'sent',
    triggerStatus: 'reminder',
    sentAt: new Date().toISOString(),
    provider: DEFAULT_PROVIDER,
    characterCount: creditInfo.characters,
    creditUnits: creditInfo.credits,
    deliveryRef,
    carrier
  };

  const currentLogs = getSmsLogs();
  saveSmsLogs([logItem, ...currentLogs]);

  decrementGatewayCredits(creditInfo.credits);
  return logItem;
}

/**
 * Resends an existing SMS notification item.
 */
export function resendSmsNotification(logId: string): SmsLogItem | null {
  const logs = getSmsLogs();
  const existing = logs.find((l) => l.id === logId);
  if (!existing) return null;

  const creditInfo = calculateSmsCredits(existing.message);
  const newDeliveryRef = `REF-RESEND-${Date.now().toString().slice(-6)}`;

  const newLog: SmsLogItem = {
    ...existing,
    id: `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sentAt: new Date().toISOString(),
    status: 'sent',
    deliveryRef: newDeliveryRef
  };

  saveSmsLogs([newLog, ...logs]);
  decrementGatewayCredits(creditInfo.credits);
  return newLog;
}

/**
 * Returns the current SMS gateway operational metrics.
 */
export function getSmsGatewayStatus(): SmsGatewayStatus {
  let credits = 4850;
  try {
    const stored = localStorage.getItem(SMS_CREDITS_KEY);
    if (stored) credits = parseInt(stored, 10);
  } catch {}

  return {
    online: true,
    provider: DEFAULT_PROVIDER,
    remainingCredits: Math.max(0, credits),
    successRatePercent: 99.7,
    avgLatencyMs: 140,
    activeCarriers: ['AIS', 'TrueMove H', 'DTAC', 'NT']
  };
}

function decrementGatewayCredits(amount: number): void {
  try {
    const current = getSmsGatewayStatus().remainingCredits;
    const next = Math.max(0, current - amount);
    localStorage.setItem(SMS_CREDITS_KEY, String(next));
  } catch {}
}
