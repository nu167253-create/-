import { RequestItem } from '../types/request';
import { getAccessToken } from './googleAuth';
import { getStatusLabelTh, getPriorityLabelTh } from './storage';
import { REQUEST_CATEGORIES } from '../data/categories';

/**
 * Creates a Google Doc with a formal Thai government executive report / summary for selected requests.
 */
export async function exportRequestsToGoogleDocs(
  requests: RequestItem[],
  documentName: string = 'รายงานสรุปคำร้องงานสารบรรณ_Google_Docs',
  officerName?: string
): Promise<string> {
  if (!requests || requests.length === 0) {
    throw new Error('ไม่มีข้อมูลคำร้องสำหรับส่งออก');
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const finalTitle = `${documentName}_${today.toISOString().slice(0, 10)}`;

  // 1. Create a new Google Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: finalTitle
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    console.error('Failed to create Google Doc:', errorData);
    throw new Error(`ไม่สามารถสร้าง Google Docs ได้: ${errorData.error?.message || 'ข้อผิดพลาดเครือข่าย'}`);
  }

  const createData = await createRes.json();
  const documentId = createData.documentId;

  // 2. Prepare structured text for the document
  const totalCount = requests.length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const underReviewCount = requests.filter(r => r.status === 'under_review').length;
  const submittedCount = requests.filter(r => r.status === 'submitted').length;
  const actionRequiredCount = requests.filter(r => r.status === 'action_required').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  let contentText = `บันทึกรายงานสรุปผลการดำเนินงานคำร้อง e-Service\n`;
  contentText += `ศูนย์บริการประชาชนและระบบสารบรรณดิจิทัล เทศบาลเมืองชัยภูมิ\n`;
  contentText += `วันที่ออกรายงาน: ${dateFormatted}\n`;
  if (officerName) {
    contentText += `เจ้าหน้าที่ผู้จัดทำรายงาน: ${officerName}\n`;
  }
  contentText += `================================================================================\n\n`;

  contentText += `๑. ข้อมูลสรุปภาพรวมเชิงสถิติ (Executive Summary KPIs)\n`;
  contentText += `   • จำนวนคำร้องทั้งหมดในรายงาน: ${totalCount} รายการ\n`;
  contentText += `   • ดำเนินการอนุมัติ / เสร็จสิ้น: ${approvedCount} รายการ (${totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%)\n`;
  contentText += `   • อยู่ระหว่างการตรวจสอบ (Under Review): ${underReviewCount} รายการ\n`;
  contentText += `   • รับเรื่องใหม่ / รอดำเนินการ (Submitted): ${submittedCount} รายการ\n`;
  contentText += `   • ขอเอกสารหรือข้อมูลเพิ่มเติม (Action Required): ${actionRequiredCount} รายการ\n`;
  contentText += `   • ไม่อนุมัติ / ยุติเรื่อง (Rejected): ${rejectedCount} รายการ\n\n`;

  contentText += `๒. บัญชีรายละเอียดคำร้อง (Requests Ledger)\n`;
  contentText += `--------------------------------------------------------------------------------\n`;

  requests.forEach((req, idx) => {
    const catName = REQUEST_CATEGORIES.find(c => c.id === req.category)?.titleTh || req.category;
    const reqDate = new Date(req.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    contentText += `[ลำดับที่ ${idx + 1}] เลขที่คำร้อง: ${req.id}\n`;
    contentText += `   • วันที่ยื่นเรื่อง: ${reqDate}\n`;
    contentText += `   • ผู้ยื่นคำร้อง: ${req.applicant?.prefix || ''}${req.applicant?.fullName || 'ไม่ระบุ'} (เบอร์โทร: ${req.applicant?.phone || '-'}, อีเมล: ${req.applicant?.email || '-'})\n`;
    contentText += `   • หมวดหมู่บริการ: ${catName}\n`;
    contentText += `   • หัวข้อเรื่อง: ${req.title}\n`;
    contentText += `   • วัตถุประสงค์ / เหตุผล: ${req.reason || '-'}\n`;
    contentText += `   • ระดับความเร่งด่วน: ${getPriorityLabelTh(req.priority)}\n`;
    contentText += `   • สถานะปัจจุบัน: ${getStatusLabelTh(req.status)}\n`;
    contentText += `   • เจ้าหน้าที่ผู้รับผิดชอบ: ${req.assignedOfficer || '-'}\n`;
    if (req.officerNotes) {
      contentText += `   • บันทึกข้อสั่งการ/หมายเหตุ: ${req.officerNotes}\n`;
    }
    if (req.appointment && req.appointment.status !== 'cancelled') {
      contentText += `   • นัดหมาย: วันที่ ${req.appointment.date} เวลา ${req.appointment.time} น. (${req.appointment.location})\n`;
    }
    contentText += `--------------------------------------------------------------------------------\n`;
  });

  contentText += `\n๓. การลงนามรับรองผลการจัดทำรายงาน\n\n`;
  contentText += `   (ลงชื่อ)........................................................       (ลงชื่อ)........................................................\n`;
  contentText += `   ( ${officerName || '............................................................'} )       ( ............................................................ )\n`;
  contentText += `   ตำแหน่ง เจ้าหน้าที่ผู้รวบรวมรายงาน                       ตำแหน่ง หัวหน้างานสารบรรณ / ผู้บังคับบัญชา\n`;

  // 3. Batch Update to insert text into the document
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: contentText
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    const errorData = await updateRes.json();
    console.error('Failed to update Google Doc:', errorData);
    throw new Error('ไม่สามารถบันทึกเนื้อหาลงใน Google Docs ได้');
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

/**
 * Creates an official Thai government memorandum document (บันทึกข้อความราชการ) for a single request in Google Docs.
 */
export async function createOfficialMemoGoogleDoc(
  request: RequestItem,
  officerName?: string
): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const catName = REQUEST_CATEGORIES.find(c => c.id === request.category)?.titleTh || request.category;
  const docTitle = `บันทึกข้อความ_${request.id}_${today.toISOString().slice(0, 10)}`;

  // 1. Create doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: docTitle
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(`ไม่สามารถสร้าง Google Docs ได้: ${errorData.error?.message || 'ข้อผิดพลาดเครือข่าย'}`);
  }

  const createData = await createRes.json();
  const documentId = createData.documentId;

  // 2. Prepare Memo text
  let memoText = `\n`;
  memoText += `                               บันทึกข้อความ\n`;
  memoText += `ส่วนราชการ  ศูนย์ควบคุมกล้องวงจรปิด CCTV และงานสารบรรณ เทศบาลเมืองชัยภูมิ\n`;
  memoText += `ที่  ชภ ๕๒๐๐๔ / ....................................          วันที่  ${dateFormatted}\n`;
  memoText += `เรื่อง  รายงานผลการพิจารณาคำร้องและตรวจสอบข้อมูลภาพ CCTV เลขที่คำร้อง ${request.id}\n`;
  memoText += `--------------------------------------------------------------------------------\n`;
  memoText += `เรียน  ปลัดเทศบาลเมืองชัยภูมิ / นายกเทศมนตรีเมืองชัยภูมิ\n\n`;
  memoText += `     ๑. เรื่องเดิม\n`;
  memoText += `        ตามที่ ${request.applicant?.prefix || ''}${request.applicant?.fullName || 'ผู้ยื่นคำร้อง'} ได้ยื่นคำร้องผ่านระบบบริการออนไลน์ e-Service เมื่อวันที่ ${new Date(request.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} ความว่า "${request.title}" โดยมีวัตถุประสงค์เพื่อ "${request.reason || 'ขอรับบริการข้อมูลภาพ CCTV'}" ความละเอียดแจ้งแล้วนั้น\n\n`;
  
  memoText += `     ๒. ข้อเท็จจริงและการตรวจสอบ\n`;
  memoText += `        เจ้าหน้าที่งานสารบรรณและศูนย์ควบคุมกล้อง CCTV ได้ดำเนินการตรวจสอบข้อมูลคำร้องและพิกัดจุดติดตั้งกล้องวงจรปิดเรียบร้อยแล้ว ปรากฏผลการดำเนินงานดังนี้:\n`;
  memoText += `        • หมวดหมู่บริการ: ${catName}\n`;
  memoText += `        • ระดับความเร่งด่วน: ${getPriorityLabelTh(request.priority)}\n`;
  memoText += `        • สถานะปัจจุบัน: ${getStatusLabelTh(request.status)}\n`;
  memoText += `        • เจ้าหน้าที่ผู้ตรวจสอบ: ${officerName || request.assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'}\n`;
  if (request.officerNotes) {
    memoText += `        • ผลการตรวจสอบ/หมายเหตุ: ${request.officerNotes}\n`;
  }
  memoText += `\n`;

  memoText += `     ๓. ข้อเสนอเพื่อพิจารณา\n`;
  memoText += `        จึงเรียนมาเพื่อโปรดทราบ และพิจารณาให้ความเห็นชอบตามระเบียบราชการต่อไป\n\n\n`;

  memoText += `                                    (ลงชื่อ)........................................................\n`;
  memoText += `                                    ( ${officerName || request.assignedOfficer || '............................................................'} )\n`;
  memoText += `                                    ตำแหน่ง เจ้าหน้าที่ศูนย์ควบคุมกล้อง CCTV / ผู้เสนอเรื่อง\n`;

  // 3. Insert Text
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: memoText
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    throw new Error('ไม่สามารถเขียนข้อมูลลงใน Google Docs ได้');
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

/**
 * Creates a Bulk Status Update Confirmation & Audit Memo Google Doc.
 */
export async function createBulkStatusUpdateMemoGoogleDoc(
  requests: RequestItem[],
  newStatus: string,
  officerName: string,
  note?: string
): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google ด้วยบัญชีที่มีสิทธิ์เข้าถึง (Authentication required)');
  }

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const statusLabel = getStatusLabelTh(newStatus as any);
  const docTitle = `บันทึกการปรับสถานะแบบกลุ่ม_${statusLabel}_${today.toISOString().slice(0, 10)}`;

  // 1. Create Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: docTitle
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    throw new Error(`ไม่สามารถสร้าง Google Docs ได้: ${errorData.error?.message || 'ข้อผิดพลาดเครือข่าย'}`);
  }

  const createData = await createRes.json();
  const documentId = createData.documentId;

  // 2. Prepare content
  let memoText = `บันทึกข้อความการปรับปรุงสถานะคำร้องแบบกลุ่ม (Bulk Status Update Audit Memo)\n`;
  memoText += `ศูนย์บริการประชาชน e-Service และงานสารบรรณ เทศบาลเมืองชัยภูมิ\n`;
  memoText += `วัน-เวลาที่ดำเนินการ: ${dateFormatted} น.\n`;
  memoText += `เจ้าหน้าที่ผู้ทำรายการ: ${officerName}\n`;
  memoText += `สถานะเป้าหมายที่ปรับ: ${statusLabel} (${newStatus})\n`;
  if (note) {
    memoText += `หมายเหตุ / คำสั่งการ: ${note}\n`;
  }
  memoText += `================================================================================\n\n`;

  memoText += `รายการคำร้องที่ได้รับการปรับสถานะจำนวนรวม ${requests.length} รายการ:\n\n`;

  requests.forEach((r, idx) => {
    memoText += `${idx + 1}. [${r.id}] ${r.title}\n`;
    memoText += `   ผู้ยื่น: ${r.applicant?.prefix || ''}${r.applicant?.fullName || 'ไม่ระบุ'} (${r.applicant?.phone || '-'}) | หมวดหมู่: ${r.category}\n`;
    memoText += `   สถานะใหม่: ${statusLabel} | ผู้รับผิดชอบ: ${r.assignedOfficer || officerName}\n\n`;
  });

  memoText += `--------------------------------------------------------------------------------\n`;
  memoText += `รับรองการทำรายการปรับสถานะถูกต้องตามระเบียบงานสารบรรณอิเล็กทรอนิกส์\n\n`;
  memoText += `(ลงชื่อ)........................................................\n`;
  memoText += `( ${officerName} )\n`;
  memoText += `เจ้าหน้าที่ผู้รับผิดชอบการทำรายการแบบกลุ่ม\n`;

  // 3. Insert Text
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: memoText
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    throw new Error('ไม่สามารถเขียนข้อมูลลงใน Google Docs ได้');
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}
