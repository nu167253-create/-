import React, { useState, useEffect } from 'react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  isNotificationSupported, 
  playNotificationChime,
  triggerBrowserNotification,
  getThaiStatusText,
  getNotificationSettings,
  saveNotificationSettings,
  findStalledRequests,
  StalledRequestInfo
} from '../utils/notificationService';
import { RequestItem } from '../types/request';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Play, 
  RefreshCw, 
  Clock,
  Smartphone,
  Phone,
  Edit2,
  Send,
  Check
} from 'lucide-react';
import { sendStatusSmsNotification } from '../utils/emailService';
import { getUserProfile, saveUserProfile } from '../utils/userProfileService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentStatusUpdates?: Array<{ item: RequestItem; oldStatus?: string; timestamp: Date }>;
  onTrackRequest?: (id: string) => void;
  allRequests?: RequestItem[];
  onTriggerFollowUp?: (item: RequestItem, daysPending: number) => void;
  onOpenProfileModal?: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  recentStatusUpdates = [],
  onTrackRequest,
  allRequests = [],
  onTriggerFollowUp,
  onOpenProfileModal
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [testSent, setTestSent] = useState<boolean>(false);
  const [followUpTestSent, setFollowUpTestSent] = useState<boolean>(false);
  
  // Follow-up reminders setting
  const [followUpEnabled, setFollowUpEnabled] = useState<boolean>(() => getNotificationSettings().followUpRemindersEnabled);
  const [stalledRequests, setStalledRequests] = useState<StalledRequestInfo[]>([]);

  // SMS Notification setting
  const [smsUpdatesEnabled, setSmsUpdatesEnabled] = useState<boolean>(() => getNotificationSettings().smsNotificationsEnabled ?? true);
  const [smsPhone, setSmsPhone] = useState<string>(() => {
    const s = getNotificationSettings();
    if (s.smsPhoneNumber) return s.smsPhoneNumber;
    return getUserProfile().phone || '081-234-5678';
  });
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [phoneEditInput, setPhoneEditInput] = useState<string>('');
  const [smsTestSent, setSmsTestSent] = useState<boolean>(false);
  const [smsTestMessage, setSmsTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      const settings = getNotificationSettings();
      setFollowUpEnabled(settings.followUpRemindersEnabled);
      setSoundEnabled(settings.soundEnabled);
      setSmsUpdatesEnabled(settings.smsNotificationsEnabled ?? true);
      const prof = getUserProfile();
      setSmsPhone(settings.smsPhoneNumber || prof.phone || '081-234-5678');
      
      // Calculate stalled requests (> 7 days)
      const stalled = findStalledRequests(allRequests, settings.followUpThresholdDays || 7);
      setStalledRequests(stalled);
    }
  }, [isOpen, allRequests]);

  if (!isOpen) return null;

  const handleToggleFollowUp = () => {
    const nextValue = !followUpEnabled;
    setFollowUpEnabled(nextValue);
    saveNotificationSettings({ followUpRemindersEnabled: nextValue });
  };

  const handleToggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    saveNotificationSettings({ soundEnabled: nextValue });
  };

  const handleToggleSmsUpdates = () => {
    const nextValue = !smsUpdatesEnabled;
    setSmsUpdatesEnabled(nextValue);
    saveNotificationSettings({ smsNotificationsEnabled: nextValue, smsPhoneNumber: smsPhone });

    // Synchronize with stored user profile
    const currentProfile = getUserProfile();
    if (currentProfile) {
      saveUserProfile({ ...currentProfile, smsUpdatesEnabled: nextValue }, false);
    }
  };

  const handleStartEditPhone = () => {
    setPhoneEditInput(smsPhone);
    setIsEditingPhone(true);
  };

  const handleSavePhone = () => {
    const clean = phoneEditInput.trim();
    if (!clean) return;
    setSmsPhone(clean);
    setIsEditingPhone(false);
    saveNotificationSettings({ smsPhoneNumber: clean });

    const currentProfile = getUserProfile();
    if (currentProfile) {
      saveUserProfile({ ...currentProfile, phone: clean, smsPhone: clean }, false);
    }
  };

  const handleTestSmsNotification = (targetStatus: 'approved' | 'completed' = 'approved') => {
    const recipient = smsPhone || getUserProfile().phone || '081-234-5678';
    const testReq: RequestItem = {
      id: `REQ-SMS-${Math.floor(100000 + Math.random() * 900000)}`,
      title: 'คำร้องขอดูภาพกล้องวงจรปิด CCTV บริเวณสี่แยกไฟแดง (ทดสอบระบบ SMS)',
      category: 'cctv',
      status: targetStatus,
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      applicant: {
        prefix: 'นาย',
        fullName: getUserProfile().fullName || 'ผู้ยื่นคำร้อง',
        citizenIdOrCode: getUserProfile().citizenId || '3360100234567',
        email: getUserProfile().email || 'citizen@chaiyaphum.go.th',
        phone: recipient,
        department: 'ประชาชนทั่วไป',
        positionOrMajor: 'ประชาชน'
      },
      details: {},
      attachments: [],
      statusHistory: [],
      reason: 'ทดสอบการส่งข้อความ SMS แจ้งเตือนเมื่อมีการอัปเดตสถานะคำร้อง'
    };

    sendStatusSmsNotification(
      testReq,
      targetStatus,
      'ทดสอบระบบส่ง SMS แจ้งเตือนสถานะคำร้องอัตโนมัติ',
      true // forceSend: true so test button always dispatches test log
    );

    if (soundEnabled) playNotificationChime();
    setSmsTestSent(true);
    setSmsTestMessage(`ส่ง SMS แจ้งเตือนสถานะ "${getThaiStatusText(targetStatus)}" ไปยังเบอร์ ${recipient} สำเร็จแล้ว`);
    setTimeout(() => {
      setSmsTestSent(false);
      setSmsTestMessage(null);
    }, 4500);
  };

  const handleTriggerStalledReminder = (item: RequestItem, days: number) => {
    if (onTriggerFollowUp) {
      onTriggerFollowUp(item, days);
    }
    if (soundEnabled) playNotificationChime();
    setFollowUpTestSent(true);
    setTimeout(() => setFollowUpTestSent(false), 3000);
  };

  const handleTestFollowUpReminder = () => {
    if (stalledRequests.length > 0) {
      handleTriggerStalledReminder(stalledRequests[0].item, stalledRequests[0].daysPending);
    } else {
      // Mock item with stagnant status > 7 days
      const mockStalledItem: RequestItem = {
        id: `REQ-CCTV-REMINDER-${Math.floor(100 + Math.random() * 900)}`,
        title: 'คำร้องขอดูภาพกล้องวงจรปิด CCTV สี่แยกไฟแดง (ไม่มีความเคลื่อนไหว 8 วัน)',
        category: 'cctv',
        status: 'under_review',
        priority: 'urgent',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        applicant: {
          prefix: 'นาย',
          fullName: 'สมศักดิ์ มั่นคง',
          citizenIdOrCode: '3360100987654',
          email: 'somsak@example.com',
          phone: '0891234567',
          department: 'ประชาชนทั่วไป',
          positionOrMajor: 'ประชาชน'
        },
        details: {},
        attachments: [],
        statusHistory: [
          {
            status: 'under_review',
            timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            actor: 'เจ้าหน้าที่ศูนย์ควบคุม CCTV',
            note: 'รับเรื่องและกำลังตรวจสอบจุดติดตั้งกล้อง'
          }
        ],
        reason: 'ทดสอบการแจ้งเตือนติดตามเรื่องเมื่อคำร้องไม่มีการเคลื่อนไหวเกิน 7 วัน'
      };
      if (onTriggerFollowUp) {
        onTriggerFollowUp(mockStalledItem, 8);
      }
      if (soundEnabled) playNotificationChime();
      setFollowUpTestSent(true);
      setTimeout(() => setFollowUpTestSent(false), 3000);
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      playNotificationChime();
    }
  };

  const handleSendTestNotification = (targetStatus: 'approved' | 'completed' = 'approved') => {
    const demoItem: RequestItem = {
      id: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
      title: 'คำร้องขอดูภาพกล้องวงจรปิด CCTV จุดสี่แยกบายพาส',
      category: 'cctv',
      status: targetStatus,
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      applicant: {
        prefix: 'นาย',
        fullName: 'ผู้ขอทดสอบการแจ้งเตือน',
        citizenIdOrCode: '1234567890123',
        email: 'test@example.com',
        phone: '0812345678',
        department: 'ประชาชนทั่วไป',
        positionOrMajor: 'ประชาชน'
      },
      details: {},
      attachments: [],
      statusHistory: [],
      reason: 'ทดสอบระบบแจ้งเตือน Service Worker เมื่อสถานะเปลี่ยนเป็น ' + targetStatus
    };

    void triggerBrowserNotification(demoItem);
    if (soundEnabled) playNotificationChime();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                การตั้งค่าระบบแจ้งเตือน (Notifications)
              </h3>
              <p className="text-xs text-slate-500">
                รับการแจ้งเตือนแบบเรียลไทม์เมื่อเจ้าหน้าที่อัปเดตสถานะคำร้อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Notification Status Card */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                สถานะการแจ้งเตือนบนเดสก์ท็อป/เบราว์เซอร์
              </span>
              {permission === 'granted' ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  เปิดใช้งานแล้ว (Granted)
                </span>
              ) : permission === 'denied' ? (
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ถูกปฏิเสธ (Denied)
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                  <BellOff className="w-3.5 h-3.5" />
                  ยังไม่ได้ขออนุญาต (Default)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              เมื่อเปิดการแจ้งเตือน ระบบจะส่ง Pop-up Notification ไปยังหน้าจอของคุณทันทีที่คำร้องเปลี่ยนสถานะ แม้ว่าคุณจะเปิดสลับแท็บไปทำงานอื่น
            </p>

            {permission !== 'granted' && (
              <button
                onClick={handleEnableNotifications}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                <span>ขออนุญาตเปิดการแจ้งเตือนบนเบราว์เซอร์ (Enable Web Notifications)</span>
              </button>
            )}

            {permission === 'granted' && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSendTestNotification('approved')}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs py-2 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ทดสอบแจ้งเตือน: อนุมัติแล้ว (Approved)</span>
                  </button>

                  <button
                    onClick={() => handleSendTestNotification('completed')}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs py-2 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-600" />
                    <span>ทดสอบแจ้งเตือน: เสร็จสิ้น (Completed)</span>
                  </button>

                  <button
                    onClick={() => handleToggleSound()}
                    className={`text-xs flex items-center gap-1 ml-auto px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      soundEnabled 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                    title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{soundEnabled ? 'เสียงเปิดอยู่' : 'ปิดเสียง'}</span>
                  </button>
                </div>
                {testSent && (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    ✓ ส่งการแจ้งเตือน Service Worker สำเร็จแล้ว
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SMS Status Updates Card */}
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-sky-50/60 rounded-2xl p-4 border border-blue-200/90 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      แจ้งเตือนผ่านข้อความ SMS (SMS Status Updates)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      smsUpdatesEnabled 
                        ? 'bg-blue-200 text-blue-900 border border-blue-300' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {smsUpdatesEnabled ? 'เปิดใช้งาน (SMS Active)' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    ส่งข้อความ SMS แจ้งเตือนความคืบหน้าตรงเข้าโทรศัพท์มือถือเมื่อคำร้องมีการเปลี่ยนสถานะ เช่น ได้รับอนุมัติ, ตรวจสอบแล้วเสร็จ หรือปิดงาน
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                id="toggle-sms-notifications"
                type="button"
                role="switch"
                aria-checked={smsUpdatesEnabled}
                onClick={handleToggleSmsUpdates}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  smsUpdatesEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                title={smsUpdatesEnabled ? 'คลิกเพื่อปิดการแจ้งเตือน SMS' : 'คลิกเพื่อเปิดการแจ้งเตือน SMS'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    smsUpdatesEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded SMS Controls when Enabled */}
            {smsUpdatesEnabled && (
              <div className="pt-3 border-t border-blue-200/70 space-y-3">
                {/* Recipient Phone Configuration */}
                <div className="bg-white/90 p-3 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        หมายเลขโทรศัพท์ที่ใช้รับ SMS:
                      </span>
                      {isEditingPhone ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="tel"
                            id="sms-phone-edit-input"
                            value={phoneEditInput}
                            onChange={(e) => setPhoneEditInput(e.target.value)}
                            placeholder="เช่น 0812345678"
                            className="text-xs px-2.5 py-1 bg-white border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={handleSavePhone}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Check className="w-3 h-3" /> บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingPhone(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] px-2 py-1 rounded-lg font-medium cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {smsPhone || 'ยังไม่ได้ระบุเบอร์โทรศัพท์'}
                          </span>
                          <button
                            type="button"
                            onClick={handleStartEditPhone}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> แก้ไขหมายเลข
                          </button>
                          {onOpenProfileModal && (
                            <button
                              type="button"
                              onClick={onOpenProfileModal}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 underline cursor-pointer"
                            >
                              (จัดการในโปรไฟล์ผู้ใช้)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 sm:text-right">
                    <span>ช่องทางแจ้งเตือน: </span>
                    <span className="font-bold text-emerald-600">พร้อมรับข้อความ SMS ทันที</span>
                  </div>
                </div>

                {/* Test SMS Notification Buttons */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="btn-test-sms-approved"
                      onClick={() => handleTestSmsNotification('approved')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ทดสอบส่ง SMS (สถานะ: ได้รับอนุมัติ)</span>
                    </button>

                    <button
                      type="button"
                      id="btn-test-sms-completed"
                      onClick={() => handleTestSmsNotification('completed')}
                      className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-semibold text-xs py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ทดสอบส่ง SMS (สถานะ: ดำเนินการเสร็จสิ้น)</span>
                    </button>
                  </div>

                  {smsTestSent && smsTestMessage && (
                    <div className="text-[11px] text-blue-800 font-medium flex items-center gap-1.5 bg-blue-100/80 border border-blue-200 px-3 py-1.5 rounded-xl animate-fade-in">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{smsTestMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Follow-up Reminders Card (> 7 Days Stalled Status) */}
          <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/60 rounded-2xl p-4 border border-amber-200/90 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      แจ้งเตือนติดตามเรื่อง (Follow-up Reminders)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      followUpEnabled 
                        ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {followUpEnabled ? 'เปิดใช้งาน (เกณฑ์ 7 วัน)' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    ส่งการแจ้งเตือนในระบบ (In-app notification) ทันทีหากคำร้องไม่มีการเปลี่ยนสถานะหรือไม่มีความเคลื่อนไหวนานเกิน 7 วัน
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                id="toggle-followup-reminders"
                type="button"
                role="switch"
                aria-checked={followUpEnabled}
                onClick={handleToggleFollowUp}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  followUpEnabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                title={followUpEnabled ? 'คลิกเพื่อปิดการแจ้งเตือนติดตามเรื่อง' : 'คลิกเพื่อเปิดการแจ้งเตือนติดตามเรื่อง'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    followUpEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Follow-up Details when enabled */}
            {followUpEnabled && (
              <div className="pt-2 border-t border-amber-200/70 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>คำร้องที่สถานะค้างเกิน 7 วันขณะนี้:</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${
                    stalledRequests.length > 0 
                      ? 'bg-amber-200 text-amber-950 font-mono border border-amber-300' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {stalledRequests.length > 0 ? `${stalledRequests.length} คำร้อง` : '✓ ไม่มีคำร้องค้างเกิน 7 วัน'}
                  </span>
                </div>

                {stalledRequests.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {stalledRequests.map(({ item, daysPending, statusText }) => (
                      <div
                        key={item.id}
                        className="bg-white/95 p-2.5 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-900">{item.id}</span>
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              ค้าง {daysPending} วัน
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({statusText})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate mt-0.5">{item.title}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTriggerStalledReminder(item, daysPending)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="แสดงการแจ้งเตือนสำหรับคำร้องนี้"
                          >
                            <Bell className="w-3 h-3" />
                            <span>แจ้งเตือน</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Test Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestFollowUpReminder}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold text-xs py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>ทดสอบแจ้งเตือนติดตามเรื่อง (Test Follow-up Notification)</span>
                  </button>
                  {followUpTestSent && (
                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1 animate-fade-in">
                      ✓ แสดงการแจ้งเตือนในระบบ (In-app) เรียบร้อยแล้ว
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recent Status Updates List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ประวัติการแจ้งเตือนล่าสุด ({recentStatusUpdates.length})
            </h4>

            {recentStatusUpdates.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200">
                ยังไม่มีการแจ้งเตือนเปลี่ยนสถานะใหม่ในเซสชันนี้
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {recentStatusUpdates.map((update, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700">{update.item.id}</span>
                        <span className="text-[10px] text-slate-400">
                          {update.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 truncate font-medium">{update.item.title}</p>
                      <p className="text-[11px] text-emerald-700">
                        สถานะใหม่: {getThaiStatusText(update.item.status)}
                      </p>
                    </div>

                    {onTrackRequest && (
                      <button
                        onClick={() => {
                          onTrackRequest(update.item.id);
                          onClose();
                        }}
                        className="shrink-0 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                      >
                        ดูสถานะ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
