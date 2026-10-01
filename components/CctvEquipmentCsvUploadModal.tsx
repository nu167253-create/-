import React, { useState, useRef, useMemo } from 'react';
import { CctvEquipmentItem } from '../types/cctv';
import { getStoredCctvEquipment, saveCctvEquipment } from '../data/cctvData';
import { bulkUpdateCctvEquipmentToFirestore, fetchCctvEquipmentFromFirestore } from '../utils/firestoreService';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Tv,
  Database,
  RefreshCw,
  Download,
  FileText,
  Search,
  Check,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface CctvEquipmentCsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
  onSuccess?: (updatedCount: number) => void;
}

// Generate Default CSV text from the municipal dataset for quick loading
const generateDefaultChaiyaphumCsv = (): string => {
  const items = getStoredCctvEquipment();
  const headers = [
    'id',
    'name',
    'equipmentType',
    'communityOrOffice',
    'locationName',
    'systemAssetCode',
    'assetCode',
    'model',
    'status',
    'notes'
  ];

  const escapeCsv = (val?: string) => {
    if (!val) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map(item => [
    escapeCsv(item.id),
    escapeCsv(item.name),
    escapeCsv(item.equipmentType),
    escapeCsv(item.communityOrOffice),
    escapeCsv(item.locationName),
    escapeCsv(item.systemAssetCode || ''),
    escapeCsv(item.assetCode),
    escapeCsv(item.model || ''),
    escapeCsv(item.status),
    escapeCsv(item.notes || '')
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
};

// Robust CSV Line Splitter handling quotes and commas
const parseCsvText = (csvText: string): CctvEquipmentItem[] => {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  // Parse a single line into columns taking quotes into account
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const rawHeaders = parseLine(lines[0]);
  const normalizeKey = (key: string): string => {
    const k = key.toLowerCase().replace(/["'\s_-]/g, '');
    if (k.includes('assetcode') || k.includes('รหัสสินทรัพย์') || k.includes('รหัสครุภัณฑ์')) {
      if (k.includes('system') || k.includes('ระบบ')) return 'systemAssetCode';
      return 'assetCode';
    }
    if (k.includes('systemasset') || k.includes('รหัสในระบบ')) return 'systemAssetCode';
    if (k.includes('type') || k.includes('ประเภท')) return 'equipmentType';
    if (k.includes('community') || k.includes('ชุมชน') || k.includes('หน่วยงาน') || k.includes('office')) return 'communityOrOffice';
    if (k.includes('location') || k.includes('สถานที่') || k.includes('จุดติดตั้ง')) return 'locationName';
    if (k.includes('model') || k.includes('รุ่น')) return 'model';
    if (k.includes('status') || k.includes('สถานะ')) return 'status';
    if (k.includes('note') || k.includes('หมายเหตุ')) return 'notes';
    if (k.includes('name') || k.includes('ชื่อ')) return 'name';
    if (k === 'id' || k.includes('ลำดับ') || k.includes('no')) return 'id';
    return key;
  };

  const headers = rawHeaders.map(normalizeKey);

  const items: CctvEquipmentItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0 || cols.every(c => !c)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] || '';
    });

    const assetCode = rowObj.assetCode || rowObj.id || `AST-${i}`;
    const rawType = (rowObj.equipmentType || '').toUpperCase();
    let equipmentType: CctvEquipmentItem['equipmentType'] = 'NVR';
    if (rawType.includes('TV') || rawType.includes('ทีวี') || rawType.includes('จอ')) {
      equipmentType = 'TV';
    } else if (rawType.includes('SWITCH') || rawType.includes('สวิตช์')) {
      equipmentType = 'SWITCH';
    } else if (rawType.includes('UPS') || rawType.includes('สำรองไฟ')) {
      equipmentType = 'UPS';
    } else if (rawType.includes('CAM') || rawType.includes('กล้อง')) {
      equipmentType = 'CAMERA';
    } else if (rawType.includes('NVR') || rawType.includes('บันทึก')) {
      equipmentType = 'NVR';
    }

    const rawStatus = (rowObj.status || '').toLowerCase();
    let status: 'online' | 'faulty' | 'offline' = 'online';
    if (rawStatus.includes('fault') || rawStatus.includes('ชำรุด') || rawStatus.includes('เสีย') || rawStatus.includes('ซ่อม')) {
      status = 'faulty';
    } else if (rawStatus.includes('off') || rawStatus.includes('ปิด') || rawStatus.includes('ดับ')) {
      status = 'offline';
    }

    const item: CctvEquipmentItem = {
      id: rowObj.id && rowObj.id.trim() ? rowObj.id.trim() : `EQ-${assetCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      name: rowObj.name || `อุปกรณ์ครุภัณฑ์ ${assetCode}`,
      equipmentType,
      communityOrOffice: rowObj.communityOrOffice || 'เทศบาลเมืองชัยภูมิ',
      locationName: rowObj.locationName || 'ศูนย์ควบคุม CCTV',
      systemAssetCode: rowObj.systemAssetCode || undefined,
      assetCode,
      model: rowObj.model || undefined,
      status,
      notes: rowObj.notes || undefined
    };

    items.push(item);
  }

  return items;
};

export const CctvEquipmentCsvUploadModal: React.FC<CctvEquipmentCsvUploadModalProps> = ({
  isOpen,
  onClose,
  adminName = 'Admin',
  onSuccess
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<CctvEquipmentItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    count: number;
    errors?: string[];
  } | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessCsvText = (text: string, name?: string) => {
    setCsvContent(text);
    if (name) setFileName(name);
    try {
      const parsed = parseCsvText(text);
      setParsedItems(parsed);
      setUploadResult(null);
      if (parsed.length > 0) {
        setActiveTab('preview');
      }
    } catch (err: any) {
      alert(`การประมวลผลไฟล์ CSV ผิดพลาด: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      alert('กรุณาเลือกไฟล์รูปแบบ .csv เท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessCsvText(text, file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleLoadPromptDataset = () => {
    const defaultCsv = generateDefaultChaiyaphumCsv();
    handleProcessCsvText(defaultCsv, 'chaiyaphum_cctv_equipment_37_dataset.csv');
  };

  const handleDownloadTemplate = () => {
    const sample = [
      'id,name,equipmentType,communityOrOffice,locationName,systemAssetCode,assetCode,model,status,notes',
      'NVR-TK-01,"เครื่องบันทึกภาพกล้องวงจรปิด CCTV 1 (ตู้ 1-5)",NVR,"สำนักงานเทศกิจ เทศบาลเมืองชัยภูมิ","ห้องศูนย์ควบคุมและสั่งการ CCTV (เทศกิจ)",404-641123-00136,455-59-0006,DS-7616NI-K2,online,"บันทึกภาพกล้อง CH1 - CH16 ปกติ"',
      'TV-COMM-01,"จอแสดงผลสมาร์ททีวี 43 นิ้ว ประจำชุมชนโคกน้อย",TV,ชุมชนโคกน้อย,ที่ทำการชุมชนโคกน้อย,404-670124-001,453-67-0001,Smart TV 43 Inch 4K,online,"ติดตั้งพร้อมใช้งานเฝ้าระวังชุมชน"'
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cctv_equipment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Perform bulk update to Firestore
  const handleBulkUploadToFirestore = async () => {
    if (parsedItems.length === 0) {
      alert('ไม่พบรายการครุภัณฑ์สำหรับนำเข้า');
      return;
    }

    const confirmUpload = window.confirm(
      `คุณยืนยันที่จะนำเข้าและอัปเดตข้อมูลครุภัณฑ์ CCTV จำนวน ${parsedItems.length} รายการ ขึ้นสู่ Cloud Firestore (คอลเลกชัน cctv_equipment) ใช่หรือไม่?`
    );
    if (!confirmUpload) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusMsg('กำลังเชื่อมต่อ Cloud Firestore...');

    try {
      const result = await bulkUpdateCctvEquipmentToFirestore(
        parsedItems,
        adminName,
        (processed, total) => {
          const pct = Math.round((processed / total) * 100);
          setUploadProgress(pct);
          setUploadStatusMsg(`กำลังบันทึก ${processed}/${total} รายการ (${pct}%)...`);
        }
      );

      // Also persist to local storage cache so other dashboard views update synchronously
      saveCctvEquipment(parsedItems);

      setUploadResult({
        success: result.failedCount === 0,
        count: result.successCount,
        errors: result.errors
      });

      setUploadStatusMsg(`อัปเดตสู่ Cloud Firestore สำเร็จสมบูรณ์แล้ว ${result.successCount} รายการ!`);
      if (onSuccess) {
        onSuccess(result.successCount);
      }
    } catch (err: any) {
      console.error('Firestore bulk upload error:', err);
      setUploadResult({
        success: false,
        count: 0,
        errors: [err.message || String(err)]
      });
      setUploadStatusMsg(`เกิดข้อผิดพลาดในการอัปโหลด: ${err.message || 'Firestore connection error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredPreview = useMemo(() => {
    return parsedItems.filter(item => {
      const matchType = filterType === 'all' || item.equipmentType === filterType;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.assetCode.toLowerCase().includes(q) ||
        (item.systemAssetCode && item.systemAssetCode.toLowerCase().includes(q)) ||
        item.communityOrOffice.toLowerCase().includes(q) ||
        item.locationName.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [parsedItems, searchTerm, filterType]);

  const nvrCount = parsedItems.filter(i => i.equipmentType === 'NVR').length;
  const tvCount = parsedItems.filter(i => i.equipmentType === 'TV').length;
  const otherCount = parsedItems.length - nvrCount - tvCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-bold px-3 py-0.5 rounded-full border border-indigo-400/40 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-300" />
                Cloud Firestore (Collection: cctv_equipment)
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                โหมดผู้ดูแลระบบ (Admin Only)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <UploadCloud className="w-6 h-6 text-indigo-400" />
              อัปโหลด CSV อัปเดตทะเบียนครุภัณฑ์ CCTV อัตโนมัติสู่ Firestore
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              นำเข้าชุดข้อมูลครุภัณฑ์ NVR, จอสมาร์ททีวี และอุปกรณ์กล้องวงจรปิดเทศบาลเมืองชัยภูมิ 16 ชุมชน ขึ้นสู่ฐานข้อมูล Cloud Firestore แบบกลุ่ม (Bulk Update)
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              1. เลือกไฟล์ CSV / วางข้อความ
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={parsedItems.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : parsedItems.length > 0
                  ? 'text-slate-600 hover:bg-slate-200/70'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              2. ตรวจสอบข้อมูลก่อนส่ง ({parsedItems.length})
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleLoadPromptDataset}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="โหลดชุดข้อมูลครุภัณฑ์ NVR และทีวี 16 ชุมชน (37 รายการ) จากระบบ"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              โหลดชุดข้อมูลราชการชัยภูมิ (37 รายการ)
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ดาวน์โหลดไฟล์ตัวอย่าง CSV Template"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              ดาวน์โหลด Template
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === 'upload' ? (
            <div className="space-y-5">
              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      รองรับไฟล์ .csv ทุกรูปแบบ (UTF-8, Thai TIS-620 หรือ Standard Excel CSV)
                    </p>
                  </div>
                  {fileName && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ไฟล์ที่เลือก: {fileName} ({parsedItems.length} รายการ)
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Paste / Edit CSV Text Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <label htmlFor="csv-manual-input" className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    หรือวางข้อความ CSV โดยตรง (Direct CSV Input / Paste):
                  </label>
                  {csvContent && (
                    <button
                      onClick={() => {
                        setCsvContent('');
                        setParsedItems([]);
                        setFileName(null);
                      }}
                      className="text-rose-600 hover:underline"
                    >
                      ล้างข้อมูล
                    </button>
                  )}
                </div>
                <textarea
                  id="csv-manual-input"
                  rows={7}
                  value={csvContent}
                  onChange={(e) => handleProcessCsvText(e.target.value)}
                  placeholder={`id,name,equipmentType,communityOrOffice,locationName,systemAssetCode,assetCode,status,notes\nNVR-TK-01,"เครื่อง NVR CCTV 1",NVR,"สำนักงานเทศกิจ","ห้องควบคุม CCTV",404-641123-00136,455-59-0006,online,"ปกติ"`}
                  className="w-full font-mono text-xs p-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800"
                />
              </div>

              {/* Information Banner */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold block">หัวตารางที่ระบบรองรับอัตโนมัติ (Flexible Column Mapping):</span>
                  <p className="text-slate-700">
                    • <strong>รหัส/ลำดับ:</strong> id, ลำดับ, no &nbsp;|&nbsp;
                    • <strong>ชื่อครุภัณฑ์:</strong> name, ชื่อ, รายการครุภัณฑ์ &nbsp;|&nbsp;
                    • <strong>ประเภท:</strong> equipmentType, type, ประเภท (NVR, TV, CAMERA, UPS, SWITCH)
                  </p>
                  <p className="text-slate-700">
                    • <strong>ชุมชน/หน่วยงาน:</strong> communityOrOffice, ชุมชน, หน่วยงาน &nbsp;|&nbsp;
                    • <strong>จุดติดตั้ง:</strong> locationName, สถานที่ติดตั้ง &nbsp;|&nbsp;
                    • <strong>รหัสสินทรัพย์:</strong> assetCode, systemAssetCode
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-medium">รายการในไฟล์ทั้งหมด</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {parsedItems.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
                  </div>
                </div>
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200">
                  <span className="text-indigo-800 font-medium flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" /> เครื่อง NVR
                  </span>
                  <div className="text-xl font-black text-indigo-950 mt-0.5">
                    {nvrCount} <span className="text-xs font-normal text-indigo-700">เครื่อง</span>
                  </div>
                </div>
                <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200">
                  <span className="text-blue-800 font-medium flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5 text-blue-600" /> จอสมาร์ททีวี
                  </span>
                  <div className="text-xl font-black text-blue-950 mt-0.5">
                    {tvCount} <span className="text-xs font-normal text-blue-700">เครื่อง</span>
                  </div>
                </div>
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
                  <span className="text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> พร้อมอัปโหลด
                  </span>
                  <div className="text-xl font-black text-emerald-950 mt-0.5">
                    100% <span className="text-xs font-normal text-emerald-700">สมบูรณ์</span>
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหารหัสสินทรัพย์, ชื่อเครื่อง, ชุมชน หรือสถานที่ติดตั้ง..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    ทั้งหมด ({parsedItems.length})
                  </button>
                  <button
                    onClick={() => setFilterType('NVR')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'NVR' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    NVR ({nvrCount})
                  </button>
                  <button
                    onClick={() => setFilterType('TV')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'TV' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    ทีวี ({tvCount})
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[360px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="text-slate-800 font-extrabold border-b border-slate-200">
                      <th className="p-2.5 text-center w-12">ลำดับ</th>
                      <th className="p-2.5 min-w-[180px]">ชื่อครุภัณฑ์</th>
                      <th className="p-2.5 whitespace-nowrap">ประเภท</th>
                      <th className="p-2.5 whitespace-nowrap min-w-[120px]">รหัสสินทรัพย์</th>
                      <th className="p-2.5 whitespace-nowrap min-w-[130px]">รหัสในระบบ</th>
                      <th className="p-2.5 min-w-[150px]">ชุมชน/หน่วยงาน</th>
                      <th className="p-2.5 min-w-[150px]">จุดติดตั้ง</th>
                      <th className="p-2.5 text-center whitespace-nowrap">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPreview.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                          ไม่พบรายการข้อมูลตรงกับคำค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredPreview.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              {item.equipmentType === 'NVR' ? (
                                <HardDrive className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <Tv className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                              <span>{item.name}</span>
                            </div>
                            {item.model && (
                              <div className="text-[10px] text-slate-400 font-mono">รุ่น: {item.model}</div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.equipmentType === 'NVR'
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {item.equipmentType}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                            <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {item.assetCode}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {item.systemAssetCode ? (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.systemAssetCode}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-800">
                            {item.communityOrOffice}
                          </td>
                          <td className="p-2.5 text-slate-600">{item.locationName}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'online'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.status === 'online' ? 'ใช้งานได้' : 'ชำรุด'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress or Upload Result Banner */}
          {isUploading && (
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  {uploadStatusMsg || 'กำลังบันทึกข้อมูล...'}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              uploadResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {uploadResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h5 className="font-bold text-sm">
                  {uploadResult.success
                    ? '🎉 นำเข้าและบันทึกลง Cloud Firestore สำเร็จเรียบร้อยแล้ว!'
                    : 'พบข้อผิดพลาดในการนำเข้าข้อมูลบางส่วน'}
                </h5>
                <p>
                  บันทึกข้อมูลครุภัณฑ์จำนวน <strong>{uploadResult.count}</strong> รายการ ลงในคอลเลกชัน <code>cctv_equipment</code> เรียบร้อยแล้ว ข้อมูลจะเชื่อมโยงกับหน้าต่างทะเบียนครุภัณฑ์และแดชบอร์ดทันที
                </p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2 text-[11px] font-mono text-rose-700 bg-rose-100/50 p-2 rounded-lg">
                    {uploadResult.errors.map((e, idx) => (
                      <div key={idx}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>เชื่อมต่อฐานข้อมูล Cloud Firestore แบบปลอดภัย (ABAC Guarded)</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              ปิด
            </button>

            {parsedItems.length > 0 && (
              <button
                onClick={handleBulkUploadToFirestore}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-extrabold rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>อัปเดตข้อมูลขึ้น Firestore ({parsedItems.length} รายการ)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
