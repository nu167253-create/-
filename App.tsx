import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { CategorySelector } from './components/CategorySelector';
import { RequestForm } from './components/RequestForm';
import { TrackingSearch } from './components/TrackingSearch';
import { MyRequests } from './components/MyRequests';
import { OfficerPortal } from './components/OfficerPortal';
import { FaqSection } from './components/FaqSection';
import { CctvDashboard } from './components/CctvDashboard';
import { OfficialDocumentPrint } from './components/OfficialDocumentPrint';
import { GoogleDriveManagerModal } from './components/GoogleDriveManagerModal';
import { GoogleFormsManagerModal } from './components/GoogleFormsManagerModal';
import { LineShareButton } from './components/LineShareButton';
import { SubmissionFeedbackSection } from './components/SubmissionFeedbackSection';
import { PublicActivityFeed } from './components/PublicActivityFeed';
import { StepProgressIndicator } from './components/StepProgressIndicator';
import { SaveToKeepButton } from './components/SaveToKeepButton';
import { AttachmentGallery } from './components/AttachmentGallery';
import { RequestCategory, RequestItem, RequestStatus } from './types/request';
import { CctvCamera } from './types/cctv';
import { getStoredRequests, saveStoredRequests } from './utils/storage';
import { subscribeToFirestoreRequests, syncLocalRequestsToFirestore } from './utils/firestoreService';
import { runAutomated90DayArchival } from './utils/archiveService';
import { getQueuedOfflineRequestIds } from './utils/offlineSync';
import { 
  triggerBrowserNotification, 
  playNotificationChime, 
  getNotificationSettings, 
  findStalledRequests 
} from './utils/notificationService';
import { StatusNotificationToast, ActiveNotificationData } from './components/StatusNotificationToast';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { CheckCircle2, Search, Printer, ArrowRight, Sparkles, Mail, ShieldCheck, Video } from 'lucide-react';

