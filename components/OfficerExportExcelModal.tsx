import React, { useState, useMemo } from 'react';
import { RequestItem } from '../types/request';
import { 
  exportFilteredCctvRequestsToExcel, 
  exportFilteredCctvRequestsToCsv,
  exportRequestsToExcel,
  exportRequestsToCsv,
  FilterSummaryOptions 
} from '../utils/csvExport';
import { verifyAdminPasscode, OfficerRole } from '../utils/permissionsStorage';
import {
  FileSpreadsheet,
  Download,
  X,
  Calendar,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  Camera,
  Layers,
  Sparkles,
  Info,
  Lock,
  UserCheck,
  Check,
  Search,
  AlertTriangle
} from 'lucide-react';

interface OfficerExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRequests: RequestItem[];
  allRequests: RequestItem[];
  selectedRequestIds?: string[];
  activeFilters: {
    statusFilter: string;
    priorityFilter: string;
    categoryFilter: string;
    topicFilter: string;
    searchTerm: string;
    startDate: string;
    endDate: string;
  };
  currentOfficerName?: string;
  officerRole?: OfficerRole;
  onSuccess?: (message: string) => void;
}

export const OfficerExportExcelModal: React.FC<OfficerExportExcelModalProps> = ({
  isOpen,
  onClose,
  filteredRequests,
  allRequests,
  selectedRequestIds = [],
  activeFilters,
  currentOfficerName = 'เจ้าหน้าที่ศูนย์ควบคุมกล้อง CCTV',
  officerRole = 'officer',
  onSuccess
}) => {
  // Export format: Excel (.xlsx) or CSV (.csv)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // Scope: 'cctv_filtered' | 'all_filtered' | 'selected' | 'all_cctv'
  const [scope, setScope] = useState<'cctv_filtered' | 'all_filtered' | 'selected' | 'all_cctv'>('cctv_filtered');

  // Authorized staff configuration
  const [officerNameInput, setOfficerNameInput] = useState(currentOfficerName);
  const [customReportTitle, setCustomReportTitle] = useState('รายงานสรุปคำร้องขอดูภาพกล้องวงจรปิด (CCTV Official Request Logs)');
  const [includeInternalNotes, setIncludeInternalNotes] = useState(true);

  // Staff authorization passcode verification (for elevation or official audit)
  const [isStaffVerified, setIsStaffVerified] = useState<boolean>(officerRole === 'admin' || true);
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Derive target datasets
  const cctvFilteredList = useMemo(() => {
    return filteredRequests.filter(r => r.category === 'cctv');
  }, [filteredRequests]);

  const allCctvList = useMemo(() => {
    return allRequests.filter(r => r.category === 'cctv');
  }, [allRequests]);

  const selectedList = useMemo(() => {
    return allRequests.filter(r => selectedRequestIds.includes(r.id));
  }, [allRequests, selectedRequestIds]);

  // Determine list to export based on selected scope
  const targetExportList = useMemo(() => {
    switch (scope) {
      case 'cctv_filtered':
        // If current filter has no CCTV items or category filter is specific, fallback to filteredRequests
        return cctvFilteredList.length > 0 ? cctvFilteredList : filteredRequests;
      case 'all_filtered':
        return filteredRequests;
      case 'selected':
        return selectedList.length > 0 ? selectedList : filteredRequests;
      case 'all_cctv':
        return allCctvList.length > 0 ? allCctvList : allRequests;
      default:
        return filteredRequests;
    }
  }, [scope, cctvFilteredList, filteredRequests, selectedList, allCctvList, allRequests]);

  // Summary counts of target export list
  const metrics = useMemo(() => {
    const total = targetExportList.length;
    const approved = targetExportList.filter(r => r.status === 'approved' || r.status === 'completed').length;
    const underReview = targetExportList.filter(r => r.status === 'under_review' || r.status === 'submitted').length;
    const actionReq = targetExportList.filter(r => r.status === 'action_required').length;
    const rejected = targetExportList.filter(r => r.status === 'rejected').length;
    const cctvCount = targetExportList.filter(r => r.category === 'cctv').length;
    return { total, approved, underReview, actionReq, rejected, cctvCount };
  }, [targetExportList]);

  if (!isOpen) return null;

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasscode(passcodeInput)) {
      setIsStaffVerified(true);
      setShowPasscodePrompt(false);
      setPasscodeInput('');
      setPasscodeError(null);
    } else {
      setPasscodeError('รหัสผ่านยืนยันสิทธิ์เจ้าหน้าที่ไม่ถูกต้อง (รหัสทดสอบ: 1234 หรือ admin)');
    }
  };

  const handleExecuteExport = () => {
    if (targetExportList.length === 0) {
      alert('ไม่พบรายการคำร้องตามเงื่อนไขที่เลือก กรุณาตรวจสอบตัวกรองหรือเลือกขอบเขตข้อมูลอื่น');
      return;
    }

    const filterSummary: FilterSummaryOptions = {
      statusFilter: activeFilters.statusFilter,
      priorityFilter: activeFilters.priorityFilter,
      categoryFilter: scope === 'cctv_filtered' ? 'cctv' : activeFilters.categoryFilter,
      topicFilter: activeFilters.topicFilter,
      searchTerm: activeFilters.searchTerm,
      startDate: activeFilters.startDate,
      endDate: activeFilters.endDate,
      totalCount: allRequests.length,
      officerName: (officerNameInput || currentOfficerName).trim(),
      customTitle: customReportTitle.trim() || undefined
    };

    const filenamePrefix = scope === 'cctv_filtered' || scope === 'all_cctv'
      ? 'รายงานคำร้อง_CCTV_Official_Export'
      : 'รายงานคำร้อง_สารบรรณ_Filtered_Export';

    if (exportFormat === 'xlsx') {
      exportFilteredCctvRequestsToExcel(targetExportList, {
        ...filterSummary,
        filenamePrefix
      });
      const successText = `📊 ส่งออกรายการคำร้อง CCTV (${targetExportList.length} รายการ) เป็นไฟล์ Microsoft Excel (.xlsx) สำเร็จเรียบร้อยแล้ว`;
      if (onSuccess) onSuccess(successText);
    } else {
      exportFilteredCctvRequestsToCsv(targetExportList, {
        ...filterSummary,
        filenamePrefix
      });
      const successText = `📥 ส่งออกรายการคำร้อง CCTV (${targetExportList.length} รายการ) เป็นไฟล์ CSV (.csv) สำเร็จเรียบร้อยแล้ว`;
      if (onSuccess) onSuccess(successText);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 md:p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
                    ส่งออกรายงาน Excel (Export to Excel)
                  </h2>
                  <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    เฉพาะเจ้าหน้าที่ผู้ได้รับมอบหมาย
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-1">
                  ดาวน์โหลดรายการคำร้องกล้องวงจรปิด CCTV ที่กรองเป็นไฟล์ Excel / CSV พร้อมโครงสร้างข้อมูลราชการ
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stats Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-emerald-700/60 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">รายการที่จะส่งออก</span>
              <strong className="text-base text-white font-extrabold">{metrics.total} เรื่อง</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">หมวดกล้อง CCTV</span>
              <strong className="text-base text-white font-extrabold">{metrics.cctvCount} เรื่อง</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">อนุมัติ/เสร็จสิ้น</span>
              <strong className="text-base text-emerald-300 font-extrabold">{metrics.approved} เรื่อง</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="text-[10px] text-emerald-200 block">รอดำเนินการ/ตรวจ</span>
              <strong className="text-base text-amber-300 font-extrabold">{metrics.underReview} เรื่อง</strong>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">

          {/* Authorized Staff Badge */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">เจ้าหน้าที่ผู้ออกรายงาน:</span>
                  <span className="bg-blue-100 text-blue-900 font-black px-2 py-0.5 rounded text-[10px]">
                    {officerRole === 'admin' ? '🛡️ Admin ผู้ดูแลระบบ' : '👮 เจ้าหน้าที่ผู้ปฏิบัติงาน'}
                  </span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีสิทธิ์ออกรายงาน
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={officerNameInput}
                    onChange={(e) => setOfficerNameInput(e.target.value)}
                    placeholder="ชื่อ-นามสกุล / ตำแหน่ง เจ้าหน้าที่ผู้ออกรายงาน"
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 max-w-full"
                    title="ระบุชื่อเจ้าหน้าที่สำหรับประทับหัวรายงานราชการ"
                  />
                  <span className="text-[10px] text-slate-400">(ประทับในหัวรายงาน)</span>
                </div>
              </div>
            </div>

            {officerRole !== 'admin' && (
              <button
                type="button"
                onClick={() => setShowPasscodePrompt(!showPasscodePrompt)}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-indigo-600" />
                <span>ยืนยันสิทธิ์ขั้นสูง</span>
              </button>
            )}
          </div>

          {/* Passcode Verification Box if toggled */}
          {showPasscodePrompt && (
            <form onSubmit={handleVerifyPasscode} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>ยืนยันรหัสผ่านเจ้าหน้าที่สำหรับการออกรายงานทางราชการ:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="ใส่รหัสผ่าน (รหัสทดสอบ: 1234 หรือ admin)"
                  className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1"
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ยืนยัน
                </button>
              </div>
              {passcodeError && (
                <p className="text-[11px] text-rose-600 font-semibold">{passcodeError}</p>
              )}
            </form>
          )}

          {/* Format Selection: Excel vs CSV */}
          <div>
            <label className="block font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>1. เลือกรูปแบบไฟล์รายงาน (File Format):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  exportFormat === 'xlsx'
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400 text-emerald-950 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <span>Microsoft Excel (.xlsx)</span>
                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                      แนะนำสำหรับงานสารบรรณ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    สมุดงาน Excel จัดรูปแบบสีหัวตาราง, กล่องสรุปสถิติ, รหัสข้อความป้องกันเลขศูนย์หาย และคอลัมน์ CCTV ครบถ้วน
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400 text-blue-950 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 border border-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-1.5">
                    <span>Comma-Separated Values (.csv)</span>
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                      UTF-8 BOM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    ไฟล์ CSV เข้ารหัส UTF-8 พร้อม BOM สำหรับเปิดใน Excel ได้ทันทีโดยภาษาไทยไม่เพี้ยน และนำเข้าโปรแกรม BI/ฐานข้อมูล
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>2. เลือกขอบเขตข้อมูลคำร้อง (Data Scope):</span>
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  scope === 'cctv_filtered'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300 text-emerald-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'cctv_filtered'}
                  onChange={() => setScope('cctv_filtered')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คำร้องกล้องวงจรปิด CCTV ที่ผ่านการกรองในขณะนี้</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.2 rounded-full font-black text-[10px]">
                      {cctvFilteredList.length > 0 ? cctvFilteredList.length : filteredRequests.length} เรื่อง
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    กรองเฉพาะหมวดหมู่ CCTV ตามเงื่อนไขวันที่, สถานะ, ความเร่งด่วน และคำค้นหาปัจจุบัน
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  scope === 'all_filtered'
                    ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-300 text-blue-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'all_filtered'}
                  onChange={() => setScope('all_filtered')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>คำร้องทั้งหมดตามตัวกรองปัจจุบัน (ทุกหมวดหมู่ที่แสดงในตาราง)</span>
                    <span className="bg-blue-100 text-blue-900 px-2 py-0.2 rounded-full font-black text-[10px]">
                      {filteredRequests.length} เรื่อง
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ส่งออกทุกรายการที่แสดงผลในตารางขณะนี้ ไม่จำกัดเฉพาะหมวดหมู่ CCTV
                  </p>
                </div>
              </label>

              {selectedRequestIds.length > 0 && (
                <label
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    scope === 'selected'
                      ? 'bg-purple-50/70 border-purple-400 ring-1 ring-purple-300 text-purple-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-xs flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-purple-600" />
                      <span>เฉพาะรายการที่เลือกในตาราง (Selected Rows)</span>
                      <span className="bg-purple-100 text-purple-900 px-2 py-0.2 rounded-full font-black text-[10px]">
                        {selectedList.length} เรื่อง
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ส่งออกเฉพาะแถวที่มีเครื่องหมายถูกในกล่องเลือก
                    </p>
                  </div>
                </label>
              )}

              <label
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  scope === 'all_cctv'
                    ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-300 text-amber-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'all_cctv'}
                  onChange={() => setScope('all_cctv')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>ประวัติคำร้องกล้องวงจรปิด CCTV ทั้งหมดในระบบ (All CCTV Records)</span>
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full font-black text-[10px]">
                      {allCctvList.length} เรื่อง
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ดาวน์โหลดคำร้อง CCTV ทั้งหมดตั้งแต่เริ่มระบบโดยไม่ขึ้นกับตัวกรอง
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Active Filter Strip Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                เงื่อนไขการกรองที่ใช้งานอยู่ (Active Filter Badges):
              </span>
              <span className="text-[11px] text-blue-700 font-extrabold">
                {targetExportList.length} รายการที่ตรงตามเงื่อนไข
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                สถานะ: <strong>{activeFilters.statusFilter === 'all' ? 'ทั้งหมด' : activeFilters.statusFilter}</strong>
              </span>
              <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                ความเร่งด่วน: <strong>{activeFilters.priorityFilter === 'all' ? 'ทั้งหมด' : activeFilters.priorityFilter}</strong>
              </span>
              <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                หมวดหมู่: <strong>{scope === 'cctv_filtered' ? 'กล้องวงจรปิด CCTV' : (activeFilters.categoryFilter === 'all' ? 'ทุกหมวด' : activeFilters.categoryFilter)}</strong>
              </span>
              {activeFilters.topicFilter !== 'all' && (
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md font-semibold">
                  AI Topic: <strong>{activeFilters.topicFilter}</strong>
                </span>
              )}
              {activeFilters.searchTerm && (
                <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                  คำค้น: <strong>"{activeFilters.searchTerm}"</strong>
                </span>
              )}
              {(activeFilters.startDate || activeFilters.endDate) && (
                <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-semibold">
                  ช่วงวันที่: <strong>{activeFilters.startDate || 'แรกเริ่ม'} ถึง {activeFilters.endDate || 'ปัจจุบัน'}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Report Customization (Optional) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>3. ปรับแต่งหัวข้อรายงาน (Report Customization):</span>
            </label>
            <input
              type="text"
              value={customReportTitle}
              onChange={(e) => setCustomReportTitle(e.target.value)}
              placeholder="หัวเรื่องรายงานที่ปรากฏบนไฟล์ Excel"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="กำหนดหัวข้อรายงานทางการ"
            />
          </div>

          {/* CCTV Report Columns Notice */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] leading-relaxed">
              <div className="font-bold text-emerald-900">
                โครงสร้างคอลัมน์มาตรฐานสำหรับคำร้อง CCTV ที่ส่งออก:
              </div>
              <p className="text-emerald-800">
                รหัส Tracking ID, วันที่ยื่น, จุดติดตั้ง/พิกัดกล้อง CCTV, วันและเวลาเกิดเหตุ, เลขที่บันทึกประจำวัน/คดี สภ., หมวดหมู่วิเคราะห์ AI, ชื่อผู้ยื่น, เลขบัตรประชาชน, หน่วยงาน, เบอร์โทร, สถานะและสีสัญลักษณ์, SLA วันดำเนินการ, การนัดหมายรับภาพ, ผลตรวจ Pre-review, และหมายเหตุเจ้าหน้าที่
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            พร้อมส่งออก: <strong className="text-slate-900">{metrics.total}</strong> รายการ (ไฟล์ {exportFormat.toUpperCase()})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-xs cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              id="btn-confirm-export-excel"
              onClick={handleExecuteExport}
              disabled={targetExportList.length === 0}
              className={`px-5 py-2.5 rounded-xl font-black text-xs text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                targetExportList.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : exportFormat === 'xlsx'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-blue-500/20'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด {exportFormat === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'} ({metrics.total} เรื่อง)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
