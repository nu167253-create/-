import React, { useState, useMemo } from 'react';
import { RequestItem, RequestCategory } from '../types/request';
import { CameraInspectionItem, AdminFolderItem } from '../types/adminFolders';
import { getStoredRequests } from '../utils/storage';
import { 
  getStoredCameraInspections, 
  addCameraInspectionReport, 
  deleteCameraInspectionReport,
  getCustomAdminFolders,
  saveCustomAdminFolders
} from '../utils/adminFolderStorage';
import { NewCameraInspectionModal } from './NewCameraInspectionModal';
import { PrintableInspectionReportModal } from './PrintableInspectionReportModal';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  FileText, 
  FileSpreadsheet, 
  Video, 
  Image as ImageIcon, 
  Search, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Printer, 
  Plus, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  HardDrive, 
  Calendar, 
  Camera, 
  Layers, 
  Wrench, 
  Clock, 
  Eye, 
  Filter, 
  Trash2, 
  ArrowLeft,
  ExternalLink,
  Star,
  Zap,
  Activity,
  Maximize2
} from 'lucide-react';

interface AdminFolderSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  defaultActiveTab?: MainFolderTab | string;
  onSelectRequest?: (req: RequestItem) => void;
}

type MainFolderTab = 'requests_hub' | 'camera_maintenance_hub';

