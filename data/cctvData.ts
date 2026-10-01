import { CctvCamera, CctvEquipmentItem } from '../types/cctv';
import { ALL_CHAIYAPHUM_CAMERAS, ALL_CHAIYAPHUM_EQUIPMENT } from './cctvChaiyaphumData';

export const INITIAL_CCTV_CAMERAS: CctvCamera[] = [
  ...ALL_CHAIYAPHUM_CAMERAS,
  // NVR Hikvision DS-7616NI-K2 J89086017 Channels & Control Cabinets (เทศบาลเมืองชัยภูมิ)
  {
    id: 'IPCamera 01',
    name: 'สี่แยกโรบินสัน กล้องจุดที่ 1',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกโรบินสัน',
    zone: 'ตู้สี่แยกโรบินสัน',
    type: 'ptz',
    resolution: '4K Ultra HD',
    ipAddress: '192.168.1.62',
    serialNumber: 'SN-DS7616-01',
    status: 'online',
    lastMaintenance: '2026-01-13',
    installedDate: '2024-01-10',
    coordinates: { x: 18, y: 75 },
    latitude: 15.80621,
    longitude: 102.03150,
    notes: 'กล้องทำงานปกติ บันทึกภาพจราจรทางเข้าสี่แยกโรบินสัน'
  },
  {
    id: 'IPCamera 02',
    name: 'สี่แยกโรบินสัน กล้องจุดที่ 2',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกโรบินสัน',
    zone: 'ตู้สี่แยกโรบินสัน',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.63',
    serialNumber: 'SN-DS7616-02',
    status: 'online',
    lastMaintenance: '2026-01-13',
    installedDate: '2024-01-10',
    coordinates: { x: 22, y: 78 },
    latitude: 15.80650,
    longitude: 102.03180,
    notes: 'สัญญาณวิดีโอปกติ จับภาพฝั่งขาเข้าเมือง'
  },
  {
    id: 'IPCamera 03',
    name: 'สามแยกโนนกอก (ศาลเจ้าพ่อพญาแล)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สามแยกโนนกอก',
    zone: 'ตู้สามแยกโนนกอก',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.64',
    serialNumber: 'SN-DS7616-03',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-01-10',
    coordinates: { x: 28, y: 35 },
    latitude: 15.81120,
    longitude: 102.02980,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 14:29:39 สาเหตุ: เกิดไฟไหม้สาย Fiber Optic บริเวณใกล้สามแยกหนองปลาเฒ่า (ระยะ 3,585 ม.)'
  },
  {
    id: 'IPCamera 04',
    name: 'สี่แยกหนองปลาเฒ่า (สนามแบดมินตัน)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกหนองปลาเฒ่า',
    zone: 'ตู้สี่แยกหนองปลาเฒ่า',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.65',
    serialNumber: 'SN-DS7616-04',
    status: 'offline',
    lastMaintenance: '2025-12-10',
    installedDate: '2024-01-10',
    coordinates: { x: 35, y: 38 },
    latitude: 15.81050,
    longitude: 102.03050,
    notes: 'ออฟไลน์ตั้งแต่ 10/12/2025 17:59:49 สาย Fiber Optic ขาดจากเหตุไฟไหม้ใกล้สามแยก'
  },
  {
    id: 'IPCamera 05',
    name: 'สี่แยกหนองปลาเฒ่า (ทางไปโรงเรียนกวน)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกหนองปลาเฒ่า',
    zone: 'ตู้สี่แยกหนองปลาเฒ่า',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.66',
    serialNumber: 'SN-DS7616-05',
    status: 'offline',
    lastMaintenance: '2025-12-10',
    installedDate: '2024-01-10',
    coordinates: { x: 38, y: 40 },
    latitude: 15.81080,
    longitude: 102.03090,
    notes: 'ออฟไลน์ตั้งแต่ 10/12/2025 17:59:49 รอยืนยันซ่อมสายไฟเบอร์ออฟติก 12 core ระยะ 100 ม.'
  },
  {
    id: 'IPCamera 06',
    name: 'สี่แยกโรงต้ม (ฝั่งตรงข้ามโรงต้ม)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกโรงต้ม',
    zone: 'ตู้สี่แยกโรงต้ม',
    type: 'ptz',
    resolution: '2K QHD',
    ipAddress: '192.168.1.67',
    serialNumber: 'SN-DS7616-06',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-02-01',
    coordinates: { x: 45, y: 55 },
    latitude: 15.80890,
    longitude: 102.03210,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 14:29:39 สาเหตุ: สาย Fiber Optic ถูกตัดจากการนำสายไฟลงใต้ดิน ต้องนำสายลงใต้ดินเชื่อมต่อ'
  },
  {
    id: 'IPCamera 07',
    name: 'สี่แยกโรงต้ม (มุ่งหน้าหอนาฬิกา)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกโรงต้ม',
    zone: 'ตู้สี่แยกโรงต้ม',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.68',
    serialNumber: 'SN-DS7616-07',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-02-01',
    coordinates: { x: 48, y: 58 },
    latitude: 15.80870,
    longitude: 102.03240,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 14:29:39 อยู่ระหว่างเสนอราคาเดินสายไฟเบอร์ใหม่ใต้ดิน'
  },
  {
    id: 'IPCamera 08',
    name: 'ตลาดน้ำพุถนนคนเดิน โซน A',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'ตลาดน้ำพุ',
    zone: 'ตู้ตลาดน้ำพุถนนคนเดิน',
    type: 'dome',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.69',
    serialNumber: 'SN-DS7616-08',
    status: 'online',
    lastMaintenance: '2025-08-01',
    installedDate: '2024-03-15',
    coordinates: { x: 55, y: 65 },
    latitude: 15.80780,
    longitude: 102.03350,
    notes: 'ใช้งานได้ปกติ ครอบคลุมโซนร้านค้าตลาดน้ำพุ'
  },
  {
    id: 'IPCamera 09',
    name: 'ตลาดน้ำพุถนนคนเดิน โซน B',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'ตลาดน้ำพุ',
    zone: 'ตู้ตลาดน้ำพุถนนคนเดิน',
    type: '360_degree',
    resolution: '4K Ultra HD',
    ipAddress: '192.168.1.70',
    serialNumber: 'SN-DS7616-09',
    status: 'online',
    lastMaintenance: '2025-08-01',
    installedDate: '2024-03-15',
    coordinates: { x: 58, y: 68 },
    latitude: 15.80750,
    longitude: 102.03380,
    notes: 'กล้อง Fisheye 360 องศา บันทึกภาพมุมกว้างลานวงเวียนน้ำพุ'
  },
  {
    id: 'IPCamera 10',
    name: 'สามแยกหอนาฬิกาชัยภูมิ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สามแยกหอนาฬิกา',
    zone: 'ตู้สามแยกหอนาฬิกา',
    type: 'ptz',
    resolution: '4K Ultra HD',
    ipAddress: '192.168.1.71',
    serialNumber: 'SN-DS7616-10',
    status: 'faulty',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-04-01',
    coordinates: { x: 62, y: 52 },
    latitude: 15.80920,
    longitude: 102.03450,
    notes: 'ออฟไลน์/ชำรุด ตั้งแต่ 20/11/2025 สาเหตุ: ตู้ใส่อุปกรณ์โดนรถชนพังเสียหาย ต้องเปลี่ยนตู้ใส่อุปกรณ์ใหม่'
  },
  {
    id: 'IPCamera 11',
    name: 'สี่แยกหนองบ่อ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกหนองบ่อ',
    zone: 'ตู้สี่แยกหนองบ่อ',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.72',
    serialNumber: 'SN-DS7616-11',
    status: 'faulty',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-04-10',
    coordinates: { x: 68, y: 45 },
    latitude: 15.80980,
    longitude: 102.03520,
    notes: 'ชำรุด/ไม่มีไฟเข้า สาเหตุ: Breaker Switch ABB ในตู้ควบคุมเสีย ต้องเปลี่ยนสวิตช์เบรกเกอร์'
  },
  {
    id: 'IPCamera 12',
    name: 'สามแยกวัดทรงศิลา (พระอารามหลวง)',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สามแยกวัดทรงศิลา',
    zone: 'ตู้สามแยกวัดทรงศิลา',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.73',
    serialNumber: 'SN-DS7616-12',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-04-10',
    coordinates: { x: 72, y: 48 },
    latitude: 15.80950,
    longitude: 102.03580,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 สัญญาณสาย Fiber Optic จากสี่แยกหอนาฬิกาขาดหาย'
  },
  {
    id: 'IPCamera 13',
    name: 'สี่แยกโรงพยาบาลชัยภูมิ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยก รพ.ชัยภูมิ',
    zone: 'ตู้สี่แยกโรงพยาบาลชัยภูมิ',
    type: 'ptz',
    resolution: '2K QHD',
    ipAddress: '192.168.1.74',
    serialNumber: 'SN-DS7616-13',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-05-01',
    coordinates: { x: 78, y: 62 },
    latitude: 15.80710,
    longitude: 102.03650,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 รอเดินสาย Fiber Optic 2 core ระยะ 550 ม. เชื่อมจากวัดทรงศิลา'
  },
  {
    id: 'IPCamera 14',
    name: 'สามแยกโรงแรมศิริชัย',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สามแยกโรงแรมศิริชัย',
    zone: 'ตู้สามแยกโรงแรมศิริชัย',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.75',
    serialNumber: 'SN-DS7616-14',
    status: 'faulty',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-05-01',
    coordinates: { x: 82, y: 55 },
    latitude: 15.80820,
    longitude: 102.03720,
    notes: 'ชำรุด/ออฟไลน์ สาเหตุ: ตู้ใส่อุปกรณ์โดนรถชนพัง ต้องเปลี่ยนตู้ใส่อุปกรณ์และสาย LAN 2 เส้น'
  },
  {
    id: 'IPCamera 15',
    name: 'แยกโรงเลื่อย',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'แยกโรงเลื่อย',
    zone: 'ตู้แยกโรงเลื่อย',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.76',
    serialNumber: 'SN-DS7616-15',
    status: 'offline',
    lastMaintenance: '2025-11-20',
    installedDate: '2024-05-15',
    coordinates: { x: 86, y: 42 },
    latitude: 15.81020,
    longitude: 102.03780,
    notes: 'ออฟไลน์ตั้งแต่ 20/11/2025 อยู่ในแผนซ่อมแซมใหญ่เปลี่ยนอุปกรณ์สายไฟเบอร์'
  },
  {
    id: 'IPCamera 16',
    name: 'สี่แยกกองช่าง เทศบาลเมืองชัยภูมิ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกกองช่าง',
    zone: 'ตู้สี่แยกกองช่าง',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.1.77',
    serialNumber: 'SN-DS7616-16',
    status: 'maintenance',
    lastMaintenance: '2026-06-10',
    installedDate: '2024-05-15',
    coordinates: { x: 90, y: 38 },
    latitude: 15.81150,
    longitude: 102.03850,
    notes: 'ทำการเปลี่ยนอุปกรณ์ตู้ควบคุมแล้ว อยู่ระหว่างทดสอบสตรีมภาพวิดีโอกลับศูนย์ NVR'
  },
  // Additional Control Cabinet Point Locations across Chaiyaphum Municipality
  {
    id: 'CAM-CAB-001',
    name: 'ตู้ควบคุมสี่แยกโรงเรียนสตรีชัยภูมิ',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกสตรีชัยภูมิ',
    zone: 'ตู้สี่แยกโรงเรียนสตรีชัยภูมิ',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.2.101',
    serialNumber: 'SN-CAB-004',
    status: 'faulty',
    lastMaintenance: '2026-06-01',
    installedDate: '2024-01-10',
    coordinates: { x: 32, y: 48 },
    latitude: 15.80910,
    longitude: 102.03010,
    notes: 'อุปกรณ์ป้องกันไฟตกไฟเกินชำรุด อยู่ในใบเสนอราคาเปลี่ยนพัดลม 4 นิ้ว และตั้งเวลา 24 ชม.'
  },
  {
    id: 'CAM-CAB-002',
    name: 'ตู้ควบคุมสามแยกร้านเคลิ้ม',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สามแยกร้านเคลิ้ม',
    zone: 'ตู้สามแยกร้านเคลิ้ม',
    type: 'dome',
    resolution: '1080p Full HD',
    ipAddress: '192.168.2.112',
    serialNumber: 'SN-CAB-012',
    status: 'online',
    lastMaintenance: '2026-07-01',
    installedDate: '2024-02-15',
    coordinates: { x: 65, y: 58 },
    latitude: 15.80810,
    longitude: 102.03480,
    notes: 'อุปกรณ์ทำงานปกติ เชื่อมต่อสาย Fiber Optic 6 core ระยะ 450 ม.'
  },
  {
    id: 'CAM-CAB-003',
    name: 'ตู้ควบคุมสี่แยกราชทัณฑ์',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกราชทัณฑ์',
    zone: 'ตู้สี่แยกราชทัณฑ์',
    type: 'bullet',
    resolution: '1080p Full HD',
    ipAddress: '192.168.2.116',
    serialNumber: 'SN-CAB-016',
    status: 'online',
    lastMaintenance: '2026-07-10',
    installedDate: '2024-03-01',
    coordinates: { x: 74, y: 52 },
    latitude: 15.80880,
    longitude: 102.03600,
    notes: 'ตู้ควบคุมสภาพดี สัญญาณปกติ'
  },
  {
    id: 'CAM-CAB-004',
    name: 'ตู้ควบคุมสี่แยกยุติธรรม',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    floor: 'สี่แยกยุติธรรม',
    zone: 'ตู้สี่แยกยุติธรรม',
    type: 'ptz',
    resolution: '4K Ultra HD',
    ipAddress: '192.168.2.117',
    serialNumber: 'SN-CAB-017',
    status: 'online',
    lastMaintenance: '2026-07-15',
    installedDate: '2024-03-01',
    coordinates: { x: 76, y: 56 },
    latitude: 15.80850,
    longitude: 102.03620,
    notes: 'กล้อง 4 ตัวในตู้ควบคุมใช้งานได้ปกติ เชื่อมสาย Fiber 2 core 240 ม.'
  }
];

