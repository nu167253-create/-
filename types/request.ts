export type AutoTagTopic = 
  | 'Maintenance'
  | 'Access Request'
  | 'Privacy Concern'
  | 'Traffic & Safety'
  | 'Property Damage / Theft'
  | 'General Inquiry';

export interface AiAutoTagResult {
  topics: AutoTagTopic[];
  primaryTopic: AutoTagTopic;
  confidence: number; // 0.0 - 1.0
  reasoning?: string;
  autoTaggedAt: string;
}

export type RequestCategory = 'cctv' | 'general' | 'certificate' | 'leave' | 'maintenance' | 'budget';

export type RequestStatus = 
  | 'draft'
  | 'submitted'      // ยื่นคำร้องแล้ว
  | 'under_review'   // อยู่ระหว่างตรวจสอบ
  | 'action_required'// ต้องการข้อมูลเพิ่มเติม
  | 'approved'       // อนุมัติแล้ว
  | 'rejected'       // ไม่อนุมัติ / สั่งตก
  | 'completed'      // ดำเนินการเสร็จสิ้น
  | 'closed';        // ปิดงาน / ดำเนินการเสร็จสิ้นแล้ว

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent' | 'normal' | 'very_urgent' | 'immediate' | 'highest';

export type RequestPriority = PriorityLevel;

export interface ApplicantInfo {
  prefix: string;        // คำนำหน้าชื่อ (นาย/นาง/นางสาว/ดร./ฯลฯ)
  fullName: string;      // ชื่อ-นามสกุล
  firstName?: string;    // ชื่อ
  lastName?: string;     // นามสกุล
  citizenIdOrCode: string;// เลขประจำตัวประชาชน/รหัสนักศึกษา/รหัสพนักงาน
  citizenId?: string;    // alias
  idCard?: string;       // alias
  requesterName?: string;// alias
  email: string;         // อีเมล
  phone: string;         // เบอร์โทรศัพท์ติดต่อ
  department: string;    // แผนก/คณะ/หน่วยงาน
  positionOrMajor: string;// ตำแหน่ง/สาขาวิชา
  position?: string;     // ตำแหน่ง
  userGroup?: string;    // กลุ่มผู้ใช้
  address?: string;      // ที่อยู่
  province?: string;     // จังหวัด
  district?: string;     // อำเภอ/เขต
  subdistrict?: string;  // ตำบล/แขวง
  postalCode?: string;   // รหัสไปรษณีย์
}

export type DocumentCategoryType = 
  | 'id_card'
  | 'police_report'
  | 'evidence_photo'
  | 'application_form'
  | 'official_letter'
  | 'financial_doc'
  | 'medical_cert'
  | 'other';

export interface DocumentCategoryDef {
  id: DocumentCategoryType;
  labelTh: string;
  labelEn: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: string;
  description: string;
}

export interface AttachmentFile {
  id: string;
  name: string;
  size: number | string;
  type: string;
  uploadedAt: string;
  url?: string;
  dataUrl?: string;
  uploadedBy?: string;     // e.g. 'ผู้ยื่นคำร้อง' หรือ 'นางสาวจิราพร ใจดี (เจ้าหน้าที่)'
  isOfficialDoc?: boolean; // ระบุว่าเป็นเอกสารทางการที่อัปเดตโดยแอดมิน/เจ้าหน้าที่
  description?: string;   // คำอธิบายเพิ่มเติม e.g. 'หนังสืออนุมัติฉบับลงนาม'
  documentCategory?: DocumentCategoryType; // หมวดหมู่เอกสารแนบ e.g. 'id_card' | 'police_report' | 'evidence_photo'
  driveFileId?: string;    // รหัสไฟล์ Google Drive (จาก Google Picker)
  driveViewUrl?: string;   // ลิงก์ดูไฟล์ใน Google Drive
}

export interface StatusHistoryItem {
  status: RequestStatus;
  timestamp: string;
  actor: string;         // ผู้ทำรายการ (ระบบ / เจ้าหน้าที่รับเรื่อง / ผู้อนุมัติ)
  note?: string;         // บันทึกข้อความ
}

