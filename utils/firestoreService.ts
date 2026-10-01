import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  query,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { RequestItem } from '../types/request';
import { AnnouncementBannerData } from './storage';
import { CctvEquipmentItem, CctvCamera } from '../types/cctv';

const REQUESTS_COLLECTION = 'requests';
const ANNOUNCEMENT_COLLECTION = 'announcements';
const CCTV_EQUIPMENT_COLLECTION = 'cctv_equipment';
const CCTV_CAMERAS_COLLECTION = 'cctv_cameras';

/**
 * Save or update a request item in Firestore
 */
export async function saveRequestToFirestore(request: RequestItem): Promise<void> {
  try {
    const docRef = doc(db, REQUESTS_COLLECTION, request.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(request)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${REQUESTS_COLLECTION}/${request.id}`);
  }
}

/**
 * Delete a request item from Firestore
 */
export async function deleteRequestFromFirestore(requestId: string): Promise<void> {
  try {
    const docRef = doc(db, REQUESTS_COLLECTION, requestId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${REQUESTS_COLLECTION}/${requestId}`);
  }
}

/**
 * Subscribe to real-time updates for all request items in Firestore
 */
export function subscribeToFirestoreRequests(
  onUpdate: (requests: RequestItem[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, REQUESTS_COLLECTION);
  return onSnapshot(
    query(colRef),
    (snapshot) => {
      const items: RequestItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as RequestItem);
      });
      // Sort by createdAt descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (error: any) => {
      const isUnavailable = error?.code === 'unavailable' || error?.message?.includes('offline');
      if (isUnavailable) {
        console.warn('Firestore requests listener offline or reconnecting, operating with cached data.');
      } else {
        console.error('Firestore requests subscription error:', error);
      }
      if (onError) onError(error);
      if (!isUnavailable) {
        try {
          handleFirestoreError(error, OperationType.LIST, REQUESTS_COLLECTION);
        } catch (e) {
          console.warn('Handled Firestore error in subscription:', e);
        }
      }
    }
  );
}

/**
 * Save announcement banner data to Firestore
 */
export async function saveAnnouncementToFirestore(announcement: AnnouncementBannerData): Promise<void> {
  try {
    const docRef = doc(db, ANNOUNCEMENT_COLLECTION, announcement.id || 'default');
    await setDoc(docRef, JSON.parse(JSON.stringify(announcement)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ANNOUNCEMENT_COLLECTION}/${announcement.id}`);
  }
}

/**
 * Subscribe to real-time announcement updates
 */
export function subscribeToFirestoreAnnouncement(
  onUpdate: (announcement: AnnouncementBannerData) => void
) {
  const docRef = doc(db, ANNOUNCEMENT_COLLECTION, 'ann-default-chaiyaphum-1');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as AnnouncementBannerData);
      }
    },
    (error: any) => {
      const isUnavailable = error?.code === 'unavailable' || error?.message?.includes('offline');
      if (isUnavailable) {
        console.warn('Firestore announcement listener offline or reconnecting.');
      } else {
        console.error('Firestore announcement subscription error:', error);
      }
      if (!isUnavailable) {
        try {
          handleFirestoreError(error, OperationType.GET, `${ANNOUNCEMENT_COLLECTION}/ann-default-chaiyaphum-1`);
        } catch (e) {
          console.warn('Handled Firestore error in announcement subscription:', e);
        }
      }
    }
  );
}

/**
 * Perform initial batch push of local items to Firestore if Firestore is empty
 */
export async function syncLocalRequestsToFirestore(localRequests: RequestItem[]): Promise<void> {
  try {
    const colRef = collection(db, REQUESTS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty && localRequests.length > 0) {
      console.log('Firestore is empty. Syncing initial requests from local storage...');
      for (const req of localRequests) {
        await saveRequestToFirestore(req);
      }
    }
  } catch (err: any) {
    const isUnavailable = err?.code === 'unavailable' || err?.message?.includes('offline');
    if (isUnavailable) {
      console.warn('Firestore sync postponed: client will operate in offline mode until connection is active.');
    } else {
      console.error('Failed to sync local requests to Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, REQUESTS_COLLECTION);
      } catch (e) {
        console.warn('Handled Firestore sync error:', e);
      }
    }
  }
}

/**
 * Save or update a CCTV equipment record in Firestore
 */
export async function saveCctvEquipmentToFirestore(item: CctvEquipmentItem, updatedBy?: string): Promise<void> {
  const docId = (item.id && item.id.trim()) 
    ? item.id.trim() 
    : item.assetCode 
      ? item.assetCode.replace(/[^a-zA-Z0-9_-]/g, '_')
      : `EQ-${Date.now()}`;
  try {
    const docRef = doc(db, CCTV_EQUIPMENT_COLLECTION, docId);
    const payload = {
      ...item,
      id: docId,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Officer Admin'
    };
    await setDoc(docRef, JSON.parse(JSON.stringify(payload)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CCTV_EQUIPMENT_COLLECTION}/${docId}`);
  }
}

/**
 * Bulk save / update CCTV equipment records in Firestore using batched writes
 */
