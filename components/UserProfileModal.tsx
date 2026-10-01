import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  getUserProfile, 
  saveUserProfile, 
  calculateProfileCompletion,
  exportUserProfileAsJSON,
  profileToApplicantInfo
} from '../utils/userProfileService';
import { getStoredRequests } from '../utils/storage';
import { getNotificationSettings, saveNotificationSettings } from '../utils/notificationService';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Briefcase, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  HeartHandshake, 
  X, 
  UserCheck,
  CreditCard,
  MessageSquare,
  BadgeCheck,
  ChevronRight,
  Send,
  Lock,
  Smartphone
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved?: (updatedProfile: UserProfile) => void;
  onApplyToForm?: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileSaved,
  onApplyToForm
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'work' | 'emergency'>('personal');
  const [showCitizenId, setShowCitizenId] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reload profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfile(getUserProfile());
      setSaveMessage(null);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completion = calculateProfileCompletion(profile);
  const userRequestsCount = getStoredRequests().filter(
    r => r.applicant?.citizenIdOrCode === profile.citizenId || r.applicant?.phone === profile.phone
  ).length;

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-recalculate fullAddress if address components change
      if (['houseNo', 'village', 'subDistrict', 'district', 'province', 'postalCode'].includes(field)) {
        const hNo = field === 'houseNo' ? value : next.houseNo || '';
        const vil = field === 'village' ? value : next.village || '';
        const sub = field === 'subDistrict' ? value : next.subDistrict || '';
        const dist = field === 'district' ? value : next.district || '';
        const prov = field === 'province' ? value : next.province || '';
        const post = field === 'postalCode' ? value : next.postalCode || '';

        next.fullAddress = [
          hNo,
          vil,
          sub ? `ต.${sub}` : '',
          dist ? `อ.${dist}` : '',
          prov ? `จ.${prov}` : '',
          post
        ].filter(Boolean).join(' ');
      }
      return next;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!profile.fullName.trim()) errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (!profile.phone.trim()) {
      errs.phone = 'กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อและรับ SMS';
    } else {
      const cleanPhoneDigits = profile.phone.replace(/\D/g, '');
      if (cleanPhoneDigits.length < 9 || cleanPhoneDigits.length > 10) {
        errs.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก (เช่น 0812345678)';
      }
    }
    
    if (profile.citizenId) {
      const cleanId = profile.citizenId.replace(/\D/g, '');
      if (cleanId.length !== 13) {
        errs.citizenId = 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก';
      }
    }

    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const saved = await saveUserProfile(profile, true);
      
      // Keep notification settings in sync with profile phone & SMS preference
      saveNotificationSettings({
        smsNotificationsEnabled: profile.smsUpdatesEnabled !== false,
        smsPhoneNumber: profile.smsPhone?.trim() || profile.phone?.trim()
      });

      setProfile(saved);
      setIsSaving(false);
      setSaveMessage('✅ บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว (Autosaved & Synced)');

      if (onProfileSaved) {
        onProfileSaved(saved);
      }

      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      setIsSaving(false);
      setSaveMessage('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleApplyAndClose = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const saved = await saveUserProfile(profile, true);

    // Keep notification settings in sync with profile phone & SMS preference
    saveNotificationSettings({
      smsNotificationsEnabled: profile.smsUpdatesEnabled !== false,
      smsPhoneNumber: profile.smsPhone?.trim() || profile.phone?.trim()
    });

    setIsSaving(false);

    if (onApplyToForm) {
      onApplyToForm(saved);
    }
    if (onProfileSaved) {
      onProfileSaved(saved);
    }
    onClose();
  };

  const handleCopyAddress = () => {
    if (profile.fullAddress) {
      navigator.clipboard.writeText(profile.fullAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const maskCitizenId = (id: string) => {
    if (!id || id.length < 13) return id || '3-XXXX-XXXXX-XX-X';
    return `${id.slice(0, 1)}-${id.slice(1, 5)}-XXXXX-${id.slice(10, 12)}-${id.slice(12)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 border-b border-slate-800 flex items-start justify-between relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40 border border-blue-400/30 shrink-0">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  จัดการข้อมูลโปรไฟล์ผู้ยื่นคำร้อง
                </h2>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  Citizen Profile
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                อัปเดตข้อมูลส่วนบุคคล ที่อยู่ติดต่อ เบอร์โทรศัพท์ และสังกัด สำหรับกรอกคำร้องอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800/80 p-1.5 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Completion Bar & Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-blue-600" />
                  ความสมบูรณ์ของข้อมูลโปรไฟล์:
                </span>
                <span className={`font-bold ${
                  completion.score >= 80 ? 'text-emerald-700' : completion.score >= 50 ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {completion.score}% ({completion.completedFields}/{completion.totalFields} รายการ)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    completion.score >= 80 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
                      : completion.score >= 50 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600' 
                      : 'bg-gradient-to-r from-rose-500 to-rose-600'
                  }`}
                  style={{ width: `${completion.score}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-slate-500 block text-[10px]">คำร้องที่เคยยื่น</span>
                <span className="font-bold text-slate-800">{userRequestsCount} รายการ</span>
              </div>
            </div>

            <button
              onClick={() => exportUserProfileAsJSON(profile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title="ส่งออกข้อมูลโปรไฟล์เป็นไฟล์ JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>สำรองข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-white px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'personal'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            1. ข้อมูลส่วนบุคคลพื้นฐาน
          </button>

          <button
            onClick={() => setActiveTab('address')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'address'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            2. ที่อยู่ตามทะเบียนบ้าน/ติดต่อ
          </button>

          <button
            onClick={() => setActiveTab('work')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'work'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            3. สังกัด/อาชีพ/ประเภทผู้ขอ
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'emergency'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            4. ผู้ติดต่อฉุกเฉิน
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {saveMessage && (
            <div className={`p-3.5 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-between shadow-xs ${
              saveMessage.includes('✅') 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{saveMessage}</span>
              </div>
            </div>
          )}

          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="space-y-5">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  ข้อมูลส่วนบุคคลของคุณจะถูกจัดเก็บอย่างปลอดภัยตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เพื่อใช้อ้างอิงยืนยันตัวตนในการยื่นคำร้องขอดูภาพกล้องวงจรปิด CCTV เท่านั้น
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    คำนำหน้าชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={profile.prefix}
                    onChange={(e) => handleInputChange('prefix', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ร้อยตรี">ว่าที่ร้อยตรี</option>
                    <option value="ร.ต.อ.">ร.ต.อ.</option>
                    <option value="พ.ต.ท.">พ.ต.ท.</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="เช่น สมชาย ใจดี"
                      value={profile.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.fullName ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCitizenId(!showCitizenId)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {showCitizenId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showCitizenId ? 'ซ่อนเลข' : 'แสดงเลข'}
                    </button>
                  </div>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showCitizenId ? 'text' : 'password'}
                      maxLength={13}
                      placeholder="13360100XXXXX"
                      value={profile.citizenId}
                      onChange={(e) => handleInputChange('citizenId', e.target.value.replace(/\D/g, ''))}
                      className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono ${
                        errors.citizenId ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {showCitizenId ? profile.citizenId : maskCitizenId(profile.citizenId)}
                  </p>
                  {errors.citizenId && <p className="text-xs text-rose-500 mt-1">{errors.citizenId}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>เบอร์โทรศัพท์มือถือ (Phone Number)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-blue-600" />
                      ใช้รับ SMS แจ้งสถานะ
                    </span>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      id="profile-phone-input"
                      placeholder="เช่น 081-234-5678 หรือ 0812345678"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.phone ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}

                  {/* SMS Status Updates Toggle Option */}
                  <label 
                    htmlFor="profile-sms-updates-checkbox"
                    className="mt-2.5 flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/50 hover:bg-blue-50/80 border border-blue-200/80 transition-all cursor-pointer"
                  >
                    <input
                      id="profile-sms-updates-checkbox"
                      type="checkbox"
                      checked={profile.smsUpdatesEnabled !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleInputChange('smsUpdatesEnabled' as any, checked as any);
                        saveNotificationSettings({ smsNotificationsEnabled: checked });
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>รับ SMS อัปเดตสถานะคำร้องอัตโนมัติ</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          profile.smsUpdatesEnabled !== false 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {profile.smsUpdatesEnabled !== false ? 'เปิดรับ SMS' : 'ปิด'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        ส่งข้อความ SMS แจ้งเตือนไปยังเบอร์นี้เมื่อเจ้าหน้าที่อนุมัติหรือปรับสถานะคำร้อง
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (Email Address)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.email ? 'border-rose-500' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    LINE ID (สำหรับรับการแจ้งเตือน)
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="เช่น line_user_123"
                      value={profile.lineId || ''}
                      onChange={(e) => handleInputChange('lineId', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADDRESS */}
          {activeTab === 'address' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">ที่อยู่ตามทะเบียนบ้าน / ที่อยู่สำหรับจัดส่งเอกสาร</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ระบบจะรวมที่อยู่ให้แบบอัตโนมัติเพื่อระบุในหนังสือคำร้องและเอกสารอนุมัติทางราชการ
                    </p>
                  </div>
                </div>

                {profile.fullAddress && (
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedAddress ? 'คัดลอกแล้ว' : 'คัดลอกที่อยู่'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บ้านเลขที่ / ห้อง / ชั้น
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 123/45"
                    value={profile.houseNo || ''}
                    onChange={(e) => handleInputChange('houseNo', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมู่ที่ / หมู่บ้าน / อาคาร / ถนน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น หมู่บ้านเมืองทอง ถนนกวางด่าน"
                    value={profile.village || ''}
                    onChange={(e) => handleInputChange('village', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ตำบล / แขวง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ในเมือง"
                    value={profile.subDistrict || ''}
                    onChange={(e) => handleInputChange('subDistrict', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อำเภอ / เขต
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เมืองชัยภูมิ"
                    value={profile.district || ''}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จังหวัด
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ชัยภูมิ"
                    value={profile.province || ''}
                    onChange={(e) => handleInputChange('province', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสไปรษณีย์
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="เช่น 36000"
                    value={profile.postalCode || ''}
                    onChange={(e) => handleInputChange('postalCode', e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ที่อยู่รวมเต็มรูปแบบ (Auto-Preview)
                  </label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium min-h-[38px] flex items-center">
                    {profile.fullAddress || 'ยังไม่ได้ระบุรายละเอียดที่อยู่'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORK & ROLE */}
          {activeTab === 'work' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  ประเภทผู้ขอรับบริการ / ผู้ยื่นคำร้องหลัก
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'general_public', label: 'ประชาชนทั่วไป / ผู้อยู่อาศัยในเขตเทศบาล', desc: 'ขอรับบริการขอดูภาพกล้องวงจรปิดกรณีทรัพย์สินสูญหาย หรืออุบัติเหตุ' },
                    { id: 'student', label: 'นักเรียน / นักศึกษา / สถาบันการศึกษา', desc: 'ขอข้อมูลเพื่อการศึกษาวิจัยหรือเรื่องส่วนตัว' },
                    { id: 'staff', label: 'ข้าราชการ / พนักงานเทศบาล / บุคลากร', desc: 'ผู้ปฏิบัติงานสังกัดเทศบาลเมืองชัยภูมิ' },
                    { id: 'external_org', label: 'ผู้แทนหน่วยงานภายนอก / สถานีตำรวจ / บริษัท', desc: 'เจ้าหน้าที่ตำรวจ สภ.เมืองชัยภูมิ หรือหน่วยงานภาครัฐ/เอกชน' }
                  ].map((item) => (
                    <label
                      key={item.id}
                      onClick={() => handleInputChange('applicantRole', item.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        profile.applicantRole === item.id
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="applicantRole"
                        checked={profile.applicantRole === item.id}
                        onChange={() => {}}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สังกัด / หน่วยงาน / คณะ / ชุมชน
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="เช่น ชุมชนกวางด่าน เทศบาลเมืองชัยภูมิ"
                      value={profile.department || ''}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ตำแหน่ง / อาชีพ / สาขาวิชา
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="เช่น ค้าขาย / เจ้าของกิจการ"
                      value={profile.positionOrMajor || ''}
                      onChange={(e) => handleInputChange('positionOrMajor', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMERGENCY CONTACT */}
          {activeTab === 'emergency' && (
            <div className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <HeartHandshake className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">ผู้ติดต่อฉุกเฉิน (Emergency Contact)</h4>
                  <p className="mt-0.5 text-amber-800">
                    สำหรับติดต่อในกรณีฉุกเฉิน หรือติดตามผลคำร้องกรณีไม่สามารถติดต่อผู้ยื่นคำร้องหลักได้
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุล ผู้ติดต่อฉุกเฉิน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น นางสมศรี ใจดี"
                    value={profile.emergencyContactName || ''}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ความสัมพันธ์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คู่สมรส / บิดา / บุตร"
                    value={profile.emergencyRelation || ''}
                    onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ผู้ติดต่อฉุกเฉิน
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="เช่น 0898765432"
                    value={profile.emergencyContactPhone || ''}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>อัปเดตล่าสุด: {new Date(profile.updatedAt).toLocaleDateString('th-TH')}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}</span>
            </button>

            {onApplyToForm && (
              <button
                onClick={handleApplyAndClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>นำไปใส่แบบฟอร์มคำร้อง</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
