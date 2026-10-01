import { getAccessToken, googleSignIn } from './googleAuth';
import { RequestItem, RequestCategory } from '../types/request';
import { getStatusLabelTh } from './storage';

export interface KeepSyncResult {
  success: boolean;
  message: string;
  method: 'api' | 'web';
  keepUrl: string;
  noteTitle: string;
  noteBody: string;
  noteId?: string;
}

const CATEGORY_NAMES_TH: Record<RequestCategory, string> = {
  cctv: 'ขอข้อมูลภาพกล้องวงจรปิด (CCTV)',
  general: 'คำร้องทั่วไป / ข้อเสนอแนะ',
  certificate: 'ขอหนังสือรับรอง / เอกสารราชการ',
  leave: 'ขออนุมัติการลาปฏิบัติงาน',
  maintenance: 'แจ้งซ่อมแซมและบำรุงรักษาอาคารสถานที่',
  budget: 'ขออนุมัติงบประมาณและเบิกจ่าย'
};

/**
 * Formats request details into structured Keep note title and content.
 */
export function formatRequestForKeep(request: RequestItem) {
  const categoryTh = CATEGORY_NAMES_TH[request.category] || request.category;
  const statusTh = getStatusLabelTh(request.status);
  const createdDate = new Date(request.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const applicantName = `${request.applicant?.prefix || ''}${request.applicant?.fullName || 'ไม่ระบุชื่อ'}`.trim();
  const department = request.applicant?.department || 'เทศบาลเมืองชัยภูมิ';
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}?track=${request.id}` : `https://e-service.chaiyaphum.go.th?track=${request.id}`;

  const noteTitle = `📌 [คำร้อง e-Service] ${request.id} - ${request.title}`;

  const noteLines = [
    `🏷️ รหัสติดตามคำร้อง (Tracking ID): ${request.id}`,
    `📁 หมวดหมู่คำร้อง (Category): ${categoryTh}`,
    `📅 วันที่ยื่นเรื่อง (Submission Date): ${createdDate} น.`,
    `⚡ สถานะปัจจุบัน (Current Status): ${statusTh} (${request.status})`,
    `👤 ผู้ยื่นคำร้อง (Applicant): ${applicantName} (${department})`,
    request.applicant?.phone ? `📞 เบอร์โทรติดต่อ: ${request.applicant.phone}` : null,
    request.applicant?.email ? `✉️ อีเมล: ${request.applicant.email}` : null,
    ``,
    `📝 รายละเอียด / เหตุผลความจำเป็น:`,
    request.reason || request.title || 'ไม่มีรายละเอียดเพิ่มเติม',
    ``,
    `🔗 ลิงก์ตรวจสอบสถานะคำร้องออนไลน์:`,
    trackingUrl,
    ``,
    `--------------------------------------`,
    `บันทึกช่วยจำจากระบบเทศบาลเมืองชัยภูมิ (e-Service Smart Portal)`
  ].filter((line) => line !== null);

  return {
    title: noteTitle,
    bodyText: noteLines.join('\n'),
    trackingId: request.id,
    categoryTh,
    createdDate,
    trackingUrl
  };
}

/**
 * Syncs request details to Google Keep as a note.
 * Attempts Google Keep REST API first; if unauthenticated, requests sign-in;
 * if Keep REST API is restricted for personal Google accounts, falls back to Google Keep web creation.
 */
export async function syncRequestToKeep(request: RequestItem): Promise<KeepSyncResult> {
  const { title, bodyText, trackingId, categoryTh, createdDate } = formatRequestForKeep(request);

  let token = await getAccessToken();

  if (!token) {
    try {
      const authResult = await googleSignIn();
      token = authResult?.accessToken || null;
    } catch (authErr) {
      console.warn('Google sign in skipped or cancelled, proceeding with Google Keep Web fallback:', authErr);
    }
  }

  // If token is present, try Google Keep REST API
  if (token) {
    try {
      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          body: {
            text: {
              text: bodyText
            }
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          method: 'api',
          noteId: data.name || data.id,
          keepUrl: 'https://keep.google.com/',
          noteTitle: title,
          noteBody: bodyText,
          message: `บันทึกคำร้อง ${trackingId} (${categoryTh}) ลงใน Google Keep ของคุณสำเร็จเรียบร้อยแล้ว!`
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Google Keep REST API response not ok (requires Enterprise domain or direct Keep note):', errJson);
      }
    } catch (apiError) {
      console.warn('Error calling Keep API:', apiError);
    }
  }

  // Fallback: Copy note payload to clipboard and launch Google Keep Web note creator
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${bodyText}`);
    } catch (clipErr) {
      console.warn('Could not copy to clipboard:', clipErr);
    }
  }

  // Return Keep link
  const keepUrl = 'https://keep.google.com/';
  return {
    success: true,
    method: 'web',
    keepUrl,
    noteTitle: title,
    noteBody: bodyText,
    message: `คัดลอกข้อมูลคำร้อง ${trackingId} (${categoryTh}, ${createdDate}) แล้ว พร้อมเปิด Google Keep เพื่อบันทึกโน้ต!`
  };
}
