import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { dispatchRequestToNextLevel } from '../utils/storage';
import { 
  Send, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  ShieldCheck, 
  FileText, 
  Mail, 
  MessageSquare, 
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';

interface DispatchRequestModalProps {
  request: RequestItem;
  adminName: string;
  isOpen: boolean;
  onClose: () => void;
  onDispatchSuccess: () => void;
}

export const DispatchRequestModal: React.FC<DispatchRequestModalProps> = ({
  request,
  adminName,
  isOpen,
  onClose,
  onDispatchSuccess
}) => {
  const workflow = request.approvalWorkflow;
  const steps = workflow?.steps || [];
  const currentIdx = workflow?.currentStepIndex ?? 0;

  // Default target step is next step or current step
  const defaultTargetIdx = currentIdx + 1 < steps.length ? currentIdx + 1 : currentIdx;
  const [selectedTargetIdx, setSelectedTargetIdx] = useState<number>(defaultTargetIdx);
  const [dispatchNote, setDispatchNote] = useState<string>('');
  const [sendEmailAlert, setSendEmailAlert] = useState<boolean>(true);
  const [sendLineAlert, setSendLineAlert] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetStep = steps[selectedTargetIdx] || steps[0];

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStep) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const updated = dispatchRequestToNextLevel(
        request.id,
        adminName || 'Admin ผู้จัดการคำร้อง',
        dispatchNote.trim(),
        selectedTargetIdx
      );

      setIsSubmitting(false);

      if (updated) {
        setSuccessMsg(`ส่งคำร้องไปยัง [ขั้นตอนที่ ${targetStep.stepNumber}: ${targetStep.approverName || targetStep.roleTitle}] เรียบร้อยแล้ว`);
        setTimeout(() => {
          onDispatchSuccess();
          onClose();
        }, 1200);
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-2xl border border-blue-400/30 shrink-0">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  ส่งคำร้องไปตามระดับขั้น (Dispatch Request)
                </h3>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  Admin Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                เลขที่คำร้อง: <span className="font-mono font-bold text-amber-300">{request.trackingCode}</span> ({request.subject})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleDispatch} className="p-6 space-y-5">
          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : (
            <>
              {/* Current Status Banner */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">ผู้ส่งเรื่องดำเนินงานปัจจุบัน:</span>
                  <span className="font-bold text-slate-800">{adminName || 'ผู้ดูแลระบบ (Admin)'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-semibold block">ขั้นตอนปัจจุบัน:</span>
                  <span className="font-bold text-blue-700">
                    ขั้นที่ {currentIdx + 1} จาก {steps.length}
                  </span>
                </div>
              </div>

              {/* Target Level Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  เลือกระดับขั้นผู้อนุมัติปลายทางที่จะส่งคำร้องไป (Target Approval Level) *
                </label>

                {steps.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    ยังไม่ได้กำหนดผังการอนุมัติ กรุณาตั้งค่าผังการอนุมัติก่อนส่งเรื่อง
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {steps.map((st, idx) => {
                      const isSelected = selectedTargetIdx === idx;
                      const isCurrent = currentIdx === idx;
                      return (
                        <div
                          key={st.id || idx}
                          onClick={() => setSelectedTargetIdx(idx)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {st.stepNumber}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <span>{st.roleTitle}</span>
                                {isCurrent && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                                    ขั้นตอนปัจจุบัน
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                ผู้อนุมัติ: <span className="font-bold text-slate-700">{st.approverName || 'ไม่ระบุชื่อ'}</span> ({st.approverPosition || '-'})
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              st.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : st.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {st.status === 'approved' ? 'อนุมัติแล้ว' : st.status === 'in_progress' ? 'กำลังพิจารณา' : 'รอดำเนินการ'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Target Details Box */}
              {targetStep && (
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs space-y-1.5">
                  <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    ส่งเสนอเรียน: {targetStep.approverName || 'ผู้อนุมัติประจำขั้น'} ({targetStep.approverPosition})
                  </div>
                  <div className="text-slate-600 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                    {targetStep.approverEmail && (
                      <span className="flex items-center gap-1 text-slate-700">
                        <Mail className="w-3 h-3 text-blue-600" /> {targetStep.approverEmail}
                      </span>
                    )}
                    {targetStep.approverLineId && (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <MessageSquare className="w-3 h-3 text-emerald-600" /> {targetStep.approverLineId}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Dispatch Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ข้อความเสนอเรื่อง / บันทึกส่งคำร้องถึงผู้อนุมัติ
                </label>
                <textarea
                  rows={3}
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  placeholder="เช่น เสนอเรื่องเพื่อโปรดพิจารณาอนุมัติคำร้องขอเปิดภาพกล้อง CCTV และลงนามหนังสือแจ้งผล"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Notification Toggles */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">แจ้งเตือนผู้อนุมัติปลายทางอัตโนมัติ:</span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendEmailAlert}
                      onChange={(e) => setSendEmailAlert(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>ส่งอีเมลแจ้งเตือน (Email Alert)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendLineAlert}
                      onChange={(e) => setSendLineAlert(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                    />
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ส่งการแจ้งเตือนทาง LINE Notify</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || steps.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'กำลังส่งคำร้อง...' : `ยืนยันส่งคำร้องไปยังขั้นที่ ${targetStep?.stepNumber || 1}`}</span>
                </button>
              </div>
            </>
          )}
        </form>

      </div>
    </div>
  );
};
