import React, { useState, useEffect, useRef } from 'react';
import { REQUEST_CATEGORIES } from '../data/categories';
import { DOCUMENT_CATEGORIES, getDocumentCategoryDef } from '../data/documentCategories';
import { RequestCategory, PriorityLevel, ApplicantInfo, AttachmentFile, RequestItem, DocumentCategoryType, AiAutoTagResult } from '../types/request';
import { createNewRequest, saveFormDraft, getFormDraft, clearFormDraft, FormDraftData } from '../utils/storage';
import { getUserProfile, profileToApplicantInfo } from '../utils/userProfileService';
import { sendSubmissionConfirmationEmail } from '../utils/emailService';
import { sendSubmissionConfirmationSms } from '../utils/smsService';
import { getStoredCctvCameras } from '../data/cctvData';
import { SignaturePad } from './SignaturePad';
import { AiTextPolisher } from './AiTextPolisher';
import { IncidentLocationMap } from './IncidentLocationMap';
import { AiAutoTagBanner, AiTopicBadge } from './AiTopicBadge';
import { DocumentScannerModal } from './DocumentScannerModal';
import { IncidentCameraModal } from './IncidentCameraModal';
import { autoTagRequestWithGemini, classifyRequestTopicsHeuristic } from '../services/geminiService';
import { FormQuickHelpTour, FieldQuickTooltip, IncidentTemplate } from './FormQuickHelpTour';
import { GooglePickerLauncher } from './GooglePickerLauncher';
import { convertPickerDocToAttachment, GooglePickerPickedFile } from '../utils/googlePicker';
import { getStoredAuthUser, signInWithGoogle, subscribeToAuthState, AuthUserData } from '../utils/firebaseAuthService';
import { 
  ArrowLeft, 
  Send, 
  UploadCloud, 
  X, 
  File, 
  CheckCircle2, 
  AlertCircle,
  User,
  UserCheck,
  FileText,
  Paperclip,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Save,
  Bookmark,
  RotateCcw,
  Trash2,
  Sparkles,
  Camera,
  Check,
  Image as ImageIcon,
  Eye,
  Plus,
  Smartphone,
  MapPin,
  AlertTriangle,
  HardDrive,
  LogIn
} from 'lucide-react';

