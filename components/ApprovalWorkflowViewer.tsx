import { useState } from 'react';
import { RequestItem, ApprovalWorkflow } from '../types/request';
import { advanceApprovalStep } from '../utils/storage';
import { DispatchRequestModal } from './DispatchRequestModal';
import { StepProgressIndicator } from './StepProgressIndicator';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  Layers, 
  ChevronRight, 
  Edit3, 
  FileCheck, 
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  ClipboardCheck,
  Mail,
  MessageSquare,
  CheckSquare,
  Send
} from 'lucide-react';

interface ApprovalWorkflowViewerProps {
  request?: RequestItem;
  workflow?: ApprovalWorkflow;
  currentOfficerRole?: string;
  onUpdateStep?: () => void;
  isOfficerMode?: boolean;
  officerName?: string;
  onWorkflowUpdated?: () => void;
  onOpenEditorModal?: () => void;
}

export const ApprovalWorkflowViewer: React.FC<ApprovalWorkflowViewerProps> = ({
  request,
  workflow: propWorkflow,
  currentOfficerRole,
  onUpdateStep,
  isOfficerMode = false,
  officerName = 'Admin ผู้จัดการคำร้อง',
  onWorkflowUpdated,
  onOpenEditorModal,
}) => {
  const workflow = propWorkflow || request?.approvalWorkflow;
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [approverInputName, setApproverInputName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showVerticalTimeline, setShowVerticalTimeline] = useState(false);

  if (!workflow || !workflow.steps || workflow.steps.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-3">
        <div className="w-12 h-12 bg-slate-200/80 text-slate-500 rounded-full flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">ยังไม่ได้กำหนดเส้นทางการอนุมัติ (Approval Chain)</h4>
          <p className="text-xs text-slate-500">เจ้าหน้าที่สามารถตั้งค่าขั้นตอนการอนุมัติได้ในพอร์ตัลเจ้าหน้าที่</p>
        </div>
        {isOfficerMode && onOpenEditorModal && (
          <button
            onClick={onOpenEditorModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            กำหนดเส้นทางการอนุมัติ
          </button>
        )}
      </div>
    );
  }

  const steps = workflow.steps;
  const totalSteps = steps.length;
  const approvedCount = steps.filter((s) => s.status === 'approved' || s.status === 'skipped').length;
  const currentStep = steps[workflow.currentStepIndex] || steps[0];
  const progressPercent = Math.round((approvedCount / totalSteps) * 100);

  const handleAction = (stepIdx: number, action: 'approved' | 'rejected' | 'skipped') => {
    setIsSubmitting(true);
    const stepObj = steps[stepIdx];
    const nameToUse = (approverInputName || '').trim() || stepObj.approverName || 'เจ้าหน้าที่ผู้ปฏิบัติงาน';

    setTimeout(() => {
      advanceApprovalStep(
        request.id,
        stepIdx,
        action,
        nameToUse,
        (actionComment || '').trim()
      );

      setIsSubmitting(false);
      setSelectedStepIdx(null);
      setActionComment('');
      setApproverInputName('');
      if (onWorkflowUpdated) onWorkflowUpdated();
    }, 400);
  };

  const filteredSteps = steps.filter((s) => {
    if (activeTabFilter === 'approved') return s.status === 'approved' || s.status === 'skipped';
    if (activeTabFilter === 'pending') return s.status === 'pending' || s.status === 'in_progress';
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Workflow Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2">
              เส้นทางการอนุมัติหลายลำดับขั้น (Multi-Stage Approval Workflow)
            </h3>
            <span className="bg-blue-100 text-blue-800 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-blue-200">
              {totalSteps} ขั้นตอน
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            {workflow.templateName || 'กระบวนการพิจารณาตามลำดับผู้มีอำนาจลงนามและอนุมัติ'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isOfficerMode && (
            <button
              type="button"
              onClick={() => setShowDispatchModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-blue-200" />
              <span>ส่งคำร้องไปตามระดับขั้น</span>
            </button>
          )}

          {isOfficerMode && onOpenEditorModal && (
            <button
              onClick={onOpenEditorModal}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              จัดการผังอนุมัติ
            </button>
          )}

          {/* Tab Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTabFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({totalSteps})
            </button>
            <button
              onClick={() => setActiveTabFilter('approved')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTabFilter === 'approved' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              อนุมัติแล้ว ({approvedCount})
            </button>
            <button
              onClick={() => setActiveTabFilter('pending')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTabFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              รออนุมัติ ({totalSteps - approvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Progress Bar & Status History Timeline */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ความคืบหน้าการอนุมัติ: {approvedCount} จาก {totalSteps} ขั้นตอน
          </span>
          <div className="flex items-center gap-2">
            <span className="text-blue-700 font-extrabold">{progressPercent}%</span>
            {request && (
              <button
                type="button"
                onClick={() => setShowVerticalTimeline(!showVerticalTimeline)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                  showVerticalTimeline
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title="แสดง/ซ่อน ประวัติการเปลี่ยนสถานะแนวตั้ง (Vertical Timeline)"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{showVerticalTimeline ? 'ซ่อนเส้นเวลา' : 'ดูประวัติเส้นเวลา (Timeline)'}</span>
              </button>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 transition-all duration-500 rounded-full"
          />
        </div>

        {/* Collapsible Vertical Timeline for Status Changes */}
        {showVerticalTimeline && request && (
          <div className="pt-2 border-t border-slate-200/70 mt-2">
            <StepProgressIndicator
              status={request.status}
              statusHistory={request.statusHistory}
              createdAt={request.createdAt}
              updatedAt={request.updatedAt}
              initialViewMode="vertical_timeline"
              allowToggleTimeline={true}
              showDetails={true}
            />
          </div>
        )}
      </div>

      {/* Pre-Review Officer Inspection Status Banner */}
      <div className="p-3.5 rounded-xl border text-xs space-y-2 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/50 border-indigo-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-2xs">
              <ClipboardCheck className="w-4 h-4" />
            </span>
            <span className="font-extrabold text-slate-900 text-xs">
              ผลการตรวจสอบความถูกต้องก่อนเสนอผู้บริหาร / Admin (Pre-Executive Review):
            </span>
          </div>

          {request.preReviewCheck ? (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1 ${
              request.preReviewCheck.resultStatus === 'passed'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : request.preReviewCheck.resultStatus === 'pending_fix'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              {request.preReviewCheck.resultStatus === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {request.preReviewCheck.resultStatus === 'pending_fix' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
              {request.preReviewCheck.resultStatus === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              {request.preReviewCheck.resultStatus === 'passed' ? '✓ ผ่านการตรวจสอบครบถ้วน' : request.preReviewCheck.resultStatus === 'pending_fix' ? '⚠️ เอกสารไม่ครบ/รอแก้ไข' : '✕ ไม่ผ่านเกณฑ์'}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              ⏳ รอเจ้าหน้าที่ทำการตรวจสอบ
            </span>
          )}
        </div>

        {request.preReviewCheck ? (
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-slate-700 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>ผู้ตรวจสอบ: <strong className="text-slate-800 font-bold">{request.preReviewCheck.verifiedByOfficer}</strong></span>
              <span>วันที่ตรวจ: <strong className="text-slate-800 font-bold">{new Date(request.preReviewCheck.verifiedAt).toLocaleString('th-TH')} น.</strong></span>
            </div>
            {request.preReviewCheck.inspectionNote && (
              <p className="text-slate-800 font-medium italic border-t border-slate-100 pt-1">
                "{request.preReviewCheck.inspectionNote}"
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic pl-7">
            เจ้าหน้าที่ต้องทำการตรวจสอบหลักฐาน บัตรประชาชน และไฟล์ CCTV ให้ครบถ้วนก่อนส่งเรื่องเสนอผู้บริหาร
          </p>
        )}
      </div>

      {/* Horizontal Scrollable Stepper Chain for Big Workflows (> 8 steps) */}
      <div className="pt-1 pb-2">
        <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
          <div className="flex items-center min-w-max gap-2 px-1">
            {steps.map((st, idx) => {
              const isCurrent = idx === workflow.currentStepIndex && st.status !== 'approved' && st.status !== 'rejected';
              const isApproved = st.status === 'approved' || st.status === 'skipped';
              const isRejected = st.status === 'rejected';

              return (
                <div key={st.id || idx} className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedStepIdx(idx)}
                    className={`flex items-center gap-2 p-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : isRejected
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : isCurrent
                          ? 'bg-white text-blue-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st.stepNumber}
                    </span>
                    <span className="max-w-[140px] truncate">{st.roleTitle}</span>
                  </button>

                  {idx < steps.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Cards List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSteps.map((st) => {
          const actualIdx = steps.findIndex((s) => s.id === st.id);
          const isCurrent = actualIdx === workflow.currentStepIndex && st.status !== 'approved' && st.status !== 'rejected';
          const isApproved = st.status === 'approved' || st.status === 'skipped';
          const isRejected = st.status === 'rejected';
          const isSelectedAction = selectedStepIdx === actualIdx;

          return (
            <div
              key={st.id || st.stepNumber}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isApproved
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50/40 border-rose-200'
                  : isCurrent
                  ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-100 shadow-sm'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="space-y-2">
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs shadow-xs ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st.stepNumber}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      ลำดับที่ {st.stepNumber} จาก {totalSteps}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isRejected
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : isCurrent
                        ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> อนุมัติแล้ว
                      </>
                    ) : isRejected ? (
                      <>
                        <XCircle className="w-3 h-3 text-rose-600" /> ไม่อนุมัติ
                      </>
                    ) : isCurrent ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" /> รอดำเนินการ
                      </>
                    ) : (
                      'รอตามลำดับ'
                    )}
                  </span>
                </div>

                {/* Role Title & Approver Info */}
                <div className="space-y-1.5 pt-1">
                  <h5 className="font-extrabold text-slate-900 text-xs leading-snug">
                    {st.roleTitle}
                  </h5>

                  <div className="text-[11px] text-slate-700 bg-white/90 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    {/* Approver Name & Position */}
                    <div className="flex items-start gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900 leading-tight">
                          {st.approverName || 'ยังไม่ระบุชื่อผู้อนุมัติ'}
                        </div>
                        {st.approverPosition && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            ตำแหน่ง: {st.approverPosition}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approval Action Choice for Approver */}
                    {st.approvalAction && (
                      <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-200/60 font-semibold">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>การอนุมัติ: {st.approvalAction}</span>
                      </div>
                    )}

                    {/* Contact Channels for Approval Requests (Email & LINE ID) */}
                    {(st.approverEmail || st.approverLineId) && (
                      <div className="pt-1 border-t border-slate-100 space-y-1 text-[10px]">
                        {st.approverEmail && (
                          <div className="flex items-center justify-between gap-1 text-slate-600">
                            <span className="flex items-center gap-1 font-mono truncate">
                              <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                              {st.approverEmail}
                            </span>
                            <a
                              href={`mailto:${st.approverEmail}?subject=ขออนุมัติคำร้อง ${request.id}&body=เรียน ${st.approverName || 'ท่านผู้อนุมัติ'}\n\nขอส่งคำร้องเลขที่ ${request.id} หัวข้อ: ${request.title} เพื่อพิจารณาอนุมัติคำร้องในขั้นตอนที่ ${st.stepNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 shrink-0"
                            >
                              ส่ง Email
                            </a>
                          </div>
                        )}

                        {st.approverLineId && (
                          <div className="flex items-center justify-between gap-1 text-slate-600">
                            <span className="flex items-center gap-1 font-mono truncate">
                              <MessageSquare className="w-3 h-3 text-emerald-500 shrink-0" />
                              LINE: {st.approverLineId}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                alert(`ส่งการแจ้งเตือนขออนุมัติคำร้อง ${request.id} ไปยัง LINE ID: ${st.approverLineId} เรียบร้อยแล้ว`);
                              }}
                              className="text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 cursor-pointer"
                            >
                              ส่ง LINE
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Date & Comment */}
                {st.actionDate && (
                  <div className="text-[10px] text-slate-500 bg-white/80 p-2 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-1 font-medium text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" />
                      วันเวลาดำเนินการ: {new Date(st.actionDate).toLocaleString('th-TH')}
                    </div>
                    {st.comment && (
                      <p className="text-slate-700 italic border-l-2 border-blue-400 pl-2 mt-1">
                        "{st.comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons for Officer */}
              {isOfficerMode && !isApproved && (
                <div className="pt-2 border-t border-slate-200/80">
                  {isSelectedAction ? (
                    <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm space-y-2">
                      <div className="text-[11px] font-bold text-blue-900">
                        ดำเนินการพิจารณาขั้นตอนที่ {st.stepNumber}
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">
                          ชื่อผู้ลงนาม/ผู้อนุมัติ
                        </label>
                        <input
                          type="text"
                          value={approverInputName}
                          onChange={(e) => setApproverInputName(e.target.value)}
                          placeholder={st.approverName || 'ใส่ชื่อผู้อนุมัติ'}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">
                          ข้อเสนอแนะ/คำสั่งการ (ถ้ามี)
                        </label>
                        <textarea
                          rows={2}
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                          placeholder="กรอกข้อความความเห็นการอนุมัติ..."
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAction(actualIdx, 'approved')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAction(actualIdx, 'rejected')}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          ปฏิเสธ
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStepIdx(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] px-2 py-1.5 rounded-lg font-semibold"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStepIdx(actualIdx);
                        setApproverInputName(st.approverName || '');
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                        isCurrent
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      {isCurrent ? 'ลงนาม/อนุมัติขั้นตอนนี้' : 'บันทึกการอนุมัติขั้นนี้'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dispatch Request Modal */}
      <DispatchRequestModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        request={request}
        adminName={officerName}
        onDispatchSuccess={() => {
          if (onWorkflowUpdated) onWorkflowUpdated();
        }}
      />
    </div>
  );
};
