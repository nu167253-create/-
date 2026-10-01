import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { getAccessToken } from './googleAuth';
import { getStatusLabelTh } from './storage';

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

export async function exportRequestsToGoogleSheets(
  requests: RequestItem[],
  spreadsheetName: string = 'รายงานคำร้องสารบรรณ_Google_Sheets'
) {
  if (!requests || requests.length === 0) {
    throw new Error('ไม่มีข้อมูลคำร้องสำหรับส่งออก');
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const headers = [
    'รหัสติดตาม (Tracking ID)',
    'หมวดหมู่คำร้อง',
    'หัวข้อคำร้อง',
    'ผู้ยื่นคำร้อง',
    'ตำแหน่ง/ประเภทผู้ยื่น',
    'หน่วยงาน/สังกัด',
    'เบอร์โทรศัพท์',
    'อีเมล',
    'สถานะคำร้อง',
    'ระดับความเร่งด่วน',
    'เจ้าหน้าที่ผู้รับเรื่อง',
    'จำนวนไฟล์แนบ',
    'นัดหมายรับเรื่อง/ตรวจสอบ',
    'หมายเหตุเจ้าหน้าที่',
    'วันที่ยื่นเรื่อง',
    'ปรับปรุงล่าสุด',
    'รายละเอียด/เหตุผล'
  ];

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

  const values = [headers, ...rows];
  const todayStr = new Date().toISOString().split('T')[0];
  const finalTitle = `${spreadsheetName}_${todayStr}`;

  // 1. Create a new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: finalTitle
      }
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    console.error('Failed to create spreadsheet:', errorData);
    throw new Error('ไม่สามารถสร้าง Google Sheets ได้');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;

  // 2. Update values
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Q${values.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `Sheet1!A1:Q${values.length}`,
      majorDimension: 'ROWS',
      values: values
    })
  });

  if (!updateRes.ok) {
    const errorData = await updateRes.json();
    console.error('Failed to update spreadsheet values:', errorData);
    throw new Error('ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้');
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