const LOCAL_STORAGE_KEY_CCTV = 'epetition_cctv_cameras_v4_chaiyaphum';
const LOCAL_STORAGE_KEY_EQUIPMENT = 'epetition_cctv_equipment_v1';

export const getStoredCctvCameras = (): CctvCamera[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CCTV);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_CCTV, JSON.stringify(INITIAL_CCTV_CAMERAS));
      return INITIAL_CCTV_CAMERAS;
    }
    const parsed: CctvCamera[] = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Error reading CCTV cameras from localStorage', err);
    return INITIAL_CCTV_CAMERAS;
  }
};

export const getStoredCctvEquipment = (): CctvEquipmentItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_EQUIPMENT);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY_EQUIPMENT, JSON.stringify(ALL_CHAIYAPHUM_EQUIPMENT));
      return ALL_CHAIYAPHUM_EQUIPMENT;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading CCTV equipment from localStorage', err);
    return ALL_CHAIYAPHUM_EQUIPMENT;
  }
};

export const saveCctvEquipment = (equipment: CctvEquipmentItem[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_EQUIPMENT, JSON.stringify(equipment));
  } catch (err) {
    console.error('Error saving CCTV equipment to localStorage', err);
  }
};

export { ALL_CHAIYAPHUM_CAMERAS, ALL_CHAIYAPHUM_EQUIPMENT };