export async function bulkUpdateCctvEquipmentToFirestore(
  items: CctvEquipmentItem[], 
  updatedBy?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  const BATCH_SIZE = 400;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    try {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docId = (item.id && item.id.trim()) 
          ? item.id.trim() 
          : item.assetCode 
            ? item.assetCode.replace(/[^a-zA-Z0-9_-]/g, '_')
            : `EQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const docRef = doc(db, CCTV_EQUIPMENT_COLLECTION, docId);
        const payload = {
          ...item,
          id: docId,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy || 'Officer Admin'
        };
        batch.set(docRef, JSON.parse(JSON.stringify(payload)), { merge: true });
      }
      await batch.commit();
      successCount += chunk.length;
      if (onProgress) {
        onProgress(Math.min(i + chunk.length, items.length), items.length);
      }
    } catch (batchError: any) {
      console.warn(`Batch write failed at chunk ${i}, falling back to individual items:`, batchError);
      for (const item of chunk) {
        try {
          await saveCctvEquipmentToFirestore(item, updatedBy);
          successCount++;
        } catch (singleErr: any) {
          failedCount++;
          errors.push(`Item ${item.assetCode || item.name}: ${singleErr.message || String(singleErr)}`);
        }
        if (onProgress) {
          onProgress(successCount + failedCount, items.length);
        }
      }
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Fetch all CCTV equipment records from Firestore
 */
export async function fetchCctvEquipmentFromFirestore(): Promise<CctvEquipmentItem[]> {
  try {
    const colRef = collection(db, CCTV_EQUIPMENT_COLLECTION);
    const snapshot = await getDocs(colRef);
    const list: CctvEquipmentItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as CctvEquipmentItem);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, CCTV_EQUIPMENT_COLLECTION);
    return [];
  }
}

/**
 * Subscribe to real-time CCTV equipment updates in Firestore
 */
export function subscribeToFirestoreCctvEquipment(
  onUpdate: (items: CctvEquipmentItem[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, CCTV_EQUIPMENT_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CctvEquipmentItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as CctvEquipmentItem);
      });
      onUpdate(items);
    },
    (error: any) => {
      const isUnavailable = error?.code === 'unavailable' || error?.message?.includes('offline');
      if (isUnavailable) {
        console.warn('Firestore cctv_equipment listener offline or reconnecting.');
      } else {
        console.error('Firestore cctv_equipment subscription error:', error);
      }
      if (onError) onError(error);
      if (!isUnavailable) {
        try {
          handleFirestoreError(error, OperationType.LIST, CCTV_EQUIPMENT_COLLECTION);
        } catch (e) {
          console.warn('Handled Firestore error in equipment subscription:', e);
        }
      }
    }
  );
}

/**
 * Save or update a single CCTV Camera in Firestore
 */
export async function saveCctvCameraToFirestore(camera: CctvCamera): Promise<void> {
  try {
    const docId = camera.id || camera.assetCode || `CAM_${Date.now()}`;
    const cleanId = docId.replace(/\//g, '_');
    const docRef = doc(db, CCTV_CAMERAS_COLLECTION, cleanId);
    await setDoc(docRef, JSON.parse(JSON.stringify(camera)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CCTV_CAMERAS_COLLECTION}/${camera.id}`);
  }
}

/**
 * Bulk updates CCTV Cameras to Firestore using batch operations
 */
export async function bulkUpdateCctvCamerasToFirestore(
  cameras: CctvCamera[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  const BATCH_SIZE = 400; // Under Firestore limit of 500
  for (let i = 0; i < cameras.length; i += BATCH_SIZE) {
    const chunk = cameras.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const cam of chunk) {
      const docId = (cam.id || cam.assetCode || `CAM_${Date.now()}_${Math.random()}`).replace(/\//g, '_');
      const docRef = doc(db, CCTV_CAMERAS_COLLECTION, docId);
      batch.set(docRef, JSON.parse(JSON.stringify(cam)), { merge: true });
    }

    try {
      await batch.commit();
      successCount += chunk.length;
      if (onProgress) {
        onProgress(successCount + failedCount, cameras.length);
      }
    } catch (batchErr: any) {
      console.warn('Batch write failed for cameras, retrying individually:', batchErr);
      for (const cam of chunk) {
        try {
          await saveCctvCameraToFirestore(cam);
          successCount++;
        } catch (singleErr: any) {
          failedCount++;
          errors.push(`Camera ${cam.id || cam.name}: ${singleErr.message || String(singleErr)}`);
        }
        if (onProgress) {
          onProgress(successCount + failedCount, cameras.length);
        }
      }
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Subscribe to real-time CCTV Camera updates in Firestore
 */
export function subscribeToFirestoreCctvCameras(
  onUpdate: (cameras: CctvCamera[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, CCTV_CAMERAS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CctvCamera[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CctvCamera);
      });
      onUpdate(list);
    },
    (error: any) => {
      const isUnavailable = error?.code === 'unavailable' || error?.message?.includes('offline');
      if (!isUnavailable) {
        console.error('Firestore cctv_cameras subscription error:', error);
      }
      if (onError) onError(error);
    }
  );
}

