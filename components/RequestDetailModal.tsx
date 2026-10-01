import React, { useState, useEffect } from 'react';
import { 
  RequestItem, 
  RequestStatus, 
  StepStatus, 
  ProcessingHistoryLog,
  ApprovalStep 
} from '../types/request';
import { 
  getStatusBadgeColor, 
  getStatusLabelTh, 
  getPriorityBadgeColor, 
  getPriorityLabelTh,
  getInitialOrDerivedProcessingHistory,
  addProcessingHistoryLog,
  updateProcessingHistoryLog,
  deleteProcessingHistoryLog,
  getStoredRequests
} from '../utils/storage';
import { getStoredOfficerUser } from '../utils/officerAuth';
import { ApprovalWorkflowViewer } from './ApprovalWorkflowViewer';
import { StepProgressIndicator } from './StepProgressIndicator';
import { OfficialDocumentPrint } from './OfficialDocumentPrint';
import { AiTopicBadge } from './AiTopicBadge';
import { StatusBadge } from './StatusBadge';
import { SaveToKeepButton } from './SaveToKeepButton';
import { AttachmentGallery } from './AttachmentGallery';
import { 
  X, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  MessageSquare, 
  Plus, 
  Printer, 
  Copy, 
  Check, 
  Calendar, 
  Tag, 
  History, 
  ShieldCheck, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Send, 
  Building2, 
  Phone, 
  Mail, 
  CreditCard, 
  Camera, 
  Layers, 
  Search,
  ExternalLink 
} from 'lucide-react';

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem;
  defaultTab?: 'overview' | 'processing_history' | 'workflow' | 'attachments' | 'notes';
  onRequestUpdated?: (updated: RequestItem) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  isOpen,
  onClose,
  request: initialRequest,
  defaultTab = 'processing_history',
  onRequestUpdated
}) => {
  const [request, setRequest] = useState<RequestItem>(initialRequest);
  const [activeTab, setActiveTab] = useState<'overview' | 'processing_history' | 'workflow' | 'attachments' | 'notes'>(defaultTab);
  const [copiedId, setCopiedId] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Processing History State
  const [logs, setLogs] = useState<ProcessingHistoryLog[]>([]);
  const [showAddLogForm, setShowAddLogForm] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [filterStep, setFilterStep] = useState<string>('all');
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [logViewMode, setLogViewMode] = useState<'timeline' | 'table'>('timeline');

  // New Log Form State
  const loggedOfficer = getStoredOfficerUser();
  const [selectedStepOption, setSelectedStepOption] = useState<string>('step-1');
  const [customStepTitle, setCustomStepTitle] = useState('');
  const [customAdminUserId, setCustomAdminUserId] = useState(loggedOfficer?.uid || 'ADM-1002');
  const [customAdminName, setCustomAdminName] = useState(loggedOfficer?.name || 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)');
  const [customAdminRole, setCustomAdminRole] = useState(loggedOfficer?.position || 'ผู้ดูแลระบบและกลั่นกรองคำร้อง');
  const [logTimestamp, setLogTimestamp] = useState<string>(() => {
    const d = new Date();
    // format as local datetime string YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [logStatus, setLogStatus] = useState<string>('approved');
  const [logRemarks, setLogRemarks] = useState<string>('');
  const [logActionType, setLogActionType] = useState<ProcessingHistoryLog['actionType']>('step_approval');
  const [logSuccessNotice, setLogSuccessNotice] = useState<string | null>(null);

  // Sync request and derived logs
  useEffect(() => {
    setRequest(initialRequest);
    const derivedLogs = getInitialOrDerivedProcessingHistory(initialRequest);
    setLogs(derivedLogs);
  }, [initialRequest]);

  // If initial request changes or activeTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(request.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSetCurrentTime = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setLogTimestamp(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const quickRemarksPresets = [
    '✓ ตรวจสอบความถูกต้องของเอกสารหลักฐานและบัตรประจำตัวประชาชน ครบถ้วนตามระเบียบ',
    '📹 ตรวจสอบไฟล์ภาพจากกล้องวงจรปิด CCTV เรียบร้อย ภาพคมชัดสมบูรณ์ ไม่พบการละเมิดข้อมูลบุคคลที่สาม',
    '📤 ส่งเรื่องเสนอผู้บังคับบัญชาตามลำดับขั้นเพื่อพิจารณาลงนามอนุมัติตามระเบียบเทศบาล',
    '✍️ ลงนามอนุมัติคำร้องและออกหนังสือรับรองทางราชการเรียบร้อยแล้ว',
    '📦 นัดหมายผู้ขอรับไฟล์และส่งมอบ Flash Drive สำเนาภาพ CCTV เรียบร้อยสมบูรณ์',
    '⚠️ ขอเอกสารหลักฐานเพิ่มเติม: หนังสือแจ้งความฉบับลงบันทึกประจำวันระบุช่วงเวลาชัดเจน'
  ];

  const handleAddProcessingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logRemarks.trim()) {
      alert('กรุณากรอกบันทึกข้อความ / รายละเอียดการดำเนินการ (Remarks)');
      return;
    }

    let finalStepTitle = customStepTitle;
    let finalStepId: string | undefined = undefined;
    let finalStepNumber: number | undefined = undefined;

    // Check if matching workflow step
    if (request.approvalWorkflow?.steps) {
      const matched = request.approvalWorkflow.steps.find(s => s.id === selectedStepOption);
      if (matched) {
        finalStepTitle = matched.roleTitle;
        finalStepId = matched.id;
        finalStepNumber = matched.stepNumber;
      }
    }

    if (!finalStepTitle) {
      if (selectedStepOption === 'general-check') {
        finalStepTitle = 'การตรวจสอบเอกสารและกลั่นกรองคำร้องเบื้องต้น';
      } else if (selectedStepOption === 'cctv-verify') {
        finalStepTitle = 'การตรวจสอบตำแหน่งกล้องและไฟล์ภาพ CCTV';
      } else if (selectedStepOption === 'admin-audit') {
        finalStepTitle = 'การตรวจสอบและกลั่นกรองคำร้องระดับ Admin (Admin Audit)';
      } else if (selectedStepOption === 'delivery') {
        finalStepTitle = 'การนัดหมายและส่งมอบไฟล์ข้อมูลภาพ';
      } else {
        finalStepTitle = customStepTitle || 'บันทึกการดำเนินการขั้นตอนพิเศษ';
      }
    }

    const newLogData = {
      stepId: finalStepId,
      stepNumber: finalStepNumber,
      stepTitle: finalStepTitle,
      status: logStatus,
      timestamp: logTimestamp ? new Date(logTimestamp).toISOString() : new Date().toISOString(),
      adminUserId: (customAdminUserId || '').trim() || 'ADM-1002',
      adminName: (customAdminName || '').trim() || 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)',
      adminRole: (customAdminRole || '').trim() || 'ผู้ดูแลระบบและกลั่นกรองคำร้อง',
      remarks: logRemarks.trim(),
      actionType: logActionType
    };

    const updated = addProcessingHistoryLog(request.id, newLogData);
    if (updated) {
      setRequest(updated);
      setLogs(getInitialOrDerivedProcessingHistory(updated));
      if (onRequestUpdated) {
        onRequestUpdated(updated);
      }
      setLogRemarks('');
      setShowAddLogForm(false);
      setLogSuccessNotice('บันทึกประวัติการดำเนินการและรหัสผู้ใช้งานเข้าสู่ระบบเรียบร้อยแล้ว');
      setTimeout(() => setLogSuccessNotice(null), 4000);
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (window.confirm('คุณต้องการลบรายการบันทึกประวัตินี้ใช่หรือไม่?')) {
      const updated = deleteProcessingHistoryLog(request.id, logId);
      if (updated) {
        setRequest(updated);
        setLogs(getInitialOrDerivedProcessingHistory(updated));
        if (onRequestUpdated) {
          onRequestUpdated(updated);
        }
      }
    }
  };

  const handleExportLogsCsv = () => {
    if (logs.length === 0) {
      alert('ไม่พบประวัติการดำเนินการเพื่อส่งออก');
      return;
    }
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'ลำดับ,วันเวลา (Timestamp),รหัสผู้ใช้ (User ID),ผู้บันทึก (Admin Name),ตำแหน่ง (Role),ขั้นตอน (Approval Step),สถานะ (Status),รายละเอียด (Remarks)\n';

    logs.forEach((l, idx) => {
      const dateStr = new Date(l.timestamp).toLocaleString('th-TH');
      const row = [
        idx + 1,
        `"${dateStr}"`,
        `"${l.adminUserId}"`,
        `"${l.adminName}"`,
        `"${l.adminRole || ''}"`,
        `"${l.stepTitle.replace(/"/g, '""')}"`,
        `"${l.status}"`,
        `"${l.remarks.replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ประวัติการดำเนินการ_${request.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Sort Logs
  const filteredLogs = logs
    .filter(l => {
      const matchSearch = !logSearchTerm.trim() || 
        l.remarks.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.adminUserId.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.adminName.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        l.stepTitle.toLowerCase().includes(logSearchTerm.toLowerCase());
      
      const matchStep = filterStep === 'all' || 
        (filterStep === 'custom' && !l.stepId) ||
        l.stepId === filterStep;

      return matchSearch && matchStep;
    })
    .sort((a, b) => {
      if (logSortOrder === 'asc') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  if (showPrintModal) {
    return (
      <OfficialDocumentPrint
        request={request}
        onBack={() => setShowPrintModal(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pr-12 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-300" />
                {request.id}
                <button
                  onClick={handleCopyId}
                  className="hover:text-white transition-colors ml-0.5"
                  title="คัดลอกเลขที่คำร้อง"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-200" />}
                </button>
              </span>

              <StatusBadge status={request.status} size="sm" showIcon showDot showEnLabel />

              <span className={`px-2.5 py-1 rounded-lg font-bold border text-xs ${getPriorityBadgeColor(request.priority)}`}>
                ความสำคัญ: {getPriorityLabelTh(request.priority)}
              </span>

              {request.category && (
                <span className="bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded-lg text-xs font-medium">
                  {request.category === 'cctv' ? '📹 กล้องวงจรปิด CCTV' : request.category}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white line-clamp-2 leading-snug">
              {request.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-300" />
                <span>ผู้ยื่น: <strong>{request.applicant?.prefix}{request.applicant?.fullName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>วันที่ยื่นเรื่อง: {new Date(request.createdAt).toLocaleDateString('th-TH')}</span>
              </div>
              {request.assignedOfficer && (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ผู้รับผิดชอบ: {request.assignedOfficer}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 pt-2 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-900 border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลคำร้อง (Overview)</span>
            </button>

            <button
              onClick={() => setActiveTab('processing_history')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                activeTab === 'processing_history'
                  ? 'bg-white text-purple-950 border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-purple-600" />
              <span>ประวัติการดำเนินการ (Processing History)</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                activeTab === 'workflow'
                  ? 'bg-white text-indigo-900 border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>ขั้นตอนการอนุมัติ (Workflow)</span>
              {request.approvalWorkflow?.steps && (
                <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {request.approvalWorkflow.steps.length} ขั้น
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attachments')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                activeTab === 'attachments'
                  ? 'bg-white text-emerald-900 border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <Paperclip className="w-4 h-4 text-emerald-600" />
              <span>เอกสารแนบ (Attachments)</span>
              {request.attachments && request.attachments.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {request.attachments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
                activeTab === 'notes'
                  ? 'bg-white text-amber-900 border-slate-200 shadow-2xs -mb-px'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>บันทึกข้อความ (Notes)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-1">
            <SaveToKeepButton request={request} variant="compact" />
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="พิมพ์แบบฟอร์มคำร้องฉบับราชการ / PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">พิมพ์ / PDF</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">

          {/* TAB 1: OVERVIEW & DETAILS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Progress Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    สถานะและไทม์ไลน์ความคืบหน้าคำร้อง
                  </h3>
                  <span className="text-xs text-slate-500">
                    อัปเดตล่าสุด: {new Date(request.updatedAt || request.createdAt).toLocaleString('th-TH')}
                  </span>
                </div>

                <div className="p-2">
                  <StepProgressIndicator
                    status={request.status}
                    statusHistory={request.statusHistory}
                    createdAt={request.createdAt}
                    updatedAt={request.updatedAt}
                    showDetails={true}
                  />
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Applicant Info */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-blue-600" />
                    ข้อมูลผู้ยื่นคำร้อง (Applicant Info)
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">ชื่อ-นามสกุล</span>
                      <p className="font-bold text-slate-800">{request.applicant?.prefix}{request.applicant?.fullName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">เลขประจำตัวประชาชน / รหัส</span>
                      <p className="font-mono text-slate-700">{request.applicant?.citizenIdOrCode || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">เบอร์โทรศัพท์</span>
                      <p className="text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {request.applicant?.phone || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">อีเมล</span>
                      <p className="text-slate-700 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {request.applicant?.email || '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">หน่วยงาน / แผนก / ตำแหน่ง</span>
                      <p className="text-slate-700">{request.applicant?.department || '-'} {request.applicant?.positionOrMajor ? `(${request.applicant?.positionOrMajor})` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Request Specific Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    รายละเอียดคำร้องเฉพาะทาง (Service Details)
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {request.details?.cctvLocation && (
                      <div>
                        <span className="text-slate-400 block">จุดติดตั้ง / บริเวณกล้องที่ต้องการดู:</span>
                        <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-0.5">
                          📍 {request.details.cctvLocation}
                        </p>
                      </div>
                    )}
                    {request.details?.footageDate && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block">วันที่เกิดเหตุ / บันทึกภาพ:</span>
                          <p className="font-semibold text-slate-800">{request.details.footageDate}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block">ช่วงเวลาที่เกิดเหตุ:</span>
                          <p className="font-semibold text-slate-800">{request.details.timeRange || '-'}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block">เหตุผลความจำเป็นในการขอข้อมูล:</span>
                      <p className="text-slate-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-xs leading-relaxed mt-0.5">
                        {request.reason || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Auto Tags Banner if available */}
              {request.aiAutoTags && (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-4 rounded-2xl border border-purple-200/80 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-950 text-xs">AI Smart Auto-Tagging:</span>
                      <AiTopicBadge topics={request.aiAutoTags.topics} primaryTopic={request.aiAutoTags.primaryTopic} />
                    </div>
                    {request.aiAutoTags.reasoning && (
                      <p className="text-xs text-purple-900/80 leading-relaxed">
                        {request.aiAutoTags.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROCESSING HISTORY (PRIMARY USER REQUIREMENT) */}
          {activeTab === 'processing_history' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Top Banner & Summary Cards */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 text-white p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-300" />
                      ระบบบันทึกประวัติการดำเนินการ (Processing History Audit Trail)
                    </h3>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      บันทึกวันเวลาที่แน่นอน (Timestamps), ข้อคิดเห็น/ข้อสั่งการ (Remarks), และรหัสผู้ใช้งาน (User IDs) สำหรับทุกขั้นตอนการอนุมัติ
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddLogForm(!showAddLogForm)}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer scale-102 active:scale-98"
                    >
                      {showAddLogForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{showAddLogForm ? 'ซ่อนแบบฟอร์มบันทึก' : '+ บันทึกประวัติขั้นตอนใหม่ (Add Step Log)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportLogsCsv}
                      className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-white/20 cursor-pointer"
                      title="ส่งออกบันทึกประวัติเป็น CSV"
                    >
                      <Download className="w-4 h-4 text-purple-200" />
                      <span>ส่งออก CSV</span>
                    </button>
                  </div>
                </div>

                {/* Metric Summary Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] text-purple-200 block">จำนวนรายการประวัติ</span>
                    <strong className="text-lg font-black text-white">{logs.length} รายการ</strong>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] text-purple-200 block">รหัส Admin ล่าสุด</span>
                    <strong className="text-sm font-mono font-bold text-emerald-300">
                      {logs.length > 0 ? logs[logs.length - 1].adminUserId : 'ADM-1002'}
                    </strong>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] text-purple-200 block">ขั้นตอนการอนุมัติทั้งหมด</span>
                    <strong className="text-lg font-black text-white">
                      {request.approvalWorkflow?.steps?.length || 4} ขั้นตอน
                    </strong>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] text-purple-200 block">วันเวลาดำเนินการล่าสุด</span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toLocaleDateString('th-TH') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {logSuccessNotice && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{logSuccessNotice}</span>
                </div>
              )}

              {/* ADMIN LOGGING FORM (EXPANDABLE) */}
              {showAddLogForm && (
                <form onSubmit={handleAddProcessingLog} className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-purple-300 shadow-lg space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                        ✍️
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          บันทึกประวัติการดำเนินการขั้นตอน (Log Processing Step)
                        </h4>
                        <p className="text-xs text-slate-500">
                          ระบุขั้นตอนการอนุมัติ, วันเวลาที่ดำเนินการจริง, รหัสผู้ใช้ Admin, และข้อคิดเห็น/ผลการตรวจ
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddLogForm(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    
                    {/* 1. Step Selector */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        เลือกขั้นตอนการอนุมัติ / การดำเนินการ (Approval Step):
                      </label>
                      <select
                        value={selectedStepOption}
                        onChange={(e) => setSelectedStepOption(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        {request.approvalWorkflow?.steps?.map((st) => (
                          <option key={st.id} value={st.id}>
                            ขั้นตอนที่ {st.stepNumber}: {st.roleTitle} ({st.approverName || 'ผู้อนุมัติ'})
                          </option>
                        ))}
                        <option value="general-check">การตรวจสอบเอกสารและกลั่นกรองคำร้องเบื้องต้น</option>
                        <option value="cctv-verify">การตรวจสอบตำแหน่งกล้องและไฟล์ภาพ CCTV</option>
                        <option value="admin-audit">การตรวจสอบและกลั่นกรองคำร้องระดับ Admin (Admin Audit)</option>
                        <option value="delivery">การนัดหมายและส่งมอบไฟล์ข้อมูลภาพ</option>
                        <option value="custom">-- กำหนดชื่อขั้นตอนการดำเนินการเอง --</option>
                      </select>
                    </div>

                    {/* 2. Step Status Outcome */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ผลการดำเนินการขั้นตอนนี้:
                      </label>
                      <select
                        value={logStatus}
                        onChange={(e) => setLogStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="approved">✓ อนุมัติ / เห็นชอบ (Approved)</option>
                        <option value="in_progress">⏳ อยู่ระหว่างดำเนินการ (In Progress)</option>
                        <option value="action_required">⚠️ ขอข้อมูล/เอกสารเพิ่ม (Action Required)</option>
                        <option value="rejected">❌ ไม่อนุมัติ / สั่งตก (Rejected)</option>
                        <option value="completed">🎉 เสร็จสิ้นกระบวนการ (Completed)</option>
                      </select>
                    </div>

                    {/* Custom Step Title if chosen */}
                    {selectedStepOption === 'custom' && (
                      <div className="sm:col-span-3 space-y-1">
                        <label className="font-bold text-purple-900">
                          ระบุชื่อขั้นตอนการทำงาน:
                        </label>
                        <input
                          type="text"
                          value={customStepTitle}
                          onChange={(e) => setCustomStepTitle(e.target.value)}
                          placeholder="เช่น การประสานงานตำรวจภูธรเมืองชัยภูมิ เพื่อส่งมอบไฟล์หลักฐานทางคดี"
                          className="w-full bg-white border border-purple-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    )}

                    {/* 3. Exact Timestamp Picker */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          วันเวลาที่ดำเนินการ (Timestamp):
                        </label>
                        <button
                          type="button"
                          onClick={handleSetCurrentTime}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          🕒 ใช้เวลานี้
                        </button>
                      </div>
                      <input
                        type="datetime-local"
                        value={logTimestamp}
                        onChange={(e) => setLogTimestamp(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    {/* 4. Admin User ID */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        รหัสผู้ใช้งาน / Admin ID (User ID):
                      </label>
                      <input
                        type="text"
                        value={customAdminUserId}
                        onChange={(e) => setCustomAdminUserId(e.target.value)}
                        placeholder="เช่น ADM-1002, OFFICER-001"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      {/* Quick ID Chips */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {['ADM-1001', 'ADM-1002', 'OFFICER-001', 'APPROVER-01', 'MAYOR-01'].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setCustomAdminUserId(chip)}
                            className="bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-900 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 5. Admin / Officer Name */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        ชื่อ-นามสกุล ผู้ดำเนินการ (Admin Name):
                      </label>
                      <input
                        type="text"
                        value={customAdminName}
                        onChange={(e) => setCustomAdminName(e.target.value)}
                        placeholder="ชื่อ-สกุล เจ้าหน้าที่"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* 6. Remarks / Note Textarea */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      บันทึกข้อคิดเห็น / ข้อสั่งการ / รายละเอียดการดำเนินการ (Remarks):
                    </label>
                    <textarea
                      rows={3}
                      value={logRemarks}
                      onChange={(e) => setLogRemarks(e.target.value)}
                      placeholder="กรอกบันทึกผลการตรวจสอบ, ความเห็นการอนุมัติ, เงื่อนไขการส่งมอบภาพ หรือข้อสั่งการของขั้นตอนนี้..."
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none leading-relaxed"
                    />

                    {/* Quick Remark Presets */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        ข้อความแนะนำด่วน (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {quickRemarksPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLogRemarks(preset)}
                            className="text-[11px] bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200 px-2.5 py-1 rounded-lg text-left transition-all"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddLogForm(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>💾 บันทึกประวัติการดำเนินการ (Save Step Log)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Filter & View Mode Controls */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={logSearchTerm}
                      onChange={(e) => setLogSearchTerm(e.target.value)}
                      placeholder="ค้นหาข้อความ, User ID, หรือชื่อผู้บันทึก..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Step Filter */}
                  <div className="flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={filterStep}
                      onChange={(e) => setFilterStep(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-none"
                    >
                      <option value="all">ทุกขั้นตอน ({logs.length})</option>
                      {request.approvalWorkflow?.steps?.map((st) => (
                        <option key={st.id} value={st.id}>
                          ขั้นตอนที่ {st.stepNumber}: {st.roleTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Order */}
                  <button
                    onClick={() => setLogSortOrder(logSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl font-semibold text-slate-700 transition-colors cursor-pointer"
                    title="สลับการเรียงลำดับวันเวลา"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
                    <span>{logSortOrder === 'desc' ? 'ล่าสุดก่อน (Newest)' : 'เก่าสุดก่อน (Oldest)'}</span>
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setLogViewMode('timeline')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        logViewMode === 'timeline' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      ไทม์ไลน์
                    </button>
                    <button
                      onClick={() => setLogViewMode('table')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        logViewMode === 'table' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      ตาราง Audit
                    </button>
                  </div>
                </div>
              </div>

              {/* TIMELINE VIEW */}
              {logViewMode === 'timeline' ? (
                <div className="space-y-4">
                  {filteredLogs.length > 0 ? (
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-purple-600 before:via-indigo-400 before:to-slate-200">
                      {filteredLogs.map((log, index) => {
                        const dateObj = new Date(log.timestamp);
                        const isRecent = index === 0;

                        return (
                          <div key={log.id} className="relative group">
                            {/* Dot Icon Indicator */}
                            <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-4 ring-white ${
                              log.status === 'approved' || log.status === 'completed'
                                ? 'bg-emerald-600'
                                : log.status === 'in_progress'
                                ? 'bg-indigo-600 animate-pulse'
                                : log.status === 'rejected'
                                ? 'bg-rose-600'
                                : 'bg-purple-600'
                            }`}>
                              {log.stepNumber !== undefined ? log.stepNumber : (index + 1)}
                            </div>

                            {/* Card Content */}
                            <div className="bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all space-y-3">
                              
                              {/* Header inside Card */}
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-sm">
                                      {log.stepTitle}
                                    </span>

                                    {/* Status Badge */}
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                      log.status === 'approved' 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : log.status === 'in_progress'
                                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                        : log.status === 'action_required'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : log.status === 'rejected'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      {log.status === 'approved' ? '✓ อนุมัติแล้ว' : (log.status === 'in_progress' ? '⏳ อยู่ระหว่างดำเนินการ' : (log.status === 'action_required' ? '⚠️ ขอข้อมูลเพิ่ม' : (log.status === 'rejected' ? '❌ ไม่อนุมัติ' : log.status)))}
                                    </span>

                                    {/* Action Type */}
                                    {log.actionType && (
                                      <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded">
                                        #{log.actionType}
                                      </span>
                                    )}
                                  </div>

                                  {/* User ID & Name */}
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
                                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 font-mono font-black text-[11px] px-2 py-0.5 rounded-lg shadow-2xs">
                                      <CreditCard className="w-3 h-3 text-purple-600" />
                                      รหัสผู้ใช้: {log.adminUserId}
                                    </span>
                                    <span className="font-semibold text-slate-800">
                                      {log.adminName}
                                    </span>
                                    {log.adminRole && (
                                      <span className="text-slate-400">
                                        ({log.adminRole})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Timestamp Badge */}
                                <div className="text-right shrink-0">
                                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono font-medium">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{dateObj.toLocaleDateString('th-TH')} {dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.</span>
                                  </div>
                                </div>
                              </div>

                              {/* Remarks Box */}
                              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-medium">
                                <span className="font-bold text-purple-900 block mb-1">บันทึกข้อคิดเห็น / ข้อสั่งการ (Remarks):</span>
                                <p className="whitespace-pre-line text-slate-800">
                                  {log.remarks}
                                </p>
                              </div>

                              {/* Action Footer for Deleting / Editing */}
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                                <span>บันทึกเข้าระบบ: {new Date(log.loggedAt || log.timestamp).toLocaleString('th-TH')}</span>
                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    title="ลบรายการบันทึกนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    ลบ
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                      <History className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-700 text-sm">ไม่พบรายการประวัติการดำเนินการที่ค้นหา</h4>
                      <p className="text-xs text-slate-500">
                        ท่านสามารถกดปุ่ม "+ บันทึกประวัติขั้นตอนใหม่" ด้านบนเพื่อเพิ่มประวัติและลงเวลาการดำเนินการ
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* AUDIT TABLE VIEW */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="py-3 px-3.5">#</th>
                          <th className="py-3 px-3.5">วันเวลา (Timestamp)</th>
                          <th className="py-3 px-3.5">รหัสผู้ใช้ (User ID)</th>
                          <th className="py-3 px-3.5">ผู้บันทึก & ตำแหน่ง</th>
                          <th className="py-3 px-3.5">ขั้นตอนการอนุมัติ</th>
                          <th className="py-3 px-3.5">สถานะ</th>
                          <th className="py-3 px-3.5 min-w-[220px]">ข้อคิดเห็น (Remarks)</th>
                          <th className="py-3 px-3.5 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map((log, idx) => (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleDateString('th-TH')}<br />
                              <span className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className="bg-purple-50 text-purple-900 border border-purple-200 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                                {log.adminUserId}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <p className="font-bold text-slate-800">{log.adminName}</p>
                              <p className="text-[10px] text-slate-400">{log.adminRole || '-'}</p>
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-slate-800">
                              {log.stepTitle}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                log.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-700 leading-relaxed">
                              {log.remarks}
                            </td>
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      เส้นทางลำดับขั้นตอนการอนุมัติคำร้อง (Approval Workflow Steps)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {request.approvalWorkflow?.templateName || 'ขั้นตอนการตรวจสอบและลงนามอนุมัติตามระเบียบเทศบาล'}
                    </p>
                  </div>
                </div>

                {request.approvalWorkflow ? (
                  <ApprovalWorkflowViewer
                    workflow={request.approvalWorkflow}
                    currentOfficerRole="admin"
                    onUpdateStep={() => {}}
                  />
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">ไม่มีข้อมูลขั้นตอนการอนุมัติเฉพาะสำหรับคำร้องนี้</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <AttachmentGallery
                  attachments={request.attachments || []}
                  title={`รายการเอกสารและหลักฐานในระบบ (${request.attachments?.length || 0} ไฟล์)`}
                  variant="full"
                  emptyMessage="ไม่มีเอกสารแนบในคำร้องนี้"
                />
              </div>
            </div>
          )}

          {/* TAB 5: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  บันทึกข้อความและคำชี้แจง (Notes & Communications)
                </h3>

                {request.officerNotes && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs space-y-1">
                    <span className="font-bold text-blue-900">หมายเหตุเจ้าหน้าที่ผู้รับเรื่อง:</span>
                    <p className="text-slate-800 leading-relaxed">{request.officerNotes}</p>
                  </div>
                )}

                {request.internalComments && request.internalComments.length > 0 ? (
                  <div className="space-y-2.5">
                    {request.internalComments.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                          note.isPublic ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <span className="font-bold text-slate-800">{note.author}</span>
                          <span>{new Date(note.createdAt).toLocaleString('th-TH')}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">ไม่มีบันทึกข้อความเพิ่มเติม</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            คำร้องเลขที่: <strong className="font-mono text-slate-800">{request.id}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>พิมพ์คำร้อง</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
