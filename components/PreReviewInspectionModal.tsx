import React, { useState } from 'react';
import { RequestItem, RequestPreReviewCheck } from '../types/request';
import { savePreReviewCheck } from '../utils/storage';
import { AttachmentGallery } from './AttachmentGallery';
import { 
  ClipboardCheck, 
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
  FileCheck2
} from 'lucide-react';

interface PreReviewInspectionModalProps {
  request: RequestItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedRequest: RequestItem) => void;
  officerName?: string;
}

export const PreReviewInspectionModal: React.FC<PreReviewInspectionModalProps> = ({
  request,
  isOpen,
  onClose,
  onSaved,
  officerName = 'เจ้าหน้าที่งานสารบรรณ'
}) => {
  if (!isOpen) return null;

  const existingCheck = request.preReviewCheck;

  // Checklist state
  const [isIdentityVerified, setIsIdentityVerified] = useState<boolean>(
    existingCheck?.isIdentityVerified ?? true
  );
  const [isReasonVerified, setIsReasonVerified] = useState<boolean>(
    existingCheck?.isReasonVerified ?? true
  );
  const [isLocationTimeVerified, setIsLocationTimeVerified] = useState<boolean>(
    existingCheck?.isLocationTimeVerified ?? true
  );
  const [isCctvFootageAvailable, setIsCctvFootageAvailable] = useState<boolean>(
    existingCheck?.isCctvFootageAvailable ?? true
  );
  const [isPdpaConsentVerified, setIsPdpaConsentVerified] = useState<boolean>(
    existingCheck?.isPdpaConsentVerified ?? true
  );

  const [resultStatus, setResultStatus] = useState<'passed' | 'pending_fix' | 'rejected' | 'not_checked'>(
    existingCheck?.resultStatus ?? 'passed'
  );
  const [inspectionNote, setInspectionNote] = useState<string>(
    existingCheck?.inspectionNote ?? 'ตรวจสอบเอกสารและไฟล์ภาพ CCTV เบื้องต้นแล้ว ถูกต้องสมบูรณ์ตามหลักเกณฑ์ เห็นควรเสนอผู้บริหารพิจารณา'
  );
  const [verifiedBy, setVerifiedBy] = useState<string>(
    existingCheck?.verifiedByOfficer || officerName
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper to check if all items are passed
  const allChecked = isIdentityVerified && isReasonVerified && isLocationTimeVerified && isCctvFootageAvailable && isPdpaConsentVerified;

  const handlePassAll = () => {
    setIsIdentityVerified(true);
    setIsReasonVerified(true);
    setIsLocationTimeVerified(true);
    setIsCctvFootageAvailable(true);
    setIsPdpaConsentVerified(true);
    setResultStatus('passed');
  };

  const handleReset = () => {
    setIsIdentityVerified(false);
    setIsReasonVerified(false);
    setIsLocationTimeVerified(false);
    setIsCctvFootageAvailable(false);
    setIsPdpaConsentVerified(false);
    setResultStatus('pending_fix');
  };

  const handleSave = (forwardToAdmin: boolean) => {
    setIsSubmitting(true);
    const now = new Date().toISOString();

    const checkData: RequestPreReviewCheck = {
      isIdentityVerified,
      isReasonVerified,
      isLocationTimeVerified,
      isCctvFootageAvailable,
      isPdpaConsentVerified,
      verifiedByOfficer: verifiedBy.trim() || officerName,
      verifiedAt: now,
      resultStatus,
      inspectionNote: inspectionNote.trim(),
      forwardedToAdmin: forwardToAdmin || existingCheck?.forwardedToAdmin || false,
      forwardedAt: forwardToAdmin ? now : existingCheck?.forwardedAt
    };

    setTimeout(() => {
      const updated = savePreReviewCheck(request.id, checkData);
      setIsSubmitting(false);

      if (updated) {
        setSuccessToast(
          forwardToAdmin
            ? 'บันทึกการตรวจสอบและส่งเสนอเรื่องต่อผู้บริหาร/Admin เรียบร้อยแล้ว!'
            : 'บันทึกผลการตรวจสอบคำร้องเรียบร้อยแล้ว!'
        );
        setTimeout(() => {
          onSaved(updated);
          onClose();
        }, 1200);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 space-y-0 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30 shadow-inner">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-300 bg-blue-900/60 px-3 py-0.5 rounded-full border border-blue-500/30 tracking-wide uppercase">
                Officer Pre-Review Inspection
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
                การตรวจสอบคำร้องก่อนเสนอผู้บริหาร / Admin
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            ตรวจสอบความถูกต้อง ครบถ้วนของเอกสาร และความพร้อมของไฟล์ภาพกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ ก่อนส่งเรื่องให้ผู้บริหารพิจารณาอนุมัติ
          </p>

          {/* Request Header Summary */}
          <div className="mt-4 p-3.5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-medium">รหัสคำร้อง & หัวข้อ:</span>
              <div className="font-bold text-amber-300 font-mono text-sm flex items-center gap-2">
                <span>{request.id}</span>
                <span className="text-white font-sans font-medium text-xs font-semibold">| {request.title}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">ผู้ยื่นคำร้อง:</span>
              <span className="font-bold text-white">
                {request.applicant.prefix}{request.applicant.fullName} ({request.applicant.department || 'ประชาชนทั่วไป'})
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Toast Alert */}
          {successToast && (
            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <span className="font-bold text-sm">{successToast}</span>
            </div>
          )}

          {/* Attached Files & Documents Review Section */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  เอกสารประกอบและภาพหลักฐานของผู้ยื่นคำร้อง ({request.attachments.length} ไฟล์):
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  คลิกที่รูปภาพเพื่อขยายตรวจสอบรายละเอียด
                </span>
              </div>
              <AttachmentGallery
                attachments={request.attachments}
                variant="compact"
              />
            </div>
          )}

          {/* Preset Buttons Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <h4 className="font-extrabold text-slate-900 text-sm">
                รายการตรวจสอบความถูกต้อง 5 รายการหลัก (Inspection Criteria)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePassAll}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                ผ่านทุกรายการ
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                รีเซ็ต
              </button>
            </div>
          </div>

          {/* Checklist Item Cards */}
          <div className="space-y-3">

            {/* Item 1 */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isIdentityVerified 
                ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    isIdentityVerified ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      1. ตรวจสอบหลักฐานยืนยันตัวตนผู้ยื่นคำร้อง
                      {isIdentityVerified && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                          ✓ ผ่านการตรวจสอบ
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      สำเนาบัตรประจำตัวประชาชน / บัตรข้าราชการ / หนังสือมอบอำนาจ (กรณีแทนผู้อื่น) มีลายมือชื่อรับรองสำเนาถูกต้อง
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isIdentityVerified}
                    onChange={(e) => setIsIdentityVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Item 2 */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isReasonVerified 
                ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    isReasonVerified ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      2. ตรวจสอบเหตุผลความจำเป็นและหนังสือแจ้งความ/บันทึกประจำวัน
                      {isReasonVerified && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                          ✓ ผ่านการตรวจสอบ
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      มีใบบันทึกประจำวันจากสถานีตำรวจ (กรณีอุบัติเหตุ/คดีอาญา) หรือมีหนังสือขอความอนุเคราะห์จากหน่วยงานราชการชัดเจน
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isReasonVerified}
                    onChange={(e) => setIsReasonVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Item 3 */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isLocationTimeVerified 
                ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    isLocationTimeVerified ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      3. ตรวจสอบการระบุพิกัด รหัสกล้อง และช่วงเวลาที่ขอดูภาพ
                      {isLocationTimeVerified && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                          ✓ ผ่านการตรวจสอบ
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ระบุตำแหน่งกล้องวงจรปิด รหัสกล้อง วันที่เกิดเหตุ และช่วงเวลา (เช่น 14:00 - 15:30 น.) ชัดเจน ไม่กว้างเกินความจำเป็น
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isLocationTimeVerified}
                    onChange={(e) => setIsLocationTimeVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Item 4 */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isCctvFootageAvailable 
                ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    isCctvFootageAvailable ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      4. ตรวจสอบสถานะและไฟล์วิดีโอ CCTV ต้นทางในระบบ
                      {isCctvFootageAvailable && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                          ✓ ผ่านการตรวจสอบ
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ตรวจสอบผ่านเครื่องบันทึก CCTV มีไฟล์วิดีโอบันทึกสมบูรณ์ในระบบ ภาพชัดเจน สามารถถอดคัดสำเนาได้
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isCctvFootageAvailable}
                    onChange={(e) => setIsCctvFootageAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Item 5 */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isPdpaConsentVerified 
                ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' 
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl font-bold shrink-0 mt-0.5 ${
                    isPdpaConsentVerified ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      5. ตรวจสอบข้อปฏิบัติตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                      {isPdpaConsentVerified && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                          ✓ ผ่านการตรวจสอบ
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ผู้ยื่นลงนามรับรองข้อตกลงไม่นำข้อมูลภาพไปเผยแพร่ต่อสาธารณะในทางที่ก่อให้เกิดความเสียหายแก่บุคคลอื่น
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isPdpaConsentVerified}
                    onChange={(e) => setIsPdpaConsentVerified(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

          </div>

          {/* Overall Conclusion & Result Status */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              สรุปผลการตรวจเสนอก่อนเสนอผู้บริหาร / Admin
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setResultStatus('passed')}
                className={`p-3.5 rounded-xl border text-left font-bold transition-all flex items-center gap-3 ${
                  resultStatus === 'passed'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/50'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${resultStatus === 'passed' ? 'text-white' : 'text-emerald-600'}`} />
                <div>
                  <span className="block text-xs font-black">ผ่านการตรวจสอบครบถ้วน</span>
                  <span className={`text-[10px] font-normal block ${resultStatus === 'passed' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    เอกสารครบ พร้อมเสนอผู้บริหารอนุมัติ
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResultStatus('pending_fix')}
                className={`p-3.5 rounded-xl border text-left font-bold transition-all flex items-center gap-3 ${
                  resultStatus === 'pending_fix'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300/50'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className={`w-5 h-5 shrink-0 ${resultStatus === 'pending_fix' ? 'text-white' : 'text-amber-500'}`} />
                <div>
                  <span className="block text-xs font-black">รอแก้ไข/ขอเอกสารเพิ่ม</span>
                  <span className={`text-[10px] font-normal block ${resultStatus === 'pending_fix' ? 'text-amber-100' : 'text-slate-500'}`}>
                    ขาดหลักฐานบางส่วน แจ้งผู้ยื่นเพิ่มเติม
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResultStatus('rejected')}
                className={`p-3.5 rounded-xl border text-left font-bold transition-all flex items-center gap-3 ${
                  resultStatus === 'rejected'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300/50'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <XCircle className={`w-5 h-5 shrink-0 ${resultStatus === 'rejected' ? 'text-white' : 'text-rose-600'}`} />
                <div>
                  <span className="block text-xs font-black">ไม่ผ่านเกณฑ์การพิจารณา</span>
                  <span className={`text-[10px] font-normal block ${resultStatus === 'rejected' ? 'text-rose-100' : 'text-slate-500'}`}>
                    ไม่อยู่ในเงื่อนไขการอนุญาตขอดูภาพ
                  </span>
                </div>
              </button>
            </div>

            {/* Note Input */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                บันทึกความเห็น / ข้อเสนอแนะของเจ้าหน้าที่ผู้ตรวจสอบ (Inspector Officer Summary Note):
              </label>
              <textarea
                rows={3}
                value={inspectionNote}
                onChange={(e) => setInspectionNote(e.target.value)}
                placeholder="ระบุข้อสังเกตเพิ่มเติม เช่น 'ตรวจสอบใบบันทึกประจำวันจาก สภ.เมืองชัยภูมิ แล้วถูกต้อง ภาพวงจรปิดบริเวณสี่แยกไฟแดงสว่างชัดเจน เห็นควรเสนอปลัดเทศบาลเมืองชัยภูมิเพื่อโปรดพิจารณาอนุมัติ'..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Officer Name Input */}
            <div className="flex items-center gap-3 pt-1">
              <label className="text-xs font-bold text-slate-700 shrink-0">
                ชื่อ-ตำแหน่งเจ้าหน้าที่ผู้ตรวจสอบ:
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            ยกเลิก / ปิดหน้าต่าง
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              💾 บันทึกผลการตรวจเท่านั้น
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-blue-200" />
              <span>🚀 บันทึก & เสนอเรื่องต่อผู้บริหาร/Admin ทันที</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