export interface ProcessingHistoryLog {
  id: string;
  stepId?: string;
  stepNumber?: number;
  stepTitle: string;     // ชื่อขั้นตอนการอนุมัติ เช่น "ขั้นตอนที่ 1: เจ้าหน้าที่สารบรรณรับเรื่องและตรวจเอกสาร"
  status: StepStatus | RequestStatus | string; // e.g. 'approved', 'in_progress', 'rejected', 'action_required', 'completed', 'pending'
  timestamp: string;     // วันเวลาดำเนินการ (ISO or custom date-time string)
  adminUserId: string;   // รหัสประจำตัวผู้ใช้ / Admin ID e.g. "ADM-1001", "OFFICER-001"
  adminName: string;     // ชื่อ-นามสกุล Admin หรือเจ้าหน้าที่ผู้บันทึก
  adminRole?: string;    // ตำแหน่งหรือบทบาท e.g. "ผู้ดูแลระบบสูงสุด", "หัวหน้าฝ่ายปกครอง"
  remarks: string;       // บันทึกข้อความ / ข้อคิดเห็น / ผลการตรวจสอบของขั้นตอนนี้
  actionType?: 'status_update' | 'step_approval' | 'document_verification' | 'manual_log' | 'reassignment' | 'verification';
  loggedAt: string;      // วันเวลาที่บันทึกเข้าระบบ
}

export type StepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';

export interface ApprovalStep {
  id: string;
  stepNumber: number;          // 1, 2, 3, ... > 8
  roleTitle: string;           // ตำแหน่ง/ชื่อขั้นตอน เช่น "1. เจ้าหน้าที่สารบรรณรับเรื่อง"
  approverName: string;        // ชื่อ-นามสกุล ผู้อนุมัติประจำขั้นตอน
  approverPosition: string;    // ตำแหน่งผู้อนุมัติ
  approverEmail?: string;      // อีเมลสำหรับการส่งขออนุมัติคำร้อง
  approverLineId?: string;     // ไอดีไลน์สำหรับการส่งขออนุมัติคำร้อง
  approvalAction?: string;     // การอนุมัติ สำหรับผู้อนุมัติ (เช่น "อนุมัติ/ไม่อนุมัติ/เสนอความเห็น", "ลงนามอนุมัติตามระเบียบ")
  status: StepStatus;          // สถานะของขั้นตอนนี้
  actionDate?: string;         // วันเวลาที่อนุมัติ/ลงนาม
  approvedAt?: string;         // วันเวลาที่อนุมัติ
  comment?: string;            // ความเห็น/ข้อสั่งการประจำขั้นตอน
  signatureUrl?: string;       // ลายเซ็น/ตราประทับประจำขั้นตอน
}

export interface ApprovalWorkflow {
  templateId?: string;
  templateName?: string;       // ชื่อเส้นทางการอนุมัติ เช่น "เส้นทางการอนุมัติระดับองค์กร (10 ขั้นตอน)"
  steps: ApprovalStep[];
  currentStepIndex: number;    // ลำดับขั้นตอนปัจจุบัน (0, 1, 2...)
}

export interface InternalComment {
  id: string;
  author: string;        // ชื่อเจ้าหน้าที่/แอดมินผู้เขียนโน้ต
  content: string;       // เนื้อหาข้อความโน้ตภายใน
  createdAt: string;     // วันเวลาที่บันทึก
  isPinned?: boolean;    // ปักหมุดโน้ตสำคัญ
  isPublic?: boolean;    // โน้ตสาธารณะ (เปิดให้ผู้ยื่นคำร้องมองเห็นได้) vs โน้ตส่วนตัวภายใน
}

