import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { getStatusLabelTh, getPriorityLabelTh } from '../utils/storage';
import { REQUEST_CATEGORIES } from '../data/categories';
import { 
  Printer, 
  Download, 
  X, 
  ShieldCheck, 
  FileSpreadsheet, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Calendar,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react';

import { getStoredOfficerRole, setStoredOfficerRole, verifyAdminPasscode } from '../utils/permissionsStorage';

interface MonthlyReportModalProps {
  requests: RequestItem[];
  onClose: () => void;
  isAdmin?: boolean;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  requests,
  onClose,
  isAdmin: propIsAdmin
}) => {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(
    propIsAdmin ?? (getStoredOfficerRole() === 'admin')
  );
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  const currentDate = new Date();

  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed

  // Filter requests submitted in selected month and year
  const monthlyRequests = requests.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  // KPI Calculations
  const totalMonthly = monthlyRequests.length;
  const approvedMonthly = monthlyRequests.filter(
    (r) => r.status === 'approved' || r.status === 'completed'
  ).length;
  const pendingMonthly = monthlyRequests.filter(
    (r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required'
  ).length;
  const rejectedMonthly = monthlyRequests.filter((r) => r.status === 'rejected').length;

  const approvalRate = totalMonthly > 0 ? Math.round((approvedMonthly / totalMonthly) * 100) : 0;
  const pendingRate = totalMonthly > 0 ? Math.round((pendingMonthly / totalMonthly) * 100) : 0;
  const rejectionRate = totalMonthly > 0 ? Math.round((rejectedMonthly / totalMonthly) * 100) : 0;

  // SLA Compliance calculation
  // Check how many completed/approved or overall requests are within SLA days limit
  const slaCompliantCount = monthlyRequests.filter((r) => {
    const cat = REQUEST_CATEGORIES.find((c) => c.id === r.category);
    const slaDays = cat ? cat.slaDays : 3;
    const start = new Date(r.createdAt).getTime();
    const end = new Date(r.updatedAt).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays <= slaDays;
  }).length;

  const slaComplianceRate = totalMonthly > 0 ? Math.round((slaCompliantCount / totalMonthly) * 100) : 100;

  // Category Distribution
  const categoryBreakdown = REQUEST_CATEGORIES.map((cat) => {
    const catRequests = monthlyRequests.filter((r) => r.category === cat.id);
    const count = catRequests.length;
    const percent = totalMonthly > 0 ? Math.round((count / totalMonthly) * 100) : 0;
    return {
      id: cat.id,
      title: cat.titleTh,
      slaDays: cat.slaDays,
      count,
      percent
    };
  }).filter((c) => c.count > 0 || totalMonthly === 0);

  // Priority Breakdown
  const priorityNormal = monthlyRequests.filter((r) => r.priority === 'normal' || !r.priority).length;
  const priorityUrgent = monthlyRequests.filter((r) => r.priority === 'urgent').length;
  const priorityHighest = monthlyRequests.filter((r) => r.priority === 'highest').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (monthlyRequests.length === 0) {
      alert('ไม่มีข้อมูลคำร้องในเดือนที่เลือกสำหรับการส่งออก');
      return;
    }

    const headers = [
      'รหัสคำร้อง (Tracking ID)',
      'หมวดหมู่ (Category)',
      'เรื่อง (Title)',
      'ระดับความสำคัญ (Priority)',
      'ชื่อผู้ยื่นคำร้อง (Applicant)',
      'รหัสประจำตัว/รหัสพนักงาน (ID)',
      'เบอร์โทรศัพท์ (Phone)',
      'สังกัด/หน่วยงาน (Department)',
      'สถานะปัจจุบัน (Status)',
      'เจ้าหน้าที่รับผิดชอบ (Officer)',
      'วันที่ยื่นคำร้อง (Created At)',
      'วันที่อัปเดตล่าสุด (Updated At)'
    ];

    const rows = monthlyRequests.map((r) => [
      r.id,
      r.category,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      getPriorityLabelTh(r.priority),
      `"${(r.applicant?.fullName || '').replace(/"/g, '""')}"`,
      r.applicant?.citizenIdOrCode || '',
      r.applicant?.phone || '',
      `"${(r.applicant?.department || '').replace(/"/g, '""')}"`,
      getStatusLabelTh(r.status),
      `"${(r.assignedOfficer || '').replace(/"/g, '""')}"`,
      new Date(r.createdAt).toLocaleString('th-TH'),
      new Date(r.updatedAt).toLocaleString('th-TH')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthNameEng = THAI_MONTHS[selectedMonth];
    link.setAttribute(
      'download',
      `รายงานสรุปคำร้องประจำเดือน_${monthNameEng}_${selectedYear + 543}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const docRefNo = `รายงานประจำเดือน สร. ${selectedYear + 543}/${String(selectedMonth + 1).padStart(2, '0')}`;
  const thaiYear = selectedYear + 543;
  const thaiMonthName = THAI_MONTHS[selectedMonth];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 my-4 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Top Controls Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                รายงานสรุปผลการดำเนินงานประจำเดือน (Monthly Executive Summary Report)
              </h3>
              <p className="text-xs text-slate-400">
                สถิติคำร้อง ดัชนีวัดผลงาน (KPIs) และรายงานเชิงวิเคราะห์สำหรับผู้บริหาร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer py-1 pr-1"
              >
                {THAI_MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-amber-300 font-bold outline-none cursor-pointer py-1 pr-1 border-l border-slate-700 pl-1.5"
              >
                <option value={2026} className="bg-slate-900 text-white">2569 (2026)</option>
                <option value={2025} className="bg-slate-900 text-white">2568 (2025)</option>
                <option value={2027} className="bg-slate-900 text-white">2570 (2027)</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs px-3 py-2 rounded-xl font-semibold transition-colors"
              title="ส่งออกรายงานประจำเดือนเป็นไฟล์ CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              ส่งออก CSV
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              พิมพ์รายงาน / PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        {!isAdminUnlocked ? (
          <div className="p-10 text-center space-y-6 max-w-lg mx-auto my-auto">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-md border border-amber-200">
              <ShieldCheck className="w-10 h-10 text-amber-600" />
            </div>
            <div className="space-y-2">
              <span className="inline-block text-xs font-extrabold text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
                🔒 สิทธิ์การใช้งานจำกัดเฉพาะ Admin
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) ในการจัดทำรายงานประจำเดือน
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                การเข้าถึงรายงานสรุปผลการดำเนินงานประจำเดือน สถิติ KPIs และการส่งออกข้อมูลสารบรรณ จำกัดเฉพาะผู้ใช้งานสิทธิ์ Admin เท่านั้น
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 shadow-sm">
              <label className="text-xs font-extrabold text-slate-800 block">
                🔑 ป้อนรหัสผ่าน Admin เพื่อยืนยันสิทธิ์:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (verifyAdminPasscode(adminPinInput)) {
                        setStoredOfficerRole('admin');
                        setIsAdminUnlocked(true);
                      } else {
                        setAdminPinError('รหัสผ่านไม่ถูกต้อง (รหัสทดสอบ: 1234 หรือ admin)');
                      }
                    }
                  }}
                  placeholder="รหัสผ่าน Admin (เช่น 1234 หรือ admin)"
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (verifyAdminPasscode(adminPinInput)) {
                      setStoredOfficerRole('admin');
                      setIsAdminUnlocked(true);
                    } else {
                      setAdminPinError('รหัสผ่านไม่ถูกต้อง (รหัสทดสอบ: 1234 หรือ admin)');
                    }
                  }}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  ปลดล็อก Admin
                </button>
              </div>
              {adminPinError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  ⚠️ {adminPinError}
                </p>
              )}
              <p className="text-[11px] text-slate-400">
                💡 คำแนะนำ: สำหรับบัญชีทดสอบในระบบ สามารถใช้รหัสผ่าน <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">1234</code> หรือ <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">admin</code>
              </p>
            </div>
          </div>
        ) : (
        <div id="monthly-printable-report" className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 text-slate-800 bg-white print:p-0 print:overflow-visible">

          
          {/* Formal Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center font-black text-2xl shadow-md border border-blue-700 shrink-0">
                  <ShieldCheck className="w-8 h-8 text-amber-300" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 block">
                    สำนักงานบริหารงานสารบรรณดิจิทัลและบริการออนไลน์
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    รายงานสรุปผลการดำเนินงานและดัชนีวัดผลประจำเดือน (Monthly Executive KPI Report)
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ประมวลผลคำร้องบริการออนไลน์ ประจำเดือน <strong className="text-blue-900">{thaiMonthName} พ.ศ. {thaiYear}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 space-y-1 shrink-0">
                <div className="font-mono font-bold text-slate-800">{docRefNo}</div>
                <div>วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</div>
                <div className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  ระดับความลับ: ปกติ (ใช้ภายใน)
                </div>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators (KPIs) Overview Grid */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-indigo-600 pl-2.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              1. สรุปดัชนีวัดผลการดำเนินงานหลัก (Key Performance Indicators - KPIs)
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Monthly Requests */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 font-semibold block">คำร้องยื่นทั้งหมดในเดือน</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{totalMonthly}</span>
                  <span className="text-xs text-slate-500 font-medium">รายการ</span>
                </div>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
                  100% ของคำร้องประจำเดือน
                </span>
              </div>

              {/* Approval / Completion Rate */}
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[11px] text-emerald-800 font-semibold block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  อัตราความสำเร็จ/อนุมัติ (Completion)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">{approvalRate}%</span>
                  <span className="text-xs text-emerald-700 font-bold">({approvedMonthly} เรื่อง)</span>
                </div>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-medium inline-block">
                  อนุมัติและเสร็จสิ้นเรียบร้อย
                </span>
              </div>

              {/* In-Progress / Pending Rate */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-1">
                <span className="text-[11px] text-amber-800 font-semibold block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  อยู่ระหว่างดำเนินการ (In-Progress)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-900">{pendingRate}%</span>
                  <span className="text-xs text-amber-700 font-bold">({pendingMonthly} เรื่อง)</span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-medium inline-block">
                  กำลังตรวจสอบ/รอเอกสาร
                </span>
              </div>

              {/* SLA Compliance Rate */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-1">
                <span className="text-[11px] text-indigo-900 font-semibold block flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  ประสิทธิภาพ SLA (Compliance)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">{slaComplianceRate}%</span>
                  <span className="text-xs text-indigo-700 font-bold">({slaCompliantCount}/{totalMonthly})</span>
                </div>
                <span className="text-[10px] text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded font-medium inline-block">
                  แล้วเสร็จตามกำหนดเวลา SLA
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Category Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-l-4 border-blue-600 pl-2">
                2.1 สถิติแยกตามหมวดหมู่คำร้อง (Category Distribution)
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                    <tr>
                      <th className="p-2.5 pl-3">หมวดหมู่บริการ</th>
                      <th className="p-2.5 text-center">SLA</th>
                      <th className="p-2.5 text-center">จำนวน</th>
                      <th className="p-2.5 text-right pr-3">สัดส่วน (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categoryBreakdown.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50">
                        <td className="p-2.5 pl-3 font-medium text-slate-800">{cat.title}</td>
                        <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">{cat.slaDays} วัน</td>
                        <td className="p-2.5 text-center font-bold text-slate-900">{cat.count}</td>
                        <td className="p-2.5 text-right pr-3 font-semibold text-blue-700">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${cat.percent}%` }} />
                            </div>
                            <span>{cat.percent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Priority & Status Breakdown */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-l-4 border-purple-600 pl-2">
                  2.2 สัดส่วนตามระดับความสำคัญ (Priority Distribution)
                </h3>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 block font-semibold">ปกติ (Normal)</span>
                    <span className="text-base font-bold text-slate-800">{priorityNormal} เรื่อง</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[10px] text-amber-800 block font-semibold">ด่วน (Urgent)</span>
                    <span className="text-base font-bold text-amber-900">{priorityUrgent} เรื่อง</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-[10px] text-rose-800 block font-semibold">ด่วนที่สุด (Highest)</span>
                    <span className="text-base font-bold text-rose-900">{priorityHighest} เรื่อง</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                  2.3 สถานะคำร้องในระบบ (Status Breakdown)
                </h3>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                    <span className="text-slate-600">ยื่นคำร้องแล้ว:</span>
                    <strong className="text-slate-900">{monthlyRequests.filter(r => r.status === 'submitted').length}</strong>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
                    <span className="text-amber-800">อยู่ระหว่างตรวจสอบ:</span>
                    <strong className="text-amber-900">{monthlyRequests.filter(r => r.status === 'under_review').length}</strong>
                  </div>
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex justify-between items-center">
                    <span className="text-purple-800">รอข้อมูลเพิ่มเติม:</span>
                    <strong className="text-purple-900">{monthlyRequests.filter(r => r.status === 'action_required').length}</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                    <span className="text-emerald-800">อนุมัติ/เสร็จสิ้น:</span>
                    <strong className="text-emerald-900">{approvedMonthly}</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Monthly Requests Detail Table */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-slate-800 pl-2.5">
                3. บัญชีแนบท้ายรายการคำร้องบริการประจำเดือน {thaiMonthName} {thaiYear} ({monthlyRequests.length} รายการ)
              </h2>
            </div>

            {monthlyRequests.length > 0 ? (
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white font-bold text-[11px]">
                    <tr>
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5">Tracking ID</th>
                      <th className="p-2.5">หมวดหมู่</th>
                      <th className="p-2.5">เรื่อง / ความประสงค์</th>
                      <th className="p-2.5">ผู้ยื่นคำร้อง (หน่วยงาน)</th>
                      <th className="p-2.5 text-center">วันที่ยื่น</th>
                      <th className="p-2.5 text-center">ความสำคัญ</th>
                      <th className="p-2.5 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {monthlyRequests.map((req, index) => {
                      const cat = REQUEST_CATEGORIES.find((c) => c.id === req.category);
                      return (
                        <tr key={req.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-2.5 text-center font-mono text-slate-400">{index + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-900">{req.id}</td>
                          <td className="p-2.5 text-slate-700 font-medium">{cat?.titleTh || req.category}</td>
                          <td className="p-2.5 font-medium text-slate-900 max-w-xs truncate">{req.title}</td>
                          <td className="p-2.5 text-slate-700">
                            <div className="font-semibold text-slate-900">{req.applicant?.fullName}</div>
                            <div className="text-[10px] text-slate-500">{req.applicant?.department}</div>
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {new Date(req.createdAt).toLocaleDateString('th-TH')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              req.priority === 'highest' ? 'bg-rose-100 text-rose-800' :
                              req.priority === 'urgent' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {getPriorityLabelTh(req.priority)}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="font-semibold text-slate-800">
                              {getStatusLabelTh(req.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                ไม่พบรายการคำร้องที่ยื่นบันทึกในเดือน {thaiMonthName} พ.ศ. {thaiYear}
              </div>
            )}
          </div>

          {/* Official Sign-off Block */}
          <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs space-y-0">
            <div className="space-y-12">
              <p className="font-bold text-slate-800">ลงชื่อ..........................................................</p>
              <div>
                <p className="font-semibold text-slate-900">(นางสาวจิราพร ใจดี)</p>
                <p className="text-[11px] text-slate-500">เจ้าหน้าที่รับเรื่องและรวบรวมรายงาน</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">ลงชื่อ..........................................................</p>
              <div>
                <p className="font-semibold text-slate-900">(นายสมศักดิ์ วงศ์สวัสดิ์)</p>
                <p className="text-[11px] text-slate-500">หัวหน้างานสารบรรณดิจิทัล</p>
              </div>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">ลงชื่อ..........................................................</p>
              <div>
                <p className="font-semibold text-slate-900">(ผศ.ดร. นพพร ปัญญาดี)</p>
                <p className="text-[11px] text-slate-500">รองอธิการบดีฝ่ายบริหารงานองค์กร</p>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-200">
            ระบบสารบรรณและคำร้องออนไลน์ดิจิทัล (Online Request & Electronic Correspondence System) • หน้า 1 จาก 1
          </div>

        </div>
        )}
      </div>
    </div>

  );
};
