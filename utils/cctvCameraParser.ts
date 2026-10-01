import { CctvCamera, CctvStatus, CctvType } from '../types/cctv';
import { gpsToSvgCoords } from '../data/cctvChaiyaphumData';
import {
  ValidatedCctvCameraRow,
  CctvValidationSummary,
  CctvFieldValidationIssue,
  validateCctvCameraRow,
  validateCctvCameraBatch
} from './cctvCameraValidator';

export * from './cctvCameraValidator';

/**
 * Options for configuring CSV camera data ingestion
 */
export interface CctvCameraParserOptions {
  defaultBuilding?: string;
  defaultCommunity?: string;
  defaultResolution?: string;
  overrideExistingIds?: boolean;
  fallbackInspector?: string;
  enforceMandatoryFields?: boolean;
}

/**
 * Detailed result of CCTV camera CSV parsing with data validation
 */
export interface CctvCameraParseResult {
  cameras: CctvCamera[];
  validCameras: CctvCamera[];
  invalidRows: ValidatedCctvCameraRow[];
  validatedRows: ValidatedCctvCameraRow[];
  validationSummary: CctvValidationSummary;
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errors: { row: number; reason: string; rawData?: Record<string, any> }[];
  summary: {
    onlineCount: number;
    faultyCount: number;
    maintenanceCount: number;
    offlineCount: number;
    byCabinet: Record<string, number>;
    byCommunity: Record<string, number>;
    byType: Record<string, number>;
  };
}

/**
 * Normalizes Thai Buddhist Era year (พ.ศ.) to Gregorian year (ค.ศ.)
 * e.g., '15/02/2567' -> '2024-02-15'
 */
export function normalizeDateStringToIso(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().slice(0, 10);
  }

  const trimmed = dateStr.trim();
  if (!trimmed) return new Date().toISOString().slice(0, 10);

  // Check format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) {
      year -= 543; // Convert Buddhist year to Gregorian
    }
    return `${year}-${month}-${day}`;
  }

  // Check format YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    if (year > 2400) {
      year -= 543;
    }
    return `${year}-${month}-${day}`;
  }

  // Attempt JS standard parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Maps raw status strings (Thai and English) to standard CctvStatus
 */
export function mapRawStatusToCctvStatus(rawStatus?: any): CctvStatus {
  if (!rawStatus || typeof rawStatus !== 'string') {
    return 'online';
  }

  const s = rawStatus.trim().toLowerCase();

  // Faulty / Damaged / Broken
  if (
    s.includes('fault') ||
    s.includes('ชำรุด') ||
    s.includes('เสีย') ||
    s.includes('ขัดข้อง') ||
    s.includes('ภาพลาย') ||
    s.includes('ไม่มีสัญญาณ') ||
    s.includes('ดับ') ||
    s.includes('พัง') ||
    s.includes('error') ||
    s.includes('defect')
  ) {
    return 'faulty';
  }

  // Maintenance / Under Repair
  if (
    s.includes('maint') ||
    s.includes('repair') ||
    s.includes('ซ่อม') ||
    s.includes('รอซ่อม') ||
    s.includes('ปรับปรุง') ||
    s.includes('ตรวจเช็ค') ||
    s.includes('เช็คระยะ') ||
    s.includes('แก้ไข')
  ) {
    return 'maintenance';
  }

  // Offline / Disconnected
  if (
    s.includes('off') ||
    s.includes('ปิด') ||
    s.includes('ไม่เชื่อมต่อ') ||
    s.includes('หลุด') ||
    s.includes('disconnect') ||
    s.includes('ขาดการติดต่อ')
  ) {
    return 'offline';
  }

  // Online / Normal / Active (Default)
  if (
    s.includes('on') ||
    s.includes('ปกติ') ||
    s.includes('ใช้งานได้') ||
    s.includes('พร้อมใช้งาน') ||
    s.includes('ออนไลน์') ||
    s.includes('ดี') ||
    s.includes('active') ||
    s.includes('ok')
  ) {
    return 'online';
  }

  return 'online';
}

/**
 * Maps raw camera type strings to standard CctvType
 */
