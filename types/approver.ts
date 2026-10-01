import { RequestCategory } from './request';

export type ApproverRoleType = 
  | 'mayor'               // นายกเทศมนตรี / ผู้บริหารสูงสุด
  | 'deputy_mayor'        // รองนายกเทศมนตรี
  | 'municipal_clerk'     // ปลัดเทศบาล / รองปลัด
  | 'division_director'   // ผู้อำนวยการสำนัก/กอง (กองช่าง, สำนักปลัด ฯลฯ)
  | 'legal_officer'       // นิติกร / หัวหน้าฝ่ายนิติการและปกครอง
  | 'cctv_supervisor'     // หัวหน้าศูนย์ควบคุมกล้อง CCTV
  | 'saraban_officer'     // เจ้าหน้าที่สารบรรณ / ธุรการ
  | 'custom';             // กำหนดเอง

export type ApproverStatus = 'active' | 'inactive' | 'on_leave';

export interface ApproverPermissionFlags {
  canFinalApprove: boolean;            // สิทธิ์ลงนามอนุมัติขั้นสูงสุดและปิดเรื่อง (Final Approval Authority)
  canPreliminaryReview: boolean;       // สิทธิ์ตรวจกลั่นกรองและรับเรื่องเบื้องต้น (Preliminary Review)
  canRequestAmendments: boolean;       // สิทธิ์ส่งกลับให้แก้ไขหรือขอเอกสารเพิ่ม (Request Amendments)
  canReject: boolean;                  // สิทธิ์สั่งไม่อนุมัติ/ยกเลิกคำร้อง (Reject Authority)
  canEmergencyApprove: boolean;        // สิทธิ์อนุมัติกรณีฉุกเฉิน/เร่งด่วน Fast-track (Emergency Fast-track)
  canAccessHighResFootage: boolean;    // สิทธิ์อนุมัติส่งมอบไฟล์ความละเอียดสูง/คดีความ (High-Res & Law Enforcement)
  canDelegateApproval: boolean;        // สิทธิ์มอบอำนาจให้ผู้ปฏิบัติราชการแทน (Delegation Authority)
  canAccessBudgetForms: boolean;       // สิทธิ์อนุมัติงบประมาณและพัสดุ (Budget & Procurement)
  canAccessPdpaSensitive: boolean;     // สิทธิ์เปิดเผยข้อมูลส่วนบุคคล PDPA (PDPA Compliance Clearance)
  allowedCategories: RequestCategory[]; // หมวดหมู่คำร้องที่ได้รับอนุญาตให้พิจารณา
  maxApprovalAmount?: number;          // วงเงินอำนาจอนุมัติ (บาท) (0 = ไม่จำกัด)
  maxRetentionAccessDays?: number;     // สิทธิ์เข้าถึงภาพย้อนหลังสูงสุด (วัน เช่น 30, 60, 90, 365)
  requiresDigitalSignature: boolean;   // ต้องลงลายมือชื่อดิจิทัลทุกครั้ง
  requires2FaOtp: boolean;             // ต้องยืนยันรหัสผ่านหรือ 2FA ก่อนลงนาม
}

export interface ApproverPersonExtended {
  id: string;
  code?: string;
  name: string;
  position: string;
  roleTitle?: string;
  department: string;
  email: string;
  lineId: string;
  phone: string;
  level: number;                       // ลำดับขั้นการอนุมัติ 1 - 12
  roleType: ApproverRoleType;
  status: ApproverStatus;
  substituteName?: string;             // ผู้ปฏิบัติราชการแทน (กรณีลา/ติดราชการ)
  substitutePosition?: string;
  substituteEmail?: string;
  permissions: ApproverPermissionFlags;
  officialOrderNo?: string;            // เลขที่คำสั่งแต่งตั้ง/มอบอำนาจ (เช่น คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๕/๒๕๖๙)
  signatureImageUrl?: string;          // ลายมือชื่อจำลอง
  officialStampName?: string;          // ชื่อตราประทับ
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;                      // หมายเหตุ / ขอบเขตงานที่ได้รับมอบหมาย
}

export const DEFAULT_APPROVER_PERMISSIONS: ApproverPermissionFlags = {
  canFinalApprove: false,
  canPreliminaryReview: true,
  canRequestAmendments: true,
  canReject: false,
  canEmergencyApprove: false,
  canAccessHighResFootage: false,
  canDelegateApproval: false,
  canAccessBudgetForms: false,
  canAccessPdpaSensitive: false,
  allowedCategories: ['cctv', 'general'],
  maxApprovalAmount: 0,
  maxRetentionAccessDays: 30,
  requiresDigitalSignature: true,
  requires2FaOtp: false
};
