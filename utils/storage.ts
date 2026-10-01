import { RequestItem, AppointmentInfo, FeedbackInfo, RequestPreReviewCheck, AdminVerificationAudit, ProcessingHistoryLog } from '../types/request';
import { INITIAL_REQUESTS } from '../data/initialRequests';
import { sendStatusEmailNotification } from './emailService';
import { sendStatusSmsNotification } from './smsService';
import { createDefaultWorkflowFromTemplate } from '../data/approvalTemplates';
import { saveRequestToFirestore, saveAnnouncementToFirestore, syncLocalRequestsToFirestore } from './firestoreService';
import { markRequestAsUnsynced, getConnectedSheetId, appendRequestsToSheet, removeSyncedRequests } from './googleSheetsSync';
import { getAccessToken } from './googleAuth';
import { classifyRequestTopicsHeuristic } from '../services/geminiService';
import { queueOfflineRequest, dequeueOfflineRequest, getIsSimulatedOffline } from './offlineSync';
import { getStoredAuthUser } from './firebaseAuthService';
import { saveRequestsToSwCache } from './swCacheService';

const STORAGE_KEY = 'online_request_form_data_v1';

export function ensureRequestAutoTags(req: RequestItem): RequestItem {
  if (req.aiAutoTags && req.aiAutoTags.topics && req.aiAutoTags.topics.length > 0) {
    return req;
  }
  const autoTag = classifyRequestTopicsHeuristic(req.title, req.reason, req.category, req.details);
  return {
    ...req,
    aiAutoTags: autoTag
  };
}

export function getStoredRequests(): RequestItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let rawList: RequestItem[] = INITIAL_REQUESTS;
    if (data) {
      rawList = JSON.parse(data);
    } else {
      saveStoredRequests(INITIAL_REQUESTS);
      syncLocalRequestsToFirestore(INITIAL_REQUESTS);
    }
    // Ensure all requests have AI Auto-Tags
    const enriched = rawList.map(ensureRequestAutoTags);
    return enriched;
  } catch (err) {
    console.error('Failed to parse stored requests:', err);
    return INITIAL_REQUESTS.map(ensureRequestAutoTags);
  }
}

export function saveStoredRequests(requests: RequestItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    // Persist to Service Worker Cache Storage so requests are viewable offline
    saveRequestsToSwCache(requests).catch((err) => {
      console.warn('Background SW cache update failed:', err);
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('requests_updated', { detail: requests }));
    }
  } catch (err) {
    console.error('Failed to save requests to localStorage:', err);
  }
}

export function createNewRequest(newReq: Omit<RequestItem, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>): RequestItem {
  const existing = getStoredRequests();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = existing.filter(r => r.id.startsWith(`REQ-${dateStr}`)).length + 1;
  const seqStr = String(countToday).padStart(3, '0');
  const id = `REQ-${dateStr}-${seqStr}`;

  const now = new Date().toISOString();
  
  const defaultTemplateId = newReq.category === 'cctv' ? 'wf-chaiyaphum-cctv-4' : 'wf-enterprise-10';
  const defaultWf = newReq.approvalWorkflow || createDefaultWorkflowFromTemplate(defaultTemplateId);

  const autoTag = newReq.aiAutoTags || classifyRequestTopicsHeuristic(newReq.title, newReq.reason, newReq.category, newReq.details);
  const currentAuthUser = getStoredAuthUser();

  const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || getIsSimulatedOffline());

  const createdItem: RequestItem = {
    ...newReq,
    id,
    createdAt: now,
    updatedAt: now,
    approvalWorkflow: defaultWf,
    aiAutoTags: autoTag,
    userId: newReq.userId || currentAuthUser?.uid || undefined,
    userEmail: newReq.userEmail || currentAuthUser?.email || undefined,
    isGoogleVerified: newReq.isGoogleVerified !== undefined ? newReq.isGoogleVerified : !!currentAuthUser,
    syncStatus: isOffline ? 'pending' : 'synced',
    isPendingSync: isOffline,
    statusHistory: [
      {
        status: newReq.status || 'submitted',
        timestamp: now,
        actor: `${newReq.applicant.prefix}${newReq.applicant.fullName} (ผู้ยื่นคำร้อง)`,
        note: isOffline
          ? 'บันทึกคำร้องในเครื่องเรียบร้อยแล้ว (รอเชื่อมต่ออินเทอร์เน็ตเพื่อซิงค์ข้อมูล)'
          : 'ยื่นคำร้องผ่านระบบออนไลน์เรียบร้อยแล้ว'
      }
    ]
  };

  const updatedList = [createdItem, ...existing];
  saveStoredRequests(updatedList);

  if (isOffline) {
    queueOfflineRequest(createdItem.id);
  } else {
    // Attempt online sync to Firestore and Server API
    saveRequestToFirestore(createdItem)
      .then(() => {
        // Also push to server API
        fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createdItem)
        }).catch(() => {});
      })
      .catch(() => {
        // Network failed during save, mark as pending sync
        createdItem.syncStatus = 'pending';
        createdItem.isPendingSync = true;
        queueOfflineRequest(createdItem.id);
        saveStoredRequests(getStoredRequests());
      });
  }
  
  // Mark as unsynced so the officer portal will push it to Google Sheets
  try {
    markRequestAsUnsynced(createdItem.id);
    
    // Try fire-and-forget auto-sync if token exists
    const sheetId = getConnectedSheetId();
    if (sheetId) {
      getAccessToken().then((token: string | null) => {
        if (token) {
          appendRequestsToSheet([createdItem], sheetId)
            .then(() => removeSyncedRequests([createdItem.id]))
            .catch((err: any) => console.error('Immediate auto-sync failed', err));
        }
      });
    }
  } catch (err) {
    console.error('Auto-sync marking failed', err);
  }
  
  return createdItem;
}