export function mapRawTypeToCctvType(rawType?: any): CctvType {
  if (!rawType || typeof rawType !== 'string') {
    return 'bullet';
  }

  const t = rawType.trim().toLowerCase();

  if (t.includes('dome') || t.includes('โดม')) {
    return 'dome';
  }
  if (t.includes('ptz') || t.includes('หมุน') || t.includes('speed')) {
    return 'ptz';
  }
  if (t.includes('360') || t.includes('รอบทิศ') || t.includes('พาโนรามา') || t.includes('fisheye')) {
    return '360_degree';
  }
  if (t.includes('bullet') || t.includes('กระบอก') || t.includes('พัดลม')) {
    return 'bullet';
  }

  return 'bullet';
}

/**
 * Normalizes raw column headers into standard CctvCamera canonical keys.
 * Handles Thai municipal variations including typos like 'จุดติดตั้งตู้ครบคุม'.
 */
export function normalizeCameraHeaderKey(header: string): string {
  // Remove quotes, BOM, extra spaces, underscores, and hyphens for comparison
  const clean = header
    .replace(/^[\uFEFF"'\s]+|["'\s]+$/g, '')
    .toLowerCase()
    .replace(/[\s_\-.]/g, '');

  // 1. จุดติดตั้งตู้ครบคุม / จุดติดตั้งตู้ควบคุม (Explicit prompt requirement)
  if (
    clean.includes('จุดติดตั้งตู้ครบคุม') ||
    clean.includes('จุดติดตั้งตู้ควบคุม') ||
    clean.includes('ตู้ครบคุม') ||
    clean.includes('ตู้ควบคุม') ||
    clean.includes('cabinet') ||
    clean.includes('หมายเลขตู้') ||
    clean.includes('ตู้ที่')
  ) {
    return 'cabinetNumber';
  }

  // 2. รหัสสินทรัพย์ (Explicit prompt requirement)
  if (
    clean === 'รหัสสินทรัพย์' ||
    clean === 'รหัสครุภัณฑ์' ||
    clean === 'รหัสทรัพย์สิน' ||
    clean === 'assetcode' ||
    clean === 'asset' ||
    clean === 'ครุภัณฑ์'
  ) {
    return 'assetCode';
  }

  // 3. สถานะ (Explicit prompt requirement)
  if (
    clean === 'สถานะ' ||
    clean === 'สถานะการใช้งาน' ||
    clean === 'สภาพ' ||
    clean === 'สภาพการใช้งาน' ||
    clean === 'status' ||
    clean === 'cctvstatus' ||
    clean === 'condition'
  ) {
    return 'status';
  }

  // 4. ช่องสัญญาณ
  if (
    clean === 'ช่องสัญญาณ' ||
    clean === 'ช่อง' ||
    clean === 'แชนแนล' ||
    clean === 'channel' ||
    clean === 'ch'
  ) {
    return 'channel';
  }

  // 5. รหัสสินทรัพย์ในระบบ / รหัสระบบ
  if (
    clean.includes('รหัสในระบบ') ||
    clean.includes('รหัสสินทรัพย์ในระบบ') ||
    clean.includes('systemasset') ||
    clean.includes('systemcode')
  ) {
    return 'systemAssetCode';
  }

  // 6. ชื่อสินทรัพย์ / รายการสินทรัพย์
  if (
    clean.includes('ชื่อสินทรัพย์') ||
    clean.includes('รายการสินทรัพย์') ||
    clean.includes('assetname')
  ) {
    return 'assetName';
  }

  // 7. ชื่อกล้อง / จุดติดตั้ง / สถานที่ติดตั้ง
  if (
    clean.includes('ชื่อจุดติดตั้ง') ||
    clean.includes('จุดติดตั้ง') ||
    clean.includes('สถานที่ติดตั้ง') ||
    clean.includes('ชื่อกล้อง') ||
    clean.includes('บริเวณที่ติดตั้ง') ||
    clean === 'name' ||
    clean === 'cameraname' ||
    clean === 'location' ||
    clean === 'locationname'
  ) {
    return 'name';
  }

  // 8. ชุมชน
  if (
    clean.includes('ชุมชน') ||
    clean === 'community'
  ) {
    return 'community';
  }

  // 9. อาคาร / เทศบาล
  if (
    clean.includes('อาคาร') ||
    clean.includes('เทศบาล') ||
    clean === 'building'
  ) {
    return 'building';
  }

  // 10. ชั้น / บริเวณ
  if (
    clean.includes('ชั้น') ||
    clean.includes('บริเวณ') ||
    clean.includes('ถนน') ||
    clean === 'floor' ||
    clean === 'area'
  ) {
    return 'floor';
  }

  // 11. โซน / เขต
  if (
    clean.includes('โซน') ||
    clean.includes('เขต') ||
    clean === 'zone'
  ) {
    return 'zone';
  }

  // 12. กลุ่มโครงข่าย / กลุ่ม NVR
  if (
    clean.includes('กลุ่มโครงข่าย') ||
    clean.includes('กลุ่มnvr') ||
    clean.includes('ชุดcctv') ||
    clean.includes('ชุด') ||
    clean === 'nvrgroup'
  ) {
    return 'nvrGroup';
  }

  // 13. ประเภทกล้อง / ชนิดกล้อง
  if (
    clean.includes('ประเภทกล้อง') ||
    clean.includes('ชนิดกล้อง') ||
    clean.includes('ประเภท') ||
    clean === 'type' ||
    clean === 'cameratype'
  ) {
    return 'type';
  }

  // 14. ความละเอียด
  if (
    clean.includes('ความละเอียด') ||
    clean === 'resolution'
  ) {
    return 'resolution';
  }

  // 15. IP Address
  if (
    clean.includes('ipaddress') ||
    clean === 'ip' ||
    clean.includes('ไอพี') ||
    clean.includes('หมายเลขip')
  ) {
    return 'ipAddress';
  }

  // 16. Serial Number
  if (
    clean.includes('serialnumber') ||
    clean.includes('serial') ||
    clean === 'sn' ||
    clean === 's/n' ||
    clean.includes('หมายเลขเครื่อง')
  ) {
    return 'serialNumber';
  }

  // 17. รุ่น / โมเดล
  if (
    clean.includes('รุ่น') ||
    clean.includes('โมเดล') ||
    clean === 'model'
  ) {
    return 'model';
  }

  // 18. วันที่ตรวจเช็ค / ตรวจเช็กล่าสุด
  if (
    clean.includes('ตรวจเช็ค') ||
    clean.includes('ตรวจเช็ก') ||
    clean.includes('lastmaintenance') ||
    clean.includes('วันที่ตรวจ')
  ) {
    return 'lastMaintenance';
  }

  // 19. วันที่ติดตั้ง
  if (
    clean.includes('วันที่ติดตั้ง') ||
    clean.includes('ติดตั้งเมื่อ') ||
    clean.includes('installeddate') ||
    clean.includes('installdate')
  ) {
    return 'installedDate';
  }

  // 20. ละติจูด
  if (
    clean.includes('ละติจูด') ||
    clean === 'latitude' ||
    clean === 'lat'
  ) {
    return 'latitude';
  }

  // 21. ลองจิจูด
  if (
    clean.includes('ลองจิจูด') ||
    clean === 'longitude' ||
    clean === 'lng' ||
    clean === 'lon' ||
    clean === 'long'
  ) {
    return 'longitude';
  }

  // 22. หมายเหตุ / อาการชำรุด
  if (
    clean.includes('หมายเหตุ') ||
    clean.includes('อาการชำรุด') ||
    clean.includes('รายละเอียด') ||
    clean === 'notes' ||
    clean === 'note' ||
    clean === 'remark'
  ) {
    return 'notes';
  }

  // 23. ผู้ตรวจสอบ
  if (
    clean.includes('ผู้ตรวจสอบ') ||
    clean.includes('ผู้ตรวจ') ||
    clean === 'inspector'
  ) {
    return 'inspector';
  }

  // 24. ID / ลำดับ
  if (
    clean === 'id' ||
    clean === 'ลำดับ' ||
    clean === 'ที่' ||
    clean === 'no' ||
    clean === 'ลำดับที่'
  ) {
    return 'id';
  }

  return header.trim();
}

/**
 * Splits a CSV text into an array of rows and columns,
 * correctly handling quoted values, inner commas, escaped quotes, and newlines.
 */
export function parseCsvLines(csvText: string): string[][] {
  if (!csvText || !csvText.trim()) return [];

  // Remove UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // Skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      // Line break
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of \r\n
      }
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  // Push trailing value/row
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Clean cabinet number string
 * e.g., 'ตู้ 1', 'ตู้ที่ 6', '  03  ' -> '1', '6', '3' or clean label
 */
export function cleanCabinetNumber(raw?: string): string {
  if (!raw) return '';
  const str = String(raw).trim();
  // If it contains a number, extract it if prefixed with ตู้
  const match = str.match(/ตู้(?:ควบคุม)?(?:ที่)?\s*(\d+)/i);
  if (match) {
    return match[1];
  }
  return str;
}

/**
 * Maps a single parsed row object (with raw or canonical keys)
 * into a standard, fully-typed CctvCamera object structure.
 */
export function mapCctvCameraRow(
  rawRow: Record<string, any>,
  rowIndex = 0,
  options: CctvCameraParserOptions = {}
): CctvCamera {
  // Normalize row keys to canonical names
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeCameraHeaderKey(key);
    row[normalizedKey] = value !== undefined && value !== null ? String(value).trim() : '';
  }

  // 1. จุดติดตั้งตู้ครบคุม / cabinetNumber
  const cabinetNumber = cleanCabinetNumber(row.cabinetNumber || row['จุดติดตั้งตู้ครบคุม'] || row['จุดติดตั้งตู้ควบคุม']);

  // 2. รหัสสินทรัพย์ / assetCode
  const assetCode = row.assetCode || row['รหัสสินทรัพย์'] || row['รหัสครุภัณฑ์'] || '';

  // 3. สถานะ / status
  const rawStatus = row.status || row['สถานะ'] || row['สถานะการใช้งาน'] || 'online';
  const status: CctvStatus = mapRawStatusToCctvStatus(rawStatus);

  // 4. ช่องสัญญาณ / channel
  let channel = row.channel || row['ช่องสัญญาณ'] || row['ช่อง'] || '';
  if (channel && !channel.toUpperCase().startsWith('CH') && /^\d+$/.test(channel)) {
    channel = `CH${channel}`;
  }

  // 5. รหัสในระบบ / systemAssetCode
  const systemAssetCode = row.systemAssetCode || row['รหัสสินทรัพย์ในระบบ'] || undefined;

  // 6. ชื่อสินทรัพย์ / assetName
  const assetName = row.assetName || row['ชื่อสินทรัพย์'] || undefined;

  // 7. ชื่อกล้อง / จุดติดตั้ง
  const name =
    row.name ||
    row['จุดติดตั้ง'] ||
    row['ชื่อจุดติดตั้ง'] ||
    row['สถานที่ติดตั้ง'] ||
    (cabinetNumber && channel ? `กล้องตู้ ${cabinetNumber} (${channel})` : `กล้องวงจรปิด ${assetCode || rowIndex + 1}`);

  // 8. ชุมชน / community
  const community = row.community || row['ชุมชน'] || options.defaultCommunity || 'เขตเทศบาล';

  // 9. อาคาร / building
  const building =
    row.building ||
    row['อาคาร'] ||
    options.defaultBuilding ||
    (community !== 'เขตเทศบาล' ? community : 'เขตเทศบาลเมืองชัยภูมิ');

  // 10. ชั้น / บริเวณ / floor
  const floor = row.floor || row['บริเวณ'] || row['ชั้น'] || (cabinetNumber ? `บริเวณตู้ ${cabinetNumber}` : 'ภายนอกอาคาร');

  // 11. โซน / zone
  const zone =
    row.zone ||
    row['โซน'] ||
    (cabinetNumber ? `ตู้ควบคุมที่ ${cabinetNumber}` : community !== 'เขตเทศบาล' ? community : 'เขตเทศบาล');

  // 12. กลุ่มโครงข่าย / NVR
  const nvrGroup =
    row.nvrGroup ||
    row['กลุ่มโครงข่าย'] ||
    row['กลุ่ม NVR'] ||
    (cabinetNumber
      ? parseInt(cabinetNumber, 10) <= 5
        ? 'CCTV 1 (ตู้ 1-5)'
        : parseInt(cabinetNumber, 10) <= 13
        ? 'CCTV 2 (ตู้ 6-13)'
        : `CCTV ตู้ ${cabinetNumber}`
      : undefined);

  // 13. ประเภทกล้อง / type
  const type: CctvType = mapRawTypeToCctvType(row.type || row['ประเภท'] || row['ชนิดกล้อง']);

  // 14. ความละเอียด / resolution
  const resolution = row.resolution || row['ความละเอียด'] || options.defaultResolution || '1080p Full HD';

  // 15. IP Address
  const ipAddress = row.ipAddress || row['IP'] || (cabinetNumber ? `192.168.${cabinetNumber}.${10 + (rowIndex % 240)}` : `192.168.10.${11 + (rowIndex % 240)}`);

  // 16. Serial Number
  const serialNumber = row.serialNumber || row['Serial Number'] || assetCode || `SN-${Date.now()}-${rowIndex + 1}`;

  // 17. ID
  let id = row.id;
  if (!id || options.overrideExistingIds) {
    if (cabinetNumber && channel) {
      id = `CCTV-CAB${cabinetNumber}-${channel.replace(/\s+/g, '')}`;
    } else if (assetCode) {
      id = `CCTV-${assetCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    } else {
      id = `CCTV-${String(rowIndex + 1).padStart(3, '0')}`;
    }
  }

  // 18. รุ่น / model
  const model = row.model || undefined;

  // 19. วันที่ตรวจเช็ค / lastMaintenance
  const lastMaintenance = normalizeDateStringToIso(row.lastMaintenance || row['วันที่ตรวจเช็ค']);

  // 20. วันที่ติดตั้ง / installedDate
  const installedDate = normalizeDateStringToIso(row.installedDate || row['วันที่ติดตั้ง'] || '2023-01-01');

  // 21. GPS Coordinates (Latitude, Longitude, and SVG map coordinates)
  const rawLat = parseFloat(row.latitude || row['ละติจูด'] || '');
  const rawLng = parseFloat(row.longitude || row['ลองจิจูด'] || '');
  const latitude = !isNaN(rawLat) ? rawLat : undefined;
  const longitude = !isNaN(rawLng) ? rawLng : undefined;
  const coordinates = gpsToSvgCoords(latitude, longitude);

  // 22. หมายเหตุ / notes
  const notes = row.notes || row['หมายเหตุ'] || (status === 'online' ? 'ใช้งานได้ปกติ' : undefined);

  // 23. ผู้ตรวจสอบ / inspector
  const inspector = row.inspector || row['ผู้ตรวจสอบ'] || options.fallbackInspector || 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV';

  const camera: CctvCamera = {
    id,
    name,
    building,
    floor,
    zone,
    type,
    resolution,
    ipAddress,
    serialNumber,
    status,
    lastMaintenance,
    installedDate,
    coordinates,
    // Optional / Municipal fields
    cabinetNumber: cabinetNumber || undefined,
    channel: channel || undefined,
    systemAssetCode,
    assetCode: assetCode || undefined,
    assetName,
    community: community || undefined,
    nvrGroup: nvrGroup || undefined,
    model,
    latitude,
    longitude,
    notes,
    inspector
  };

  return camera;
}

/**
 * Main parser function that ingests raw CSV text and transforms it into
 * standard CctvCamera objects with comprehensive column mapping and error tracking.
 *
 * @param csvText The raw CSV string content
 * @param options Configurable default values and overrides
 * @returns CctvCameraParseResult containing parsed cameras, summary stats, and error log
 */
export function parseCctvCameraCsvData(
  csvText: string,
  options: CctvCameraParserOptions = {}
): CctvCameraParseResult {
  const lines = parseCsvLines(csvText);

  if (lines.length === 0) {
    return {
      cameras: [],
      validCameras: [],
      invalidRows: [],
      validatedRows: [],
      validationSummary: {
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        warningRowsCount: 0,
        missingAssetIdCount: 0,
        missingLocationCount: 0,
        duplicateCount: 0,
        isAllValid: true
      },
      totalRows: 0,
      successCount: 0,
      skippedCount: 0,
      errors: [{ row: 0, reason: 'ไฟล์ CSV ไม่มีข้อมูลหรือว่างเปล่า' }],
      summary: {
        onlineCount: 0,
        faultyCount: 0,
        maintenanceCount: 0,
        offlineCount: 0,
        byCabinet: {},
        byCommunity: {},
        byType: {}
      }
    };
  }

  // Header row
  const rawHeaders = lines[0];
  const canonicalHeaders = rawHeaders.map((h) => normalizeCameraHeaderKey(h));

  const cameras: CctvCamera[] = [];
  const rawValidatedRows: ValidatedCctvCameraRow[] = [];
  const errors: { row: number; reason: string; rawData?: Record<string, any> }[] = [];

  let onlineCount = 0;
  let faultyCount = 0;
  let maintenanceCount = 0;
  let offlineCount = 0;
  const byCabinet: Record<string, number> = {};
  const byCommunity: Record<string, number> = {};
  const byType: Record<string, number> = {};

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const rowValues = lines[i];

    // Skip empty lines
    if (rowValues.length === 0 || rowValues.every((val) => !val)) {
      continue;
    }

    try {
      const rowObj: Record<string, string> = {};
      canonicalHeaders.forEach((canonicalKey, colIdx) => {
        rowObj[canonicalKey] = rowValues[colIdx] || '';
        // Also keep raw header key just in case
        const rawKey = rawHeaders[colIdx];
        if (rawKey && !rowObj[rawKey]) {
          rowObj[rawKey] = rowValues[colIdx] || '';
        }
      });

      const camera = mapCctvCameraRow(rowObj, i, options);
      const rowValidation = validateCctvCameraRow(camera, rowObj, i - 1);
      rawValidatedRows.push(rowValidation);

      // Validate camera integrity
      if (!camera.name && !camera.assetCode && !camera.id) {
        errors.push({
          row: i + 1,
          reason: 'ไม่พบข้อมูลที่ระบุตัวตนของกล้อง (ชื่อ, รหัสสินทรัพย์ หรือรหัสกล้อง)',
          rawData: rowObj
        });
        continue;
      }

      cameras.push(camera);

      // Aggregate statistics
      if (camera.status === 'online') onlineCount++;
      else if (camera.status === 'faulty') faultyCount++;
      else if (camera.status === 'maintenance') maintenanceCount++;
      else if (camera.status === 'offline') offlineCount++;

      const cab = camera.cabinetNumber || 'ไม่ระบุตู้';
      byCabinet[cab] = (byCabinet[cab] || 0) + 1;

      const comm = camera.community || 'เขตเทศบาล';
      byCommunity[comm] = (byCommunity[comm] || 0) + 1;

      byType[camera.type] = (byType[camera.type] || 0) + 1;
    } catch (err: any) {
      errors.push({
        row: i + 1,
        reason: err.message || 'เกิดข้อผิดพลาดในการแปลงแถวข้อมูล',
        rawData: { rowValues }
      });
    }
  }

  // Execute batch validation and duplicate detection
  const batchValidation = validateCctvCameraBatch(rawValidatedRows);

  return {
    cameras,
    validCameras: batchValidation.validCameras,
    invalidRows: batchValidation.invalidRows,
    validatedRows: batchValidation.rows,
    validationSummary: batchValidation.summary,
    totalRows: lines.length - 1,
    successCount: batchValidation.validCameras.length,
    skippedCount: batchValidation.invalidRows.length + errors.length,
    errors,
    summary: {
      onlineCount,
      faultyCount,
      maintenanceCount,
      offlineCount,
      byCabinet,
      byCommunity,
      byType
    }
  };
}

/**
 * Generates sample CSV text conforming to standard municipal camera data headers
 * including 'จุดติดตั้งตู้ครบคุม', 'รหัสสินทรัพย์', 'สถานะ' for quick import and testing.
 */
export function generateSampleCctvCameraCsv(): string {
  const sampleHeaders = [
    'ลำดับ',
    'จุดติดตั้งตู้ครบคุม',
    'ช่องสัญญาณ',
    'จุดติดตั้ง',
    'รหัสสินทรัพย์ในระบบ',
    'รหัสสินทรัพย์',
    'ชื่อสินทรัพย์',
    'สถานะ',
    'ประเภท',
    'ชุมชน',
    'ละติจูด',
    'ลองจิจูด',
    'หมายเหตุ'
  ];

  const sampleRows = [
    [
      '1',
      '1',
      'CH1',
      'สี่แยกบายพาสส่องไปสี่แยกขี้เหล็กใหญ่',
      '404-641123-00032',
      '452-59-0159',
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ใช้งานได้',
      'bullet',
      'เขตเทศบาล',
      '15.82850',
      '102.04350',
      'กล้องพร้อมพัดลมระบายอากาศ ใช้งานได้ปกติ'
    ],
    [
      '2',
      '1',
      'CH2',
      'สี่แยกบายพาสส่องเข้าเมือง',
      '404-641123-00033',
      '452-59-0160',
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ใช้งานได้',
      'bullet',
      'เขตเทศบาล',
      '15.82820',
      '102.04320',
      'กล้องพร้อมพัดลมระบายอากาศ ใช้งานได้ปกติ'
    ],
    [
      '3',
      '6',
      'CH1',
      'สี่แยกโรงเรียนชัยภูมิภักดีชุมพล',
      '404-641123-00050',
      '452-59-0210',
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ชำรุด',
      'bullet',
      'เขตเทศบาล',
      '15.81420',
      '102.02380',
      'สัญญาณภาพขัดข้อง รอเจ้าหน้าที่เข้าตรวจสอบ'
    ],
    [
      '4',
      '16',
      'CH1',
      'ปากทางเข้าชุมชนโคกน้อย ถนนคนเดิน',
      '404-670124-0001',
      '452-67-0124-8-0001',
      'กล้องวงจรปิด CCTV เฝ้าระวังชุมชน',
      'ใช้งานได้',
      'dome',
      'ชุมชนโคกน้อย',
      '15.80380',
      '102.01950',
      'ระบบออนไลน์ เฝ้าระวังความปลอดภัยชุมชน'
    ]
  ];

  const escapeCol = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const headerLine = sampleHeaders.map(escapeCol).join(',');
  const rowLines = sampleRows.map((r) => r.map(escapeCol).join(',')).join('\n');

  return `${headerLine}\n${rowLines}`;
}

/**
 * Generates a sample CSV with intentional missing mandatory fields (missing Asset ID, missing Location)
 * and warnings to test and demonstrate the data validation utility and error highlighting in the OfficerPortal.
 */
export function generateSampleCctvCameraCsvWithErrors(): string {
  const sampleHeaders = [
    'ลำดับ',
    'จุดติดตั้งตู้ครบคุม',
    'ช่องสัญญาณ',
    'จุดติดตั้ง',
    'รหัสสินทรัพย์ในระบบ',
    'รหัสสินทรัพย์',
    'ชื่อสินทรัพย์',
    'สถานะ',
    'ประเภท',
    'ชุมชน',
    'ละติจูด',
    'ลองจิจูด',
    'หมายเหตุ'
  ];

  const sampleRows = [
    [
      '1',
      '1',
      'CH1',
      'สี่แยกบายพาสส่องไปสี่แยกขี้เหล็กใหญ่',
      '404-641123-00032',
      '452-59-0159',
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ใช้งานได้',
      'bullet',
      'เขตเทศบาล',
      '15.82850',
      '102.04350',
      'ข้อมูลสมบูรณ์ ผ่านเกณฑ์การตรวจสอบ'
    ],
    [
      '2',
      '1',
      'CH2',
      'สี่แยกบายพาสส่องเข้าเมือง (หน้าปั๊ม ปตท.)',
      '',
      '', // MISSING MANDATORY ASSET ID
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ใช้งานได้',
      'bullet',
      'เขตเทศบาล',
      '15.82820',
      '102.04320',
      'ตัวอย่าง: ขาดรหัสสินทรัพย์ (Asset ID Missing)'
    ],
    [
      '3',
      '6',
      'CH1',
      '', // MISSING MANDATORY LOCATION
      '404-641123-00050',
      '452-59-0210',
      'กล้องพร้อมพัดลมระบายอากาศ',
      'ชำรุด',
      'bullet',
      'เขตเทศบาล',
      '15.81420',
      '102.02380',
      'ตัวอย่าง: ขาดจุดติดตั้ง (Location Missing)'
    ],
    [
      '4',
      '8',
      'CH3',
      '-', // PLACEHOLDER LOCATION
      '',
      '-', // PLACEHOLDER ASSET ID
      'กล้องวงจรปิด CCTV',
      'ชำรุด',
      'dome',
      'เขตเทศบาล',
      '15.81000',
      '102.02000',
      'ตัวอย่าง: ขาดทั้งรหัสสินทรัพย์และจุดติดตั้ง (Both Missing)'
    ],
    [
      '5',
      '16',
      'CH1',
      'ปากทางเข้าชุมชนโคกน้อย ถนนคนเดิน',
      '404-670124-0001',
      '452-67-0124-8-0001',
      'กล้องวงจรปิด CCTV เฝ้าระวังชุมชน',
      'ใช้งานได้',
      'dome',
      'ชุมชนโคกน้อย',
      '15.80380',
      '102.01950',
      'ข้อมูลสมบูรณ์ ผ่านเกณฑ์การตรวจสอบ'
    ]
  ];

  const escapeCol = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const headerLine = sampleHeaders.map(escapeCol).join(',');
  const rowLines = sampleRows.map((r) => r.map(escapeCol).join(',')).join('\n');

  return `${headerLine}\n${rowLines}`;
}

