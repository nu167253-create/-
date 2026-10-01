import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus } from '../types/request';
import { updateRequestStatus, advanceApprovalStep, getStatusBadgeColor, getStatusLabelTh, getPriorityBadgeColor, getPriorityLabelTh } from '../utils/storage';
import { getStoredExtendedApprovers } from '../utils/approversStorage';
import { AdminApproversManagementModal } from './AdminApproversManagementModal';
import { sendStatusEmailNotification } from '../utils/emailService';
import { sendStatusSmsNotification } from '../utils/smsService';
import { SignaturePad } from './SignaturePad';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  Building2, 
  Mail, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Search, 
  Filter, 
  X, 
  Check, 
  Send, 
  Layers, 
  FileText, 
  Eye, 
  Sparkles, 
  CheckSquare, 
  Calendar, 
  MapPin, 
  Save, 
  User, 
  Briefcase, 
  PhoneCall, 
  PenTool, 
  Info,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface ApproverProfile {
  name: string;
  position: string;
  email: string;
  phone: string;
  lineId: string;
}

const APPROVER_PROFILE_KEY = 'officer_approver_profile_v1';

const DEFAULT_APPROVER: ApproverProfile = {
  name: 'นายวิเชียร ชัยภูมิพัฒนา',
  position: 'ผู้อำนวยการกองช่าง / หัวหน้าศูนย์ควบคุม CCTV',
  email: 'wichean.cctv@chaiyaphum.go.th',
  phone: '044-811-300',
  lineId: '@chaiyaphum_cctv'
};

interface OfficerApprovalPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestItem[];
  onRefreshRequests: () => void;
  initialSelectedRequestId?: string | null;
}

