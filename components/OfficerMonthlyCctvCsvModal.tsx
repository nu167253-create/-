import React, { useState, useMemo } from 'react';
import { RequestItem } from '../types/request';
import { exportMonthlyCctvRequestsToCsv } from '../utils/csvExport';
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
  Layers,
  Sparkles,
  Info,
  Archive
} from 'lucide-react';

interface OfficerMonthlyCctvCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestItem[];
  officerName?: string;
  officerRole?: string;
  onSuccess?: (message: string) => void;
}

const THAI_MONTHS = [
  { num: 1, name: 'มกราคม', short: 'ม.ค.' },
  { num: 2, name: 'กุมภาพันธ์', short: 'ก.พ.' },
  { num: 3, name: 'มีนาคม', short: 'มี.ค.' },
  { num: 4, name: 'เมษายน', short: 'เม.ย.' },
  { num: 5, name: 'พฤษภาคม', short: 'พ.ค.' },
  { num: 6, name: 'มิถุนายน', short: 'มิ.ย.' },
  { num: 7, name: 'กรกฎาคม', short: 'ก.ค.' },
  { num: 8, name: 'สิงหาคม', short: 'ส.ค.' },
  { num: 9, name: 'กันยายน', short: 'ก.ย.' },
  { num: 10, name: 'ตุลาคม', short: 'ต.ค.' },
  { num: 11, name: 'พฤศจิกายน', short: 'พ.ย.' },
  { num: 12, name: 'ธันวาคม', short: 'ธ.ค.' }
];

