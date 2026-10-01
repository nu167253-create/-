import React, { useState, useEffect } from 'react';
import { 
  ApproverPersonExtended, 
  ApproverRoleType, 
  ApproverStatus, 
  ApproverPermissionFlags, 
  DEFAULT_APPROVER_PERMISSIONS 
} from '../types/approver';
import { 
  getStoredExtendedApprovers, 
  saveStoredExtendedApprovers, 
  addExtendedApprover, 
  updateExtendedApprover, 
  deleteExtendedApprover, 
  toggleApproverStatus, 
  toggleApproverPermissionFlag, 
  resetExtendedApproversToDefault 
} from '../utils/approversStorage';
import { RequestCategory } from '../types/request';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserPlus, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Search, 
  Filter, 
  Sparkles, 
  Crown, 
  FileCheck, 
  AlertCircle, 
  Zap, 
  Camera, 
  Lock, 
  Unlock, 
  KeyRound, 
  Mail, 
  Phone, 
  MessageSquare, 
  Building2, 
  BadgeCheck, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Download, 
  Printer, 
  ChevronRight, 
  Share2, 
  Sliders, 
  Settings, 
  CheckSquare, 
  Clock, 
  Layers, 
  GitMerge, 
  FileText,
  UserX,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AdminApproversManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
  onApproversUpdated?: () => void;
}

type ActiveTab = 'roster' | 'form' | 'matrix' | 'hierarchy_preview';

