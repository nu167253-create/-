import { ApproverPersonExtended, ApproverRoleType, ApproverStatus, DEFAULT_APPROVER_PERMISSIONS, ApproverPermissionFlags } from '../types/approver';
import { ApproverPerson, saveApproverRoster } from './storage';

export const STORAGE_KEY_EXTENDED_APPROVERS = 'cctv_approver_roster_extended_v2';

export const INITIAL_DEFAULT_EXTENDED_APPROVERS: ApproverPersonExtended[] = [
  {
    id: 'appr-1',
    name: 'นายสรพงษ์ เทศกิจดี',
    position: 'เจ้าหน้าที่งานสารบรรณ / งานกล้องวงจรปิด',
    department: 'ศูนย์ควบคุมกล้อง CCTV เทศบาลเมืองชัยภูมิ',
    email: 'sarapong.cctv@chaiyaphum.go.th',
    lineId: '@cctv_chaiyaphum',
    phone: '044-811-300',
    level: 1,
    roleType: 'saraban_officer',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๑/๒๕๖๙',
    officialStampName: 'ตราประจำศูนย์ควบคุม CCTV',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'เจ้าหน้าที่รับเรื่อง ตรวจสอบเอกสารเบื้องต้น และลงรับในระบบสารบรรณอิเล็กทรอนิกส์',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: false,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: false,
      canEmergencyApprove: false,
      canAccessHighResFootage: false,
      canDelegateApproval: false,
      canAccessBudgetForms: false,
      canAccessPdpaSensitive: false,
      allowedCategories: ['cctv', 'general', 'maintenance'],
      maxRetentionAccessDays: 30,
      requiresDigitalSignature: true,
      requires2FaOtp: false
    }
  },
  {
    id: 'appr-2',
    name: 'นายวิเชียร ชัยภูมิพัฒนา',
    position: 'หัวหน้าศูนย์ควบคุมกล้องวงจรปิด CCTV',
    department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
    email: 'wichean.cctv@chaiyaphum.go.th',
    lineId: '@wichean_cctv',
    phone: '044-811-301',
    level: 2,
    roleType: 'cctv_supervisor',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๒/๒๕๖๙',
    officialStampName: 'ตราหัวหน้าศูนย์ควบคุม CCTV',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'ตรวจสอบจุดติดตั้งกล้อง วันเวลาเกิดเหตุ และยืนยันความพร้อมของไฟล์บันทึกภาพวิดีโอ',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: false,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: true,
      canEmergencyApprove: true,
      canAccessHighResFootage: true,
      canDelegateApproval: false,
      canAccessBudgetForms: false,
      canAccessPdpaSensitive: true,
      allowedCategories: ['cctv', 'maintenance'],
      maxRetentionAccessDays: 60,
      requiresDigitalSignature: true,
      requires2FaOtp: false
    }
  },
  {
    id: 'appr-3',
    name: 'นางสาวนภา แจ่มใส',
    position: 'หัวหน้าฝ่ายปกครองและงานนิติการ (นิติกร)',
    department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
    email: 'napa.legal@chaiyaphum.go.th',
    lineId: '@napa_legal',
    phone: '044-811-305',
    level: 3,
    roleType: 'legal_officer',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๓/๒๕๖๙',
    officialStampName: 'ตราประทับงานนิติการ เทศบาลเมืองชัยภูมิ',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'ตรวจสอบความชอบด้วยกฎหมาย สิทธิ์ผู้ขอ และความสอดคล้องตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: false,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: true,
      canEmergencyApprove: true,
      canAccessHighResFootage: true,
      canDelegateApproval: true,
      canAccessBudgetForms: false,
      canAccessPdpaSensitive: true,
      allowedCategories: ['cctv', 'general', 'certificate'],
      maxRetentionAccessDays: 90,
      requiresDigitalSignature: true,
      requires2FaOtp: true
    }
  },
  {
    id: 'appr-4',
    name: 'ดร.สมชาย ทรัพย์มั่นคง',
    position: 'ผู้อำนวยการกองช่าง',
    department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
    email: 'somchai.director@chaiyaphum.go.th',
    lineId: '@somchai_cctv',
    phone: '044-811-310',
    level: 4,
    roleType: 'division_director',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๔/๒๕๖๙',
    officialStampName: 'ตราประจำตำแหน่งผู้อำนวยการกองช่าง',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'พิจารณาอนุมัติทางเทคนิคและส่งมอบไฟล์ข้อมูลภาพกล้อง CCTV กรณีขอใช้ในทางราชการและคดีความ',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: true,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: true,
      canEmergencyApprove: true,
      canAccessHighResFootage: true,
      canDelegateApproval: true,
      canAccessBudgetForms: true,
      canAccessPdpaSensitive: true,
      allowedCategories: ['cctv', 'maintenance', 'budget'],
      maxApprovalAmount: 500000,
      maxRetentionAccessDays: 90,
      requiresDigitalSignature: true,
      requires2FaOtp: true
    }
  },
  {
    id: 'appr-5',
    name: 'นายกิตติศักดิ์ บริหารเมือง',
    position: 'ปลัดเทศบาลเมืองชัยภูมิ',
    department: 'สำนักงานปลัดเทศบาล',
    email: 'kittisak.deputy@chaiyaphum.go.th',
    lineId: '@kittisak_city',
    phone: '044-811-315',
    level: 5,
    roleType: 'municipal_clerk',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๕/๒๕๖๙',
    officialStampName: 'ตราประจำตำแหน่งปลัดเทศบาลเมืองชัยภูมิ',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'พิจารณากลั่นกรองและลงนามอนุมัติปฏิบัติราชการแทนนายกเทศมนตรีตามที่ได้รับมอบอำนาจ',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: true,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: true,
      canEmergencyApprove: true,
      canAccessHighResFootage: true,
      canDelegateApproval: true,
      canAccessBudgetForms: true,
      canAccessPdpaSensitive: true,
      allowedCategories: ['cctv', 'general', 'certificate', 'leave', 'maintenance', 'budget'],
      maxApprovalAmount: 2000000,
      maxRetentionAccessDays: 365,
      requiresDigitalSignature: true,
      requires2FaOtp: true
    }
  },
  {
    id: 'appr-6',
    name: 'นายสมพร พัฒนาเมืองชัย',
    position: 'นายกเทศมนตรีเมืองชัยภูมิ',
    department: 'เทศบาลเมืองชัยภูมิ',
    email: 'mayor@chaiyaphum.go.th',
    lineId: '@mayor_chaiyaphum',
    phone: '044-811-320',
    level: 6,
    roleType: 'mayor',
    status: 'active',
    officialOrderNo: 'พระราชบัญญัติเทศบาล พ.ศ. ๒๔๙๖ และที่แก้ไขเพิ่มเติม',
    officialStampName: 'ตราประจำตำแหน่งนายกเทศมนตรีเมืองชัยภูมิ',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    notes: 'ผู้อนุมัติขั้นสูงสุดตามอำนาจหน้าที่แห่งกฎหมายเทศบาลและการรักษาความสงบเรียบร้อยของเมืองชัยภูมิ',
    permissions: {
      ...DEFAULT_APPROVER_PERMISSIONS,
      canFinalApprove: true,
      canPreliminaryReview: true,
      canRequestAmendments: true,
      canReject: true,
      canEmergencyApprove: true,
      canAccessHighResFootage: true,
      canDelegateApproval: true,
      canAccessBudgetForms: true,
      canAccessPdpaSensitive: true,
      allowedCategories: ['cctv', 'general', 'certificate', 'leave', 'maintenance', 'budget'],
      maxApprovalAmount: 0, // ไม่จำกัดวงเงิน
      maxRetentionAccessDays: 365,
      requiresDigitalSignature: true,
      requires2FaOtp: true
    }
  }
];

