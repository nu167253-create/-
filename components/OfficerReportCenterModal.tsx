import React, { useState, useEffect } from 'react';
import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { exportRequestsToCsv, exportRequestsToExcel, exportQuarterlyCctvRequestsToCsv, exportIncidentTrendsToCsv } from '../utils/csvExport';
import { getStatusLabelTh } from '../utils/storage';
import { exportRequestsToGoogleSheets } from '../utils/googleSheets';
import { exportRequestsToGoogleSlides } from '../utils/googleSlides';
import { exportRequestsToGoogleDocs } from '../utils/googleDocs';
import { googleSignIn, initAuth, logout, getAccessToken } from '../utils/googleAuth';
import { 
  getConnectedSheetId, 
  setConnectedSheetId, 
  disconnectSheet, 
  getUnsyncedRequests, 
  removeSyncedRequests, 
  appendRequestsToSheet 
} from '../utils/googleSheetsSync';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers,
  FileSpreadsheet,
  Award,
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck,
  UserCheck,
  CloudUpload,
  LogOut
} from 'lucide-react';

import { getStoredOfficerRole, setStoredOfficerRole, verifyAdminPasscode } from '../utils/permissionsStorage';

interface OfficerReportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestItem[];
  isAdmin?: boolean;
}

export const OfficerReportCenterModal: React.FC<OfficerReportCenterModalProps> = ({
  isOpen,
  onClose,
  requests,
  isAdmin: propIsAdmin
}) => {
  // Admin privilege check state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(
    propIsAdmin ?? (getStoredOfficerRole() === 'admin')
  );
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAdminUnlocked(propIsAdmin ?? (getStoredOfficerRole() === 'admin'));
      setAdminPinInput('');
      setAdminPinError(null);
    }
  }, [isOpen, propIsAdmin]);

  // Filter & Range State
  const [reportType, setReportType] = useState<'executive_summary' | 'master_ledger' | 'appointments_list' | 'category_breakdown'>('executive_summary');

  const [datePreset, setDatePreset] = useState<'current_month' | 'quarter' | 'fiscal_year' | 'custom'>('current_month');
  
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [officerFilter, setOfficerFilter] = useState<string>('all');

  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [connectedSheetId, setConnectedSheetIdState] = useState(getConnectedSheetId());
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const updateUnsynced = () => setUnsyncedCount(getUnsyncedRequests().length);
    updateUnsynced();
    // Periodically check if unsynced requests change
    const interval = setInterval(updateUnsynced, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter requests based on settings
  const filteredRequests = requests.filter((r) => {
    // Date filter
    const reqDate = r.createdAt.slice(0, 10);
    if (datePreset === 'current_month') {
      const isCurrentMonth = r.createdAt.startsWith(now.toISOString().slice(0, 7));
      if (!isCurrentMonth) return false;
    } else if (datePreset === 'custom') {
      if (startDate && reqDate < startDate) return false;
      if (endDate && reqDate > endDate) return false;
    }

    // Status filter
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;

    // Category filter
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;

    // Priority filter
    if (selectedPriority !== 'all' && r.priority !== selectedPriority) return false;

    // Officer filter
    if (officerFilter !== 'all' && r.assignedOfficer !== officerFilter) return false;

    return true;
  });

  // Unique Officers list
  const officerList = Array.from(new Set(requests.map((r) => r.assignedOfficer).filter(Boolean)));

  // Report Calculations
  const totalReportCount = filteredRequests.length;
  const approvedCount = filteredRequests.filter((r) => r.status === 'approved' || r.status === 'completed').length;
  const pendingCount = filteredRequests.filter((r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required').length;
  const rejectedCount = filteredRequests.filter((r) => r.status === 'rejected').length;
  const completionRate = totalReportCount > 0 ? Math.round((approvedCount / totalReportCount) * 100) : 0;
  const urgentCount = filteredRequests.filter((r) => r.priority === 'urgent' || r.priority === 'very_urgent' || r.priority === 'immediate').length;
  const appointmentsCount = filteredRequests.filter((r) => r.appointment && r.appointment.status !== 'cancelled').length;

  const handleExportCSV = () => {
    exportRequestsToCsv(filteredRequests, 'รายงานสรุปผลงานสารบรรณ_CSV');
  };

  const handleExportIncidentTrendsCSV = () => {
    exportIncidentTrendsToCsv(filteredRequests, 'รายงานวิเคราะห์แนวโน้มเหตุการณ์_Incident_Trends');
  };

  const handleExportQuarterlyCSV = () => {
    exportQuarterlyCctvRequestsToCsv(filteredRequests, 'รายงานประจำไตรมาส', 'รายงานสรุปคำร้อง_CCTV_ประจำไตรมาส');
  };

  const handleExportExcel = () => {
    exportRequestsToExcel(filteredRequests, 'รายงานสรุปผลงานสารบรรณ_Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
      alert('การเข้าสู่ระบบล้มเหลว (Login failed)');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleExportGoogleSheets = async () => {
    const confirmed = window.confirm(
      `คุณต้องการสร้าง Google Sheets ใหม่และส่งออกข้อมูลคำร้องจำนวน ${filteredRequests.length} รายการใช่หรือไม่? (Create new Google Sheet?)`
    );
    if (!confirmed) return;

    if (needsAuth) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนส่งออกข้อมูล');
      return;
    }

    setIsExporting(true);
    try {
      const url = await exportRequestsToGoogleSheets(filteredRequests, 'รายงานสรุปผลงานสารบรรณ_Google_Sheets');
      const openSheet = window.confirm(`ส่งออกข้อมูลสำเร็จแล้ว! \n\nต้องการเปิด Google Sheets ตอนนี้เลยหรือไม่?`);
      if (openSheet) {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      console.error('Export to Google Sheets failed:', err);
      alert(`การส่งออกผิดพลาด: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGoogleSlides = async () => {
    const confirmed = window.confirm(
      `คุณต้องการสร้าง Google Slides นำเสนอข้อมูลสถิติสําหรับข้อมูลคำร้องจำนวน ${filteredRequests.length} รายการใช่หรือไม่? (Create new Google Slides?)`
    );
    if (!confirmed) return;

    if (needsAuth) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนส่งออกข้อมูล');
      return;
    }

    setIsExporting(true);
    try {
      const url = await exportRequestsToGoogleSlides(filteredRequests, 'รายงานสรุปผลงานสารบรรณ_Google_Slides');
      const openSlides = window.confirm(`ส่งออกสไลด์สำเร็จแล้ว! \n\nต้องการเปิด Google Slides ตอนนี้เลยหรือไม่?`);
      if (openSlides) {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      console.error('Export to Google Slides failed:', err);
      alert(`การส่งออกสไลด์ผิดพลาด: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGoogleDocs = async () => {
    const confirmed = window.confirm(
      `คุณต้องการสร้าง Google Docs รายงานสรุปคำร้องสารบรรณสำหรับข้อมูลจำนวน ${filteredRequests.length} รายการใช่หรือไม่? (Create new Google Doc Report?)`
    );
    if (!confirmed) return;

    if (needsAuth) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนส่งออกข้อมูล');
      return;
    }

    setIsExporting(true);
    try {
      const url = await exportRequestsToGoogleDocs(filteredRequests, 'รายงานสรุปผลงานสารบรรณ_Google_Docs');
      const openDocs = window.confirm(`ส่งออกเอกสาร Google Docs สำเร็จแล้ว! \n\nต้องการเปิด Google Docs ตอนนี้เลยหรือไม่?`);
      if (openDocs) {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      console.error('Export to Google Docs failed:', err);
      alert(`การส่งออก Google Docs ผิดพลาด: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConnectSheet = () => {
    if (!(sheetIdInput || '').trim()) return;
    
    let extractedId = (sheetIdInput || '').trim();
    if (extractedId.includes('spreadsheets/d/')) {
      const match = extractedId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        extractedId = match[1];
      }
    }
    
    setConnectedSheetId(extractedId);
    setConnectedSheetIdState(extractedId);
    setSheetIdInput('');
  };

  const handleDisconnectSheet = () => {
    disconnectSheet();
    setConnectedSheetIdState(null);
  };

  const handleSyncPending = async () => {
    if (!connectedSheetId) return;
    const unsyncedIds = getUnsyncedRequests();
    if (unsyncedIds.length === 0) return;
    
    if (needsAuth) {
      alert('กรุณาเข้าสู่ระบบด้วยบัญชี Google ก่อนทำการซิงค์ข้อมูล');
      return;
    }
    
    setIsSyncing(true);
    try {
      const requestsToSync = requests.filter(r => unsyncedIds.includes(r.id));
      await appendRequestsToSheet(requestsToSync, connectedSheetId);
      removeSyncedRequests(unsyncedIds);
      setUnsyncedCount(0);
      alert('ซิงค์ข้อมูลสำเร็จ');
    } catch (err: any) {
      console.error('Failed to sync to Google Sheets:', err);
      alert(`การซิงค์ผิดพลาด: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      
      {/* Printable Paper Layer (Only visible when printing) */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 text-black font-serif">
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-4 mb-6">
          <div className="font-bold text-2xl">ตราครุฑ / รายงานผลการดำเนินงานสารบรรณประจำหน่วยงาน</div>
          <div className="text-lg font-semibold">ศูนย์บริการประชาชนและรับเรื่องร้องเรียนร้องทุกข์</div>
          <p className="text-xs text-slate-600">
            พิมพ์รายงาน ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="space-y-4 mb-6 text-sm">
          <div className="font-bold text-base">สรุปภาพรวมคำร้อง (Executive Overview)</div>
          <div className="grid grid-cols-4 gap-4 border p-4 rounded-lg bg-slate-50 text-center text-xs">
            <div>คำร้องทั้งหมด: <strong>{totalReportCount}</strong> เรื่อง</div>
            <div>อนุมัติ/แล้วเสร็จ: <strong>{approvedCount}</strong> เรื่อง ({completionRate}%)</div>
            <div>อยู่ระหว่างดำเนินการ: <strong>{pendingCount}</strong> เรื่อง</div>
            <div>ไม่อนุมัติ: <strong>{rejectedCount}</strong> เรื่อง</div>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-slate-400 mb-8">
          <thead>
            <tr className="bg-slate-200 text-slate-900">
              <th className="border border-slate-400 p-2">เลขคำร้อง</th>
              <th className="border border-slate-400 p-2">วันที่ยื่น</th>
              <th className="border border-slate-400 p-2">ผู้ยื่นคำร้อง</th>
              <th className="border border-slate-400 p-2">หัวข้อเรื่อง</th>
              <th className="border border-slate-400 p-2">สถานะ</th>
              <th className="border border-slate-400 p-2">เจ้าหน้าที่</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((r) => (
              <tr key={r.id}>
                <td className="border border-slate-400 p-2 font-mono font-bold">{r.id}</td>
                <td className="border border-slate-400 p-2">{r.createdAt.slice(0, 10)}</td>
                <td className="border border-slate-400 p-2">{r.applicant.prefix}{r.applicant.fullName}</td>
                <td className="border border-slate-400 p-2">{r.title}</td>
                <td className="border border-slate-400 p-2 font-bold">{getStatusLabelTh(r.status)}</td>
                <td className="border border-slate-400 p-2">{r.assignedOfficer || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 pt-8 border-t border-slate-400 flex justify-around text-center text-xs">
          <div>
            <p className="mb-8">(ลงชื่อ)........................................................</p>
            <p className="font-bold">เจ้าหน้าที่ผู้จัดทำรายงาน</p>
          </div>
          <div>
            <p className="mb-8">(ลงชื่อ)........................................................</p>
            <p className="font-bold">หัวหน้างานสารบรรณ / ผู้รับรองรายงาน</p>
          </div>
        </div>
      </div>

      {/* Screen Interactive Dialog Container */}
      <div className="print:hidden bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30 shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold">
                  ศูนย์จัดทำรายงานและสรุปข้อมูลสารบรรณ (Executive Officer Report Center)
                </h3>
                {isAdminUnlocked ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    👑 สิทธิ์ Admin (ผู้ดูแลระบบ)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    🔒 สิทธิ์เฉพาะ Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                กำหนดเงื่อนไขรายงาน สรุปสถิติภาระงาน พิมพ์รายงานทางราชการ หรือส่งออกเป็นไฟล์ CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll Area */}
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
                ต้องใช้สิทธิ์ผู้ดูแลระบบ (Admin) ในการจัดทำรายงาน
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ระบบจำกัดสิทธิ์การจัดทำรายงานสรุปผู้บริหาร การพิมพ์หนังสือราชการ และการส่งออกข้อมูลคำร้องเฉพาะเจ้าหน้าที่ระดับผู้ดูแลระบบ (Admin) เท่านั้น
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
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
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
          <>
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800">


          
          {/* CONTROL SECTION: Report Filters & Type Selection */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                เงื่อนไขการกรองข้อมูลและรูปแบบรายงาน (Report Configuration)
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                พบข้อมูลตรงเงื่อนไข {totalReportCount} รายการ
              </span>
            </div>

            {/* Report Type Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-semibold">
              {[
                { id: 'executive_summary', label: '📊 สรุปผู้บริหาร & KPIs', desc: 'สถิติภาพรวมและอัตราความสำเร็จ' },
                { id: 'master_ledger', label: '📋 ทะเบียนรับเรื่องสารบรรณ', desc: 'ตารางสรุปคำร้องทั้งหมด' },
                { id: 'appointments_list', label: '📅 ตารางการนัดหมาย', desc: 'รายการนัดหมายเข้ารับบริการ' },
                { id: 'category_breakdown', label: '📁 จำแนกตามหมวดหมู่', desc: 'แจกแจงตามประเภทเรื่อง' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reportType === t.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold scale-[1.01]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className={`text-[10px] ${reportType === t.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">ช่วงเวลา (Date Range)</label>
                <select
                  value={datePreset}
                  onChange={(e: any) => setDatePreset(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current_month">🗓️ เดือนปัจจุบัน ({now.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })})</option>
                  <option value="quarter">📈 ไตรมาสปัจจุบัน</option>
                  <option value="fiscal_year">🏛️ ปีงบประมาณ 2569</option>
                  <option value="custom">⚙️ กำหนดวันที่เอง (Custom)</option>
                </select>
              </div>

              {datePreset === 'custom' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">กรองสถานะ</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ทุกสถานะ (All Statuses)</option>
                  <option value="submitted">ยื่นเรื่องแล้ว</option>
                  <option value="under_review">อยู่ระหว่างตรวจสอบ</option>
                  <option value="action_required">ขอเอกสารเพิ่มเติม</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="completed">เสร็จสิ้นแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กรองหมวดหมู่</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ทุกหมวดหมู่บริการ (All Categories)</option>
                  {REQUEST_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.titleTh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กรองเจ้าหน้าที่ผู้รับผิดชอบ</label>
                <select
                  value={officerFilter}
                  onChange={(e) => setOfficerFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">เจ้าหน้าที่ทั้งหมด (All Officers)</option>
                  {officerList.map((off) => (
                    <option key={off} value={off}>
                      {off}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* KPI STATS CARDS SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-800 block">คำร้องทั้งหมด</span>
                <span className="text-xl font-extrabold text-blue-950">{totalReportCount} <span className="text-xs font-normal">เรื่อง</span></span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-blue-200/80 text-blue-800 flex items-center justify-center font-bold text-xs">
                100%
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 block">อนุมัติ/แล้วเสร็จ</span>
                <span className="text-xl font-extrabold text-emerald-950">{approvedCount} <span className="text-xs font-normal">เรื่อง</span></span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-200/80 text-emerald-900 flex items-center justify-center font-bold text-xs">
                {completionRate}%
              </div>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-800 block">รอดำเนินการ</span>
                <span className="text-xl font-extrabold text-amber-950">{pendingCount} <span className="text-xs font-normal">เรื่อง</span></span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold text-xs">
                {totalReportCount > 0 ? Math.round((pendingCount / totalReportCount) * 100) : 0}%
              </div>
            </div>

            <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-purple-800 block">มีการนัดหมาย</span>
                <span className="text-xl font-extrabold text-purple-950">{appointmentsCount} <span className="text-xs font-normal">เคส</span></span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-purple-200/80 text-purple-900 flex items-center justify-center font-bold text-xs">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-rose-800 block">งานด่วนพิเศษ</span>
                <span className="text-xl font-extrabold text-rose-950">{urgentCount} <span className="text-xs font-normal">เรื่อง</span></span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-200/80 text-rose-900 flex items-center justify-center font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* REPORT PREVIEW TABLE / CONTENT */}
          
          {/* AUTO SYNC SECTION */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CloudUpload className="w-4 h-4" />
                ซิงค์ข้อมูลคำร้องอัตโนมัติ (Google Sheets Auto-Sync)
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                รายการที่รอซิงค์: {unsyncedCount} รายการ
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              {connectedSheetId ? (
                <>
                  <div className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-emerald-900 font-mono truncate max-w-xs">{connectedSheetId}</span>
                    <button 
                      onClick={handleDisconnectSheet}
                      className="text-red-500 font-bold hover:text-red-700 underline text-[10px]"
                    >
                      ยกเลิกการเชื่อมต่อ
                    </button>
                  </div>
                  <button
                    onClick={handleSyncPending}
                    disabled={unsyncedCount === 0 || needsAuth || isSyncing}
                    className={`px-4 py-2 rounded-xl text-white font-bold transition-colors shadow-sm whitespace-nowrap ${
                      unsyncedCount === 0 || needsAuth
                        ? 'bg-emerald-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    }`}
                  >
                    {isSyncing ? 'กำลังซิงค์...' : 'เริ่มซิงค์ข้อมูล (Sync Now)'}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    placeholder="วาง Google Sheet ID หรือ URL ที่นี่..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleConnectSheet}
                    disabled={!(sheetIdInput || '').trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors disabled:bg-slate-400"
                  >
                    บันทึกการเชื่อมต่อ
                  </button>
                </>
              )}
            </div>
            {!connectedSheetId && (
              <p className="text-[10px] text-emerald-700">
                💡 นำ Sheet ID มาจากการสร้าง Google Sheet เปล่า หรือใช้ฟังก์ชัน "ส่งออก Sheets" ด้านล่างแล้วนำ ID ของไฟล์นั้นมาใส่ที่นี่เพื่อซิงค์ข้อมูลใหม่ต่อท้ายอัตโนมัติ
              </p>
            )}
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-slate-100 text-slate-800 rounded-xl font-bold">
                  📄
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    แสดงตัวอย่างรายงาน: {
                      reportType === 'executive_summary' ? 'รายงานสรุปภาพรวมผู้บริหาร' :
                      reportType === 'master_ledger' ? 'ทะเบียนรับคำร้องและสถานะงานสารบรรณ' :
                      reportType === 'appointments_list' ? 'ตารางรายชื่อการนัดหมาย' : 'จำแนกคำร้องตามหมวดหมู่บริการ'
                    }
                  </h4>
                  <p className="text-xs text-slate-500">
                    ข้อมูลตามตัวกรองที่เลือกจำนวน {filteredRequests.length} รายการ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  ส่งออก CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์รายงาน PDF / ทางราชการ
                </button>
              </div>
            </div>

            {/* Table Representation */}
            {filteredRequests.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">เลขที่คำร้อง</th>
                      <th className="p-3">วันที่รับเรื่อง</th>
                      <th className="p-3">ผู้ยื่นคำร้อง</th>
                      <th className="p-3">หัวข้อเรื่อง</th>
                      <th className="p-3">หมวดหมู่</th>
                      <th className="p-3">ความเร่งด่วน</th>
                      <th className="p-3">สถานะล่าสุด</th>
                      <th className="p-3">เจ้าหน้าที่</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">{r.id}</td>
                        <td className="p-3 whitespace-nowrap text-slate-600">{r.createdAt.slice(0, 10)}</td>
                        <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                          {r.applicant.prefix}{r.applicant.fullName}
                        </td>
                        <td className="p-3 font-medium max-w-xs truncate">{r.title}</td>
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {REQUEST_CATEGORIES.find((c) => c.id === r.category)?.titleTh || r.category}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {r.priority === 'urgent' || r.priority === 'immediate' ? (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                              🔥 {r.priority === 'immediate' ? 'ด่วนที่สุด' : 'ด่วน'}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">ปกติ</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold">
                          <span className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 border border-slate-200 text-slate-800">
                            {getStatusLabelTh(r.status)}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-600">{r.assignedOfficer || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">
                ไม่พบข้อมูลคำร้องตามเงื่อนไขตัวกรองรายงานที่ระบุ
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {needsAuth ? (
              <button
                onClick={handleLogin}
                className="gsi-material-button text-xs"
                style={{ backgroundColor: 'white', border: '1px solid #dadce0', borderRadius: '4px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}
              >
                <div className="gsi-material-button-icon" style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents" style={{ color: '#3c4043' }}>Sign in to enable Workspace</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Logged in as {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-slate-500 hover:text-slate-700 underline"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportGoogleDocs}
              disabled={needsAuth || isExporting}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer ${
                needsAuth ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title="สร้างเอกสารรายงานทางการใน Google Docs"
            >
              <FileText className="w-4 h-4 text-blue-100" />
              {isExporting ? 'กำลังสร้าง...' : 'สร้าง Google Docs'}
            </button>
            <button
              onClick={handleExportGoogleSlides}
              disabled={needsAuth || isExporting}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer ${
                needsAuth ? 'bg-slate-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
              }`}
              title="สร้างงานนำเสนอ Google Slides"
            >
              <FileText className="w-4 h-4 text-orange-100" />
              {isExporting ? 'กำลังสร้าง...' : 'สร้าง Slides'}
            </button>
            <button
              onClick={handleExportGoogleSheets}
              disabled={needsAuth || isExporting}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer ${
                needsAuth ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
              title="ส่งออกรายงานไปยัง Google Sheets"
            >
              <CloudUpload className="w-4 h-4 text-emerald-100" />
              {isExporting ? 'กำลังส่งออก...' : 'ส่งออก Sheets'}
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกรายงานข้อมูลทั้งหมดเป็นไฟล์ Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              ส่งออก Excel (.xlsx)
            </button>
            <button
              onClick={handleExportIncidentTrendsCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white font-extrabold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer border border-teal-400/40"
              title="ส่งออกรายงาน CSV วิเคราะห์แนวโน้มเหตุการณ์ (Quarter, Month, SLA, AI Topic, Locations) สำหรับ Offline Analysis"
            >
              <BarChart3 className="w-4 h-4 text-cyan-200" />
              CSV วิเคราะห์แนวโน้ม
            </button>
            <button
              onClick={handleExportQuarterlyCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกรายงานคำร้อง CCTV รายไตรมาสแบบเต็มรูปแบบ (.csv)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              ส่งออก CSV ไตรมาส
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกรายงานข้อมูลเป็นไฟล์ CSV UTF-8 (.csv)"
            >
              <Download className="w-4 h-4 text-blue-200" />
              ส่งออก CSV (.csv)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              พิมพ์รายงานฉบับสมบูรณ์ (Print PDF)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-xs hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </>
      )}



      </div>
    </div>

  );
};