export const AdminFolderSystemModal: React.FC<AdminFolderSystemModalProps> = ({
  isOpen,
  onClose,
  adminName,
  defaultActiveTab,
  onSelectRequest
}) => {
  const [activeTab, setActiveTab] = useState<MainFolderTab>(
    (defaultActiveTab as MainFolderTab) || 'requests_hub'
  );
  
  // Data states
  const [requests, setRequests] = useState<RequestItem[]>(getStoredRequests());
  const [inspections, setInspections] = useState<CameraInspectionItem[]>(getStoredCameraInspections());
  const [customFolders, setCustomFolders] = useState<AdminFolderItem[]>(getCustomAdminFolders());
  
  // Folder Navigation State
  const [currentRequestFolder, setCurrentRequestFolder] = useState<string | null>(null);
  const [currentInspectionFolder, setCurrentInspectionFolder] = useState<string | null>(null);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inspectionResultFilter, setInspectionResultFilter] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  
  // Submodals
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false);
  const [selectedInspectionForPrint, setSelectedInspectionForPrint] = useState<CameraInspectionItem | null>(null);
  const [selectedRequestDossier, setSelectedRequestDossier] = useState<RequestItem | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [newFolderDescInput, setNewFolderDescInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Predefined Request Virtual Folders
  const REQUEST_CATEGORIES_FOLDERS = [
    { id: 'cat_cctv', name: '01_คำร้องขอดูภาพกล้องวงจรปิด (CCTV Footage & Evidence)', category: 'cctv', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { id: 'cat_maintenance', name: '02_คำร้องแจ้งซ่อมและโครงสร้างพื้นฐาน (Infrastructure & Repairs)', category: 'maintenance', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'cat_general', name: '03_คำร้องงานบริการทั่วไปและสารบรรณ (General Services & Records)', category: 'general', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'cat_disaster', name: '04_คำร้องงานป้องกันและบรรเทาสาธารณภัย (Disaster & Fire Safety)', category: 'disaster', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'cat_sanitation', name: '05_คำร้องงานสุขาภิบาลและสิ่งแวดล้อม (Sanitation & Environment)', category: 'sanitation', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
    { id: 'status_approved', name: '06_แฟ้มคำร้องที่อนุมัติแล้ว (Approved Requests Archive)', filterType: 'status_approved', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    { id: 'status_pending', name: '07_แฟ้มคำร้องรอดำเนินการ (Pending Requests Docket)', filterType: 'status_pending', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    { id: 'urgent_cases', name: '08_แฟ้มคำร้องด่วนและคดีความ (Urgent Cases & Police Reports)', filterType: 'urgent', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
  ];

  // Predefined Camera Maintenance Virtual Folders
  const MAINTENANCE_FOLDERS = [
    { id: 'maint_lens', name: '01_รายงานทำความสะอาดหน้ากล้องและเลนส์ (Lens & Dome Cleaning Logs)', type: 'lens', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    { id: 'maint_cabinet', name: '02_รายงานตรวจเช็คตู้ควบคุมและไฟเลี้ยง UPS (Cabinet & Power Supply)', type: 'power', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'maint_network', name: '03_รายงานตรวจเช็คโครงข่ายและสาย Fiber (Fiber & Network Checklists)', type: 'network', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'maint_nvr', name: '04_รายงานตรวจเช็คระบบบันทึก NVR และฮาร์ดดิสก์ (NVR Storage & Recording)', type: 'nvr', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'maint_monthly_pm', name: '05_บันทึกการบำรุงรักษาเชิงป้องกันประจำเดือน (Monthly PM Reports)', type: 'monthly', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'maint_critical', name: '06_รายงานเหตุขัดข้องและชำรุดวิกฤต (Critical Defects & Emergency)', type: 'critical', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
  ];

  // Filtered Requests Logic
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchText = (
          req.id.toLowerCase().includes(q) ||
          req.title.toLowerCase().includes(q) ||
          req.applicant.fullName.toLowerCase().includes(q) ||
          (req.reason && req.reason.toLowerCase().includes(q)) ||
          (req.details?.location && req.details.location.toLowerCase().includes(q))
        );
        if (!matchText) return false;
      }

      // Folder drilldown filter
      if (currentRequestFolder) {
        const f = REQUEST_CATEGORIES_FOLDERS.find(item => item.id === currentRequestFolder);
        if (f) {
          if (f.category && req.category !== f.category) return false;
          if (f.filterType === 'status_approved' && (req.status !== 'approved' && req.status !== 'completed')) return false;
          if (f.filterType === 'status_pending' && (req.status !== 'submitted' && req.status !== 'under_review')) return false;
          if (f.filterType === 'urgent' && req.priority !== 'urgent' && req.priority !== 'high' && !req.title.includes('คดี') && !req.title.includes('ตำรวจ')) return false;
        }
      }

      // Status dropdown filter
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;

      return true;
    });
  }, [requests, searchQuery, currentRequestFolder, statusFilter]);

  // Filtered Inspections Logic
  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (
          insp.reportNo.toLowerCase().includes(q) ||
          insp.cameraId.toLowerCase().includes(q) ||
          insp.cameraName.toLowerCase().includes(q) ||
          insp.inspectorName.toLowerCase().includes(q) ||
          insp.zone.toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      // Folder drilldown filter
      if (currentInspectionFolder) {
        if (currentInspectionFolder === 'maint_lens' && !insp.lensCleaning) return false;
        if (currentInspectionFolder === 'maint_cabinet' && insp.upsBackupStatus === 'no_ups') return false;
        if (currentInspectionFolder === 'maint_critical' && insp.overallResult !== 'critical_defect') return false;
        if (currentInspectionFolder === 'maint_monthly_pm' && !insp.reportNo.startsWith('PM-')) return false;
        if (currentInspectionFolder === 'maint_nvr' && insp.nvrRecordingStatus === 'recording' && insp.networkPingMs < 20) return true;
      }

      // Result filter
      if (inspectionResultFilter !== 'all' && insp.overallResult !== inspectionResultFilter) return false;

      // Zone filter
      if (selectedZone !== 'all' && insp.zone !== selectedZone) return false;

      return true;
    });
  }, [inspections, searchQuery, currentInspectionFolder, inspectionResultFilter, selectedZone]);

  // Distinct Zones
  const distinctZones = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach(i => {
      if (i.zone) set.add(i.zone);
    });
    return Array.from(set);
  }, [inspections]);

  // Handle Save New Inspection
  const handleSaveNewInspection = (report: Omit<CameraInspectionItem, 'id'>) => {
    const created = addCameraInspectionReport(report);
    setInspections(getStoredCameraInspections());
    showToast(`✓ บันทึกรายงานตรวจเช็ค ${created.reportNo} (${created.cameraId}) เรียบร้อยแล้ว`);
  };

  // Handle Delete Inspection
  const handleDeleteInspection = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายงานการตรวจเช็คนี้?')) {
      deleteCameraInspectionReport(id);
      setInspections(getStoredCameraInspections());
      showToast('ลบรายงานเรียบร้อยแล้ว');
    }
  };

  // Handle Create Custom Folder
  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderNameInput.trim()) return;
    const newFolder: AdminFolderItem = {
      id: `folder-${Date.now()}`,
      name: newFolderNameInput.trim(),
      description: newFolderDescInput.trim() || 'โฟลเดอร์จัดเก็บข้อมูลที่กำหนดเองสำหรับ Admin',
      type: activeTab === 'requests_hub' ? 'request_archive' : 'camera_maintenance',
      itemCount: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
    };
    const updated = [newFolder, ...customFolders];
    setCustomFolders(updated);
    saveCustomAdminFolders(updated);
    setShowNewFolderModal(false);
    setNewFolderNameInput('');
    setNewFolderDescInput('');
    showToast(`✓ สร้างโฟลเดอร์ "${newFolder.name}" สำเร็จ`);
  };

  // Export Inspections to CSV
  const handleExportInspectionsCsv = () => {
    if (inspections.length === 0) return;
    const headers = [
      'เลขที่รายงาน',
      'วันที่',
      'เวลา',
      'รหัสกล้อง',
      'ชื่อกล้อง/จุดติดตั้ง',
      'ตู้ควบคุม/โซน',
      'ผู้ตรวจเช็ค',
      'ตำแหน่ง',
      'ผลทำความสะอาดเลนส์',
      'ระดับความคมชัด(1-5)',
      'สภาพตัวกล้อง/ขายึด',
      'ซีลกันน้ำ',
      'แรงดันไฟ',
      'สถานะUPS',
      'Network Ping (ms)',
      'สถานะNVR',
      'สรุปผลประเมิน',
      'การแก้ไข',
      'ผู้รับรอง'
    ];

    const rows = inspections.map(i => [
      `"${i.reportNo}"`,
      `"${i.date}"`,
      `"${i.time}"`,
      `"${i.cameraId}"`,
      `"${i.cameraName}"`,
      `"${i.zone}"`,
      `"${i.inspectorName}"`,
      `"${i.inspectorPosition}"`,
      `"${i.lensCleaning ? 'เช็ดแล้ว' : 'ยังไม่เช็ด'}"`,
      `"${i.lensClarityRating}"`,
      `"${i.housingCondition}"`,
      `"${i.waterproofSeal ? 'ปกติ' : 'ต้องแก้ไข'}"`,
      `"${i.powerSupplyVoltage}"`,
      `"${i.upsBackupStatus}"`,
      `"${i.networkPingMs}"`,
      `"${i.nvrRecordingStatus}"`,
      `"${i.overallResult}"`,
      `"${i.actionTaken || ''}"`,
      `"${i.verifiedBy || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCTV_Maintenance_Cleaning_Reports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 ดาวน์โหลดไฟล์รายงาน CSV เรียบร้อยแล้ว');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 md:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto flex flex-col h-[94vh]">
        
        {/* Top Hub Navigation Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 flex-wrap gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg flex items-center justify-center text-white">
              <Folder className="w-6 h-6 fill-white/20 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  ระบบคลังโฟลเดอร์ข้อมูล & รายงานตรวจเช็คกล้อง (Admin Archive Hub)
                </h2>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  🛡️ Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เทศบาลเมืองชัยภูมิ • ศูนย์บริหารจัดการแฟ้มคำร้องดิจิทัล และ บันทึกการทำความสะอาด/ตรวจเช็คอุปกรณ์กล้อง CCTV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>สร้างโฟลเดอร์ใหม่</span>
            </button>

            {activeTab === 'camera_maintenance_hub' && (
              <>
                <button
                  onClick={handleExportInspectionsCsv}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="ส่งออกรายงานการตรวจเช็คและทำความสะอาดทั้งหมดเป็นไฟล์ CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>ส่งออก CSV</span>
                </button>

                <button
                  onClick={() => setShowNewInspectionModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all cursor-pointer scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ บันทึกตรวจเช็ค/ทำความสะอาดใหม่</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Dual Tab Navigation Switcher */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            
            <button
              onClick={() => {
                setActiveTab('requests_hub');
                setCurrentRequestFolder(null);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'requests_hub'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📁 โฟลเดอร์เก็บข้อมูลคำร้อง (Citizen Requests Archive)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'requests_hub' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {requests.length} แฟ้ม
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('camera_maintenance_hub');
                setCurrentInspectionFolder(null);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera_maintenance_hub'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>📁 โฟลเดอร์รายงานทำความสะอาด & ตรวจเช็คอุปกรณ์กล้อง (Cleaning & Hardware PM)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'camera_maintenance_hub' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {inspections.length} รายงาน
              </span>
            </button>

          </div>

          {/* Breadcrumb Path Display */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Root (Admin Storage)
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-200 font-bold">
              {activeTab === 'requests_hub' ? '📂 คำร้องประชาชน' : '📂 รายงานตรวจเช็คและทำความสะอาดกล้อง'}
            </span>
            {activeTab === 'requests_hub' && currentRequestFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-blue-300 font-bold bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/30">
                  {REQUEST_CATEGORIES_FOLDERS.find(f => f.id === currentRequestFolder)?.name || currentRequestFolder}
                </span>
                <button
                  onClick={() => setCurrentRequestFolder(null)}
                  className="text-xs text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                >
                  [ย้อนกลับ]
                </button>
              </>
            )}
            {activeTab === 'camera_maintenance_hub' && currentInspectionFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-400/30">
                  {MAINTENANCE_FOLDERS.find(f => f.id === currentInspectionFolder)?.name || currentInspectionFolder}
                </span>
                <button
                  onClick={() => setCurrentInspectionFolder(null)}
                  className="text-xs text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                >
                  [ย้อนกลับ]
                </button>
              </>
            )}
          </div>

        </div>

        {/* Search & Filter Bar */}
        <div className="bg-slate-900/90 px-6 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 text-xs shrink-0">
          
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={activeTab === 'requests_hub' ? 'ค้นหาแฟ้มคำร้อง, Track ID, ชื่อผู้ยื่น, สถานที่...' : 'ค้นหารายงานตรวจเช็ค, รหัสกล้อง, ผู้ตรวจเช็ค, โซน...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {activeTab === 'requests_hub' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-medium">กรองสถานะคำร้อง:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">ทุกสถานะ ({requests.length})</option>
                <option value="submitted">ยื่นคำร้องแล้ว</option>
                <option value="under_review">อยู่ระหว่างตรวจสอบ</option>
                <option value="action_required">ต้องการข้อมูลเพิ่มเติม</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">ผลการประเมิน:</span>
                <select
                  value={inspectionResultFilter}
                  onChange={(e) => setInspectionResultFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="all">ทุกผลการประเมิน ({inspections.length})</option>
                  <option value="pass">🟢 ผ่านเกณฑ์สมบูรณ์ (Pass)</option>
                  <option value="needs_attention">🟡 เฝ้าระวัง / มีจุดต้องซ่อม (Warning)</option>
                  <option value="critical_defect">🔴 ชำรุดวิกฤต / ต้องซ่อมด่วน (Critical)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">ตู้ควบคุม/โซน:</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="all">ทุกโซนตู้ควบคุม</option>
                  {distinctZones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          
          {/* ===================== TAB 1: REQUESTS HUB ===================== */}
          {activeTab === 'requests_hub' && (
            <div className="space-y-6">
              
              {/* Virtual Folders Grid (Shown when not drilled into a single folder or as quick jump) */}
              {!currentRequestFolder && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-400" />
                    โฟลเดอร์จัดเก็บข้อมูลคำร้องจำแนกหมวดหมู่ (Request Directory Categories)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {REQUEST_CATEGORIES_FOLDERS.map((f) => {
                      const count = requests.filter(r => {
                        if (f.category) return r.category === f.category;
                        if (f.filterType === 'status_approved') return r.status === 'approved' || r.status === 'completed';
                        if (f.filterType === 'status_pending') return r.status === 'submitted' || r.status === 'under_review';
                        if (f.filterType === 'urgent') return r.priority === 'urgent' || r.priority === 'high' || r.title.includes('คดี') || r.title.includes('ตำรวจ');
                        return true;
                      }).length;

                      return (
                        <div
                          key={f.id}
                          onClick={() => setCurrentRequestFolder(f.id)}
                          className="bg-slate-800/80 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-all hover:scale-102 group shadow-sm flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <Folder className="w-6 h-6 fill-current" />
                            </div>
                            <span className="text-xs font-mono font-bold bg-slate-900 text-blue-300 px-2.5 py-1 rounded-full border border-slate-700">
                              {count} แฟ้ม
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                              {f.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>คลิกเพื่อเปิดดูแฟ้มเอกสาร</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Request Dossier Items List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    {currentRequestFolder ? `แฟ้มเอกสารในโฟลเดอร์ (${filteredRequests.length} รายการ)` : `แฟ้มคำร้องทั้งหมดในระบบ (${filteredRequests.length} แฟ้ม)`}
                  </h3>
                  {currentRequestFolder && (
                    <button
                      onClick={() => setCurrentRequestFolder(null)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> ดูทุกโฟลเดอร์
                    </button>
                  )}
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-10 text-center space-y-2">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-slate-400 font-bold text-sm">ไม่พบแฟ้มคำร้องที่ตรงกับเงื่อนไขในโฟลเดอร์นี้</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-800/90 border border-slate-700/80 hover:border-slate-500 rounded-2xl p-4.5 space-y-3 transition-all hover:shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Tag & Track ID */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                              {req.id}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              req.status === 'approved' || req.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {req.status === 'submitted' ? 'ยื่นคำร้องแล้ว' : req.status === 'under_review' ? 'อยู่ระหว่างตรวจสอบ' : req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'completed' ? 'เสร็จสิ้น' : req.status === 'action_required' ? 'รอเอกสารเพิ่ม' : 'ไม่อนุมัติ'}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                            {req.title}
                          </h4>

                          <div className="mt-2 space-y-1 text-xs text-slate-300">
                            <p><strong>ผู้ยื่น:</strong> {req.applicant.prefix}{req.applicant.fullName}</p>
                            <p className="text-slate-400"><strong>วันที่ยื่น:</strong> {req.createdAt.slice(0, 10)}</p>
                            {req.details?.location && (
                              <p className="text-slate-400 line-clamp-1"><strong>จุดติดตั้ง/สถานที่:</strong> {req.details.location}</p>
                            )}
                          </div>
                        </div>

                        {/* Attached Digital Documents in Dossier */}
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            📎 เอกสารในแฟ้ม ({req.attachments?.length || 1} รายการ):
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700">
                              <FileText className="w-3 h-3 text-red-400" /> ใบคำร้องทางการ.pdf
                            </span>
                            {req.attachments && req.attachments.length > 0 && (
                              <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700">
                                <ImageIcon className="w-3 h-3 text-blue-400" /> หลักฐานแนบ ({req.attachments.length})
                              </span>
                            )}
                            {req.approvalWorkflow && (
                              <span className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" /> บันทึกการอนุมัติ
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                          <button
                            onClick={() => setSelectedRequestDossier(req)}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>เปิดแฟ้ม (Dossier)</span>
                          </button>
                          
                          {onSelectRequest && (
                            <button
                              onClick={() => {
                                onSelectRequest(req);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="เปิดแก้ไขในระบบจัดการคำร้องหลัก"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ===================== TAB 2: CAMERA MAINTENANCE & CLEANING HUB ===================== */}
          {activeTab === 'camera_maintenance_hub' && (
            <div className="space-y-6">
              
              {/* Virtual Folders Grid for Camera Maintenance */}
              {!currentInspectionFolder && (
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-purple-400" />
                    โฟลเดอร์รายงานการตรวจเช็คและทำความสะอาดอุปกรณ์กล้อง (Maintenance Categories)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {MAINTENANCE_FOLDERS.map((f) => {
                      const count = inspections.filter(i => {
                        if (f.type === 'lens') return i.lensCleaning;
                        if (f.type === 'power') return i.upsBackupStatus !== 'no_ups';
                        if (f.type === 'critical') return i.overallResult === 'critical_defect';
                        if (f.type === 'monthly') return i.reportNo.startsWith('PM-');
                        return true;
                      }).length;

                      return (
                        <div
                          key={f.id}
                          onClick={() => setCurrentInspectionFolder(f.id)}
                          className="bg-slate-800/80 hover:bg-slate-800 p-4.5 rounded-2xl border border-slate-700 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-102 group shadow-sm flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
                              <Camera className="w-6 h-6 fill-current" />
                            </div>
                            <span className="text-xs font-mono font-bold bg-slate-900 text-purple-300 px-2.5 py-1 rounded-full border border-slate-700">
                              {count} รายงาน
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                              {f.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>คลิกเพื่อดูบันทึกและแบบฟอร์ม</span>
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Maintenance Inspection Logs List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    {currentInspectionFolder ? `รายงานในโฟลเดอร์ (${filteredInspections.length} รายการ)` : `รายงานการตรวจเช็คและทำความสะอาดทั้งหมด (${filteredInspections.length} ฉบับ)`}
                  </h3>
                  {currentInspectionFolder && (
                    <button
                      onClick={() => setCurrentInspectionFolder(null)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> ดูทุกโฟลเดอร์
                    </button>
                  )}
                </div>

                {filteredInspections.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-10 text-center space-y-2">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-slate-400 font-bold text-sm">ไม่พบรายงานการตรวจเช็คในโฟลเดอร์นี้</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInspections.map((insp) => (
                      <div
                        key={insp.id}
                        className="bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 transition-all shadow-md space-y-4"
                      >
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-2xl font-black text-sm flex items-center justify-center ${
                              insp.overallResult === 'pass'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : insp.overallResult === 'needs_attention'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              <Camera className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-indigo-300">{insp.reportNo}</span>
                                <span className="text-xs font-mono font-bold bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                  {insp.cameraId}
                                </span>
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                  insp.overallResult === 'pass'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : insp.overallResult === 'needs_attention'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}>
                                  {insp.overallResult === 'pass' ? '🟢 ผ่านเกณฑ์ (Pass)' : insp.overallResult === 'needs_attention' ? '🟡 เฝ้าระวัง (Warning)' : '🔴 ชำรุดวิกฤต (Critical)'}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-sm mt-0.5">{insp.cameraName} ({insp.zone})</h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInspectionForPrint(insp)}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์แบบรายงาน (PDF)</span>
                            </button>

                            <button
                              onClick={() => handleDeleteInspection(insp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/60 transition-colors"
                              title="ลบรายงานนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 6-Pillar Metric Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">✨ ล้างเลนส์/โดม:</span>
                            <span className={`font-bold ${insp.lensCleaning ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {insp.lensCleaning ? '✓ ทำความสะอาดแล้ว' : '✗ ยังไม่ทำ'}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">⭐ ความคมชัด:</span>
                            <div className="flex items-center text-amber-400 font-bold">
                              {insp.lensClarityRating}/5 ดาว
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">🔩 สภาพตัวกล้อง:</span>
                            <span className="font-bold text-slate-200">
                              {insp.housingCondition === 'good' ? '🟢 มั่นคงสมบูรณ์' : '🟡 มีจุดหลวม'}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">⚡ ไฟเลี้ยง & UPS:</span>
                            <span className="font-bold text-slate-200">
                              {insp.upsBackupStatus === 'normal' ? '🟢 ปกติ' : '🔴 แบตเสื่อม'}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">🌐 Network Ping:</span>
                            <span className={`font-bold ${insp.networkPingMs < 20 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {insp.networkPingMs} ms
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block">💾 บันทึก NVR:</span>
                            <span className={`font-bold ${insp.nvrRecordingStatus === 'recording' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {insp.nvrRecordingStatus === 'recording' ? '🟢 บันทึกต่อเนื่อง' : '🔴 ไม่บันทึก'}
                            </span>
                          </div>
                        </div>

                        {/* Notes & Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                          <div>
                            <strong className="text-amber-300 block mb-1">🔍 สภาพก่อนทำความสะอาด:</strong>
                            <p className="text-slate-300">{insp.beforeCleaningNotes || '-'}</p>
                          </div>
                          <div>
                            <strong className="text-emerald-300 block mb-1">✨ ผลหลังทำความสะอาด / การแก้ไข:</strong>
                            <p className="text-slate-300">{insp.afterCleaningNotes || insp.actionTaken || '-'}</p>
                          </div>
                        </div>

                        {/* Footer Inspector Info */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <div>
                            <span>ผู้ตรวจเช็ค: <strong>{insp.inspectorName}</strong> ({insp.inspectorPosition})</span>
                            <span className="ml-3">วันที่: {insp.date} {insp.time} น.</span>
                          </div>
                          {insp.verifiedBy && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจรับรองโดย: {insp.verifiedBy}
                            </span>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Global Toast Notification */}
        {toastMsg && (
          <div className="absolute bottom-6 right-6 z-[150] bg-slate-900 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

      </div>

      {/* New Camera Inspection Modal */}
      {showNewInspectionModal && (
        <NewCameraInspectionModal
          isOpen={showNewInspectionModal}
          onClose={() => setShowNewInspectionModal(false)}
          onSave={handleSaveNewInspection}
          adminName={adminName}
        />
      )}

      {/* Printable Inspection Report Modal */}
      {selectedInspectionForPrint && (
        <PrintableInspectionReportModal
          isOpen={!!selectedInspectionForPrint}
          onClose={() => setSelectedInspectionForPrint(null)}
          report={selectedInspectionForPrint}
        />
      )}

      {/* Request Dossier Modal */}
      {selectedRequestDossier && (
        <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">แฟ้มเอกสารคำร้องดิจิทัล: {selectedRequestDossier.id}</h3>
              </div>
              <button
                onClick={() => setSelectedRequestDossier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>หัวข้อคำร้อง:</strong> {selectedRequestDossier.title}</p>
              <p><strong>ผู้ยื่น:</strong> {selectedRequestDossier.applicant.prefix}{selectedRequestDossier.applicant.fullName}</p>
              <p><strong>เบอร์โทรศัพท์:</strong> {selectedRequestDossier.applicant.phone}</p>
              <p><strong>เหตุผลความจำเป็น:</strong> {selectedRequestDossier.reason}</p>
              {selectedRequestDossier.details?.location && (
                <p><strong>สถานที่/จุดเกิดเหตุ:</strong> {selectedRequestDossier.details.location}</p>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-indigo-300">เอกสารและไฟล์ในแฟ้มคำร้องนี้:</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>แบบฟอร์มคำร้องออนไลน์ทางการ_{selectedRequestDossier.id}.pdf</span>
                  </span>
                  <span className="text-[10px] text-slate-400">สร้างอัตโนมัติ</span>
                </div>
                {selectedRequestDossier.attachments?.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span>{att.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{typeof att.size === 'number' ? `${Math.round(att.size / 1024)} KB` : (att.size || 'ไฟล์แนบ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRequestDossier(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Custom Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateNewFolder} className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">สร้างโฟลเดอร์จัดเก็บข้อมูลใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">ชื่อโฟลเดอร์ *</label>
                <input
                  type="text"
                  placeholder="เช่น 09_รายงานตรวจเช็คเทศกาลสงกรานต์..."
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">คำอธิบายโฟลเดอร์</label>
                <textarea
                  rows={2}
                  placeholder="ระบุวัตถุประสงค์ในการจัดเก็บข้อมูล..."
                  value={newFolderDescInput}
                  onChange={(e) => setNewFolderDescInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                สร้างโฟลเดอร์
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
