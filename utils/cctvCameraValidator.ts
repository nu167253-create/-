import { CctvCamera, CctvStatus } from '../types/cctv';
import { normalizeCameraHeaderKey, cleanCabinetNumber } from './cctvCameraParser';

/**
 * Severity level for validation issues
 */
export type CctvValidationSeverity = 'error' | 'warning';

/**
 * Standard validation error/warning codes
 */
export type CctvValidationCode =
  | 'MISSING_ASSET_ID'
  | 'MISSING_LOCATION'
  | 'INVALID_ASSET_ID_FORMAT'
  | 'DUPLICATE_ASSET_ID'
  | 'DUPLICATE_CHANNEL_IN_CABINET'
  | 'UNKNOWN_STATUS'
  | 'INVALID_GPS_COORDINATES'
  | 'INVALID_IP_ADDRESS'
  | 'MALFORMED_DATA';

/**
 * Detail of a single validation issue
 */
export interface CctvFieldValidationIssue {
  field: 'assetCode' | 'name' | 'cabinetNumber' | 'channel' | 'status' | 'coordinates' | 'ipAddress' | 'other';
  fieldNameThai: string;
  severity: CctvValidationSeverity;
  code: CctvValidationCode;
  message: string;
  value?: any;
}

/**
 * Validation result for an individual CSV row
 */
export interface ValidatedCctvCameraRow {
  rowIndex: number; // 0-based data row index
  csvLineNumber: number; // 1-based CSV line number (line 1 is header)
  camera: CctvCamera;
  rawRow: Record<string, any>;
  isValid: boolean; // true if 0 severity === 'error'
  hasWarnings: boolean;
  errors: CctvFieldValidationIssue[];
  warnings: CctvFieldValidationIssue[];
  missingFields: {
    assetId: boolean;
    location: boolean;
    cabinet: boolean;
    status: boolean;
  };
}

/**
 * Aggregated summary of validation results across a CSV batch
 */
export interface CctvValidationSummary {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  warningRowsCount: number;
  missingAssetIdCount: number;
  missingLocationCount: number;
  duplicateCount: number;
  isAllValid: boolean;
}

/**
 * Helper to determine if a value is a placeholder or effectively empty
 */
export function isPlaceholderValue(val?: string | null): boolean {
  if (val === undefined || val === null) return true;
  const str = String(val).trim();
  if (str === '') return true;

  const placeholders = [
    '-',
    '--',
    '---',
    'n/a',
    'na',
    'none',
    'null',
    'undefined',
    'ไม่มี',
    'ไม่ระบุ',
    'ไม่ทราบ',
    'ว่าง',
    '?',
    '*',
    '0'
  ];

  return placeholders.includes(str.toLowerCase());
}

/**
 * Validates a single CCTV camera row against mandatory and advisory business rules.
 * Mandatory requirements for municipal registry ingestion:
 *  1. Asset ID (รหัสสินทรัพย์ / รหัสครุภัณฑ์) - Must be present and non-empty
 *  2. Location (จุดติดตั้ง / สถานที่ติดตั้ง / ชื่อกล้อง) - Must be present and non-empty
 */
