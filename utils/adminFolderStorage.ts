import { CameraInspectionItem, AdminFolderItem } from '../types/adminFolders';

const INSPECTION_STORAGE_KEY = 'cctv_camera_inspections_v1';
const CUSTOM_FOLDERS_STORAGE_KEY = 'admin_custom_folders_v1';

export const INITIAL_INSPECTION_REPORTS: CameraInspectionItem[] = [
  {
    id: 'INSP-202602-001',
    reportNo: 'PM-2026-02-001',
    date: '2026-02-18',
    time: '09:30',
    cameraId: 'IPCamera 01',
    cameraName: 'สี่แยกโรบินสัน กล้องจุดที่ 1',
    zone: 'ตู้สี่แยกโรบินสัน',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    inspectorName: 'นายประสิทธิ์ ช่างเทคนิค',
    inspectorPosition: 'นายช่างไฟฟ้าชำนาญงาน',
    inspectorTeam: 'ชุดปฏิบัติการบำรุงรักษา CCTV ชุดที่ 1',
    lensCleaning: true,
    lensClarityRating: 5,
    housingCondition: 'good',
    waterproofSeal: true,
    powerSupplyVoltage: 'PoE+ 48.2V',
    upsBackupStatus: 'normal',
    networkPingMs: 4,
    nvrRecordingStatus: 'recording',
    irNightVision: 'working',
    beforeCleaningNotes: 'มีคราบฝุ่นละออง PM2.5 และหยดน้ำฝนแห้งเกาะหน้าเลนส์ ภาพฟุ้งเล็กน้อย',
    afterCleaningNotes: 'ใช้น้ำยาเช็ดเลนส์ออปติกและผ้าไมโครไฟเบอร์ทำความสะอาดแล้ว ภาพคมชัด 4K สมบูรณ์',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500&auto=format&fit=crop&q=60',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=500&auto=format&fit=crop&q=60',
    overallResult: 'pass',
    actionTaken: 'เช็ดทำความสะอาดหน้าเลนส์ ตรวจสอบขายึดตู้ควบคุม และขันแน่นขั้วต่อสายไฟเบอร์',
    recommendedAction: 'กำหนดรอบทำความสะอาดครั้งถัดไปใน 30 วัน',
    verifiedBy: 'นายสมศักดิ์ วงศ์สวรรค์ (หัวหน้าฝ่ายความมั่นคง/Admin)',
    verifiedAt: '2026-02-18 11:00'
  },
  {
    id: 'INSP-202602-002',
    reportNo: 'PM-2026-02-002',
    date: '2026-02-18',
    time: '10:45',
    cameraId: 'IPCamera 02',
    cameraName: 'สี่แยกโรบินสัน กล้องจุดที่ 2',
    zone: 'ตู้สี่แยกโรบินสัน',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    inspectorName: 'นายประสิทธิ์ ช่างเทคนิค',
    inspectorPosition: 'นายช่างไฟฟ้าชำนาญงาน',
    inspectorTeam: 'ชุดปฏิบัติการบำรุงรักษา CCTV ชุดที่ 1',
    lensCleaning: true,
    lensClarityRating: 5,
    housingCondition: 'good',
    waterproofSeal: true,
    powerSupplyVoltage: 'PoE+ 48.0V',
    upsBackupStatus: 'normal',
    networkPingMs: 5,
    nvrRecordingStatus: 'recording',
    irNightVision: 'working',
    beforeCleaningNotes: 'พบหยากไย่และฝุ่นเกาะบริเวณขายึดและขอบกระบอกกล้อง',
    afterCleaningNotes: 'ปัดฝุ่นและทำความสะอาดกระบอกกล้อง ปรับมุมกล้องจับภาพช่องทางขาเข้าเมืองให้ชัดเจน',
    overallResult: 'pass',
    actionTaken: 'ทำความสะอาดกระบอกกล้องและจัดระเบียบสายสัญญาณในกล่องพักสาย',
    verifiedBy: 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)',
    verifiedAt: '2026-02-18 11:30'
  },
  {
    id: 'INSP-202602-003',
    reportNo: 'PM-2026-02-003',
    date: '2026-02-15',
    time: '14:15',
    cameraId: 'IPCamera 03',
    cameraName: 'สามแยกโนนกอก (ศาลเจ้าพ่อพญาแล)',
    zone: 'ตู้สามแยกโนนกอก',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    inspectorName: 'นายธวัชชัย สื่อสาร',
    inspectorPosition: 'วิศวกรระบบโทรคมนาคม',
    inspectorTeam: 'ชุดสำรวจและกู้คืนสายไฟเบอร์',
    lensCleaning: false,
    lensClarityRating: 2,
    housingCondition: 'good',
    waterproofSeal: true,
    powerSupplyVoltage: '0V (No Link)',
    upsBackupStatus: 'battery_low',
    networkPingMs: 999,
    nvrRecordingStatus: 'error',
    irNightVision: 'not_applicable',
    beforeCleaningNotes: 'ตัวกล้องไม่ได้รับสัญญาณภาพเนื่องจากสาย Fiber Optic ขาดบริเวณใกล้สามแยกหนองปลาเฒ่า',
    afterCleaningNotes: 'ตรวจสภาพภายนอกตัวกล้องยังสมบูรณ์ รอการเชื่อมต่อสายใยแก้วนำแสง (Fiber Splicing)',
    overallResult: 'critical_defect',
    actionTaken: 'ประสานงานช่างสายสื่อสารเข้าซ่อมแซมจุดเชื่อมต่อสาย Fiber Optic และทดสอบ OTDR',
    recommendedAction: 'เร่งรัดการต่อสายไฟเบอร์ภายใน 48 ชม.',
    verifiedBy: 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)',
    verifiedAt: '2026-02-15 16:00'
  },
  {
    id: 'INSP-202602-004',
    reportNo: 'PM-2026-02-004',
    date: '2026-02-12',
    time: '11:20',
    cameraId: 'IPCamera 04',
    cameraName: 'ห้าแยกโนนไฮ จุดที่ 1',
    zone: 'ตู้ห้าแยกโนนไฮ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    inspectorName: 'นายประสิทธิ์ ช่างเทคนิค',
    inspectorPosition: 'นายช่างไฟฟ้าชำนาญงาน',
    inspectorTeam: 'ชุดปฏิบัติการบำรุงรักษา CCTV ชุดที่ 1',
    lensCleaning: true,
    lensClarityRating: 4,
    housingCondition: 'good',
    waterproofSeal: true,
    powerSupplyVoltage: '12.4V DC',
    upsBackupStatus: 'normal',
    networkPingMs: 8,
    nvrRecordingStatus: 'recording',
    irNightVision: 'working',
    beforeCleaningNotes: 'เลนส์มีคราบเขม่าควันจากรถบรรทุกบริเวณสี่แยก',
    afterCleaningNotes: 'ใช้น้ำยาทำความสะอาดเฉพาะทางเช็ดคราบเขม่าออกหมดจด ค่าความคมชัดกลับมาปกติ',
    overallResult: 'pass',
    actionTaken: 'ทำความสะอาดกระจกหน้าเลนส์และตรวจเช็คอุณหภูมิสวิตช์ PoE ภายในตู้',
    verifiedBy: 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)',
    verifiedAt: '2026-02-12 13:00'
  },
  {
    id: 'INSP-202601-005',
    reportNo: 'PM-2026-01-018',
    date: '2026-01-20',
    time: '15:00',
    cameraId: 'IPCamera 05',
    cameraName: 'หน้าโรงเรียนเทศบาล 1 (สุนทรราชเดช)',
    zone: 'ตู้ รร.เทศบาล 1',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    inspectorName: 'นายวิเชียร ช่างกล้อง',
    inspectorPosition: 'นายช่างเทคนิค',
    inspectorTeam: 'ชุดปฏิบัติการบำรุงรักษา CCTV ชุดที่ 2',
    lensCleaning: true,
    lensClarityRating: 4,
    housingCondition: 'loose',
    waterproofSeal: true,
    powerSupplyVoltage: 'PoE 47.8V',
    upsBackupStatus: 'replace_battery',
    networkPingMs: 6,
    nvrRecordingStatus: 'recording',
    irNightVision: 'working',
    beforeCleaningNotes: 'ขายึดเริ่มมีอาการคลอนเล็กน้อยจากลมพัดแรง และแบตเตอรี่ UPS สำรองไฟแจ้งเตือนเสื่อมสภาพ',
    afterCleaningNotes: 'ขันน็อตยึดขายึดให้แน่นหนา ทำความสะอาดหน้ากล้อง และออกใบแจ้งซ่อมเปลี่ยนแบตเตอรี่ UPS',
    overallResult: 'needs_attention',
    actionTaken: 'ขันแน่นโครงสร้างขายึดกล้องและทำความสะอาดกระจกเลนส์',
    recommendedAction: 'เบิกจ่ายแบตเตอรี่ UPS ขนาด 12V 7.2Ah เปลี่ยนใหม่ภายใน 7 วัน',
    verifiedBy: 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)',
    verifiedAt: '2026-01-20 17:30'
  }
];

