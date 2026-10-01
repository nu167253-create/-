import React, { useState } from 'react';
import { RequestItem, RequestStatus } from '../types/request';
import { getStatusLabelTh } from '../utils/storage';
import { 
  sendStatusSmsNotification, 
  validateThaiMobileNumber, 
  formatThaiPhoneNumber,
  detectCarrier,
  calculateSmsCredits,
  getSmsGatewayStatus,
  generateStatusSmsText
} from '../utils/smsService';
import { 
  Smartphone, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Phone, 
  MessageSquare, 
  FileText, 
  Sparkles,
  Info,
  Layers,
  Radio,
  SlidersHorizontal
} from 'lucide-react';

interface OfficerTestSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTemplateEditor?: () => void;
  initialRequest?: RequestItem | null;
  requests?: RequestItem[];
}

export const OfficerTestSmsModal: React.FC<OfficerTestSmsModalProps> = ({
  isOpen,
  onClose,
  onOpenTemplateEditor,
  initialRequest = null,
  requests = []
}) => {
  if (!isOpen) return null;

  // Selected request reference
  const [selectedReqId, setSelectedReqId] = useState<string>(
    initialRequest ? initialRequest.id : (requests.length > 0 ? requests[0].id : '')
  );

  const activeRequest = requests.find((r) => r.id === selectedReqId) || initialRequest || null;

  // Form states
  const [phoneNumber, setPhoneNumber] = useState<string>(
    activeRequest?.applicant?.phone ? formatThaiPhoneNumber(activeRequest.applicant.phone) : '081-234-5678'
  );
  const [recipientName, setRecipientName] = useState<string>(
    activeRequest?.applicant?.fullName || 'ผู้ยื่นคำร้อง'
  );
  const [targetStatus, setTargetStatus] = useState<RequestStatus>(
    activeRequest ? activeRequest.status : 'under_review'
  );
  const [officerNote, setOfficerNote] = useState<string>('เจ้าหน้าที่ได้รับเอกสารและกำลังดำเนินการตรวจสอบภาพย้อนหลัง');
  
  // Custom message override mode
  const [useCustomText, setUseCustomText] = useState(false);
  const [customMessage, setCustomMessage] = useState<string>('');

  // Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<{
    phone: string;
    message: string;
    deliveryRef: string;
    carrier: string;
    credits: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gateway status
  const gateway = getSmsGatewayStatus();

  // Handle request change
  const handleRequestChange = (reqId: string) => {
    setSelectedReqId(reqId);
    const found = requests.find((r) => r.id === reqId);
    if (found) {
      if (found.applicant?.phone) {
        setPhoneNumber(formatThaiPhoneNumber(found.applicant.phone));
      }
      if (found.applicant?.fullName) {
        setRecipientName(found.applicant.fullName);
      }
      setTargetStatus(found.status);
    }
  };

  // Compose the simulated SMS body using customizable templates
  const currentTitle = activeRequest?.title 
    ? (activeRequest.title.length > 28 ? `${activeRequest.title.slice(0, 26)}..` : activeRequest.title)
    : 'คำร้องขอดูกล้อง CCTV';
  const reqNumber = activeRequest ? activeRequest.id : 'REQ-CCTV-TEST';

  const previewReqObj: RequestItem = activeRequest ? {
    ...activeRequest,
    status: targetStatus,
    applicant: {
      ...activeRequest.applicant,
      phone: phoneNumber,
      fullName: recipientName
    }
  } : {
    id: reqNumber,
    category: 'cctv',
    title: currentTitle,
    description: '',
    reason: '',
    status: targetStatus,
    priority: 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applicant: {
      prefix: '',
      fullName: recipientName,
      citizenIdOrCode: '1369900000000',
      phone: phoneNumber,
      email: 'test@chaiyaphum.go.th',
      department: 'ประชาชนทั่วไป',
      positionOrMajor: 'ประชาชน'
    },
    details: {},
    attachments: [],
    statusHistory: []
  };

  const generatedMessage = generateStatusSmsText(previewReqObj, targetStatus, officerNote);
  const effectiveMessage = useCustomText ? customMessage : generatedMessage;

  const creditInfo = calculateSmsCredits(effectiveMessage);
  const carrier = detectCarrier(phoneNumber);
  const isValidPhone = validateThaiMobileNumber(phoneNumber);

  // Send Action
  const handleSendTestSms = async () => {
    setErrorMsg(null);
    setResultSuccess(null);

    if (!phoneNumber.trim()) {
      setErrorMsg('กรุณาระบุหมายเลขโทรศัพท์มือถือผู้รับ');
      return;
    }

    if (!isValidPhone) {
      setErrorMsg('กรุณาระบุเบอร์โทรศัพท์มือถือไทย 10 หลักที่ถูกต้อง (เช่น 081-234-5678, 08x, 09x, 06x)');
      return;
    }

    if (!effectiveMessage.trim()) {
      setErrorMsg('ข้อความ SMS ต้องไม่ว่างเปล่า');
      return;
    }

    setIsSending(true);

    try {
      // Build a synthetic or enhanced RequestItem to pass to the SMS service
      const syntheticReq: RequestItem = activeRequest ? {
        ...activeRequest,
        title: activeRequest.title || 'คำร้องขอดูกล้อง CCTV',
        applicant: {
          ...activeRequest.applicant,
          fullName: recipientName,
          phone: phoneNumber
        }
      } : {
        id: reqNumber,
        category: 'cctv',
        title: 'ทดสอบส่งข้อความ SMS แจ้งเตือนสถานะ',
        description: 'การทดสอบระบบแจ้งเตือน SMS โดยผู้ดูแลระบบ',
        reason: 'ทดสอบระบบการแจ้งเตือนความคืบหน้าสถานะคำร้องผ่านทาง SMS',
        status: targetStatus,
        priority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        applicant: {
          prefix: '',
          fullName: recipientName,
          citizenIdOrCode: '1369900000000',
          phone: phoneNumber,
          email: 'test@chaiyaphum.go.th',
          department: 'ประชาชนทั่วไป',
          positionOrMajor: 'ประชาชน'
        },
        details: {},
        attachments: [],
        statusHistory: []
      };

      // If officer used custom text, temporarily adjust notes or dispatch directly
      const noteToPass = useCustomText ? customMessage : officerNote;
      const log = sendStatusSmsNotification(syntheticReq, targetStatus, noteToPass, true);

      if (log) {
        setResultSuccess({
          phone: formatThaiPhoneNumber(phoneNumber),
          message: log.message,
          deliveryRef: log.deliveryRef,
          carrier: log.carrier || carrier,
          credits: log.creditUnits
        });
      } else {
        setErrorMsg('ไม่สามารถจัดส่ง SMS ได้ กรุณาตรวจสอบการตั้งค่า Gateway');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ SMS Gateway');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      id="test-sms-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        id="test-sms-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-white shadow-inner">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base md:text-lg">ทดสอบส่ง SMS แจ้งเตือนสถานะคำร้อง (Test SMS)</h3>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Admin Tool
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                ส่งข้อความ SMS แจ้งเตือนการเปลี่ยนสถานะคำร้องไปยังเบอร์มือถือประชาชนโดยตรง
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenTemplateEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTemplateEditor();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all cursor-pointer shadow-xs"
                title="เปิดหน้าต่างแก้ไขเทมเพลตข้อความ SMS (SMS Template Editor)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
                <span>⚙️ ปรับแต่งเทมเพลต (Edit Templates)</span>
              </button>
            )}
            <button
              id="test-sms-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Header Status */}
        <div className="bg-emerald-950 text-emerald-200 px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Gateway: {gateway.provider}</span>
            <span className="text-emerald-400/80 hidden sm:inline">• พร้อมใช้งาน (อัตราสำเร็จ {gateway.successRatePercent}%)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>โควต้าคงเหลือ: <strong className="text-white">{gateway.remainingCredits.toLocaleString()}</strong> ข้อความ</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          {/* Success Banner */}
          {resultSuccess && (
            <div 
              id="test-sms-success-banner"
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-emerald-900">ส่งข้อความ SMS ทดสอบสำเร็จแล้ว!</h4>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                      {resultSuccess.deliveryRef}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    ระบบได้นำส่งข้อความ SMS แจ้งเตือนไปยังหมายเลข <strong>{resultSuccess.phone}</strong> (เครือข่าย {resultSuccess.carrier}) เรียบร้อยแล้ว (ใช้ไป {resultSuccess.credits} เครดิต)
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs font-mono text-slate-700 mt-2">
                    "{resultSuccess.message}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>ข้อผิดพลาด:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* Step 1: Select Request Context (Optional) */}
          {requests.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  เลือกคำร้องอ้างอิงเพื่อดึงข้อมูล (Request Reference):
                </span>
                {activeRequest && (
                  <span className="text-[11px] text-slate-500 font-mono">ID: {activeRequest.id}</span>
                )}
              </label>
              <select
                id="test-sms-request-select"
                value={selectedReqId}
                onChange={(e) => handleRequestChange(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              >
                <option value="">-- ไม่ระบุ (ใช้คำร้องทดสอบจำลอง) --</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.id}] {r.title || 'คำร้องขอดูกล้อง CCTV'} - ผู้ยื่น: {r.applicant?.fullName || 'ไม่ระบุ'} ({r.applicant?.phone || 'ไม่มีเบอร์'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                เบอร์โทรศัพท์มือถือปลายทาง (10 หลัก): *
              </label>
              <div className="relative">
                <input
                  id="test-sms-phone-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className={`w-full text-xs font-mono p-2.5 pr-20 bg-white border rounded-xl focus:ring-2 outline-hidden transition-colors ${
                    phoneNumber && !isValidPhone 
                      ? 'border-amber-400 focus:ring-amber-500' 
                      : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                />
                {phoneNumber && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {carrier}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{isValidPhone ? '✅ เบอร์มือถือไทยถูกต้อง' : '⚠️ รองรับเบอร์ 06x, 08x, 09x'}</span>
                <span>เครือข่าย: {carrier}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                ชื่อผู้รับ / ประชาชนผู้ยื่นคำร้อง:
              </label>
              <input
                id="test-sms-name-input"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block">
                จะนำมาแสดงในบันทึก Audit Log ของศูนย์ส่งข้อความ
              </span>
            </div>
          </div>

          {/* Step 3: Status & Officer Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                สถานะคำร้องที่ต้องการจำลองแจ้งเตือน:
              </label>
              <select
                id="test-sms-status-select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as RequestStatus)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              >
                <option value="under_review">🟡 อยู่ระหว่างการพิจารณา (Under Review)</option>
                <option value="action_required">🟠 ขอเอกสารเพิ่มเติม (Action Required)</option>
                <option value="approved">🟢 อนุมัติคำร้อง (Approved)</option>
                <option value="completed">🔵 ดำเนินการเสร็จสิ้น (Completed)</option>
                <option value="rejected">🔴 ปฏิเสธคำร้อง (Rejected)</option>
                <option value="submitted">⚪ ได้รับคำร้องแล้ว (Submitted)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                หมายเหตุเจ้าหน้าที่เพิ่มเติม (Officer Notes):
              </label>
              <input
                id="test-sms-note-input"
                type="text"
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                placeholder="เช่น กำลังคัดลอกไฟล์ภาพลงแฟลชไดรฟ์"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Step 4: SMS Message Live Preview on Mobile Device */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ตัวอย่างหน้าจอ SMS บนมือถือประชาชน (Live Mobile Preview):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomText(!useCustomText);
                    if (!useCustomText) setCustomMessage(generatedMessage);
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  {useCustomText ? 'กลับไปใช้ข้อความอัตโนมัติ' : '✏️ กำหนดข้อความเอง (Custom Message)'}
                </button>
              </div>
            </div>

            {useCustomText ? (
              <div className="space-y-1.5">
                <textarea
                  id="test-sms-custom-textarea"
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full text-xs p-3 font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  placeholder="พิมพ์ข้อความ SMS ที่ต้องการทดสอบส่ง..."
                />
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-inner text-white">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800 mb-3 font-mono">
                  <span>ผู้ส่ง: <strong className="text-emerald-400">CHAIYAPHUM</strong></span>
                  <span>{new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                </div>
                
                {/* Speech Bubble */}
                <div className="bg-emerald-600/90 text-white rounded-2xl rounded-tl-xs p-3.5 text-xs md:text-[13px] leading-relaxed shadow-sm">
                  {generatedMessage}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono pt-1">
                  <span>ปลายทาง: {formatThaiPhoneNumber(phoneNumber) || '08x-xxx-xxxx'}</span>
                  <span>ความยาว: {creditInfo.characters} อักขระ ({creditInfo.credits} ข้อความ)</span>
                </div>
              </div>
            )}

            {/* Quota & Credit Calculation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  ความยาว: <strong>{creditInfo.characters}</strong> ตัวอักษร (มาตรฐานภาษาไทย {creditInfo.maxCharsPerCredit} ตัวอักษร/เครดิต)
                </span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-emerald-800">
                <Layers className="w-3.5 h-3.5" />
                <span>อัตราการตัดโควต้า: {creditInfo.credits} ข้อความ SMS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            * ข้อความจะถูกบันทึกลงใน SMS Audit Logs และส่งต่อไปยัง Smart SMS Gateway ทันที
          </div>

          <div className="flex items-center gap-2">
            <button
              id="test-sms-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              id="test-sms-send-btn"
              type="button"
              onClick={handleSendTestSms}
              disabled={isSending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'กำลังส่งผ่าน SMS Gateway...' : 'ส่ง SMS แจ้งเตือนทดสอบ (Send Test SMS)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
