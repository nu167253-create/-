export interface RequestDossierFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'doc' | 'sheet' | 'log';
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  description?: string;
  category: 'form' | 'evidence' | 'approval_memo' | 'official_letter' | 'audit_log' | 'id_card';
}

export interface CameraInspectionItem {
  id: string;
  reportNo: string; // e.g. PM-2026-02-001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  cameraId: string; // e.g. IPCamera 01
  cameraName: string;
  zone: string; // ตู้ควบคุม / โซน
  building: string;
  inspectorName: string; // ผู้ตรวจเช็ค
  inspectorPosition: string; // ตำแหน่ง
  inspectorTeam?: string; // ชุดปฏิบัติการ
  
  // Checklist Items (Pass / Fail / N/A)
  lensCleaning: boolean; // ทำความสะอาดเลนส์และฝาครอบ
  lensClarityRating: 1 | 2 | 3 | 4 | 5; // ระดับความคมชัดหลังทำความสะอาด 1-5 ดาว
  housingCondition: 'good' | 'loose' | 'damaged' | 'corroded'; // สภาพตัวกล้องและขายึด
  waterproofSeal: boolean; // ซีลกันน้ำและข้อต่อสายไฟ
  powerSupplyVoltage: string; // แรงดันไฟฟ้า e.g. '12.2V' or 'PoE+ 48V'
  upsBackupStatus: 'normal' | 'battery_low' | 'replace_battery' | 'no_ups'; // สถานะ UPS สำรองไฟ
  networkPingMs: number; // ความเร็วเครือข่าย ms
  nvrRecordingStatus: 'recording' | 'storage_warning' | 'frame_drop' | 'error'; // สถานะ NVR
  irNightVision: 'working' | 'weak' | 'failed' | 'not_applicable'; // ระบบอินฟราเรด
  
  // Before & After notes and photos
  beforeCleaningNotes?: string;
  afterCleaningNotes?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  
  // Overall Summary
  overallResult: 'pass' | 'needs_attention' | 'critical_defect';
  actionTaken: string; // การดำเนินการแก้ไข
  recommendedAction?: string; // ข้อเสนอแนะเพิ่มเติม
  verifiedBy?: string; // ผู้ตรวจรับรองรายงาน (Admin/หัวหน้างาน)
  verifiedAt?: string;
  signatureUrl?: string;
}

export interface AdminFolderItem {
  id: string;
  name: string;
  type: 'request_archive' | 'camera_maintenance';
  subCategory?: string;
  iconName?: string;
  description: string;
  itemCount: number;
  updatedAt: string;
  color: string;
}