export const OfficerMonthlyCctvCsvModal: React.FC<OfficerMonthlyCctvCsvModalProps> = ({
  isOpen,
  onClose,
  requests,
  officerName = 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV เทศบาลเมืองชัยภูมิ',
  officerRole = 'officer',
  onSuccess
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved_completed' | 'in_progress' | 'rejected_cancelled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate counts per month for the selected year
  const monthlyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) counts[m] = 0;

    requests.forEach(r => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth() + 1;
        counts[m] = (counts[m] || 0) + 1;
      }
    });

    return counts;
  }, [requests, selectedYear]);

  // Filter requests according to user's selections
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() !== selectedYear) return false;

      // Month filter
      if (selectedMonth !== 'all') {
        const m = d.getMonth() + 1;
        if (m !== selectedMonth) return false;
      }

      // Status filter
      if (statusFilter === 'approved_completed') {
        if (r.status !== 'approved' && r.status !== 'completed') return false;
      } else if (statusFilter === 'in_progress') {
        if (r.status !== 'submitted' && r.status !== 'under_review' && r.status !== 'action_required') return false;
      } else if (statusFilter === 'rejected_cancelled') {
        if (r.status !== 'rejected' && r.status !== 'closed') return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (r.category !== categoryFilter) return false;
      }

      return true;
    });
  }, [requests, selectedYear, selectedMonth, statusFilter, categoryFilter]);

  // Statistics breakdown
  const stats = useMemo(() => {
    let approved = 0;
    let inProgress = 0;
    let other = 0;

    filteredRequests.forEach(r => {
      if (r.status === 'approved' || r.status === 'completed') approved++;
      else if (r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required') inProgress++;
      else other++;
    });

    return { approved, inProgress, other, total: filteredRequests.length };
  }, [filteredRequests]);

  if (!isOpen) return null;

  const handleExport = (exportAllWithoutFilters: boolean = false) => {
    setIsExporting(true);
    try {
      let exportList = filteredRequests;
      let label = '';

      if (exportAllWithoutFilters) {
        exportList = requests;
        label = `ข้อมูลคำร้องทั้งหมด_${requests.length}_รายการ_คลังสารบรรณ`;
      } else {
        const monthName = selectedMonth === 'all' 
          ? 'ทุกเดือน' 
          : THAI_MONTHS.find(m => m.num === selectedMonth)?.name || `เดือนที่_${selectedMonth}`;
        const yearTh = selectedYear + 543;
        label = `เดือน_${monthName}_พ.ศ.${yearTh}`;
      }

      if (exportList.length === 0) {
        alert('ไม่พบรายการคำร้อง CCTV ตามเงื่อนไขที่เลือก');
        setIsExporting(false);
        return;
      }

      exportMonthlyCctvRequestsToCsv(
        exportList,
        label,
        'รายงานสรุปคำร้อง_CCTV_ประจำเดือน',
        {
          monthName: selectedMonth === 'all' ? 'ทุกเดือน' : THAI_MONTHS.find(m => m.num === selectedMonth)?.name,
          monthNumber: selectedMonth === 'all' ? 0 : selectedMonth,
          yearTh: selectedYear + 543,
          officerName: officerName,
          includeRecordKeepingAudit: true
        }
      );

      if (onSuccess) {
        onSuccess(`📊 ส่งออกไฟล์ CSV รายงานคำร้อง CCTV ประจำเดือน (${label}) จำนวน ${exportList.length} รายการ เรียบร้อยแล้ว`);
      }
      onClose();
    } catch (err: any) {
      console.error('Error exporting CCTV monthly CSV:', err);
      alert(`การส่งออกไฟล์ CSV ผิดพลาด: ${err.message || 'ไม่ทราบสาเหตุ'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedMonthObj = selectedMonth === 'all' ? null : THAI_MONTHS.find(m => m.num === selectedMonth);
  const yearThStr = selectedYear + 543;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full flex flex-col shadow-2xl border border-slate-300 overflow-hidden max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-white">
                  ส่งออกรายงานคำร้อง CCTV ประจำเดือน (CSV Export)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  สิทธิ์เจ้าหน้าที่ผู้ปฏิบัติงาน (Authorized)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                จัดทำไฟล์สรุปรายงานประจำเดือน บันทึกสถิติงานสารบรรณ และคลังจัดเก็บหลักฐานเทศบาลเมืองชัยภูมิ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {/* Officer Verification Notice */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-xs">
                  ผู้มีสิทธิ์ส่งออกข้อมูล: <span className="text-blue-700">{officerName}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  ตำแหน่ง/บทบาท: {officerRole === 'admin' ? 'ผู้ดูแลระบบสูงสุด (Admin)' : 'เจ้าหน้าที่ศูนย์กล้องวงจรปิด/งานสารบรรณ'}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              เข้ารหัส UTF-8 BOM รองรับ Excel ภาษาไทย
            </span>
          </div>

          {/* Year & Month Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>เลือกปี พ.ศ. และประจำเดือนที่ต้องการรายงาน:</span>
              </label>

              {/* Year Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-medium">ปีงบประมาณ/พ.ศ.:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white font-bold text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value={currentYear + 1}>พ.ศ. {currentYear + 1 + 543} ({currentYear + 1})</option>
                  <option value={currentYear}>พ.ศ. {currentYear + 543} ({currentYear}) [ปีปัจจุบัน]</option>
                  <option value={currentYear - 1}>พ.ศ. {currentYear - 1 + 543} ({currentYear - 1})</option>
                  <option value={currentYear - 2}>พ.ศ. {currentYear - 2 + 543} ({currentYear - 2})</option>
                </select>
              </div>
            </div>

            {/* Month Buttons Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer col-span-3 sm:col-span-4 md:col-span-6 flex items-center justify-between px-4 ${
                  selectedMonth === 'all'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-400 font-extrabold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>รายงานสรุปตลอดทั้งปี (ทุกเดือนใน พ.ศ. {yearThStr})</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  selectedMonth === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {Object.values(monthlyCounts).reduce((a, b) => a + b, 0)} รายการ
                </span>
              </button>

              {THAI_MONTHS.map((m) => {
                const count = monthlyCounts[m.num] || 0;
                const isSelected = selectedMonth === m.num;
                const isCurrent = m.num === currentMonth && selectedYear === currentYear;

                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => setSelectedMonth(m.num)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-1.5 right-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 rounded-full shadow-xs">
                        เดือนนี้
                      </span>
                    )}
                    <div className="font-bold text-xs">{m.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                      <span>{count} รายการ</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtering Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {/* Status Filter */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>สถานะคำร้อง (Status Filter):</span>
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">คำร้องทุกสถานะ (All Statuses / คลังสมบูรณ์)</option>
                <option value="approved_completed">✅ เฉพาะที่อนุมัติแล้วและดำเนินการเสร็จสิ้น (Approved & Completed)</option>
                <option value="in_progress">⏳ เฉพาะที่อยู่ระหว่างพิจารณา/ตรวจสอบ (In Progress)</option>
                <option value="rejected_cancelled">❌ เฉพาะที่ไม่อนุมัติ/ยกเลิกคำร้อง (Rejected / Cancelled)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>หมวดหมู่คำร้อง (Category):</span>
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">ทุกหมวดหมู่งานกล้องวงจรปิด (All CCTV Categories)</option>
                <option value="cctv_request">ขอดูภาพ/คัดสำเนาข้อมูลภาพกล้อง CCTV</option>
                <option value="cctv_repair">แจ้งซ่อมแซม/บำรุงรักษากล้องวงจรปิด</option>
                <option value="general_petition">คำร้องทั่วไป/ขอความอนุเคราะห์</option>
              </select>
            </div>
          </div>

          {/* Preview & Stats Summary Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>สรุปข้อมูลที่ตรงตามเงื่อนไข:</span>
                <span className="text-emerald-700 font-extrabold">
                  {selectedMonthObj ? `ประจำเดือน${selectedMonthObj.name} พ.ศ. ${yearThStr}` : `ตลอดทั้งปี พ.ศ. ${yearThStr}`}
                </span>
              </span>

              <span className="bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-xs">
                {stats.total} รายการ
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-slate-600">อนุมัติ/เสร็จสิ้น:</span>
                <strong className="text-emerald-700">{stats.approved}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-slate-600">รอดำเนินการ:</span>
                <strong className="text-amber-700">{stats.inProgress}</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-slate-600">อื่นๆ/ยกเลิก:</span>
                <strong className="text-slate-600">{stats.other}</strong>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                ไฟล์ CSV ประกอบด้วย 28 คอลัมน์มาตรฐาน: รหัสคำร้อง, วันเวลา, ผู้ยื่น, เลขบัตร, ชุมชน, วัตถุประสงค์, พิกัดจุดกล้อง, เจ้าหน้าที่, ผลการตรวจ 5 มิติ, ลายมือชื่อ และผลประเมิน
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick full export for complete record keeping */}
          <button
            type="button"
            onClick={() => handleExport(true)}
            disabled={isExporting || requests.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer text-xs"
            title="ส่งออกคำร้อง CCTV ทั้งหมดที่มีในระบบโดยไม่คัดกรองวันที่ สำหรับการจัดเก็บสำรองข้อมูลคลังสารบรรณ (Full Backup)"
          >
            <Archive className="w-3.5 h-3.5 text-slate-600" />
            <span>ส่งออกคลังคำร้องทั้งหมด ({requests.length})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => handleExport(false)}
              disabled={isExporting || filteredRequests.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 text-xs"
            >
              <Download className={`w-4 h-4 text-emerald-100 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>
                {isExporting 
                  ? 'กำลังสร้างไฟล์ CSV...' 
                  : `ดาวน์โหลด CSV ประจำเดือน (${filteredRequests.length} รายการ)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
