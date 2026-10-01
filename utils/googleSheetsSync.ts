import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { getAccessToken } from './googleAuth';
import { getStatusLabelTh } from './storage';

const SHEET_ID_KEY = 'connected_google_sheet_id';
const UNSYNCED_REQUESTS_KEY = 'unsynced_google_sheet_requests';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'ยื่นคำร้องแล้ว',
  under_review: 'อยู่ระหว่างการพิจารณา',
  action_required: 'ต้องการข้อมูล/เอกสารเพิ่มเติม',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ/ปฏิเสธ',
  completed: 'ดำเนินการเสร็จสิ้น'
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: 'ปกติ',
  urgent: 'ด่วน',
  immediate: 'ด่วนที่สุด'
};

export function getConnectedSheetId(): string | null {
  return localStorage.getItem(SHEET_ID_KEY);
}

export function setConnectedSheetId(id: string) {
  localStorage.setItem(SHEET_ID_KEY, id);
}

export function disconnectSheet() {
  localStorage.removeItem(SHEET_ID_KEY);
}

export function markRequestAsUnsynced(requestId: string) {
  try {
    const unsynced = getUnsyncedRequests();
    if (!unsynced.includes(requestId)) {
      unsynced.push(requestId);
      localStorage.setItem(UNSYNCED_REQUESTS_KEY, JSON.stringify(unsynced));
    }
  } catch (err) {
    console.error('Failed to mark request as unsynced', err);
  }
}

export function getUnsyncedRequests(): string[] {
  try {
    const raw = localStorage.getItem(UNSYNCED_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeSyncedRequests(requestIds: string[]) {
  try {
    const unsynced = getUnsyncedRequests().filter(id => !requestIds.includes(id));
    localStorage.setItem(UNSYNCED_REQUESTS_KEY, JSON.stringify(unsynced));
  } catch (err) {
    console.error('Failed to remove synced requests', err);
  }
}

export async function appendRequestsToSheet(requests: RequestItem[], spreadsheetId: string): Promise<void> {
  if (!requests || requests.length === 0) return;

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อซิงค์ข้อมูล (Authentication required)');
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const rows = requests.map((req) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;
    const createdDate = req.createdAt ? new Date(req.createdAt).toLocaleString('th-TH') : '';
    const updatedDate = req.updatedAt ? new Date(req.updatedAt).toLocaleString('th-TH') : '';
    const attachmentCount = req.attachments ? req.attachments.length : 0;
    
    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.appointmentDate} ${req.appointment.appointmentTime} (${req.appointment.location})`;
    }

    return [
      req.id || '',
      categoryName || '',
      req.title || '',
      `${req.applicant.prefix || ''}${req.applicant.fullName || ''}`,
      req.applicant.position || req.applicant.userGroup || '-',
      req.applicant.department || '',
      req.applicant.phone || '',
      req.applicant.email || '-',
      statusName || '',
      priorityName || '',
      req.assignedOfficer || '-',
      attachmentCount,
      appointmentStr,
      req.officerNotes || '-',
      createdDate,
      updatedDate,
      req.reason || ''
    ];
  });

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: rows
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error('Failed to append to spreadsheet:', errorData);
    throw new Error('ไม่สามารถเพิ่มข้อมูลลง Google Sheets ได้ (Failed to append data)');
  }
}
