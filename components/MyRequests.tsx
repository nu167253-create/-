import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { RequestItem, RequestCategory, RequestStatus } from '../types/request';
import { getStoredRequests, getStatusBadgeColor, getStatusLabelTh, cancelRequestByApplicant, toggleArchiveRequest } from '../utils/storage';
import { exportRequestsToCsv } from '../utils/csvExport';
import { getActiveApplicantRole, getPermissionForRole } from '../utils/permissionsStorage';
import { OfficialDocumentPrint } from './OfficialDocumentPrint';
import { StepProgressIndicator } from './StepProgressIndicator';
import { AppointmentCard } from './AppointmentCard';
import { ServiceFeedbackModal } from './ServiceFeedbackModal';
import { MyTasksView } from './MyTasksView';
import { RequestDetailModal } from './RequestDetailModal';
import { StatusBadge, PendingSyncBadge } from './StatusBadge';
import { SaveToKeepButton } from './SaveToKeepButton';
import { AttachmentGallery } from './AttachmentGallery';
import { RequestComparisonModal } from './RequestComparisonModal';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle2,
  RotateCcw,
  Download,
  XCircle,
  X,
  Globe,
  ArrowUpDown,
  Star,
  Archive,
  ArchiveRestore,
  Inbox,
  ListTodo,
  User,
  History,
  LogIn,
  Columns,
  CheckSquare,
  WifiOff,
  RefreshCw,
  CloudOff,
  Check
} from 'lucide-react';
import { getStoredAuthUser, signInWithGoogle, subscribeToAuthState, AuthUserData } from '../utils/firebaseAuthService';
import { subscribeToFirestoreRequests } from '../utils/firestoreService';
import { 
  getQueuedOfflineRequestIds, 
  getIsSimulatedOffline, 
  syncQueuedOfflineRequests,
  syncSingleOfflineRequest,
  getOfflineSyncFailureLogs,
  SyncFailureDetail 
} from '../utils/offlineSync';
import { isDeviceOffline, getRequestsFromSwCache, saveRequestsToSwCache } from '../utils/swCacheService';
import { OfflineSyncManager } from './OfflineSyncManager';

interface MyRequestsProps {
  onSelectTrack: (trackingId: string) => void;
  onNewRequestClick: () => void;
  onOpenProfileModal?: () => void;
}

// Framer Motion entrance animation variants for request list items
const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04
    }
  }
};

const listItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.985 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      damping: 24,
      stiffness: 300,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: -10,
    transition: { 
      duration: 0.2, 
      ease: 'easeInOut' 
    } 
  }
};

