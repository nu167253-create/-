import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import {
  SyncFailureDetail,
  syncSingleOfflineRequest,
  syncQueuedOfflineRequests,
  queueOfflineRequest,
  dequeueOfflineRequest,
  clearOfflineQueue,
  clearSyncFailure,
  recordSyncFailure
} from '../utils/offlineSync';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Calendar,
  Layers,
  ArrowUpCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface OfflineSyncManagerProps {
  isOffline: boolean;
  queuedIds: string[];
  allRequests: RequestItem[];
  failureLogs: Record<string, SyncFailureDetail>;
  isSyncing: boolean;
  onTriggerSyncAll: () => Promise<void>;
  onRefreshData: () => void;
  onSelectTrack?: (trackingId: string) => void;
}

export const OfflineSyncManager: React.FC<OfflineSyncManagerProps> = ({
  isOffline,
  queuedIds,
  allRequests,
  failureLogs,
  isSyncing,
  onTriggerSyncAll,
  onRefreshData,
  onSelectTrack
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'failed' | 'pending'>('all');

  // Filter requests that were either in queuedIds, marked isPendingSync, or have failed status
  const queuedRequests = allRequests.filter(
    (req) =>
      queuedIds.includes(req.id) ||
      req.isPendingSync ||
      req.syncStatus === 'pending' ||
      req.syncStatus === 'failed' ||
      !!failureLogs[req.id]
  );

  // De-duplicate in case of duplicate references
  const uniqueItemsMap = new Map<string, RequestItem>();
  queuedRequests.forEach((req) => uniqueItemsMap.set(req.id, req));
  const syncItems = Array.from(uniqueItemsMap.values());

  const failedCount = syncItems.filter(
    (r) => r.syncStatus === 'failed' || !!failureLogs[r.id]
  ).length;
  const pendingCount = syncItems.length - failedCount;

  const displayedItems = syncItems.filter((item) => {
    const isFailed = item.syncStatus === 'failed' || !!failureLogs[item.id];
    if (filterMode === 'failed') return isFailed;
    if (filterMode === 'pending') return !isFailed;
    return true;
  });

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setLocalFeedback({ type, message });
    setTimeout(() => {
      setLocalFeedback(null);
    }, 4500);
  };

  const handleRetrySingle = async (requestId: string) => {
    if (retryingId) return;
    setRetryingId(requestId);
    try {
      const res = await syncSingleOfflineRequest(requestId);
      if (res.success) {
        showFeedback('success', res.message);
      } else {
        showFeedback('error', res.message);
      }
      onRefreshData();
    } catch (e: any) {
      const msg = e?.message || 'เกิดข้อผิดพลาดในการลองใหม่อีกครั้ง';
      recordSyncFailure(requestId, msg);
      showFeedback('error', `ไม่สามารถอัปโหลดได้: ${msg}`);
      onRefreshData();
    } finally {
      setRetryingId(null);
    }
  };

  const handleRemoveFromQueue = (requestId: string) => {
    const confirmed = window.confirm(
      `คุณต้องการนำคำร้องรหัส "${requestId}" ออกจากคิวการซิงค์ใช่หรือไม่?\n\n(ข้อมูลคำร้องจะยังคงอยู่ในเครื่อง แต่จะไม่พยายามส่งขึ้นเซิร์ฟเวอร์โดยอัตโนมัติ)`
    );
    if (!confirmed) return;

    dequeueOfflineRequest(requestId);
    clearSyncFailure(requestId);
    onRefreshData();
    showFeedback('info', `นำคำร้อง ${requestId} ออกจากคิวเรียบร้อยแล้ว`);
  };

  const handleClearAllQueue = () => {
    if (syncItems.length === 0) return;
    const confirmed = window.confirm(
      `คุณต้องการล้างคิวคำร้องรอซิงค์ทั้งหมด ${syncItems.length} รายการใช่หรือไม่?\n\n(คำร้องจะยังคงอยู่ในพื้นที่จัดเก็บบนอุปกรณ์นี้)`
    );
    if (!confirmed) return;

    clearOfflineQueue();
    syncItems.forEach((item) => clearSyncFailure(item.id));
    onRefreshData();
    showFeedback('info', 'ล้างคิวคำร้องรอซิงค์ทั้งหมดเรียบร้อยแล้ว');
  };

  const handleSimulateFailedItem = () => {
    // Helper to put any existing local request into offline queue for testing
    if (allRequests.length === 0) return;
    const candidate = allRequests[0];
    queueOfflineRequest(candidate.id);
    recordSyncFailure(candidate.id, 'Connection timeout: Network request failed while offline');
    candidate.syncStatus = 'failed';
    candidate.isPendingSync = true;
    onRefreshData();
    showFeedback('info', `เพิ่มคำร้อง ${candidate.id} เข้าคิวออฟไลน์เพื่อจำลองการทดสอบเรียบร้อยแล้ว`);
  };

  return (
    <div
      id="offline-sync-manager-panel"
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isOffline
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : failedCount > 0
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-5 h-5 text-amber-300" />
            ) : failedCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-rose-300" />
            ) : (
              <ArrowUpCircle className="w-5 h-5 text-emerald-300" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                <span>จัดการการซิงค์ออฟไลน์ (Offline Sync Manager)</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isOffline
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                    : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                }`}
              >
                {isOffline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    ออฟไลน์ (Offline)
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-300" />
                    ออนไลน์พร้อมซิงค์
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              ตรวจพบและจัดการรายการคำร้องที่สร้างไว้ขณะออฟไลน์ พร้อมระบบลองส่งข้อมูลใหม่ (Retry Upload)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          {syncItems.length > 0 && (
            <button
              type="button"
              id="btn-retry-sync-all"
              onClick={onTriggerSyncAll}
              disabled={isSyncing || isOffline}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              title={
                isOffline
                  ? 'ไม่สามารถซิงค์ได้เนื่องจากอุปกรณ์อยู่ในโหมดออฟไลน์'
                  : 'สั่งลองส่งคำร้องทั้งหมดในคิวใหม่อีกครั้ง'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์ทั้งหมด...' : `ลองใหม่ทั้งหมด (${syncItems.length})`}</span>
            </button>
          )}

          {syncItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllQueue}
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
              title="ล้างคิวคำร้องรอซิงค์ทั้งหมด"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">ล้างคิว</span>
            </button>
          )}
        </div>
      </div>

      {/* Local Feedback Notice */}
      {localFeedback && (
        <div
          className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150 ${
            localFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : localFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {localFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : localFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{localFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocalFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter & Summary Bar */}
      <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            ตัวกรองคิว:
          </span>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({syncItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('failed')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'failed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ส่งไม่สำเร็จ ({failedCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            รอการเชื่อมต่อ ({pendingCount})
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>ความพร้อมฐานข้อมูล:</span>
          <span className="font-semibold text-slate-700">Service Worker + IndexedDB/LocalStorage</span>
        </div>
      </div>

      {/* Main List Area */}
      <div className="p-4 sm:p-6 space-y-3">
        {syncItems.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-800 text-sm">
                ไม่มีคำร้องค้างในคิวออฟไลน์ (All Synced)
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                คำร้องทั้งหมดได้รับการบันทึกและซิงค์ขึ้นฐานข้อมูลหลักของเทศบาลเรียบร้อยแล้ว
                หากคุณสร้างคำร้องใหม่ขณะไม่มีสัญญาณ คำร้องจะปรากฏที่นี่เพื่อให้ตรวจสอบและลองส่งใหม่ได้ทันที
              </p>
            </div>
            {allRequests.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateFailedItem}
                  className="text-[11px] text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                >
                  [ทดสอบ] จำลองคำร้องติดค้างออฟไลน์ (Simulate Offline Queue)
                </button>
              </div>
            )}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            ไม่พบคำร้องที่ตรงตามตัวกรองที่เลือก
          </div>
        ) : (
          displayedItems.map((item) => {
            const failure = failureLogs[item.id];
            const isFailed = item.syncStatus === 'failed' || !!failure;
            const isItemRetrying = retryingId === item.id;
            const isExpanded = expandedItemId === item.id;

            return (
              <div
                key={item.id}
                id={`sync-card-${item.id}`}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isFailed
                    ? 'border-rose-300 bg-rose-50/30 shadow-2xs'
                    : 'border-amber-300 bg-amber-50/20 shadow-2xs'
                }`}
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {item.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFailed
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isFailed ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            อัปโหลดล้มเหลว (Upload Failed)
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            รอส่งขึ้นระบบ (Pending Sync)
                          </>
                        )}
                      </span>

                      {failure?.retryAttempts && failure.retryAttempts > 0 && (
                        <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          พยายามส่งแล้ว {failure.retryAttempts} ครั้ง
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        ยื่นเมื่อ: {new Date(item.createdAt).toLocaleString('th-TH')}
                      </span>
                      {item.applicant?.fullName && (
                        <span>• ผู้ยื่น: {item.applicant.fullName}</span>
                      )}
                      {item.attachments && item.attachments.length > 0 && (
                        <span>• มีไฟล์แนบ {item.attachments.length} รายการ</span>
                      )}
                    </div>

                    {/* Error message preview if failed */}
                    {isFailed && failure && (
                      <div className="mt-1 text-[11px] text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-1 rounded-lg flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                        <span className="truncate">
                          สาเหตุ: {failure.errorMessage || 'การเชื่อมต่อถูกปฏิเสธหรือสัญญาณไม่เสถียร'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for this item */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      id={`btn-retry-single-${item.id}`}
                      onClick={() => handleRetrySingle(item.id)}
                      disabled={isItemRetrying || isSyncing || isOffline}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title={
                        isOffline
                          ? 'อุปกรณ์อยู่ในโหมดออฟไลน์ ไม่สามารถอัปโหลดได้'
                          : 'ลองส่งคำร้องนี้ขึ้นฐานข้อมูลอีกครั้ง'
                      }
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isItemRetrying ? 'animate-spin' : ''}`} />
                      <span>{isItemRetrying ? 'กำลังส่ง...' : 'ลองใหม่ (Retry)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="text-slate-500 hover:text-slate-800 p-2 rounded-xl hover:bg-white/80 border border-slate-200 transition-colors cursor-pointer"
                      title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="นำออกจากคิวซิงค์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-200/70 bg-white/70 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-500 block">หมวดหมู่คำร้อง:</span>
                        <span>{item.category.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block">เหตุผลความจำเป็น:</span>
                        <p className="line-clamp-2 text-slate-600">{item.reason || '-'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block">ข้อมูลติดต่อ:</span>
                        <span>
                          {item.applicant?.phone || '-'} | {item.applicant?.email || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block">พิกัด/รายละเอียด:</span>
                        <span>{item.details?.cameraLocation || item.details?.location || '-'}</span>
                      </div>
                    </div>

                    {isFailed && failure && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 space-y-1">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          บันทึกข้อผิดพลาดในการอัปโหลดล่าสุด:
                        </span>
                        <p className="font-mono text-[11px] text-rose-800 break-words">
                          {failure.errorMessage}
                        </p>
                        <p className="text-[10px] text-rose-600">
                          เวลาที่เกิดข้อผิดพลาด: {new Date(failure.failedAt).toLocaleString('th-TH')}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {onSelectTrack && (
                        <button
                          type="button"
                          onClick={() => onSelectTrack(item.id)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          เปิดดูคำร้องแบบเต็ม
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRetrySingle(item.id)}
                        disabled={isItemRetrying || isSyncing || isOffline}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer underline ml-auto"
                      >
                        ลองส่งใหม่อีกครั้งตอนนี้
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Helper Guide */}
      <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          💡 <strong>คำแนะนำ:</strong> คำร้องที่สร้างขณะออฟไลน์จะถูกบันทึกในเครื่องทันที และจะอัปโหลดอัตโนมัติเมื่ออุปกรณ์เชื่อมต่ออินเทอร์เน็ต
        </span>
        <button
          type="button"
          onClick={onRefreshData}
          className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer self-start sm:self-auto"
        >
          รีเฟรชสถานะ
        </button>
      </div>
    </div>
  );
};
