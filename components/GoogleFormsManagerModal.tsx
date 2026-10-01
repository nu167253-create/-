import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout } from '../utils/googleAuth';
import {
  createCctvSatisfactionSurveyGoogleForm,
  createCctvRequestIntakeGoogleForm,
  createCameraMaintenanceGoogleForm,
  getGoogleForm,
  getGoogleFormResponses,
  getSavedGoogleForms,
  saveGoogleFormToHistory,
  removeGoogleFormFromHistory,
  GoogleFormInfo,
  GoogleFormDetails,
  GoogleFormResponseItem
} from '../utils/googleForms';
import { 
  FileSpreadsheet, 
  X, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogIn, 
  LogOut, 
  Loader2,
  Plus,
  Share2,
  Copy,
  Trash2,
  ClipboardList,
  Smile,
  ShieldCheck,
  Wrench,
  Users,
  Eye,
  MessageSquare,
  Sparkles,
  Check,
  QrCode,
  Inbox
} from 'lucide-react';
import { RequestItem } from '../types/request';
import { saveStoredRequests, getStoredRequests } from '../utils/storage';

interface GoogleFormsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRequest?: RequestItem | null;
  onRefreshRequests?: () => void;
}

export const GoogleFormsManagerModal: React.FC<GoogleFormsManagerModalProps> = ({
  isOpen,
  onClose,
  currentRequest,
  onRefreshRequests
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [formsList, setFormsList] = useState<GoogleFormInfo[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Custom form creation state
  const [showCustomFormInput, setShowCustomFormInput] = useState(false);
  const [customFormTitle, setCustomFormTitle] = useState('');
  
  // Form inspection & Responses state
  const [selectedFormDetail, setSelectedFormDetail] = useState<GoogleFormDetails | null>(null);
  const [selectedFormResponses, setSelectedFormResponses] = useState<{ formInfo: GoogleFormInfo; responses: GoogleFormResponseItem[]; totalCount: number } | null>(null);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  
  // Confirmation state for deleting form record
  const [formToDelete, setFormToDelete] = useState<GoogleFormInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved forms
    setFormsList(getSavedGoogleForms());

    const unsubscribe = initAuth(
      async () => {
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        setMessage({ text: 'เชื่อมต่อกับ Google Forms สำเร็จ!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setMessage({ text: err.message || 'เข้าสู่ระบบ Google ไม่สำเร็จ', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
    setMessage({ text: 'ออกจากระบบ Google เรียบร้อยแล้ว', type: 'success' });
  };

  const handleCreateSatisfactionSurvey = async () => {
    setIsCreating('survey');
    try {
      const formInfo = await createCctvSatisfactionSurveyGoogleForm();
      setFormsList(getSavedGoogleForms());
      setMessage({
        text: `สร้างแบบประเมินความพึงพอใจ "${formInfo.title}" ใน Google Forms สำเร็จแล้ว!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Create survey form error:', err);
      setMessage({ text: err.message || 'สร้างแบบสอบถาม Google Forms ไม่สำเร็จ', type: 'error' });
    } finally {
      setIsCreating(null);
    }
  };

  const handleCreateRequestIntakeForm = async () => {
    setIsCreating('intake');
    try {
      const formInfo = await createCctvRequestIntakeGoogleForm();
      setFormsList(getSavedGoogleForms());
      setMessage({
        text: `สร้างแบบฟอร์มยื่นคำร้อง CCTV ออนไลน์ "${formInfo.title}" ใน Google Forms สำเร็จแล้ว!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Create request form error:', err);
      setMessage({ text: err.message || 'สร้างแบบฟอร์มคำร้องไม่สำเร็จ', type: 'error' });
    } finally {
      setIsCreating(null);
    }
  };

  const handleCreateMaintenanceForm = async () => {
    setIsCreating('maintenance');
    try {
      const formInfo = await createCameraMaintenanceGoogleForm();
      setFormsList(getSavedGoogleForms());
      setMessage({
        text: `สร้างแบบฟอร์มตรวจสภาพกล้องภาคสนาม "${formInfo.title}" สำเร็จแล้ว!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Create maintenance form error:', err);
      setMessage({ text: err.message || 'สร้างแบบฟอร์มตรวจสภาพไม่สำเร็จ', type: 'error' });
    } finally {
      setIsCreating(null);
    }
  };

  const handleViewFormResponses = async (form: GoogleFormInfo) => {
    setIsLoadingResponses(true);
    setSelectedFormResponses(null);
    setSelectedFormDetail(null);
    try {
      // 1. Fetch Form Details
      const detail = await getGoogleForm(form.formId);
      setSelectedFormDetail(detail);

      // 2. Fetch Form Responses
      const responseData = await getGoogleFormResponses(form.formId);
      setSelectedFormResponses({
        formInfo: form,
        responses: responseData.responses,
        totalCount: responseData.totalCount
      });
    } catch (err: any) {
      console.error('Fetch form responses error:', err);
      setMessage({ text: err.message || 'ไม่สามารถดึงข้อมูลคำตอบจาก Google Forms ได้', type: 'error' });
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteConfirmed = () => {
    if (!formToDelete) return;
    removeGoogleFormFromHistory(formToDelete.formId);
    setFormsList(getSavedGoogleForms());
    if (selectedFormResponses?.formInfo.formId === formToDelete.formId) {
      setSelectedFormResponses(null);
      setSelectedFormDetail(null);
    }
    setMessage({ text: `นำฟอร์ม "${formToDelete.title}" ออกจากรายการเรียบร้อยแล้ว`, type: 'success' });
    setFormToDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shadow-inner">
              <ClipboardList className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">Google Forms Workspace Integration</h2>
                <span className="bg-purple-900/80 text-purple-200 text-[10px] font-black px-2 py-0.5 rounded border border-purple-400/40">
                  LIVE SYNC & FORMS BUILDER
                </span>
              </div>
              <p className="text-xs text-purple-200">สร้างแบบฟอร์ม แบบประเมินความพึงพอใจ และอ่านคำตอบจาก Google Forms แบบเรียลไทม์</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Alert Banner */}
        {message && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between shrink-0 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200' : 'bg-rose-50 text-rose-900 border-b border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Auth State Box */}
          {needsAuth ? (
            <div className="bg-white border-2 border-dashed border-purple-200 rounded-2xl p-10 text-center space-y-4 my-4 shadow-sm">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">เชื่อมต่อกับ Google Forms ของเทศบาล</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  เข้าสู่ระบบด้วยบัญชี Google เพื่อสร้างแบบฟอร์มคำร้องออนไลน์ แบบประเมินความพึงพอใจ และอ่านคำตอบ (Responses) อัตโนมัติ
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="gsi-material-button inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <LogIn className="w-4 h-4" />}
                <span>ลงชื่อเข้าใช้งานด้วย Google (Sign in with Google)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* User Bar & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>เชื่อมต่อ Google Forms API เรียบร้อยแล้ว (สิทธิ์: Forms Body & Responses)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ออกจากระบบ Google
                  </button>
                </div>
              </div>

              {/* Preset 1-Click Form Generators Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    สร้าง Google Forms อัตโนมัติด้วย 1-Click (Templates)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">สร้างพร้อมคำถามและมาตรวัดมาตรฐานราชการ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  
                  {/* Template 1: Satisfaction Survey */}
                  <div className="bg-white border border-purple-200 hover:border-purple-400 p-4 rounded-xl shadow-xs flex flex-col justify-between space-y-3 transition-all">
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                        <Smile className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">แบบประเมินความพึงพอใจ</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        แบบประเมิน 5 ระดับ (ความรวดเร็ว, ความคมชัดของกล้อง, ความสุภาพของเจ้าหน้าที่, ข้อเสนอแนะ)
                      </p>
                    </div>

                    <button
                      onClick={handleCreateSatisfactionSurvey}
                      disabled={isCreating !== null}
                      className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCreating === 'survey' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>สร้างแบบประเมิน Google Form</span>
                    </button>
                  </div>

                  {/* Template 2: CCTV Citizen Intake Form */}
                  <div className="bg-white border border-blue-200 hover:border-blue-400 p-4 rounded-xl shadow-xs flex flex-col justify-between space-y-3 transition-all">
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">แบบยื่นคำร้อง CCTV ออนไลน์</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ฟอร์มรับคำร้องสำหรับประชาชนและตำรวจ (ชื่อผู้ยื่น, เบอร์โทร, วันเวลาเกิดเหตุ, พิกัดสถานที่, เลขประจำวัน)
                      </p>
                    </div>

                    <button
                      onClick={handleCreateRequestIntakeForm}
                      disabled={isCreating !== null}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCreating === 'intake' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>สร้างแบบฟอร์มคำร้องออนไลน์</span>
                    </button>
                  </div>

                  {/* Template 3: Field Camera Maintenance Inspection Form */}
                  <div className="bg-white border border-amber-200 hover:border-amber-400 p-4 rounded-xl shadow-xs flex flex-col justify-between space-y-3 transition-all">
                    <div className="space-y-2">
                      <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">แบบตรวจสภาพกล้องภาคสนาม</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ฟอร์มบันทึกสำหรับช่างเทคนิค (รหัสกล้อง, สภาพเลนส์, สัญญาณเครือข่าย, ระบบ PTZ, งานซ่อมบำรุง)
                      </p>
                    </div>

                    <button
                      onClick={handleCreateMaintenanceForm}
                      disabled={isCreating !== null}
                      className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCreating === 'maintenance' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>สร้างแบบฟอร์มช่างเทคนิค</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Saved Google Forms Hub */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-slate-600" />
                    รายการ Google Forms ของระบบ ({formsList.length} แบบฟอร์ม)
                  </h3>
                  {formsList.length > 0 && (
                    <span className="text-[11px] text-slate-500">คลิกที่ "ดูคำตอบ (Responses)" เพื่ออ่านข้อมูลที่ตอบเข้ามา</span>
                  )}
                </div>

                {formsList.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 space-y-2">
                    <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">ยังไม่มีแบบฟอร์ม Google Forms ในประวัติของระบบ</p>
                    <p className="text-slate-400">คลิกปุ่มด้านบนเพื่อสร้างแบบประเมิน หรือแบบฟอร์มคำร้อง CCTV ชุดแรกของคุณ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {formsList.map((form) => (
                      <div
                        key={form.formId}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              form.templateType === 'satisfaction_survey'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : form.templateType === 'cctv_request'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {form.templateType === 'satisfaction_survey' ? 'แบบประเมินความพึงพอใจ' : form.templateType === 'cctv_request' ? 'แบบคำร้อง CCTV' : 'ตรวจสภาพกล้อง'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              สร้างเมื่อ: {new Date(form.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-slate-900 text-sm truncate">{form.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">{form.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Live Responses Button */}
                          <button
                            onClick={() => handleViewFormResponses(form)}
                            disabled={isLoadingResponses}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            {isLoadingResponses && selectedFormResponses?.formInfo.formId === form.formId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Inbox className="w-3.5 h-3.5" />
                            )}
                            <span>ดูคำตอบ (Responses)</span>
                          </button>

                          {/* Copy Shareable Link */}
                          <button
                            onClick={() => handleCopyLink(form.responderUri, form.formId)}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="คัดลอกลิงก์สำหรับส่งให้ประชาชนกรอก"
                          >
                            {copiedId === form.formId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === form.formId ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                          </button>

                          {/* Open Responder View */}
                          <a
                            href={form.responderUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            title="เปิดหน้าฟอร์มกรอกข้อมูล"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>เปิดฟอร์ม</span>
                          </a>

                          {/* Edit Form in Google Forms */}
                          <a
                            href={form.editUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            title="แก้ไขคำถามใน Google Forms Editor"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-purple-300" />
                            <span>แก้ไขคำถาม</span>
                          </a>

                          {/* Remove Form from History */}
                          <button
                            onClick={() => setFormToDelete(form)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="นำฟอร์มนี้ออกจากรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Inspection & Live Responses Drawer/Section */}
              {selectedFormResponses && (
                <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          ผลการตอบกลับแบบเรียลไทม์ (Google Form Responses)
                        </h4>
                        <p className="text-xs text-slate-500">
                          แบบฟอร์ม: <strong className="text-slate-800">{selectedFormResponses.formInfo.title}</strong> (จำนวนคำตอบทั้งหมด: {selectedFormResponses.totalCount} รายการ)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewFormResponses(selectedFormResponses.formInfo)}
                      disabled={isLoadingResponses}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResponses ? 'animate-spin' : ''}`} />
                      <span>รีเฟรชคำตอบ</span>
                    </button>
                  </div>

                  {/* Form Questions Overview */}
                  {selectedFormDetail?.items && selectedFormDetail.items.length > 0 && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-indigo-600" />
                        <span>โครงสร้างคำถามใน Google Form ({selectedFormDetail.items.length} ข้อ):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedFormDetail.items.map((item, idx) => (
                          <div key={item.itemId || idx} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] text-slate-700 truncate">
                            <span className="font-bold text-indigo-600 mr-1.5">#{idx + 1}</span>
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responses Table / List */}
                  {selectedFormResponses.responses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                      <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">ยังไม่มีคำตอบที่ส่งเข้ามาใน Google Form นี้</p>
                      <p className="text-slate-400">
                        ส่งลิงก์แบบฟอร์มให้ประชาชนหรือเจ้าหน้าที่กรอก แล้วกด "รีเฟรชคำตอบ" เพื่ออ่านข้อมูลแบบเรียลไทม์
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-3">ลำดับ</th>
                            <th className="p-3">วัน-เวลาที่ส่ง</th>
                            <th className="p-3">อีเมลผู้ตอบ</th>
                            <th className="p-3">สรุปข้อมูลคำตอบ (Answers)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedFormResponses.responses.map((resp, idx) => {
                            const answerEntries = Object.entries(resp.answers || {});
                            return (
                              <tr key={resp.responseId} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-indigo-600">{idx + 1}</td>
                                <td className="p-3 whitespace-nowrap text-slate-500">
                                  {new Date(resp.lastSubmittedTime || resp.createTime).toLocaleString('th-TH')}
                                </td>
                                <td className="p-3 text-slate-700">
                                  {resp.respondentEmail || '-'}
                                </td>
                                <td className="p-3 text-slate-700 space-y-1">
                                  {answerEntries.map(([qId, ansObj]) => {
                                    const val = ansObj.textAnswers?.answers?.map(a => a.value).join(', ') || '-';
                                    return (
                                      <div key={qId} className="text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        <span className="font-semibold text-slate-800">{val}</span>
                                      </div>
                                    );
                                  })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            ระบบบริการ Google Forms เทศบาลเมืองชัยภูมิ
          </div>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Delete / Remove Confirmation Modal */}
      {formToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 max-w-md w-full space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-slate-900 text-base">นำ Google Form ออกจากรายการ</h3>
              <p className="text-xs text-slate-600">
                คุณแน่ใจหรือไม่ว่าต้องการนำแบบฟอร์ม <strong className="font-bold text-slate-900">"{formToDelete.title}"</strong> ออกจากรายการบันทึกของระบบ? (ฟอร์มจริงใน Google Drive/Forms จะไม่ถูกลบ)
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setFormToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                ยืนยันนำออก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