export function updateRequestStatus(
  id: string,
  newStatus: RequestItem['status'],
  officerName: string,
  note?: string,
  officerNotes?: string,
  assignedOfficer?: string,
  internalNotes?: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: newStatus,
      timestamp: now,
      actor: officerName,
      note: note || `เปลี่ยนสถานะเป็น ${getStatusLabelTh(newStatus)}`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    status: newStatus,
    updatedAt: now,
    statusHistory: updatedHistory,
    officerNotes: officerNotes !== undefined ? officerNotes : item.officerNotes,
    assignedOfficer: assignedOfficer !== undefined ? assignedOfficer : item.assignedOfficer,
    internalNotes: internalNotes !== undefined ? internalNotes : item.internalNotes
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  
  const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || getIsSimulatedOffline());
  if (isOffline) {
    queueOfflineRequest(updatedItem.id);
  } else {
    saveRequestToFirestore(updatedItem).catch(() => {
      queueOfflineRequest(updatedItem.id);
    });
  }

  // Send Email & SMS Notification directly to applicant's contact on status changes
  sendStatusEmailNotification(updatedItem, newStatus, officerNotes || note);
  sendStatusSmsNotification(updatedItem, newStatus, officerNotes || note);

  return updatedItem;
}

/**
 * บันทึกหรือแก้ไขโน้ตภายในเฉพาะเจ้าหน้าที่ (Internal Notes - Private comments for officers only)
 */
export function updateRequestInternalNotes(
  id: string,
  internalNotes: string,
  officerName: string = 'เจ้าหน้าที่'
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const updatedItem: RequestItem = {
    ...item,
    internalNotes,
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);

  const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || getIsSimulatedOffline());
  if (isOffline) {
    queueOfflineRequest(updatedItem.id);
  } else {
    saveRequestToFirestore(updatedItem).catch(() => {
      queueOfflineRequest(updatedItem.id);
    });
  }

  return updatedItem;
}

/**
 * อัปเดตสถานะคำร้องแบบกลุ่ม (Bulk Status Update) พร้อมตัวเลือกมอบหมายงานและความเร่งด่วน
 */
export function bulkUpdateRequestStatus(
  ids: string[],
  newStatus: RequestItem['status'],
  officerName: string,
  note?: string,
  assignedOfficer?: string,
  priority?: RequestItem['priority'],
  internalNotes?: string
): number {
  const requests = getStoredRequests();
  const now = new Date().toISOString();
  let count = 0;
  const isOffline = typeof navigator !== 'undefined' && (!navigator.onLine || getIsSimulatedOffline());
  const updatedItems: RequestItem[] = [];

  for (const id of ids) {
    const index = requests.findIndex(r => r.id === id);
    if (index === -1) continue;

    const item = requests[index];
    const updatedHistory = [
      ...item.statusHistory,
      {
        status: newStatus,
        timestamp: now,
        actor: officerName,
        note: note || `เปลี่ยนสถานะเป็น ${getStatusLabelTh(newStatus)} แบบกลุ่ม`
      }
    ];

    const updatedItem: RequestItem = {
      ...item,
      status: newStatus,
      updatedAt: now,
      statusHistory: updatedHistory,
      officerNotes: note !== undefined && note.trim() !== '' ? note : item.officerNotes,
      assignedOfficer: assignedOfficer !== undefined && assignedOfficer.trim() !== '' ? assignedOfficer : item.assignedOfficer,
      internalNotes: internalNotes !== undefined && internalNotes.trim() !== '' ? internalNotes : item.internalNotes,
      ...(priority && priority !== ('keep' as any) ? { priority } : {})
    };

    requests[index] = updatedItem;
    updatedItems.push(updatedItem);
    count++;
  }

  if (count > 0) {
    saveStoredRequests(requests);
    for (const item of updatedItems) {
      if (isOffline) {
        queueOfflineRequest(item.id);
      } else {
        saveRequestToFirestore(item).catch(() => {
          queueOfflineRequest(item.id);
        });
      }
    }
  }

  return count;
}

/**
 * ผู้ยื่นคำร้องยกเลิกคำร้องด้วยตนเอง (Self Cancellation)
 */
