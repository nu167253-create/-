import React, { useState, useEffect, useRef } from 'react';
import { RequestItem, RequestStatus, AdminVerificationAudit, PriorityLevel } from '../types/request';
import { saveAdminVerificationAudit, getStatusBadgeColor, getStatusLabelTh, getPriorityBadgeColor, getPriorityLabelTh } from '../utils/storage';
import { SignaturePad } from './SignaturePad';
import { AttachmentGallery } from './AttachmentGallery';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  FileText, 
  Check, 
  X, 
  Send, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Lock, 
  Camera, 
  Info, 
  RotateCcw,
  Building2,
  FileCheck,
  Printer,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Paperclip,
  CheckSquare,
  Square,
  Sliders,
  Shield,
  HelpCircle,
  FolderLock,
  Stamp,
  FileBadge,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

interface AdminRequestVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: RequestItem | null;
  allRequests?: RequestItem[];
  initialBatchRequestIds?: string[];
  onSaved: (updatedRequest: RequestItem) => void;
  adminName?: string;
  adminPosition?: string;
}

export const AdminRequestVerificationModal: React.FC<AdminRequestVerificationModalProps> = ({
  isOpen,
  onClose,
  request: initialRequest,
  allRequests = [],
  initialBatchRequestIds,
  onSaved,
  adminName = 'นายสมศักดิ์ ชัยภูมิพัฒนา (Admin)',
  adminPosition = 'ผู้ดูแลระบบและหัวหน้างานบริหารกล้องวงจรปิด'
}) => {
  if (!isOpen) return null;

  // Selected request state for multi-request switching
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(() => {
    if (initialRequest) return initialRequest;
    if (allRequests.length > 0) return allRequests[0];
    return null;
  });

  useEffect(() => {
    if (initialRequest) {
      setSelectedReq(initialRequest);
    }
  }, [initialRequest]);

  const existingAudit = selectedReq?.adminAudit;
  const existingPreReview = selectedReq?.preReviewCheck;

  // Checklist state (5 Pillars)
  const [isIdentityVerified, setIsIdentityVerified] = useState<boolean>(
    existingAudit?.isIdentityVerified ?? (existingPreReview?.isIdentityVerified ?? true)
  );
  const [isPoliceReportVerified, setIsPoliceReportVerified] = useState<boolean>(
    existingAudit?.isPoliceReportVerified ?? (existingPreReview?.isReasonVerified ?? true)
  );
  const [isCctvFootageConfirmed, setIsCctvFootageConfirmed] = useState<boolean>(
    existingAudit?.isCctvFootageConfirmed ?? (existingPreReview?.isCctvFootageAvailable ?? true)
  );
  const [isPdpaComplianceVerified, setIsPdpaComplianceVerified] = useState<boolean>(
    existingAudit?.isPdpaComplianceVerified ?? (existingPreReview?.isPdpaConsentVerified ?? true)
  );
  const [isDataRetentionValid, setIsDataRetentionValid] = useState<boolean>(
    existingAudit?.isDataRetentionValid ?? true
  );

  // Risk & Delivery Conditions
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>(
    existingAudit?.riskLevel ?? (selectedReq?.priority === 'urgent' || selectedReq?.priority === 'very_urgent' ? 'critical' : selectedReq?.priority === 'high' ? 'high' : 'medium')
  );
  const [deliveryCondition, setDeliveryCondition] = useState<'full_footage' | 'blurred_third_party' | 'onsite_viewing_only' | 'official_investigation_only'>(
    existingAudit?.deliveryCondition ?? 'blurred_third_party'
  );

  // Audit Result & Directive Notes
  const [auditResult, setAuditResult] = useState<'approved' | 'action_required' | 'forward_executive' | 'rejected'>(
    existingAudit?.auditResult ?? 'approved'
  );
  const [adminNotes, setAdminNotes] = useState<string>(
    existingAudit?.adminNotes ?? 'ตรวจสอบเอกสารประกอบคำร้อง สิทธิ์ผู้ยื่น และไฟล์ภาพกล้องวงจรปิด CCTV เรียบร้อยแล้ว ถูกต้องตามระเบียบเทศบาลและ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เห็นชอบให้ดำเนินการจัดเตรียมข้อมูลตามเงื่อนไข'
  );

  const [signatureData, setSignatureData] = useState<string | null>(
    existingAudit?.adminSignatureUrl ?? null
  );
  const [includeSignature, setIncludeSignature] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit_form' | 'certificate_preview'>('audit_form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Reset form when active request changes
  useEffect(() => {
    if (selectedReq) {
      const audit = selectedReq.adminAudit;
      const preRev = selectedReq.preReviewCheck;

      setIsIdentityVerified(audit?.isIdentityVerified ?? (preRev?.isIdentityVerified ?? true));
      setIsPoliceReportVerified(audit?.isPoliceReportVerified ?? (preRev?.isReasonVerified ?? true));
      setIsCctvFootageConfirmed(audit?.isCctvFootageConfirmed ?? (preRev?.isCctvFootageAvailable ?? true));
      setIsPdpaComplianceVerified(audit?.isPdpaComplianceVerified ?? (preRev?.isPdpaConsentVerified ?? true));
      setIsDataRetentionValid(audit?.isDataRetentionValid ?? true);

      setRiskLevel(audit?.riskLevel ?? (selectedReq.priority === 'urgent' || selectedReq.priority === 'very_urgent' ? 'critical' : selectedReq.priority === 'high' ? 'high' : 'medium'));
      setDeliveryCondition(audit?.deliveryCondition ?? 'blurred_third_party');
      setAuditResult(audit?.auditResult ?? 'approved');
      setAdminNotes(audit?.adminNotes ?? 'ตรวจสอบเอกสารประกอบคำร้อง สิทธิ์ผู้ยื่น และไฟล์ภาพกล้องวงจรปิด CCTV เรียบร้อยแล้ว ถูกต้องตามระเบียบเทศบาลและ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เห็นชอบให้ดำเนินการจัดเตรียมข้อมูลตามเงื่อนไข');
      setSignatureData(audit?.adminSignatureUrl ?? null);
    }
  }, [selectedReq]);

  if (!selectedReq) return null;

  // Filter requests that are suitable for admin verification
  const pendingAuditRequests = allRequests.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required');
  const currentReqIndex = pendingAuditRequests.findIndex(r => r.id === selectedReq.id);

  const handlePrevRequest = () => {
    if (currentReqIndex > 0) {
      setSelectedReq(pendingAuditRequests[currentReqIndex - 1]);
    }
  };

  const handleNextRequest = () => {
    if (currentReqIndex < pendingAuditRequests.length - 1) {
      setSelectedReq(pendingAuditRequests[currentReqIndex + 1]);
    }
  };

  const allCriteriaPassed = isIdentityVerified && isPoliceReportVerified && isCctvFootageConfirmed && isPdpaComplianceVerified && isDataRetentionValid;

  const handlePassAllCriteria = () => {
    setIsIdentityVerified(true);
    setIsPoliceReportVerified(true);
    setIsCctvFootageConfirmed(true);
    setIsPdpaComplianceVerified(true);
    setIsDataRetentionValid(true);
    setAuditResult('approved');
    setAdminNotes('ผลการตรวจสอบโดย Admin ครบถ้วนทุกข้อ เอกสารสมบูรณ์ มีไฟล์ภาพบันทึกในระบบ CCTV เทศบาลเมืองชัยภูมิ และชอบด้วยกฎหมาย PDPA อนุมัติส่งมอบข้อมูล');
  };

  const handleResetCriteria = () => {
    setIsIdentityVerified(false);
    setIsPoliceReportVerified(false);
    setIsCctvFootageConfirmed(false);
    setIsPdpaComplianceVerified(false);
    setIsDataRetentionValid(false);
    setAuditResult('action_required');
    setAdminNotes('ตรวจสอบพบข้อบกพร่อง ต้องการเอกสารและข้อมูลชี้แจงเพิ่มเติมจากผู้ยื่นคำร้อง');
  };

  const handleSyncFromPreReview = () => {
    if (selectedReq.preReviewCheck) {
      const pr = selectedReq.preReviewCheck;
      setIsIdentityVerified(pr.isIdentityVerified);
      setIsPoliceReportVerified(pr.isReasonVerified);
      setIsCctvFootageConfirmed(pr.isCctvFootageAvailable);
      setIsPdpaComplianceVerified(pr.isPdpaConsentVerified);
      setIsDataRetentionValid(true);
      setAdminNotes(`ซิงค์ข้อมูลผลตรวจเบื้องต้นจากเจ้าหน้าที่ (${pr.verifiedByOfficer}): ${pr.inspectionNote || 'เอกสารครบถ้วน'}`);
      setSuccessToast('ซิงค์ข้อมูลการตรวจสภาพเบื้องต้นจากเจ้าหน้าที่สารบรรณเรียบร้อยแล้ว');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const handleSaveAudit = () => {
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const auditYearTh = new Date().getFullYear() + 543;
    const auditCode = existingAudit?.officialAuditCode || `ADM-AUD-${auditYearTh}-${selectedReq.id.replace(/[^0-9]/g, '').slice(-4) || '0001'}`;

    const auditPayload: AdminVerificationAudit = {
      isIdentityVerified,
      isPoliceReportVerified,
      isCctvFootageConfirmed,
      isPdpaComplianceVerified,
      isDataRetentionValid,
      riskLevel,
      deliveryCondition,
      auditResult,
      adminName: adminName.trim() || 'Admin ผู้ดูแลระบบ',
      adminPosition: adminPosition.trim() || 'ผู้ดูแลระบบสารบรรณและกล้องวงจรปิด',
      adminNotes: adminNotes.trim(),
      auditTimestamp: now,
      adminSignatureUrl: includeSignature ? (signatureData || undefined) : undefined,
      officialAuditCode: auditCode
    };

    setTimeout(() => {
      const updated = saveAdminVerificationAudit(selectedReq.id, auditPayload);
      setIsSubmitting(false);

      if (updated) {
        setSelectedReq(updated);
        setSuccessToast(`บันทึกผลการตรวจสอบคำร้องโดย Admin (รหัส ${auditCode}) เรียบร้อยแล้ว!`);
        onSaved(updated);

        setTimeout(() => {
          setSuccessToast(null);
          // If there are more pending requests, can stay or close
        }, 2000);
      }
    }, 400);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Gradient Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-lg border border-amber-300 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-wide">
                    Admin Request Verification & Audit Center
                  </span>
                  <span className="text-[11px] font-bold text-blue-200 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    👑 เฉพาะสิทธิ์ผู้ดูแลระบบ (Admin)
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
                  ศูนย์ตรวจสอบและกลั่นกรองคำร้องระดับ Admin
                </h3>
              </div>
            </div>

            {/* View Mode Switch Tabs */}
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/15 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab('audit_form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'audit_form'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                แบบฟอร์มตรวจสอบ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('certificate_preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'certificate_preview'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileBadge className="w-3.5 h-3.5" />
                ใบบันทึกผลตรวจ (Certificate)
              </button>
            </div>
          </div>

          {/* Quick Request Selector & Browser Bar */}
          <div className="mt-4 p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevRequest}
                  disabled={currentReqIndex <= 0}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                  title="คำร้องก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-amber-300 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                  {selectedReq.id}
                </span>
                <button
                  type="button"
                  onClick={handleNextRequest}
                  disabled={currentReqIndex >= pendingAuditRequests.length - 1}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                  title="คำร้องถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs line-clamp-1 max-w-md">
                  {selectedReq.title}
                </span>
                <span className="text-[11px] text-blue-200">
                  ผู้ยื่น: {selectedReq.applicant.prefix}{selectedReq.applicant.fullName} ({selectedReq.applicant.department || 'ประชาชน'}) • วันที่ยื่น: {new Date(selectedReq.createdAt).toLocaleDateString('th-TH')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(selectedReq.status)}`}>
                {getStatusLabelTh(selectedReq.status)}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getPriorityBadgeColor(selectedReq.priority)}`}>
                {getPriorityLabelTh(selectedReq.priority)}
              </span>
              {selectedReq.adminAudit && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Admin ตรวจรับรองแล้ว
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Success Toast Notification */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              {successToast}
            </span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-100 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'audit_form' ? (
            <>
              {/* Quick Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    เครื่องมือช่วยตรวจด่วน (Quick Presets):
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedReq.preReviewCheck && (
                    <button
                      type="button"
                      onClick={handleSyncFromPreReview}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="ซิงค์ผลตรวจสภาพเบื้องต้นของเจ้าหน้าที่สารบรรณ"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      ซิงค์จากผลตรวจเจ้าหน้าที่
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePassAllCriteria}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    ผ่านทุกเกณฑ์ (Pass All)
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCriteria}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    รีเซ็ต / ขอข้อมูลเพิ่ม
                  </button>
                </div>
              </div>

              {/* Request Details & Reason Context */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  สาระสำคัญของคำร้องและพิกัด CCTV:
                </div>
                <p className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-sans">
                  {selectedReq.reason}
                </p>
                {selectedReq.attachments && selectedReq.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="font-bold text-slate-800 text-[11px] mb-2 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      เอกสารและภาพถ่ายหลักฐานแนบ ({selectedReq.attachments.length} ไฟล์):
                    </div>
                    <AttachmentGallery
                      attachments={selectedReq.attachments}
                      variant="compact"
                    />
                  </div>
                )}
              </div>

              {/* 5-Pillar Admin Verification Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Award className="w-4.5 h-4.5 text-amber-600" />
                    รายการตรวจสอบ 5 เสาหลักตามระเบียบราชการ (5-Pillar Admin Verification Checklist)
                  </h4>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    allCriteriaPassed ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {allCriteriaPassed ? '✓ ครบถ้วนทุกเกณฑ์' : '⚠️ ยังมีข้อไม่ผ่าน'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  {/* Pillar 1 */}
                  <div 
                    onClick={() => setIsIdentityVerified(!isIdentityVerified)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isIdentityVerified
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-lg ${isIdentityVerified ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isIdentityVerified ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>1. ตรวจสอบสิทธิ์และยืนยันตัวตนผู้ร้อง (Identity & Authority)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        สำเนาบัตรประจำตัวประชาชน/หนังสือเดินทางถูกต้อง ตรงกับผู้ยื่นคำร้อง หรือมีหนังสือมอบอำนาจตามระเบียบ
                      </p>
                    </div>
                  </div>

                  {/* Pillar 2 */}
                  <div 
                    onClick={() => setIsPoliceReportVerified(!isPoliceReportVerified)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isPoliceReportVerified
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-lg ${isPoliceReportVerified ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isPoliceReportVerified ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>2. ตรวจสอบหนังสือแจ้งความ / บันทึกประจำวัน (Police Report)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        มีบันทึกประจำวันของ สภ.เมืองชัยภูมิ หรือหนังสือราชการขอความอนุเคราะห์ และมีรายละเอียดเหตุการณ์ชัดเจน
                      </p>
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div 
                    onClick={() => setIsCctvFootageConfirmed(!isCctvFootageConfirmed)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isCctvFootageConfirmed
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-lg ${isCctvFootageConfirmed ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isCctvFootageConfirmed ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>3. ตรวจสอบความถูกต้องของพิกัดและไฟล์ภาพ CCTV (Footage Audit)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        รหัสกล้องวงจรปิด พิกัดจุดติดตั้ง และช่วงวันเวลาที่ระบุ มีไฟล์ภาพบันทึกอยู่ใน Server ศูนย์ควบคุม CCTV จริง
                      </p>
                    </div>
                  </div>

                  {/* Pillar 4 */}
                  <div 
                    onClick={() => setIsPdpaComplianceVerified(!isPdpaComplianceVerified)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isPdpaComplianceVerified
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-lg ${isPdpaComplianceVerified ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isPdpaComplianceVerified ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>4. ตรวจสอบความชอบด้วยกฎหมาย PDPA (Privacy & Compliance)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        การใช้ประโยชน์ชอบด้วยกฎหมายเพื่อการดำเนินคดี/คุ้มครองสิทธิ์ และไม่ละเมิดสิทธิส่วนบุคคลของบุคคลภายนอกเกินสมควร
                      </p>
                    </div>
                  </div>

                  {/* Pillar 5 (Full Width on 2 columns) */}
                  <div 
                    onClick={() => setIsDataRetentionValid(!isDataRetentionValid)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none md:col-span-2 ${
                      isDataRetentionValid
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 p-1 rounded-lg ${isDataRetentionValid ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {isDataRetentionValid ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>5. ตรวจสอบระยะเวลาการจัดเก็บข้อมูลและการรักษาความปลอดภัย (Data Retention & SLA)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ช่วงวันเวลาที่เกิดเหตุอยู่ภายในรอบการจัดเก็บบันทึกข้อมูลของระบบ (Retention Period 15-30 วัน) และผ่านเกณฑ์ SLA
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Risk Level & Delivery Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Risk Level */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800">
                    ⚡ ระดับความเสี่ยง / ความสำคัญของคดี (Risk & Priority Level):
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="low">🟢 ทั่วไป / ความเสี่ยงต่ำ (Low Risk) - ค้นหาทรัพย์สินทั่วไป</option>
                    <option value="medium">🟡 ปานกลาง (Medium Risk) - อุบัติเหตุไม่มีผู้บาดเจ็บ / ข้อพิพาททางแพ่ง</option>
                    <option value="high">🟠 สูง (High Risk) - อุบัติเหตุมีผู้บาดเจ็บ / คดีลักทรัพย์</option>
                    <option value="critical">🔴 วิกฤต / เร่งด่วนสูงสุด (Critical Risk) - คดีอาญาร้ายแรง / ภัยความมั่นคง</option>
                  </select>
                </div>

                {/* Delivery Condition */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-800">
                    🔒 เงื่อนไขและมาตรการส่งมอบไฟล์ภาพ (Delivery & Privacy Condition):
                  </label>
                  <select
                    value={deliveryCondition}
                    onChange={(e) => setDeliveryCondition(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="blurred_third_party">🛡️ เบลอภาพบุคคลภายนอกและทะเบียนรถที่ไม่เกี่ยวข้อง (PDPA Protected)</option>
                    <option value="full_footage">📹 ส่งมอบไฟล์ภาพฉบับสมบูรณ์ (สำหรับผู้เสียหายโดยตรง)</option>
                    <option value="onsite_viewing_only">👁️ อนุญาตเฉพาะเข้าดูภาพ ณ ศูนย์ควบคุม CCTV เท่านั้น (ห้ามคัดลอก)</option>
                    <option value="official_investigation_only">⚖️ ส่งมอบแก่พนักงานสอบสวน สภ.เมืองชัยภูมิ เท่านั้น</option>
                  </select>
                </div>

              </div>

              {/* Admin Decision Selection */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black text-slate-900">
                  🎯 คำวินิจฉัยและข้อสั่งการของ Admin (Admin Decision & Action):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAuditResult('approved')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      auditResult === 'approved'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md ring-2 ring-emerald-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>🟢 อนุมัติคำร้อง</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">ผ่านเกณฑ์ ส่งมอบไฟล์</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditResult('forward_executive')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      auditResult === 'forward_executive'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-md ring-2 ring-blue-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <Send className="w-5 h-5 text-blue-600" />
                    <span>🔵 เสนอผู้บริหาร</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">เสนอ ผอ./ปลัด/นายกฯ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditResult('action_required')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      auditResult === 'action_required'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>🟡 ขอเอกสารเพิ่ม</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">ส่งกลับให้ผู้ยื่นแก้ไข</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditResult('rejected')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      auditResult === 'rejected'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-md ring-2 ring-rose-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>🔴 ไม่อนุมัติ / สั่งตก</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">ไม่เป็นไปตามระเบียบ</span>
                  </button>
                </div>
              </div>

              {/* Admin Directive Notes */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-extrabold text-slate-800">
                  📝 บันทึกความเห็น ข้อสังเกต และข้อสั่งการของ Admin (Admin Directives & Notes):
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="ระบุเหตุผลประกอบการตรวจ หรือคำสั่งการมอบหมายเจ้าหน้าที่..."
                  className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
                />
              </div>

              {/* Digital Signature of Admin */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-800">
                      ลายเซ็นอิเล็กทรอนิกส์และตรารับรองของ Admin (Digital Signature & Seal):
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    แนบลายเซ็นในการรับรอง
                  </label>
                </div>

                {includeSignature && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <SignaturePad
                      onSignatureChange={(dataUrl) => setSignatureData(dataUrl)}
                      onSave={(dataUrl) => setSignatureData(dataUrl)}
                      onClear={() => setSignatureData(null)}
                      initialSignature={signatureData || undefined}
                    />
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <span>ผู้ตรวจสอบ: <strong>{adminName}</strong> ({adminPosition})</span>
                  <span>รหัสกำกับการตรวจสอบ: <strong className="font-mono text-indigo-600">{existingAudit?.officialAuditCode || 'ADM-AUD-2569-AUTO'}</strong></span>
                </div>
              </div>
            </>
          ) : (
            /* Certificate Preview Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <FileBadge className="w-4 h-4 text-blue-700" />
                  ตัวอย่างใบบันทึกผลการตรวจสอบคำร้องของ Admin (Official Audit Certificate Preview)
                </span>
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์ใบรับรอง (Print Certificate)
                </button>
              </div>

              {/* Official Certificate Box */}
              <div className="p-8 bg-white border-2 border-slate-300 rounded-2xl shadow-sm space-y-6 text-slate-900 font-sans text-xs print:border-none print:shadow-none">
                <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                  <div className="w-12 h-12 mx-auto bg-amber-500/20 text-amber-700 rounded-full flex items-center justify-center font-bold border border-amber-400 mb-1">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-black tracking-tight text-slate-950">
                    เทศบาลเมืองชัยภูมิ • ศูนย์ควบคุมระบบกล้องโทรทัศน์วงจรปิด CCTV
                  </h3>
                  <p className="text-xs font-bold text-slate-700">
                    ใบบันทึกผลการตรวจสอบและกลั่นกรองคำร้องโดยผู้ดูแลระบบ (Admin Inspection Certificate)
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    รหัสกำกับเอกสาร: {existingAudit?.officialAuditCode || `ADM-AUD-${new Date().getFullYear() + 543}-${selectedReq.id.slice(-4)}`} | วันที่ตรวจ: {new Date().toLocaleDateString('th-TH')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div><strong>เลขที่คำร้อง:</strong> <span className="font-mono font-bold text-blue-700">{selectedReq.id}</span></div>
                  <div><strong>วันที่ยื่นเรื่อง:</strong> {new Date(selectedReq.createdAt).toLocaleDateString('th-TH')}</div>
                  <div><strong>ผู้ยื่นคำร้อง:</strong> {selectedReq.applicant.prefix}{selectedReq.applicant.fullName}</div>
                  <div><strong>หน่วยงาน/สังกัด:</strong> {selectedReq.applicant.department || 'ประชาชนทั่วไป'}</div>
                  <div className="col-span-2"><strong>หัวข้อคำร้อง:</strong> {selectedReq.title}</div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-1">
                    ผลการตรวจสอบ 5 เสาหลักตามระเบียบและกฎหมาย PDPA:
                  </h4>
                  <table className="w-full text-xs text-left border border-slate-200">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="p-2 border-b border-slate-200">รายการประเมิน</th>
                        <th className="p-2 border-b border-slate-200 text-center w-28">ผลการตรวจสอบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2">1. การยืนยันตัวตนและสิทธิ์ตามกฎหมายของผู้ยื่น</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{isIdentityVerified ? '✓ ผ่านเกณฑ์' : '✕ ไม่ผ่าน'}</td>
                      </tr>
                      <tr>
                        <td className="p-2">2. หนังสือแจ้งความ/บันทึกประจำวัน สภ.เมืองชัยภูมิ</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{isPoliceReportVerified ? '✓ ผ่านเกณฑ์' : '✕ ไม่ผ่าน'}</td>
                      </tr>
                      <tr>
                        <td className="p-2">3. ความพร้อมและถูกต้องของไฟล์ภาพ CCTV ในระบบ</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{isCctvFootageConfirmed ? '✓ ผ่านเกณฑ์' : '✕ ไม่ผ่าน'}</td>
                      </tr>
                      <tr>
                        <td className="p-2">4. ความสอดคล้องตามระเบียบ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{isPdpaComplianceVerified ? '✓ ผ่านเกณฑ์' : '✕ ไม่ผ่าน'}</td>
                      </tr>
                      <tr>
                        <td className="p-2">5. ระยะเวลาการบันทึกภาพไม่เกินกำหนด (Retention Period)</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{isDataRetentionValid ? '✓ ผ่านเกณฑ์' : '✕ ไม่ผ่าน'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div><strong>ผลคำวินิจฉัยของ Admin:</strong> <span className="font-bold text-indigo-800">{auditResult === 'approved' ? 'อนุมัติการให้บริการ' : auditResult === 'forward_executive' ? 'เสนอต่อผู้บริหารลงนาม' : auditResult === 'action_required' ? 'ขอเอกสารเพิ่มเติม' : 'ไม่อนุมัติ'}</span></div>
                  <div><strong>เงื่อนไขการส่งมอบ:</strong> {deliveryCondition === 'blurred_third_party' ? 'เบลอภาพบุคคลภายนอก/ทะเบียนรถที่ไม่เกี่ยวข้อง' : deliveryCondition === 'full_footage' ? 'ส่งมอบไฟล์ภาพฉบับสมบูรณ์' : deliveryCondition === 'onsite_viewing_only' ? 'อนุญาตเฉพาะดูภาพ ณ ศูนย์ควบคุม CCTV' : 'ส่งมอบแก่พนักงานสอบสวน'}</div>
                  <div><strong>ข้อสั่งการ/บันทึกเพิ่มเติม:</strong> <p className="mt-1 italic text-slate-700">"{adminNotes}"</p></div>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="text-center space-y-2 w-64">
                    {signatureData ? (
                      <div className="h-16 flex items-center justify-center">
                        <img src={signatureData} alt="Admin Signature" className="max-h-16 object-contain" />
                      </div>
                    ) : (
                      <div className="h-14 border-b border-dotted border-slate-400"></div>
                    )}
                    <div className="text-xs font-bold">({adminName})</div>
                    <div className="text-[11px] text-slate-600">{adminPosition}</div>
                    <div className="text-[10px] text-slate-400">ผู้รับรองการตรวจสอบระดับ Admin</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            คำร้องที่ {currentReqIndex + 1} จาก {pendingAuditRequests.length > 0 ? pendingAuditRequests.length : 1} รายการรอดำเนินการ
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handleSaveAudit}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-amber-300 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'กำลังบันทึกผล...' : '💾 บันทึกผลการตรวจสอบของ Admin'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
