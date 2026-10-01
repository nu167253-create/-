import { RequestItem, RequestStatus } from '../types/request';
import { getStatusLabelTh } from './storage';
import { getNotificationSettings } from './notificationService';

export interface EmailLogItem {
  id: string;
  requestId: string;
  requestTitle: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: 'sent' | 'failed';
  triggerStatus: RequestStatus;
  sentAt: string;
  bodyPreview: string;
  fullBodyHtml: string;
}

// Re-export SMS module functionality for seamless backwards compatibility
export {
  type SmsLogItem,
  type SmsGatewayStatus,
  type SmsCreditCalculation,
  getSmsLogs,
  saveSmsLogs,
  clearSmsLogs,
  sendStatusSmsNotification,
  sendSubmissionConfirmationSms,
  sendFollowUpReminderSms,
  resendSmsNotification,
  formatThaiPhoneNumber,
  validateThaiMobileNumber,
  calculateSmsCredits,
  getSmsGatewayStatus
} from './smsService';

const EMAIL_LOGS_KEY = 'e_service_email_notification_logs_v1';

export function getEmailLogs(): EmailLogItem[] {
  try {
    const data = localStorage.getItem(EMAIL_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to read email logs:', err);
    return [];
  }
}

export function saveEmailLogs(logs: EmailLogItem[]): void {
  try {
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save email logs:', err);
  }
}

export function sendStatusEmailNotification(
  request: RequestItem,
  newStatus: RequestStatus,
  officerNote?: string
): EmailLogItem | null {
  if (!request || !request.id) return null;
  // Only auto-trigger for specified status changes or allow all if called
  const recipientEmail = request.applicant?.email || 'applicant@example.com';
  const recipientName = request.applicant ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' : 'ผู้ยื่นคำร้อง';
  const statusTh = getStatusLabelTh(newStatus);

  const subject = `[แจ้งสถานะคำร้อง ${request.id}] เรื่อง "${request.title || ''}" เปลี่ยนสถานะเป็น "${statusTh}"`;
  
  const formattedDate = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const bodyPreview = `เรียนคุณ ${recipientName}, คำร้องรหัส ${request.id} เรื่อง "${request.title || ''}" ได้รับการอัปเดตสถานะเป็น "${statusTh}" เมื่อเวลา ${formattedDate} น.`;

  const fullBodyHtml = `
    <div style="font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">ศูนย์บริการประชาชนและระบบสารบรรณอิเล็กทรอนิกส์</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">E-Service Center Notification System</p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>เรียน คุณ${recipientName}</strong>,</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #475569; line-height: 1.5;">
          ระบบขอแจ้งให้ท่านทราบว่า คำร้องของท่านได้รับการปรับปรุงสถานะการดำเนินงานเรียบร้อยแล้ว
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 140px; font-weight: bold;">รหัสติดตามคำร้อง:</td>
          <td style="padding: 10px; color: #1e293b; font-weight: bold; font-family: monospace;">${request.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">หัวข้อเรื่อง:</td>
          <td style="padding: 10px; color: #1e293b;">${request.title || ''}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">สถานะปัจจุบัน:</td>
          <td style="padding: 10px;">
            <span style="display: inline-block; background-color: ${newStatus === 'completed' ? '#dcfce7' : '#fef3c7'}; color: ${newStatus === 'completed' ? '#166534' : '#92400e'}; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px;">
              ${statusTh}
            </span>
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">เวลาที่ดำเนินการ:</td>
          <td style="padding: 10px; color: #1e293b;">${formattedDate} น.</td>
        </tr>
        ${officerNote ? `
        <tr>
          <td style="padding: 10px; color: #64748b; font-weight: bold;">ข้อความจากเจ้าหน้าที่:</td>
          <td style="padding: 10px; color: #1e293b; background-color: #f1f5f9; border-radius: 6px;">${officerNote}</td>
        </tr>
        ` : ''}
      </table>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">ท่านสามารถติดตามรายละเอียดเพิ่มเติมผ่านพอร์ตัลบริการประชาชน</p>
        <span style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold;">
          ตรวจสอบสถานะคำร้องในระบบ
        </span>
      </div>

      <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8;">
        ข้อความนี้เป็นการส่งโดยอัตโนมัติจากระบบบริการประชาชนออนไลน์ กรุณาอย่าตอบกลับอีเมลนี้
      </div>
    </div>
  `;

  const logItem: EmailLogItem = {
    id: `MAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    requestTitle: request.title || '',
    recipientEmail,
    recipientName,
    subject,
    status: 'sent',
    triggerStatus: newStatus,
    sentAt: new Date().toISOString(),
    bodyPreview,
    fullBodyHtml
  };

  const logs = getEmailLogs();
  saveEmailLogs([logItem, ...logs]);

  console.log(`[Email Service Dispatch] Notification sent to ${recipientEmail} for status ${newStatus}`);
  return logItem;
}

export function sendSubmissionConfirmationEmail(request: RequestItem): EmailLogItem | null {
  if (!request || !request.id) return null;
  const recipientEmail = (request.applicant?.email || '').trim() || 'applicant@example.com';
  const recipientName = request.applicant ? `${request.applicant.prefix || ''}${request.applicant.fullName || ''}`.trim() || 'ผู้ยื่นคำร้อง' : 'ผู้ยื่นคำร้อง';

  const subject = `[ยืนยันการรับคำร้อง ${request.id}] เรื่อง "${request.title || ''}"`;
  
  const formattedDate = new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const bodyPreview = `เรียนคุณ ${recipientName}, ระบบได้รับคำร้องออนไลน์ รหัส ${request.id} เรื่อง "${request.title || ''}" เรียบร้อยแล้ว เมื่อเวลา ${formattedDate} น.`;

  const fullBodyHtml = `
    <div style="font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">ศูนย์บริการประชาชนและระบบสารบรรณอิเล็กทรอนิกส์</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px;">E-Service Center Confirmation System</p>
      </div>

      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #14532d;"><strong>เรียน คุณ${recipientName}</strong>,</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #166534; line-height: 1.5;">
          ระบบสารบรรณอิเล็กทรอนิกส์ได้รับคำร้องออนไลน์ของท่านเรียบร้อยแล้ว เจ้าหน้าที่กำลังดำเนินการตรวจสอบเอกสารตามลำดับขั้นตอน
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 140px; font-weight: bold;">รหัสติดตามคำร้อง:</td>
          <td style="padding: 10px; font-weight: bold; font-family: monospace; font-size: 16px; color: #d97706;">${request.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">หัวข้อคำร้อง:</td>
          <td style="padding: 10px; color: #1e293b; font-weight: bold;">${request.title || ''}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">ผู้ยื่นคำร้อง:</td>
          <td style="padding: 10px; color: #1e293b;">${recipientName} (${request.applicant?.department || '-'})</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">อีเมลติดต่อ:</td>
          <td style="padding: 10px; color: #2563eb;">${request.applicant?.email || 'ไม่ได้ระบุ'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">วันเวลาที่ยื่นคำร้อง:</td>
          <td style="padding: 10px; color: #1e293b;">${formattedDate} น.</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; font-weight: bold;">สถานะเริ่มต้น:</td>
          <td style="padding: 10px;">
            <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px;">
              ยื่นคำร้องเรียบร้อยแล้ว
            </span>
          </td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 12px; color: #475569;">
        <strong>📌 ขั้นตอนถัดไป:</strong><br/>
        เจ้าหน้าที่สารบรรณจะทำการลงรับหนังสือ ตรวจสอบความถูกต้องของเอกสารแนบ และเสนอต่อผู้มีอำนาจลงนาม หากมีความคืบหน้า ระบบจะส่งอีเมลแจ้งเตือนถึงท่านอีกครั้ง
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">ท่านสามารถนำรหัส <strong>${request.id}</strong> ไปตรวจสอบสถานะได้ตลอด 24 ชม.</p>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        ข้อความนี้เป็นการส่งโดยอัตโนมัติจากระบบบริการประชาชนออนไลน์ กรุณาอย่าตอบกลับอีเมลนี้
      </div>
    </div>
  `;

  const logItem: EmailLogItem = {
    id: `CONFIRM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId: request.id,
    requestTitle: request.title,
    recipientEmail,
    recipientName,
    subject,
    status: 'sent',
    triggerStatus: 'submitted',
    sentAt: new Date().toISOString(),
    bodyPreview,
    fullBodyHtml
  };

  const logs = getEmailLogs();
  saveEmailLogs([logItem, ...logs]);

  console.log(`[Email Service Dispatch] Submission confirmation sent to ${recipientEmail} for request ${request.id}`);
  return logItem;
}