export function validateCctvCameraRow(
  camera: CctvCamera,
  rawRow: Record<string, any>,
  rowIndex: number
): ValidatedCctvCameraRow {
  const errors: CctvFieldValidationIssue[] = [];
  const warnings: CctvFieldValidationIssue[] = [];

  // Extract raw input values for exact inspection
  const rawAssetCode =
    rawRow['assetCode'] ||
    rawRow['รหัสสินทรัพย์'] ||
    rawRow['รหัสครุภัณฑ์'] ||
    rawRow['รหัสสินทรัพย์ในระบบ'] ||
    rawRow['serialNumber'] ||
    rawRow['Serial Number'] ||
    '';

  const rawLocation =
    rawRow['name'] ||
    rawRow['จุดติดตั้ง'] ||
    rawRow['ชื่อจุดติดตั้ง'] ||
    rawRow['สถานที่ติดตั้ง'] ||
    rawRow['บริเวณที่ติดตั้ง'] ||
    rawRow['location'] ||
    '';

  const rawStatus =
    rawRow['status'] ||
    rawRow['สถานะ'] ||
    rawRow['สถานะการใช้งาน'] ||
    '';

  const rawCabinet =
    rawRow['cabinetNumber'] ||
    rawRow['จุดติดตั้งตู้ครบคุม'] ||
    rawRow['จุดติดตั้งตู้ควบคุม'] ||
    '';

  // 1. Check Mandatory Field: Asset ID (รหัสสินทรัพย์)
  const isAssetIdMissing = isPlaceholderValue(rawAssetCode) && isPlaceholderValue(camera.assetCode);
  if (isAssetIdMissing) {
    errors.push({
      field: 'assetCode',
      fieldNameThai: 'รหัสสินทรัพย์ (Asset ID)',
      severity: 'error',
      code: 'MISSING_ASSET_ID',
      message: 'ไม่พบรหัสสินทรัพย์ (Asset ID) ซึ่งเป็นข้อมูลจำเป็นบังคับในการลงทะเบียนกล้อง CCTV',
      value: rawAssetCode || camera.assetCode
    });
  } else {
    // If provided, ensure it's not a generic single digit or obviously malformed
    const assetStr = String(camera.assetCode || rawAssetCode).trim();
    if (assetStr.length < 3) {
      warnings.push({
        field: 'assetCode',
        fieldNameThai: 'รหัสสินทรัพย์ (Asset ID)',
        severity: 'warning',
        code: 'INVALID_ASSET_ID_FORMAT',
        message: `รหัสสินทรัพย์ "${assetStr}" สั้นผิดปกติ ควรตรวจสอบความถูกต้อง`,
        value: assetStr
      });
    }
  }

  // 2. Check Mandatory Field: Location (จุดติดตั้ง/สถานที่ติดตั้ง)
  const isLocationMissing = isPlaceholderValue(rawLocation) || (
    // If raw location was empty, mapCctvCameraRow generated a fallback like "กล้องตู้ X" or "กล้องวงจรปิด Y"
    !rawLocation && !camera.name
  );

  if (isLocationMissing) {
    errors.push({
      field: 'name',
      fieldNameThai: 'จุดติดตั้ง/สถานที่ (Location)',
      severity: 'error',
      code: 'MISSING_LOCATION',
      message: 'ไม่พบข้อมูลจุดติดตั้งหรือสถานที่ติดตั้ง (Location) ซึ่งเป็นข้อมูลจำเป็นบังคับ',
      value: rawLocation
    });
  }

  // 3. Advisory Check: Status
  let isStatusMissing = false;
  if (!rawStatus || isPlaceholderValue(rawStatus)) {
    isStatusMissing = true;
    warnings.push({
      field: 'status',
      fieldNameThai: 'สถานะการใช้งาน (Status)',
      severity: 'warning',
      code: 'UNKNOWN_STATUS',
      message: 'ไม่ระบุสถานะในไฟล์ ระบบจะกำหนดสถานะเริ่มต้นเป็น "ออนไลน์ (Online)"',
      value: rawStatus
    });
  }

  // 4. Advisory Check: Control Cabinet
  const isCabinetMissing = isPlaceholderValue(rawCabinet);
  if (isCabinetMissing && !camera.cabinetNumber) {
    warnings.push({
      field: 'cabinetNumber',
      fieldNameThai: 'จุดติดตั้งตู้ควบคุม (Cabinet)',
      severity: 'warning',
      code: 'MALFORMED_DATA',
      message: 'ไม่ได้ระบุหมายเลขตู้ควบคุม (อาจเป็นกล้องเดี่ยวหรือกล้องประจำสำนักงาน)',
      value: rawCabinet
    });
  }

  // 5. Advisory Check: Coordinates (GPS Latitude / Longitude)
  if (camera.latitude !== undefined || camera.longitude !== undefined) {
    const lat = camera.latitude;
    const lng = camera.longitude;
    const hasValidNumbers =
      lat !== undefined &&
      lng !== undefined &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (!hasValidNumbers) {
      warnings.push({
        field: 'coordinates',
        fieldNameThai: 'พิกัด GPS',
        severity: 'warning',
        code: 'INVALID_GPS_COORDINATES',
        message: `พิกัด GPS ไม่อยู่ในเกณฑ์มาตรฐาน (Lat: ${lat}, Lng: ${lng})`,
        value: { lat, lng }
      });
    } else {
      // Check if coordinate is in general vicinity of Thailand (Lat 5.5 - 20.5, Lng 97.0 - 106.0)
      if (lat < 5.5 || lat > 20.5 || lng < 97.0 || lng > 106.0) {
        warnings.push({
          field: 'coordinates',
          fieldNameThai: 'พิกัด GPS',
          severity: 'warning',
          code: 'INVALID_GPS_COORDINATES',
          message: `พิกัด GPS (${lat.toFixed(4)}, ${lng.toFixed(4)}) อยู่นอกพื้นที่ประเทศไทย`,
          value: { lat, lng }
        });
      }
    }
  }

  // 6. Advisory Check: IP Address format
  if (camera.ipAddress) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(camera.ipAddress.trim())) {
      warnings.push({
        field: 'ipAddress',
        fieldNameThai: 'IP Address',
        severity: 'warning',
        code: 'INVALID_IP_ADDRESS',
        message: `รูปแบบ IP Address "${camera.ipAddress}" ไม่ถูกต้องตามมาตรฐาน IPv4`,
        value: camera.ipAddress
      });
    }
  }

  const isValid = errors.length === 0;

  return {
    rowIndex,
    csvLineNumber: rowIndex + 2, // header is line 1
    camera,
    rawRow,
    isValid,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    missingFields: {
      assetId: isAssetIdMissing,
      location: isLocationMissing,
      cabinet: isCabinetMissing,
      status: isStatusMissing
    }
  };
}

