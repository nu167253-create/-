import React, { useState, useEffect, useRef } from 'react';
import { 
  SmsTemplateKey, 
  SmsTemplateItem, 
  getSmsTemplates, 
  saveSmsTemplates, 
  resetSmsTemplatesToDefault, 
  resetSingleSmsTemplate, 
  replaceSmsPlaceholders,
  calculateSmsCredits,
  DEFAULT_SMS_TEMPLATES
} from '../utils/smsService';
import { RequestItem } from '../types/request';
import { 
  SlidersHorizontal, 
  X, 
  Check, 
  RotateCcw, 
  Smartphone, 
  Send, 
  Sparkles, 
  Info, 
  Copy, 
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  Settings,
  Flame,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface OfficerSmsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTestSms?: (sampleReq?: RequestItem | null) => void;
  requests?: RequestItem[];
}

interface PlaceholderDefinition {
  token: string;
  labelTh: string;
  descriptionTh: string;
  exampleValue: string;
}

const AVAILABLE_PLACEHOLDERS: PlaceholderDefinition[] = [
  {
    token: '{TRACKING_ID}',
    labelTh: 'เลขที่คำร้อง',
    descriptionTh: 'รหัสติดตามคำร้องทางการ เช่น REQ-2026-0089',
    exampleValue: 'REQ-2026-0089'
  },
  {
    token: '{APPLICANT_NAME}',
    labelTh: 'ชื่อผู้ยื่นคำร้อง',
    descriptionTh: 'คำนำหน้าและชื่อ-สกุลของผู้ยื่น เช่น คุณสมศักดิ์ สุขใจ',
    exampleValue: 'คุณสมศักดิ์ สุขใจ'
  },
  {
    token: '{STATUS}',
    labelTh: 'ชื่อสถานะภาษาไทย',
    descriptionTh: 'ชื่อสถานะทางการ เช่น อนุมัติคำร้อง, อยู่ระหว่างตรวจสอบ',
    exampleValue: 'อนุมัติคำร้อง'
  },
  {
    token: '{REQUEST_TITLE}',
    labelTh: 'เรื่องคำร้อง',
    descriptionTh: 'ชื่อเรื่องหรือความประสงค์ เช่น ขอดูกล้องวงจรปิด CCTV',
    exampleValue: 'ขอดูกล้องวงจรปิด CCTV สี่แยกบายพาส'
  },
  {
    token: '{OFFICER_NOTE}',
    labelTh: 'หมายเหตุเจ้าหน้าที่',
    descriptionTh: 'ข้อความบันทึก/เหตุผลที่เจ้าหน้าที่ระบุขณะเปลี่ยนสถานะ',
    exampleValue: 'อนุมัติให้เข้าคัดลอกไฟล์ภาพที่ศูนย์ควบคุม'
  },
  {
    token: '{TRACKING_URL}',
    labelTh: 'ลิงก์ติดตามคำร้อง',
    descriptionTh: 'URL ติดตามสถานะคำร้องสำหรับประชาชน',
    exampleValue: 'e-service.chaiyaphum.go.th/?trackId=REQ-2026-0089'
  },
  {
    token: '{CATEGORY}',
    labelTh: 'หมวดหมู่งาน',
    descriptionTh: 'ประเภทของบริการ เช่น กล้องวงจรปิด CCTV, บริการทั่วไป',
    exampleValue: 'กล้องวงจรปิด CCTV'
  },
  {
    token: '{DATE}',
    labelTh: 'วันที่ปัจจุบัน',
    descriptionTh: 'วันที่ดำเนินการตามปฏิทินไทย เช่น 21 ก.ย. 2569',
    exampleValue: '21 ก.ย. 2569'
  },
  {
    token: '{MUNICIPALITY}',
    labelTh: 'ชื่อองค์กร',
    descriptionTh: 'ชื่อย่อเทศบาล เช่น ทม.ชัยภูมิ',
    exampleValue: 'ทม.ชัยภูมิ'
  }
];