export const MyRequests: React.FC<MyRequestsProps> = ({
  onSelectTrack,
  onNewRequestClick,
  onOpenProfileModal
}) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [viewTab, setViewTab] = useState<'active' | 'archived' | 'tasks' | 'sync'>('active');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [selectedPrintReq, setSelectedPrintReq] = useState<RequestItem | null>(null);
  const [selectedDetailReq, setSelectedDetailReq] = useState<RequestItem | null>(null);
  const [feedbackReq, setFeedbackReq] = useState<RequestItem | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserData | null>(getStoredAuthUser());
  const [filterOnlyMine, setFilterOnlyMine] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Offline and Service Worker cache states
  const [isOffline, setIsOffline] = useState<boolean>(isDeviceOffline());
  const [queuedOfflineIds, setQueuedOfflineIds] = useState<string[]>(getQueuedOfflineRequestIds());
  const [failureLogs, setFailureLogs] = useState<Record<string, SyncFailureDetail>>(getOfflineSyncFailureLogs());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [showSyncManager, setShowSyncManager] = useState<boolean>(true);

  useEffect(() => {
    // Initial data load: first check local storage, if empty or offline, query Service Worker cache
    const initialRequests = getStoredRequests();
    if (initialRequests && initialRequests.length > 0) {
      setRequests(initialRequests);
      // Ensure Service Worker Cache is kept synchronized
      saveRequestsToSwCache(initialRequests).catch(() => {});
    } else {
      getRequestsFromSwCache().then((cached) => {
        if (cached && cached.length > 0) {
          setRequests(cached);
        }
      });
    }

    const unsubAuth = subscribeToAuthState((user) => {
      setAuthUser(user);
    });

    const unsubFirestore = subscribeToFirestoreRequests((firestoreItems) => {
      if (firestoreItems && firestoreItems.length > 0) {
        setRequests(firestoreItems);
        saveRequestsToSwCache(firestoreItems).catch(() => {});
      }
    });

    const handleSyncRequests = () => {
      const updated = getStoredRequests();
      setRequests(updated);
      setQueuedOfflineIds(getQueuedOfflineRequestIds());
      setFailureLogs(getOfflineSyncFailureLogs());
      saveRequestsToSwCache(updated).catch(() => {});
    };

    const handleOnlineStatusChange = () => {
      const offline = isDeviceOffline();
      setIsOffline(offline);
      setQueuedOfflineIds(getQueuedOfflineRequestIds());
      setFailureLogs(getOfflineSyncFailureLogs());
      if (!offline) {
        // Auto-sync when coming back online
        handleTriggerSync();
      }
    };

    const handleQueueUpdated = () => {
      setQueuedOfflineIds(getQueuedOfflineRequestIds());
      setRequests(getStoredRequests());
      setFailureLogs(getOfflineSyncFailureLogs());
    };

    window.addEventListener('storage', handleSyncRequests);
    window.addEventListener('requests_updated', handleSyncRequests);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    window.addEventListener('offline-sync-queue-updated', handleQueueUpdated);

    return () => {
      unsubAuth();
      unsubFirestore();
      window.removeEventListener('storage', handleSyncRequests);
      window.removeEventListener('requests_updated', handleSyncRequests);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      window.removeEventListener('offline-sync-queue-updated', handleQueueUpdated);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncNotice('กำลังดำเนินการซิงค์ข้อมูลกับฐานข้อมูลหลัก...');

    try {
      const result = await syncQueuedOfflineRequests();
      const updated = getStoredRequests();
      setRequests(updated);
      setQueuedOfflineIds(getQueuedOfflineRequestIds());
      setFailureLogs(getOfflineSyncFailureLogs());
      await saveRequestsToSwCache(updated);

      if (result.syncedCount > 0) {
        setSyncNotice(`ซิงค์ข้อมูลสำเร็จแล้ว ${result.syncedCount} รายการ (สถานะปรับเป็น Synced)`);
      } else if (result.remainingCount === 0) {
        setSyncNotice('ข้อมูลคำร้องทั้งหมดได้รับการซิงค์เป็นปัจจุบันแล้ว');
      } else {
        setSyncNotice(`ซิงค์ข้อมูลบางส่วนสำเร็จ คงเหลือรอซิงค์ ${result.remainingCount} รายการ`);
      }
    } catch (e: any) {
      setSyncNotice('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อซิงค์ข้อมูล ระบบจะลองใหม่อัตโนมัติเมื่อสัญญาณพร้อม');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleToggleArchive = (req: RequestItem, shouldArchive: boolean) => {
    const updated = toggleArchiveRequest(req.id, shouldArchive);
    if (updated) {
      setRequests(getStoredRequests());
      if (shouldArchive) {
        setExportNotice(`ย้ายคำร้องเลขที่ ${req.id} เข้าสู่ "คลังจัดเก็บคำร้อง" เรียบร้อยแล้ว`);
      } else {
        setExportNotice(`ย้ายคำร้องเลขที่ ${req.id} กลับสู่ "รายการคำร้องทั่วไป" เรียบร้อยแล้ว`);
      }
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const handleCancelRequest = (req: RequestItem) => {
    const activeRole = getActiveApplicantRole();
    const perm = getPermissionForRole(activeRole);
    if (!perm.allowSelfCancellation) {
      alert(`กลุ่มสิทธิ์ "${perm.roleTitleTh}" ไม่ได้รับอนุญาตให้ยกเลิกคำร้องด้วยตนเอง`);
      return;
    }
    const reason = window.prompt(`คุณต้องการยกเลิกคำร้องเลขที่ ${req.id} ใช่หรือไม่?\nกรุณาระบุเหตุผลในการขอยกเลิก (ถ้ามี):`);
    if (reason !== null) {
      const updated = cancelRequestByApplicant(req.id, `${req.applicant.prefix}${req.applicant.fullName}`, reason);
      if (updated) {
        setRequests(getStoredRequests());
      }
    }
  };

  const handleExportCsv = () => {
    if (filteredRequests.length === 0) {
      alert('ไม่พบข้อมูลคำร้องที่ตรงตามตัวกรองเพื่อส่งออก');
      return;
    }
    exportRequestsToCsv(filteredRequests, 'ประวัติคำร้องของฉัน_Export');
    setExportNotice(`ดาวน์โหลด CSV ประวัติคำร้องเรียบร้อยแล้ว (${filteredRequests.length} รายการ)`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const getFormattedDateStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handlePresetDate = (daysAgo: number) => {
    const now = new Date();
    const endStr = getFormattedDateStr(now);
    if (daysAgo === 0) {
      setStartDate(endStr);
      setEndDate(endStr);
    } else {
      const past = new Date();
      past.setDate(now.getDate() - daysAgo);
      setStartDate(getFormattedDateStr(past));
      setEndDate(endStr);
    }
  };

  const activeRequestsCount = requests.filter(r => !r.isArchived).length;
  const archivedRequestsCount = requests.filter(r => !!r.isArchived).length;

  const currentPool = requests.filter((r) => {
    if (viewTab === 'archived') {
      return !!r.isArchived;
    }
    return !r.isArchived;
  });

  const pendingSyncCount = currentPool.filter(
    r => r.syncStatus === 'pending' || r.isPendingSync || queuedOfflineIds.includes(r.id)
  ).length;

  const filteredRequests = currentPool
    .filter((req) => {
      if (filterOnlyMine && authUser) {
        const isMine = 
          req.userId === authUser.uid || 
          (req.userEmail && req.userEmail.toLowerCase() === authUser.email.toLowerCase()) ||
          (req.applicant?.email && req.applicant.email.toLowerCase() === authUser.email.toLowerCase());
        if (!isMine) return false;
      }

      const isItemPendingSync = req.syncStatus === 'pending' || req.isPendingSync || queuedOfflineIds.includes(req.id);
      const matchCat = filterCategory === 'all' || req.category === filterCategory;
      const matchStat = 
        filterStatus === 'all' 
          ? true 
          : filterStatus === 'pending_sync' 
            ? isItemPendingSync 
            : req.status === filterStatus;
      const matchSearch =
        !(searchTerm || '').trim() ||
        (req.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (req.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (req.applicant?.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase());

      const reqDate = new Date(req.createdAt);
      const matchStartDate = !startDate || reqDate >= new Date(`${startDate}T00:00:00`);
      const matchEndDate = !endDate || reqDate <= new Date(`${endDate}T23:59:59.999`);

      return matchCat && matchStat && matchSearch && matchStartDate && matchEndDate;
    })
    .sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'title') {
        return a.title.localeCompare(b.title, 'th');
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleToggleCompare = (id: string) => {
    setSelectedCompareIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCompare = () => {
    const currentIds = filteredRequests.map((r) => r.id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedCompareIds.includes(id));
    if (allSelected) {
      setSelectedCompareIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedCompareIds, ...currentIds]));
      setSelectedCompareIds(combined);
    }
  };

  const handleClearCompare = () => {
    setSelectedCompareIds([]);
  };

  if (selectedPrintReq) {
    return (
      <OfficialDocumentPrint
        request={selectedPrintReq}
        onBack={() => setSelectedPrintReq(null)}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            ประวัติการยื่นคำร้องของฉัน (My Submitted Requests)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            รายการคำร้องทั้งหมดที่ท่านเคยบันทึกยื่นเรื่องผ่านเบราว์เซอร์นี้ ({requests.length} รายการ)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className={`inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer ${
              selectedCompareIds.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md ring-2 ring-blue-400/40' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="เปิดตารางเปรียบเทียบสถานะคำร้องแบบคู่ขนาน (Side-by-side comparison)"
          >
            <Columns className={`w-4 h-4 ${selectedCompareIds.length > 0 ? 'text-white' : 'text-blue-600'}`} />
            เปรียบเทียบสถานะ
            {selectedCompareIds.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedCompareIds.length > 0 ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {selectedCompareIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRequests.length === 0}
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-300 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            title="ส่งออกรายการคำร้องในหน้านี้เป็นไฟล์ CSV/Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            ส่งออก CSV ({filteredRequests.length})
          </button>

          {onOpenProfileModal && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              title="ดูและอัปเดตข้อมูลส่วนตัว เลขบัตร ประชาชน ที่อยู่ และข้อมูลการติดต่อ"
            >
              <User className="w-4 h-4 text-indigo-600" />
              โปรไฟล์ส่วนตัว
            </button>
          )}

          <button
            onClick={onNewRequestClick}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            ยื่นคำร้องใหม่
          </button>
        </div>
      </div>

      {/* Google Auth Integration & Persistent Sync Banner */}
      {authUser ? (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-blue-700/50 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {authUser.photoURL ? (
              <img
                src={authUser.photoURL}
                alt={authUser.displayName || 'Google Account'}
                className="w-10 h-10 rounded-full border border-blue-400 object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                {authUser.displayName?.[0] || 'G'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">
                  {authUser.displayName || 'ผู้ใช้งาน Google'}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Firebase Auth Connected
                </span>
              </div>
              <p className="text-xs text-blue-200/80 truncate">
                {authUser.email} • ข้อมูลซิงค์กับ Firestore แบบเรียลไทม์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOnlyMine(!filterOnlyMine)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                filterOnlyMine
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/50'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{filterOnlyMine ? 'กำลังกรอง: เฉพาะบัญชีนี้' : 'แสดงเฉพาะคำร้องของบัญชีนี้'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                เข้าสู่ระบบด้วย Google เพื่อจัดการคำร้องและซิงค์ข้อมูลบน Firestore
              </p>
              <p className="text-slate-500 text-[11px]">
                บันทึกประวัติคำร้องของคุณไว้อย่างถาวร และติดตามสถานะได้จากทุกอุปกรณ์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setIsSigningIn(true);
              try {
                await signInWithGoogle();
              } catch (err: any) {
                alert(err.message || 'เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย Google');
              } finally {
                setIsSigningIn(false);
              }
            }}
            disabled={isSigningIn}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <LogIn className={`w-3.5 h-3.5 text-blue-600 ${isSigningIn ? 'animate-spin' : ''}`} />
            <span>{isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
          </button>
        </div>
      )}

      {/* Main View Mode Switcher: Active Requests vs Archived Requests vs Tasks */}
      <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setViewTab('active');
            setFilterStatus('all');
          }}
          className={`flex-shrink-0 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            viewTab === 'active'
              ? 'bg-white text-blue-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Inbox className="w-4 h-4 text-blue-600" />
          <span>รายการคำร้อง (Active)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            viewTab === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {activeRequestsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewTab('archived');
            setFilterStatus('all');
          }}
          className={`flex-shrink-0 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            viewTab === 'archived'
              ? 'bg-white text-purple-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Archive className="w-4 h-4 text-purple-600" />
          <span>จัดเก็บคำร้อง (Archived)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            viewTab === 'archived' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {archivedRequestsCount}
          </span>
        </button>
        
        <button
          type="button"
          onClick={() => {
            setViewTab('tasks');
          }}
          className={`flex-shrink-0 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            viewTab === 'tasks'
              ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ListTodo className="w-4 h-4 text-emerald-600" />
          <span>Google Tasks</span>
        </button>

        <button
          type="button"
          id="btn-tab-sync-manager"
          onClick={() => {
            setViewTab('sync');
          }}
          className={`flex-shrink-0 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            viewTab === 'sync'
              ? 'bg-white text-amber-950 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
          title="เปิดแผงจัดการการซิงค์ออฟไลน์และลองอัปโหลดคำร้องใหม่ (Offline Sync Manager)"
        >
          <CloudOff className="w-4 h-4 text-amber-600" />
          <span>จัดการซิงค์ออฟไลน์</span>
          {(queuedOfflineIds.length > 0 || Object.keys(failureLogs).length > 0) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              {queuedOfflineIds.length || Object.keys(failureLogs).length}
            </span>
          )}
        </button>
      </div>

      {exportNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {exportNotice}
        </div>
      )}

      {syncNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-blue-600 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncNotice}</span>
          </div>
          {isSyncing && (
            <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
              กำลังประสานงาน
            </span>
          )}
        </div>
      )}

      {/* Offline & Service Worker Cache Status Banner */}
      {(isOffline || queuedOfflineIds.length > 0) && (
        <div 
          id="offline-sw-status-banner"
          className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-colors ${
            isOffline 
              ? 'bg-amber-50/90 border-amber-300 text-amber-950' 
              : 'bg-blue-50/90 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${isOffline ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
              {isOffline ? <WifiOff className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />}
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">
                  {isOffline 
                    ? 'โหมดออฟไลน์ (Offline Mode) — แสดงข้อมูลจาก Service Worker Cache' 
                    : 'มีคำร้องใหม่ที่รอซิงค์ข้อมูล (Pending Sync)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                  Service Worker Offline Ready
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {isOffline 
                  ? 'คุณสามารถเปิดดูประวัติคำร้อง ตรวจสอบสถานะ และยื่นคำร้องใหม่ได้ตามปกติแม้ไม่มีอินเทอร์เน็ต' 
                  : 'ตรวจพบคำร้องที่บันทึกไว้ในอุปกรณ์และรอส่งข้อมูลขึ้นฐานข้อมูล'}
                {queuedOfflineIds.length > 0 && (
                  <span className="text-amber-900 font-bold block mt-0.5">
                    • มี {queuedOfflineIds.length} รายการที่ติดสถานะ "รอซิงค์ข้อมูล (Pending Sync)" ระบบจะนำส่งอัตโนมัติเมื่อออนไลน์
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              id="btn-open-sync-manager"
              onClick={() => setViewTab('sync')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              title="เปิดแผงจัดการการซิงค์ออฟไลน์เพื่อดูรายละเอียดและลองใหม่ทีละรายการ"
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
              <span>เปิดตัวจัดการซิงค์</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="สั่งซิงค์ข้อมูลคำร้องไปยังเซิร์ฟเวอร์ทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลทันที (Sync Now)'}</span>
            </button>
          </div>
        </div>
      )}

      {viewTab === 'sync' ? (
        <OfflineSyncManager
          isOffline={isOffline}
          queuedIds={queuedOfflineIds}
          allRequests={requests}
          failureLogs={failureLogs}
          isSyncing={isSyncing}
          onTriggerSyncAll={handleTriggerSync}
          onRefreshData={() => {
            const updated = getStoredRequests();
            setRequests(updated);
            setQueuedOfflineIds(getQueuedOfflineRequestIds());
            setFailureLogs(getOfflineSyncFailureLogs());
          }}
          onSelectTrack={onSelectTrack}
        />
      ) : viewTab === 'tasks' ? (
        <MyTasksView />
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
        {/* Quick Status Filter Pills with Visual Color Coding */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-slate-500 font-semibold shrink-0 text-[11px] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            ตัวกรองด่วน:
          </span>
          {[
            { 
              id: 'all', 
              labelTh: 'ทั้งหมด', 
              labelEn: 'All', 
              count: currentPool.length,
              activeClass: 'bg-slate-900 text-white border-slate-900 shadow-xs',
              inactiveClass: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
              dotColor: 'bg-slate-400'
            },
            ...(pendingSyncCount > 0 ? [{
              id: 'pending_sync',
              labelTh: 'รอซิงค์ (Pending Sync)',
              labelEn: 'Pending Sync',
              count: pendingSyncCount,
              activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200',
              inactiveClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold',
              dotColor: 'bg-amber-500 animate-ping'
            }] : []),
            { 
              id: 'submitted', 
              labelTh: 'ยื่นคำร้องแล้ว', 
              labelEn: 'Submitted', 
              count: currentPool.filter(r => r.status === 'submitted').length,
              activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200',
              inactiveClass: 'bg-amber-50/70 text-amber-900 border-amber-300 hover:bg-amber-100',
              dotColor: 'bg-amber-500'
            },
            { 
              id: 'under_review', 
              labelTh: 'อยู่ระหว่างตรวจสอบ', 
              labelEn: 'Under Review', 
              count: currentPool.filter(r => r.status === 'under_review').length,
              activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200',
              inactiveClass: 'bg-blue-50/70 text-blue-900 border-blue-300 hover:bg-blue-100',
              dotColor: 'bg-blue-500'
            },
            { 
              id: 'completed', 
              labelTh: 'ดำเนินการเสร็จสิ้น', 
              labelEn: 'Completed', 
              count: currentPool.filter(r => r.status === 'completed').length,
              activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200',
              inactiveClass: 'bg-emerald-50/70 text-emerald-950 border-emerald-300 hover:bg-emerald-100',
              dotColor: 'bg-emerald-500'
            },
            { 
              id: 'rejected', 
              labelTh: 'ไม่อนุมัติ/ตก', 
              labelEn: 'Rejected', 
              count: currentPool.filter(r => r.status === 'rejected').length,
              activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200',
              inactiveClass: 'bg-rose-50/70 text-rose-900 border-rose-300 hover:bg-rose-100',
              dotColor: 'bg-rose-500'
            }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border cursor-pointer ${
                filterStatus === pill.id ? pill.activeClass : pill.inactiveClass
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${pill.dotColor} shrink-0`} />
              <span>{pill.labelTh}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                filterStatus === pill.id ? 'bg-white/30 text-white' : 'bg-white/80 text-slate-700 shadow-2xs'
              }`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Prominent Quick Search & Action Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาด่วนด้วยรหัสคำร้อง (เช่น REQ-..., CCTV-...) หรือชื่อเรื่องคำร้อง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-xl focus:ring-3 focus:ring-blue-100 outline-none text-xs font-medium text-slate-800 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-200/80 hover:bg-slate-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
                <span>ล้างค้นหา</span>
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none hidden sm:inline-block">
                Tracking ID / Title
              </span>
            )}
          </div>
          {searchTerm && (
            <p className="text-[11px] text-blue-700 font-medium mt-1.5 flex items-center gap-1 px-1">
              <span>🔍 กำลังกรองคำร้องด้วยคำค้นหา:</span>
              <strong className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">"{searchTerm}"</strong>
              <span className="text-slate-500">(พบ {filteredRequests.length} รายการ)</span>
            </p>
          )}
        </div>

        {/* Detailed Dropdown Filters & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              หมวดหมู่คำร้อง (Category)
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-medium text-slate-800"
            >
              <option value="all">-- ทุกหมวดหมู่คำร้อง (All Categories) --</option>
              <option value="cctv">ขอภาพกล้องวงจรปิด (CCTV)</option>
              <option value="certificate">หนังสือรับรอง / เอกสาร</option>
              <option value="leave">ขออนุมัติการลา</option>
              <option value="maintenance">แจ้งซ่อม / IT</option>
              <option value="budget">เบิกจ่าย / งบประมาณ</option>
              <option value="general">คำร้องทั่วไป</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              สถานะคำร้อง (Status Filter)
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-bold text-slate-800"
            >
              <option value="all">🔍 ทั้งหมด (All Statuses)</option>
              <option value="submitted">🟠 ยื่นคำร้องแล้ว (Submitted - Amber)</option>
              <option value="under_review">🔵 อยู่ระหว่างตรวจสอบ (Under Review - Blue)</option>
              <option value="completed">🟢 ดำเนินการเสร็จสิ้น (Completed - Emerald)</option>
              <option value="approved">🟢 อนุมัติแล้ว (Approved - Emerald)</option>
              <option value="action_required">🟣 ต้องการข้อมูลเพิ่มเติม (Action Required - Purple)</option>
              <option value="rejected">🔴 ไม่อนุมัติ (Rejected - Rose)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-blue-600" />
              เรียงลำดับ (Sort By)
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs font-bold text-slate-800"
            >
              <option value="newest">🕒 ล่าสุดไปเก่าสุด (Newest First)</option>
              <option value="oldest">⌛ เก่าสุดไปล่าสุด (Oldest First)</option>
              <option value="title">🔤 ตามหัวข้อคำร้อง (Alphabetical by Title)</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter Box */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              กรองตามช่วงวันที่ยื่นเรื่อง:
            </span>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 text-xs font-medium"
                title="วันที่เริ่มต้น"
              />
              <span className="text-slate-400 font-medium">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 text-xs font-medium"
                title="วันที่สิ้นสุด"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePresetDate(0)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-[11px]"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate(7)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-[11px]"
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate(30)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-[11px]"
              >
                30 วันล่าสุด
              </button>
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg font-semibold transition-colors text-[11px]"
                title="ล้างตัวกรองวันที่"
              >
                <RotateCcw className="w-3 h-3" />
                ล้างวันที่
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-slate-500 font-medium text-[11px]">
              พบคำร้อง <strong className="text-blue-600 font-bold">{filteredRequests.length}</strong> จาก {requests.length} รายการ
            </div>

            {filteredRequests.length > 0 && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <button
                  type="button"
                  onClick={handleSelectAllCompare}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="เลือกคำร้องทั้งหมดในหน้านี้เพื่อเปรียบเทียบ"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {filteredRequests.length > 0 && filteredRequests.every((r) => selectedCompareIds.includes(r.id))
                    ? 'ยกเลิกเลือกทั้งหมด'
                    : 'เลือกทั้งหมดเพื่อเปรียบเทียบ'}
                </button>
                {selectedCompareIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompare}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer"
                  >
                    (ล้างที่เลือก {selectedCompareIds.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length > 0 ? (
          <motion.div
            key={`list-${viewTab}-${filterCategory}-${filterStatus}-${filterOnlyMine}`}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((req) => {
                const isItemPendingSync = req.syncStatus === 'pending' || req.isPendingSync || queuedOfflineIds.includes(req.id);
                return (
                <motion.div
                  key={req.id}
                  layout
                  variants={listItemVariants}
                  whileHover={{ 
                    y: -3, 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -3px rgba(0, 0, 0, 0.04)',
                    transition: { duration: 0.2 } 
                  }}
                  className={`bg-white p-5 rounded-2xl border shadow-xs transition-colors space-y-3 ${
                    selectedCompareIds.includes(req.id) 
                      ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/10' 
                      : 'border-slate-200/80'
                  }`}
                >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label 
                      className="inline-flex items-center cursor-pointer p-0.5 rounded hover:bg-slate-100 transition-colors"
                      title={selectedCompareIds.includes(req.id) ? 'ยกเลิกการเลือกเปรียบเทียบ' : 'เลือกคำร้องนี้เพื่อเปรียบเทียบ'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCompareIds.includes(req.id)}
                        onChange={() => handleToggleCompare(req.id)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                    <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {req.id}
                    </span>
                    <StatusBadge status={req.status} size="sm" showIcon showDot />
                    {isItemPendingSync && (
                      <PendingSyncBadge id={`badge-pending-sync-${req.id}`} size="xs" />
                    )}
                    {req.isArchived && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-900 border-purple-300 inline-flex items-center gap-1">
                        <Archive className="w-3 h-3 text-purple-600" />
                        จัดเก็บแล้ว
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCompare(req.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border shadow-2xs cursor-pointer ${
                      selectedCompareIds.includes(req.id)
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="เลือกเพื่อนำไปเปรียบเทียบในตารางคู่ขนาน"
                  >
                    <Columns className={`w-3.5 h-3.5 ${selectedCompareIds.includes(req.id) ? 'text-white' : 'text-blue-600'}`} />
                    {selectedCompareIds.includes(req.id) ? 'เลือกแล้ว' : 'เปรียบเทียบ'}
                  </button>

                  {(req.status === 'approved' || req.status === 'completed') && (
                    <button
                      onClick={() => setFeedbackReq(req)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors border border-amber-300 shadow-2xs cursor-pointer"
                      title="ให้คะแนนความพึงพอใจการให้บริการ"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {req.feedback ? `ประเมินแล้ว (${req.feedback.rating}⭐)` : 'ประเมินความพึงพอใจ'}
                    </button>
                  )}

                  {req.status === 'submitted' && !req.isArchived && (
                    <button
                      onClick={() => handleCancelRequest(req)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                      title="ยกเลิกรายการคำร้องนี้"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      ขอยกเลิกคำร้อง
                    </button>
                  )}

                  {/* Archive / Restore Button */}
                  {!req.isArchived && (req.status === 'completed' || req.status === 'rejected' || req.status === 'approved') && (
                    <button
                      onClick={() => handleToggleArchive(req, true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-900 hover:text-purple-950 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-200 shadow-2xs cursor-pointer"
                      title="ย้ายคำร้องนี้ไปยังคลังจัดเก็บ เพื่อซ่อนจากหน้ากระดานคำร้องหลัก"
                    >
                      <Archive className="w-3.5 h-3.5 text-purple-600" />
                      ย้ายเข้าคลังจัดเก็บ
                    </button>
                  )}

                  {req.isArchived && (
                    <button
                      onClick={() => handleToggleArchive(req, false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 shadow-2xs cursor-pointer"
                      title="ย้ายคำร้องนี้กลับไปยังรายการคำร้องทั่วไป"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                      เลิกจัดเก็บ (Restore)
                    </button>
                  )}

                  <SaveToKeepButton request={req} variant="compact" />

                  <button
                    onClick={() => setSelectedDetailReq(req)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-900 hover:text-purple-950 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-200 shadow-2xs cursor-pointer"
                    title="เปิดดูประวัติการดำเนินการ (Processing History) บันทึก Timestamp, Remarks และ User ID"
                  >
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    ประวัติการดำเนินการ
                  </button>

                  <button
                    onClick={() => setSelectedPrintReq(req)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer"
                    title="พิมพ์ใบบันทึกคำร้อง / PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    พิมพ์ / Print
                  </button>

                  {/* Quick Retry Upload button if item is pending sync or failed */}
                  {isItemPendingSync && (
                    <button
                      id={`btn-retry-card-${req.id}`}
                      onClick={async () => {
                        try {
                          const res = await syncSingleOfflineRequest(req.id);
                          const updated = getStoredRequests();
                          setRequests(updated);
                          setQueuedOfflineIds(getQueuedOfflineRequestIds());
                          setFailureLogs(getOfflineSyncFailureLogs());
                          if (res.success) {
                            setSyncNotice(res.message);
                          } else {
                            setSyncNotice(res.message);
                          }
                          setTimeout(() => setSyncNotice(null), 4000);
                        } catch (err: any) {
                          setSyncNotice(`ซิงค์ล้มเหลว: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`);
                          setTimeout(() => setSyncNotice(null), 4000);
                        }
                      }}
                      disabled={isOffline || isSyncing}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors border border-amber-300 shadow-2xs cursor-pointer disabled:opacity-50"
                      title={isOffline ? 'ไม่สามารถอัปโหลดได้ขณะออฟไลน์' : 'ลองส่งข้อมูลคำร้องนี้ขึ้นฐานข้อมูลทันที'}
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                      ลองส่งใหม่
                    </button>
                  )}

                  <button
                    onClick={() => onSelectTrack(req.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    ติดตามสถานะ
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">ผู้ยื่น: </span>
                  <strong>{req.applicant.prefix}{req.applicant.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">หน่วยงาน: </span>
                  <span>{req.applicant.department}</span>
                </div>
                <div>
                  <span className="text-slate-400">วันที่ยื่นเรื่อง: </span>
                  <span>{new Date(req.createdAt).toLocaleDateString('th-TH')}</span>
                </div>
              </div>

              {isItemPendingSync && (
                <div 
                  id={`card-pending-sync-${req.id}`}
                  className="bg-amber-50/95 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="font-semibold text-amber-900">
                      คำร้องนี้บันทึกอยู่ในเครื่องแล้ว (สถานะ: รอซิงค์ / Pending Sync) ข้อมูลพร้อมส่งขึ้นระบบอัตโนมัติ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}</span>
                  </button>
                </div>
              )}

              {/* Appointment Card Component if Scheduled */}
              {req.appointment && (
                <div className="pt-1">
                  <AppointmentCard
                    appointment={req.appointment}
                    requestId={req.id}
                    requestTitle={req.title}
                    applicantName={`${req.applicant.prefix}${req.applicant.fullName}`}
                  />
                </div>
              )}

              {/* Step Progress Timeline Indicator */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <StepProgressIndicator
                  status={req.status}
                  statusHistory={req.statusHistory}
                  createdAt={req.createdAt}
                  updatedAt={req.updatedAt}
                  showDetails={false}
                />
              </div>

              {/* Attachments Section */}
              {req.attachments && req.attachments.length > 0 && (
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      เอกสารแนบประกอบคำร้อง ({req.attachments.length} ไฟล์):
                    </span>
                  </div>
                  <AttachmentGallery
                    attachments={req.attachments}
                    variant="compact"
                  />
                </div>
              )}

              {req.officerNotes && (
                <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 border border-slate-100 flex items-start gap-2">
                  <span className="font-semibold text-blue-700 shrink-0">หมายเหตุเจ้าหน้าที่:</span>
                  <p className="line-clamp-2">{req.officerNotes}</p>
                </div>
              )}

              {/* Public Officer Notes */}
              {req.internalComments && req.internalComments.filter(c => c.isPublic).length > 0 && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ข้อความชี้แจงสาธารณะจากเจ้าหน้าที่ ({req.internalComments.filter(c => c.isPublic).length} รายการ):</span>
                  </div>
                  <div className="space-y-1">
                    {req.internalComments.filter(c => c.isPublic).map((comment) => (
                      <div key={comment.id} className="bg-white p-2 rounded-lg border border-emerald-100 text-[11px] leading-relaxed">
                        <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                          <span className="font-semibold text-slate-700">{comment.author}</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString('th-TH')}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
                );
              })}
        </AnimatePresence>
      </motion.div>
        ) : viewTab === 'archived' ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3"
          >
            <Archive className="w-10 h-10 text-purple-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">ไม่มีคำร้องในคลังจัดเก็บ</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ท่านสามารถเลือกกดปุ่ม "ย้ายเข้าคลังจัดเก็บ" บนคำร้องที่ดำเนินการเสร็จสิ้นหรือไม่อนุมัติ เพื่อจัดเก็บแยกไว้ให้หน้ากระดานคำร้องหลักสะอาดและอ่านง่ายขึ้น
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3"
          >
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">ไม่พบรายการคำร้องที่ค้นหา</h3>
            <p className="text-xs text-slate-500">
              ลองปรับเงื่อนไขการค้นหา หรือกดปุ่ม "ยื่นคำร้องใหม่" ด้านบนเพื่อเริ่มยื่นคำร้อง
            </p>
          </motion.div>
        )}
      </div>
      </>
      )}

      {/* Request Detail & Processing History Modal */}
      {selectedDetailReq && (
        <RequestDetailModal
          isOpen={!!selectedDetailReq}
          onClose={() => setSelectedDetailReq(null)}
          request={selectedDetailReq}
          defaultTab="processing_history"
          onRequestUpdated={(updated) => {
            setRequests(getStoredRequests());
            setSelectedDetailReq(updated);
          }}
        />
      )}

      {/* Service Feedback Modal */}
      {feedbackReq && (
        <ServiceFeedbackModal
          isOpen={!!feedbackReq}
          onClose={() => setFeedbackReq(null)}
          request={feedbackReq}
          onFeedbackSubmitted={(updated) => {
            setFeedbackReq(null);
            setRequests(getStoredRequests());
          }}
        />
      )}

      {/* Floating Bottom Comparison Bar */}
      <AnimatePresence>
        {selectedCompareIds.length > 0 && (
          <motion.div
            id="floating-compare-bar"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 max-w-2xl w-[92%] sm:w-auto"
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs shadow-xs">
                {selectedCompareIds.length}
              </span>
              <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                เลือกแล้ว {selectedCompareIds.length} คำร้อง
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            {/* Quick chips */}
            <div className="hidden sm:flex items-center gap-1.5 max-w-xs overflow-x-auto py-0.5">
              {selectedCompareIds.slice(0, 3).map((id) => (
                <span
                  key={id}
                  className="font-mono text-[10px] bg-slate-800 text-blue-300 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1 shrink-0"
                >
                  {id}
                  <button
                    type="button"
                    onClick={() => handleToggleCompare(id)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="นำออก"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedCompareIds.length > 3 && (
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                  +{selectedCompareIds.length - 3}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>เปิดตารางเปรียบเทียบ</span>
              </button>

              <button
                type="button"
                onClick={handleClearCompare}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 transition-colors cursor-pointer whitespace-nowrap"
                title="ยกเลิกการเลือกทั้งหมด"
              >
                ล้าง
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side-by-Side Request Comparison Modal */}
      <RequestComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedRequests={requests.filter((r) => selectedCompareIds.includes(r.id))}
        allRequests={requests}
        onAddRequest={(reqId) => {
          if (!selectedCompareIds.includes(reqId)) {
            setSelectedCompareIds((prev) => [...prev, reqId]);
          }
        }}
        onRemoveRequest={(reqId) => {
          setSelectedCompareIds((prev) => prev.filter((id) => id !== reqId));
        }}
        onSelectTrack={(trackId) => {
          onSelectTrack(trackId);
        }}
        onOpenDetail={(req) => {
          setSelectedDetailReq(req);
        }}
        onPrintRequest={(req) => {
          setSelectedPrintReq(req);
        }}
      />
    </div>
  );
};