interface RequestFormProps {
  category: RequestCategory;
  onBack: () => void;
  onSubmitSuccess: (createdItem: RequestItem) => void;
  initialTitle?: string;
  initialReason?: string;
  initialDynamicFields?: Record<string, any>;
  initialAttachments?: AttachmentFile[];
  onOpenProfileModal?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  category,
  onBack,
  onSubmitSuccess,
  initialTitle,
  initialReason,
  initialDynamicFields,
  initialAttachments,
  onOpenProfileModal,
  onOpenAiAssistant,
  onOpenPrivacyModal
}) => {
  const categoryDef = REQUEST_CATEGORIES.find((c) => c.id === category) || REQUEST_CATEGORIES[0];

  // Form State
  const [applicant, setApplicant] = useState<ApplicantInfo>({
    prefix: 'นาย',
    fullName: '',
    citizenIdOrCode: '',
    email: '',
    phone: '',
    department: '',
    positionOrMajor: ''
  });

  const [title, setTitle] = useState(initialTitle || '');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [reason, setReason] = useState(initialReason || '');
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>(initialDynamicFields || {});
  const [attachments, setAttachments] = useState<AttachmentFile[]>(initialAttachments || []);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialAttachments && initialAttachments.length > 0) {
      setAttachments(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newOnes = initialAttachments.filter(a => !existingIds.has(a.id));
        return [...prev, ...newOnes];
      });
    }
  }, [initialAttachments]);

  // Draft Management State & Autosave
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
  const [existingDraft, setExistingDraft] = useState<FormDraftData | null>(null);
  const [lastAutosavedTime, setLastAutosavedTime] = useState<string | null>(null);
  const isRestoredRef = useRef(false);

  // UI state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showIncidentCameraModal, setShowIncidentCameraModal] = useState(false);
  const [incidentCameraPreset, setIncidentCameraPreset] = useState<'broken_camera' | 'incident_site' | 'scene' | 'damage' | 'plate' | 'cctv_point' | 'custom'>('broken_camera');
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string; desc?: string } | null>(null);
  const directCameraInputRef = useRef<HTMLInputElement | null>(null);

  // AI Auto-Tagging State
  const [aiAutoTags, setAiAutoTags] = useState<AiAutoTagResult | undefined>(undefined);
  const [isAnalyzingTags, setIsAnalyzingTags] = useState(false);

  // Firebase Auth & Google Account State
  const [authUser, setAuthUser] = useState<AuthUserData | null>(getStoredAuthUser());
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => setAuthUser(u));
    return () => unsub();
  }, []);

  const handleFillFromGoogleAuth = () => {
    if (!authUser) return;
    setApplicant(prev => ({
      ...prev,
      fullName: prev.fullName || authUser.displayName || '',
      email: authUser.email || prev.email
    }));
  };

  // Debounced AI Auto-tagging analysis: Instant local heuristics + smooth debounced Gemini enhancement
  useEffect(() => {
    if (!title.trim() && !reason.trim()) {
      setAiAutoTags(undefined);
      return;
    }

    // 1. Immediately provide instant local classification
    const immediateHeuristic = classifyRequestTopicsHeuristic(title, reason, category, dynamicFields);
    setAiAutoTags(immediateHeuristic);

    // 2. Debounce deep Gemini AI analysis only when user pauses typing
    const timer = setTimeout(async () => {
      if ((title.trim().length >= 4 || reason.trim().length >= 8)) {
        setIsAnalyzingTags(true);
        try {
          const res = await autoTagRequestWithGemini(title, reason, category, dynamicFields);
          setAiAutoTags(res);
        } catch {
          setAiAutoTags(immediateHeuristic);
        } finally {
          setIsAnalyzingTags(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, reason, category, dynamicFields]);

  // 1. Auto-restore on mount if draft exists in localStorage
  useEffect(() => {
    if (isRestoredRef.current) return;
    isRestoredRef.current = true;

    const draft = getFormDraft(category);
    if (draft && (draft.title || draft.reason || draft.applicant?.fullName || draft.applicant?.phone || Object.keys(draft.dynamicFields || {}).length > 0)) {
      if (draft.applicant) setApplicant(draft.applicant);
      if (draft.title) setTitle(draft.title);
      if (draft.priority) setPriority(draft.priority as PriorityLevel);
      if (draft.reason) setReason(draft.reason);
      if (draft.dynamicFields) setDynamicFields(draft.dynamicFields);
      if (draft.signatureDataUrl) setSignatureDataUrl(draft.signatureDataUrl);
      if (draft.step) setStep(draft.step as 1 | 2 | 3);

      setExistingDraft(draft);
      const timeStr = new Date(draft.savedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setLastAutosavedTime(timeStr);
      setDraftSavedNotice(`⚡ คืนค่าร่างข้อมูลที่คุณกรอกค้างไว้อัตโนมัติเรียบร้อยแล้ว (${timeStr} น.)`);
      setTimeout(() => setDraftSavedNotice(null), 5000);
    }
  }, [category]);

  // 2. Debounced Autosave on form state changes
  useEffect(() => {
    if (!isRestoredRef.current) return;

    const hasContent = Boolean(
      (title || '').trim() ||
      (reason || '').trim() ||
      applicant.fullName?.trim() ||
      applicant.phone?.trim() ||
      applicant.email?.trim() ||
      applicant.citizenIdOrCode?.trim() ||
      Object.keys(dynamicFields).length > 0 ||
      signatureDataUrl
    );

    if (!hasContent) return;

    const timer = setTimeout(() => {
      const saved = saveFormDraft(category, {
        applicant,
        title,
        priority,
        reason,
        dynamicFields,
        signatureDataUrl,
        step
      });
      setExistingDraft(saved);
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutosavedTime(nowStr);
    }, 750);

    return () => clearTimeout(timer);
  }, [applicant, title, priority, reason, dynamicFields, signatureDataUrl, step, category]);

  const handleSaveDraft = () => {
    const saved = saveFormDraft(category, {
      applicant,
      title,
      priority,
      reason,
      dynamicFields,
      signatureDataUrl,
      step
    });
    setExistingDraft(saved);
    const timeStr = new Date().toLocaleTimeString('th-TH');
    setLastAutosavedTime(timeStr);
    setDraftSavedNotice(`บันทึกร่างคำร้องสำเร็จแล้วเมื่อ ${timeStr} น.`);
    setTimeout(() => setDraftSavedNotice(null), 4000);
  };

  const handleRestoreDraft = () => {
    if (!existingDraft) return;
    if (existingDraft.applicant) setApplicant(existingDraft.applicant);
    if (existingDraft.title) setTitle(existingDraft.title);
    if (existingDraft.priority) setPriority(existingDraft.priority as PriorityLevel);
    if (existingDraft.reason) setReason(existingDraft.reason);
    if (existingDraft.dynamicFields) setDynamicFields(existingDraft.dynamicFields);
    if (existingDraft.signatureDataUrl) setSignatureDataUrl(existingDraft.signatureDataUrl);
    if (existingDraft.step) setStep(existingDraft.step as 1 | 2 | 3);

    setDraftSavedNotice('ดึงข้อมูลร่างคำร้องที่บันทึกไว้สำเร็จแล้ว');
    setTimeout(() => setDraftSavedNotice(null), 4000);
  };

  const handleClearDraft = () => {
    clearFormDraft(category);
    setExistingDraft(null);
    setLastAutosavedTime(null);
    setApplicant({
      prefix: 'นาย',
      fullName: '',
      citizenIdOrCode: '',
      email: '',
      phone: '',
      department: '',
      positionOrMajor: ''
    });
    setTitle(initialTitle || '');
    setReason(initialReason || '');
    setPriority('medium');
    setDynamicFields(initialDynamicFields || {});
    setSignatureDataUrl(null);
    setStep(1);
    setDraftSavedNotice('ล้างข้อมูลและเริ่มต้นเขียนแบบคำร้องใหม่เรียบร้อยแล้ว');
    setTimeout(() => setDraftSavedNotice(null), 3500);
  };

  const handleAutofillFromProfile = () => {
    const profile = getUserProfile();
    const info = profileToApplicantInfo(profile);
    setApplicant(info);
    setDraftSavedNotice(`⚡ ดึงข้อมูลส่วนบุคคลของคุณ (${profile.fullName || 'ผู้ยื่นคำร้อง'}) จากโปรไฟล์สำเร็จแล้ว`);
    setTimeout(() => setDraftSavedNotice(null), 4500);
  };

  // Quick Help template applicator
  const handleApplyHelpTemplate = (template: IncidentTemplate) => {
    setTitle(template.requestTitle);
    setReason(template.reason);
    setDynamicFields((prev) => ({
      ...prev,
      ...template.dynamicFields
    }));
    setStep(2);
    setDraftSavedNotice(`⚡ นำเข้าเทมเพลต "${template.title}" เรียบร้อยแล้ว สามารถแก้ไขข้อมูลเพิ่มเติมได้ทันที`);
    setTimeout(() => setDraftSavedNotice(null), 5000);
  };

  // Quick Help single field sample applicator
  const handleApplySingleFieldSample = (fieldKey: string, value: any) => {
    if (fieldKey === 'title') {
      setTitle(value);
    } else if (fieldKey === 'reason') {
      setReason(value);
    } else {
      setDynamicFields((prev) => ({
        ...prev,
        [fieldKey]: value
      }));
    }
    setDraftSavedNotice(`⚡ ใส่ข้อความตัวอย่างสำหรับ "${fieldKey}" เรียบร้อยแล้ว`);
    setTimeout(() => setDraftSavedNotice(null), 4000);
  };

  // Dynamic field change handler
  const handleDynamicChange = (fieldId: string, value: any) => {
    setDynamicFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const autoDetectDocumentCategory = (fileName: string): DocumentCategoryType => {
    const lower = (fileName || '').toLowerCase();
    if (lower.includes('บัตร') || lower.includes('id') || lower.includes('citizen') || lower.includes('passport') || lower.includes('ประชาชน')) return 'id_card';
    if (lower.includes('ตำรวจ') || lower.includes('แจ้งความ') || lower.includes('police') || lower.includes('บันทึกประจำวัน')) return 'police_report';
    if (lower.includes('cctv') || lower.includes('กล้อง') || lower.includes('ภาพ') || lower.includes('photo') || lower.includes('หลักฐาน') || lower.includes('evidence')) return 'evidence_photo';
    if (lower.includes('คำร้อง') || lower.includes('แบบฟอร์ม') || lower.includes('request') || lower.includes('form') || lower.includes('ขออนุมัติ')) return 'application_form';
    if (lower.includes('คำสั่ง') || lower.includes('หนังสือราชการ') || lower.includes('ประกาศ') || lower.includes('official') || lower.includes('letter')) return 'official_letter';
    if (lower.includes('ใบเสร็จ') || lower.includes('เสนอราคา') || lower.includes('invoice') || lower.includes('receipt') || lower.includes('bill') || lower.includes('งบ')) return 'financial_doc';
    if (lower.includes('แพทย์') || lower.includes('medical') || lower.includes('หมอ') || lower.includes('โรงพยาบาล')) return 'medical_cert';
    return 'other';
  };

  // File Upload Handler using FileReader for DataURL persistence
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const newAttachments: AttachmentFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const detectedCategory = autoDetectDocumentCategory(file.name);

      newAttachments.push({
        id: `att-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        dataUrl: dataUrl || undefined,
        uploadedBy: 'ผู้ยื่นคำร้อง',
        description: 'เอกสารแนบผู้ยื่นคำร้อง',
        documentCategory: detectedCategory
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAttachmentDescription = (id: string, desc: string) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, description: desc } : a)));
  };

  const updateAttachmentCategoryTag = (id: string, cat: DocumentCategoryType) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, documentCategory: cat } : a)));
  };

  const handleAttachScannedFiles = (scannedFiles: AttachmentFile[]) => {
    setAttachments((prev) => [...prev, ...scannedFiles]);
  };

  const handleAttachIncidentPhotos = (photos: AttachmentFile[]) => {
    setAttachments((prev) => [...prev, ...photos]);
  };

  const handleGooglePickerPickedFiles = (pickedDocs: GooglePickerPickedFile[]) => {
    const newAttachments: AttachmentFile[] = pickedDocs.map((doc, idx) => {
      const isImg = doc.mimeType.startsWith('image/');
      const isPdf = doc.mimeType === 'application/pdf';
      const isVid = doc.mimeType.startsWith('video/');
      let docCategory: DocumentCategoryType = 'other';
      if (isPdf) docCategory = autoDetectDocumentCategory(doc.name);
      else if (isImg || isVid) docCategory = 'evidence_photo';

      return {
        id: `GDRIVE-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        name: doc.name,
        size: doc.sizeBytes || 1024 * 1024,
        type: doc.mimeType || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        url: doc.url,
        dataUrl: isImg && doc.thumbnailUrl ? doc.thumbnailUrl : undefined,
        uploadedBy: 'ผู้ยื่นคำร้อง (Google Drive Picker)',
        description: `ไฟล์นำเข้าจาก Google Drive (${doc.name})`,
        documentCategory: docCategory,
        driveFileId: doc.id,
        driveViewUrl: doc.url
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    setDraftSavedNotice(`📁 นำเข้า ${newAttachments.length} ไฟล์จาก Google Drive เรียบร้อยแล้ว`);
    setTimeout(() => setDraftSavedNotice(null), 4000);
  };

  const openIncidentCamera = (preset: 'broken_camera' | 'incident_site' | 'scene' | 'damage' | 'plate' | 'cctv_point' | 'custom' = 'broken_camera') => {
    setIncidentCameraPreset(preset);
    setShowIncidentCameraModal(true);
  };

  const handleDirectMobileCamera = async (e: React.ChangeEvent<HTMLInputElement>, tagPreset: 'broken_camera' | 'incident_site' | 'damage' = 'broken_camera') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    const newPhotos: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const label = 
        tagPreset === 'broken_camera' ? 'ภาพถ่ายกล้องวงจรปิดชำรุด / อุปกรณ์ขัดข้อง (จากกล้อง)' :
        tagPreset === 'incident_site' ? 'ภาพถ่ายสถานที่เกิดเหตุ / จุดเกิดเหตุ (จากกล้อง)' :
        'ภาพถ่ายหลักฐานประกอบคำร้อง (จากกล้อง)';

      newPhotos.push({
        id: `CAM-SNAP-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        name: `Camera_Evidence_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.jpg`,
        size: file.size,
        type: file.type || 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        dataUrl,
        uploadedBy: 'ผู้ยื่นคำร้อง (Camera)',
        description: label,
        documentCategory: 'evidence_photo'
      });
    }

    setAttachments(prev => [...prev, ...newPhotos]);
    if (e.target) e.target.value = '';
  };

  // Form validation per step
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!(applicant.fullName || '').trim()) errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (!(applicant.citizenIdOrCode || '').trim()) errs.citizenIdOrCode = 'กรุณากรอกเลขประจำตัวประชาชน/รหัสประจำตัว';
    if (!(applicant.phone || '').trim()) errs.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    if ((applicant.email || '').trim() && !applicant.email?.includes('@')) errs.email = 'กรุณากรอกอีเมลที่ถูกต้อง (เช่น user@example.com)';
    if (!(applicant.department || '').trim()) errs.department = 'กรุณากรอกแผนก/คณะ/หน่วยงาน';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!(title || '').trim()) errs.title = 'กรุณากรอกหัวข้อคำร้อง';
    if (!(reason || '').trim()) errs.reason = 'กรุณากรอกเหตุผลความจำเป็นในการยื่นคำร้อง';

    // Validate required dynamic fields
    categoryDef.fields.forEach((field) => {
      if (field.required && (!dynamicFields[field.id] || String(dynamicFields[field.id]).trim() === '')) {
        errs[field.id] = `กรุณากรอก/เลือก${field.label}`;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const finalAutoTags = aiAutoTags || classifyRequestTopicsHeuristic(title, reason, category, dynamicFields);

      const created = createNewRequest({
        category,
        title,
        applicant,
        details: dynamicFields,
        reason,
        priority,
        attachments,
        signatureDataUrl: signatureDataUrl || undefined,
        status: 'submitted',
        aiAutoTags: finalAutoTags,
        userId: authUser?.uid,
        userEmail: authUser?.email,
        isGoogleVerified: !!authUser
      });

      // Trigger simulated submission confirmation email & SMS
      sendSubmissionConfirmationEmail(created);
      sendSubmissionConfirmationSms(created);

      setIsSubmitting(false);
      clearFormDraft(category);
      onSubmitSuccess(created);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation & Category Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปเลือกหมวดหมู่คำร้อง
        </button>

        <div className="flex items-center gap-3">
          {lastAutosavedTime && (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>บันทึกอัตโนมัติ ({lastAutosavedTime} น.)</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
            title="บันทึกข้อมูลร่างเก็บไว้ในเบราว์เซอร์ทันที"
          >
            <Save className="w-3.5 h-3.5 text-amber-600" />
            บันทึกร่าง
          </button>

          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-xl font-medium text-xs transition-colors cursor-pointer"
            title="ล้างข้อมูลคำร้องที่พิมพ์ค้างไว้เพื่อเริ่มใหม่"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            ล้างฟอร์ม
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-3">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>SLA: <strong>{categoryDef.slaDays} วันทำการ</strong></span>
          </div>
        </div>
      </div>

      {/* Draft Status Toast / Notification */}
      {draftSavedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {draftSavedNotice}
          </span>
          <button onClick={() => setDraftSavedNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing Saved Draft Detected Alert */}
      {existingDraft && (
        <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
          <div className="space-y-0.5">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-600" />
              พบร่างคำร้องที่คุณบันทึกค้างไว้ในระบบ
            </span>
            <p className="text-amber-800 text-[11px]">
              บันทึกไว้เมื่อ: {new Date(existingDraft.savedAt).toLocaleString('th-TH')} น.
              {existingDraft.title ? ` (เรื่อง: "${existingDraft.title}")` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              โหลดข้อมูลร่างมาทำต่อ
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-medium px-3 py-1.5 rounded-xl transition-colors"
              title="ลบข้อมูลร่างนี้ทิ้ง"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ละทิ้งร่าง
            </button>
          </div>
        </div>
      )}

      {/* Title Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-blue-800/50 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              แบบฟอร์มบันทึกคำร้องออนไลน์
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-300/30">
              💡 มีระบบช่วยกรอก & แนะนำจุดกล้อง
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold">{categoryDef.titleTh}</h2>
          <p className="text-xs text-blue-200/80">{categoryDef.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <FormQuickHelpTour
            category={category}
            currentStep={step}
            onSetFormStep={(s) => setStep(s)}
            onApplyTemplate={handleApplyHelpTemplate}
            onApplyFieldValue={handleApplySingleFieldSample}
          />

          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl border border-white/20 text-xs backdrop-blur-sm transition-colors shrink-0"
          >
            <Bookmark className="w-4 h-4 text-amber-300" />
            บันทึกร่างคำร้อง
          </button>
        </div>
      </div>

      {/* Visual Step-by-Step Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        {/* Top Header Status & Progress Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-blue-200">
              ขั้นตอนที่ {step} จาก 3
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {step === 1 && '1. ข้อมูลผู้ยื่นคำร้อง (Info)'}
              {step === 2 && '2. รายละเอียดคำร้อง (Details)'}
              {step === 3 && '3. เอกสารแนบ & ตรวจสอบ (Review & Submit)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              ความคืบหน้า {step === 1 ? '33%' : step === 2 ? '66%' : '100%'}
            </span>
            <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Stepper Node Grid */}
        <div className="relative px-2">
          {/* Connecting Line (Desktop/Tablet) */}
          <div className="absolute top-5 left-12 right-12 h-1 bg-slate-200 rounded-full z-0 hidden sm:block" />
          <div
            className="absolute top-5 left-12 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full z-0 transition-all duration-500 hidden sm:block"
            style={{
              width: step === 1 ? '0%' : step === 2 ? 'calc(50% - 1.5rem)' : 'calc(100% - 3rem)',
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2 relative z-10">
            {/* Step 1 Node */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  step === 1
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 font-bold scale-105'
                    : step > 1
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                {step > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : <User className="w-5 h-5" />}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center sm:justify-center gap-1">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    step === 1 ? 'text-blue-700' : step > 1 ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    1. Info
                  </span>
                  {step > 1 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                      ✓ ครบถ้วน
                    </span>
                  )}
                </div>
                <h4 className={`text-xs font-bold leading-tight ${step === 1 ? 'text-blue-900' : 'text-slate-800'}`}>
                  ข้อมูลผู้ยื่นคำร้อง
                </h4>
                <p className="text-[10px] text-slate-500 hidden md:block">
                  ชื่อ-นามสกุล, เบอร์โทร, สังกัด
                </p>
              </div>
            </button>

            {/* Step 2 Node */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  step === 2
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 font-bold scale-105'
                    : step > 2
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                {step > 2 ? <Check className="w-5 h-5 stroke-[3]" /> : <FileText className="w-5 h-5" />}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center sm:justify-center gap-1">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    step === 2 ? 'text-blue-700' : step > 2 ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    2. Details
                  </span>
                  {step > 2 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                      ✓ ครบถ้วน
                    </span>
                  )}
                </div>
                <h4 className={`text-xs font-bold leading-tight ${step === 2 ? 'text-blue-900' : 'text-slate-800'}`}>
                  รายละเอียดคำร้อง
                </h4>
                <p className="text-[10px] text-slate-500 hidden md:block">
                  หัวข้อคำร้อง, เหตุผลความจำเป็น
                </p>
              </div>
            </button>

            {/* Step 3 Node */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setStep(3);
              }}
              className="flex sm:flex-col items-center sm:items-center text-left sm:text-center gap-3 sm:gap-2 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                  step === 3
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 font-bold scale-105'
                    : 'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                <Paperclip className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center sm:justify-center gap-1">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    step === 3 ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    3. Review
                  </span>
                </div>
                <h4 className={`text-xs font-bold leading-tight ${step === 3 ? 'text-blue-900' : 'text-slate-800'}`}>
                  เอกสารแนบ & ยืนยัน
                </h4>
                <p className="text-[10px] text-slate-500 hidden md:block">
                  แนบไฟล์, ลายเซ็น, ตรวจสอบ
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {/* STEP 1: Applicant Information */}
        {step === 1 && (
          <div id="step-applicant-section" className="space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง (Applicant Information)
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutofillFromProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  title="ดึงชื่อ เบอร์โทร เลขบัตร และสังกัดจากโปรไฟล์ของคุณมาใส่ในฟอร์มทันที"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>ดึงข้อมูลจากโปรไฟล์ของฉัน</span>
                </button>

                {onOpenProfileModal && (
                  <button
                    type="button"
                    onClick={onOpenProfileModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
                    title="เปิดหน้าต่างแก้ไขข้อมูลส่วนตัวโปรไฟล์"
                  >
                    <span>แก้ไขโปรไฟล์</span>
                  </button>
                )}
              </div>
            </div>

            {/* Google Authentication & Identity Verification Banner */}
            {authUser ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={authUser.displayName || 'Google Account'}
                      className="w-10 h-10 rounded-full border border-blue-300 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {authUser.displayName?.[0] || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-blue-950 text-xs sm:text-sm">
                        {authUser.displayName || 'ผู้ใช้งาน Google Account'}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ยืนยันตัวตนด้วย Google Auth
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      อีเมล: <span className="font-semibold text-slate-800">{authUser.email}</span> (เชื่อมโยงฐานข้อมูล Firestore เรียบร้อย)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillFromGoogleAuth}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    title="นำชื่อและอีเมลจากบัญชี Google มากรอกในช่องแบบฟอร์ม"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>เติมชื่อและอีเมลจาก Google</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 max-w-xl">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>เข้าสู่ระบบด้วย Google เพื่อยืนยันตัวตนและซิงค์ข้อมูลกับ Firestore</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    เพิ่มความสะดวกรวดเร็วในการติดตามสถานะคำร้องแบบเรียลไทม์ และบันทึกประวัติไว้ในคลาวด์
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSigningInGoogle(true);
                    try {
                      const user = await signInWithGoogle();
                      if (user) {
                        setApplicant(prev => ({
                          ...prev,
                          fullName: prev.fullName || user.displayName || '',
                          email: user.email || prev.email
                        }));
                      }
                    } catch (err: any) {
                      alert(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');
                    } finally {
                      setIsSigningInGoogle(false);
                    }
                  }}
                  disabled={isSigningInGoogle}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <LogIn className={`w-4 h-4 text-blue-600 ${isSigningInGoogle ? 'animate-spin' : ''}`} />
                  <span>{isSigningInGoogle ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">คำนำหน้าชื่อ</label>
                <select
                  value={applicant.prefix}
                  onChange={(e) => setApplicant({ ...applicant, prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ผศ.ดร.">ผศ.ดร.</option>
                  <option value="อาจารย์">อาจารย์</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={applicant.fullName}
                  onChange={(e) => setApplicant({ ...applicant, fullName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.fullName ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.fullName && <p className="text-rose-600 text-[11px] mt-0.5">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวประชาชน / รหัสนิสิต / รหัสพนักงาน *</label>
                <input
                  type="text"
                  placeholder="เช่น 1100200345671 หรือ EMP-2568"
                  value={applicant.citizenIdOrCode}
                  onChange={(e) => setApplicant({ ...applicant, citizenIdOrCode: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.citizenIdOrCode ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.citizenIdOrCode && <p className="text-rose-600 text-[11px] mt-0.5">{errors.citizenIdOrCode}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                <input
                  type="tel"
                  placeholder="เช่น 081-234-5678"
                  value={applicant.phone}
                  onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.phone ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="text-rose-600 text-[11px] mt-0.5">{errors.phone}</p>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  อีเมลติดต่อ <span className="text-slate-400 font-normal">(ไม่บังคับ / Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="เช่น user@organization.com (สำหรับรับอีเมลยืนยันคำร้อง)"
                  value={applicant.email}
                  onChange={(e) => setApplicant({ ...applicant, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.email ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.email ? (
                  <p className="text-rose-600 text-[11px] mt-0.5">{errors.email}</p>
                ) : (
                  <p className="text-slate-400 text-[10px] mt-1">
                    หากระบุอีเมล ระบบจะส่งอีเมลยืนยันการรับคำร้องและรหัสติดตามให้โดยอัตโนมัติ
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">แผนก / คณะ / หน่วยงานสังกัด *</label>
                <input
                  type="text"
                  placeholder="เช่น ฝ่ายเทคโนโลยีสารสนเทศ"
                  value={applicant.department}
                  onChange={(e) => setApplicant({ ...applicant, department: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.department ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.department && <p className="text-rose-600 text-[11px] mt-0.5">{errors.department}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง / สาขาวิชา / ชั้นปี</label>
                <input
                  type="text"
                  placeholder="เช่น นักวิเคราะห์ระบบชำนาญการ"
                  value={applicant.positionOrMajor}
                  onChange={(e) => setApplicant({ ...applicant, positionOrMajor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-amber-600" />
                บันทึกร่างคำร้อง
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl text-xs shadow-md transition-colors"
              >
                ถัดไป: รายละเอียดคำร้อง
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Request Details & Custom Fields */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                ส่วนที่ 2: รายละเอียดคำร้อง {categoryDef.titleTh}
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div id="step-title-section">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">หัวข้อคำร้อง (เรื่อง) *</label>
                  <FieldQuickTooltip
                    guideTitle="คำแนะนำการตั้งหัวข้อคำร้อง"
                    guideDescription="ระบุประเภทเหตุการณ์และสถานที่หลักสั้นๆ ชัดเจน เพื่อให้ผู้ตรวจคำร้องเข้าใจเจตนาได้ทันที"
                    goodExample="ขอดูภาพกล้องวงจรปิดเหตุการณ์รถเฉี่ยวชน บริเวณสี่แยกหอนาฬิกา"
                    badExample="ขอดูกล้องหน่อยครับ มีเรื่องด่วน"
                    sampleTemplateValue="ขอดูภาพกล้องวงจรปิด CCTV เหตุการณ์รถยนต์เฉี่ยวชน บริเวณสี่แยกหอนาฬิกา"
                    onApplySample={(val) => setTitle(val)}
                  />
                </div>
                <input
                  type="text"
                  placeholder="ระบุหัวข้อคำร้องสั้นๆ เช่น ขอหนังสือรับรองการเป็นพนักงานเพื่อยื่นขอสินเชื่อ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.title ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.title && <p className="text-rose-600 text-[11px] mt-0.5">{errors.title}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">⚡ ระดับความเร่งด่วน (Priority Level) *</label>
                  <FieldQuickTooltip
                    guideTitle="เกณฑ์การเลือกระดับความเร่งด่วน"
                    guideDescription="เลือกระดับตามกรอบเวลาของคดีหรือความจำเป็นจริง (กรณีเหตุคดีอาญา/อุบัติเหตุร้ายแรงที่มีเวลากระชั้นชิดแนะนำ High หรือ Urgent)"
                    goodExample="เลือก 'ด่วนที่สุด (Urgent)' หากต้องนำหลักฐานส่งพนักงานสอบสวนภายในวันนี้"
                    badExample="เลือก Urgent ตลอดเวลาทั้งที่ไม่มีเหตุเร่งด่วน"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { id: 'low', label: 'ต่ำ (Low)', icon: '🟢', desc: 'งานทั่วไป พักคอยได้', activeClass: 'border-slate-500 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-400/20' },
                    { id: 'medium', label: 'ปานกลาง (Medium)', icon: '🔵', desc: `มาตรฐาน (${categoryDef.slaDays} วัน)`, activeClass: 'border-blue-600 bg-blue-50/90 text-blue-900 font-bold ring-2 ring-blue-500/20' },
                    { id: 'high', label: 'สูง (High)', icon: '⚡', desc: 'ด่วน (1-2 วันทำการ)', activeClass: 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-500/20' },
                    { id: 'urgent', label: 'ด่วนที่สุด (Urgent)', icon: '🔥', desc: 'ต้องทำทันที (ภายในวัน)', activeClass: 'border-rose-600 bg-rose-50/90 text-rose-900 font-bold ring-2 ring-rose-500/20' }
                  ].map((p) => {
                    const isSelected = priority === p.id || (p.id === 'medium' && priority === 'normal') || (p.id === 'urgent' && priority === 'very_urgent');
                    return (
                      <label
                        key={p.id}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? p.activeClass
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={p.id}
                          checked={isSelected}
                          onChange={() => setPriority(p.id as PriorityLevel)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-center gap-1.5 font-bold text-xs mb-0.5">
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal leading-tight">{p.desc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Category Specific Fields */}
              <div id="step-cctv-location-section" className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-800 text-xs">
                    ข้อมูลเฉพาะสำหรับ {categoryDef.titleTh}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    โปรดระบุจุดกล้องและเวลาให้ชัดเจนที่สุด
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryDef.fields.map((field) => {
                    const isLocationField = field.id === 'cctvLocation' || field.id === 'copyLocation' || field.id.toLowerCase().includes('location');
                    const isTimeField = field.id === 'timeRange' || field.id === 'incidentTime' || field.id === 'footageDate';

                    return (
                    <div 
                      key={field.id} 
                      id={isTimeField ? 'step-incident-time-section' : undefined}
                      className={field.type === 'textarea' || field.type === 'map' ? 'md:col-span-2' : ''}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>

                        {isLocationField && (
                          <FieldQuickTooltip
                            guideTitle="เทคนิคระบุจุดติดตั้งกล้อง CCTV"
                            guideDescription="ระบุชื่อถนน สี่แยก หรืออาคารเด่น พร้อมทิศทางมุ่งหน้า เพื่อให้เจ้าหน้าที่เปิดกล้องถูกมุม"
                            goodExample="สี่แยกหอนาฬิกาเมืองชัยภูมิ หน้าธนาคารกรุงไทย มุ่งหน้าถนนหฤทัย"
                            badExample="แถวๆ ตัวเมือง"
                            sampleTemplateValue="สี่แยกหอนาฬิกาเมืองชัยภูมิ ฝั่งมุ่งหน้าถนนหฤทัย"
                            onApplySample={(val) => handleDynamicChange(field.id, val)}
                          />
                        )}

                        {isTimeField && (
                          <FieldQuickTooltip
                            guideTitle="เทคนิคระบุช่วงเวลาเกิดเหตุ"
                            guideDescription="ระบุกรอบเวลาแคบลง บวกลบ 15-30 นาทีจากเวลาเกิดเหตุจริง เพื่อความสะดวกรวดเร็วในการค้นหาไฟล์"
                            goodExample="08:30 น. ถึง 09:15 น. (เกิดเหตุประมาณ 08:45 น.)"
                            badExample="ทั้งวัน หรือ ช่วงเช้า"
                            sampleTemplateValue="08:30 น. ถึง 09:15 น."
                            onApplySample={(val) => handleDynamicChange(field.id, val)}
                          />
                        )}
                      </div>

                      {field.type === 'select' && (
                        <select
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                            errors[field.id] ? 'border-rose-500' : 'border-slate-300'
                          }`}
                        >
                          <option value="">-- กรุณาเลือก --</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'text' && (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder={field.placeholder || ''}
                            value={dynamicFields[field.id] || ''}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                              errors[field.id] ? 'border-rose-500' : 'border-slate-300'
                            }`}
                          />
                          {(field.id === 'cctvLocation' || field.id === 'copyLocation') && (
                            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                              <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-semibold text-slate-700">เลือกจากจุดติดตั้งกล้อง CCTV เทศบาล:</span>
                              <select
                                className="bg-indigo-50/70 border border-indigo-200 text-indigo-950 rounded px-2 py-1 text-[11px] font-medium outline-none focus:ring-1 focus:ring-indigo-500 max-w-[280px] truncate"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleDynamicChange(field.id, e.target.value);
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>-- เลือกจุดติดตั้งกล้องเทศบาล --</option>
                                {getStoredCctvCameras().map((cam) => (
                                  <option key={cam.id} value={`${cam.name} (${cam.id} - ${cam.floor})`}>
                                    {cam.id}: {cam.name} [{cam.status === 'online' ? '🟢 ปกติ' : '🔴 ชำรุด/ออฟไลน์'}]
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          placeholder={field.placeholder || '0'}
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                            errors[field.id] ? 'border-rose-500' : 'border-slate-300'
                          }`}
                        />
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                            errors[field.id] ? 'border-rose-500' : 'border-slate-300'
                          }`}
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || ''}
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${
                            errors[field.id] ? 'border-rose-500' : 'border-slate-300'
                          }`}
                        />
                      )}

                      {field.type === 'map' && (
                        <IncidentLocationMap
                          value={dynamicFields[field.id] || null}
                          onChange={(loc) => handleDynamicChange(field.id, loc)}
                        />
                      )}

                      {errors[field.id] && <p className="text-rose-600 text-[11px] mt-0.5">{errors[field.id]}</p>}
                    </div>
                  )})}
                </div>
              </div>

              {/* Reason for Request with Gemini AI Helper */}
              <div id="step-reason-section">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">เหตุผลความจำเป็นในการยื่นคำร้อง *</label>
                  <FieldQuickTooltip
                    guideTitle="โครงสร้างการเขียนบรรยายเหตุการณ์"
                    guideDescription="ควรระบุ: เกิดอะไรขึ้น + คู่กรณี/ยานพาหนะ + ทิศทางหลบหนี + นำไปประกอบคดีที่ใด"
                    goodExample="มีความประสงค์ขอดูภาพเพื่อติดตามรถกระบะสีดำ ทะเบียน 1กข-xxxx ที่เฉี่ยวชนแล้วหลบหนี เพื่อนำไปแจ้งความ สภ.เมืองชัยภูมิ"
                    badExample="ขอดูกล้องครับ"
                    sampleTemplateValue="มีความประสงค์ขอดูภาพจากกล้องวงจรปิดเพื่อตรวจสอบเหตุการณ์รถเฉี่ยวชนและนำไปเป็นหลักฐานประกอบคดีที่ สภ.เมืองชัยภูมิ"
                    onApplySample={(val) => setReason(val)}
                  />
                </div>

                <textarea
                  rows={4}
                  placeholder="ระบุวัตถุประสงค์และเหตุผลความจำเป็นอย่างชัดเจน..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none document-font text-sm ${
                    errors.reason ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {errors.reason && <p className="text-rose-600 text-[11px] mt-0.5">{errors.reason}</p>}

                <div className="mt-2 space-y-3">
                  <AiTextPolisher
                    originalText={reason}
                    categoryTitle={categoryDef.titleTh}
                    onApplyPolishedText={(polished) => setReason(polished)}
                  />

                  <AiAutoTagBanner
                    autoTags={aiAutoTags}
                    isAnalyzing={isAnalyzingTags}
                    onRefresh={async () => {
                      setIsAnalyzingTags(true);
                      try {
                        const res = await autoTagRequestWithGemini(title, reason, category, dynamicFields);
                        setAiAutoTags(res);
                      } catch {
                        setAiAutoTags(classifyRequestTopicsHeuristic(title, reason, category, dynamicFields));
                      } finally {
                        setIsAnalyzingTags(false);
                      }
                    }}
                  />

                  {/* Step 2 Evidence Photo & Camera Upload Section */}
                  <div id="step-evidence-camera-section" className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-white flex items-center gap-2">
                            <span>ถ่ายภาพหลักฐานประกอบคำร้องด้วยกล้อง</span>
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-400/30 px-1.5 py-0.2 rounded-md font-semibold">
                              Camera Ready
                            </span>
                          </h5>
                          <p className="text-[11px] text-slate-400">
                            ถ่ายภาพกล้องวงจรปิดที่ชำรุด หรือภาพสถานที่จุดเกิดเหตุจริงเพื่อแนบกับคำร้อง
                          </p>
                        </div>
                      </div>

                      {/* Hidden direct mobile camera inputs */}
                      <input
                        ref={directCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleDirectMobileCamera(e, 'broken_camera')}
                        className="hidden"
                        id="native-camera-step2"
                      />
                    </div>

                    {/* Camera & Google Drive Action Buttons Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => openIncidentCamera('broken_camera')}
                        className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30 active:scale-95 text-left"
                      >
                        <Camera className="w-4 h-4 text-rose-200 shrink-0" />
                        <div>
                          <div className="leading-tight">ถ่ายภาพกล้องชำรุด</div>
                          <div className="text-[10px] font-normal text-rose-200">กล้องสด + ประทับตรา</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => openIncidentCamera('incident_site')}
                        className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs p-2.5 rounded-xl border border-slate-700 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-left"
                      >
                        <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="leading-tight">ถ่ายภาพจุดเกิดเหตุ</div>
                          <div className="text-[10px] font-normal text-slate-400">พร้อมพิกัดสถานที่</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => directCameraInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-750 text-emerald-300 font-bold text-xs p-2.5 rounded-xl border border-emerald-500/30 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-left"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="leading-tight text-white">กล้องมือถือด่วน</div>
                          <div className="text-[10px] font-normal text-emerald-300/80">ถ่ายปุ๊บแนบทันที</div>
                        </div>
                      </button>

                      <GooglePickerLauncher
                        variant="compact"
                        defaultView="images"
                        buttonLabel="Google Picker (ไดรฟ์)"
                        onFilesPicked={handleGooglePickerPickedFiles}
                        className="w-full h-full flex items-center"
                      />
                    </div>

                    {/* Attached Photo Evidence Preview Strip in Step 2 */}
                    {attachments.some(a => a.type.startsWith('image/')) && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium mb-1.5">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            รูปภาพหลักฐานที่แนบแล้ว ({attachments.filter(a => a.type.startsWith('image/')).length} ภาพ):
                          </span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {attachments
                            .filter(a => a.type.startsWith('image/'))
                            .map((att) => (
                              <div
                                key={att.id}
                                className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 group shadow-xs cursor-pointer"
                                onClick={() => setPreviewImageModal({ url: att.dataUrl || '', title: att.name, desc: att.description })}
                              >
                                {att.dataUrl && (
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(att.id);
                                  }}
                                  className="absolute top-1 right-1 p-0.5 bg-rose-600/90 text-white rounded-full hover:bg-rose-500 transition-colors"
                                  title="ลบภาพนี้"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-1 py-0.5 text-[9px] text-slate-300 truncate text-center">
                                  {att.description ? att.description.slice(0, 14) : 'ภาพถ่าย'}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ย้อนกลับ
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-amber-600" />
                  บันทึกร่างคำร้อง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl text-xs shadow-md transition-colors"
                >
                  ถัดไป: แนบไฟล์และลายเซ็น
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Attachments & Signature */}
        {step === 3 && (
          <div id="step-review-submit-section" className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-600" />
                ส่วนที่ 3: แนบเอกสารประกอบและลายเซ็นดิจิทัล
              </h3>
            </div>

            {/* Document upload area */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">เอกสารแนบประกอบคำร้อง (PDF, PNG, JPG)</label>
                <span className="text-slate-500">ขนาดไม่เกิน 10MB ต่อไฟล์</span>
              </div>

              {categoryDef.requiredDocuments.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold flex items-center gap-1 text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    รายการเอกสารที่แนะนำให้นำส่ง:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900">
                    {categoryDef.requiredDocuments.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document & Evidence Action Banners Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* 1. Incident Photo Live WebRTC Camera */}
                <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 text-white p-3.5 rounded-2xl border border-rose-900/60 shadow-md flex flex-col justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
                      <Camera className="w-4.5 h-4.5 text-rose-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>ถ่ายภาพกล้องชำรุด / จุดเกิดเหตุ</span>
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          กล้องสด
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        เปิดกล้องสด พร้อมประทับตราเวลา พิกัดสถานที่ และแท็กประเภทอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => openIncidentCamera('broken_camera')}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-rose-400/30 cursor-pointer active:scale-95"
                    >
                      <Camera className="w-3 h-3" />
                      <span>กล้องชำรุด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openIncidentCamera('incident_site')}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <MapPin className="w-3 h-3 text-blue-400" />
                      <span>จุดเกิดเหตุ</span>
                    </button>
                  </div>
                </div>

                {/* 2. Direct Mobile Camera Capture */}
                <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-3.5 rounded-2xl border border-emerald-900/60 shadow-md flex flex-col justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>ถ่ายรูปด้วยกล้องมือถือทันที</span>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          1-Tap
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        เปิดแอปกล้องถ่ายรูปของอุปกรณ์โดยตรง บันทึกภาพแล้วแนบเป็นหลักฐานทันที
                      </p>
                    </div>
                  </div>

                  <label className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/30 text-center">
                    <Camera className="w-3.5 h-3.5 text-emerald-200" />
                    <span>กดถ่ายรูปด้วยกล้องมือถือ</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleDirectMobileCamera(e, 'broken_camera')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. Document Scanner Camera */}
                <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl border border-blue-900/60 shadow-md flex flex-col justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>สแกนเอกสารแนบด้วยกล้อง</span>
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          Doc Scanner
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        ถ่ายภาพบัตรประชาชน/ใบแจ้งความ ระบบปรับความคมชัดขาวดำอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-blue-400/30"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-200" />
                    <span>เปิดกล้องสแกนเอกสาร</span>
                  </button>
                </div>

                {/* 4. Gemini AI Diagram Studio Card */}
                {onOpenAiAssistant && (
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white p-3.5 rounded-2xl border border-indigo-800/60 shadow-md flex flex-col justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4.5 h-4.5 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                          <span>สตูดิโอภาพจำลอง AI</span>
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            Gemini 3.1
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          สร้างแผนผังจุดเกิดเหตุ ทิศทางจราจร หรือมุมมองเสากล้อง CCTV ด้วย AI
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenAiAssistant}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-indigo-400/30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>เปิดสตูดิโอภาพจำลอง AI</span>
                    </button>
                  </div>
                )}

                {/* 5. Google Drive Picker Card */}
                <GooglePickerLauncher
                  variant="card"
                  onFilesPicked={handleGooglePickerPickedFiles}
                />
              </div>

              {/* Quick Google Picker launcher strip + dropzone */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-indigo-900">
                  <HardDrive className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold">ต้องการดึงไฟล์จาก Google Drive?</span>
                    <span className="text-indigo-700 block sm:inline sm:ml-1 text-[11px]">เลือกเอกสาร, วิดีโอ หรือภาพหลักฐานได้ทันทีผ่าน Google Picker</span>
                  </div>
                </div>
                <GooglePickerLauncher
                  variant="compact"
                  buttonLabel="⚡ เปิด Google Picker เพื่อเลือกไฟล์"
                  onFilesPicked={handleGooglePickerPickedFiles}
                />
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-blue-600 hover:underline">คลิกเพื่อเลือกไฟล์</span> หรือลากไฟล์มาวางที่นี่
                  </div>
                  <span className="text-[11px] text-slate-400">รองรับ PDF, JPG, PNG, DOCX</span>
                </div>
              </div>

              {/* Uploaded files list with preview & tags */}
              {attachments.length > 0 && (
                <div className="space-y-3 mt-3">
                  <p className="font-semibold text-slate-800 flex items-center justify-between">
                    <span>รายการไฟล์ข้อมูลและไฟล์งานที่แนบแล้ว ({attachments.length} ไฟล์):</span>
                    <span className="text-[11px] text-slate-500 font-normal">สามารถระบุประเภทหรือคำอธิบายเพิ่มเติมของแต่ละไฟล์ได้</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2 relative group hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 overflow-hidden">
                            {file.type.startsWith('image/') && file.dataUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal({ url: file.dataUrl || '', title: file.name, desc: file.description })}
                                className="relative group/thumb shrink-0 rounded-lg overflow-hidden border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
                              >
                                <img
                                  src={file.dataUrl}
                                  alt={file.name}
                                  className="w-11 h-11 object-cover hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <File className="w-5 h-5" />
                              </div>
                            )}

                            <div className="overflow-hidden space-y-0.5">
                              <p className="font-bold text-slate-900 truncate text-xs" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {typeof file.size === 'number' ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : file.size} • {file.type || 'ไฟล์ทั่วไป'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAttachment(file.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                            title="ลบไฟล์นี้ออก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* File Category Tag Selection & Description */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              🏷️ หมวดหมู่เอกสาร (Document Category):
                            </label>
                            <select
                              value={file.documentCategory || 'other'}
                              onChange={(e) => updateAttachmentCategoryTag(file.id, e.target.value as DocumentCategoryType)}
                              className="w-full px-2 py-1 text-[11px] font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
                            >
                              {DOCUMENT_CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.labelTh} ({cat.labelEn})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              📝 รายละเอียด/หมายเหตุประกอบไฟล์:
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น สำเนาบัตรฉบับลงนาม / ภาพถ่าย CCTV บริเวณประตู 2..."
                              value={file.description || ''}
                              onChange={(e) => updateAttachmentDescription(file.id, e.target.value)}
                              className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Signature Pad */}
            <div className="pt-3 border-t border-slate-100">
              <SignaturePad
                onSignatureChange={(url) => setSignatureDataUrl(url)}
                initialSignature={signatureDataUrl || undefined}
              />
            </div>

            {/* Summary Confirmation Card */}
            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                สรุปการยื่นคำร้อง:
              </div>
              <ul className="space-y-1.5 text-slate-700">
                <li>• <strong>ผู้ยื่น:</strong> {applicant.prefix}{applicant.fullName} ({applicant.department})</li>
                <li>• <strong>เรื่อง:</strong> {title}</li>
                <li>• <strong>ความเร่งด่วน:</strong> {priority === 'normal' ? 'ปกติ' : priority === 'urgent' ? 'ด่วน' : 'ด่วนที่สุด'}</li>
                <li>• <strong>เอกสารแนบ:</strong> {attachments.length} รายการ</li>
                {aiAutoTags && aiAutoTags.topics && aiAutoTags.topics.length > 0 && (
                  <li className="flex items-center gap-1.5 pt-1 border-t border-blue-200/60">
                    • <strong>หมวดหมู่ที่ AI ติดแท็กให้อัตโนมัติ:</strong>
                    <div className="flex flex-wrap items-center gap-1">
                      {aiAutoTags.topics.map(t => (
                        <AiTopicBadge key={t} topic={t} size="sm" isPrimary={t === aiAutoTags.primaryTopic} />
                      ))}
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* PDPA & CCTV Privacy Protection Reassurance Banner */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block text-[11px]">
                    การคุ้มครองข้อมูลส่วนบุคคลและข้อมูลภาพ (PDPA & CCTV Security Compliance)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ข้อมูลผู้ยื่นและเอกสารแนบจะถูกจัดเก็บเป็นความลับเพื่อใช้ในภารกิจทางราชการและการดำเนินคดีเท่านั้น โดยมีระยะเวลาจัดเก็บข้อมูลภาพกล้องวงจรปิด 15-30 วันตามมาตรฐานความปลอดภัย
                  </p>
                </div>
              </div>
              {onOpenPrivacyModal && (
                <button
                  type="button"
                  id="btn-form-read-privacy"
                  onClick={onOpenPrivacyModal}
                  className="text-blue-600 hover:text-blue-800 font-bold text-[11px] underline shrink-0 cursor-pointer pt-0.5"
                >
                  อ่านนโยบายฉบับเต็ม
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ย้อนกลับ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-amber-600" />
                  บันทึกร่างคำร้อง
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl text-xs shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึกคำร้อง...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      ยืนยันส่งคำร้องออนไลน์
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Camera Document Scanner Modal */}
      <DocumentScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onAttachScannedFiles={handleAttachScannedFiles}
        defaultDocCategory="id_card"
      />

      {/* Camera Incident & Evidence Photo Modal */}
      <IncidentCameraModal
        isOpen={showIncidentCameraModal}
        onClose={() => setShowIncidentCameraModal(false)}
        onAttachPhotos={handleAttachIncidentPhotos}
        defaultLocationName={dynamicFields.cctvLocation || dynamicFields.copyLocation || 'ศูนย์กล้องวงจรปิด เทศบาลเมืองชัยภูมิ'}
        requestTitle={title}
        initialPreset={incidentCameraPreset}
      />

      {/* Image Preview / Lightbox Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/80 text-white">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-xs truncate">{previewImageModal.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 bg-black/90 flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md"
              />
            </div>

            {previewImageModal.desc && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400 font-semibold">รายละเอียด: </span>
                {previewImageModal.desc}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