export function getStoredExtendedApprovers(): ApproverPersonExtended[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXTENDED_APPROVERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse extended approvers from storage:', e);
  }
  return INITIAL_DEFAULT_EXTENDED_APPROVERS;
}

export function saveStoredExtendedApprovers(approvers: ApproverPersonExtended[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXTENDED_APPROVERS, JSON.stringify(approvers));

    // Also sync to legacy roster for backward compatibility
    const legacyRoster: ApproverPerson[] = approvers.map(a => ({
      id: a.id,
      name: a.name,
      position: a.position,
      department: a.department,
      email: a.email,
      lineId: a.lineId,
      phone: a.phone,
      level: a.level
    }));
    saveApproverRoster(legacyRoster);
  } catch (e) {
    console.error('Failed to save extended approvers to storage:', e);
  }
}

export function addExtendedApprover(
  data: Omit<ApproverPersonExtended, 'id' | 'createdAt' | 'updatedAt'>,
  adminName: string
): ApproverPersonExtended {
  const current = getStoredExtendedApprovers();
  const now = new Date().toISOString();
  const newId = `appr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newApprover: ApproverPersonExtended = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
    updatedBy: adminName
  };

  const updated = [...current, newApprover];
  saveStoredExtendedApprovers(updated);
  return newApprover;
}

export function updateExtendedApprover(
  id: string,
  data: Partial<ApproverPersonExtended>,
  adminName: string
): ApproverPersonExtended | null {
  const current = getStoredExtendedApprovers();
  const idx = current.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updatedItem: ApproverPersonExtended = {
    ...current[idx],
    ...data,
    updatedAt: now,
    updatedBy: adminName
  };

  current[idx] = updatedItem;
  saveStoredExtendedApprovers(current);
  return updatedItem;
}

export function deleteExtendedApprover(id: string): boolean {
  const current = getStoredExtendedApprovers();
  const filtered = current.filter(a => a.id !== id);
  if (filtered.length === current.length) return false;

  saveStoredExtendedApprovers(filtered);
  return true;
}

export function toggleApproverStatus(
  id: string,
  newStatus: ApproverStatus,
  adminName: string
): ApproverPersonExtended | null {
  return updateExtendedApprover(id, { status: newStatus }, adminName);
}

export function toggleApproverPermissionFlag(
  id: string,
  flag: keyof ApproverPermissionFlags,
  adminName: string
): ApproverPersonExtended | null {
  const current = getStoredExtendedApprovers();
  const approver = current.find(a => a.id === id);
  if (!approver) return null;

  const currentVal = approver.permissions[flag];
  if (typeof currentVal === 'boolean') {
    const updatedPerms: ApproverPermissionFlags = {
      ...approver.permissions,
      [flag]: !currentVal
    };
    return updateExtendedApprover(id, { permissions: updatedPerms }, adminName);
  }
  return null;
}

export function resetExtendedApproversToDefault(): ApproverPersonExtended[] {
  saveStoredExtendedApprovers(INITIAL_DEFAULT_EXTENDED_APPROVERS);
  return INITIAL_DEFAULT_EXTENDED_APPROVERS;
}
