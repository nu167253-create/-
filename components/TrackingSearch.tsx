import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { RequestItem, RequestStatus, DocumentCategoryType } from '../types/request';
import { DOCUMENT_CATEGORIES, getDocumentCategoryDef } from '../data/documentCategories';
import { getStoredRequests, getStatusBadgeColor, getStatusLabelTh, addApplicantAttachmentToRequest } from '../utils/storage';
import { getLocalArchivedRequests } from '../utils/archiveService';
import { OfficialDocumentPrint } from './OfficialDocumentPrint';
import { ApprovalWorkflowViewer } from './ApprovalWorkflowViewer';
import { StepProgressIndicator } from './StepProgressIndicator';
import { AppointmentCard } from './AppointmentCard';
import { ServiceFeedbackModal } from './ServiceFeedbackModal';
import { PostServiceSurveyCard } from './PostServiceSurveyCard';
import { LineShareButton } from './LineShareButton';
import { AiTopicBadge, AiAutoTagBanner } from './AiTopicBadge';
import { StatusBadge } from './StatusBadge';
import { AttachmentGallery } from './AttachmentGallery';
import { SaveToKeepButton } from './SaveToKeepButton';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Printer, 
  MessageSquare, 
  Calendar,
  XCircle,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  History,
  ArrowUpDown,
  User,
  CheckCircle,
  FileCheck,
  Paperclip,
  Download,
  X,
  Sparkles,
  Globe,
  Filter,
  Star,
  Upload,
  Plus,
  Copy,
  Check,
  LayoutList,
  GitCommit
} from 'lucide-react';

interface TrackingSearchProps {
  initialSearchId?: string;
  onSelectRequest?: (req: RequestItem) => void;
}

