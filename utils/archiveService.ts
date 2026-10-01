import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { RequestItem } from '../types/request';
import { getStoredRequests, saveStoredRequests } from './storage';

export const ARCHIVES_COLLECTION = 'archives';
export const REQUESTS_COLLECTION = 'requests';
export const LAST_ARCHIVE_RUN_KEY = 'last_automated_archive_timestamp_v1';
export const LOCAL_ARCHIVE_STORAGE_KEY = 'offline_archived_requests_cache_v1';

export interface ArchivedRequestItem extends RequestItem {
  archivedAt: string;
  archiveReason: string;
  originalCompletedAt?: string;
  archivedBy?: string;
}

export interface ArchiveRunResult {
  success: boolean;
  eligibleCount: number;
  archivedCount: number;
  archivedIds: string[];
  errors: string[];
  timestamp: string;
}

/**
 * Check whether a request is completed and older than specified threshold days (default: 90 days)
 */
export function isRequestOlderThanDays(request: RequestItem, days: number = 90): boolean {
  if (request.status !== 'completed') return false;

  const dateToEvaluate = request.updatedAt || request.createdAt;
  if (!dateToEvaluate) return false;

  const reqDate = new Date(dateToEvaluate).getTime();
  if (isNaN(reqDate)) return false;

  const thresholdMs = days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return (now - reqDate) >= thresholdMs;
}

/**
 * Filter all requests that meet the 90-day completed retention policy
 */
export function getEligibleRequestsForArchival(requests: RequestItem[], days: number = 90): RequestItem[] {
  return requests.filter(item => isRequestOlderThanDays(item, days));
}

/**
 * Get locally cached archived requests
 */
export function getLocalArchivedRequests(): ArchivedRequestItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ARCHIVE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save locally cached archived requests
 */