export const OfficerSmsTemplateModal: React.FC<OfficerSmsTemplateModalProps> = ({
  isOpen,
  onClose,
  onOpenTestSms,
  requests = []
}) => {
  if (!isOpen) return null;

  const [templates, setTemplates] = useState<Record<SmsTemplateKey, SmsTemplateItem>>(() => getSmsTemplates());
  const [activeKey, setActiveKey] = useState<SmsTemplateKey>('submitted');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Sample data for live phone preview
  const [previewReqId, setPreviewReqId] = useState<string>(
    requests.length > 0 ? requests[0].id : 'sample'
  );
  const [previewNote, setPreviewNote] = useState<string>('อนุมัติคำร้องตามเอกสารแนบเรียบร้อยแล้ว');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current active template
  const currentTemplate = templates[activeKey] || DEFAULT_SMS_TEMPLATES[activeKey];

  // Resolve preview request data
  const activeReq = requests.find((r) => r.id === previewReqId) || null;
  const sampleTrackingId = activeReq ? activeReq.id : 'REQ-2026-0089';
  const sampleApplicantName = activeReq?.applicant?.fullName || 'คุณสมศักดิ์ สุขใจ';
  const sampleTitle = activeReq?.title || 'ขอดูกล้องวงจรปิด CCTV บริเวณสี่แยกบายพาส';
  const sampleCategory = activeReq?.category ? 'กล้องวงจรปิด CCTV' : 'บริการ e-Service';

  // Compute live preview text
  const livePreviewText = replaceSmsPlaceholders(currentTemplate.template, {
    trackingId: sampleTrackingId,
    applicantName: sampleApplicantName,
    requestTitle: sampleTitle,
    statusTh: currentTemplate.labelTh.split(' (')[0],
    officerNote: previewNote,
    trackingUrl: `e-service.chaiyaphum.go.th/?trackId=${sampleTrackingId}`,
    categoryName: sampleCategory,
    currentDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    municipality: 'ทม.ชัยภูมิ'
  });

  const creditInfo = calculateSmsCredits(livePreviewText);

  // Insert placeholder token at cursor position
  const handleInsertPlaceholder = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback append
      handleTemplateChange(currentTemplate.template + ' ' + token);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prev = currentTemplate.template;
    const next = prev.substring(0, start) + token + prev.substring(end);

    handleTemplateChange(next);

    // Restore focus and position cursor right after inserted token
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  const handleTemplateChange = (newText: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        template: newText
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleToggleStatusEnabled = () => {
    const updatedStatus = !currentTemplate.enabled;
    setTemplates((prev) => ({
      ...prev,
      [activeKey]: {
        ...prev[activeKey],
        enabled: updatedStatus
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    saveSmsTemplates(templates);
    setHasUnsavedChanges(false);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3500);
  };

  const handleResetCurrent = () => {
    if (window.confirm(`ต้องการคืนค่าเทมเพลต "${currentTemplate.labelTh}" กลับเป็นค่ามาตรฐานเริ่มต้นใช่หรือไม่?`)) {
      const reset = resetSingleSmsTemplate(activeKey);
      setTemplates((prev) => ({
        ...prev,
        [activeKey]: reset
      }));
      setHasUnsavedChanges(false);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('คำเตือน: คุณต้องการคืนค่าเริ่มต้นของเทมเพลต SMS ทุกสถานะกลับสู่ค่าตั้งต้นของเทศบาลใช่หรือไม่?')) {
      const defaults = resetSmsTemplatesToDefault();
      setTemplates(defaults);
      setHasUnsavedChanges(false);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Status configuration metadata for tabs
  const statusTabItems: Array<{
    key: SmsTemplateKey;
    labelTh: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
  }> = [
    { key: 'submitted', labelTh: 'ได้รับคำร้อง (Received)', badgeBg: 'bg-blue-950/60', badgeText: 'text-blue-300 border-blue-800/80', dotColor: 'bg-blue-400' },
    { key: 'under_review', labelTh: 'อยู่ระหว่างตรวจสอบ', badgeBg: 'bg-amber-950/60', badgeText: 'text-amber-300 border-amber-800/80', dotColor: 'bg-amber-400' },
    { key: 'action_required', labelTh: 'ขอเอกสารเพิ่มเติม', badgeBg: 'bg-orange-950/60', badgeText: 'text-orange-300 border-orange-800/80', dotColor: 'bg-orange-400' },
    { key: 'approved', labelTh: 'อนุมัติคำร้อง (Approved)', badgeBg: 'bg-emerald-950/60', badgeText: 'text-emerald-300 border-emerald-800/80', dotColor: 'bg-emerald-400' },
    { key: 'completed', labelTh: 'เสร็จสิ้น (Completed)', badgeBg: 'bg-teal-950/60', badgeText: 'text-teal-300 border-teal-800/80', dotColor: 'bg-teal-400' },
    { key: 'rejected', labelTh: 'ปฏิเสธคำร้อง (Rejected)', badgeBg: 'bg-rose-950/60', badgeText: 'text-rose-300 border-rose-800/80', dotColor: 'bg-rose-400' },
    { key: 'reminder', labelTh: 'ติดตามความคืบหน้า', badgeBg: 'bg-indigo-950/60', badgeText: 'text-indigo-300 border-indigo-800/80', dotColor: 'bg-indigo-400' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  ตัวแก้ไขเทมเพลตข้อความ SMS (SMS Template Editor)
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Officer Settings
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ปรับแต่งเนื้อหาข้อความ SMS แจ้งเตือนสถานะคำร้องอัตโนมัติด้วยตัวแปร Placeholders (เช่น {'{TRACKING_ID}'}, {'{APPLICANT_NAME}'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessToast && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/80 px-3 py-1.5 rounded-xl animate-fade-in shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                บันทึกเทมเพลตเรียบร้อยแล้ว
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Category Tabs */}
        <div className="px-6 pt-3 pb-1 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {statusTabItems.map((tab) => {
            const isActive = activeKey === tab.key;
            const isCustomized = templates[tab.key]?.template !== DEFAULT_SMS_TEMPLATES[tab.key]?.defaultTemplate;
            const isEnabled = templates[tab.key]?.enabled;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                className={`group relative px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-102'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tab.dotColor}`} />
                <span>{tab.labelTh}</span>
                {isCustomized && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    แก้ไขแล้ว
                  </span>
                )}
                {!isEnabled && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-400">
                    ปิดส่ง
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Work Area: 2 Columns (Editor vs Live Simulator) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900">
          
          {/* Left Column: Editor & Placeholder Tags (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Status Information & Switch */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    {currentTemplate.labelTh}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-900 text-slate-300 border border-slate-700">
                    Key: {activeKey}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {currentTemplate.descriptionTh}
                </p>
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentTemplate.enabled}
                    onChange={handleToggleStatusEnabled}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  <span className="text-xs font-bold text-slate-300">
                    {currentTemplate.enabled ? 'เปิดส่ง SMS' : 'ปิดส่ง SMS'}
                  </span>
                </label>
              </div>
            </div>

            {/* Placeholders Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>คลิกเพื่อแทรกตัวแปรอัตโนมัติ (Click to Insert Placeholders):</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  ระบบจะแทนที่ค่าจริงให้อัตโนมัติขณะส่ง
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
                {AVAILABLE_PLACEHOLDERS.map((p) => {
                  const isCopied = copiedToken === p.token;
                  return (
                    <button
                      key={p.token}
                      type="button"
                      onClick={() => handleInsertPlaceholder(p.token)}
                      className="group inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title={`${p.labelTh}: ${p.descriptionTh} (คลิกเพื่อแทรกลงในข้อความ)`}
                    >
                      <span className="text-amber-400 group-hover:scale-110 transition-transform">+</span>
                      <span>{p.token}</span>
                      <span className="text-[10px] text-slate-400 group-hover:text-amber-300/80 font-sans">
                        ({p.labelTh})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea Template Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>เนื้อหาเทมเพลตข้อความ SMS</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetCurrent}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title="คืนค่าเทมเพลตรายการนี้กลับสู่ค่าเริ่มต้น"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>คืนค่าสถานะนี้</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={currentTemplate.template}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 font-mono text-sm leading-relaxed p-4 rounded-2xl border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-hidden transition-all resize-y shadow-inner"
                  placeholder="พิมพ์ข้อความเทมเพลตที่นี่ พร้อมใส่ตัวแปร เช่น {TRACKING_ID}, {APPLICANT_NAME}..."
                />
              </div>

              {/* Character & Credit Indicators */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-3">
                  <span>
                    ความยาวต้นแบบ: <strong className="text-slate-200">{currentTemplate.template.length}</strong> ตัวอักษร
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>
                    มาตรฐาน SMS ไทย: <strong>70 ตัวอักษร/เครดิต (UCS-2)</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>{'{OFFICER_NOTE}'} จะเว้นว่างให้อัตโนมัติหากไม่มีหมายเหตุ</span>
                </div>
              </div>
            </div>

            {/* Quick Reference Guide */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>คำแนะนำการปรับแต่งข้อความทางการ</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11.5px] leading-relaxed">
                <li>ควรคงคำนำหน้า <code className="text-slate-200">[ทม.ชัยภูมิ]</code> ไว้เสมอ เพื่อให้ประชาชนมั่นใจว่าเป็นข้อความจากหน่วยงานราชการจริง ป้องกันมิจฉาชีพ</li>
                <li>ใส่ <code className="text-slate-200">{'{TRACKING_URL}'}</code> เพื่ออำนวยความสะดวกให้ประชาชนกดตรวจสอบความคืบหน้าได้ทันที</li>
                <li>พยายามควบคุมความยาวข้อความให้อยู่ภายใน <strong>1 - 2 เครดิต (ไม่เกิน 140 ตัวอักษร)</strong> เพื่อประหยัดโควตา SMS ประจำปีของเทศบาล</li>
              </ul>
            </div>

          </div>

          {/* Right Column: Live Mobile SMS Preview Simulator (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>จำลองการแสดงผลบนมือถือประชาชน (Live Mobile Preview)</span>
              </div>

              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>

            {/* Preview Parameter Controls */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-300">
                เลือกคำร้องจำลองเพื่อทดสอบการแทนที่ข้อมูล:
              </div>
              
              <select
                value={previewReqId}
                onChange={(e) => setPreviewReqId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl p-2 border border-slate-700 focus:border-amber-500 outline-hidden"
              >
                <option value="sample">-- คำร้องตัวอย่างมาตรฐาน (คุณสมศักดิ์ สุขใจ) --</option>
                {requests.slice(0, 15).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.applicant?.fullName || 'ผู้ยื่น'} - {r.title.slice(0, 24)}...
                  </option>
                ))}
              </select>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  หมายเหตุจำลองของเจ้าหน้าที่ ({'{OFFICER_NOTE}'}):
                </label>
                <input
                  type="text"
                  value={previewNote}
                  onChange={(e) => setPreviewNote(e.target.value)}
                  placeholder="เช่น เอกสารพร้อมรับที่ห้องศูนย์วิทยุ"
                  className="w-full bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-1.5 border border-slate-700 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            {/* Mobile Device Frame */}
            <div className="relative mx-auto w-full max-w-sm bg-slate-950 rounded-[2.5rem] border-[6px] border-slate-800 shadow-2xl p-3.5 space-y-3">
              {/* Phone Speaker & Camera Notch */}
              <div className="flex justify-center mb-1">
                <div className="w-20 h-3.5 bg-slate-800 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-slate-900" />
                </div>
              </div>

              {/* Chat Header */}
              <div className="bg-slate-900/90 rounded-2xl p-2.5 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    ทม
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">
                      ทม.ชัยภูมิ (Smart SMS)
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      ผู้ส่งทางการ • ผ่านการรับรอง
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  วันนี้ 10:30
                </div>
              </div>

              {/* Messages Container */}
              <div className="bg-slate-900/60 rounded-2xl p-3 min-h-[160px] flex flex-col justify-end space-y-2 border border-slate-800/60">
                {/* Incoming Message Bubble */}
                <div className="bg-slate-800 border border-slate-700/80 rounded-2xl rounded-tl-xs p-3 text-xs leading-relaxed text-slate-100 shadow-md">
                  <p className="whitespace-pre-wrap select-all">
                    {livePreviewText || 'ยังไม่มีข้อความ'}
                  </p>
                  <div className="text-[10px] text-slate-400 text-right mt-2 flex items-center justify-end gap-1">
                    <span>เพิ่งส่ง</span>
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Billing & Character Metrics */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ความยาวข้อความจริง:</span>
                  <span className="font-bold text-white font-mono">{livePreviewText.length} ตัวอักษร</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">หน่วยคิดโควตา (Credits):</span>
                  <span className={`font-bold font-mono px-1.5 py-0.2 rounded-md ${
                    creditInfo.credits === 1 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {creditInfo.credits} ข้อความ ({creditInfo.credits} Credit)
                  </span>
                </div>
              </div>

              {/* Test SMS Quick Launcher */}
              {onOpenTestSms && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTestSms(activeReq);
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title="เปิดหน้าต่างทดสอบส่ง SMS จริงไปยังเบอร์มือถือ"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ทดสอบส่งจริง (Test Send SMS)</span>
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer"
              title="รีเซ็ตเทมเพลตทุกสถานะกลับสู่ค่าเริ่มต้นของเทศบาล"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตทุกเทมเพลต (Reset All)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก / ปิด
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 animate-pulse scale-102'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{hasUnsavedChanges ? '💾 บันทึกการเปลี่ยนแปลง (Save)' : 'บันทึกเรียบร้อย'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
