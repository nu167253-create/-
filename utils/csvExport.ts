import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';

const STATUS_LABELS: Record<string, string> = {
  draft: 'ฉบับร่าง',
  submitted: 'ยื่นคำร้องแล้ว',
  under_review: 'อยู่ระหว่างการพิจารณา',
  action_required: 'ต้องการข้อมูล/เอกสารเพิ่มเติม',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ/ปฏิเสธ',
  completed: 'ดำเนินการเสร็จสิ้น',
  closed: 'ปิดงาน'
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'ต่ำ (Low)',
  medium: 'ปานกลาง (Medium)',
  high: 'สูง (High)',
  urgent: 'ด่วนที่สุด (Urgent)',
  normal: 'ปกติ',
  very_urgent: 'ด่วนที่สุด'
};

export interface FilterSummaryOptions {
  statusFilter?: string;
  priorityFilter?: string;
  categoryFilter?: string;
  topicFilter?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  timeRangeLabel?: string;
  totalCount?: number;
  officerName?: string;
  customTitle?: string;
  filenamePrefix?: string;
}

export interface ExportOptions {
  filenamePrefix?: string;
  format?: 'csv' | 'xlsx';
  includeOfficerNotes?: boolean;
  includeDynamicFields?: boolean;
  includeAppointments?: boolean;
  includeAiTags?: boolean;
  includeFeedback?: boolean;
  filterSummary?: FilterSummaryOptions;
}

const escapeCsvCell = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return `"${str}"`;
};

const formatDetails = (details: Record<string, any> | undefined): string => {
  if (!details || Object.keys(details).length === 0) return '-';
  return Object.entries(details)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' | ');
};

/**
 * Standard comprehensive CSV export for all requests
 */