/**
 * Validates a batch of parsed CCTV cameras and checks cross-row anomalies like duplicates
 */
export function validateCctvCameraBatch(
  validatedRows: ValidatedCctvCameraRow[]
): {
  rows: ValidatedCctvCameraRow[];
  validCameras: CctvCamera[];
  invalidRows: ValidatedCctvCameraRow[];
  summary: CctvValidationSummary;
} {
  const assetIdMap = new Map<string, number[]>(); // assetCode -> rowIndexes
  const cabinetChannelMap = new Map<string, number[]>(); // cabinet_channel -> rowIndexes

  // First pass: track occurrences of assetCodes and cabinet+channel
  validatedRows.forEach((item) => {
    const asset = item.camera.assetCode?.trim();
    if (asset && !isPlaceholderValue(asset)) {
      const existing = assetIdMap.get(asset) || [];
      existing.push(item.rowIndex);
      assetIdMap.set(asset, existing);
    }

    const cab = item.camera.cabinetNumber?.trim();
    const ch = item.camera.channel?.trim();
    if (cab && ch) {
      const key = `${cab}_${ch.toUpperCase()}`;
      const existing = cabinetChannelMap.get(key) || [];
      existing.push(item.rowIndex);
      cabinetChannelMap.set(key, existing);
    }
  });

  let duplicateCount = 0;

  // Second pass: append duplicate warnings
  const enrichedRows = validatedRows.map((item) => {
    const itemErrors = [...item.errors];
    const itemWarnings = [...item.warnings];

    const asset = item.camera.assetCode?.trim();
    if (asset && (assetIdMap.get(asset)?.length || 0) > 1) {
      const otherRows = (assetIdMap.get(asset) || [])
        .filter((r) => r !== item.rowIndex)
        .map((r) => `แถวที่ ${r + 1}`)
        .join(', ');

      itemWarnings.push({
        field: 'assetCode',
        fieldNameThai: 'รหัสสินทรัพย์ (Asset ID)',
        severity: 'warning',
        code: 'DUPLICATE_ASSET_ID',
        message: `รหัสสินทรัพย์ซ้ำกับข้อมูลในไฟล์ (${otherRows})`,
        value: asset
      });
      duplicateCount++;
    }

    const cab = item.camera.cabinetNumber?.trim();
    const ch = item.camera.channel?.trim();
    if (cab && ch) {
      const key = `${cab}_${ch.toUpperCase()}`;
      if ((cabinetChannelMap.get(key)?.length || 0) > 1) {
        const otherRows = (cabinetChannelMap.get(key) || [])
          .filter((r) => r !== item.rowIndex)
          .map((r) => `แถวที่ ${r + 1}`)
          .join(', ');

        itemWarnings.push({
          field: 'channel',
          fieldNameThai: 'ช่องสัญญาณในตู้',
          severity: 'warning',
          code: 'DUPLICATE_CHANNEL_IN_CABINET',
          message: `พบช่องสัญญาณ ${ch} ในตู้ที่ ${cab} ซ้ำกับข้อมูลในไฟล์ (${otherRows})`,
          value: key
        });
      }
    }

    const isValid = itemErrors.length === 0;

    return {
      ...item,
      errors: itemErrors,
      warnings: itemWarnings,
      isValid,
      hasWarnings: itemWarnings.length > 0
    };
  });

  const validCameras: CctvCamera[] = [];
  const invalidRows: ValidatedCctvCameraRow[] = [];
  let missingAssetIdCount = 0;
  let missingLocationCount = 0;
  let warningRowsCount = 0;

  enrichedRows.forEach((r) => {
    if (r.isValid) {
      validCameras.push(r.camera);
    } else {
      invalidRows.push(r);
    }

    if (r.missingFields.assetId) missingAssetIdCount++;
    if (r.missingFields.location) missingLocationCount++;
    if (r.hasWarnings) warningRowsCount++;
  });

  const summary: CctvValidationSummary = {
    totalRows: enrichedRows.length,
    validRowsCount: validCameras.length,
    invalidRowsCount: invalidRows.length,
    warningRowsCount,
    missingAssetIdCount,
    missingLocationCount,
    duplicateCount,
    isAllValid: invalidRows.length === 0
  };

  return {
    rows: enrichedRows,
    validCameras,
    invalidRows,
    summary
  };
}
