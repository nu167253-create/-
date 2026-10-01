import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Clock, 
  ShieldCheck, 
  HelpCircle, 
  UserCheck, 
  User,
  Building2,
  Calendar,
  Video,
  Printer,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ClipboardList,
  Database,
  Cloud,
  CloudOff,
  CheckCircle2,
  Layers,
  Bell,
  Share2,
  Globe,
  QrCode
} from 'lucide-react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import { 
  getQueuedOfflineRequestIds, 
  syncQueuedOfflineRequests, 
  getIsSimulatedOffline, 
  setSimulatedOfflineMode 
} from '../utils/offlineSync';

import { OfficerUser } from '../utils/officerAuth';
import { LogIn, LogOut, UserCheck as UserIcon } from 'lucide-react';
import { 
  AuthUserData, 
  getStoredAuthUser, 
  signInWithGoogle, 
  signOutUser, 
  subscribeToAuthState 
} from '../utils/firebaseAuthService';
import { Sparkles, Bot } from 'lucide-react';

export type AppTab = 'submit' | 'track' | 'my_requests' | 'cctv' | 'officer' | 'faq' | 'assistant';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isOfficerMode: boolean;
  setIsOfficerMode: (val: boolean) => void;
  pendingCount: number;
  onOpenDrive?: () => void;
  onOpenForms?: () => void;
  officerUser?: OfficerUser | null;
  onOpenOfficerLogin?: () => void;
  onOfficerLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenProfile?: () => void;
  onOpenPrivacy?: () => void;
  onOpenShare?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isOfficerMode,
  setIsOfficerMode,
  pendingCount,
  onOpenDrive,
  onOpenForms,
  officerUser,
  onOpenOfficerLogin,
  onOfficerLogout,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenProfile,
  onOpenPrivacy,
  onOpenShare
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(getIsSimulatedOffline());
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'offline_cache' | 'error'>('connected');
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [queueCount, setQueueCount] = useState<number>(getQueuedOfflineRequestIds().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Firebase Auth State
  const [authUser, setAuthUser] = useState<AuthUserData | null>(getStoredAuthUser());
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  const effectiveIsOnline = isOnline && !simulatedOffline;

  // Handle Online/Offline and Queue Update events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync queued requests when coming back online
      if (!getIsSimulatedOffline()) {
        handleTriggerSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    const handleQueueUpdated = () => {
      setQueueCount(getQueuedOfflineRequestIds().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-queue-updated', handleQueueUpdated);

    // Initial check
    setQueueCount(getQueuedOfflineRequestIds().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-queue-updated', handleQueueUpdated);
    };
  }, []);

  const handleToggleSimulatedOffline = (nextState: boolean) => {
    setSimulatedOffline(nextState);
    setSimulatedOfflineMode(nextState);
    if (!nextState && isOnline) {
      handleTriggerSync();
    }
  };

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncQueuedOfflineRequests();
      setQueueCount(res.remainingCount);
      if (res.syncedCount > 0) {
        setSyncFeedback(`ซิงค์ข้อมูลสำเร็จ ${res.syncedCount} รายการ`);
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (e) {
      console.error('Manual sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Real-time listener to verify live Firestore database connection
  useEffect(() => {
    if (!effectiveIsOnline) {
      setFirestoreStatus('offline_cache');
      return;
    }

    try {
      const q = query(collection(db, 'requests'), limit(1));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fromCache = snapshot.metadata.fromCache;
          setIsFromCache(fromCache);
          if (fromCache) {
            setFirestoreStatus('offline_cache');
          } else {
            setFirestoreStatus('connected');
            // If connected and queue has items, attempt auto-sync
            if (getQueuedOfflineRequestIds().length > 0 && !isSyncing) {
              syncQueuedOfflineRequests().then((res) => {
                setQueueCount(res.remainingCount);
              });
            }
          }
        },
        (err) => {
          console.warn('Firestore header status check:', err);
          setFirestoreStatus('offline_cache');
        }
      );
      return () => unsubscribe();
    } catch (e) {
      setFirestoreStatus('offline_cache');
    }
  }, [effectiveIsOnline]);

  // Format Thai Date
  const today = new Date();
  const thaiYear = today.getFullYear() + 543;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dateStr = `${today.getDate()} ${thaiMonths[today.getMonth()]} พ.ศ. ${thaiYear}`;

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 no-print">
      {/* Top Info Bar */}
      <div className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              ศูนย์บริการประชาชนและบุคลากรดิจิทัล (E-Service Portal)
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {dateStr}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync & Connection Status Indicator */}
            {effectiveIsOnline ? (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-xs"
                title="สถานะระบบ: เชื่อมต่อและซิงค์ข้อมูลกับเซิร์ฟเวอร์แบบ Real-time"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">สถานะซิงค์:</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>พร้อมซิงค์ (Live Synced)</span>
                </span>
              </div>
            ) : (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/90 text-rose-200 border border-rose-600/80 ring-1 ring-rose-500/40 animate-pulse"
                title="สถานะระบบ: ออฟไลน์ (ข้อมูลจะถูกจัดคิวไว้ใน Local Storage ชั่วคราว)"
              >
                <CloudOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">สถานะซิงค์:</span>
                <span>ออฟไลน์ (Queued in Local Storage)</span>
              </div>
            )}

            {/* Offline Queued Items Badge & Manual Sync Button */}
            {queueCount > 0 && (
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing || !effectiveIsOnline}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                  effectiveIsOnline
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 cursor-pointer animate-pulse'
                    : 'bg-amber-950/90 text-amber-200 border border-amber-600/70 cursor-not-allowed'
                }`}
                title={
                  effectiveIsOnline
                    ? 'คลิกเพื่อส่งซิงค์คำร้องที่ค้างใน Local Storage ไปยังฐานข้อมูลทันที'
                    : 'คำร้องถูกบันทึกใน Local Storage ชั่วคราว และจะซิงค์อัตโนมัติเมื่อออนไลน์'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-900" />
                  <span>คิวรอซิงค์ {queueCount} รายการ</span>
                </span>
                {effectiveIsOnline && (
                  <span className="bg-slate-950 text-amber-300 text-[10px] px-1.5 py-0.1 rounded font-black">
                    {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}
                  </span>
                )}
              </button>
            )}

            {/* Sync Feedback Toast */}
            {syncFeedback && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm animate-bounce">
                <CheckCircle2 className="w-3 h-3" />
                <span>{syncFeedback}</span>
              </div>
            )}

            {/* Network Status Toggle Button (Simulate / Reconnect) */}
            <button
              onClick={() => handleToggleSimulatedOffline(!simulatedOffline)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                effectiveIsOnline
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border-amber-600/80'
              }`}
              title={
                effectiveIsOnline
                  ? 'คลิกเพื่อทดสอบจำลองโหมดออฟไลน์ (Simulate Offline)'
                  : 'คลิกเพื่อยกเลิกการจำลองและกลับสู่ออนไลน์'
              }
            >
              {effectiveIsOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">เครือข่าย: ออนไลน์</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{simulatedOffline ? 'จำลองออฟไลน์ (คลิกเพื่อต่อเน็ต)' : 'ไม่มีสัญญาณเน็ต'}</span>
                </>
              )}
            </button>

            {onOpenDrive && (
              <button
                onClick={onOpenDrive}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-all shadow-sm cursor-pointer"
                title="Google Drive Integration"
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                <span>Google Drive</span>
              </button>
            )}

            {onOpenForms && (
              <button
                onClick={onOpenForms}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-700 hover:bg-purple-600 text-white transition-all shadow-sm cursor-pointer"
                title="Google Forms Integration - สร้างแบบฟอร์มและประเมินความพึงพอใจ"
              >
                <ClipboardList className="w-3.5 h-3.5 text-purple-200" />
                <span>Google Forms</span>
              </button>
            )}

            {/* Citizen Google Sign-in with Firebase Auth & Profile Account */}
            {authUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-900/90 to-indigo-900/90 hover:from-blue-800 hover:to-indigo-800 text-blue-100 border border-blue-400/50 shadow-xs cursor-pointer transition-all"
                  title={`ยืนยันตัวตนด้วย Google: ${authUser.email || authUser.displayName}`}
                >
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={authUser.displayName || 'Google User'}
                      className="w-4 h-4 rounded-full object-cover border border-blue-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                  )}
                  <span className="max-w-[100px] truncate font-medium">
                    {authUser.displayName?.split(' ')[0] || authUser.email?.split('@')[0]}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Google Verified Account" />
                </button>

                {showUserDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                      {authUser.photoURL ? (
                        <img
                          src={authUser.photoURL}
                          alt="User Avatar"
                          className="w-9 h-9 rounded-full border border-blue-400 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white">
                          {authUser.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate flex items-center gap-1">
                          <span className="truncate">{authUser.displayName || 'ผู้ใช้ Google'}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{authUser.email}</div>
                        <div className="text-[10px] text-emerald-400 font-medium mt-0.5">✓ ยืนยันตัวตนด้วย Google Auth</div>
                      </div>
                    </div>

                    <div className="pt-2 space-y-1">
                      {onOpenProfile && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenProfile();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>โปรไฟล์ & ข้อมูลผู้ยื่นคำร้อง</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setActiveTab('my_requests');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>ประวัติคำร้องของฉัน (My Requests)</span>
                      </button>

                      {onOpenPrivacy && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenPrivacy();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>นโยบายความเป็นส่วนตัว (PDPA)</span>
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          setShowUserDropdown(false);
                          await signOutUser();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 text-left transition-colors border-t border-slate-800/80 mt-1 pt-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออกจากระบบ Google</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={async () => {
                  setIsSigningInGoogle(true);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    alert(err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย Google');
                  } finally {
                    setIsSigningInGoogle(false);
                  }
                }}
                disabled={isSigningInGoogle}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-sm transition-all cursor-pointer"
                title="เข้าสู่ระบบด้วย Google เพื่อยืนยันตัวตนและจัดเก็บข้อมูลลง Firestore"
              >
                <LogIn className={`w-3.5 h-3.5 text-blue-600 ${isSigningInGoogle ? 'animate-spin' : ''}`} />
                <span>{isSigningInGoogle ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย Google'}</span>
              </button>
            )}

            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm cursor-pointer"
                title="จัดการข้อมูลส่วนตัวโปรไฟล์ผู้ยื่นคำร้อง"
              >
                <User className="w-3.5 h-3.5 text-blue-300" />
                <span>โปรไฟล์ของฉัน</span>
              </button>
            )}

            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600/50 transition-all shadow-sm cursor-pointer relative"
                title="การตั้งค่าการแจ้งเตือนแบบเรียลไทม์"
              >
                <Bell className="w-3.5 h-3.5 text-blue-300" />
                <span>แจ้งเตือน</span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0 rounded-full animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {onOpenPrivacy && (
              <button
                id="btn-navbar-open-privacy"
                onClick={onOpenPrivacy}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs cursor-pointer"
                title="นโยบายความเป็นส่วนตัวและการจัดการภาพ CCTV ตามกฎหมาย PDPA"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">นโยบาย PDPA</span>
              </button>
            )}

            {onOpenShare && (
              <button
                id="btn-navbar-open-share"
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 transition-all shadow-sm cursor-pointer"
                title="แชร์ลิงก์เว็บหรือสแกน QR Code เพื่อให้ทุกคนเข้าใช้งานได้ทันที"
              >
                <Share2 className="w-3.5 h-3.5 text-white" />
                <span>แชร์ลิงก์เว็บ</span>
                <span className="hidden md:inline text-[10px] bg-emerald-950/60 px-1.5 py-0.2 rounded font-medium text-emerald-200">ทุกคนเข้าใช้ได้</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 shadow-sm"
              title="พิมพ์หน้านี้ / Print page"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>พิมพ์</span>
            </button>

            {/* Officer Authentication Status Indicator */}
            {officerUser ? (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/40 rounded-full px-2.5 py-0.5 text-xs text-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-bold text-[11px] truncate max-w-[130px]">
                  {officerUser.name}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                  officerUser.role === 'admin' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                }`}>
                  {officerUser.role === 'admin' ? 'ADMIN' : 'OFFICER'}
                </span>
                {onOfficerLogout && (
                  <button
                    onClick={onOfficerLogout}
                    className="ml-1 hover:text-rose-300 text-slate-400 p-0.5 rounded hover:bg-rose-950/40 transition-colors"
                    title="ออกจากระบบเจ้าหน้าที่"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              onOpenOfficerLogin && (
                <button
                  onClick={onOpenOfficerLogin}
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md transition-all cursor-pointer"
                  title="เข้าสู่ระบบปฏิบัติงานสำหรับเจ้าหน้าที่"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบเจ้าหน้าที่</span>
                </button>
              )
            )}

            <button
              onClick={() => {
                const next = !isOfficerMode;
                if (next && !officerUser && onOpenOfficerLogin) {
                  onOpenOfficerLogin();
                } else {
                  setIsOfficerMode(next);
                  if (next) setActiveTab('officer');
                  else if (activeTab === 'officer') setActiveTab('submit');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                isOfficerMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-blue-900/50 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              {isOfficerMode ? 'สลับเป็น: ประชาชน' : 'สลับเป็น: เจ้าหน้าที่'}
            </button>
          </div>
        </div>
      </div>

      {/* Offline Mode Warning Banner */}
      {!effectiveIsOnline && (
        <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 text-white border-b border-rose-700/80 px-4 py-2.5 text-xs shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-rose-900/80 border border-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-amber-200 flex items-center gap-1.5">
                  <span>แจ้งเตือนสถานะออฟไลน์ (Offline Mode)</span>
                  {queueCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      มีคิวรอซิงค์ {queueCount} รายการ
                    </span>
                  )}
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed mt-0.5">
                  อุปกรณ์ของคุณไม่ได้เชื่อมต่ออินเทอร์เน็ต — คำร้องและข้อมูลทั้งหมดจะถูกจัดคิวและบันทึกไว้ในหน่วยความจำเครื่อง (Queued in Local Storage) ชั่วคราว และจะทำการส่งซิงค์ไปยังฐานข้อมูลอัตโนมัติทันทีที่การเชื่อมต่ออินเทอร์เน็ตกลับมาใช้งานได้
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {simulatedOffline ? (
                <button
                  onClick={() => handleToggleSimulatedOffline(false)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3 py-1 rounded-md text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  สลับกลับสู่ออนไลน์
                </button>
              ) : (
                <button
                  onClick={handleTriggerSync}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1 rounded-md text-xs border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ลองเชื่อมต่อใหม่
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Notification when Queued Items are waiting to be pushed */}
      {effectiveIsOnline && queueCount > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 text-white border-b border-blue-700/70 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-slate-200 font-medium">
                พบคำร้องที่สร้างไว้ขณะออฟไลน์ <strong className="text-amber-300 font-bold">{queueCount} รายการ</strong> ใน Local Storage — ระบบพร้อมซิงค์ไปยังเซิร์ฟเวอร์
              </span>
            </div>
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1 rounded-md text-xs shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'กำลังส่งข้อมูล...' : 'ส่งซิงค์ทันที (Sync Now)'}
            </button>
          </div>
        </div>
      )}

      {/* Main Brand Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div 
          onClick={() => setActiveTab('submit')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-900/40 border border-blue-400/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ระบบยื่นคำร้องออนไลน์ เทศบาลเมืองชัยภูมิ
              <span className="text-xs font-normal text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                E-Petitions CCTV
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              ยื่นคำร้องขอดูภาพกล้องวงจรปิด (CCTV) เทศบาลเมืองชัยภูมิ และติดตามสถานะ 24 ชั่วโมง
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'submit'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            ยื่นคำร้องใหม่
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'track'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Search className="w-4 h-4" />
            ติดตามสถานะ
          </button>

          <button
            onClick={() => setActiveTab('my_requests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'my_requests'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            ประวัติของฉัน
          </button>

          <button
            onClick={() => setActiveTab('cctv')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'cctv'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Video className="w-4 h-4 text-sky-400" />
            แผนที่จุดติดตั้ง & CCTV
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'assistant'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-950 font-semibold ring-1 ring-blue-400/50'
                : 'text-indigo-200 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>ผู้ช่วย AI (Gemini)</span>
            <span className="bg-indigo-400/20 text-indigo-300 border border-indigo-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
              Gemini
            </span>
          </button>

          <button
            onClick={() => {
              if (!officerUser && onOpenOfficerLogin) {
                onOpenOfficerLogin();
              } else {
                setActiveTab('officer');
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'officer'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30 font-semibold'
                : 'text-amber-200 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            ระบบเจ้าหน้าที่
            {pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            คู่มือ & FAQ
          </button>
        </nav>
      </div>
    </header>
  );
};