export interface AppointmentInfo {
  id: string;
  date: string;          // YYYY-MM-DD วันที่นัดหมาย
  time: string;          // HH:mm เวลาที่นัดหมาย
  appointmentDate?: string; // alias
  appointmentTime?: string; // alias
  location: string;      // สถานที่นัดหมาย (เช่น ห้องสารบรรณ ชั้น 1 อาคารอำนวยการ)
  purpose: string;       // วัตถุประสงค์ (เช่น รับเอกสารฉบับจริง, ตรวจสอบพื้นที่, อนุมัติลงนาม)
  officerName: string;   // เจ้าหน้าที่ผู้นัดหมาย
  notes?: string;        // หมายเหตุหรือข้อแนะนำเพิ่มเติม
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface RequestPreReviewCheck {
  isIdentityVerified: boolean;     // 1. ตรวจสอบสำเนาบัตรประชาชน/หนังสือมอบอำนาจ ถูกต้อง
  isReasonVerified: boolean;       // 2. ตรวจสอบเหตุผลความจำเป็นและหนังสือแจ้งความ/บันทึกประจำวัน
  isLocationTimeVerified: boolean; // 3. ตรวจสอบพิกัดรหัสกล้องและช่วงวันเวลาร้องขอชัดเจน
  isCctvFootageAvailable: boolean; // 4. ตรวจสอบสถานะกล้องวงจรปิดและมีไฟล์ภาพพร้อมถอดสำเนา
  isPdpaConsentVerified: boolean;  // 5. ตรวจสอบหนังสือยินยอม PDPA และเงื่อนไขการใช้ภาพ
  verifiedByOfficer: string;       // ชื่อเจ้าหน้าที่ผู้ตรวจสอบ
  verifiedAt: string;              // วันเวลาที่ตรวจสอบ
  resultStatus: 'passed' | 'pending_fix' | 'rejected' | 'not_checked'; // ผลการตรวจสอบ
  inspectionNote?: string;          // บันทึกข้อเสนอแนะเพิ่มเติมก่อนเสนอผู้บริหาร
  notes?: string;                   // alias for inspectionNote
  forwardedToAdmin?: boolean;       // ส่งเสนอผู้บริหาร/Admin เรียบร้อยแล้ว
  forwardedAt?: string;             // วันเวลาที่ส่งเสนอ
}

export interface AdminVerificationAudit {
  isIdentityVerified: boolean;         // 1. ตรวจสอบยืนยันตัวตน/สิทธิ์ผู้ขอ
  isPoliceReportVerified: boolean;     // 2. ตรวจสอบหนังสือแจ้งความ/บันทึกประจำวัน
  isCctvFootageConfirmed: boolean;     // 3. ตรวจสอบความถูกต้องของพิกัด/ไฟล์ภาพ CCTV
  isPdpaComplianceVerified: boolean;   // 4. ตรวจสอบความสอดคล้อง PDPA และขอบเขตการใช้งาน
  isDataRetentionValid: boolean;       // 5. ตรวจสอบระยะเวลาการบันทึกภาพไม่เกินกำหนด (Retention SLA)
  riskLevel: 'low' | 'medium' | 'high' | 'critical'; // ระดับความเสี่ยง/ความสำคัญ
  deliveryCondition: 'full_footage' | 'blurred_third_party' | 'onsite_viewing_only' | 'official_investigation_only'; // เงื่อนไขการส่งมอบภาพ
  auditResult: 'approved' | 'action_required' | 'forward_executive' | 'rejected'; // ผลการวินิจฉัยของ Admin
  adminName: string;                   // ชื่อ Admin ผู้ตรวจสอบ
  adminPosition: string;               // ตำแหน่ง Admin
  adminNotes?: string;                 // ข้อสั่งการและเหตุผลประกอบการตรวจ
  auditTimestamp: string;              // วันเวลาที่ตรวจสอบ
  adminSignatureUrl?: string;          // ลายเซ็น/ตราประทับ Admin
  officialAuditCode?: string;          // รหัสกำกับการตรวจสอบของ Admin e.g. ADM-AUD-2026-XXXX
}

export interface FeedbackInfo {
  rating: number;         // 1-5 ดาว
  comment?: string;       // ข้อคิดเห็นเพิ่มเติม
  tags?: string[];        // เช่น บริการรวดเร็ว, เจ้าหน้าที่สุภาพ ฯลฯ
  createdAt: string;      // วันเวลาที่บันทึก
}

export interface RequestItem {
  id: string;                    // e.g. REQ-20260728-001
  category: RequestCategory;
  title: string;                 // หัวข้อคำร้อง
  subject?: string;              // alias for title
  description?: string;          // alias for reason
  trackingCode?: string;         // alias for id
  requesterName?: string;        // alias for applicant.fullName
  phone?: string;                // alias for applicant.phone
  email?: string;                // alias for applicant.email
  citizenId?: string;            // alias for applicant.citizenIdOrCode
  applicant: ApplicantInfo;
  details: Record<string, any>;   // ข้อมูลฟิลด์ย่อยตามประเภทคำร้อง
  reason: string;                // เหตุผลความจำเป็น
  priority: PriorityLevel;
  attachments: AttachmentFile[];
  signatureDataUrl?: string;     // ลายเซ็นดิจิทัล
  status: RequestStatus;
  statusHistory: StatusHistoryItem[];
  officerNotes?: string;         // หมายเหตุเจ้าหน้าที่
  internalNotes?: string;        // บันทึกข้อความภายใน
  internalComments?: InternalComment[]; // ระบบบันทึกโน้ตภายในเจ้าหน้าที่ (Internal Notes)
  approvalWorkflow?: ApprovalWorkflow;  // ระบบขั้นตอนการอนุมัติหลายลำดับขั้น (มากกว่า 8 คน)
  processingHistory?: ProcessingHistoryLog[]; // บันทึกประวัติการดำเนินการแต่ละขั้นตอน (Processing History with Timestamps, Remarks, and User IDs)
  assignedOfficer?: string;      // เจ้าหน้าที่ผู้รับผิดชอบ
  appointment?: AppointmentInfo; // ข้อมูลการนัดหมายสำหรับคำร้องที่ได้รับอนุมัติแล้ว
  feedback?: FeedbackInfo;       // การประเมินความพึงพอใจและข้อติชมจากผู้ใช้
  preReviewCheck?: RequestPreReviewCheck; // การตรวจสอบความถูกต้องก่อนเสนอผู้บริหาร/Admin
  adminAudit?: AdminVerificationAudit;   // การตรวจสอบและกลั่นกรองคำร้องระดับ Admin
  aiAutoTags?: AiAutoTagResult;  // ระบบ AI สรุปแท็กหัวข้อคำร้องอัตโนมัติ (Auto-tagging)
  userId?: string;              // รหัสผู้ใช้งาน Firebase Auth UID ที่เชื่อมโยง
  userEmail?: string;           // อีเมล Google Account ของผู้ยื่นคำร้อง
  isGoogleVerified?: boolean;   // ผ่านการยืนยันตัวตนด้วย Google Auth เรียบร้อย
  isArchived?: boolean;          // ย้ายเข้าคลังจัดเก็บแล้ว
  syncStatus?: 'synced' | 'pending' | 'failed'; // สถานะการซิงค์ข้อมูล (Pending Sync / Synced)
  isPendingSync?: boolean;       // อยู่ระหว่างรอส่งข้อมูลขึ้นระบบหลักเมื่อต่ออินเทอร์เน็ต
  location?: string;             // พิกัด/สถานที่ (optional)
  createdAt: string;
  updatedAt: string;
  expectedDate?: string;         // คาดว่าจะแล้วเสร็จ
}

export interface CategoryDefinition {
  id: RequestCategory;
  titleTh: string;
  titleEn: string;
  description: string;
  iconName: string;
  slaDays: number;
  fields: CustomFieldDefinition[];
  requiredDocuments: string[];
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'map';
  required?: boolean;
  options?: { label: string; value: string }[];
  placeholder?: string;
  helpText?: string;
}