export function cancelRequestByApplicant(id: string, applicantName: string, reason?: string): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const item = requests[index];
  if (item.status !== 'submitted') return null;

  const now = new Date().toISOString();
  const updatedHistory = [
    ...item.statusHistory,
    {
      status: 'rejected' as const,
      timestamp: now,
      actor: `${applicantName} (ผู้ยื่นคำร้อง)`,
      note: `ยกเลิกคำร้องด้วยตนเอง: ${reason || 'ผู้ยื่นคำร้องประสงค์ยกเลิกการดำเนินงาน'}`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    status: 'rejected',
    updatedAt: now,
    statusHistory: updatedHistory,
    officerNotes: `[ผู้ยื่นคำร้องขอยกเลิกคำร้องด้วยตนเอง] ${reason || ''}`
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

/**
 * อัปเดต/ปรับเปลี่ยนโครงสร้างเส้นทางการอนุมัติ (Approval Workflow)
 */
export function updateApprovalWorkflow(
  id: string,
  newWorkflow: import('../types/request').ApprovalWorkflow,
  officerName: string,
  note?: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: officerName,
      note: note || `[อัปเดตเส้นทางการอนุมัติ] ตั้งค่าผังการอนุมัติ ${newWorkflow.steps.length} ขั้นตอน (${newWorkflow.templateName || 'กำหนดเอง'})`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    approvalWorkflow: newWorkflow,
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

/**
 * ดำเนินการอนุมัติ/ปฏิเสธ หรือส่งต่อในขั้นตอนปัจจุบันของเส้นทางการอนุมัติ
 */
export function advanceApprovalStep(
  id: string,
  stepIndex: number,
  action: 'approved' | 'rejected' | 'skipped',
  approverName: string,
  comment?: string,
  signatureUrl?: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const item = requests[index];
  if (!item.approvalWorkflow) return null;

  const now = new Date().toISOString();
  const steps = [...item.approvalWorkflow.steps];
  if (stepIndex < 0 || stepIndex >= steps.length) return null;

  const targetStep = { ...steps[stepIndex] };
  targetStep.status = action;
  targetStep.actionDate = now;
  targetStep.comment = comment || (action === 'approved' ? 'อนุมัติเรียบร้อยแล้ว' : action === 'rejected' ? 'ไม่อนุมัติในขั้นตอนนี้' : 'ข้ามขั้นตอน');
  if (approverName) targetStep.approverName = approverName;
  if (signatureUrl) targetStep.signatureUrl = signatureUrl;

  steps[stepIndex] = targetStep;

  // Determine next step index
  let nextIndex = item.approvalWorkflow.currentStepIndex;
  if (action === 'approved' || action === 'skipped') {
    // Look for next pending step
    const nextPending = steps.findIndex((s, idx) => idx > stepIndex && (s.status === 'pending' || s.status === 'in_progress'));
    if (nextPending !== -1) {
      nextIndex = nextPending;
      steps[nextPending] = { ...steps[nextPending], status: 'in_progress' };
    } else {
      // All steps approved!
      nextIndex = steps.length - 1;
    }
  }

  // Auto-update request status if final step completed or if rejected
  let newReqStatus = item.status;
  const isAllApproved = steps.every(s => s.status === 'approved' || s.status === 'skipped');
  if (isAllApproved) {
    newReqStatus = 'approved';
  } else if (action === 'rejected') {
    newReqStatus = 'rejected';
  } else if (item.status === 'submitted') {
    newReqStatus = 'under_review';
  }

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: newReqStatus,
      timestamp: now,
      actor: approverName || targetStep.approverName || 'ผู้อนุมัติ',
      note: `[ขั้นตอนที่ ${targetStep.stepNumber}/${steps.length}] ${targetStep.roleTitle}: ${action === 'approved' ? 'อนุมัติแล้ว' : action === 'rejected' ? 'ปฏิเสธ/ไม่อนุมัติ' : 'ข้ามขั้นตอน'} ${comment ? `(${comment})` : ''}`
    }
  ];

  const updatedWorkflow: import('../types/request').ApprovalWorkflow = {
    ...item.approvalWorkflow,
    steps,
    currentStepIndex: nextIndex
  };

  const updatedItem: RequestItem = {
    ...item,
    status: newReqStatus,
    approvalWorkflow: updatedWorkflow,
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

/**
 * กำหนดหรือแก้ไขวันเวลานัดหมายสำหรับคำร้อง (Scheduling Appointment)
 */
export function addOrUpdateAppointment(
  requestId: string,
  appointmentData: {
    date: string;
    time: string;
    location: string;
    purpose: string;
    officerName: string;
    notes?: string;
  }
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const appointmentInfo: AppointmentInfo = {
    id: item.appointment?.id || `APT-${Date.now()}`,
    date: appointmentData.date,
    time: appointmentData.time,
    location: appointmentData.location,
    purpose: appointmentData.purpose,
    officerName: appointmentData.officerName,
    notes: appointmentData.notes,
    status: 'scheduled',
    createdAt: item.appointment?.createdAt || now
  };

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: appointmentData.officerName || 'เจ้าหน้าที่ผู้ทำรายการ',
      note: `📅 นัดหมายวันเวลา-สถานที่: วันที่ ${appointmentData.date} เวลา ${appointmentData.time} น. ณ ${appointmentData.location} (${appointmentData.purpose})`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    appointment: appointmentInfo,
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

/**
 * ยกเลิกนัดหมาย
 */
export function cancelAppointment(requestId: string, officerName: string, reason?: string): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];
  if (!item.appointment) return null;

  const updatedAppointment: AppointmentInfo = {
    ...item.appointment,
    status: 'cancelled'
  };

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: officerName || 'เจ้าหน้าที่ผู้ทำรายการ',
      note: `🚫 ยกเลิกนัดหมาย (${reason || 'ยกเลิกการนัดหมายโดยเจ้าหน้าที่'})`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    appointment: updatedAppointment,
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function addAdminAttachmentToRequest(
  id: string,
  newAttachment: Omit<import('../types/request').AttachmentFile, 'id' | 'uploadedAt'>,
  officerName: string,
  note?: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const fullAttachment: import('../types/request').AttachmentFile = {
    ...newAttachment,
    id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    uploadedAt: now,
    uploadedBy: officerName,
    isOfficialDoc: true
  };

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: officerName,
      note: note || `[อัปเดตไฟล์โดยแอดมิน] เพิ่มไฟล์เอกสารทางการ "${fullAttachment.name}"`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    attachments: [...item.attachments, fullAttachment],
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function addApplicantAttachmentToRequest(
  id: string,
  newAttachment: Omit<import('../types/request').AttachmentFile, 'id' | 'uploadedAt'>,
  applicantName: string,
  note?: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const fullAttachment: import('../types/request').AttachmentFile = {
    ...newAttachment,
    id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    uploadedAt: now,
    uploadedBy: applicantName,
    isOfficialDoc: false
  };

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: applicantName,
      note: note || `[อัปโหลดไฟล์/ข้อมูลเพิ่มเติม] เพิ่มไฟล์เอกสาร "${fullAttachment.name}"`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    attachments: [...item.attachments, fullAttachment],
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function removeAttachmentFromRequest(
  id: string,
  attachmentId: string,
  officerName: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];
  const targetAtt = item.attachments.find(a => a.id === attachmentId);

  const updatedAttachments = item.attachments.filter(a => a.id !== attachmentId);

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: now,
      actor: officerName,
      note: `[ลบไฟล์โดยแอดมิน] ลบไฟล์เอกสาร "${targetAtt?.name || attachmentId}"`
    }
  ];

  const updatedItem: RequestItem = {
    ...item,
    attachments: updatedAttachments,
    updatedAt: now,
    statusHistory: updatedHistory
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function updateAttachmentCategory(
  requestId: string,
  attachmentId: string,
  newCategory: import('../types/request').DocumentCategoryType,
  actorName: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const updatedAttachments = item.attachments.map(att => 
    att.id === attachmentId ? { ...att, documentCategory: newCategory } : att
  );

  const updatedItem: RequestItem = {
    ...item,
    attachments: updatedAttachments,
    updatedAt: new Date().toISOString()
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function addInternalComment(
  id: string,
  author: string,
  content: string,
  isPinned: boolean = false,
  isPublic: boolean = false
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];

  const newComment: import('../types/request').InternalComment = {
    id: `NOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    author: author || 'เจ้าหน้าที่ผู้ปฏิบัติงาน',
    content: content.trim(),
    createdAt: now,
    isPinned,
    isPublic
  };

  const existingComments = item.internalComments || [];

  const updatedItem: RequestItem = {
    ...item,
    internalComments: [newComment, ...existingComments],
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function deleteInternalComment(id: string, commentId: string): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];
  const existingComments = item.internalComments || [];

  const updatedComments = existingComments.filter(c => c.id !== commentId);

  const updatedItem: RequestItem = {
    ...item,
    internalComments: updatedComments,
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function togglePinInternalComment(id: string, commentId: string): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];
  const existingComments = item.internalComments || [];

  const updatedComments = existingComments.map(c => 
    c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
  );

  const updatedItem: RequestItem = {
    ...item,
    internalComments: updatedComments,
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function togglePublicInternalComment(id: string, commentId: string): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const item = requests[index];
  const existingComments = item.internalComments || [];

  const updatedComments = existingComments.map(c => 
    c.id === commentId ? { ...c, isPublic: !c.isPublic } : c
  );

  const updatedItem: RequestItem = {
    ...item,
    internalComments: updatedComments,
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function getStatusLabelTh(status: RequestItem['status']): string {
  switch (status) {
    case 'draft': return 'ร่างคำร้อง';
    case 'submitted': return 'ยื่นคำร้องแล้ว';
    case 'under_review': return 'อยู่ระหว่างตรวจสอบ';
    case 'action_required': return 'ต้องการข้อมูลเพิ่มเติม';
    case 'approved': return 'อนุมัติแล้ว';
    case 'rejected': return 'ไม่อนุมัติ';
    case 'completed': return 'ดำเนินการเสร็จสิ้น';
    case 'closed': return 'ปิดเรื่องดำเนินการแล้ว';
    default: return status;
  }
}

export function getStatusBadgeColor(status: RequestItem['status']): string {
  switch (status) {
    case 'draft': return 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/10';
    case 'submitted': return 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20';
    case 'under_review': return 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-400/20';
    case 'action_required': return 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/20';
    case 'approved': return 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/20';
    case 'rejected': return 'bg-rose-50 text-rose-900 border-rose-300 ring-1 ring-rose-400/20';
    case 'completed': return 'bg-emerald-50 text-emerald-950 border-emerald-400 ring-1 ring-emerald-500/25';
    case 'closed': return 'bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-400/10';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getPriorityLabelTh(priority: RequestItem['priority']): string {
  switch (priority) {
    case 'low': return 'ต่ำ (Low)';
    case 'medium': return 'ปานกลาง (Medium)';
    case 'high': return 'สูง (High)';
    case 'urgent': return 'ด่วนที่สุด (Urgent)';
    case 'normal': return 'ปกติ';
    case 'very_urgent': return 'ด่วนที่สุด';
    default: return priority || 'ปกติ';
  }
}

export function getPriorityBadgeColor(priority: RequestItem['priority']): string {
  switch (priority) {
    case 'low': return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'medium': return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'normal': return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'high': return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'urgent': return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
    case 'very_urgent': return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// Announcement Banner Storage Helpers
const ANNOUNCEMENT_STORAGE_KEY = 'online_request_system_announcement';

export interface AnnouncementBannerData {
  id: string;
  enabled: boolean;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  badgeText?: string;
  linkText?: string;
  linkUrl?: string;
  updatedAt: string;
}

export const DEFAULT_ANNOUNCEMENT: AnnouncementBannerData = {
  id: 'ann-default-chaiyaphum-1',
  enabled: true,
  type: 'info',
  title: 'ศูนย์บริการคำร้องขอดูภาพ CCTV เทศบาลเมืองชัยภูมิ',
  message: 'ประชาชนและเจ้าหน้าที่สามารถยื่นคำร้องขอดูหรือขอสำเนาภาพจากกล้องวงจรปิด CCTV ผ่านระบบออนไลน์ได้ตลอด 24 ชั่วโมง พร้อมระบบติดตามสถานะและพิมพ์เอกสารอนุมัติ',
  badgeText: 'เทศบาลเมืองชัยภูมิ',
  linkText: 'ดูวิธีการยื่นคำร้อง',
  updatedAt: new Date().toISOString()
};

export function getStoredAnnouncement(): AnnouncementBannerData {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (!raw) return DEFAULT_ANNOUNCEMENT;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse announcement banner data:', err);
    return DEFAULT_ANNOUNCEMENT;
  }
}

export function saveStoredAnnouncement(announcement: AnnouncementBannerData): void {
  try {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(announcement));
  } catch (err) {
    console.error('Failed to save announcement banner data:', err);
  }
}


export interface FormDraftData {
  category: string;
  applicant: any;
  title: string;
  priority: string;
  reason: string;
  dynamicFields: Record<string, any>;
  signatureDataUrl?: string | null;
  savedAt: string;
  step: number;
}

const DRAFT_PREFIX = 'online_request_draft_v1_';

export function saveFormDraft(category: string, draft: Omit<FormDraftData, 'savedAt' | 'category'>): FormDraftData {
  const fullDraft: FormDraftData = {
    ...draft,
    category,
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${category}`, JSON.stringify(fullDraft));
  } catch (err) {
    console.error('Failed to save draft to localStorage:', err);
  }
  return fullDraft;
}

export function getFormDraft(category: string): FormDraftData | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${category}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse form draft:', err);
    return null;
  }
}

export function clearFormDraft(category: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${category}`);
  } catch (err) {
    console.error('Failed to clear form draft:', err);
  }
}

export function saveServiceFeedback(requestId: string, feedback: FeedbackInfo): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const updatedItem: RequestItem = {
    ...requests[index],
    feedback,
    updatedAt: new Date().toISOString()
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function toggleArchiveRequest(requestId: string, isArchived: boolean): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const updatedItem: RequestItem = {
    ...requests[index],
    isArchived,
    updatedAt: new Date().toISOString()
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  return updatedItem;
}

export function savePreReviewCheck(
  requestId: string,
  checkData: RequestPreReviewCheck
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const now = new Date().toISOString();

  let newStatus = item.status;
  const history = [...item.statusHistory];

  // If forwarded to admin and status was submitted, advance status to under_review
  if (checkData.forwardedToAdmin && item.status === 'submitted') {
    newStatus = 'under_review';
    history.push({
      status: 'under_review',
      timestamp: now,
      actor: checkData.verifiedByOfficer || 'เจ้าหน้าที่ผู้ตรวจสอบ',
      note: `ผ่านการตรวจสอบความถูกต้องและสมบูรณ์ของเอกสารแล้ว เสนอเรื่องต่อผู้บริหาร/Admin พิจารณา`
    });
  }

  const updatedItem: RequestItem = {
    ...item,
    status: newStatus,
    preReviewCheck: checkData,
    updatedAt: now,
    statusHistory: history
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}

// ==========================================
// APPROVER ROSTER & STEP DISPATCH FUNCTIONS
// ==========================================

export interface ApproverPerson {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  lineId: string;
  phone: string;
  level: number;
}

const APPROVER_ROSTER_KEY = 'cctv_approver_roster_v1';

export const DEFAULT_APPROVER_ROSTER: ApproverPerson[] = [
  {
    id: 'appr-1',
    name: 'นายสรพงษ์ เทศกิจดี',
    position: 'เจ้าหน้าที่งานสารบรรณ / งานกล้องวงจรปิด',
    department: 'ศูนย์ควบคุมกล้อง CCTV เทศบาลเมืองชัยภูมิ',
    email: 'sarapong.cctv@chaiyaphum.go.th',
    lineId: '@cctv_chaiyaphum',
    phone: '044-811-300',
    level: 1
  },
  {
    id: 'appr-2',
    name: 'นายวิเชียร ชัยภูมิพัฒนา',
    position: 'หัวหน้าศูนย์ควบคุมกล้องวงจรปิด CCTV',
    department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
    email: 'wichean.cctv@chaiyaphum.go.th',
    lineId: '@wichean_cctv',
    phone: '044-811-301',
    level: 2
  },
  {
    id: 'appr-3',
    name: 'นางสาวนภา แจ่มใส',
    position: 'หัวหน้าฝ่ายปกครองและงานนิติการ (นิติกร)',
    department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
    email: 'napa.legal@chaiyaphum.go.th',
    lineId: '@napa_legal',
    phone: '044-811-305',
    level: 3
  },
  {
    id: 'appr-4',
    name: 'ดร.สมชาย ทรัพย์มั่นคง',
    position: 'ผู้อำนวยการกองช่าง',
    department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
    email: 'somchai.director@chaiyaphum.go.th',
    lineId: '@somchai_cctv',
    phone: '044-811-310',
    level: 4
  },
  {
    id: 'appr-5',
    name: 'นายกิตติศักดิ์ บริหารเมือง',
    position: 'ปลัดเทศบาลเมืองชัยภูมิ',
    department: 'สำนักงานปลัดเทศบาล',
    email: 'kittisak.deputy@chaiyaphum.go.th',
    lineId: '@kittisak_city',
    phone: '044-811-315',
    level: 5
  },
  {
    id: 'appr-6',
    name: 'นายสมพร พัฒนาเมืองชัย',
    position: 'นายกเทศมนตรีเมืองชัยภูมิ',
    department: 'เทศบาลเมืองชัยภูมิ',
    email: 'mayor@chaiyaphum.go.th',
    lineId: '@mayor_chaiyaphum',
    phone: '044-811-320',
    level: 6
  }
];

export function getApproverRoster(): ApproverPerson[] {
  try {
    const stored = localStorage.getItem(APPROVER_ROSTER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load approver roster:', err);
  }
  return DEFAULT_APPROVER_ROSTER;
}

export function saveApproverRoster(roster: ApproverPerson[]): void {
  try {
    localStorage.setItem(APPROVER_ROSTER_KEY, JSON.stringify(roster));
  } catch (err) {
    console.error('Failed to save approver roster:', err);
  }
}

/**
 * ฟังก์ชันสำหรับ Admin/ผู้ดูแลระบบ ส่งคำร้องต่อตามระดับขั้น (Dispatch Request to Approval Step Level)
 */
export function dispatchRequestToNextLevel(
  requestId: string,
  adminName: string,
  dispatchNote?: string,
  targetStepIndex?: number
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  if (!item.approvalWorkflow || !item.approvalWorkflow.steps || item.approvalWorkflow.steps.length === 0) {
    return null;
  }

  const steps = [...item.approvalWorkflow.steps];
  const currentIdx = item.approvalWorkflow.currentStepIndex ?? 0;
  
  let nextIdx = targetStepIndex !== undefined ? targetStepIndex : currentIdx + 1;
  if (nextIdx >= steps.length) {
    nextIdx = steps.length - 1;
  }

  // Mark target step as in_progress if pending
  steps[nextIdx] = {
    ...steps[nextIdx],
    status: steps[nextIdx].status === 'pending' ? 'in_progress' : steps[nextIdx].status
  };

  const targetStep = steps[nextIdx];
  const now = new Date().toISOString();

  let newReqStatus = item.status;
  if (newReqStatus === 'submitted') {
    newReqStatus = 'under_review';
  }

  const logMessage = `[เสนอส่งคำร้องตามระดับขั้น] โดย ${adminName} ➡️ เสนอคำร้องไปยัง ขั้นตอนที่ ${targetStep.stepNumber}: ${targetStep.roleTitle} (${targetStep.approverName || 'ผู้อนุมัติประจำขั้น'}) ${dispatchNote ? `- หมายเหตุ: ${dispatchNote}` : ''}`;

  const updatedHistory = [
    ...item.statusHistory,
    {
      status: newReqStatus,
      timestamp: now,
      actor: adminName,
      note: logMessage
    }
  ];

  const updatedWorkflow: import('../types/request').ApprovalWorkflow = {
    ...item.approvalWorkflow,
    steps,
    currentStepIndex: nextIdx
  };

  const updatedItem: RequestItem = {
    ...item,
    status: newReqStatus,
    approvalWorkflow: updatedWorkflow,
    updatedAt: now,
    statusHistory: updatedHistory,
    assignedOfficer: targetStep.approverName || item.assignedOfficer
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}

/**
 * บันทึกผลการตรวจสอบและกลั่นกรองคำร้องโดย Admin (Save Admin Verification & Audit)
 */
export function saveAdminVerificationAudit(
  requestId: string,
  auditData: AdminVerificationAudit
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const now = new Date().toISOString();
  const history = [...item.statusHistory];

  let newStatus = item.status;
  let statusNote = '';

  if (auditData.auditResult === 'approved') {
    newStatus = 'approved';
    statusNote = `ผ่านการตรวจสอบและกลั่นกรองคำร้องโดย Admin (${auditData.adminName}) อนุมัติการให้บริการและส่งมอบไฟล์ภาพ CCTV ตามเงื่อนไข`;
  } else if (auditData.auditResult === 'action_required') {
    newStatus = 'action_required';
    statusNote = `Admin (${auditData.adminName}) ตรวจสอบพบข้อบกพร่อง/ต้องการเอกสารหลักฐานเพิ่มเติม: ${auditData.adminNotes || 'กรุณาส่งเอกสารเพิ่มเติม'}`;
  } else if (auditData.auditResult === 'rejected') {
    newStatus = 'rejected';
    statusNote = `Admin (${auditData.adminName}) วินิจฉัยไม่อนุมัติคำร้อง: ${auditData.adminNotes || 'ไม่ผ่านเกณฑ์ตามระเบียบ'}`;
  } else if (auditData.auditResult === 'forward_executive') {
    newStatus = 'under_review';
    statusNote = `Admin (${auditData.adminName}) ตรวจสอบรับรองความถูกต้องครบถ้วน และส่งเสนอต่อไปยังผู้บริหารระดับสูงเพื่อลงนามอนุมัติ`;
  }

  history.push({
    status: newStatus,
    timestamp: now,
    actor: `${auditData.adminName} (${auditData.adminPosition || 'Admin/ผู้ดูแลระบบ'})`,
    note: `[Admin Verification & Audit] ${statusNote}`
  });

  const updatedItem: RequestItem = {
    ...item,
    status: newStatus,
    adminAudit: auditData,
    updatedAt: now,
    officerNotes: auditData.adminNotes ? `[ข้อสั่งการ Admin]: ${auditData.adminNotes}` : item.officerNotes,
    statusHistory: history
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}

/**
 * ดึงข้อมูลประวัติการดำเนินการ (Processing History) ของคำร้อง หรือสร้างประวัติเริ่มต้นจาก workflow และ status history
 */
export function getInitialOrDerivedProcessingHistory(item: RequestItem): ProcessingHistoryLog[] {
  if (item.processingHistory && item.processingHistory.length > 0) {
    return item.processingHistory;
  }

  const logs: ProcessingHistoryLog[] = [];

  // 1. Initial submission log
  logs.push({
    id: `LOG-INIT-${item.id}-00`,
    stepTitle: 'ขั้นตอนที่ 0: ยื่นคำร้องผ่านระบบออนไลน์ (Initial Request Submission)',
    stepNumber: 0,
    status: 'submitted',
    timestamp: item.createdAt || new Date().toISOString(),
    adminUserId: 'USER-APPLICANT',
    adminName: `${item.applicant?.prefix || ''}${item.applicant?.fullName || 'ผู้ยื่นคำร้อง'}`,
    adminRole: 'ผู้ยื่นคำร้อง / ประชาชนผู้รับบริการ',
    remarks: `ยื่นคำร้อง "${item.title}" เข้าสู่ระบบ e-Service เทศบาลเมืองชัยภูมิ เรียบร้อยแล้ว`,
    actionType: 'manual_log',
    loggedAt: item.createdAt || new Date().toISOString()
  });

  // 2. Derive logs from approvalWorkflow.steps if present
  if (item.approvalWorkflow && item.approvalWorkflow.steps) {
    item.approvalWorkflow.steps.forEach((step, idx) => {
      if (step.status === 'approved' || step.status === 'in_progress' || step.status === 'rejected' || step.actionDate || step.comment) {
        const stepNum = step.stepNumber || idx + 1;
        const ts = step.actionDate || item.updatedAt || item.createdAt;
        const adminId = `ADM-${1000 + stepNum}`;
        logs.push({
          id: `LOG-STEP-${item.id}-${step.id || stepNum}`,
          stepId: step.id,
          stepNumber: stepNum,
          stepTitle: step.roleTitle || `ขั้นตอนที่ ${stepNum}: พิจารณาตรวจสอบและอนุมัติ`,
          status: step.status,
          timestamp: ts,
          adminUserId: adminId,
          adminName: step.approverName || 'เจ้าหน้าที่ผู้มีอำนาจลงนาม',
          adminRole: step.approverPosition || 'ผู้อนุมัติประจำขั้นตอน',
          remarks: step.comment || (step.status === 'approved' ? 'ลงนามตรวจสอบและเห็นชอบอนุมัติตามระเบียบราชการ' : (step.status === 'in_progress' ? 'อยู่ระหว่างการพิจารณาตรวจสอบรายละเอียด' : 'บันทึกข้อมูลขั้นตอน')),
          actionType: 'step_approval',
          loggedAt: ts
        });
      }
    });
  }

  // 3. Include Admin Verification Audit if present
  if (item.adminAudit) {
    logs.push({
      id: `LOG-AUDIT-${item.id}`,
      stepTitle: 'การตรวจสอบและกลั่นกรองคำร้องระดับ Admin (Admin Verification & Audit)',
      status: item.adminAudit.auditResult === 'approved' ? 'approved' : (item.adminAudit.auditResult === 'rejected' ? 'rejected' : 'under_review'),
      timestamp: item.adminAudit.auditTimestamp || item.updatedAt,
      adminUserId: item.adminAudit.officialAuditCode || 'ADM-CHIEF-01',
      adminName: item.adminAudit.adminName || 'นายสมศักดิ์ ชัยภูมิพัฒนา',
      adminRole: item.adminAudit.adminPosition || 'Admin/ผู้ดูแลระบบ',
      remarks: item.adminAudit.adminNotes || `ตรวจสอบยืนยันตัวตน, หนังสือแจ้งความ, และเงื่อนไขการส่งมอบภาพ (${item.adminAudit.deliveryCondition})`,
      actionType: 'verification',
      loggedAt: item.adminAudit.auditTimestamp || item.updatedAt
    });
  }

  // Sort logs by timestamp ascending
  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * บันทึกประวัติการดำเนินการขั้นตอน (Log Processing History Entry)
 */
export function addProcessingHistoryLog(
  requestId: string,
  logData: Omit<ProcessingHistoryLog, 'id' | 'loggedAt'>
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const now = new Date().toISOString();
  const currentLogs = getInitialOrDerivedProcessingHistory(item);

  const newLog: ProcessingHistoryLog = {
    ...logData,
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    loggedAt: now
  };

  const updatedLogs = [...currentLogs, newLog].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Also add note to statusHistory if significant action
  const updatedStatusHistory = [
    ...item.statusHistory,
    {
      status: item.status,
      timestamp: logData.timestamp || now,
      actor: `${logData.adminName} (ID: ${logData.adminUserId})`,
      note: `[บันทึกประวัติการดำเนินการ] ${logData.stepTitle}: ${logData.remarks}`
    }
  ];

  // If a step status was provided and matches an approvalStep, update the workflow step too!
  let updatedWorkflow = item.approvalWorkflow;
  if (logData.stepId && item.approvalWorkflow && item.approvalWorkflow.steps) {
    const updatedSteps = item.approvalWorkflow.steps.map(s => {
      if (s.id === logData.stepId) {
        return {
          ...s,
          status: (logData.status as any) || s.status,
          actionDate: logData.timestamp || s.actionDate,
          comment: logData.remarks || s.comment,
          approverName: logData.adminName || s.approverName
        };
      }
      return s;
    });
    updatedWorkflow = {
      ...item.approvalWorkflow,
      steps: updatedSteps
    };
  }

  const updatedItem: RequestItem = {
    ...item,
    processingHistory: updatedLogs,
    statusHistory: updatedStatusHistory,
    approvalWorkflow: updatedWorkflow,
    updatedAt: now
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}

/**
 * แก้ไขประวัติการดำเนินการ (Update Processing History Entry)
 */
export function updateProcessingHistoryLog(
  requestId: string,
  logId: string,
  updatedFields: Partial<ProcessingHistoryLog>
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const currentLogs = getInitialOrDerivedProcessingHistory(item);

  const updatedLogs = currentLogs.map(l => {
    if (l.id === logId) {
      return { ...l, ...updatedFields };
    }
    return l;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const updatedItem: RequestItem = {
    ...item,
    processingHistory: updatedLogs,
    updatedAt: new Date().toISOString()
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}

/**
 * ลบประวัติการดำเนินการ (Delete Processing History Entry)
 */
export function deleteProcessingHistoryLog(
  requestId: string,
  logId: string
): RequestItem | null {
  const requests = getStoredRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return null;

  const item = requests[index];
  const currentLogs = getInitialOrDerivedProcessingHistory(item);
  const updatedLogs = currentLogs.filter(l => l.id !== logId);

  const updatedItem: RequestItem = {
    ...item,
    processingHistory: updatedLogs,
    updatedAt: new Date().toISOString()
  };

  requests[index] = updatedItem;
  saveStoredRequests(requests);
  saveRequestToFirestore(updatedItem);

  return updatedItem;
}