export function exportRequestsToCsv(
  requests: RequestItem[], 
  filenamePrefix: string = 'รายงานคำร้อง_CCTV_Export',
  options: ExportOptions = {}
) {
  if (!requests || requests.length === 0) {
    alert('ไม่มีข้อมูลคำร้องสำหรับส่งออก');
    return;
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const headers = [
    'ลำดับ (No.)',
    'รหัสติดตาม (Tracking ID)',
    'วันที่ยื่นคำร้อง (Submission Date)',
    'หมวดหมู่คำร้อง (Category)',
    'หัวข้อคำร้อง (Request Title)',
    'วัตถุประสงค์และเหตุผล (Purpose & Description)',
    'จุดเกิดเหตุ/พิกัดกล้อง CCTV (Camera Location)',
    'วันและเวลาที่เกิดเหตุ (Incident Date & Time)',
    'เลขที่บันทึกประจำวัน/คดี (Police Report No.)',
    'หมวดหมู่ AI Auto-Tag (AI Classification)',
    'ผู้ยื่นคำร้อง (Applicant Name)',
    'เลขประจำตัวประชาชน/รหัส (Citizen ID / Code)',
    'ตำแหน่ง/ประเภทผู้ยื่น (Position / Role)',
    'หน่วยงาน/สังกัด (Department)',
    'เบอร์โทรศัพท์ (Phone)',
    'อีเมล (Email)',
    'สถานะคำร้อง (Status)',
    'ระดับความเร่งด่วน (Urgency Level)',
    'เจ้าหน้าที่ผู้รับเรื่อง (Assigned Officer)',
    'ผลตรวจก่อนเสนอ (Pre-Review Inspection)',
    'การนัดหมายรับภาพ/ตรวจสอบ (Handover Appointment)',
    'ระยะเวลาดำเนินการ (วัน) (Turnaround SLA Days)',
    'จำนวนหลักฐานแนบ (Attachment Count)',
    'ประเภทหลักฐานแนบ (Attachment Types)',
    'หมายเหตุเจ้าหน้าที่ (Officer Decision Notes)',
    'คะแนนความพึงพอใจ (Feedback Rating)',
    'ข้อเสนอแนะประชาชน (Citizen Feedback)',
    'ปรับปรุงล่าสุด (Last Updated Date)',
    'สถานะการซิงค์ (Sync Status)'
  ];

  const rows = requests.map((req, idx) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;
    const createdD = req.createdAt ? new Date(req.createdAt) : new Date();
    const updatedD = req.updatedAt ? new Date(req.updatedAt) : createdD;
    const createdDate = req.createdAt ? createdD.toLocaleString('th-TH') : '';
    const updatedDate = req.updatedAt ? updatedD.toLocaleString('th-TH') : '';
    const attachmentCount = req.attachments ? req.attachments.length : 0;

    // AI tags
    const aiTag = req.aiAutoTags?.primaryTopic || req.aiAutoTags?.topics?.join(', ') || '-';

    // Location & Time
    const location = req.details?.cctvLocation || req.details?.cameraLocation || req.details?.location || req.details?.copyLocation || req.location || '-';
    const incidentDateTime = req.details?.incidentDate 
      ? `${req.details.incidentDate} ${req.details.incidentTime || ''}`.trim()
      : (req.details?.copyDate ? `${req.details.copyDate} ${req.details.copyTime || ''}`.trim() : '-');

    // Police report
    const policeReportNo = req.details?.policeReportNumber || req.details?.policeReportNo || req.details?.policeStation || req.details?.reportNo || '-';

    // SLA turnaround
    const diffMs = updatedD.getTime() - createdD.getTime();
    const turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // Attachments summary
    const attTypes = req.attachments && req.attachments.length > 0
      ? Array.from(new Set(req.attachments.map(a => a.documentCategory || a.type))).join('; ')
      : '-';

    // Pre review
    const preReview = req.preReviewCheck ? `ผลตรวจ: ${req.preReviewCheck.resultStatus} (โดย ${req.preReviewCheck.verifiedByOfficer || '-'})` : '-';
    
    // Feedback
    const feedbackRating = req.feedback ? `${req.feedback.rating}/5 ดาว` : 'ยังไม่ประเมิน';
    const feedbackComment = req.feedback?.comment || '-';

    // Sync status
    const syncStatus = req.isPendingSync ? 'รอซิงค์ข้อมูล (Pending Sync)' : 'ซิงค์เรียบร้อย (Synced)';

    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.date || req.appointment.appointmentDate || ''} ${req.appointment.time || req.appointment.appointmentTime || ''} (${req.appointment.location})`;
    }

    return [
      escapeCsvCell(idx + 1),
      escapeCsvCell(req.id),
      escapeCsvCell(createdDate),
      escapeCsvCell(categoryName),
      escapeCsvCell(req.title),
      escapeCsvCell(req.reason || '-'),
      escapeCsvCell(location),
      escapeCsvCell(incidentDateTime),
      escapeCsvCell(policeReportNo ? `'${policeReportNo}` : '-'),
      escapeCsvCell(aiTag),
      escapeCsvCell(`${req.applicant?.prefix || ''}${req.applicant?.fullName || '-'}`.trim()),
      escapeCsvCell(req.applicant?.citizenIdOrCode ? `'${req.applicant.citizenIdOrCode}` : '-'),
      escapeCsvCell(req.applicant?.positionOrMajor || req.applicant?.department || '-'),
      escapeCsvCell(req.applicant?.department || '-'),
      escapeCsvCell(req.applicant?.phone ? `'${req.applicant.phone}` : '-'),
      escapeCsvCell(req.applicant?.email || '-'),
      escapeCsvCell(statusName),
      escapeCsvCell(priorityName),
      escapeCsvCell(req.assignedOfficer || '-'),
      escapeCsvCell(preReview),
      escapeCsvCell(appointmentStr),
      escapeCsvCell(turnaroundDays),
      escapeCsvCell(attachmentCount),
      escapeCsvCell(attTypes),
      escapeCsvCell(req.officerNotes || '-'),
      escapeCsvCell(feedbackRating),
      escapeCsvCell(feedbackComment),
      escapeCsvCell(updatedDate),
      escapeCsvCell(syncStatus)
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Microsoft Excel & Google Sheets display Thai font properly
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Specialized CSV export for Offline Incident Trends & Analytics Reporting
 * Formatted with pivotable dimensions (Quarter, Month, Year, Incident Type, Location Zone, SLA Days)
 */
export function exportIncidentTrendsToCsv(
  requests: RequestItem[],
  filenamePrefix: string = 'รายงานวิเคราะห์แนวโน้มเหตุการณ์_Incident_Trends_Analysis'
) {
  if (!requests || requests.length === 0) {
    alert('ไม่มีข้อมูลคำร้องสำหรับส่งออกรายงานวิเคราะห์แนวโน้ม');
    return;
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const headers = [
    'ลำดับ (No.)',
    'รหัสติดตามคำร้อง (Tracking ID)',
    'หัวข้อเหตุการณ์/คำร้อง (Incident Title)',
    'หมวดหมู่คำร้อง (Category)',
    'หมวดหมู่แนวโน้ม AI (AI Incident Topic)',
    'ความเชื่อมั่น AI (AI Confidence %)',
    'จุดเกิดเหตุ/พิกัดกล้อง (Incident & Camera Location)',
    'วันและเวลาที่เกิดเหตุ (Incident Occurrence Date & Time)',
    'วัตถุประสงค์และเหตุผล (Purpose & Description)',
    'ระดับความเร่งด่วน (Urgency)',
    'สถานะปัจจุบัน (Current Status)',
    'ไตรมาส (Quarter)',
    'เดือนที่ยื่น (Submission Month)',
    'ปี พ.ศ. ที่ยื่น (Year BE)',
    'วันที่ยื่นคำร้อง (Submission Date)',
    'วันที่อัปเดต/เสร็จสิ้น (Last Update Date)',
    'ระยะเวลาดำเนินการ (วัน) (Turnaround Days)',
    'ผู้ยื่นคำร้อง (Applicant Name)',
    'ประเภท/สังกัดผู้ยื่น (User Role & Department)',
    'เบอร์โทรศัพท์ (Phone)',
    'อีเมล (Email)',
    'จำนวนหลักฐานแนบ (Attachment Count)',
    'หมวดหมู่หลักฐานแนบ (Document Categories)',
    'ผลตรวจความถูกต้องก่อนเสนอ (Pre-Review Inspection)',
    'เจ้าหน้าที่ผู้รับผิดชอบ (Assigned Officer)',
    'บันทึกผลการพิจารณา (Officer Decision Notes)',
    'การนัดหมายส่งมอบภาพ (Scheduled Handover)',
    'คะแนนประเมินความพึงพอใจ (Satisfaction Rating)',
    'ข้อเสนอแนะของผู้ยื่น (Citizen Feedback)'
  ];

  const rows = requests.map((req, idx) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;
    
    // Date dimensions for time-series and trend pivot tables
    const createdD = req.createdAt ? new Date(req.createdAt) : new Date();
    const updatedD = req.updatedAt ? new Date(req.updatedAt) : createdD;

    const monthNum = createdD.getMonth() + 1;
    const yearTh = createdD.getFullYear() + 543;
    const monthThNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const monthLabel = `${monthThNames[createdD.getMonth()]} ${yearTh}`;

    let qCode = 'Q1';
    if (monthNum >= 4 && monthNum <= 6) qCode = 'Q2';
    else if (monthNum >= 7 && monthNum <= 9) qCode = 'Q3';
    else if (monthNum >= 10 && monthNum <= 12) qCode = 'Q4';
    const quarterTag = `${qCode}/${yearTh}`;

    // Calculate turnaround days
    const diffMs = updatedD.getTime() - createdD.getTime();
    const turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    // AI Topic & Confidence
    const aiTopic = req.aiAutoTags?.primaryTopic || (req.aiAutoTags?.topics && req.aiAutoTags.topics[0]) || 'General Incident';
    const aiConfidence = req.aiAutoTags?.confidence ? `${Math.round(req.aiAutoTags.confidence * 100)}%` : '-';

    // Location & Time
    const location = req.details?.cctvLocation || req.details?.cameraLocation || req.details?.location || req.details?.copyLocation || '-';
    const incidentDateTime = req.details?.incidentDate 
      ? `${req.details.incidentDate} ${req.details.incidentTime || ''}`.trim()
      : (req.details?.copyDate ? `${req.details.copyDate} ${req.details.copyTime || ''}`.trim() : '-');

    // Attachments
    const attCount = req.attachments ? req.attachments.length : 0;
    const attCategories = req.attachments && req.attachments.length > 0
      ? Array.from(new Set(req.attachments.map(a => a.documentCategory || a.type))).join(', ')
      : '-';

    // Pre-review status
    let preReviewStr = '-';
    if (req.preReviewCheck) {
      preReviewStr = req.preReviewCheck.resultStatus === 'passed' ? 'ผ่านการตรวจสอบ' :
        req.preReviewCheck.resultStatus === 'pending_fix' ? 'รอแก้ไขเอกสาร' :
        req.preReviewCheck.resultStatus === 'rejected' ? 'ไม่ผ่านเกณฑ์' : 'ยังไม่ตรวจ';
    }

    // Appointment
    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.date || req.appointment.appointmentDate || ''} ${req.appointment.time || req.appointment.appointmentTime || ''} (${req.appointment.location})`;
    }

    // Feedback
    const ratingVal = req.feedback?.rating ? `${req.feedback.rating}/5` : '-';
    const feedbackComment = req.feedback?.comment || '-';

    return [
      escapeCsvCell(idx + 1),
      escapeCsvCell(req.id),
      escapeCsvCell(req.title),
      escapeCsvCell(categoryName),
      escapeCsvCell(aiTopic),
      escapeCsvCell(aiConfidence),
      escapeCsvCell(location),
      escapeCsvCell(incidentDateTime),
      escapeCsvCell(req.reason || '-'),
      escapeCsvCell(priorityName),
      escapeCsvCell(statusName),
      escapeCsvCell(quarterTag),
      escapeCsvCell(monthLabel),
      escapeCsvCell(yearTh),
      escapeCsvCell(createdD.toLocaleString('th-TH')),
      escapeCsvCell(updatedD.toLocaleString('th-TH')),
      escapeCsvCell(turnaroundDays),
      escapeCsvCell(`${req.applicant?.prefix || ''}${req.applicant?.fullName || '-'}`.trim()),
      escapeCsvCell(`${req.applicant?.positionOrMajor || '-'} / ${req.applicant?.department || '-'}`),
      escapeCsvCell(req.applicant?.phone ? `'${req.applicant.phone}` : '-'),
      escapeCsvCell(req.applicant?.email || '-'),
      escapeCsvCell(attCount),
      escapeCsvCell(attCategories),
      escapeCsvCell(preReviewStr),
      escapeCsvCell(req.assignedOfficer || '-'),
      escapeCsvCell(req.officerNotes || '-'),
      escapeCsvCell(appointmentStr),
      escapeCsvCell(ratingVal),
      escapeCsvCell(feedbackComment)
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) for Excel & Sheets Thai font compatibility
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${todayStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRequestsToExcel(
  requests: RequestItem[],
  filenamePrefix: string = 'รายงานคำร้อง_CCTV_Excel',
  options: ExportOptions = {}
) {
  if (!requests || requests.length === 0) {
    alert('ไม่มีข้อมูลคำร้องสำหรับส่งออก');
    return;
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const todayStr = new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const filterSummary = options.filterSummary;
  const officerName = filterSummary?.officerName || 'เจ้าหน้าที่ศูนย์กล้อง CCTV';

  // Metrics for report header summary
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const underReviewCount = requests.filter(r => r.status === 'under_review' || r.status === 'submitted').length;
  const actionRequiredCount = requests.filter(r => r.status === 'action_required').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const rowsHtml = requests.map((req, idx) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;
    const createdD = req.createdAt ? new Date(req.createdAt) : new Date();
    const updatedD = req.updatedAt ? new Date(req.updatedAt) : createdD;
    const createdDate = req.createdAt ? createdD.toLocaleString('th-TH') : '';
    const updatedDate = req.updatedAt ? updatedD.toLocaleString('th-TH') : '';
    const attachmentCount = req.attachments ? req.attachments.length : 0;
    const aiTopic = req.aiAutoTags?.primaryTopic || req.aiAutoTags?.topics?.join(', ') || '-';
    const location = req.details?.cctvLocation || req.details?.cameraLocation || req.details?.location || req.details?.copyLocation || req.location || '-';

    const incidentDateTime = req.details?.incidentDate 
      ? `${req.details.incidentDate} ${req.details.incidentTime || ''}`.trim()
      : (req.details?.copyDate ? `${req.details.copyDate} ${req.details.copyTime || ''}`.trim() : '-');

    const policeReportNo = req.details?.policeReportNumber || req.details?.policeReportNo || req.details?.policeStation || req.details?.reportNo || '-';

    const diffMs = updatedD.getTime() - createdD.getTime();
    const turnaroundDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const attTypes = req.attachments && req.attachments.length > 0
      ? Array.from(new Set(req.attachments.map(a => a.documentCategory || a.type))).join('; ')
      : '-';

    const preReview = req.preReviewCheck 
      ? `ผลตรวจ: ${req.preReviewCheck.resultStatus} (${req.preReviewCheck.verifiedByOfficer || '-'})` 
      : '-';

    const feedbackRating = req.feedback ? `${req.feedback.rating}/5 ดาว` : 'ยังไม่ประเมิน';
    const feedbackComment = req.feedback?.comment || '-';
    const syncStatus = req.isPendingSync ? 'รอซิงค์ข้อมูล (Pending Sync)' : 'ซิงค์เรียบร้อย (Synced)';

    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.date || req.appointment.appointmentDate || ''} ${req.appointment.time || req.appointment.appointmentTime || ''} (${req.appointment.location})`;
    }

    let statusBg = '#f1f5f9';
    let statusColor = '#334155';
    if (req.status === 'approved' || req.status === 'completed') {
      statusBg = '#d1fae5';
      statusColor = '#065f46';
    } else if (req.status === 'rejected') {
      statusBg = '#ffe4e6';
      statusColor = '#9f1239';
    } else if (req.status === 'under_review' || req.status === 'submitted') {
      statusBg = '#fef3c7';
      statusColor = '#92400e';
    } else if (req.status === 'action_required') {
      statusBg = '#f3e8ff';
      statusColor = '#6b21a8';
    }

    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background-color: ${rowBg};">
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="font-weight:bold; font-family:monospace; color:#0f172a; padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\\@';">${req.id}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${createdDate}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${categoryName}</td>
        <td style="font-weight:bold; padding: 6px; border: 1px solid #cbd5e1;">${req.title}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${req.reason || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${location}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${incidentDateTime}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\\@';">${policeReportNo}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; color:#4338ca; font-weight:600;">${aiTopic}</td>
        <td style="font-weight:600; padding: 6px; border: 1px solid #cbd5e1;">${req.applicant?.prefix || ''}${req.applicant?.fullName || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\\@';">${req.applicant?.citizenIdOrCode || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${req.applicant?.positionOrMajor || req.applicant?.department || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${req.applicant?.department || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; mso-number-format:'\\@';">${req.applicant?.phone || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${req.applicant?.email || '-'}</td>
        <td style="background-color:${statusBg}; color:${statusColor}; font-weight:bold; text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${statusName}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${priorityName}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${req.assignedOfficer || '-'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${preReview}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${appointmentStr}</td>
        <td style="text-align:center; font-weight:bold; padding: 6px; border: 1px solid #cbd5e1;">${turnaroundDays}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${attachmentCount}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; font-size:11px;">${attTypes}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; color:#334155;">${req.officerNotes || '-'}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${feedbackRating}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${feedbackComment}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${updatedDate}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1;">${syncStatus}</td>
      </tr>
    `;
  }).join('');

  // Filter description string
  const categoryTitleMap: Record<string, string> = {
    cctv: 'กล้องวงจรปิด CCTV',
    certificate: 'หนังสือรับรองราชการ',
    maintenance: 'แจ้งซ่อมบำรุง/อุปกรณ์',
    leave: 'การลา/ปฏิบัติราชการ',
    budget: 'ขออนุมัติงบประมาณ',
    general: 'คำร้องทั่วไป/บริการอื่น'
  };

  const filterDesc = [
    filterSummary?.categoryFilter && filterSummary.categoryFilter !== 'all' 
      ? `หมวดหมู่: ${categoryTitleMap[filterSummary.categoryFilter] || filterSummary.categoryFilter}` 
      : null,
    filterSummary?.statusFilter && filterSummary.statusFilter !== 'all' 
      ? `สถานะ: ${STATUS_LABELS[filterSummary.statusFilter] || filterSummary.statusFilter}` 
      : null,
    filterSummary?.priorityFilter && filterSummary.priorityFilter !== 'all' 
      ? `ความเร่งด่วน: ${PRIORITY_LABELS[filterSummary.priorityFilter] || filterSummary.priorityFilter}` 
      : null,
    filterSummary?.topicFilter && filterSummary.topicFilter !== 'all' 
      ? `หมวดหมู่ AI: ${filterSummary.topicFilter}` 
      : null,
    filterSummary?.searchTerm ? `คำค้นหา: "${filterSummary.searchTerm}"` : null,
    filterSummary?.timeRangeLabel ? `ช่วงเวลา: ${filterSummary.timeRangeLabel}` : null,
    filterSummary?.startDate || filterSummary?.endDate 
      ? `ช่วงวันที่: ${filterSummary.startDate || 'แรกเริ่ม'} ถึง ${filterSummary.endDate || 'ปัจจุบัน'}` 
      : null
  ].filter(Boolean).join(' | ') || 'แสดงข้อมูลคำร้องทั้งหมด';

  const mainHeaderTitle = filterSummary?.customTitle || 'ศูนย์บริหารจัดการระบบงานสารบรรณและคำร้องอิเล็กทรอนิกส์ (e-Service & CCTV Portal)';
  const subHeaderTitle = filterSummary?.categoryFilter && filterSummary.categoryFilter !== 'all'
    ? `รายงานสรุปรายการคำร้อง - หมวด${categoryTitleMap[filterSummary.categoryFilter] || filterSummary.categoryFilter} (${requests.length} รายการ)`
    : 'รายงานสรุปรายการคำร้องและการปฏิบัติงานทางราชการ (Official Request Logs Report)';

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>รายงานคำร้อง_Filtered</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Sarabun', 'Segoe UI', 'Tahoma', sans-serif; }
        .header-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
        .header-subtitle { font-size: 13px; font-weight: bold; color: #0284c7; margin-bottom: 6px; }
        .meta-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 14px; font-size: 12px; }
        .summary-card { font-weight: bold; padding: 4px 8px; border: 1px solid #94a3b8; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px; text-align: center; }
        td { vertical-align: top; }
      </style>
    </head>
    <body>
      <div class="header-title">${mainHeaderTitle}</div>
      <div class="header-subtitle">${subHeaderTitle}</div>
      
      <div class="meta-box">
        <strong>วันที่และเวลาส่งออกรายงาน:</strong> ${todayStr} &nbsp;|&nbsp; 
        <strong>ผู้ออกรายงาน:</strong> ${officerName} &nbsp;|&nbsp; 
        <strong>จำนวนรายการที่กรองได้:</strong> <span style="color:#0284c7; font-size:14px; font-weight:bold;">${requests.length}</span> รายการ 
        ${filterSummary?.totalCount ? ` (จากทั้งหมด ${filterSummary.totalCount} รายการในระบบ)` : ''}
        <br/>
        <strong>เงื่อนไขการกรอง (Applied Filters):</strong> ${filterDesc}
        <br/>
        <strong>สรุปสถานะรายการที่กรอง:</strong> 
        อนุมัติ/เสร็จสิ้น: <span style="color:#065f46; font-weight:bold;">${approvedCount}</span> รายการ | 
        อยู่ระหว่างตรวจสอบ: <span style="color:#92400e; font-weight:bold;">${underReviewCount}</span> รายการ | 
        ต้องการข้อมูลเพิ่ม: <span style="color:#6b21a8; font-weight:bold;">${actionRequiredCount}</span> รายการ | 
        ไม่อนุมัติ: <span style="color:#9f1239; font-weight:bold;">${rejectedCount}</span> รายการ
      </div>

      <table>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>Tracking ID</th>
            <th>วันที่ยื่นเรื่อง</th>
            <th>หมวดหมู่คำร้อง</th>
            <th>หัวข้อคำร้อง</th>
            <th>วัตถุประสงค์/เหตุผล</th>
            <th>จุดติดตั้ง/พิกัดกล้อง CCTV</th>
            <th>วันและเวลาเกิดเหตุ</th>
            <th>เลขที่บันทึกประจำวัน/คดี</th>
            <th>หมวดหมู่ AI</th>
            <th>ผู้ยื่นคำร้อง</th>
            <th>เลขประจำตัวประชาชน/รหัส</th>
            <th>ตำแหน่ง/ประเภท</th>
            <th>หน่วยงาน/สังกัด</th>
            <th>เบอร์โทรศัพท์</th>
            <th>อีเมล</th>
            <th>สถานะคำร้อง</th>
            <th>ระดับความเร่งด่วน</th>
            <th>เจ้าหน้าที่ผู้รับเรื่อง</th>
            <th>ผลตรวจก่อนเสนอ (Pre-Review)</th>
            <th>นัดหมายรับภาพ/ตรวจสอบ</th>
            <th>ระยะเวลาดำเนินการ (วัน)</th>
            <th>จำนวนไฟล์แนบ</th>
            <th>ประเภทหลักฐานแนบ</th>
            <th>หมายเหตุเจ้าหน้าที่</th>
            <th>คะแนนประเมิน</th>
            <th>ข้อเสนอแนะ</th>
            <th>ปรับปรุงล่าสุด</th>
            <th>สถานะซิงค์</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const fileDate = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${fileDate}.xlsx`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Dedicated helper to export the current filtered list of CCTV requests to Excel (.xlsx)
 */
export function exportFilteredCctvRequestsToExcel(
  requests: RequestItem[],
  filterSummary?: FilterSummaryOptions
) {
  const prefix = filterSummary?.filenamePrefix || 'รายงานคำร้อง_CCTV_Filtered_Excel';
  exportRequestsToExcel(requests, prefix, { filterSummary });
}

/**
 * Dedicated helper to export the current filtered list of CCTV requests to CSV (.csv)
 */
export function exportFilteredCctvRequestsToCsv(
  requests: RequestItem[],
  filterSummary?: FilterSummaryOptions
) {
  const prefix = filterSummary?.filenamePrefix || 'รายงานคำร้อง_CCTV_Filtered_CSV';
  exportRequestsToCsv(requests, prefix, { filterSummary });
}

/**
 * General helper to export any filtered list of requests (by date-range, category, status) to Excel (.xlsx)
 */
export function exportFilteredRequestsToExcel(
  requests: RequestItem[],
  filterSummary?: FilterSummaryOptions
) {
  const prefix = filterSummary?.filenamePrefix || 'รายงานคำร้อง_Filtered_Excel';
  exportRequestsToExcel(requests, prefix, { filterSummary });
}

/**
 * General helper to export any filtered list of requests (by date-range, category, status) to CSV (.csv)
 */
export function exportFilteredRequestsToCsv(
  requests: RequestItem[],
  filterSummary?: FilterSummaryOptions
) {
  const prefix = filterSummary?.filenamePrefix || 'รายงานคำร้อง_Filtered_CSV';
  exportRequestsToCsv(requests, prefix, { filterSummary });
}

/**
 * Export CCTV requests specially structured for quarterly municipal reporting in CSV format
 */
export function exportQuarterlyCctvRequestsToCsv(
  requests: RequestItem[],
  quarterLabel: string = 'สรุปรายไตรมาส',
  filenamePrefix: string = 'รายงานสรุปคำร้อง_CCTV_ประจำไตรมาส'
) {
  if (!requests || requests.length === 0) {
    alert('ไม่มีข้อมูลคำร้องสำหรับส่งออกรายงานประจำไตรมาส');
    return;
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const headers = [
    'ลำดับ',
    'ไตรมาส/งวดงาน',
    'รหัสติดตาม (Tracking ID)',
    'หมวดหมู่คำร้อง',
    'หัวข้อคำร้อง (CCTV Request Title)',
    'หมวดหมู่ AI Auto-Tag',
    'ชื่อ-นามสกุล ผู้ยื่นคำร้อง',
    'ตำแหน่ง/ประเภทผู้ยื่น',
    'หน่วยงาน/สังกัด',
    'เบอร์โทรศัพท์ติดต่อ',
    'อีเมล',
    'สถานะคำร้อง',
    'ระดับความเร่งด่วน',
    'สถานที่/โซนกล้องวงจรปิด',
    'เจ้าหน้าที่ผู้รับเรื่อง/พิจารณา',
    'จำนวนไฟล์แนบหลักฐาน',
    'วันเวลาที่นัดหมาย',
    'บันทึกผลการพิจารณา/หมายเหตุเจ้าหน้าที่',
    'วันที่ยื่นเรื่อง',
    'วันที่อัปเดตล่าสุด',
    'วัตถุประสงค์/เหตุผลการขอดูภาพ CCTV'
  ];

  const rows = requests.map((req, idx) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;
    
    const d = new Date(req.createdAt);
    const month = d.getMonth() + 1;
    const yearTh = d.getFullYear() + 543;
    let qCode = 'Q1';
    if (month >= 4 && month <= 6) qCode = 'Q2';
    else if (month >= 7 && month <= 9) qCode = 'Q3';
    else if (month >= 10 && month <= 12) qCode = 'Q4';

    const reqQuarterTag = `${qCode}/${yearTh}`;

    const createdDate = req.createdAt ? new Date(req.createdAt).toLocaleString('th-TH') : '';
    const updatedDate = req.updatedAt ? new Date(req.updatedAt).toLocaleString('th-TH') : '';
    const attachmentCount = req.attachments ? req.attachments.length : 0;
    
    const cameraLoc = req.details?.cameraLocation || req.details?.cctvLocation || req.details?.location || req.location || '-';
    const aiTopic = req.aiAutoTags?.primaryTopic || '-';

    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.date || req.appointment.appointmentDate || ''} ${req.appointment.time || req.appointment.appointmentTime || ''} (${req.appointment.location})`;
    }

    return [
      escapeCsvCell(idx + 1),
      escapeCsvCell(reqQuarterTag),
      escapeCsvCell(req.id),
      escapeCsvCell(categoryName),
      escapeCsvCell(req.title),
      escapeCsvCell(aiTopic),
      escapeCsvCell(`${req.applicant.prefix || ''}${req.applicant.fullName || ''}`.trim()),
      escapeCsvCell(req.applicant.positionOrMajor || req.applicant.department || '-'),
      escapeCsvCell(req.applicant.department || '-'),
      escapeCsvCell(req.applicant.phone ? `'${req.applicant.phone}` : '-'),
      escapeCsvCell(req.applicant.email || '-'),
      escapeCsvCell(statusName),
      escapeCsvCell(priorityName),
      escapeCsvCell(cameraLoc),
      escapeCsvCell(req.assignedOfficer || '-'),
      escapeCsvCell(attachmentCount),
      escapeCsvCell(appointmentStr),
      escapeCsvCell(req.officerNotes || '-'),
      escapeCsvCell(createdDate),
      escapeCsvCell(updatedDate),
      escapeCsvCell(req.reason || '-')
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Microsoft Excel & Google Sheets display Thai font properly
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = `${filenamePrefix}_${quarterLabel}_${todayStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CctvMonthlyExportOptions {
  monthName?: string;
  monthNumber?: number; // 1-12 or 0 for all
  yearTh?: number;
  officerName?: string;
  includeRecordKeepingAudit?: boolean;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Export CCTV requests specially tailored for municipal monthly reporting and permanent record keeping.
 */
export function exportMonthlyCctvRequestsToCsv(
  requests: RequestItem[],
  monthYearLabel: string = 'สรุปประจำเดือน',
  filenamePrefix: string = 'รายงานสรุปคำร้อง_CCTV_ประจำเดือน',
  options: CctvMonthlyExportOptions = {}
) {
  if (!requests || requests.length === 0) {
    alert('ไม่มีข้อมูลคำร้อง CCTV สำหรับส่งออกรายงานประจำเดือน');
    return;
  }

  const categoryMap = new Map(
    REQUEST_CATEGORIES.map((c) => [c.id, c.titleTh])
  );

  const headers = [
    'ลำดับที่',
    'เลขที่คำร้อง (Tracking ID)',
    'ประจำงวด (เดือน/ปี พ.ศ.)',
    'วันเวลาที่ยื่นคำร้อง',
    'หมวดหมู่คำร้อง',
    'หัวข้อคำร้องขอดูภาพ CCTV',
    'วัตถุประสงค์และความจำเป็น',
    'สถานที่/จุดติดตั้งกล้องวงจรปิด',
    'วันและช่วงเวลาเกิดเหตุ',
    'ชื่อ-นามสกุล ผู้ยื่นคำร้อง',
    'เลขประจำตัวประชาชน/รหัส',
    'ประเภทผู้ยื่น/ตำแหน่ง',
    'หน่วยงาน/สังกัด/ชุมชน',
    'เบอร์โทรศัพท์ติดต่อ',
    'อีเมล',
    'สถานะคำร้อง',
    'ระดับความเร่งด่วน',
    'เจ้าหน้าที่ผู้รับผิดชอบ',
    'การนัดหมายตรวจสอบ/รับภาพ',
    'จำนวนเอกสาร/หลักฐานแนบ',
    'หมวดหมู่งานอัตโนมัติ (AI Topic)',
    'ผลการกลั่นกรอง 5 มิติ (Audit Status)',
    'สถานะลงลายมือชื่อดิจิทัล',
    'ผลการประเมินความพึงพอใจ',
    'ข้อคิดเห็น/หมายเหตุเจ้าหน้าที่',
    'การยืนยันตัวตน Google / Firebase UID',
    'ปรับปรุงข้อมูลล่าสุด',
    'เจ้าหน้าที่ผู้ส่งออกรายงาน'
  ];

  const officerName = options.officerName || 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV เทศบาลเมืองชัยภูมิ';

  const rows = requests.map((req, idx) => {
    const categoryName = categoryMap.get(req.category as any) || req.category;
    const statusName = STATUS_LABELS[req.status] || req.status;
    const priorityName = PRIORITY_LABELS[req.priority] || req.priority;

    const d = new Date(req.createdAt);
    const mIndex = d.getMonth();
    const yearTh = d.getFullYear() + 543;
    const periodLabel = `${THAI_MONTH_NAMES[mIndex]} ${yearTh}`;

    const createdDate = req.createdAt ? new Date(req.createdAt).toLocaleString('th-TH') : '';
    const updatedDate = req.updatedAt ? new Date(req.updatedAt).toLocaleString('th-TH') : '';
    const attachmentCount = req.attachments ? req.attachments.length : 0;

    const cameraLoc = req.details?.cameraLocation || req.details?.cctvLocation || req.details?.location || req.location || '-';
    const incidentDateTime = req.details?.incidentTime 
      ? `${req.details?.incidentDate || ''} เวลา ${req.details?.incidentTime}` 
      : (req.details?.incidentDate || '-');

    const aiTopic = req.aiAutoTags?.primaryTopic || '-';

    let appointmentStr = '-';
    if (req.appointment) {
      appointmentStr = `${req.appointment.date || req.appointment.appointmentDate || ''} ${req.appointment.time || req.appointment.appointmentTime || ''} (${req.appointment.location || 'ศูนย์ควบคุม CCTV'})`;
    }

    // 5-Pillar Audit Status
    let auditStatusStr = 'ยังไม่ตรวจกลั่นกรอง';
    if (req.adminAudit) {
      auditStatusStr = `ผ่านการกลั่นกรองแล้ว (${req.adminAudit.auditResult || 'อนุมัติ'}) โดย ${req.adminAudit.adminName || 'Admin'}`;
    } else if ((req as any).adminVerification?.isVerified) {
      auditStatusStr = `ผ่านการกลั่นกรองแล้ว โดย ${(req as any).adminVerification.verifiedBy || 'Admin'}`;
    }

    // Digital signature status
    const signatureStr = (req.signatureDataUrl || (req.applicant as any)?.signature) ? 'ลงลายมือชื่อดิจิทัลแล้ว' : 'ไม่มีลายมือชื่อ';

    // Feedback
    const feedbackStr = req.feedback ? `${req.feedback.rating}/5 คะแนน (${req.feedback.comment || 'ไม่มีข้อคิดเห็นเพิ่มเติม'})` : 'ยังไม่ประเมิน';

    // Google / Firebase UID
    const authUserStr = req.isGoogleVerified ? `Google Verified (${req.userEmail || req.userId || 'ยืนยันแล้ว'})` : (req.userId ? `UID: ${req.userId}` : 'ไม่ได้ยืนยันด้วยบัญชี Google');

    return [
      escapeCsvCell(idx + 1),
      escapeCsvCell(req.id),
      escapeCsvCell(periodLabel),
      escapeCsvCell(createdDate),
      escapeCsvCell(categoryName),
      escapeCsvCell(req.title),
      escapeCsvCell(req.reason || '-'),
      escapeCsvCell(cameraLoc),
      escapeCsvCell(incidentDateTime),
      escapeCsvCell(`${req.applicant.prefix || ''}${req.applicant.fullName || ''}`.trim()),
      escapeCsvCell(req.applicant.idCard ? `'${req.applicant.idCard}` : '-'),
      escapeCsvCell(req.applicant.positionOrMajor || req.applicant.department || '-'),
      escapeCsvCell(req.applicant.department || '-'),
      escapeCsvCell(req.applicant.phone ? `'${req.applicant.phone}` : '-'),
      escapeCsvCell(req.applicant.email || '-'),
      escapeCsvCell(statusName),
      escapeCsvCell(priorityName),
      escapeCsvCell(req.assignedOfficer || '-'),
      escapeCsvCell(appointmentStr),
      escapeCsvCell(attachmentCount),
      escapeCsvCell(aiTopic),
      escapeCsvCell(auditStatusStr),
      escapeCsvCell(signatureStr),
      escapeCsvCell(feedbackStr),
      escapeCsvCell(req.officerNotes || '-'),
      escapeCsvCell(authUserStr),
      escapeCsvCell(updatedDate),
      escapeCsvCell(officerName)
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Microsoft Excel & Google Sheets display Thai font properly
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const todayStr = new Date().toISOString().split('T')[0];
  const sanitizedLabel = monthYearLabel.replace(/[/\\?%*:|"<>]/g, '_');
  const finalFilename = `${filenamePrefix}_${sanitizedLabel}_${todayStr}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