import { OfficerLoginModal } from './components/OfficerLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ShareAppModal } from './components/ShareAppModal';
import { hasUserAcceptedPrivacyPolicy, getPrivacyPolicyConsent, savePrivacyPolicyConsent, PrivacyPolicyConsent } from './utils/privacyService';
import { OfficerUser, getStoredOfficerUser, logoutOfficer } from './utils/officerAuth';
import { GeminiAssistantView } from './components/GeminiAssistantView';
import { AuthUserData, getStoredAuthUser, subscribeToAuthState } from './utils/firebaseAuthService';
import { AttachmentFile } from './types/request';
import { Bot, Globe } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'submit' | 'track' | 'my_requests' | 'cctv' | 'officer' | 'faq' | 'assistant'>('submit');
  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(undefined);
  const [isOfficerMode, setIsOfficerMode] = useState(false);
  const [createdItem, setCreatedItem] = useState<RequestItem | null>(null);
  const [showPrintForCreatedItem, setShowPrintForCreatedItem] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isFormsModalOpen, setIsFormsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAiAssistantModalOpen, setIsAiAssistantModalOpen] = useState(false);
  const [pendingFormAttachments, setPendingFormAttachments] = useState<AttachmentFile[]>([]);

  // Auth User State
  const [authUser, setAuthUser] = useState<AuthUserData | null>(getStoredAuthUser());

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => setAuthUser(u));
    return () => unsub();
  }, []);

  // Officer Authentication state
  const [officerUser, setOfficerUser] = useState<OfficerUser | null>(getStoredOfficerUser());
  const [isOfficerLoginOpen, setIsOfficerLoginOpen] = useState(false);

  // Prefilled form state for camera repair
  const [prefilledData, setPrefilledData] = useState<{ title?: string; reason?: string; dynamicFields?: Record<string, any> } | null>(null);

  // Notification states & refs for real-time status updates
  const previousStatusesRef = useRef<Record<string, RequestStatus>>({});
  const isInitialLoadRef = useRef<boolean>(true);
  const [activeNotification, setActiveNotification] = useState<ActiveNotificationData | null>(null);
  const [recentUpdatesHistory, setRecentUpdatesHistory] = useState<Array<{
    item: RequestItem;
    oldStatus?: RequestStatus;
    timestamp: Date;
  }>>([]);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

  // Privacy Policy & Terms of Service State
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isFirstVisitPrivacy, setIsFirstVisitPrivacy] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState<PrivacyPolicyConsent>(() => getPrivacyPolicyConsent());
  const [showPdpaBottomBar, setShowPdpaBottomBar] = useState(false);

  // Share Web Link & QR Code Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Google Maps Quota Exceeded State
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Check on initial visit if citizen has accepted PDPA & CCTV privacy policy (Non-blocking bottom bar for all web link visitors)
  useEffect(() => {
    if (!hasUserAcceptedPrivacyPolicy()) {
      setShowPdpaBottomBar(true);
    }
  }, []);

  // Check for requests whose status hasn't moved for more than 7 days (Follow-up Reminders)
  const checkFollowUpReminders = useCallback((reqList: RequestItem[]) => {
    const settings = getNotificationSettings();
    if (!settings.followUpRemindersEnabled) return;

    const stalled = findStalledRequests(reqList, settings.followUpThresholdDays || 7);
    if (stalled.length > 0) {
      const sessionKey = 'cctv_follow_up_reminded_session';
      const alreadyReminded = sessionStorage.getItem(sessionKey);
      if (!alreadyReminded) {
        sessionStorage.setItem(sessionKey, 'true');
        const topStalled = stalled[0];
        setActiveNotification({
          item: topStalled.item,
          timestamp: new Date(),
          type: 'follow_up_reminder',
          daysPending: topStalled.daysPending
        });
        if (settings.soundEnabled) {
          playNotificationChime();
        }
      }
    }
  }, []);

  // Run follow-up reminder check on initial app load after brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentReqs = getStoredRequests();
      checkFollowUpReminders(currentReqs);
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkFollowUpReminders]);

  // Listen to notification settings changes (e.g. user toggles on Follow-up Reminders in settings modal)
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      const updated = e.detail;
      if (updated?.followUpRemindersEnabled) {
        const currentReqs = getStoredRequests();
        const stalled = findStalledRequests(currentReqs, updated.followUpThresholdDays || 7);
        if (stalled.length > 0) {
          const topStalled = stalled[0];
          setActiveNotification({
            item: topStalled.item,
            timestamp: new Date(),
            type: 'follow_up_reminder',
            daysPending: topStalled.daysPending
          });
          if (updated.soundEnabled) {
            playNotificationChime();
          }
        }
      }
    };
    window.addEventListener('notification_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('notification_settings_changed', handleSettingsChange);
  }, []);

  // Check URL parameters & custom notification click events for deep linked tracking IDs and tabs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('trackId') || params.get('track');
    if (trackId) {
      setSelectedTrackId(trackId);
      setActiveTab('track');
    }

    const tabParam = params.get('tab');
    if (tabParam && ['submit', 'track', 'my_requests', 'cctv', 'officer', 'faq', 'assistant'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }

    const catParam = params.get('category');
    if (catParam) {
      setSelectedCategory(catParam as any);
      setActiveTab('submit');
    }

    const handleCustomTrackEvent = (e: any) => {
      if (e.detail && e.detail.trackId) {
        setSelectedTrackId(e.detail.trackId);
        setActiveTab('track');
      }
    };

    window.addEventListener('track-request-event', handleCustomTrackEvent);
    return () => window.removeEventListener('track-request-event', handleCustomTrackEvent);
  }, []);

  // Subscribe to real-time Firestore updates and detect status changes
  useEffect(() => {
    // Perform initial push if Firestore is empty
    const localReqs = getStoredRequests();
    syncLocalRequestsToFirestore(localReqs);

    // Run background automated 90-day archival to keep active database performant
    runAutomated90DayArchival(false).catch(err => console.warn('Automated archive check error:', err));

    const unsubscribe = subscribeToFirestoreRequests((firestoreRequests) => {
      if (firestoreRequests && firestoreRequests.length > 0) {
        // Merge with any requests queued locally that haven't synced yet
        const queuedIds = getQueuedOfflineRequestIds();
        const localCurrent = getStoredRequests();
        const queuedItems = localCurrent.filter(r => queuedIds.includes(r.id));
        const merged = [...firestoreRequests];
        queuedItems.forEach(qItem => {
          if (!merged.some(m => m.id === qItem.id)) {
            merged.unshift(qItem);
          }
        });

        saveStoredRequests(merged);
        const pending = merged.filter(
          (r) => r.status === 'submitted' || r.status === 'under_review'
        ).length;
        setPendingCount(pending);

        // Detect real-time status updates in Firestore
        if (isInitialLoadRef.current) {
          const initialMap: Record<string, RequestStatus> = {};
          firestoreRequests.forEach((req) => {
            initialMap[req.id] = req.status;
          });
          previousStatusesRef.current = initialMap;
          isInitialLoadRef.current = false;
        } else {
          // Compare each request status with previous snapshot
          firestoreRequests.forEach((req) => {
            const oldStatus = previousStatusesRef.current[req.id];
            if (oldStatus && oldStatus !== req.status) {
              // Status changed in Firestore! Trigger browser notification & toast
              triggerBrowserNotification(req, oldStatus);
              playNotificationChime();

              const updateData = {
                item: req,
                oldStatus,
                timestamp: new Date()
              };

              setActiveNotification(updateData);
              setRecentUpdatesHistory((prev) => [updateData, ...prev.slice(0, 19)]);
            }
            previousStatusesRef.current[req.id] = req.status;
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const list = getStoredRequests();
    const pending = list.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
    setPendingCount(pending);
  }, [activeTab, createdItem]);

  const handleSelectCategory = (cat: RequestCategory) => {
    setSelectedCategory(cat);
    setCreatedItem(null);
  };

  const handleFormSubmitSuccess = (newItem: RequestItem) => {
    setCreatedItem(newItem);
    setSelectedCategory(null);
    setPrefilledData(null);
  };

  const handleTrackFromMyRequests = (id: string) => {
    setSelectedTrackId(id);
    setActiveTab('track');
  };

  const handleReportRepairForCamera = (camera: CctvCamera) => {
    setPrefilledData({
      title: `แจ้งซ่อมกล้องวงจรปิด [${camera.id}]: ${camera.name}`,
      reason: `ขอแจ้งซ่อมแซมกล้องวงจรปิด รหัส ${camera.id} (ติดตั้ง ณ ${camera.building} - ${camera.floor} โซน ${camera.zone}, IP: ${camera.ipAddress})\nเนื่องจากพบอาการชำรุด/ขัดข้อง: ${camera.notes || 'สัญญาณขาดหาย ไม่สามารถรับภาพวิดีโอได้'}`,
      dynamicFields: {
        equipmentType: `กล้องวงจรปิด CCTV (${camera.type.toUpperCase()})`,
        location: `${camera.building} ${camera.floor} โซน ${camera.zone}`
      }
    });
    setSelectedCategory('maintenance');
    setActiveTab('submit');
  };

  const handleFileCctvRequestForCamera = (camera: CctvCamera) => {
    setPrefilledData({
      title: `ขอดูภาพจากกล้องวงจรปิด [${camera.id}]: ${camera.name}`,
      reason: `มีความประสงค์ขอความอนุเคราะห์ดู/ขอสำเนาไฟล์ภาพจากกล้องวงจรปิด CCTV รหัส ${camera.id} (${camera.name}) ติดตั้ง ณ ${camera.building} - ${camera.floor} โซน ${camera.zone}\nพิกัดภูมิศาสตร์: ${camera.latitude || '13.84751'}, ${camera.longitude || '100.56910'}`,
      dynamicFields: {
        cctvLocation: `${camera.name} (${camera.building} โซน ${camera.zone})`,
        copyLocation: `กล้องรหัส ${camera.id} - ${camera.name}`,
        cameraStatus: camera.status === 'online' ? 'ปกติ' : 'ชำรุด/ขัดข้อง',
        purpose: 'เพื่อใช้เป็นหลักฐานประกอบการดำเนินการและติดตามเหตุการณ์'
      }
    });
    setSelectedCategory('cctv');
    setActiveTab('submit');
  };

  const handleAttachImageToForm = (dataUrl: string, fileName: string) => {
    const newAttachment: AttachmentFile = {
      id: `ai-diag-${Date.now()}`,
      name: fileName,
      size: '1.2 MB',
      type: 'image/png',
      uploadedAt: new Date().toISOString(),
      dataUrl,
      documentCategory: 'evidence_photo',
      description: 'ภาพจำลองแผนผังจุดเกิดเหตุสร้างด้วย Gemini AI'
    };
    setPendingFormAttachments((prev) => [...prev, newAttachment]);
    if (!selectedCategory) {
      setSelectedCategory('cctv');
    }
    setActiveTab('submit');
    setIsAiAssistantModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-200 selection:text-blue-900">
      {/* Google Maps Quota Notice Banner */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'officer' && !officerUser) {
            setIsOfficerLoginOpen(true);
          } else {
            setActiveTab(tab);
            setCreatedItem(null);
            if (tab !== 'track') setSelectedTrackId(undefined);
          }
        }}
        isOfficerMode={isOfficerMode}
        setIsOfficerMode={setIsOfficerMode}
        pendingCount={pendingCount}
        onOpenDrive={() => setIsDriveModalOpen(true)}
        onOpenForms={() => setIsFormsModalOpen(true)}
        officerUser={officerUser}
        onOpenOfficerLogin={() => setIsOfficerLoginOpen(true)}
        onOfficerLogout={async () => {
          await logoutOfficer();
          setOfficerUser(null);
          setIsOfficerMode(false);
          if (activeTab === 'officer') setActiveTab('submit');
        }}
        onOpenNotifications={() => setIsNotificationSettingsOpen(true)}
        unreadNotificationsCount={recentUpdatesHistory.length}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenPrivacy={() => {
          setIsFirstVisitPrivacy(false);
          setIsPrivacyModalOpen(true);
        }}
        onOpenShare={() => setIsShareModalOpen(true)}
      />

      {/* System Announcement Banner */}
      <AnnouncementBanner isOfficerMode={isOfficerMode} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* SUBMIT TAB */}
        {activeTab === 'submit' && (
          <>
            {/* SUCCESS SUBMISSION CARD */}
            {createdItem ? (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-emerald-200 shadow-xl text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ยื่นคำร้องสำเร็จแล้ว
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    บันทึกคำร้องออนไลน์เรียบร้อยแล้ว
                  </h2>
                  <p className="text-xs text-slate-600">
                    เจ้าหน้าที่งานสารบรรณได้รับข้อมูลเรียบร้อยแล้ว ท่านสามารถใช้รหัสติดตามด้านล่างนี้ในการตรวจสอบสถานะ
                  </p>
                </div>

                {/* Tracking ID Box */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-1 shadow-inner">
                  <span className="text-[11px] text-slate-400 font-medium">รหัสติดตามคำร้อง (Tracking ID)</span>
                  <div className="font-mono font-extrabold text-2xl tracking-wider text-amber-400 select-all">
                    {createdItem.id}
                  </div>
                  <span className="text-[10px] text-slate-400 block pt-1">
                    (บันทึกรหัสนี้ไว้สำหรับติดตามสถานะการพิจารณา)
                  </span>
                </div>

                {/* Visual Workflow Progress Stepper (Submitted -> Reviewing -> Approved -> Completed) */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left space-y-3 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        ลำดับขั้นตอนการพิจารณา (Workflow Progress)
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      สถานะ: ยื่นคำร้องแล้ว (Submitted)
                    </span>
                  </div>

                  <StepProgressIndicator
                    status={createdItem.status}
                    statusHistory={createdItem.statusHistory}
                    createdAt={createdItem.createdAt}
                    updatedAt={createdItem.updatedAt}
                    showDetails={false}
                    className="pt-1 pb-1"
                  />

                  <div className="bg-white/90 rounded-xl p-3 border border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                    <span className="text-[11px] text-slate-600 leading-relaxed">
                      💡 คำร้องของท่านจะถูกส่งต่อไปยังขั้นตอน <strong>"อยู่ระหว่างตรวจสอบ (Reviewing)"</strong> โดยเจ้าหน้าที่ภายในวันทำการ
                    </span>
                  </div>
                </div>

                {/* Simulated Email Notification Status */}
                {createdItem.applicant?.email ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950">ส่งอีเมลยืนยันคำร้องเรียบร้อยแล้ว (Simulated Email Confirmation)</span>
                        <span className="bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Auto Triggered
                        </span>
                      </div>
                      <p className="text-emerald-800">
                        ระบบส่งอีเมลยืนยันพร้อมรหัสติดตามไปยัง <strong className="font-mono text-emerald-950 font-bold">{createdItem.applicant?.email}</strong> สำเร็จ
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-amber-950">ไม่ได้ระบุอีเมลติดต่อ</span>
                      <p className="text-amber-800">
                        คุณไม่ได้กรอกอีเมลติดต่อ (Optional) สามารถใช้รหัส <strong className="font-mono font-bold text-amber-950">{createdItem.id}</strong> ในการตรวจสอบสถานะคำร้องผ่านเมนูติดตามสถานะได้ตลอดเวลา
                      </p>
                    </div>
                  </div>
                )}

                {/* Attached Files Summary */}
                {createdItem.attachments && createdItem.attachments.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        เอกสารและหลักฐานที่แนบมากับคำร้อง ({createdItem.attachments.length} ไฟล์)
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        อัปโหลดสำเร็จ
                      </span>
                    </div>

                    <AttachmentGallery
                      attachments={createdItem.attachments}
                      variant="compact"
                    />
                  </div>
                )}

                {/* Service Quality Feedback Section */}
                <SubmissionFeedbackSection
                  request={createdItem}
                  onFeedbackSaved={(updated) => setCreatedItem(updated)}
                />

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <SaveToKeepButton request={createdItem} />
                  <LineShareButton request={createdItem} />

                  <button
                    onClick={() => setShowPrintForCreatedItem(true)}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
                  >
                    <Printer className="w-4 h-4 text-blue-300" />
                    พิมพ์ใบบันทึกคำร้อง / PDF
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTrackId(createdItem.id);
                      setActiveTab('track');
                      setCreatedItem(null);
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    ติดตามสถานะคำร้องนี้
                  </button>

                  <button
                    onClick={() => {
                      setCreatedItem(null);
                      setSelectedCategory(null);
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
                  >
                    ยื่นคำร้องเพิ่มอีกเรื่อง
                  </button>
                </div>

                {showPrintForCreatedItem && (
                  <OfficialDocumentPrint
                    request={createdItem}
                    onBack={() => setShowPrintForCreatedItem(false)}
                    onOpenDrive={() => setIsDriveModalOpen(true)}
                  />
                )}
              </div>
            ) : selectedCategory ? (
              <RequestForm
                category={selectedCategory}
                onBack={() => {
                  setSelectedCategory(null);
                  setPrefilledData(null);
                }}
                onSubmitSuccess={handleFormSubmitSuccess}
                initialTitle={prefilledData?.title}
                initialReason={prefilledData?.reason}
                initialDynamicFields={prefilledData?.dynamicFields}
                initialAttachments={pendingFormAttachments}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                onOpenAiAssistant={() => setIsAiAssistantModalOpen(true)}
                onOpenPrivacyModal={() => {
                  setIsFirstVisitPrivacy(false);
                  setIsPrivacyModalOpen(true);
                }}
              />
            ) : (
              <div className="space-y-12">
                <CategorySelector onSelectCategory={handleSelectCategory} />
                <PublicActivityFeed onSelectTrack={handleTrackFromMyRequests} />
              </div>
            )}
          </>
        )}

        {/* TRACK STATUS TAB */}
        {activeTab === 'track' && (
          <TrackingSearch initialSearchId={selectedTrackId} />
        )}

        {/* MY REQUESTS TAB */}
        {activeTab === 'my_requests' && (
          <MyRequests
            onSelectTrack={handleTrackFromMyRequests}
            onNewRequestClick={() => {
              setActiveTab('submit');
              setSelectedCategory(null);
              setPrefilledData(null);
            }}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
        )}

        {/* CCTV MONITORING & REPORT TAB */}
        {activeTab === 'cctv' && (
          <CctvDashboard
            onReportRepairForCamera={handleReportRepairForCamera}
            onRequestCctvForCamera={handleFileCctvRequestForCamera}
            isOfficerMode={isOfficerMode}
            onViewRequest={handleTrackFromMyRequests}
          />
        )}

        {/* GEMINI AI ASSISTANT TAB */}
        {activeTab === 'assistant' && (
          <GeminiAssistantView
            authUser={authUser}
            onAttachImageToForm={handleAttachImageToForm}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* OFFICER PORTAL TAB */}
        {activeTab === 'officer' && (
          <OfficerPortal
            officerUser={officerUser}
            onOpenOfficerLogin={() => setIsOfficerLoginOpen(true)}
            onOfficerLogout={async () => {
              await logoutOfficer();
              setOfficerUser(null);
              setIsOfficerMode(false);
              if (activeTab === 'officer') setActiveTab('submit');
            }}
          />
        )}

        {/* FAQ TAB */}
        {activeTab === 'faq' && <FaqSection />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 no-print mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="font-semibold text-slate-200">
                ระบบบริการคำร้องออนไลน์ (Online Request Form & Status Tracking System)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                พัฒนาขึ้นเพื่ออำนวยความสะดวกในการยื่นเรื่อง ติดตามสถานะ และออกเอกสารรับรองออนไลน์ตามมาตรฐานงานสารบรรณดิจิทัล
              </p>
            </div>

            {/* Privacy Policy & CCTV Compliance Quick Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-xs">
              <button
                type="button"
                id="footer-btn-privacy-policy"
                onClick={() => {
                  setIsFirstVisitPrivacy(false);
                  setIsPrivacyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-[11px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>นโยบายความเป็นส่วนตัว & เงื่อนไขบริการ (PDPA & Terms)</span>
              </button>

              <button
                type="button"
                id="footer-btn-cctv-policy"
                onClick={() => {
                  setIsFirstVisitPrivacy(false);
                  setIsPrivacyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-[11px]"
              >
                <Video className="w-3.5 h-3.5 text-blue-400" />
                <span>การจัดการภาพ CCTV</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>ระบบสอดคล้องตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA Compliant)</span>
              {privacyConsent.hasAccepted && (
                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                  ✓ ยืนยันความยินยอมแล้ว
                </span>
              )}
            </div>
            <div>
              © 2026 E-Petitions System. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Google Drive Workspace Integration Modal */}
      <GoogleDriveManagerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentRequest={createdItem}
      />

      {/* Google Forms Workspace Integration Modal */}
      <GoogleFormsManagerModal
        isOpen={isFormsModalOpen}
        onClose={() => setIsFormsModalOpen(false)}
        currentRequest={createdItem}
      />

      {/* Officer Authentication Modal */}
      <OfficerLoginModal
        isOpen={isOfficerLoginOpen}
        onClose={() => setIsOfficerLoginOpen(false)}
        onLoginSuccess={(user) => {
          setOfficerUser(user);
          setIsOfficerMode(true);
          setActiveTab('officer');
        }}
      />

      {/* Real-time Status Update Floating Toast Notification */}
      <StatusNotificationToast
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
        onTrackRequest={(trackId) => {
          setSelectedTrackId(trackId);
          setActiveTab('track');
        }}
      />

      {/* Real-time Notification Settings & History Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
        recentStatusUpdates={recentUpdatesHistory}
        allRequests={getStoredRequests()}
        onTriggerFollowUp={(item, daysPending) => {
          setActiveNotification({
            item,
            timestamp: new Date(),
            type: 'follow_up_reminder',
            daysPending
          });
        }}
        onTrackRequest={(trackId) => {
          setSelectedTrackId(trackId);
          setActiveTab('track');
        }}
        onOpenProfileModal={() => {
          setIsNotificationSettingsOpen(false);
          setIsProfileModalOpen(true);
        }}
      />

      {/* User Profile Management Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Floating Gemini AI Assistant Launcher Button */}
      {activeTab !== 'assistant' && (
        <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col items-end gap-2">
          <button
            onClick={() => setIsAiAssistantModalOpen(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs py-3 px-4 rounded-full shadow-2xl shadow-indigo-500/40 border border-blue-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="เปิดผู้ช่วยอัจฉริยะ Gemini AI"
          >
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
            </span>
            <Bot className="w-5 h-5 text-white" />
            <span className="hidden sm:inline">ผู้ช่วย AI (Gemini)</span>
          </button>
        </div>
      )}

      {/* Gemini AI Assistant Popup Modal */}
      {isAiAssistantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col">
            <GeminiAssistantView
              authUser={authUser}
              isModal={true}
              onClose={() => setIsAiAssistantModalOpen(false)}
              onAttachImageToForm={handleAttachImageToForm}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
                setIsAiAssistantModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
      {/* Privacy Policy & Terms of Service Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        isFirstVisit={isFirstVisitPrivacy}
        onConsentChange={(newConsent) => {
          setPrivacyConsent(newConsent);
          setIsFirstVisitPrivacy(false);
        }}
      />

      {/* Share Web Link & QR Code Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activeTab={activeTab}
        trackingId={selectedTrackId}
      />

      {/* Non-blocking Public Access & PDPA Bottom Bar */}
      {showPdpaBottomBar && (
        <div 
          id="public-access-pdpa-banner"
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 text-white border-t border-slate-700/80 px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom duration-300 no-print"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>ยินดีต้อนรับสู่ระบบบริการออนไลน์ เทศบาลเมืองชัยภูมิ</span>
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    ทุกคนที่มีลิงก์เข้าใช้ได้ทันที
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                  สามารถยื่นคำร้องขอดูภาพ CCTV, ติดตามสถานะคำร้อง, และดูตำแหน่งกล้องวงจรปิดได้ทันที 24 ชม. โดยไม่ต้องสมัครสมาชิก ระบบคุ้มครองข้อมูลส่วนบุคคลตามมาตรฐาน PDPA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setIsFirstVisitPrivacy(false);
                  setIsPrivacyModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                ดูรายละเอียด PDPA
              </button>
              <button
                type="button"
                onClick={() => {
                  savePrivacyPolicyConsent({ hasAccepted: true });
                  setShowPdpaBottomBar(false);
                }}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl shadow-md transition-all cursor-pointer"
              >
                เข้าใช้งานได้ทันที ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
