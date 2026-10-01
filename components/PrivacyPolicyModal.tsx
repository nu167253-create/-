import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Video, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Printer, 
  Search, 
  X, 
  ChevronRight, 
  Info, 
  Building2, 
  Phone, 
  Mail, 
  Scale, 
  BookmarkCheck,
  CheckSquare,
  Square,
  Shield,
  Clock,
  EyeOff,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { 
  getPrivacyPolicyConsent, 
  savePrivacyPolicyConsent, 
  CURRENT_POLICY_VERSION, 
  PrivacyPolicyConsent 
} from '../utils/privacyService';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstVisit?: boolean;
  onConsentChange?: (consent: PrivacyPolicyConsent) => void;
  onProceed?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  isFirstVisit = false,
  onConsentChange,
  onProceed
}) => {
  const [activeTab, setActiveTab] = useState<'cctv' | 'pdpa' | 'rights' | 'terms'>('cctv');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Consent checkboxes state
  const currentConsent = getPrivacyPolicyConsent();
  const [cctvChecked, setCctvChecked] = useState(currentConsent.cctvPolicyAcknowledged || currentConsent.hasAccepted);
  const [pdpaChecked, setPdpaChecked] = useState(currentConsent.pdpaAcknowledged || currentConsent.hasAccepted);
  const [termsChecked, setTermsChecked] = useState(currentConsent.termsOfServiceAcknowledged || currentConsent.hasAccepted);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const allChecked = cctvChecked && pdpaChecked && termsChecked;

  const handleToggleSelectAll = () => {
    if (allChecked) {
      setCctvChecked(false);
      setPdpaChecked(false);
      setTermsChecked(false);
    } else {
      setCctvChecked(true);
      setPdpaChecked(true);
      setTermsChecked(true);
    }
  };

  const handleAcceptAndContinue = () => {
    const updated = savePrivacyPolicyConsent({
      hasAccepted: true,
      cctvPolicyAcknowledged: true,
      pdpaAcknowledged: true,
      termsOfServiceAcknowledged: true,
      policyVersion: CURRENT_POLICY_VERSION
    });

    setCctvChecked(true);
    setPdpaChecked(true);
    setTermsChecked(true);

    if (onConsentChange) {
      onConsentChange(updated);
    }

    setSaveSuccessMsg('บันทึกการยอมรับนโยบายความเป็นส่วนตัวและข้อกำหนดการให้บริการเรียบร้อยแล้ว');
    setTimeout(() => {
      onClose();
      if (onProceed) {
        onProceed();
      }
    }, 450);
  };

  const handlePrintPolicy = () => {
    window.print();
  };

  return (
    <div 
      id="privacy-policy-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print"
    >
      <div 
        id="privacy-policy-modal-container"
        className="bg-white border border-slate-200 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shrink-0 mt-0.5 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-blue-900/80 text-blue-200 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    PDPA Compliant
                  </span>
                  <span className="bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    CCTV Standard 2026
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    เวอร์ชัน {CURRENT_POLICY_VERSION}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                  นโยบายความเป็นส่วนตัวและข้อกำหนดการให้บริการ
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  การคุ้มครองข้อมูลส่วนบุคคลและการกำกับดูแลข้อมูลภาพจากกล้องโทรทัศน์วงจรปิด (CCTV) เทศบาลเมืองชัยภูมิ
                </p>
              </div>
            </div>

            {/* Quick proceed button and close button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-header-privacy-proceed"
                onClick={handleAcceptAndContinue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 rounded-xl transition-all shadow-xs cursor-pointer"
                title="กดเพื่อดำเนินการต่อทันที"
              >
                <span>เริ่มใช้งานทันที</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Close Button - always accessible for all visitors */}
              <button
                type="button"
                id="btn-close-privacy-modal-top"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="ปิดหน้าต่างและเริ่มใช้งาน"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* First visit notification ribbon */}
          {isFirstVisit && (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-xl p-3 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>ยินดีต้อนรับสู่ระบบบริการประชาชนออนไลน์:</strong> โปรดตรวจสอบและรับทราบนโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA) และหลักเกณฑ์การเข้าถึงข้อมูลภาพ CCTV ก่อนเริ่มใช้งานระบบ
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation & Search Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              id="tab-privacy-cctv"
              onClick={() => setActiveTab('cctv')}
              className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'cctv'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>1. ภาพจาก CCTV</span>
            </button>

            <button
              type="button"
              id="tab-privacy-pdpa"
              onClick={() => setActiveTab('pdpa')}
              className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pdpa'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>2. ข้อมูลส่วนบุคคล (PDPA)</span>
            </button>

            <button
              type="button"
              id="tab-privacy-rights"
              onClick={() => setActiveTab('rights')}
              className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'rights'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>3. สิทธิของท่าน & DPO</span>
            </button>

            <button
              type="button"
              id="tab-privacy-terms"
              onClick={() => setActiveTab('terms')}
              className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>4. ข้อกำหนดการให้บริการ</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-privacy-search"
              placeholder="ค้นหาข้อกำหนด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: CCTV Footage Policy */}
          {activeTab === 'cctv' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Video className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    หลักเกณฑ์และแนวปฏิบัติการจัดการข้อมูลภาพจากกล้องโทรทัศน์วงจรปิด (CCTV Policy)
                  </h4>
                  <p className="text-slate-600 text-xs">
                    เทศบาลเมืองชัยภูมิ ดำเนินการติดตั้งและบริหารจัดการระบบกล้อง CCTV ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และระเบียบสำนักนายกรัฐมนตรีว่าด้วยการรักษาความปลอดภัยแห่งชาติ
                  </p>
                </div>
              </div>

              {/* Point 1.1 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    1
                  </span>
                  <span>วัตถุประสงค์ในการเก็บรวบรวมและบันทึกภาพ (Purpose of CCTV Operation)</span>
                </div>
                <div className="pl-8 text-xs text-slate-600 space-y-1.5">
                  <p>เทศบาลเมืองชัยภูมิใช้ระบบกล้องโทรทัศน์วงจรปิดเพื่อวัตถุประสงค์ดังต่อไปนี้เท่านั้น:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li>เพื่อการรักษาความสงบเรียบร้อย ความปลอดภัยในชีวิต ร่างกาย และทรัพย์สินของประชาชนและทางราชการ</li>
                    <li>เพื่อสนับสนุนการป้องกัน ปราบปราม และสืบสวนสอบสวนคดีอาญา อุบัติเหตุจราจร และสาธารณภัย</li>
                    <li>เพื่อการบริหารจัดการการจราจรและการติดตามสถานการณ์ฉุกเฉินในเขตเทศบาลเมืองชัยภูมิ</li>
                    <li>เพื่อใช้เป็นพยานหลักฐานในการดำเนินคดีตามกระบวนการยุติธรรมของหน่วยงานบังคับใช้กฎหมาย</li>
                  </ul>
                </div>
              </div>

              {/* Point 1.2: Retention Period */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    2
                  </span>
                  <span>ระยะเวลาการจัดเก็บข้อมูลและการลบทำลาย (Data Retention & Lifecycle)</span>
                </div>
                <div className="pl-8 text-xs text-slate-600 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>วงรอบการบันทึกภาพ (Retention SLA)</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        ข้อมูลภาพจะถูกจัดเก็บในเครื่องบันทึกศูนย์ควบคุมเป็นระยะเวลา <strong>15 - 30 วัน</strong> (สูงสุด 90 วัน สำหรับจุดสำคัญ) หลังจากนั้นระบบจะทำการบันทึกวนทับโดยอัตโนมัติ (FIFO Overwrite)
                      </p>
                    </div>

                    <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>คำแนะนำการยื่นคำร้อง</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        กรณีเกิดเหตุ ผู้เสียหายควรยื่นคำร้องโดยเร็วที่สุด <strong>ภายใน 3-7 วันหลังเกิดเหตุ</strong> เพื่อป้องกันไฟล์ภาพถูกบันทึกวนทับจากระบบ
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Point 1.3: Access Criteria & Masking */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    3
                  </span>
                  <span>เงื่อนไขการส่งมอบภาพและการอำพรางบุคคลภายนอก (Delivery & Masking Protocol)</span>
                </div>
                <div className="pl-8 text-xs text-slate-600 space-y-2">
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>
                      <strong>เอกสารจำเป็น:</strong> ผู้ขอรับภาพต้องแนบ <em>รายงานประจำวันรับแจ้งเป็นหลักฐานจากสถานีตำรวจ (ใบแจ้งความ)</em> และบัตรประจำตัวประชาชน
                    </li>
                    <li>
                      <strong>การเบลอภาพบุคคลภายนอก (Privacy Masking):</strong> ในกรณีที่ภาพมีบุคคลภายนอกที่ไม่เกี่ยวข้องกับคดี เจ้าหน้าที่จะดำเนินการเบลอใบหน้าหรือเซ็นเซอร์หมายเลขทะเบียนรถของบุคคลอื่นเพื่อคุ้มครองความเป็นส่วนตัวตามกฎหมาย PDPA
                    </li>
                    <li>
                      <strong>ข้อห้ามนำไปเผยแพร่สาธารณะ (Strict Prohibition on Leaks):</strong> ผู้ขอรับไฟล์ภาพต้องลงนามรับรองว่าจะนำภาพไปใช้เพื่อประกอบการดำเนินคดีหรือการประกันภัยเท่านั้น <u>ห้ามนำไปโพสต์ในสื่อสังคมออนไลน์หรือเผยแพร่ต่อสาธารณะ</u> อันอาจก่อให้เกิดความเสียหายแก่บุคคลอื่น
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tab 1 Navigation & Proceed Action */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  หัวข้อ 1 จาก 4: ภาพจากกล้อง CCTV
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pdpa')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
                  >
                    <span>ถัดไป: นโยบาย PDPA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    id="btn-tab-cctv-proceed"
                    onClick={handleAcceptAndContinue}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
                    title="ยอมรับและดำเนินการต่อทันที"
                  >
                    <span>กดเพื่อดำเนินการต่อ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PDPA Compliance */}
          {activeTab === 'pdpa' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    การคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA Notice)
                  </h4>
                  <p className="text-slate-600 text-xs">
                    ประกาศความเป็นส่วนตัวนี้ใช้บังคับกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของผู้ยื่นคำร้องผ่านระบบ e-Service ของเทศบาลเมืองชัยภูมิ
                  </p>
                </div>
              </div>

              {/* Data Collected */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>1. ข้อมูลส่วนบุคคลที่เทศบาลเก็บรวบรวม</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-700">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="block text-slate-900">ข้อมูลระบุตัวตน:</strong>
                    ชื่อ-นามสกุล, เลขประจำตัวประชาชน 13 หลัก, วันเดือนปีเกิด
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="block text-slate-900">ข้อมูลติดต่อ:</strong>
                    หมายเลขโทรศัพท์, อีเมล, ที่อยู่ตามทะเบียนบ้าน/ที่พักอาศัย
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="block text-slate-900">ข้อมูลหลักฐานคำร้อง:</strong>
                    สำเนาบัตรประชาชน, บันทึกประจำวันสถานีตำรวจ, เอกสารประกันภัย
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="block text-slate-900">ข้อมูลเชิงเทคนิคและประวัติ:</strong>
                    IP Address, บันทึกการเข้าสู่ระบบ, วันและเวลาที่ทำธุรกรรม
                  </div>
                </div>
              </div>

              {/* Legal Basis */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>2. ฐานทางกฎหมายในการประมวลผลข้อมูล (Legal Basis)</span>
                </h5>
                <ul className="text-xs text-slate-700 space-y-2 pl-4 list-disc">
                  <li>
                    <strong>ฐานภารกิจของรัฐ (Public Task):</strong> การปฏิบัติหน้าที่ในการให้บริการสาธารณะและการรักษาความสงบเรียบร้อยตามพระราชบัญญัติเทศบาล พ.ศ. 2496
                  </li>
                  <li>
                    <strong>ฐานการปฏิบัติตามกฎหมาย (Legal Obligation):</strong> การปฏิบัติตามกฎหมายวิธีพิจารณาความอาญา พระราชบัญญัติข้อมูลข่าวสารของราชการ พ.ศ. 2540 และกฎหมายอื่นที่เกี่ยวข้อง
                  </li>
                  <li>
                    <strong>ฐานประโยชน์สำคัญต่อชีวิต (Vital Interests):</strong> การป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพของบุคคลในสถานการณ์ฉุกเฉิน
                  </li>
                  <li>
                    <strong>ฐานความยินยอม (Consent):</strong> กรณีที่ผู้ขอรับบริการให้ความยินยอมโดยสมัครใจสำหรับการรับข้อมูลแจ้งเตือน SMS หรืออีเมล
                  </li>
                </ul>
              </div>

              {/* Security Safeguards */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>3. มาตรการรักษาความมั่นคงปลอดภัยของข้อมูล</span>
                </h5>
                <p className="text-xs text-slate-600">
                  เทศบาลจัดให้มีมาตรการรักษาความปลอดภัยทางเทคนิคและการบริหารจัดการ (Technical and Organizational Measures) ที่ได้มาตรฐาน ได้แก่:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block">การเข้ารหัสข้อมูล (Encryption)</strong>
                    เข้ารหัสข้อมูลทั้งในระหว่างการรับส่ง (TLS) และการจัดเก็บ (AES)
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block">จำกัดสิทธิ์ (RBAC)</strong>
                    เข้าถึงได้เฉพาะเจ้าหน้าที่สารบรรณและนายตรวจที่ได้รับมอบหมายเท่านั้น
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="text-slate-900 block">เก็บบันทึกประวัติ (Audit Log)</strong>
                    บันทึกประวัติการสืบค้น ดาวน์โหลด และเปิดดูไฟล์อย่างโปร่งใส
                  </div>
                </div>
              </div>

              {/* Tab 2 Navigation & Proceed Action */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('cctv')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ: ภาพ CCTV</span>
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('rights')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
                  >
                    <span>ถัดไป: สิทธิของท่าน & DPO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    id="btn-tab-pdpa-proceed"
                    onClick={handleAcceptAndContinue}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
                    title="ยอมรับและดำเนินการต่อทันที"
                  >
                    <span>กดเพื่อดำเนินการต่อ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Data Subject Rights & DPO */}
          {activeTab === 'rights' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <Scale className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    สิทธิของเจ้าของข้อมูลส่วนบุคคล (Your Rights under PDPA)
                  </h4>
                  <p className="text-slate-600 text-xs">
                    ท่านมีสิทธิตามกฎหมายในการควบคุมและจัดการข้อมูลส่วนบุคคลของตนเอง โดยสามารถติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ได้ตามช่องทางที่ระบุ
                  </p>
                </div>
              </div>

              {/* Rights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-blue-600" />
                    สิทธิขอเข้าถึงและรับสำเนา (Right of Access)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    ท่านมีสิทธิขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของตนเองที่อยู่ในความรับผิดชอบของเทศบาล หรือขอให้เปิดเผยการได้มาซึ่งข้อมูลดังกล่าว
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    สิทธิขอแก้ไขข้อมูลให้ถูกต้อง (Right to Rectification)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    ท่านมีสิทธิขอให้แก้ไขข้อมูลส่วนบุคคลของท่านให้ถูกต้อง เป็นปัจจุบัน สมบูรณ์ และไม่ก่อให้เกิดความเข้าใจผิด
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-rose-600" />
                    สิทธิขอลบหรือทำลายข้อมูล (Right to Erasure)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    ท่านมีสิทธิขอลบหรือทำลายข้อมูลเมื่อข้อมูลดังกล่าวหมดความจำเป็นตามวัตถุประสงค์ เว้นแต่กฎหมายมีข้อกำหนดให้จัดเก็บเพื่อการตรวจสอบ
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    สิทธิการร้องเรียน (Right to Complain)
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    ท่านมีสิทธิร้องเรียนต่อคณะกรรมการผู้เชี่ยวชาญตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล หากพบว่าการปฏิบัติหน้าที่ของหน่วยงานไม่เป็นไปตามกฎหมาย
                  </p>
                </div>
              </div>

              {/* DPO Contact Card */}
              <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                    ช่องทางการติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO Contact)
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>งานเทคโนโลยีสารสนเทศ เทศบาลเมืองชัยภูมิ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>โทรศัพท์: 044-811-378 ต่อ 104 (สายด่วน CCTV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>อีเมล: dpo@chaiyaphumcity.go.th</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>วันและเวลาทำการ: จันทร์ - ศุกร์ 08:30 - 16:30 น.</span>
                  </div>
                </div>
              </div>

              {/* Tab 3 Navigation & Proceed Action */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('pdpa')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ: ข้อมูล PDPA</span>
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('terms')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
                  >
                    <span>ถัดไป: ข้อกำหนดการให้บริการ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    id="btn-tab-rights-proceed"
                    onClick={handleAcceptAndContinue}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
                    title="ยอมรับและดำเนินการต่อทันที"
                  >
                    <span>กดเพื่อดำเนินการต่อ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Terms of Service */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    ข้อกำหนดและเงื่อนไขการใช้บริการระบบบริการประชาชนออนไลน์ (Terms of Service)
                  </h4>
                  <p className="text-slate-600 text-xs">
                    ข้อกำหนดเหล่านี้มีผลผูกพันทางกฎหมายระหว่างผู้ใช้บริการและเทศบาลเมืองชัยภูมิเมื่อท่านส่งคำร้องหรือใช้งานระบบ
                  </p>
                </div>
              </div>

              {/* Clause 1: Truthfulness */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">1</span>
                  <span>การรับรองความถูกต้องแท้จริงของข้อมูลและเอกสาร</span>
                </div>
                <div className="pl-7 text-xs text-slate-700 space-y-1">
                  <p>
                    ผู้ใช้บริการรับรองว่าข้อมูล ชื่อ ที่อยู่ หมายเลขโทรศัพท์ และเอกสารหลักฐานประกอบคำร้องที่แนบมา เป็นข้อมูลที่ถูกต้อง ครบถ้วน และเป็นความจริงทุกประการ
                  </p>
                  <p className="text-rose-700 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200 text-[11px]">
                    คำเตือน: การแจ้งข้อความอันเป็นเท็จ หรือใช้เอกสารปลอมในการยื่นคำร้องต่อเจ้าพนักงาน มีความผิดตามประมวลกฎหมายอาญา มาตรา 137 และมาตรา 267 มีโทษจำคุกหรือปรับ หรือทั้งจำทั้งปรับ
                  </p>
                </div>
              </div>

              {/* Clause 2: SLA & Technical Limits */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">2</span>
                  <span>กรอบระยะเวลาการพิจารณาและข้อจำกัดทางเทคนิค</span>
                </div>
                <div className="pl-7 text-xs text-slate-700 space-y-1">
                  <p>
                    เทศบาลจะพิจารณาคำร้องตามลำดับคิวและข้อกำหนดการให้บริการ (SLA) โดยทั่วไปใช้เวลาดำเนินการ 1 - 3 วันทำการ ทั้งนี้ขึ้นอยู่กับความพร้อมของข้อมูลภาพและการตรวจสอบจากสถานีตำรวจ
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    กรณีกล้องวงจรปิดขัดข้องเนื่องจากสภาพอากาศ อุบัติเหตุทางกายภาพ ระบบไฟฟ้าดับ หรือมุมกล้องถูกบดบังจากกิ่งไม้หรือยานพาหนะขนาดใหญ่ เทศบาลจะแจ้งผลการตรวจสอบให้ผู้ร้องทราบตามข้อเท็จจริง
                  </p>
                </div>
              </div>

              {/* Clause 3: Intellectual Property & Security */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-xs">3</span>
                  <span>ความปลอดภัยในการใช้งานระบบ</span>
                </div>
                <div className="pl-7 text-xs text-slate-700 space-y-1">
                  <p>
                    ห้ามมิให้ผู้ใดพยายามเจาะระบบ ส่งมัลแวร์ หรือแทรกแซงการทำงานของระบบสารบรรณและฐานข้อมูลของเทศบาล การกระทำดังกล่าวมีความผิดตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2560
                  </p>
                </div>
              </div>

              {/* Proceed Action Box inside Tab 4 (ข้อกำหนดการให้บริการ) */}
              <div className="mt-6 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-emerald-50/60 border-2 border-blue-300/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h5 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      รับทราบนโยบายความเป็นส่วนตัวและข้อกำหนดการให้บริการ
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      เมื่อท่านได้อ่านและเข้าใจข้อกำหนดการให้บริการและนโยบายคุ้มครองข้อมูลส่วนบุคคลครบถ้วนแล้ว กรุณากดปุ่ม <strong>"กดเพื่อดำเนินการต่อ"</strong> เพื่อบันทึกการยอมรับและเข้าสู่ระบบบริการประชาชนออนไลน์
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-200/70">
                  <button
                    type="button"
                    onClick={() => setActiveTab('rights')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ย้อนกลับ: สิทธิ & DPO</span>
                  </button>

                  <button
                    type="button"
                    id="btn-terms-proceed-continue"
                    onClick={handleAcceptAndContinue}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/25 transition-all hover:scale-102 active:scale-98 cursor-pointer ring-2 ring-blue-400/30"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>กดเพื่อดำเนินการต่อ (Proceed)</span>
                    <ArrowRight className="w-4 h-4 text-blue-100" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Acknowledgment & Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 space-y-3.5">
          {/* Checkboxes Agreement Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
                <span>การรับทราบและให้ความยินยอม (Consent Confirmation)</span>
              </span>
              <button
                type="button"
                id="btn-privacy-select-all"
                onClick={handleToggleSelectAll}
                className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] underline"
              >
                {allChecked ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด (Select All)'}
              </button>
            </div>

            <div className="space-y-2 pt-1 text-slate-700">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="chk-consent-cctv"
                  checked={cctvChecked}
                  onChange={(e) => setCctvChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[11px] leading-snug">
                  ข้าพเจ้ารับทราบหลักเกณฑ์การเข้าถึงภาพจากกล้อง CCTV ระยะเวลาการจัดเก็บ 15-30 วัน และตกลงจะไม่นำไฟล์ภาพไปเผยแพร่ในสื่อสาธารณะโดยเด็ดขาด
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="chk-consent-pdpa"
                  checked={pdpaChecked}
                  onChange={(e) => setPdpaChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[11px] leading-snug">
                  ข้าพเจ้ารับทราบนโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA) สิทธิของเจ้าของข้อมูล และยินยอมให้เทศบาลประมวลผลข้อมูลตามวัตถุประสงค์ทางราชการ
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="chk-consent-terms"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-[11px] leading-snug">
                  ข้าพเจ้ารับรองว่าข้อมูลที่ใช้ยื่นคำร้องเป็นความจริงทุกประการ และยอมรับข้อกำหนดการให้บริการ (Terms of Service)
                </span>
              </label>
            </div>
          </div>

          {/* Success Message Banner */}
          {saveSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Buttons bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-print-privacy-policy"
                onClick={handlePrintPolicy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
                title="พิมพ์หรือบันทึกข้อกำหนดเป็น PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">พิมพ์ประกาศ</span>
              </button>

              {currentConsent.hasAccepted && currentConsent.acceptedAt && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="hidden md:inline">ยอมรับแล้วเมื่อ:</span>
                  <span>{new Date(currentConsent.acceptedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                id="btn-privacy-close"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              <button
                type="button"
                id="btn-privacy-accept-continue"
                onClick={handleAcceptAndContinue}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-600/25 transition-all hover:scale-102 active:scale-98 cursor-pointer ring-2 ring-blue-400/30"
                title="กดเพื่อดำเนินการต่อและเข้าสู่ระบบ"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>กดเพื่อดำเนินการต่อ</span>
                <span className="text-[11px] font-medium text-blue-100 hidden sm:inline">(ยอมรับและดำเนินการต่อ)</span>
                <ArrowRight className="w-4 h-4 text-blue-100 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