export function saveLocalArchivedRequests(items: ArchivedRequestItem[]): void {
  try {
    localStorage.setItem(LOCAL_ARCHIVE_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save local archive cache:', e);
  }
}

/**
 * Move a specific list of completed requests into the Firestore 'archives' collection
 * and remove them from the active 'requests' collection.
 */
export async function archiveRequestsToFirestore(
  requestsToArchive: RequestItem[],
  archivedBy: string = 'Automated 90-Day Retention Policy'
): Promise<ArchiveRunResult> {
  const result: ArchiveRunResult = {
    success: true,
    eligibleCount: requestsToArchive.length,
    archivedCount: 0,
    archivedIds: [],
    errors: [],
    timestamp: new Date().toISOString()
  };

  if (requestsToArchive.length === 0) {
    return result;
  }

  const localArchived = getLocalArchivedRequests();
  const newlyArchived: ArchivedRequestItem[] = [];

  for (const item of requestsToArchive) {
    const archivePayload: ArchivedRequestItem = {
      ...item,
      archivedAt: new Date().toISOString(),
      archiveReason: 'ย้ายข้อมูลอัตโนมัติเนื่องจากคำร้องดำเนินการเสร็จสิ้นเกิน 90 วัน (Automated 90-Day Policy)',
      originalCompletedAt: item.updatedAt || item.createdAt,
      archivedBy
    };

    try {
      // 1. Write to 'archives' collection
      const archiveDocRef = doc(db, ARCHIVES_COLLECTION, item.id);
      await setDoc(archiveDocRef, JSON.parse(JSON.stringify(archivePayload)), { merge: true });

      // 2. Delete from active 'requests' collection
      const activeDocRef = doc(db, REQUESTS_COLLECTION, item.id);
      await deleteDoc(activeDocRef);

      result.archivedCount++;
      result.archivedIds.push(item.id);
      newlyArchived.push(archivePayload);
    } catch (err: any) {
      console.error(`Failed to archive request ${item.id}:`, err);
      result.errors.push(`Error archiving ${item.id}: ${err?.message || 'Unknown error'}`);
      // Fallback: save to local archive cache anyway
      newlyArchived.push(archivePayload);
    }
  }

  // Update local storage active requests: remove archived items to maintain performance
  try {
    const currentActive = getStoredRequests();
    const filteredActive = currentActive.filter(r => !result.archivedIds.includes(r.id));
    saveStoredRequests(filteredActive);

    // Update local archive cache
    const mergedArchive = [...newlyArchived, ...localArchived.filter(a => !result.archivedIds.includes(a.id))];
    saveLocalArchivedRequests(mergedArchive);
    
    // Save last run timestamp
    localStorage.setItem(LAST_ARCHIVE_RUN_KEY, new Date().toISOString());

    // Dispatch global event for components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('requests-archived-event', {
        detail: { count: result.archivedCount, ids: result.archivedIds }
      }));
    }
  } catch (e) {
    console.error('Error updating local storage after archival:', e);
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Automatically find all completed requests older than 90 days in Firestore/Local storage
 * and move them to the 'archives' collection.
 */
export async function runAutomated90DayArchival(
  forceRun: boolean = false,
  archivedBy: string = 'Automated 90-Day Scheduler'
): Promise<ArchiveRunResult> {
  const now = Date.now();
  const lastRunRaw = localStorage.getItem(LAST_ARCHIVE_RUN_KEY);
  
  // Rate-limit automated run to at most once every 6 hours unless forced
  if (!forceRun && lastRunRaw) {
    const lastRunTime = new Date(lastRunRaw).getTime();
    if (!isNaN(lastRunTime) && (now - lastRunTime) < 6 * 60 * 60 * 1000) {
      return {
        success: true,
        eligibleCount: 0,
        archivedCount: 0,
        archivedIds: [],
        errors: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  let candidates: RequestItem[] = [];

  try {
    // Try fetching completed requests from Firestore first
    const colRef = collection(db, REQUESTS_COLLECTION);
    const q = query(colRef, where('status', '==', 'completed'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(d => {
        candidates.push(d.data() as RequestItem);
      });
    }
  } catch (e) {
    console.warn('Could not query Firestore for archival directly, checking local store:', e);
  }

  // If Firestore query returned empty or failed, fallback to local storage
  if (candidates.length === 0) {
    const local = getStoredRequests();
    candidates = local.filter(r => r.status === 'completed');
  }

  const eligible = getEligibleRequestsForArchival(candidates, 90);
  return await archiveRequestsToFirestore(eligible, archivedBy);
}

/**
 * Subscribe to real-time updates from the 'archives' collection
 */
export function subscribeToArchivedRequests(
  onUpdate: (archivedItems: ArchivedRequestItem[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, ARCHIVES_COLLECTION);
  return onSnapshot(
    query(colRef),
    (snapshot) => {
      const items: ArchivedRequestItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ArchivedRequestItem);
      });
      // Sort by archivedAt or createdAt descending
      items.sort((a, b) => new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime());
      saveLocalArchivedRequests(items);
      onUpdate(items);
    },
    (error) => {
      console.error('Archived requests subscription error:', error);
      if (onError) onError(error);
      // Fallback to local cache
      onUpdate(getLocalArchivedRequests());
      try {
        handleFirestoreError(error, OperationType.LIST, ARCHIVES_COLLECTION);
      } catch (e) {
        console.warn('Handled archive Firestore error:', e);
      }
    }
  );
}

/**
 * Restore an archived request back to the active 'requests' collection
 */
export async function restoreArchivedRequest(
  archiveId: string,
  restoredBy: string = 'Officer Admin'
): Promise<{ success: boolean; item?: RequestItem; error?: string }> {
  try {
    // 1. Fetch from 'archives'
    const archiveDocRef = doc(db, ARCHIVES_COLLECTION, archiveId);
    const snap = await getDoc(archiveDocRef);

    let archiveData: ArchivedRequestItem | null = null;
    if (snap.exists()) {
      archiveData = snap.data() as ArchivedRequestItem;
    } else {
      // Check local cache
      const local = getLocalArchivedRequests();
      archiveData = local.find(a => a.id === archiveId) || null;
    }

    if (!archiveData) {
      return { success: false, error: 'ไม่พบรายการคำร้องที่จัดเก็บในคลังเอกสารเก่า' };
    }

    // 2. Prepare restored payload
    const restoredPayload: RequestItem = {
      ...archiveData,
      updatedAt: new Date().toISOString(),
      internalNotes: `${archiveData.internalNotes || ''}\n[คืนค่าจากคลังจัดเก็บข้อมูลเก่าเมื่อ ${new Date().toLocaleString('th-TH')} โดย ${restoredBy}]`.trim()
    };

    // 3. Write back to 'requests'
    const activeDocRef = doc(db, REQUESTS_COLLECTION, archiveId);
    await setDoc(activeDocRef, JSON.parse(JSON.stringify(restoredPayload)), { merge: true });

    // 4. Delete from 'archives'
    await deleteDoc(archiveDocRef);

    // 5. Update local stores
    const active = getStoredRequests();
    if (!active.some(r => r.id === archiveId)) {
      saveStoredRequests([restoredPayload, ...active]);
    }
    const localArchives = getLocalArchivedRequests().filter(a => a.id !== archiveId);
    saveLocalArchivedRequests(localArchives);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('request-restored-from-archive', { detail: { id: archiveId } }));
    }

    return { success: true, item: restoredPayload };
  } catch (err: any) {
    console.error(`Failed to restore archived request ${archiveId}:`, err);
    return { success: false, error: err?.message || 'Restore failed' };
  }
}

/**
 * Permanently delete a record from the archives collection
 */
export async function deletePermanentlyFromArchive(archiveId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const archiveDocRef = doc(db, ARCHIVES_COLLECTION, archiveId);
    await deleteDoc(archiveDocRef);

    const localArchives = getLocalArchivedRequests().filter(a => a.id !== archiveId);
    saveLocalArchivedRequests(localArchives);

    return { success: true };
  } catch (err: any) {
    console.error(`Failed to delete archived request ${archiveId}:`, err);
    return { success: false, error: err?.message || 'Permanent delete failed' };
  }
}
