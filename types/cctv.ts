export type CctvStatus = 'online' | 'faulty' | 'maintenance' | 'offline';

export type CctvType = 'dome' | 'bullet' | 'ptz' | '360_degree';

export interface CctvAttachment {
  id: string;
  name: string;
  url: string;             // Base64 data URL or external URL
  size?: number;           // File size in bytes
  type?: string;           // MIME type (e.g. image/jpeg, application/pdf)
  uploadedAt?: string;     // ISO timestamp or formatted date
  category?: 'site_photo' | 'diagram' | 'spec_sheet' | 'maintenance_doc' | 'other'; // ประเภทไฟล์แนบ
}

export interface CctvCamera {
  id: string;              // e.g. CCTV-A1-01
  name: string;            // ชื่อกล้อง/จุดติดตั้ง
  building: string;        // อาคาร / เทศบาล / ชุมชน
  floor: string;           // ชั้น / บริเวณ
  zone: string;            // โซน/บริเวณ / ตู้ควบคุม
  type: CctvType;          // ชนิดกล้อง
  resolution: string;      // ความละเอียด (e.g. 4K, 1080p)
  ipAddress: string;       // IP Address
  serialNumber: string;    // Serial Number / รหัสครุภัณฑ์
  model?: string;          // รุ่น/โมเดลกล้อง
  status: CctvStatus;      // สถานะการใช้งาน
  lastMaintenance: string; // วันที่ตรวจเช็กล่าสุด
  installedDate: string;   // วันที่ติดตั้ง
  coordinates?: { x: number; y: number }; // พิกัดตำแหน่งบนแผนผัง (เปอร์เซ็นต์ x, y)
  latitude?: number;       // ละติจูด (Latitude) e.g. 15.80621
  longitude?: number;      // ลองจิจูด (Longitude) e.g. 102.03150
  notes?: string;          // หมายเหตุ/อาการชำรุด (ถ้ามี)
  inspector?: string;      // ผู้ตรวจสอบ (Inspector)
  attachments?: CctvAttachment[]; // ไฟล์แนบ / รูปภาพจุดติดตั้ง / แผนผัง
  imageUrl?: string;       // ภาพปกหลักของจุดติดตั้ง (Primary Image URL)

  // ข้อมูลทะเบียนครุภัณฑ์และจุดติดตั้งเทศบาลเมืองชัยภูมิ
  cabinetNumber?: string;  // จุดติดตั้งตู้ควบคุม เช่น "1", "6", "ตู้ 23"
  channel?: string;        // ช่องสัญญาณ เช่น "CH1", "CH 5", "CH142"
  systemAssetCode?: string;// รหัสสินทรัพย์ในระบบ เช่น "404-641123-00032"
  assetCode?: string;      // รหัสสินทรัพย์ / รหัสครุภัณฑ์ เช่น "452-59-0159", "452-67-0124-8-0001"
  assetName?: string;      // ชื่อสินทรัพย์ เช่น "กล้องพร้อมพัดลมระบายอากาศ", "กล้องวงจรปิด CCTV"
  community?: string;      // ชุมชน เช่น "ชุมชนโคกน้อย", "ชุมชนเมืองเก่า", "ชุมชนตลาด", "เขตเทศบาล"
  nvrGroup?: string;       // กลุ่มโครงข่าย / NVR เช่น "CCTV 1 (ตู้ 1-5)", "CCTV 2 (ตู้ 6-13)", "ชุมชนโคกน้อย"
}

export interface CctvEquipmentItem {
  id: string;
  name: string;
  equipmentType: 'NVR' | 'TV' | 'POE' | 'UPS' | 'SWITCH' | 'CAMERA' | 'OTHER';
  communityOrOffice: string;
  locationName: string;
  systemAssetCode?: string;
  assetCode: string;
  model?: string;
  status: 'online' | 'faulty' | 'offline';
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface CctvStats {
  total: number;
  online: number;
  faulty: number;
  maintenance: number;
  offline: number;
}