export const TrackingSearch: React.FC<TrackingSearchProps> = ({
  initialSearchId
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchId || '');
  const [searchResults, setSearchResults] = useState<RequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timelineViewMode, setTimelineViewMode] = useState<'vertical' | 'cards'>('vertical');
  const [copiedTimeline, setCopiedTimeline] = useState(false);

  // Additional File Upload State for Applicant
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [additionalFileDesc, setAdditionalFileDesc] = useState('');
  const [additionalFileCategory, setAdditionalFileCategory] = useState<DocumentCategoryType>('other');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const handleApplicantFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRequest) return;

    setIsUploading(true);
    let updatedItem: RequestItem | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      updatedItem = addApplicantAttachmentToRequest(
        selectedRequest.id,
        {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: dataUrl || undefined,
          description: (additionalFileDesc || '').trim() || 'ข้อมูลและไฟล์งานเพิ่มเติมจากผู้ยื่นคำร้อง',
          documentCategory: additionalFileCategory
        },
        `${selectedRequest.applicant?.prefix || ''}${selectedRequest.applicant?.fullName || ''} (ผู้ยื่นคำร้อง)`
      );
    }

    if (updatedItem) {
      setSelectedRequest(updatedItem);
      setSearchResults(prev => prev.map(r => r.id === updatedItem!.id ? updatedItem! : r));
      setUploadSuccessMsg('อัปโหลดข้อมูลและไฟล์งานเพิ่มเติมเข้าสู่ระบบเรียบร้อยแล้ว');
      setTimeout(() => setUploadSuccessMsg(null), 4000);
      setAdditionalFileDesc('');
      setShowUploadModal(false);
    }
    setIsUploading(false);
  };

  // Auto-suggest state & ref
  const [autoSuggestions, setAutoSuggestions] = useState<RequestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSearchId) {
      handleSearchWithTerm(initialSearchId);
    }
  }, [initialSearchId]);

  // Prompt feedback modal automatically when an approved request is viewed (if not already rated)
  useEffect(() => {
    if (selectedRequest && (selectedRequest.status === 'approved' || selectedRequest.status === 'completed')) {
      if (!selectedRequest.feedback) {
        const timer = setTimeout(() => {
          setShowFeedbackModal(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedRequest?.id, selectedRequest?.status]);

  // Click outside listener to close auto-suggest dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filterMatches = (term: string, currentFilter: string = statusFilter) => {
    const query = (term || '').trim().toLowerCase();
    const active = getStoredRequests();
    const archived = getLocalArchivedRequests();
    
    // Combine active and archived items, removing duplicates if any
    const allMap = new Map<string, RequestItem>();
    active.forEach(item => allMap.set(item.id, item));
    archived.forEach(item => {
      if (!allMap.has(item.id)) allMap.set(item.id, item);
    });
    const all = Array.from(allMap.values());

    return all.filter((r) => {
      const matchesQuery = !query || (
        (r.id || '').toLowerCase().includes(query) ||
        (r.title || '').toLowerCase().includes(query) ||
        (r.applicant?.fullName || '').toLowerCase().includes(query) ||
        (r.applicant?.citizenIdOrCode || '').toLowerCase().includes(query) ||
        (r.applicant?.phone || '').includes(query) ||
        (r.applicant?.email || '').toLowerCase().includes(query)
      );
      const matchesStatus = currentFilter === 'all' || r.status === currentFilter;
      return matchesQuery && matchesStatus;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value || '';
    setSearchTerm(val);

    const matches = filterMatches(val, statusFilter);
    setAutoSuggestions(matches.slice(0, 8));
    setShowSuggestions((val || '').trim().length > 0);
  };

  const handleStatusFilterChange = (filter: string) => {
    setStatusFilter(filter);
    const matches = filterMatches(searchTerm, filter);
    setSearchResults(matches);
    if ((searchTerm || '').trim().length > 0) {
      setAutoSuggestions(matches.slice(0, 8));
    }
    if (hasSearched && matches.length === 1) {
      setSelectedRequest(matches[0]);
    } else if (hasSearched && matches.length !== 1) {
      setSelectedRequest(null);
    }
  };

  const handleSearchWithTerm = (term: string, filter: string = statusFilter) => {
    const matches = filterMatches(term, filter);

    setSearchResults(matches);
    setHasSearched(true);
    setShowSuggestions(false);
    if (matches.length === 1) {
      setSelectedRequest(matches[0]);
    } else {
      setSelectedRequest(null);
    }
  };

  const handleSelectSuggestion = (req: RequestItem) => {
    setSearchTerm(req.id);
    setShowSuggestions(false);
    setSelectedRequest(req);
    setSearchResults([req]);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAutoSuggestions([]);
    setShowSuggestions(false);
    setHasSearched(false);
    setSearchResults([]);
    setSelectedRequest(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchWithTerm(searchTerm);
  };

  // Helper for status timeline steps
  const getTimelineSteps = (status: RequestItem['status']) => {
    const isRejected = status === 'rejected';

    const steps = [
      { id: 'submitted', label: '1. ยื่นคำร้องเรียบร้อย' },
      { id: 'under_review', label: '2. อยู่ระหว่างตรวจสอบ' },
      { id: 'approved_or_action', label: isRejected ? '3. ผลการพิจารณา: ไม่อนุมัติ' : '3. ผลการพิจารณาอนุมัติ' },
      { id: 'completed', label: '4. ดำเนินการเสร็จสิ้น' }
    ];

    let currentStepIndex = 0;
    if (status === 'submitted') currentStepIndex = 0;
    else if (status === 'under_review' || status === 'action_required') currentStepIndex = 1;
    else if (status === 'approved' || status === 'rejected') currentStepIndex = 2;
    else if (status === 'completed') currentStepIndex = 3;

    return { steps, currentStepIndex, isRejected };
  };

  // Status icon helper for history items
  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'under_review':
        return <FileCheck className="w-3.5 h-3.5 text-blue-600" />;
      case 'action_required':
        return <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />;
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'rejected':
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      case 'completed':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusEnglishLabel = (status: RequestStatus) => {
    switch (status) {
      case 'submitted': return 'Received';
      case 'under_review': return 'Under Review';
      case 'action_required': return 'Action Required';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'completed': return 'Completed';
      default: return 'Draft';
    }
  };

  // Helper to compute readable time difference between two ISO timestamps
  const getTimeElapsedText = (prevTimeStr?: string, currentTimeStr?: string): string | null => {
    if (!prevTimeStr || !currentTimeStr) return null;
    try {
      const prev = new Date(prevTimeStr).getTime();
      const curr = new Date(currentTimeStr).getTime();
      const diffMs = Math.abs(curr - prev);
      if (isNaN(diffMs) || diffMs < 1000 * 30) return null;

      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        const remHours = hours % 24;
        return remHours > 0 ? `+ ${days} วัน ${remHours} ชม. ต่อมา` : `+ ${days} วันต่อมา`;
      }
      if (hours > 0) {
        const remMins = totalMins % 60;
        return remMins > 0 ? `+ ${hours} ชม. ${remMins} นาที ต่อมา` : `+ ${hours} ชม. ต่อมา`;
      }
      return `+ ${totalMins} นาที ต่อมา`;
    } catch {
      return null;
    }
  };

  const handleCopyTimelineSummary = (historyItems: RequestItem['statusHistory']) => {
    if (!selectedRequest || !historyItems) return;
    const sorted = [...historyItems].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const historyText = sorted.map((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleString('th-TH');
      const label = `${getStatusLabelTh(item.status)} (${getStatusEnglishLabel(item.status)})`;
      return `${idx + 1}. [${dateStr}] ${label}\n   ผู้ทำรายการ: ${item.actor}${item.note ? `\n   หมายเหตุ: ${item.note}` : ''}`;
    }).join('\n\n');

    const fullSummary = `📌 รายงานไทม์ไลน์สถานะคำร้อง [${selectedRequest.id}]\nหัวข้อ: ${selectedRequest.title}\nสถานะปัจจุบัน: ${getStatusLabelTh(selectedRequest.status)} (${getStatusEnglishLabel(selectedRequest.status)})\n\n${historyText}`;

    navigator.clipboard.writeText(fullSummary);
    setCopiedTimeline(true);
    setTimeout(() => setCopiedTimeline(false), 2500);
  };

  const getProgressPercentage = (status: RequestStatus) => {
    switch (status) {
      case 'submitted':
        return {
          percent: 25,
          badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
          barGradient: 'from-amber-500 to-amber-600',
          label: '25% - รับเรื่องยื่นคำร้องแล้ว (Submitted)'
        };
      case 'under_review':
        return {
          percent: 50,
          badgeColor: 'bg-blue-50 text-blue-900 border-blue-300',
          barGradient: 'from-blue-500 via-indigo-500 to-blue-600',
          label: '50% - อยู่ระหว่างตรวจสอบและพิจารณา (Under Review)'
        };
      case 'action_required':
        return {
          percent: 50,
          badgeColor: 'bg-purple-50 text-purple-900 border-purple-300',
          barGradient: 'from-purple-500 via-indigo-500 to-purple-600',
          label: '50% - อยู่ระหว่างรอข้อมูลเพิ่มเติมจากผู้ยื่น (Action Required)'
        };
      case 'approved':
        return {
          percent: 75,
          badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          barGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
          label: '75% - ผ่านการพิจารณาอนุมัติแล้ว (Approved)'
        };
      case 'rejected':
        return {
          percent: 100,
          badgeColor: 'bg-rose-50 text-rose-900 border-rose-300',
          barGradient: 'from-rose-500 via-red-500 to-rose-600',
          label: '100% - สิ้นสุดกระบวนการ (ไม่อนุมัติ / Rejected)'
        };
      case 'completed':
        return {
          percent: 100,
          badgeColor: 'bg-emerald-50 text-emerald-950 border-emerald-400',
          barGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
          label: '100% - ดำเนินการเสร็จสิ้นเรียบร้อย (Completed)'
        };
      default:
        return {
          percent: 10,
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          barGradient: 'from-slate-400 to-slate-500',
          label: '10% - ร่างคำร้อง'
        };
    }
  };

  if (showPrintModal && selectedRequest) {
    return (
      <OfficialDocumentPrint
        request={selectedRequest}
        onBack={() => setShowPrintModal(false)}
      />
    );
  }

  // Sorted status history
  const sortedHistory = selectedRequest?.statusHistory
    ? [...selectedRequest.statusHistory].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Bar Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            ติดตามสถานะคำร้องออนไลน์
          </h2>
          <p className="text-xs text-slate-500">
            กรอกรหัสติดตามคำร้อง (Tracking ID), เลขประจำตัวประชาชน, เบอร์โทรศัพท์ หรืออีเมล เพื่อค้นหา
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-3 max-w-3xl mx-auto">
          <div className="flex flex-wrap md:flex-nowrap gap-2">
            {/* Status Filter Dropdown */}
            <div className="relative min-w-[170px] shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full pl-9 pr-7 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer appearance-none"
                title="กรองตามสถานะคำร้อง"
              >
                <option value="all">🔍 ทุกสถานะ (All)</option>
                <option value="submitted">🔵 ยื่นคำร้องแล้ว (Submitted)</option>
                <option value="under_review">🟡 อยู่ระหว่างตรวจสอบ (Under Review)</option>
                <option value="action_required">🟣 ขอเอกสารเพิ่ม (Action Required)</option>
                <option value="approved">🟢 อนุมัติแล้ว (Approved)</option>
                <option value="completed">🌐 ดำเนินการเสร็จสิ้น (Completed)</option>
                <option value="closed">🔒 ปิดเรื่องเรียบร้อย (Closed)</option>
                <option value="rejected">🔴 ไม่อนุมัติ (Rejected)</option>
              </select>
              <Filter className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 rotate-90 pointer-events-none" />
            </div>

            <div ref={searchContainerRef} className="relative flex-1">
              <input
                type="text"
                placeholder="เช่น REQ-20260728-001, หัวข้อคำร้อง หรือ 0812345678"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => {
                  if ((searchTerm || '').trim().length > 0) {
                    const matches = filterMatches(searchTerm);
                    setAutoSuggestions(matches.slice(0, 8));
                    setShowSuggestions(true);
                  }
                }}
                className="w-full pl-10 pr-9 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />

              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="ล้างข้อความค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Real-time Auto-Suggest Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      ผลการค้นหาแบบแนะนำอัตโนมัติ ({autoSuggestions.length} รายการ)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">คลิกเพื่อเลือกรายการ</span>
                  </div>

                  {autoSuggestions.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {autoSuggestions.map((req) => (
                        <div
                          key={req.id}
                          onClick={() => handleSelectSuggestion(req)}
                          className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer text-left group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {req.id}
                              </span>
                              <StatusBadge status={req.status} size="xs" showIcon showDot />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(req.createdAt).toLocaleDateString('th-TH')}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-snug truncate">
                            {req.title}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                            <span className="truncate max-w-[320px]">
                              ผู้ยื่น: <strong className="text-slate-700 font-semibold">{req.applicant?.prefix || ''}{req.applicant?.fullName || 'ไม่ระบุชื่อ'}</strong> ({req.applicant?.department || '-'})
                            </span>
                            <span className="text-blue-600 text-[10px] font-semibold flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                              ติดตามสถานะ <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                      <p className="font-semibold text-slate-700">ไม่พบคำร้องที่ตรงกับข้อความที่ค้นหา</p>
                      <p className="text-[11px] text-slate-400">ลองตรวจสอบรหัสคำร้อง, ชื่อ-นามสกุล หรือเบอร์โทรศัพท์อีกครั้ง</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs shadow-md transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              ค้นหาข้อมูล
            </button>
          </div>

          {/* Quick Filter Pills Bar with Visual Color Coding */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              ตัวกรองสถานะ:
            </span>
            {[
              { 
                id: 'all', 
                label: 'ทั้งหมด (All)', 
                activeClass: 'bg-slate-900 text-white border-slate-900 shadow-xs', 
                inactiveClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
                dotColor: 'bg-slate-400' 
              },
              { 
                id: 'submitted', 
                label: 'ยื่นคำร้อง (Submitted)', 
                activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200', 
                inactiveClass: 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-300',
                dotColor: 'bg-amber-500' 
              },
              { 
                id: 'under_review', 
                label: 'อยู่ระหว่างตรวจสอบ (Under Review)', 
                activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200', 
                inactiveClass: 'bg-blue-50/80 hover:bg-blue-100 text-blue-900 border-blue-300',
                dotColor: 'bg-blue-500' 
              },
              { 
                id: 'completed', 
                label: 'ดำเนินการเสร็จสิ้น (Completed)', 
                activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200', 
                inactiveClass: 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 border-emerald-300',
                dotColor: 'bg-emerald-500' 
              },
              { 
                id: 'approved', 
                label: 'อนุมัติแล้ว (Approved)', 
                activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200', 
                inactiveClass: 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-300',
                dotColor: 'bg-emerald-500' 
              },
              { 
                id: 'rejected', 
                label: 'ไม่อนุมัติ (Rejected)', 
                activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-200', 
                inactiveClass: 'bg-rose-50/80 hover:bg-rose-100 text-rose-900 border-rose-300',
                dotColor: 'bg-rose-500' 
              }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleStatusFilterChange(st.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === st.id ? st.activeClass : st.inactiveClass
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${st.dotColor} shrink-0`} />
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </form>

        {/* Quick Sample IDs for testing */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 pt-2">
          <span>ตัวอย่างรหัสทดสอบ:</span>
          {['REQ-20260728-001', 'REQ-20260727-004', 'REQ-20260722-008'].map((id) => (
            <button
              key={id}
              onClick={() => {
                setSearchTerm(id);
                handleSearchWithTerm(id);
              }}
              className="bg-slate-100 hover:bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] transition-colors"
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results List if multiple */}
      {hasSearched && searchResults.length > 1 && !selectedRequest && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-slate-700">
            พบคำร้องที่ตรงกับคำค้นหา {searchResults.length} รายการ (คลิกเพื่อดูรายละเอียด):
          </p>
          <div className="divide-y divide-slate-100">
            {searchResults.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                whileHover={{ x: 4, backgroundColor: '#f8fafc', transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedRequest(req)}
                className="py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer p-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 text-xs">{req.id}</span>
                    <StatusBadge status={req.status} size="xs" showIcon showDot />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{req.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    ผู้ยื่น: {req.applicant?.prefix || ''}{req.applicant?.fullName || 'ไม่ระบุชื่อ'} | ยื่นเมื่อ: {new Date(req.createdAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {hasSearched && searchResults.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">ไม่พบข้อมูลคำร้องในระบบ</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            กรุณาตรวจสอบรหัสคำร้อง (Tracking ID) หรือเบอร์โทรศัพท์อีกครั้ง หากท่านเพิ่งยื่นเรื่อง สามารถดูได้ในเมนู "ประวัติของฉัน"
          </p>
        </div>
      )}

      {/* Single Request Detailed View & Timeline */}
      {selectedRequest && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6 p-6"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-blue-700 text-base">{selectedRequest.id}</span>
                <StatusBadge status={selectedRequest.status} size="md" showIcon showDot showEnLabel />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedRequest.title}</h3>
              {selectedRequest.aiAutoTags && (
                <div className="mt-2">
                  <AiAutoTagBanner tagResult={selectedRequest.aiAutoTags} compact />
                </div>
              )}
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <span>ยื่นเมื่อ: {new Date(selectedRequest.createdAt).toLocaleString('th-TH')} น.</span>
                {selectedRequest.expectedDate && (
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Calendar className="w-3 h-3" />
                    คาดว่าจะแล้วเสร็จ: {selectedRequest.expectedDate}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SaveToKeepButton request={selectedRequest} variant="compact" />
              <LineShareButton request={selectedRequest} />
              <button
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์ใบรับคำร้อง / PDF
              </button>
            </div>
          </div>

          {/* Post-Service Citizen Survey Component for Closed / Completed / Approved Requests */}
          {(selectedRequest.status === 'completed' || selectedRequest.status === 'closed' || selectedRequest.status === 'approved') && (
            <PostServiceSurveyCard
              request={selectedRequest}
              onFeedbackSaved={(updatedReq) => {
                setSelectedRequest(updatedReq);
                setSearchResults(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
              }}
            />
          )}

          {/* Stepper & Visual Completion Percentage Progress Bar */}
          {(() => {
            const progress = getProgressPercentage(selectedRequest.status);

            return (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-5">
                {/* Visual Completion Percentage Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      ความคืบหน้าการดำเนินการ (Completion Progress)
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${progress.badgeColor} shadow-2xs`}>
                      {progress.percent}% — {progress.label.split(' - ')[1]}
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80 relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${progress.barGradient} transition-all duration-700 ease-out shadow-sm`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {/* Percentage Markers */}
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                    <span className={progress.percent >= 25 ? 'text-blue-700 font-bold' : ''}>25% ยื่นเรื่อง</span>
                    <span className={progress.percent >= 50 ? 'text-blue-700 font-bold' : ''}>50% ตรวจสอบ</span>
                    <span className={progress.percent >= 75 ? 'text-blue-700 font-bold' : ''}>75% ผลการอนุมัติ</span>
                    <span className={progress.percent >= 100 ? (selectedRequest.status === 'rejected' ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold') : ''}>100% สิ้นสุดกระบวนการ</span>
                  </div>
                </div>

                {/* Horizontal Timeline Step Progress Indicator */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    ลำดับขั้นตอนตามเวลาและสถานะ (Visual Request Status Timeline)
                  </h4>

                  <StepProgressIndicator
                    status={selectedRequest.status}
                    statusHistory={selectedRequest.statusHistory}
                    createdAt={selectedRequest.createdAt}
                    updatedAt={selectedRequest.updatedAt}
                    showDetails={true}
                  />
                </div>
              </div>
            );
          })()}

          {/* Appointment Details if Scheduled */}
          {selectedRequest.appointment && (
            <AppointmentCard
              appointment={selectedRequest.appointment}
              requestId={selectedRequest.id}
              requestTitle={selectedRequest.title}
              applicantName={`${selectedRequest.applicant?.prefix || ''}${selectedRequest.applicant?.fullName || 'ผู้ยื่นคำร้อง'}`}
            />
          )}

          {/* Approval Workflow Component (Multi-Stage Approval Steps > 8 Approvers) */}
          <ApprovalWorkflowViewer request={selectedRequest} />

          {/* Officer Comments / Action Required Notice */}
          {selectedRequest.status === 'action_required' && (
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-xs space-y-2 text-purple-900">
              <div className="flex items-center gap-2 font-bold text-purple-800">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                เจ้าหน้าที่ต้องการข้อมูลหรือเอกสารเพิ่มเติม:
              </div>
              <p className="bg-white p-3 rounded-lg border border-purple-200 text-slate-800 leading-relaxed font-medium">
                "{selectedRequest.officerNotes || 'กรุณาติดต่อเจ้าหน้าที่เพื่อส่งเอกสารประกอบเพิ่มเติม'}"
              </p>
            </div>
          )}

          {selectedRequest.officerNotes && selectedRequest.status !== 'action_required' && (
            <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-xs space-y-1.5 text-blue-900">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                บันทึกข้อความจากเจ้าหน้าที่ผู้รับเรื่อง:
              </div>
              <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-blue-100">
                {selectedRequest.officerNotes}
              </p>
            </div>
          )}

          {/* Public Officer Notes */}
          {selectedRequest.internalComments && selectedRequest.internalComments.filter(c => c.isPublic).length > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl text-xs space-y-2 text-emerald-950 shadow-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>ข้อความชี้แจงสาธารณะจากเจ้าหน้าที่ (Public Officer Notes):</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  {selectedRequest.internalComments.filter(c => c.isPublic).length} รายการ
                </span>
              </div>
              <div className="space-y-2">
                {selectedRequest.internalComments.filter(c => c.isPublic).map((comment) => (
                  <div key={comment.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium border-b border-slate-100 pb-1">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {comment.author}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(comment.createdAt).toLocaleString('th-TH')} น.
                      </span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-normal pt-0.5">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                ข้อมูลผู้ยื่นคำร้อง
              </h4>
              <p><strong>ชื่อ-นามสกุล:</strong> {selectedRequest.applicant?.prefix || ''}{selectedRequest.applicant?.fullName || '-'}</p>
              <p><strong>หน่วยงาน:</strong> {selectedRequest.applicant?.department || '-'}</p>
              <p><strong>เบอร์โทรศัพท์:</strong> {selectedRequest.applicant?.phone || '-'}</p>
              <p><strong>อีเมล:</strong> {selectedRequest.applicant?.email || '-'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                การรับมอบหมายและเจ้าหน้าที่รับผิดชอบ
              </h4>
              <p className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span><strong>ผู้รับผิดชอบ:</strong> {selectedRequest.assignedOfficer || 'งานสารบรรณกลาง'}</span>
              </p>
              <p><strong>จำนวนเอกสารแนบในระบบ:</strong> {selectedRequest.attachments.length} รายการ</p>
            </div>
          </div>

          {/* Success Toast for File Upload */}
          {uploadSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {uploadSuccessMsg}
              </span>
              <button onClick={() => setUploadSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachments & Files Section */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <AttachmentGallery
              attachments={selectedRequest.attachments}
              title={`เอกสารแนบประกอบคำร้อง และไฟล์งานตอบรับ (${selectedRequest.attachments.length} ไฟล์)`}
              variant="full"
              showUploadPrompt={true}
              onUploadClick={() => setShowUploadModal(true)}
              emptyMessage="ยังไม่มีเอกสารแนบในคำร้องนี้ ท่านสามารถคลิกปุ่ม 'แนบไฟล์เพิ่มเติม' เพื่ออัปโหลดเอกสารประกอบได้"
            />
          </div>

          {/* Modal for Applicant to Upload Additional Data & Work Files */}
          {showUploadModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span>อัปโหลดข้อมูลและไฟล์งานเพิ่มเติม</span>
                  </div>
                  <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      🏷️ หมวดหมู่เอกสาร (Document Category) *
                    </label>
                    <select
                      value={additionalFileCategory}
                      onChange={(e) => setAdditionalFileCategory(e.target.value as DocumentCategoryType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800 bg-white"
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.labelTh} ({cat.labelEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      📝 คำอธิบาย / รายละเอียดของไฟล์งาน (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น รายงานการทำงานเพิ่มเติม, เอกสารแนบยืนยันเพิ่มเติม..."
                      value={additionalFileDesc}
                      onChange={(e) => setAdditionalFileDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      เลือกไฟล์ข้อมูล หรือไฟล์งาน (PDF, JPG, PNG, DOCX) *
                    </label>
                    <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-xl p-5 text-center relative cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleApplicantFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-blue-700">คลิกที่นี่เพื่อเลือกไฟล์จากอุปกรณ์</span>
                        <span className="text-[11px] text-slate-400">รองรับสูงสุด 10MB ต่อไฟล์</span>
                      </div>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="text-center py-2 text-blue-600 font-semibold flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      กำลังอัปโหลดไฟล์งานเข้าสู่ระบบ...
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Status History Timeline */}
          <div className="space-y-4 pt-2 border-t border-slate-200/80">
            {/* Timeline Header & Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>ประวัติไทม์ไลน์การเปลี่ยนสถานะคำร้อง (Detailed Status History Timeline)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  แสดงลำดับเหตุการณ์การดำเนินงาน วันและเวลา (Timestamp) และหมายเหตุการเปลี่ยนสถานะโดยละเอียด
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  รวม {selectedRequest.statusHistory.length} รายการ
                </span>

                {/* View Mode Toggle Switch */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('vertical')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                      timelineViewMode === 'vertical'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="แสดงผลแบบผังเส้นเวลาแนวตั้ง"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    ผังเส้นเวลา (Vertical)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('cards')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                      timelineViewMode === 'cards'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="แสดงผลแบบการ์ดประวัติ"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    การ์ดสรุป (Cards)
                  </button>
                </div>

                {/* Sort Order Button */}
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors font-bold border border-slate-200"
                  title="สลับลำดับการแสดงผลใหม่สุด/เก่าสุด"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  {sortOrder === 'desc' ? 'ใหม่สุดก่อน' : 'เก่าสุดก่อน'}
                </button>

                {/* Copy Timeline Summary Button */}
                <button
                  type="button"
                  onClick={() => handleCopyTimelineSummary(selectedRequest.statusHistory)}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border shadow-2xs ${
                    copiedTimeline
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title="คัดลอกสรุปประวัติไทม์ไลน์"
                >
                  {copiedTimeline ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      คัดลอกแล้ว!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      คัดลอกประวัติ
                    </>
                  )}
                </button>

                {/* Print PDF Button */}
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-white bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-lg transition-colors font-bold shadow-xs"
                  title="พิมพ์ใบรับคำร้องและประวัติไทม์ไลน์"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-300" />
                  พิมพ์เอกสาร / PDF
                </button>
              </div>
            </div>

            {/* Vertical Timeline Stream View */}
            {timelineViewMode === 'vertical' ? (
              <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-400 before:to-slate-300">
                {sortedHistory.map((item, idx) => {
                  const isCurrentStatus = item.status === selectedRequest.status && (
                    sortOrder === 'desc' ? idx === 0 : idx === sortedHistory.length - 1
                  );

                  // Calculate previous step timestamp for elapsed time calculation
                  const prevItem = sortOrder === 'desc'
                    ? sortedHistory[idx + 1]
                    : (idx > 0 ? sortedHistory[idx - 1] : undefined);

                  const timeElapsedPill = prevItem ? getTimeElapsedText(prevItem.timestamp, item.timestamp) : null;

                  const formattedDate = new Date(item.timestamp).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot Node Icon */}
                      <div className={`absolute -left-7 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md transition-all duration-300 ${
                        isCurrentStatus
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 font-bold scale-110'
                          : 'bg-white border-2 border-slate-300 text-slate-600 group-hover:border-blue-400'
                      }`}>
                        {getStatusIcon(item.status)}
                      </div>

                      {/* Timeline Event Detail Card */}
                      <div className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all duration-200 ${
                        isCurrentStatus
                          ? 'bg-blue-50/70 border-blue-200 shadow-sm ring-1 ring-blue-200/60'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}>
                        {/* Event Card Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Status Badge */}
                            <StatusBadge status={item.status} size="sm" showIcon showDot showEnLabel />

                            {/* Current Status Highlight Badge */}
                            {isCurrentStatus && (
                              <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                                📍 สถานะปัจจุบัน
                              </span>
                            )}

                            {/* Elapsed Time Badge */}
                            {timeElapsedPill && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {timeElapsedPill}
                              </span>
                            )}
                          </div>

                          {/* Timestamp Badge */}
                          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] font-semibold bg-slate-100/90 px-2.5 py-0.5 rounded-md border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formattedDate} น.</span>
                          </div>
                        </div>

                        {/* Actor Info */}
                        <div className="flex items-center justify-between flex-wrap gap-2 text-slate-700">
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>ผู้ทำรายการ: <strong className="text-slate-900 font-bold">{item.actor}</strong></span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400">
                            ลำดับที่ #{sortOrder === 'desc' ? sortedHistory.length - idx : idx + 1}
                          </span>
                        </div>

                        {/* Note / Remarks */}
                        {item.note && (
                          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 text-slate-800 leading-relaxed font-normal space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              💬 รายละเอียด/หมายเหตุการอัปเดต:
                            </span>
                            <p className="text-xs text-slate-800 leading-relaxed font-medium">
                              {item.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Card Grid Summary View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedHistory.map((item, idx) => {
                  const isCurrentStatus = item.status === selectedRequest.status && (
                    sortOrder === 'desc' ? idx === 0 : idx === sortedHistory.length - 1
                  );

                  const prevItem = sortOrder === 'desc'
                    ? sortedHistory[idx + 1]
                    : (idx > 0 ? sortedHistory[idx - 1] : undefined);

                  const timeElapsedPill = prevItem ? getTimeElapsedText(prevItem.timestamp, item.timestamp) : null;

                  const formattedDate = new Date(item.timestamp).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                        isCurrentStatus
                          ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <StatusBadge status={item.status} size="sm" showIcon showDot showEnLabel />

                        {isCurrentStatus && (
                          <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-md">
                            ปัจจุบัน
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-slate-700">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formattedDate} น.
                          </span>
                          {timeElapsedPill && (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                              {timeElapsedPill}
                            </span>
                          )}
                        </div>

                        <p className="font-semibold flex items-center gap-1 text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.actor}</span>
                        </p>

                        {item.note && (
                          <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 text-xs leading-relaxed">
                            "{item.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Service Feedback Modal */}
      {selectedRequest && (
        <ServiceFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          request={selectedRequest}
          onFeedbackSubmitted={(updated) => {
            setSelectedRequest(updated);
            setSearchResults((prev) => prev.map((r) => r.id === updated.id ? updated : r));
          }}
        />
      )}

      {/* Official Document Print Modal */}
      {showPrintModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 border border-slate-300 shadow-2xl space-y-4 my-4 max-h-[95vh] overflow-y-auto relative">
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">แบบพิมพ์เอกสารคำร้องราชการ</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {selectedRequest.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="ปิดหน้าต่างพิมพ์"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <OfficialDocumentPrint
              request={selectedRequest}
              onBack={() => setShowPrintModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

