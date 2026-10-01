import React, { useState, useRef, useMemo } from 'react';
import { CctvCamera } from '../types/cctv';
import { getStoredCctvCameras, saveCctvCameras } from '../data/cctvData';
import { bulkUpdateCctvCamerasToFirestore } from '../utils/firestoreService';
import {
  parseCctvCameraCsvData,
  generateSampleCctvCameraCsv,
  generateSampleCctvCameraCsvWithErrors,
  CctvCameraParseResult,
  ValidatedCctvCameraRow
} from '../utils/cctvCameraParser';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Camera,
  Database,
  RefreshCw,
  Download,
  FileText,
  Search,
  Check,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Info,
  Layers,
  MapPin,
  Cpu,
  Filter
} from 'lucide-react';

interface CctvCameraCsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
  onSuccess?: (updatedCount: number) => void;
}

export const CctvCameraCsvUploadModal: React.FC<CctvCameraCsvUploadModalProps> = ({
  isOpen,
  onClose,
  adminName = 'เจ้าหน้าที่งานสารบรรณ/Admin',
  onSuccess
}) => {
  const [csvContent, setCsvContent] = useState<string>(() => generateSampleCctvCameraCsv());
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'preview'>('preview');
  const [fileName, setFileName] = useState<string | null>('sample_cctv_cameras.csv');
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'faulty' | 'maintenance' | 'offline'>('all');
  const [cabinetFilter, setCabinetFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<
    'all' | 'valid' | 'invalid' | 'missing_asset' | 'missing_location'
  >('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion and Firestore Sync States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);

  // Parse CSV on content change using the cctvCameraParser (includes mandatory field validation)
  const parseResult: CctvCameraParseResult = useMemo(() => {
    return parseCctvCameraCsvData(csvContent);
  }, [csvContent]);

  // Unique list of cabinets for filtering
  const availableCabinets = useMemo(() => {
    const cabs = new Set<string>();
    parseResult.cameras.forEach((c) => {
      if (c.cabinetNumber) cabs.add(c.cabinetNumber);
    });
    return Array.from(cabs).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [parseResult.cameras]);

  // Filtered validated rows for preview table
  const filteredRows: ValidatedCctvCameraRow[] = useMemo(() => {
    return parseResult.validatedRows.filter((row) => {
      const cam = row.camera;

      // Validation Filter
      if (validationFilter === 'valid' && !row.isValid) return false;
      if (validationFilter === 'invalid' && row.isValid) return false;
      if (validationFilter === 'missing_asset' && !row.missingFields.assetId) return false;
      if (validationFilter === 'missing_location' && !row.missingFields.location) return false;

      // Status filter
      if (statusFilter !== 'all' && cam.status !== statusFilter) {
        return false;
      }
      // Cabinet filter
      if (cabinetFilter !== 'all' && cam.cabinetNumber !== cabinetFilter) {
        return false;
      }
      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        cam.name.toLowerCase().includes(term) ||
        (cam.assetCode && cam.assetCode.toLowerCase().includes(term)) ||
        (cam.systemAssetCode && cam.systemAssetCode.toLowerCase().includes(term)) ||
        (cam.cabinetNumber && cam.cabinetNumber.toLowerCase().includes(term)) ||
        (cam.channel && cam.channel.toLowerCase().includes(term)) ||
        (cam.community && cam.community.toLowerCase().includes(term)) ||
        (cam.building && cam.building.toLowerCase().includes(term)) ||
        (cam.notes && cam.notes.toLowerCase().includes(term)) ||
        cam.id.toLowerCase().includes(term) ||
        row.errors.some((err) => err.message.toLowerCase().includes(term))
      );
    });
  }, [parseResult.validatedRows, validationFilter, statusFilter, cabinetFilter, searchTerm]);

  if (!isOpen) return null;

  // File Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('กรุณาเลือกไฟล์รูปแบบ .csv เท่านั้น');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setCsvContent(text);
        setActiveTab('preview');
        setSyncStatus(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Quick Load Buttons
  const handleLoadSampleMunicipalData = () => {
    const sample = generateSampleCctvCameraCsv();
    setCsvContent(sample);
    setFileName('sample_chaiyaphum_cctv_cameras.csv');
    setActiveTab('preview');
    setSyncStatus(null);
    setValidationFilter('all');
  };

  const handleLoadSampleWithErrors = () => {
    const sample = generateSampleCctvCameraCsvWithErrors();
    setCsvContent(sample);
    setFileName('sample_with_validation_errors.csv');
    setActiveTab('preview');
    setSyncStatus(null);
    setValidationFilter('all');
  };

  const handleDownloadTemplate = () => {
    const template = generateSampleCctvCameraCsv();
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), template], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_cctv_cameras_chaiyaphum.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save to Local Registry & Sync to Firestore (Enforcing Mandatory Field Protection)
  const handleCommitIngestion = async (syncToFirestore: boolean) => {
    const validCamerasToIngest = parseResult.validCameras;
    const invalidCount = parseResult.validationSummary.invalidRowsCount;

    if (validCamerasToIngest.length === 0) {
      alert(
        'ระบบไม่สามารถนำเข้าข้อมูลได้: ไม่พบรายการกล้อง CCTV ที่ผ่านเกณฑ์ข้อมูลบังคับ (ต้องระบุรหัสสินทรัพย์ และ จุดติดตั้งให้ครบถ้วน) กรุณาตรวจสอบและแก้ไขไฟล์ก่อนดำเนินการ'
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setSyncStatus(null);

    try {
      // 1. Merge with existing stored cameras (ONLY VALIDATED CAMERAS)
      const currentStored = getStoredCctvCameras();
      const existingMap = new Map<string, CctvCamera>();

      // Index by id, assetCode, or cabinet+channel
      currentStored.forEach((c) => {
        existingMap.set(c.id, c);
        if (c.assetCode) existingMap.set(c.assetCode, c);
        if (c.cabinetNumber && c.channel) existingMap.set(`${c.cabinetNumber}_${c.channel}`, c);
      });

      // Upsert only valid cameras
      const mergedList = [...currentStored];
      let newCount = 0;
      let updatedCount = 0;

      validCamerasToIngest.forEach((newCam) => {
        const key = newCam.id;
        const assetKey = newCam.assetCode ? newCam.assetCode : '';
        const cabKey = newCam.cabinetNumber && newCam.channel ? `${newCam.cabinetNumber}_${newCam.channel}` : '';

        const existingIndex = mergedList.findIndex(
          (c) =>
            c.id === key ||
            (assetKey && c.assetCode === assetKey) ||
            (cabKey && c.cabinetNumber === newCam.cabinetNumber && c.channel === newCam.channel)
        );

        if (existingIndex >= 0) {
          mergedList[existingIndex] = {
            ...mergedList[existingIndex],
            ...newCam,
            coordinates: newCam.coordinates || mergedList[existingIndex].coordinates
          };
          updatedCount++;
        } else {
          mergedList.push(newCam);
          newCount++;
        }
      });

      // Save locally
      saveCctvCameras(mergedList);
      setUploadProgress(40);

      // 2. Sync to Cloud Firestore if requested
      if (syncToFirestore) {
        const firestoreResult = await bulkUpdateCctvCamerasToFirestore(
          validCamerasToIngest,
          (processed, total) => {
            const percent = 40 + Math.round((processed / total) * 55);
            setUploadProgress(Math.min(95, percent));
          }
        );

        setUploadProgress(100);
        const skippedNote =
          invalidCount > 0
            ? ` (ระบบป้องกันข้อมูลผิดพลาดโดยข้าม ${invalidCount} รายการที่ไม่ผ่านเกณฑ์บังคับ)`
            : '';
        setSyncStatus({
          success: firestoreResult.failedCount === 0,
          message: `นำเข้าสำเร็จ! เพิ่มกล้องใหม่ ${newCount} จุด, อัปเดตข้อมูลเดิม ${updatedCount} จุด (ส่งขึ้น Cloud Firestore เรียบร้อย ${firestoreResult.successCount} รายการ)${skippedNote}`,
          details: firestoreResult.errors.length > 0 ? firestoreResult.errors : undefined
        });
      } else {
        setUploadProgress(100);
        const skippedNote =
          invalidCount > 0
            ? ` (ระบบข้าม ${invalidCount} รายการที่ไม่ผ่านเกณฑ์บังคับ เพื่อรักษาความถูกต้องของทะเบียน)`
            : '';
        setSyncStatus({
          success: true,
          message: `นำเข้าสำเร็จ! บันทึกลงระบบสำเร็จ ${validCamerasToIngest.length} รายการ (เพิ่มใหม่ ${newCount} จุด, อัปเดตเดิม ${updatedCount} จุด)${skippedNote}`
        });
      }

      if (onSuccess) {
        onSuccess(validCamerasToIngest.length);
      }
    } catch (err: any) {
      console.error('Error during camera ingestion:', err);
      setSyncStatus({
        success: false,
        message: `เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${err.message || String(err)}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white border border-white/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white">
                  นำเข้าและตรวจสอบข้อมูลกล้องวงจรปิด (CCTV Ingestion & Validator)
                </h2>
                <span className="bg-sky-500/20 text-sky-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-sky-400/30">
                  เทศบาลเมืองชัยภูมิ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ตรวจสอบความถูกต้องของฟิลด์บังคับ (Asset ID, Location) ก่อนบันทึกลงระบบทะเบียน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
              title="ดาวน์โหลดไฟล์ตัวอย่างแบบฟอร์ม CSV มาตรฐาน"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดแม่แบบ CSV</span>
            </button>

            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="bg-sky-50 border-b border-sky-100 px-6 py-2.5 flex items-center justify-between text-xs text-sky-900 gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>ระบบตรวจความถูกต้องและจับคู่คอลัมน์อัตโนมัติ:</strong> ตรวจสอบฟิลด์จำเป็น{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 font-bold text-sky-800">
                รหัสสินทรัพย์ (Asset ID)
              </code>
              ,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 font-bold text-sky-800">
                จุดติดตั้ง (Location)
              </code>
              ,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 font-bold text-sky-800">
                จุดติดตั้งตู้ครบคุม
              </code>
              , และสถานะการใช้งาน
            </span>
          </div>
          <div className="text-[11px] text-slate-500 shrink-0 hidden md:block">
            เจ้าหน้าที่: <span className="font-semibold text-slate-700">{adminName}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100/80 px-6 py-2 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                ตรวจสอบและพรีวิวข้อมูล ({parseResult.totalRows} รายการ)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>อัปโหลดไฟล์ (.csv)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>พิมพ์/แก้ไขข้อความ CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSampleMunicipalData}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1"
              title="โหลดชุดข้อมูลตัวอย่างที่ข้อมูลสมบูรณ์ทุกรายการ"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>ข้อมูลสมบูรณ์</span>
            </button>

            <button
              onClick={handleLoadSampleWithErrors}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
              title="โหลดชุดข้อมูลตัวอย่างที่มีรายการขาดรหัสสินทรัพย์/จุดติดตั้ง เพื่อทดสอบระบบแจ้งเตือน"
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>ทดสอบรายการไม่ผ่านเกณฑ์</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sync / Success / Error Alert */}
          {syncStatus && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                syncStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {syncStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 text-sm">
                <div className="font-bold">{syncStatus.message}</div>
                {syncStatus.details && syncStatus.details.length > 0 && (
                  <ul className="mt-2 text-xs list-disc list-inside space-y-1 text-rose-700">
                    {syncStatus.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setSyncStatus(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Progress Bar during Upload */}
          {isUploading && (
            <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  กำลังแปลงและอัปเดตข้อมูลกล้อง CCTV สู่ระบบ...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* TAB: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  รองรับไฟล์ CSV ภาษาไทย (UTF-8) ที่มีคอลัมน์มาตรฐาน เช่น จุดติดตั้งตู้ครบคุม, รหัสสินทรัพย์, สถานะ, ช่องสัญญาณ
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  เลือกไฟล์จากคอมพิวเตอร์
                </button>
              </div>
            </div>
          )}

          {/* TAB: Paste / Edit CSV Text */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">
                  แก้ไขหรือวางข้อความ CSV โดยตรง:
                </label>
                <span className="text-slate-500 text-[11px]">
                  {parseResult.totalRows} แถว (ผ่านเกณฑ์ {parseResult.validationSummary.validRowsCount} แถว)
                </span>
              </div>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={12}
                className="w-full font-mono text-xs p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800 leading-relaxed"
                placeholder="ลำดับ,จุดติดตั้งตู้ครบคุม,ช่องสัญญาณ,จุดติดตั้ง,รหัสสินทรัพย์,สถานะ..."
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>ตรวจดูตัวอย่างและผลการตรวจสอบ</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Validation & Health Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-[11px] font-medium text-slate-500">ข้อมูลทั้งหมดในไฟล์</div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {parseResult.totalRows}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">แถวข้อมูลที่ประมวลผล</div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ผ่านเกณฑ์ข้อมูลบังคับ</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {parseResult.validationSummary.validRowsCount}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">พร้อมนำเข้าสู่ทะเบียน</div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                parseResult.validationSummary.invalidRowsCount > 0
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>ไม่ผ่านเกณฑ์ (บล็อก)</span>
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {parseResult.validationSummary.invalidRowsCount}
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5 font-medium">ระบบป้องกันการนำเข้า</div>
            </div>

            <div className="bg-sky-50 p-3.5 rounded-2xl border border-sky-200">
              <div className="text-[11px] font-medium text-sky-800">ออนไลน์ / ปกติ</div>
              <div className="text-2xl font-black text-sky-700 mt-1">
                {parseResult.summary.onlineCount}
              </div>
              <div className="text-[10px] text-sky-600 mt-0.5">พร้อมบันทึกภาพ</div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              <div className="text-[11px] font-medium text-amber-800">ชำรุด / ซ่อมบำรุง</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {parseResult.summary.faultyCount + parseResult.summary.maintenanceCount}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">แจ้งซ่อมหรือบำรุงรักษา</div>
            </div>
          </div>

          {/* Validation Alert Box when invalid rows detected */}
          {parseResult.validationSummary.invalidRowsCount > 0 && (
            <div className="bg-rose-50/90 border-2 border-rose-300 p-4 rounded-2xl text-xs text-rose-950 space-y-2 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-200/80 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900">
                      ตรวจพบข้อมูลที่ไม่ผ่านเกณฑ์บังคับ ({parseResult.validationSummary.invalidRowsCount} รายการ)
                    </h4>
                    <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                      ระบบป้องกันข้อมูลผิดพลาด: แต่ละจุดติดตั้งกล้อง CCTV จำเป็นต้องมี{' '}
                      <strong>รหัสสินทรัพย์ (Asset ID)</strong> และ <strong>จุดติดตั้ง (Location)</strong>{' '}
                      ครบถ้วน รายการที่ไม่สมบูรณ์จะถูกไฮไลต์สีแดงและ<strong>บล็อกไม่ให้นำเข้าสู่ระบบทะเบียน</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setValidationFilter('invalid')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
                >
                  กรองดูรายการที่มีปัญหา ({parseResult.validationSummary.invalidRowsCount})
                </button>
              </div>

              {/* Missing field counters */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {parseResult.validationSummary.missingAssetIdCount > 0 && (
                  <button
                    onClick={() => setValidationFilter('missing_asset')}
                    className="inline-flex items-center gap-1.5 bg-white border border-rose-300 text-rose-800 px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-rose-100/60 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>ขาดรหัสสินทรัพย์ (Asset ID): {parseResult.validationSummary.missingAssetIdCount} รายการ</span>
                  </button>
                )}

                {parseResult.validationSummary.missingLocationCount > 0 && (
                  <button
                    onClick={() => setValidationFilter('missing_location')}
                    className="inline-flex items-center gap-1.5 bg-white border border-rose-300 text-rose-800 px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-rose-100/60 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>ขาดจุดติดตั้ง (Location): {parseResult.validationSummary.missingLocationCount} รายการ</span>
                  </button>
                )}

                {parseResult.validationSummary.duplicateCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-100/80 border border-amber-300 text-amber-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>พบรหัสสินทรัพย์ซ้ำกันในไฟล์: {parseResult.validationSummary.duplicateCount} จุด</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filters & Search Toolbar for Preview */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อจุดติดตั้ง, รหัสสินทรัพย์, ตู้..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Status, Cabinet & Validation Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Validation Status Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setValidationFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      validationFilter === 'all'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    ทั้งหมด ({parseResult.totalRows})
                  </button>
                  <button
                    onClick={() => setValidationFilter('valid')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      validationFilter === 'valid'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-emerald-700 hover:text-emerald-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>ผ่านเกณฑ์ ({parseResult.validationSummary.validRowsCount})</span>
                  </button>
                  <button
                    onClick={() => setValidationFilter('invalid')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      validationFilter === 'invalid'
                        ? 'bg-white text-rose-700 shadow-2xs'
                        : 'text-rose-700 hover:text-rose-800'
                    }`}
                  >
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>ไม่ผ่าน ({parseResult.validationSummary.invalidRowsCount})</span>
                  </button>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    ทุกสถานะ
                  </button>
                  <button
                    onClick={() => setStatusFilter('online')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === 'online' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    ปกติ
                  </button>
                  <button
                    onClick={() => setStatusFilter('faulty')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === 'faulty' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    ชำรุด
                  </button>
                  <button
                    onClick={() => setStatusFilter('maintenance')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === 'maintenance' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    ซ่อมบำรุง
                  </button>
                </div>

                {availableCabinets.length > 0 && (
                  <select
                    value={cabinetFilter}
                    onChange={(e) => setCabinetFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-1.5 px-3 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">ทุกตู้ควบคุม ({availableCabinets.length} ตู้)</option>
                    {availableCabinets.map((cab) => (
                      <option key={cab} value={cab}>
                        ตู้ควบคุมที่ {cab}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Preview Table with Validation Highlighting */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/95 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-28">ผลตรวจสอบ</th>
                      <th className="py-2.5 px-3">จุดติดตั้งตู้ครบคุม</th>
                      <th className="py-2.5 px-3">ช่อง</th>
                      <th className="py-2.5 px-3 min-w-[220px]">
                        จุดติดตั้ง / สถานที่ <span className="text-rose-600 font-bold">*จำเป็น</span>
                      </th>
                      <th className="py-2.5 px-3 min-w-[170px]">
                        รหัสสินทรัพย์ (Asset ID) <span className="text-rose-600 font-bold">*จำเป็น</span>
                      </th>
                      <th className="py-2.5 px-3">สถานะ</th>
                      <th className="py-2.5 px-3">ชนิด</th>
                      <th className="py-2.5 px-3">พิกัด GPS</th>
                      <th className="py-2.5 px-3">ชุมชน/สังกัด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const cam = row.camera;
                        const isInvalid = !row.isValid;

                        return (
                          <tr
                            key={`row-${row.rowIndex}-${cam.id}`}
                            className={`transition-colors ${
                              isInvalid
                                ? 'bg-rose-50/80 hover:bg-rose-100/60 border-l-4 border-l-rose-500'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Validation Status Badge */}
                            <td className="py-2.5 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>ผ่านเกณฑ์</span>
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                    <span>ไม่ผ่าน ({row.errors.length})</span>
                                  </span>
                                  <div className="text-[9px] text-rose-600 font-bold">
                                    {row.errors[0]?.message}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Cabinet Number */}
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {cam.cabinetNumber ? (
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-200/60 font-mono text-[11px] font-bold">
                                  ตู้ {cam.cabinetNumber}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Channel */}
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              {cam.channel || '-'}
                            </td>

                            {/* Location / Name (Mandatory Field Highlight) */}
                            <td className="py-2.5 px-3">
                              {row.missingFields.location ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>ขาดจุดติดตั้ง (จำเป็น)</span>
                                </span>
                              ) : (
                                <div>
                                  <div className="font-bold text-slate-800 line-clamp-1">
                                    {cam.name}
                                  </div>
                                  {cam.floor && cam.floor !== cam.name && (
                                    <div className="text-[10px] text-slate-400 line-clamp-1">
                                      {cam.floor}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Asset ID (Mandatory Field Highlight) */}
                            <td className="py-2.5 px-3 font-mono">
                              {row.missingFields.assetId ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>ขาดรหัสสินทรัพย์ (จำเป็น)</span>
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800 border border-slate-200 text-[11px]">
                                    {cam.assetCode}
                                  </span>
                                  {cam.systemAssetCode && cam.systemAssetCode !== cam.assetCode && (
                                    <div className="text-[9px] text-slate-400">
                                      ระบบ: {cam.systemAssetCode}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              {cam.status === 'online' && (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ออนไลน์
                                </span>
                              )}
                              {cam.status === 'faulty' && (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  ชำรุด
                                </span>
                              )}
                              {cam.status === 'maintenance' && (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  ซ่อมบำรุง
                                </span>
                              )}
                              {cam.status === 'offline' && (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  ออฟไลน์
                                </span>
                              )}
                            </td>

                            {/* Camera Type */}
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {cam.type}
                            </td>

                            {/* GPS Coordinates */}
                            <td className="py-2.5 px-3 text-[10px] text-slate-500 font-mono">
                              {cam.latitude && cam.longitude ? (
                                <span title={`Lat: ${cam.latitude}, Lng: ${cam.longitude}`}>
                                  {cam.latitude.toFixed(4)}, {cam.longitude.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Community */}
                            <td className="py-2.5 px-3 text-slate-600">
                              {cam.community || 'เขตเทศบาล'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons with Ingestion Protection */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            {parseResult.validationSummary.invalidRowsCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>
              พร้อมนำเข้าข้อมูลที่ผ่านเกณฑ์จำนวน{' '}
              <strong className="text-emerald-700 font-bold">
                {parseResult.validationSummary.validRowsCount}
              </strong>{' '}
              จุด{' '}
              {parseResult.validationSummary.invalidRowsCount > 0 && (
                <span className="text-rose-700 font-semibold">
                  (ระบบจะข้ามและบล็อก {parseResult.validationSummary.invalidRowsCount} รายการที่ไม่สมบูรณ์)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>

            <button
              onClick={() => handleCommitIngestion(false)}
              disabled={isUploading || parseResult.validationSummary.validRowsCount === 0}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="บันทึกเฉพาะรายการที่ผ่านเกณฑ์เข้าหน่วยความจำ Local"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>
                บันทึกเฉพาะ Local ({parseResult.validationSummary.validRowsCount} จุด)
              </span>
            </button>

            <button
              onClick={() => handleCommitIngestion(true)}
              disabled={isUploading || parseResult.validationSummary.validRowsCount === 0}
              className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              title="นำเข้าเฉพาะรายการที่ผ่านเกณฑ์ขึ้น Cloud Firestore"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังประมวลผล...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-sky-200" />
                  <span>
                    นำเข้าสู่ Cloud Firestore ({parseResult.validationSummary.validRowsCount} จุด)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