const ROLE_TYPE_LABELS: Record<ApproverRoleType, { label: string; badgeColor: string; icon: string }> = {
  mayor: { label: 'นายกเทศมนตรี / ผู้บริหารสูงสุด', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300', icon: '👑' },
  deputy_mayor: { label: 'รองนายกเทศมนตรี', badgeColor: 'bg-orange-100 text-orange-900 border-orange-300', icon: '🏛️' },
  municipal_clerk: { label: 'ปลัดเทศบาล / รองปลัด', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: '📜' },
  division_director: { label: 'ผู้อำนวยการสำนัก/กอง', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300', icon: '🏢' },
  legal_officer: { label: 'นิติกร / งานฝ่ายปกครอง', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300', icon: '⚖️' },
  cctv_supervisor: { label: 'หัวหน้าศูนย์ควบคุม CCTV', badgeColor: 'bg-teal-100 text-teal-900 border-teal-300', icon: '📹' },
  saraban_officer: { label: 'เจ้าหน้าที่งานสารบรรณ/ธุรการ', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300', icon: '📝' },
  custom: { label: 'กำหนดบทบาทเฉพาะ', badgeColor: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⚙️' }
};

const CATEGORY_NAMES_TH: Record<RequestCategory, string> = {
  cctv: 'ขอดูกล้อง CCTV',
  general: 'คำร้องทั่วไป / สารบรรณ',
  certificate: 'ขอหนังสือรับรอง',
  leave: 'ใบลากิจ/ลาป่วย',
  maintenance: 'แจ้งซ่อมแซม/บำรุงรักษา',
  budget: 'งบประมาณและพัสดุ'
};

export const AdminApproversManagementModal: React.FC<AdminApproversManagementModalProps> = ({
  isOpen,
  onClose,
  adminName,
  onApproversUpdated
}) => {
  const [approvers, setApprovers] = useState<ApproverPersonExtended[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ApproverPersonExtended, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    position: '',
    department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
    email: '',
    lineId: '',
    phone: '044-811-300',
    level: 1,
    roleType: 'saraban_officer',
    status: 'active',
    officialOrderNo: 'คำสั่งเทศบาลเมืองชัยภูมิ ที่ .../๒๕๖๙',
    officialStampName: '',
    notes: '',
    substituteName: '',
    substitutePosition: '',
    substituteEmail: '',
    permissions: { ...DEFAULT_APPROVER_PERMISSIONS }
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadApprovers();
    }
  }, [isOpen]);

  const loadApprovers = () => {
    const data = getStoredExtendedApprovers();
    setApprovers(data);
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  if (!isOpen) return null;

  // Departments list for filtering
  const allDepartments = Array.from(new Set(approvers.map(a => a.department))).filter(Boolean);

  // Filtered approvers
  const filteredApprovers = approvers.filter(a => {
    const matchSearch = 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.lineId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = deptFilter === 'all' || a.department === deptFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    
    let matchPerm = true;
    if (permissionFilter === 'final_approve') matchPerm = a.permissions.canFinalApprove;
    else if (permissionFilter === 'preliminary') matchPerm = a.permissions.canPreliminaryReview;
    else if (permissionFilter === 'emergency') matchPerm = a.permissions.canEmergencyApprove;
    else if (permissionFilter === 'high_res_pdpa') matchPerm = a.permissions.canAccessHighResFootage || a.permissions.canAccessPdpaSensitive;
    else if (permissionFilter === 'delegate') matchPerm = a.permissions.canDelegateApproval || !!a.substituteName;

    return matchSearch && matchDept && matchStatus && matchPerm;
  });

  // Handle opening form for create
  const handleOpenCreateForm = () => {
    const nextLevel = approvers.length > 0 ? Math.max(...approvers.map(a => a.level)) + 1 : 1;
    setEditingId(null);
    setFormData({
      name: '',
      position: '',
      department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
      email: '',
      lineId: '',
      phone: '044-811-300',
      level: Math.min(nextLevel, 12),
      roleType: 'saraban_officer',
      status: 'active',
      officialOrderNo: `คำสั่งเทศบาลเมืองชัยภูมิ ที่ ${100 + approvers.length + 1}/๒๕๖๙`,
      officialStampName: 'ตราประจำตำแหน่ง/ฝ่าย',
      notes: 'ผู้มีอำนาจพิจารณาและกลั่นกรองคำร้องตามที่ได้รับมอบหมาย',
      substituteName: '',
      substitutePosition: '',
      substituteEmail: '',
      permissions: { ...DEFAULT_APPROVER_PERMISSIONS }
    });
    setFormError(null);
    setActiveTab('form');
  };

  // Handle opening form for edit
  const handleOpenEditForm = (approver: ApproverPersonExtended) => {
    setEditingId(approver.id);
    setFormData({
      name: approver.name,
      position: approver.position,
      department: approver.department,
      email: approver.email,
      lineId: approver.lineId,
      phone: approver.phone,
      level: approver.level,
      roleType: approver.roleType,
      status: approver.status,
      officialOrderNo: approver.officialOrderNo || '',
      officialStampName: approver.officialStampName || '',
      notes: approver.notes || '',
      substituteName: approver.substituteName || '',
      substitutePosition: approver.substitutePosition || '',
      substituteEmail: approver.substituteEmail || '',
      permissions: { ...approver.permissions }
    });
    setFormError(null);
    setActiveTab('form');
  };

  // Handle Save Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('กรุณาระบุชื่อ-นามสกุลของผู้มีสิทธิ์อนุมัติ');
      return;
    }
    if (!formData.position.trim()) {
      setFormError('กรุณาระบุตำแหน่งทางราชการ');
      return;
    }

    if (editingId) {
      updateExtendedApprover(editingId, formData, adminName);
      showToast(`✏️ บันทึกการแก้ไขข้อมูลและสิทธิ์ของ "${formData.name}" เรียบร้อยแล้ว`);
    } else {
      addExtendedApprover(formData, adminName);
      showToast(`➕ เพิ่มผู้มีสิทธิ์อนุมัติคนใหม่ "${formData.name}" เรียบร้อยแล้ว`);
    }

    loadApprovers();
    setActiveTab('roster');
    if (onApproversUpdated) onApproversUpdated();
  };

  // Handle Quick Delete
  const handleDelete = (id: string, name: string) => {
    deleteExtendedApprover(id);
    setDeleteConfirmId(null);
    loadApprovers();
    showToast(`🗑️ ลบผู้มีสิทธิ์อนุมัติ "${name}" ออกจากระบบแล้ว`);
    if (onApproversUpdated) onApproversUpdated();
  };

  // Handle Quick Status Change
  const handleStatusChange = (id: string, newStatus: ApproverStatus, name: string) => {
    toggleApproverStatus(id, newStatus, adminName);
    loadApprovers();
    const statusText = newStatus === 'active' ? 'เปิดใช้งาน (Active)' : newStatus === 'on_leave' ? 'ติดภารกิจ/ลา (On Leave)' : 'ปิดใช้งาน (Inactive)';
    showToast(`🔄 ปรับสถานะของ "${name}" เป็น ${statusText}`);
    if (onApproversUpdated) onApproversUpdated();
  };

  // Handle Quick Permission Toggle
  const handleTogglePermFlag = (id: string, flag: keyof ApproverPermissionFlags, name: string) => {
    toggleApproverPermissionFlag(id, flag, adminName);
    loadApprovers();
    showToast(`⚡ ปรับสิทธิ์ "${flag}" ของ ${name} เรียบร้อยแล้ว`);
    if (onApproversUpdated) onApproversUpdated();
  };

  // Handle Reset to Default
  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตรายชื่อผู้มีสิทธิ์อนุมัติทั้งหมดกลับเป็นค่ามาตรฐานของเทศบาลเมืองชัยภูมิหรือไม่?')) {
      resetExtendedApproversToDefault();
      loadApprovers();
      showToast('🔄 รีเซ็ตรายชื่อผู้มีสิทธิ์อนุมัติกลับเป็นค่ามาตรฐานเทศบาลเมืองชัยภูมิแล้ว');
      if (onApproversUpdated) onApproversUpdated();
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'ลำดับ (Level)',
      'ชื่อ-สกุล',
      'ตำแหน่ง',
      'สำนัก/กอง/ฝ่าย',
      'อีเมล',
      'เบอร์โทรศัพท์',
      'LINE ID',
      'บทบาท',
      'สถานะ',
      'อนุมัติขั้นสูงสุด',
      'ตรวจกลั่นกรอง',
      'ขอเอกสารเพิ่ม',
      'สั่งไม่อนุมัติ',
      'อนุมัติฉุกเฉิน',
      'สิทธิ์ไฟล์ความละเอียดสูง/PDPA',
      'สิทธิ์มอบอำนาจแทน',
      'หมวดหมู่ที่อนุญาต',
      'เลขที่คำสั่งแต่งตั้ง'
    ];

    const rows = approvers.map(a => [
      a.level,
      `"${a.name}"`,
      `"${a.position}"`,
      `"${a.department}"`,
      a.email,
      a.phone,
      a.lineId,
      ROLE_TYPE_LABELS[a.roleType]?.label || a.roleType,
      a.status,
      a.permissions.canFinalApprove ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canPreliminaryReview ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canRequestAmendments ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canReject ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canEmergencyApprove ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canAccessHighResFootage ? 'ใช่' : 'ไม่ใช่',
      a.permissions.canDelegateApproval ? 'ใช่' : 'ไม่ใช่',
      `"${a.permissions.allowedCategories.map(c => CATEGORY_NAMES_TH[c] || c).join(', ')}"`,
      `"${a.officialOrderNo || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Chaiyaphum_Authorized_Approvers_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ส่งออกไฟล์ CSV รายชื่อผู้มีอำนาจอนุมัติเรียบร้อยแล้ว');
  };

  // Toggle Category In Form
  const toggleFormCategory = (cat: RequestCategory) => {
    const currentCats = formData.permissions.allowedCategories;
    const hasCat = currentCats.includes(cat);
    const updated = hasCat ? currentCats.filter(c => c !== cat) : [...currentCats, cat];
    if (updated.length === 0) return; // Keep at least 1
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        allowedCategories: updated
      }
    }));
  };

  // Stats
  const totalCount = approvers.length;
  const activeCount = approvers.filter(a => a.status === 'active').length;
  const finalSignersCount = approvers.filter(a => a.permissions.canFinalApprove).length;
  const pdpaAuthorizedCount = approvers.filter(a => a.permissions.canAccessHighResFootage || a.permissions.canAccessPdpaSensitive).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-md font-black">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>ระบบจัดการผู้มีสิทธิ์อนุมัติและกำหนดสิทธิ์</span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    Admin Approver & Permissions Center
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                กำหนดรายชื่อผู้มีอำนาจลงนาม ระดับขั้นการพิจารณา (Level 1-12) และสิทธิ์การอนุมัติเฉพาะทาง เทศบาลเมืองชัยภูมิ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 border border-amber-300"
            >
              <UserPlus className="w-4 h-4" />
              <span>➕ เพิ่มผู้มีสิทธิ์อนุมัติ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-5 py-2.5 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {successToast}
            </span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs & Metrics Banner */}
        <div className="bg-slate-950/60 px-5 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'roster'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>📋 รายชื่อผู้มีสิทธิ์อนุมัติ ({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateForm}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'form'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>{editingId ? '✏️ แก้ไขข้อมูล & สิทธิ์' : '➕ ฟอร์มเพิ่มผู้มีสิทธิ์ใหม่'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>📊 เมทริกซ์สิทธิ์รวม (Permissions Matrix)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hierarchy_preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'hierarchy_preview'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              <span>🌿 ผังเส้นทางอนุมัติ (Workflow Routing)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
              title="ส่งออกรายชื่อและสิทธิ์เป็น CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
              title="รีเซ็ตกลับเป็นค่ามาตรฐานเทศบาลเมืองชัยภูมิ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>รีเซ็ตค่ามาตรฐาน</span>
            </button>
          </div>
        </div>

        {/* Metric Quick Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900/90 border-b border-slate-800 text-xs shrink-0">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">ผู้มีอำนาจทั้งหมด</p>
                <p className="font-extrabold text-white">{totalCount} ท่าน</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
              ใช้งาน {activeCount}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <Crown className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">ผู้อนุมัติขั้นสูงสุด</p>
                <p className="font-extrabold text-amber-300">{finalSignersCount} ท่าน</p>
              </div>
            </div>
            <span className="text-[9px] text-slate-400">นายกฯ/ปลัด/ผอ.</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">สิทธิ์ PDPA & คดีความ</p>
                <p className="font-extrabold text-purple-300">{pdpaAuthorizedCount} ท่าน</p>
              </div>
            </div>
            <span className="text-[9px] text-purple-300 font-bold">High-Res</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/20 text-teal-400 rounded-lg">
                <BadgeCheck className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[10px] text-slate-400">ระดับขั้นตอนอนุมัติ</p>
                <p className="font-extrabold text-teal-300">Level 1 - {Math.max(1, ...approvers.map(a => a.level))}</p>
              </div>
            </div>
            <span className="text-[9px] text-slate-400">รองรับ 12 ขั้น</span>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* TAB 1: ROSTER DIRECTORY VIEW */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              
              {/* Search & Filters */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อ-สกุล, ตำแหน่ง, สำนัก/กอง, อีเมล หรือ LINE ID..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Department Filter */}
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">🏢 ทุกสำนัก/กอง ({approvers.length})</option>
                    {allDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">🟢 ทุกสถานะ</option>
                    <option value="active">🟢 เปิดใช้งาน (Active)</option>
                    <option value="on_leave">🟡 ติดภารกิจ/ลา (On Leave)</option>
                    <option value="inactive">🔴 ปิดใช้งาน (Inactive)</option>
                  </select>

                  {/* Permission Flag Filter */}
                  <select
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">⚡ สิทธิ์ทั้งหมด</option>
                    <option value="final_approve">👑 มีสิทธิ์อนุมัติขั้นสูงสุด</option>
                    <option value="preliminary">🔍 มีสิทธิ์ตรวจกลั่นกรอง</option>
                    <option value="emergency">⚡ มีสิทธิ์อนุมัติฉุกเฉิน</option>
                    <option value="high_res_pdpa">🛡️ สิทธิ์ข้อมูล PDPA / คดีความ</option>
                    <option value="delegate">👥 มีผู้ปฏิบัติราชการแทน</option>
                  </select>
                </div>
              </div>

              {/* Approver Cards Grid */}
              {filteredApprovers.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <UserX className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-300">ไม่พบรายชื่อผู้มีสิทธิ์อนุมัติตามเงื่อนไข</h4>
                  <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือกดปุ่มเพิ่มผู้มีสิทธิ์อนุมัติคนใหม่</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>➕ เพิ่มผู้มีสิทธิ์อนุมัติคนใหม่</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredApprovers.map((appr) => {
                    const roleInfo = ROLE_TYPE_LABELS[appr.roleType] || ROLE_TYPE_LABELS.custom;
                    const isDeleting = deleteConfirmId === appr.id;

                    return (
                      <div
                        key={appr.id}
                        className={`bg-slate-950/80 border rounded-2xl p-4 transition-all hover:border-slate-600 flex flex-col justify-between gap-3 shadow-md ${
                          appr.status === 'active' 
                            ? 'border-slate-800 hover:bg-slate-900/90' 
                            : appr.status === 'on_leave'
                            ? 'border-amber-500/40 bg-amber-950/10'
                            : 'border-rose-900/30 bg-slate-950 opacity-75'
                        }`}
                      >
                        {/* Card Top: Level, Role Badge, Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-black flex items-center justify-center shrink-0">
                                {appr.level}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${roleInfo.badgeColor}`}>
                                <span>{roleInfo.icon}</span>
                                <span>{roleInfo.label}</span>
                              </span>
                            </div>

                            {/* Status Pill & Quick Change */}
                            <div className="flex items-center gap-1.5">
                              <select
                                value={appr.status}
                                onChange={(e) => handleStatusChange(appr.id, e.target.value as ApproverStatus, appr.name)}
                                className={`text-[10px] font-black rounded-lg px-2 py-1 border transition-colors cursor-pointer ${
                                  appr.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : appr.status === 'on_leave'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                <option value="active" className="bg-slate-900 text-emerald-400">🟢 ปฏิบัติงานปกติ</option>
                                <option value="on_leave" className="bg-slate-900 text-amber-400">🟡 ติดภารกิจ/ลา</option>
                                <option value="inactive" className="bg-slate-900 text-rose-400">🔴 ระงับการใช้งาน</option>
                              </select>
                            </div>
                          </div>

                          {/* Approver Identity */}
                          <div className="mt-3">
                            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                              <span>{appr.name}</span>
                              {appr.permissions.canFinalApprove && (
                                <span title="ผู้มีอำนาจอนุมัติขั้นสูงสุด (Final Signer)">
                                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-amber-300 font-semibold mt-0.5">{appr.position}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{appr.department}</span>
                            </p>
                          </div>

                          {/* Contact details */}
                          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                            {appr.email && (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Mail className="w-3 h-3 text-blue-400" />
                                {appr.email}
                              </span>
                            )}
                            {appr.phone && (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {appr.phone}
                              </span>
                            )}
                            {appr.lineId && (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <MessageSquare className="w-3 h-3 text-teal-400" />
                                {appr.lineId}
                              </span>
                            )}
                          </div>

                          {/* Substitute Notice (if on leave or specified) */}
                          {appr.substituteName && (
                            <div className="mt-2 text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 p-2 rounded-xl flex items-center gap-1.5">
                              <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>ผู้ปฏิบัติราชการแทน: <strong>{appr.substituteName}</strong> ({appr.substitutePosition || 'รักษาการ'})</span>
                            </div>
                          )}

                          {/* Permissions Flags Tags */}
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              สิทธิ์และอำนาจการพิจารณา:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {appr.permissions.canFinalApprove && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  👑 อนุมัติขั้นสูงสุด
                                </span>
                              )}
                              {appr.permissions.canPreliminaryReview && (
                                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  🔍 ตรวจกลั่นกรอง
                                </span>
                              )}
                              {appr.permissions.canEmergencyApprove && (
                                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  ⚡ อนุมัติฉุกเฉิน
                                </span>
                              )}
                              {appr.permissions.canAccessHighResFootage && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  🛡️ ส่งมอบไฟล์/คดีความ
                                </span>
                              )}
                              {appr.permissions.canAccessPdpaSensitive && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                  🔒 ปลดล็อก PDPA
                                </span>
                              )}
                              {appr.permissions.canRequestAmendments && (
                                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-medium">
                                  📝 ขอเอกสารเพิ่ม
                                </span>
                              )}
                              {appr.permissions.canReject && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md font-medium">
                                  ❌ สั่งตก/ไม่อนุมัติ
                                </span>
                              )}
                              {appr.permissions.canDelegateApproval && (
                                <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-md font-medium">
                                  👥 มอบอำนาจได้
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Authorized Categories */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-400">
                            <span className="font-semibold text-slate-500">หมวดหมู่:</span>
                            {appr.permissions.allowedCategories.map(cat => (
                              <span key={cat} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                {CATEGORY_NAMES_TH[cat] || cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Card Bottom: Actions */}
                        <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {appr.officialOrderNo || `คำสั่งที่ ${appr.level}/๒๕๖๙`}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isDeleting ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-800">
                                <span className="text-[10px] text-rose-300 font-bold px-1.5">ยืนยันลบ?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(appr.id, appr.name)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                >
                                  ลบ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditForm(appr)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                  title="แก้ไขข้อมูลส่วนตัว ตำแหน่ง และสิทธิ์การอนุมัติ"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไขสิทธิ์</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(appr.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                                  title="ลบผู้มีสิทธิ์อนุมัติท่านนี้"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD / EDIT APPROVER & PERMISSIONS FORM */}
          {activeTab === 'form' && (
            <form onSubmit={handleSaveForm} className="space-y-5 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl font-bold">
                    {editingId ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white">
                      {editingId ? `แก้ไขข้อมูลและสิทธิ์: ${formData.name}` : 'เพิ่มผู้มีสิทธิ์อนุมัติและกำหนดอำนาจคนใหม่'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      กรอกรายละเอียดตำแหน่งหน้าที่ และเลือกเปิด/ปิดสิทธิ์การพิจารณาตามระเบียบราชการ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  ← กลับหน้ารายชื่อ
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {/* SECTION 1: Personal & Official Identity */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>หมวดที่ 1: ข้อมูลส่วนบุคคลและตำแหน่งหน้าที่ (Official Identity)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ชื่อ-นามสกุล <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="เช่น นายสรพงษ์ เทศกิจดี"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ตำแหน่งทางราชการ <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="เช่น เจ้าพนักงานเทศกิจชำนาญงาน / นิติกร / ปลัดเทศบาล"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      สังกัด สำนัก / กอง / ฝ่าย
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="เช่น สำนักปลัดเทศบาล / กองช่าง / ศูนย์ควบคุม CCTV"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      อีเมลทางราชการ (@chaiyaphum.go.th)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="approver@chaiyaphum.go.th"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      เบอร์โทรศัพท์ติดต่อ / ภายใน
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="044-811-300"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      LINE ID / LINE Notify
                    </label>
                    <input
                      type="text"
                      value={formData.lineId}
                      onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                      placeholder="@approver_cctv"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ระดับขั้นการอนุมัติ (Approval Level 1-12)
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(lvl => (
                        <option key={lvl} value={lvl}>
                          ระดับที่ {lvl} {lvl === 1 ? '(ผู้รับเรื่อง/กลั่นกรองแรก)' : lvl === 6 ? '(ผู้บริหารเทศบาล)' : lvl >= 10 ? '(ผู้อนุมัติขั้นสูงสุด)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ประเภทบทบาท (Role Category)
                    </label>
                    <select
                      value={formData.roleType}
                      onChange={(e) => setFormData({ ...formData, roleType: e.target.value as ApproverRoleType })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      {Object.entries(ROLE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.icon} {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      สถานะการปฏิบัติงาน
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ApproverStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-bold"
                    >
                      <option value="active">🟢 เปิดปฏิบัติงานปกติ (Active)</option>
                      <option value="on_leave">🟡 ติดภารกิจ / ลา (On Leave - มีผู้ปฏิบัติแทน)</option>
                      <option value="inactive">🔴 ระงับสิทธิ์ชั่วคราว (Inactive)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PERMISSIONS & AUTHORITIES MATRIX */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>หมวดที่ 2: กำหนดสิทธิ์และอำนาจการพิจารณา (Permissions & Approval Authority)</span>
                  </h5>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    คลิกการ์ดเพื่อเปิด/ปิดสิทธิ์
                  </span>
                </div>

                {/* Permissions Toggle Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Final Approve */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canFinalApprove 
                      ? 'bg-amber-500/15 border-amber-400/80 text-amber-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canFinalApprove}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canFinalApprove: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>สิทธิ์อนุมัติขั้นสูงสุด & สั่งปิดเรื่อง (Final Signer)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        สามารถลงนามอนุมัติให้ความยินยอมส่งมอบข้อมูลภาพ CCTV และยุติขั้นตอนได้ทันที
                      </p>
                    </div>
                  </label>

                  {/* Preliminary Review */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canPreliminaryReview 
                      ? 'bg-blue-500/15 border-blue-400/80 text-blue-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canPreliminaryReview}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canPreliminaryReview: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>สิทธิ์ตรวจกลั่นกรองและรับเรื่องเบื้องต้น (Reviewer)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ตรวจสอบความถูกต้องของเอกสาร หลักฐานบันทึกประจำวัน และพิกัดกล้อง
                      </p>
                    </div>
                  </label>

                  {/* Emergency Fast-track */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canEmergencyApprove 
                      ? 'bg-rose-500/15 border-rose-400/80 text-rose-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canEmergencyApprove}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canEmergencyApprove: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Zap className="w-3.5 h-3.5 text-rose-400" />
                        <span>สิทธิ์อนุมัติกรณีฉุกเฉิน (Emergency Fast-track)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        อนุมัติเปิดภาพทันทีในกรณีอุบัติภัยร้ายแรง วิกฤต หรือประสานงานตำรวจสืบสวน
                      </p>
                    </div>
                  </label>

                  {/* High-Res Video & Law Enforcement */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canAccessHighResFootage 
                      ? 'bg-purple-500/15 border-purple-400/80 text-purple-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canAccessHighResFootage}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canAccessHighResFootage: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        <span>สิทธิ์ส่งมอบไฟล์ Full-HD & คดีอาญา</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        อนุญาตให้คัดลอกไฟล์วิดีโอต้นฉบับความคมชัดสูงใส่ USB/ส่งพนักงานสอบสวน
                      </p>
                    </div>
                  </label>

                  {/* PDPA Clearance */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canAccessPdpaSensitive 
                      ? 'bg-indigo-500/15 border-indigo-400/80 text-indigo-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canAccessPdpaSensitive}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canAccessPdpaSensitive: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>สิทธิ์ปลดล็อกข้อมูล PDPA & บุคคลภายนอก</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ตรวจสอบและวินิจฉัยความสอดคล้องตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล
                      </p>
                    </div>
                  </label>

                  {/* Request Amendments */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canRequestAmendments 
                      ? 'bg-teal-500/15 border-teal-400/80 text-teal-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canRequestAmendments}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canRequestAmendments: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-teal-500 focus:ring-teal-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                        <span>สิทธิ์สั่งขอเอกสารเพิ่ม / ส่งกลับแก้ไข</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        สามารถส่งคำร้องกลับให้ประชาชนแนบเอกสารหรือระบุพิกัดเวลาเพิ่มเติม
                      </p>
                    </div>
                  </label>

                  {/* Reject Request */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canReject 
                      ? 'bg-slate-800 border-slate-600 text-slate-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canReject}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canReject: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-slate-400 focus:ring-slate-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>สิทธิ์สั่งไม่อนุมัติ / ยกเลิกคำร้อง (Reject)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        สั่งไม่อนุมัติกรณีคำร้องไม่มีเหตุอันสมควรหรือขัดต่อกฎหมาย
                      </p>
                    </div>
                  </label>

                  {/* Delegate Authority */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canDelegateApproval 
                      ? 'bg-orange-500/15 border-orange-400/80 text-orange-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canDelegateApproval}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canDelegateApproval: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-orange-500 focus:ring-orange-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Share2 className="w-3.5 h-3.5 text-orange-400" />
                        <span>สิทธิ์มอบอำนาจปฏิบัติราชการแทน</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        สามารถส่งต่อหรือมอบอำนาจให้ผู้ช่วย/รองผู้อำนวยการลงนามแทนได้
                      </p>
                    </div>
                  </label>

                  {/* Budget & Procurement */}
                  <label className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    formData.permissions.canAccessBudgetForms 
                      ? 'bg-emerald-500/15 border-emerald-400/80 text-emerald-200' 
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.canAccessBudgetForms}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, canAccessBudgetForms: e.target.checked }
                      })}
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 shrink-0"
                    />
                    <div>
                      <div className="font-black text-xs flex items-center gap-1 text-white">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>สิทธิ์อนุมัติงานงบประมาณและพัสดุ</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        พิจารณาคำขอจัดซื้อจัดจ้าง/บำรุงรักษากล้องและระบบเครือข่าย
                      </p>
                    </div>
                  </label>
                </div>

                {/* Authorized Categories Checkboxes */}
                <div className="mt-3 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    หมวดหมู่คำร้องที่ได้รับมอบอำนาจให้พิจารณา:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {(['cctv', 'general', 'certificate', 'leave', 'maintenance', 'budget'] as RequestCategory[]).map(cat => {
                      const isChecked = formData.permissions.allowedCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleFormCategory(cat)}
                          className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{CATEGORY_NAMES_TH[cat]}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      สิทธิ์เข้าถึงภาพย้อนหลังสูงสุด (Retention Window)
                    </label>
                    <select
                      value={formData.permissions.maxRetentionAccessDays || 30}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, maxRetentionAccessDays: parseInt(e.target.value, 10) }
                      })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value={30}>30 วัน (มาตรฐานคำร้องทั่วไป)</option>
                      <option value={60}>60 วัน (คำร้องคดีอาญา/ตำรวจ)</option>
                      <option value={90}>90 วัน (ระดับผู้อำนวยการกองช่าง/นิติกร)</option>
                      <option value={365}>365 วัน (ระดับปลัด/นายกเทศมนตรี/ตลอดอายุไฟล์)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      เพดานวงเงินอำนาจการอนุมัติ (บาท)
                    </label>
                    <input
                      type="number"
                      value={formData.permissions.maxApprovalAmount || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, maxApprovalAmount: parseInt(e.target.value, 10) || 0 }
                      })}
                      placeholder="0 = ไม่จำกัดวงเงิน"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">ใส่ 0 หากไม่มีข้อจำกัดวงเงิน</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: DELEGATION & APPOINTMENT ORDER */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>หมวดที่ 3: ผู้ปฏิบัติราชการแทน และคำสั่งแต่งตั้ง (Delegation & Official Order)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ชื่อผู้ปฏิบัติราชการแทน (กรณีติดภารกิจ/ลา)
                    </label>
                    <input
                      type="text"
                      value={formData.substituteName || ''}
                      onChange={(e) => setFormData({ ...formData, substituteName: e.target.value })}
                      placeholder="เช่น นายเกรียงศักดิ์ ปกครองไทย"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      ตำแหน่งผู้ปฏิบัติราชการแทน
                    </label>
                    <input
                      type="text"
                      value={formData.substitutePosition || ''}
                      onChange={(e) => setFormData({ ...formData, substitutePosition: e.target.value })}
                      placeholder="เช่น รองผู้อำนวยการ / หัวหน้าฝ่าย"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      เลขที่คำสั่งแต่งตั้ง / มอบอำนาจ
                    </label>
                    <input
                      type="text"
                      value={formData.officialOrderNo || ''}
                      onChange={(e) => setFormData({ ...formData, officialOrderNo: e.target.value })}
                      placeholder="เช่น คำสั่งเทศบาลเมืองชัยภูมิ ที่ ๑๐๕/๒๕๖๙"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">
                    หมายเหตุ / ขอบเขตงานที่ได้รับมอบหมาย
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="บันทึกข้อความหรือเงื่อนไขการอนุมัติเฉพาะ..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer active:scale-95 border border-amber-300"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>{editingId ? 'บันทึกการแก้ไขข้อมูล & สิทธิ์' : 'บันทึกผู้มีสิทธิ์อนุมัติคนใหม่'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: GLOBAL PERMISSIONS MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-black text-white text-sm">ตารางเปรียบเทียบเมทริกซ์สิทธิ์ (Permissions Matrix)</h4>
                  <p className="text-slate-400 text-xs">
                    คลิกที่ไอคอนสิทธิ์เพื่อเปิดหรือปิดสิทธิ์ให้แต่ละท่านได้โดยตรงแบบ Real-time
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> มีสิทธิ์ (Active)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span> ไม่มีสิทธิ์
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3 text-center w-12">ลำดับ</th>
                      <th className="p-3">ชื่อ - ตำแหน่ง</th>
                      <th className="p-3 text-center">👑 อนุมัติสูงสุด</th>
                      <th className="p-3 text-center">🔍 กลั่นกรอง</th>
                      <th className="p-3 text-center">⚡ ฉุกเฉิน</th>
                      <th className="p-3 text-center">📹 Full-HD</th>
                      <th className="p-3 text-center">🔒 PDPA</th>
                      <th className="p-3 text-center">📝 ขอแก้ไข</th>
                      <th className="p-3 text-center">❌ สั่งตก</th>
                      <th className="p-3 text-center">👥 มอบอำนาจ</th>
                      <th className="p-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {approvers.map((appr) => (
                      <tr key={appr.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-3 text-center font-bold text-amber-400 font-mono">
                          {appr.level}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{appr.name}</span>
                            {appr.status !== 'active' && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                                {appr.status === 'on_leave' ? 'ลา/มอบอำนาจ' : 'ปิด'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{appr.position} ({appr.department})</div>
                        </td>

                        {/* Can Final Approve */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canFinalApprove', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canFinalApprove 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์อนุมัติขั้นสูงสุด"
                          >
                            <Crown className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can Preliminary */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canPreliminaryReview', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canPreliminaryReview 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์ตรวจกลั่นกรอง"
                          >
                            <FileCheck className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can Emergency */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canEmergencyApprove', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canEmergencyApprove 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์อนุมัติฉุกเฉิน"
                          >
                            <Zap className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can High-Res */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canAccessHighResFootage', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canAccessHighResFootage 
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์ส่งมอบ Full-HD"
                          >
                            <Camera className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can PDPA */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canAccessPdpaSensitive', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canAccessPdpaSensitive 
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์ PDPA"
                          >
                            <Lock className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can Amend */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canRequestAmendments', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canRequestAmendments 
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์ขอเอกสารเพิ่ม"
                          >
                            <MessageSquare className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can Reject */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canReject', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canReject 
                                ? 'bg-rose-900/40 text-rose-300 border border-rose-800' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์สั่งตก"
                          >
                            <XCircle className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Can Delegate */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermFlag(appr.id, 'canDelegateApproval', appr.name)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              appr.permissions.canDelegateApproval 
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' 
                                : 'bg-slate-900 text-slate-600 hover:text-slate-400'
                            }`}
                            title="สลับสิทธิ์มอบอำนาจแทน"
                          >
                            <Share2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(appr)}
                            className="p-1.5 text-amber-400 hover:bg-slate-800 rounded-lg"
                            title="แก้ไขรายละเอียดทั้งหมด"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HIERARCHY WORKFLOW ROUTING INTEGRATION */}
          {activeTab === 'hierarchy_preview' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <GitMerge className="w-5 h-5 text-amber-400" />
                  <h4 className="font-black text-white text-sm">การเชื่อมโยงกับผังเส้นทางการอนุมัติ (Workflow Hierarchy Integration)</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  รายชื่อและสิทธิ์ของผู้มีสิทธิ์อนุมัติทั้งหมดในหน้านี้ จะถูกส่งต่อไปยัง <strong>ผังลำดับชั้นการอนุมัติ (Approval Hierarchy)</strong> และ <strong>ศูนย์อนุมัติคำร้อง (Approval Portal)</strong> โดยอัตโนมัติ 
                  เมื่อคำร้องถูกส่งต่อไปยังระดับขั้นใด ระบบจะตรวจสอบสิทธิ์ของผู้อนุมัติประจำขั้นนั้นทันที
                </p>
              </div>

              {/* Sequential Path Diagram */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ลำดับขั้นการพิจารณาตามลำดับ Level ปัจจุบัน ({approvers.length} ลำดับ):
                </h5>

                <div className="relative pl-6 space-y-3 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-blue-500 before:to-emerald-500">
                  {approvers
                    .sort((a, b) => a.level - b.level)
                    .map((appr, idx) => (
                      <div
                        key={appr.id}
                        className="relative bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700"
                      >
                        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-900 border-2 border-amber-400 text-[10px] font-black text-amber-300 flex items-center justify-center">
                          {appr.level}
                        </span>

                        <div className="flex items-center gap-3">
                          <div>
                            <h6 className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{appr.name}</span>
                              <span className="text-[10px] text-amber-300 font-mono">({appr.position})</span>
                              {appr.permissions.canFinalApprove && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                                  👑 ผู้อนุมัติขั้นสูงสุด
                                </span>
                              )}
                            </h6>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {appr.department} • {appr.email || appr.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(appr)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            แก้ไขสิทธิ์
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950/90 px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>เข้าสู่ระบบโดยผู้ดูแลระบบ: <strong>{adminName}</strong> (สิทธิ์แก้ไขรายชื่อและอำนาจอนุมัติครบถ้วน)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
