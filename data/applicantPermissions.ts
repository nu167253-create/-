import { ApplicantRolePermission } from '../types/permissions';

export const DEFAULT_APPLICANT_PERMISSIONS: ApplicantRolePermission[] = [
  {
    roleId: 'general_public',
    roleTitleTh: 'บุคคลทั่วไป / ประชาชน',
    roleTitleEn: 'General Citizen',
    description: 'สิทธิ์สำหรับประชาชนทั่วไปที่ต้องการยื่นคำร้อง ติดต่อสอบถาม ขอหนังสือรับรอง หรือขอดูภาพ CCTV เทศบาลเมืองชัยภูมิ',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    allowedCategories: ['cctv', 'general', 'certificate'],
    maxPriorityLevel: 'urgent',
    maxFileUploadSizeMB: 10,
    maxAttachmentsCount: 5,
    requireDigitalSignature: false,
    allowSelfCancellation: true,
    canAccessCctvRepair: true,
    canAccessBudgetForms: false,
    allowDraftSaving: true
  },
  {
    roleId: 'student',
    roleTitleTh: 'นักศึกษา / ผู้เรียน',
    roleTitleEn: 'Student',
    description: 'สิทธิ์สำหรับนักศึกษาที่ขอหนังสือรับรองสถานภาพ ขออนุญาตใช้สถานที่ แจ้งซ่อม หรือขอดูภาพ CCTV',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    allowedCategories: ['cctv', 'general', 'certificate', 'maintenance'],
    maxPriorityLevel: 'urgent',
    maxFileUploadSizeMB: 15,
    maxAttachmentsCount: 8,
    requireDigitalSignature: true,
    allowSelfCancellation: true,
    canAccessCctvRepair: true,
    canAccessBudgetForms: false,
    allowDraftSaving: true
  },
  {
    roleId: 'staff',
    roleTitleTh: 'บุคลากร / เจ้าหน้าที่เทศบาล',
    roleTitleEn: 'Staff & Officers',
    description: 'สิทธิ์สำหรับเจ้าหน้าที่เทศบาลเมืองชัยภูมิ ยื่นคำร้องได้ทุกประเภท รวมถึงขอดูภาพ CCTV และงบประมาณ',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    allowedCategories: ['cctv', 'general', 'certificate', 'leave', 'maintenance', 'budget'],
    maxPriorityLevel: 'very_urgent',
    maxFileUploadSizeMB: 50,
    maxAttachmentsCount: 20,
    requireDigitalSignature: true,
    allowSelfCancellation: true,
    canAccessCctvRepair: true,
    canAccessBudgetForms: true,
    allowDraftSaving: true
  },
  {
    roleId: 'external_org',
    roleTitleTh: 'หน่วยงานภายนอก / ตำรวจ / พาร์ทเนอร์',
    roleTitleEn: 'External Agency / Police',
    description: 'สิทธิ์สำหรับเจ้าหน้าที่ตำรวจ หรือหน่วยงานภายนอก ยื่นคำร้องขอภาพ CCTV และติดต่อราชการ',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    allowedCategories: ['cctv', 'general', 'certificate', 'budget'],
    maxPriorityLevel: 'urgent',
    maxFileUploadSizeMB: 25,
    maxAttachmentsCount: 10,
    requireDigitalSignature: true,
    allowSelfCancellation: true,
    canAccessCctvRepair: true,
    canAccessBudgetForms: true,
    allowDraftSaving: true
  }
];
