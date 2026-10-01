import { RequestItem } from '../types/request';
import { getStoredRequests, saveStoredRequests } from './storage';
import { saveRequestToFirestore } from './firestoreService';
import { saveRequestsToSwCache } from './swCacheService';

const OFFLINE_QUEUE_KEY = 'offline_requests_sync_queue_v1';
const SIMULATED_OFFLINE_KEY = 'simulated_offline_mode_v1';
const OFFLINE_FAILED_LOGS_KEY = 'offline_requests_failed_logs_v1';

export interface SyncFailureDetail {
  requestId: string;
  failedAt: string;
  errorMessage: string;
  retryAttempts: number;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  queueCount: number;
  queuedIds: string[];
  isSyncing: boolean;
  lastSyncedTime: string | null;
}

/**
 * Get recorded failure logs for queued items
 */
export function getOfflineSyncFailureLogs(): Record<string, SyncFailureDetail> {
  try {
    const raw = localStorage.getItem(OFFLINE_FAILED_LOGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    console.error('Failed to get offline sync failure logs:', err);
    return {};
  }
}

/**
 * Record a failure for a specific offline request upload
 */
export function recordSyncFailure(requestId: string, errorMessage: string): void {
  try {
    const logs = getOfflineSyncFailureLogs();
    const prev = logs[requestId];
    logs[requestId] = {
      requestId,
      failedAt: new Date().toISOString(),
      errorMessage: errorMessage || 'Network connection failed or service unavailable',
      retryAttempts: (prev?.retryAttempts || 0) + 1
    };
    localStorage.setItem(OFFLINE_FAILED_LOGS_KEY, JSON.stringify(logs));
    notifySyncQueueChanged();
  } catch (err) {
    console.error('Failed to record sync failure:', err);
  }
}

/**
 * Clear failure record for a specific request ID (upon success or manual dequeue)
 */
export function clearSyncFailure(requestId: string): void {
  try {
    const logs = getOfflineSyncFailureLogs();
    if (logs[requestId]) {
      delete logs[requestId];
      localStorage.setItem(OFFLINE_FAILED_LOGS_KEY, JSON.stringify(logs));
      notifySyncQueueChanged();
    }
  } catch (err) {
    console.error('Failed to clear sync failure:', err);
  }
}

/**
 * Get the list of request IDs waiting to be synced to Firestore
 */
export function getQueuedOfflineRequestIds(): string[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to get queued offline requests:', err);
    return [];
  }
}

/**
 * Add a request ID to the offline sync queue
 */
export function queueOfflineRequest(requestId: string): void {
  try {
    const current = getQueuedOfflineRequestIds();
    if (!current.includes(requestId)) {
      const updated = [...current, requestId];
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
      notifySyncQueueChanged();
    }
  } catch (err) {
    console.error('Failed to queue offline request:', err);
  }
}

/**
 * Remove a request ID from the offline sync queue
 */
export function dequeueOfflineRequest(requestId: string): void {
  try {
    const current = getQueuedOfflineRequestIds();
    const updated = current.filter((id) => id !== requestId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    notifySyncQueueChanged();
  } catch (err) {
    console.error('Failed to dequeue offline request:', err);
  }
}

/**
 * Clear the entire offline sync queue
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    notifySyncQueueChanged();
  } catch (err) {
    console.error('Failed to clear offline queue:', err);
  }
}

/**
 * Notify all listeners that the queue or sync status has changed
 */
export function notifySyncQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated', {
      detail: {
        queueCount: getQueuedOfflineRequestIds().length,
        queuedIds: getQueuedOfflineRequestIds()
      }
    }));
  }
}

/**
 * Get or toggle simulated offline mode for testing
 */
export function getIsSimulatedOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

export function setSimulatedOfflineMode(val: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIMULATED_OFFLINE_KEY, val ? 'true' : 'false');
  notifySyncQueueChanged();
}

/**
 * Synchronize all queued offline requests to Firestore
 */
export async function syncQueuedOfflineRequests(): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  const queuedIds = getQueuedOfflineRequestIds();
  if (queuedIds.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0, errors: [] };
  }

  const allRequests = getStoredRequests();
  let syncedCount = 0;
  const errors: string[] = [];
  const successfulIds: string[] = [];

  for (const id of queuedIds) {
    const item = allRequests.find((r) => r.id === id);
    if (!item) {
      // Item no longer exists in local storage, remove from queue
      successfulIds.push(id);
      continue;
    }

    try {
      await saveRequestToFirestore(item);
      item.syncStatus = 'synced';
      item.isPendingSync = false;
      successfulIds.push(id);
      clearSyncFailure(id);
      syncedCount++;
    } catch (err: any) {
      console.error(`Failed to sync queued request ${id}:`, err);
      const errMsg = err?.message || `Failed to sync ${id}`;
      errors.push(errMsg);
      recordSyncFailure(id, errMsg);
      item.syncStatus = 'failed';
    }
  }

  // Update storage and Service Worker cache with updated synced status
  if (successfulIds.length > 0 || errors.length > 0) {
    try {
      saveStoredRequests(allRequests);
      saveRequestsToSwCache(allRequests).catch(() => {});
      // Also notify server endpoint
      if (successfulIds.length > 0) {
        const syncedItems = allRequests.filter(r => successfulIds.includes(r.id));
        fetch('/api/requests/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: syncedItems })
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to update synced status in local storage:', e);
    }
  }

  // Remove successfully synced IDs from queue
  try {
    const remaining = queuedIds.filter((id) => !successfulIds.includes(id));
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    localStorage.setItem('last_offline_sync_time', new Date().toISOString());
    notifySyncQueueChanged();
    return {
      success: errors.length === 0,
      syncedCount,
      remainingCount: remaining.length,
      errors
    };
  } catch (e) {
    notifySyncQueueChanged();
    return {
      success: false,
      syncedCount,
      remainingCount: getQueuedOfflineRequestIds().length,
      errors: [...errors, 'Failed to update queue']
    };
  }
}

/**
 * Manually retry synchronization for a single specific request created offline
 */
export async function syncSingleOfflineRequest(requestId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const allRequests = getStoredRequests();
  const item = allRequests.find((r) => r.id === requestId);

  if (!item) {
    dequeueOfflineRequest(requestId);
    clearSyncFailure(requestId);
    return { success: false, message: `ไม่พบข้อมูลคำร้องรหัส ${requestId} ในเครื่อง` };
  }

  try {
    await saveRequestToFirestore(item);
    item.syncStatus = 'synced';
    item.isPendingSync = false;
    saveStoredRequests(allRequests);
    saveRequestsToSwCache(allRequests).catch(() => {});
    dequeueOfflineRequest(requestId);
    clearSyncFailure(requestId);

    fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).catch(() => {});

    return {
      success: true,
      message: `อัปโหลดและซิงค์คำร้อง ${requestId} ขึ้นฐานข้อมูลเรียบร้อยแล้ว`
    };
  } catch (err: any) {
    const errMsg = err?.message || 'การเชื่อมต่อขัดข้อง ไม่สามารถส่งข้อมูลได้';
    recordSyncFailure(requestId, errMsg);
    item.syncStatus = 'failed';
    item.isPendingSync = true;
    saveStoredRequests(allRequests);
    return {
      success: false,
      message: `ซิงค์คำร้อง ${requestId} ล้มเหลว: ${errMsg}`
    };
  }
}