export const saveCctvCameras = (cameras: CctvCamera[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_CCTV, JSON.stringify(cameras));
  } catch (err) {
    console.error('Error saving CCTV cameras to localStorage', err);
  }
};

export const updateCctvStatus = (
  id: string, 
  newStatus: CctvCamera['status'], 
  notes?: string
): CctvCamera[] => {
  const list = getStoredCctvCameras();
  const updated = list.map((cam) => {
    if (cam.id === id) {
      return {
        ...cam,
        status: newStatus,
        lastMaintenance: new Date().toISOString().slice(0, 10),
        notes: notes !== undefined ? notes : cam.notes
      };
    }
    return cam;
  });
  saveCctvCameras(updated);
  return updated;
};

export const addCctvCamera = (camera: CctvCamera): CctvCamera[] => {
  const list = getStoredCctvCameras();
  const updated = [camera, ...list];
  saveCctvCameras(updated);
  return updated;
};

export const updateCctvCamera = (camera: CctvCamera): CctvCamera[] => {
  const list = getStoredCctvCameras();
  const updated = list.map((cam) => (cam.id === camera.id ? { ...cam, ...camera } : cam));
  saveCctvCameras(updated);
  return updated;
};

export const deleteCctvCamera = (id: string): CctvCamera[] => {
  const list = getStoredCctvCameras();
  const updated = list.filter((cam) => cam.id !== id);
  saveCctvCameras(updated);
  return updated;
};