export const OfficerApprovalPortalModal: React.FC<OfficerApprovalPortalModalProps> = ({
  isOpen,
  onClose,
  requests,
  onRefreshRequests,
  initialSelectedRequestId
}) => {
  // Approver Profile State
  const [approver, setApprover] = useState<ApproverProfile>(() => {
    try {
      const saved = localStorage.getItem(APPROVER_PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load approver profile:', e);
    }
    return DEFAULT_APPROVER;
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [showApproversModal, setShowApproversModal] = useState(false);
  const [rosterApprovers, setRosterApprovers] = useState(getStoredExtendedApprovers());

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending_all' | 'submitted' | 'under_review' | 'action_required' | 'approved' | 'rejected'>('pending_all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high_only' | 'normal'>('all');

  // Selected Request
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Approval Form State
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'action_required'>('approved');
  const [directiveNote, setDirectiveNote] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Initialize selected request
  useEffect(() => {
    if (initialSelectedRequestId) {
      setSelectedReqId(initialSelectedRequestId);
    } else if (requests.length > 0 && !selectedReqId) {
      const firstPending = requests.find(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required');
      setSelectedReqId(firstPending ? firstPending.id : requests[0].id);
    }
  }, [initialSelectedRequestId, requests, isOpen]);

  if (!isOpen) return null;

  // Filter requests
  const filteredRequests = requests.filter(r => {
    // Status Filter
    if (statusFilter === 'pending_all') {
      if (r.status !== 'submitted' && r.status !== 'under_review' && r.status !== 'action_required') return false;
    } else if (r.status !== statusFilter) {
      return false;
    }

    // Priority Filter
    if (priorityFilter === 'high_only') {
      if (r.priority !== 'high' && r.priority !== 'very_urgent' && r.priority !== 'urgent') return false;
    } else if (priorityFilter === 'normal') {
      if (r.priority === 'high' || r.priority === 'very_urgent' || r.priority === 'urgent') return false;
    }

    // Search
    if ((searchTerm || '').trim()) {
      const q = (searchTerm || '').toLowerCase();
      const matchId = (r.id || '').toLowerCase().includes(q);
      const matchName = (r.applicant?.fullName || '').toLowerCase().includes(q);
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchLocation = (r.location || r.details?.cameraLocation || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchTitle && !matchLocation) return false;
    }

    return true;
  });

  const selectedRequest = requests.find(r => r.id === selectedReqId) || filteredRequests[0] || null;

  // Counts
  const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required').length;
  const urgentCount = requests.filter(r => (r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required') && (r.priority === 'high' || r.priority === 'very_urgent' || r.priority === 'urgent')).length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  const handleSaveProfile = () => {
    try {
      localStorage.setItem(APPROVER_PROFILE_KEY, JSON.stringify(approver));
      setIsEditingProfile(false);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  const handleApplyQuickDirective = (text: string) => {
    setDirectiveNote(text);
  };

  const handleExecuteApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!approver.name.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุล ผู้อนุมัติ');
      return;
    }

    setIsSubmitting(true);

    let targetStatus: RequestStatus = 'approved';
    let statusLogNote = '';

    if (decision === 'approved') {
      targetStatus = 'approved';
      statusLogNote = `[อนุมัติคำร้อง] โดย ${approver.name} (${approver.position}) - ${directiveNote || 'อนุมัติให้ดำเนินการเปิดและคัดสำเนาภาพตามระเบียบ'}`;
    } else if (decision === 'rejected') {
      targetStatus = 'rejected';
      statusLogNote = `[ไม่อนุมัติคำร้อง] โดย ${approver.name} (${approver.position}) - ${directiveNote || 'คำร้องไม่ผ่านการพิจารณา'}`;
    } else {
      targetStatus = 'action_required';
      statusLogNote = `[ส่งกลับขอข้อมูลเพิ่ม] โดย ${approver.name} (${approver.position}) - ${directiveNote || 'โปรดแนบหลักฐานเอกสารเพิ่มเติม'}`;
    }

    setTimeout(() => {
      // 1. Advance Workflow Step if available
      const wf = selectedRequest.approvalWorkflow;
      if (wf && wf.steps && wf.steps.length > 0) {
        const stepIdx = wf.currentStepIndex >= 0 ? wf.currentStepIndex : 0;
        advanceApprovalStep(
          selectedRequest.id,
          stepIdx,
          decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'skipped',
          approver.name,
          `${directiveNote} (ตำแหน่ง: ${approver.position}, โทร: ${approver.phone}, LINE: ${approver.lineId})`,
          includeSignature && signatureData ? signatureData : undefined
        );
      }

      // 2. Update Request Overall Status
      const updated = updateRequestStatus(
        selectedRequest.id,
        targetStatus,
        `${approver.name} (${approver.position})`,
        statusLogNote,
        directiveNote,
        approver.name
      );

      // 3. Send Notification Email & SMS directly to applicant
      if (selectedRequest.applicant?.email) {
        sendStatusEmailNotification(
          updated || selectedRequest,
          targetStatus,
          directiveNote || statusLogNote
        );
      }
      if (selectedRequest.applicant?.phone) {
        sendStatusSmsNotification(
          updated || selectedRequest,
          targetStatus,
          directiveNote || statusLogNote
        );
      }

      setIsSubmitting(false);
      setSuccessToast(`บันทึกผลการพิจารณาคำร้อง ${selectedRequest.id} เรียบร้อยแล้ว`);
      setDirectiveNote('');
      
      onRefreshRequests();

      setTimeout(() => {
        setSuccessToast(null);
      }, 3500);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">
                  ศูนย์พิจารณาและอนุมัติคำร้อง CCTV (Approval Management Portal)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  สำหรับผู้มีอำนาจอนุมัติ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                พิจารณา อนุมัติ ปฏิเสธ หรือขอข้อมูลเพิ่มเติมสำหรับคำร้องขอดูภาพกล้องวงจรปิด เทศบาลเมืองชัยภูมิ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Approver Profile Banner */}
        <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>

            {!isEditingProfile ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">{approver.name}</span>
                  <span className="bg-slate-800 text-blue-300 px-2 py-0.5 rounded border border-slate-700 font-medium text-[11px]">
                    {approver.position}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-400" />
                    {approver.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {approver.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                    LINE: {approver.lineId}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                <input
                  type="text"
                  value={approver.name}
                  onChange={(e) => setApprover({ ...approver, name: e.target.value })}
                  placeholder="ชื่อ-นามสกุล ผู้อนุมัติ"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={approver.position}
                  onChange={(e) => setApprover({ ...approver, position: e.target.value })}
                  placeholder="ตำแหน่ง"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={approver.email}
                  onChange={(e) => setApprover({ ...approver, email: e.target.value })}
                  placeholder="อีเมลผู้ติดต่อ"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={approver.phone}
                    onChange={(e) => setApprover({ ...approver, phone: e.target.value })}
                    placeholder="เบอร์โทรศัพท์"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 w-full"
                  />
                  <input
                    type="text"
                    value={approver.lineId}
                    onChange={(e) => setApprover({ ...approver, lineId: e.target.value })}
                    placeholder="LINE ID"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {profileSaveSuccess && (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 animate-pulse">
                <Check className="w-3.5 h-3.5" /> บันทึกข้อมูลข้อมูลผู้อนุมัติแล้ว
              </span>
            )}

            {/* Quick Switch from Approver Roster */}
            <select
              value={rosterApprovers.find(r => r.name === approver.name)?.id || ''}
              onChange={(e) => {
                const found = rosterApprovers.find(r => r.id === e.target.value);
                if (found) {
                  const updated: ApproverProfile = {
                    name: found.name,
                    position: found.position,
                    email: found.email || DEFAULT_APPROVER.email,
                    phone: found.phone || DEFAULT_APPROVER.phone,
                    lineId: found.lineId || DEFAULT_APPROVER.lineId
                  };
                  setApprover(updated);
                  localStorage.setItem(APPROVER_PROFILE_KEY, JSON.stringify(updated));
                }
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-purple-400 font-medium"
            >
              <option value="">-- สลับโปรไฟล์ผู้อนุมัติ (12 ระดับ) --</option>
              {rosterApprovers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.code || `L${r.level}`}: {r.name} ({r.roleTitle})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowApproversModal(true)}
              className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-purple-400/30"
              title="เปิดหน้าต่างจัดการรายชื่อผู้มีสิทธิ์อนุมัติและกำหนดสิทธิ์แบบละเอียด (Admin)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
              <span>👥 จัดการสิทธิ์ผู้อนุมัติ</span>
            </button>

            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5 text-blue-400" />
                <span>แก้ไขโปรไฟล์</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveProfile}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกโปรไฟล์</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Count Pills & Filter Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              กรองสถานะ:
            </span>

            <div className="inline-flex bg-white p-0.5 rounded-xl border border-slate-300 shadow-2xs">
              {[
                { id: 'pending_all', label: `คงค้างพิจารณา (${pendingCount})` },
                { id: 'submitted', label: 'ยื่นใหม่' },
                { id: 'under_review', label: 'กำลังตรวจสอบ' },
                { id: 'action_required', label: 'ขอข้อมูลเพิ่ม' },
                { id: 'approved', label: `อนุมัติแล้ว (${approvedCount})` },
                { id: 'rejected', label: 'ไม่อนุมัติ' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatusFilter(item.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === item.id 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">ความสำคัญ: ทั้งหมด</option>
              <option value="high_only">เฉพาะเคสด่วน ({urgentCount})</option>
              <option value="normal">เฉพาะเคสปกติ</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ชื่อผู้ยื่น, สถานที่..."
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Success Toast Notification */}
        {successToast && (
          <div className="bg-emerald-600 text-white p-3 text-xs font-bold flex items-center justify-between shadow-md shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-white hover:text-emerald-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content Area: Split View (List Left, Review/Approval Right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-slate-100">
          
          {/* Left Column: Request List */}
          <div className="md:col-span-5 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>รายการคำร้อง ({filteredRequests.length} รายการ)</span>
              <span className="text-[10px] text-slate-400">คลิกเลือกรายการเพื่อพิจารณา</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">ไม่พบคำร้องที่ตรงตามเงื่อนไข</p>
                  <p className="text-[11px]">โปรดลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                </div>
              ) : (
                filteredRequests.map(item => {
                  const isSelected = item.id === selectedReqId;
                  const isUrgent = item.priority === 'high' || item.priority === 'very_urgent' || item.priority === 'urgent';
                  const currentStep = item.approvalWorkflow?.steps?.[item.approvalWorkflow.currentStepIndex];

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedReqId(item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                        isSelected 
                          ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-400' 
                          : isUrgent 
                          ? 'bg-rose-50/40 hover:bg-rose-50 border-rose-200' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-blue-900">{item.id}</span>
                        <div className="flex items-center gap-1">
                          {isUrgent && (
                            <span className="bg-rose-100 text-rose-700 border border-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                              ⚠️ ด่วน
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(item.status)}`}>
                            {getStatusLabelTh(item.status)}
                          </span>
                        </div>
                      </div>

                      <div className="font-bold text-slate-800 line-clamp-1">{item.title}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>👤 {item.applicant?.fullName || 'ไม่ระบุชื่อ'}</span>
                        <span className="font-mono text-[10px]">
                          {new Date(item.createdAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {currentStep && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50/80 p-1.5 rounded-lg border border-indigo-100 flex items-center justify-between">
                          <span className="truncate">📍 ขั้นตอน: {currentStep.roleTitle}</span>
                          <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detailed Review & Approval Form */}
          <div className="md:col-span-7 bg-white flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-5">
            {!selectedRequest ? (
              <div className="my-auto text-center p-8 text-slate-400 text-xs space-y-2">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600">กรุณาเลือกรายการคำร้องจากฝั่งซ้าย</p>
                <p className="text-[11px]">เพื่อทำการตรวจสอบรายละเอียดและอนุมัติคำร้อง</p>
              </div>
            ) : (
              <>
                {/* Selected Request Top Banner */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/30">
                          {selectedRequest.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(selectedRequest.status)}`}>
                          {getStatusLabelTh(selectedRequest.status)}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-100 mt-1 leading-snug">
                        {selectedRequest.title}
                      </h3>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 space-y-0.5 shrink-0">
                      <div>ยื่นเมื่อ: {new Date(selectedRequest.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      <div className="text-amber-300 font-semibold">
                        {getPriorityLabelTh(selectedRequest.priority)}
                      </div>
                    </div>
                  </div>

                  {/* Applicant Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ผู้ยื่นคำร้อง</span>
                      <strong className="text-slate-100">{selectedRequest.applicant?.prefix}{selectedRequest.applicant?.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">เลขประจำตัวประชาชน / สังกัด</span>
                      <span className="text-slate-200 font-mono text-[11px]">{selectedRequest.applicant?.citizenId || selectedRequest.applicant?.department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">เบอร์โทรศัพท์</span>
                      <span className="text-blue-300 font-mono font-bold">{selectedRequest.applicant?.phone || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Request Incident Details Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide border-l-4 border-blue-600 pl-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    วัตถุประสงค์และสถานที่ขอตรวจสอบภาพกล้อง
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">เหตุผลความจำเป็น</span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {selectedRequest.reason || 'ขอตรวจสอบภาพกล้องวงจรปิดเพื่อนำไปประกอบหลักฐาน'}
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">จุดติดตั้ง / บริเวณที่เกิดเหตุ</span>
                      <p className="text-slate-800 font-bold">
                        {selectedRequest.location || selectedRequest.details?.cameraLocation || 'เขตเทศบาลเมืองชัยภูมิ'}
                      </p>
                      {selectedRequest.details?.incidentTime && (
                        <div className="text-[11px] text-slate-600 font-mono mt-1">
                          ⏰ ช่วงเวลา: {selectedRequest.details.incidentTime}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pre-review Check Notes if present */}
                  {selectedRequest.preReviewCheck && (
                    <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-blue-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        ผลการตรวจสอบล่วงหน้าโดยเจ้าหน้าที่ส่องกล้อง (Pre-Review):
                      </div>
                      <p className="text-[11px] text-slate-700">
                        {selectedRequest.preReviewCheck.notes || 'เจ้าหน้าที่ได้ทำการส่องกล้องพบคลิปภาพชัดเจน'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Workflow Steps Line */}
                {selectedRequest.approvalWorkflow?.steps && selectedRequest.approvalWorkflow.steps.length > 0 && (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        ขั้นตอนการอนุมัติ (Approval Chain Workflow):
                      </span>
                      <span className="text-[11px] font-mono text-indigo-700 font-bold">
                        ขั้นที่ {selectedRequest.approvalWorkflow.currentStepIndex + 1} จาก {selectedRequest.approvalWorkflow.steps.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {selectedRequest.approvalWorkflow.steps.map((st, idx) => {
                        const isCurrent = idx === selectedRequest.approvalWorkflow?.currentStepIndex;
                        const isDone = st.status === 'approved' || st.status === 'skipped';
                        return (
                          <div
                            key={idx}
                            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold shrink-0 flex items-center gap-1.5 ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isCurrent
                                ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-2xs'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span>{idx + 1}. {st.roleTitle}</span>
                            {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approval Action Form Section */}
                <form onSubmit={handleExecuteApproval} className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                      แบบลงนามและสั่งการอนุมัติคำร้อง (Official Approval Action)
                    </h4>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
                      สำหรับผู้อนุมัติประจำขั้นตอน
                    </span>
                  </div>

                  {/* Decision Options Radio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">
                      ผลการพิจารณาอนุมัติคำร้อง *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDecision('approved')}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          decision === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>🟢 เห็นควรอนุมัติ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecision('action_required')}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          decision === 'action_required'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-400/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-300" />
                        <span>🟡 ขอข้อมูลเพิ่มเติม</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecision('rejected')}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          decision === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4 text-rose-300" />
                        <span>🔴 ไม่อนุมัติ / ปฏิเสธ</span>
                      </button>
                    </div>
                  </div>

                  {/* Approver Credentials Confirmation */}
                  <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider text-blue-300">
                      ข้อมูลผู้อนุมัติ (ผู้ลงนามสั่งการ):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block">ชื่อ-นามสกุล ผู้อนุมัติ</label>
                        <input
                          type="text"
                          value={approver.name}
                          onChange={(e) => setApprover({ ...approver, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block">ตำแหน่ง</label>
                        <input
                          type="text"
                          value={approver.position}
                          onChange={(e) => setApprover({ ...approver, position: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block">อีเมลแจ้งเตือน</label>
                        <input
                          type="email"
                          value={approver.email}
                          onChange={(e) => setApprover({ ...approver, email: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block">เบอร์โทรศัพท์ / LINE ID</label>
                        <input
                          type="text"
                          value={approver.phone}
                          onChange={(e) => setApprover({ ...approver, phone: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Executive Directive / Decision Comment */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        ความเห็นประกอบการอนุมัติ / ข้อสั่งการ
                      </label>
                      <span className="text-[10px] text-slate-400">เลือกข้อความสำเร็จรูปเพื่อความรวดเร็ว</span>
                    </div>

                    {/* Quick Directives */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {[
                        'อนุมัติให้เปิดและคัดสำเนาไฟล์คลิปภาพวีดีโอได้ตามระเบียบ',
                        'เห็นควรอนุมัติ และขอให้ส่งมอบไฟล์ให้ผู้ยื่นคำร้อง',
                        'ไม่อนุมัติ เนื่องจากจุดเกิดเหตุอยู่นอกพื้นที่กล้องเทศบาล',
                        'ขอเอกสารใบแจ้งความและสำเนาบัตรประชาชนเพิ่มเติม'
                      ].map((txt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyQuickDirective(txt)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-700 transition-colors cursor-pointer"
                        >
                          + {txt}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={directiveNote}
                      onChange={(e) => setDirectiveNote(e.target.value)}
                      placeholder="ระบุข้อสั่งการ ความเห็นเพิ่มเติม หรือเงื่อนไขประกอบการอนุมัติ..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                    />
                  </div>

                  {/* Digital Signature Pad Option */}
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-200">
                        <input
                          type="checkbox"
                          checked={includeSignature}
                          onChange={(e) => setIncludeSignature(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>แนบลายมือชื่อดิจิทัล (Digital Signature Pad)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">เซ็นสดบนหน้าจอเพื่อใช้ประทับบนคำร้อง</span>
                    </div>

                    {includeSignature && (
                      <div className="bg-white rounded-xl p-2 text-slate-900 border border-slate-600">
                        <SignaturePad onSignatureChange={(data) => setSignatureData(data)} />
                      </div>
                    )}
                  </div>

                  {/* Submit Action */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                        decision === 'approved'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                          : decision === 'rejected'
                          ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>กำลังบันทึกผลการพิจารณา...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>บันทึกและยืนยันผลการพิจารณา ({decision === 'approved' ? 'อนุมัติ' : decision === 'rejected' ? 'ไม่อนุมัติ' : 'ส่งกลับแก้ไข'})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

      </div>

      {showApproversModal && (
        <AdminApproversManagementModal
          isOpen={showApproversModal}
          onClose={() => setShowApproversModal(false)}
          adminName={approver.name || 'ผู้ดูแลระบบ (Admin)'}
          onApproversUpdated={() => {
            const updatedRoster = getStoredExtendedApprovers();
            setRosterApprovers(updatedRoster);
            onRefreshRequests();
          }}
        />
      )}
    </div>
  );
};