export function getStoredCameraInspections(): CameraInspectionItem[] {
  try {
    const raw = localStorage.getItem(INSPECTION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    saveStoredCameraInspections(INITIAL_INSPECTION_REPORTS);
    return INITIAL_INSPECTION_REPORTS;
  } catch (err) {
    console.error('Failed to get camera inspections:', err);
    return INITIAL_INSPECTION_REPORTS;
  }
}

export function saveStoredCameraInspections(items: CameraInspectionItem[]): void {
  try {
    localStorage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save camera inspections:', err);
  }
}

export function addCameraInspectionReport(report: Omit<CameraInspectionItem, 'id'>): CameraInspectionItem {
  const existing = getStoredCameraInspections();
  const dateStr = (report.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const count = existing.length + 1;
  const id = `INSP-${dateStr}-${String(count).padStart(3, '0')}`;
  
  const newItem: CameraInspectionItem = {
    ...report,
    id
  };
  
  const updated = [newItem, ...existing];
  saveStoredCameraInspections(updated);
  return newItem;
}

export function updateCameraInspectionReport(id: string, updates: Partial<CameraInspectionItem>): CameraInspectionItem | null {
  const existing = getStoredCameraInspections();
  const idx = existing.findIndex(item => item.id === id);
  if (idx === -1) return null;
  
  const updatedItem = {
    ...existing[idx],
    ...updates
  };
  
  existing[idx] = updatedItem;
  saveStoredCameraInspections(existing);
  return updatedItem;
}

export function deleteCameraInspectionReport(id: string): boolean {
  const existing = getStoredCameraInspections();
  const filtered = existing.filter(item => item.id !== id);
  if (filtered.length === existing.length) return false;
  saveStoredCameraInspections(filtered);
  return true;
}

// Custom Folders Storage
export function getCustomAdminFolders(): AdminFolderItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FOLDERS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error('Failed to load custom folders:', err);
    return [];
  }
}

export function saveCustomAdminFolders(folders: AdminFolderItem[]): void {
  try {
    localStorage.setItem(CUSTOM_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (err) {
    console.error('Failed to save custom folders:', err);
  }
}
