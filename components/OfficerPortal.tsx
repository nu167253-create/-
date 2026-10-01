import React, { useState, useEffect, useRef } from 'react';
import { RequestItem, RequestStatus, AttachmentFile, DocumentCategoryType, PriorityLevel } from '../types/request';
import { DOCUMENT_CATEGORIES, getDocumentCategoryDef } from '../data/documentCategories';
import { 
  getStoredRequests, 
  updateRequestStatus, 
  updateRequestInternalNotes,
  bulkUpdateRequestStatus,
  getStatusBadgeColor, 
  getStatusLabelTh,
  getPriorityBadgeColor,
  getPriorityLabelTh,
  addAdminAttachmentToRequest,
  removeAttachmentFromRequest,
  updateAttachmentCategory,
  addInternalComment,
  deleteInternalComment,
  togglePinInternalComment,
  togglePublicInternalComment
} from '../utils/storage';
import { sendStatusEmailNotification, sendStatusSmsNotification } from '../utils/emailService';
import { OfficerPdfReportModal } from './OfficerPdfReportModal';
import { OfficerPendingSummaryPdfModal } from './OfficerPendingSummaryPdfModal';
import { EmailLogsModal } from './EmailLogsModal';
import { OfficerTestSmsModal } from './OfficerTestSmsModal';
import { OfficerSmsTemplateModal } from './OfficerSmsTemplateModal';
import { MonthlyReportModal } from './MonthlyReportModal';
import { RequestAnalyticsCard } from './RequestAnalyticsCard';
import { OfficerDonutDashboardCard } from './OfficerDonutDashboardCard';
import { OfficerDashboardStats } from './OfficerDashboardStats';
import { OfficerSummaryDashboard } from './OfficerSummaryDashboard';
import { SimpleStatusWidget } from './SimpleStatusWidget';
import { 
  exportRequestsToCsv, 
  exportRequestsToExcel, 
  exportQuarterlyCctvRequestsToCsv, 
  exportIncidentTrendsToCsv, 
  exportMonthlyCctvRequestsToCsv,
  exportFilteredCctvRequestsToExcel,
  exportFilteredCctvRequestsToCsv
} from '../utils/csvExport';
import { OfficerMonthlyCctvCsvModal } from './OfficerMonthlyCctvCsvModal';
import { OfficerExportExcelModal } from './OfficerExportExcelModal';
import { exportRequestsToGoogleDocs, createOfficialMemoGoogleDoc, createBulkStatusUpdateMemoGoogleDoc } from '../utils/googleDocs';
import { getStoredOfficerRole, setStoredOfficerRole, verifyAdminPasscode, OfficerRole } from '../utils/permissionsStorage';
import { GoogleTasksSyncWidget } from './GoogleTasksSyncWidget';
import { ApprovalWorkflowViewer } from './ApprovalWorkflowViewer';
import { ApprovalWorkflowEditorModal } from './ApprovalWorkflowEditorModal';
import { ApplicantPermissionsModal } from './ApplicantPermissionsModal';
import { OfficialDocumentPrint } from './OfficialDocumentPrint';
import { AppointmentModal } from './AppointmentModal';
import { AppointmentCard } from './AppointmentCard';
import { OfficerNewRequestModal } from './OfficerNewRequestModal';
import { OfficerReportCenterModal } from './OfficerReportCenterModal';
import { PreReviewInspectionModal } from './PreReviewInspectionModal';
import { AdminRequestVerificationModal } from './AdminRequestVerificationModal';
import { OfficerApprovalPortalModal } from './OfficerApprovalPortalModal';
import { ApprovalHierarchySection } from './ApprovalHierarchySection';
import { AdminApproversManagementModal } from './AdminApproversManagementModal';
import { AdminFolderSystemModal } from './AdminFolderSystemModal';
import { GoogleFormsManagerModal } from './GoogleFormsManagerModal';
import { RequestDetailModal } from './RequestDetailModal';
import { ArchivedRequestsModal } from './ArchivedRequestsModal';
import { CctvEquipmentCsvUploadModal } from './CctvEquipmentCsvUploadModal';
import { CctvCameraCsvUploadModal } from './CctvCameraCsvUploadModal';
import { parseCctvCameraCsvData, mapCctvCameraRow } from '../utils/cctvCameraParser';
import { runAutomated90DayArchival, getEligibleRequestsForArchival } from '../utils/archiveService';
import { AiTopicBadge } from './AiTopicBadge';
import { GitMerge, 
  UserCheck, 
  Archive,
  Search, 
  UploadCloud,
  Database,
  Camera,
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Download, 
  MessageSquare, 
  Send,
  Eye,
  Paperclip,
  Check,
  X,
  Filter,
  Printer,
  Mail,
  Upload,
  Trash2,
  FileCheck,
  ShieldCheck,
  Plus,
  Image,
  FileSpreadsheet,
  Pin,
  StickyNote,
  BarChart3,
  TrendingUp,
  Calendar,
  RotateCcw,
  Globe,
  Lock,
  CheckSquare,
  Square,
  Layers,
  ListChecks,
  ArrowUpDown,
  Copy,
  MailCheck,
  Bell,
  ExternalLink,
  Smartphone,
  MessageSquareCheck,
  ClipboardCheck,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  SlidersHorizontal,
  Folder,
  FolderOpen,
  FolderPlus,
  Info,
  Save
} from 'lucide-react';

import { OfficerUser, getStoredOfficerUser } from '../utils/officerAuth';
import { LogIn, LogOut } from 'lucide-react';

export interface SimulatedEmailDraft {
  requestId: string;
  requestTitle: string;
  recipientName: string;
  recipientEmail: string;
  newStatus: RequestStatus;
  statusLabel: string;
  subject: string;
  body: string;
  sentAt: string;
  officerName: string;
}

export interface BulkToastInfo {
  count: number;
  status: RequestStatus;
  statusLabel: string;
  emailsSent: number;
  timestamp: string;
  drafts: SimulatedEmailDraft[];
}

interface OfficerPortalProps {
  officerUser?: OfficerUser | null;
  onOpenOfficerLogin?: () => void;
  onOfficerLogout?: () => void;
}

export const OfficerPortal: React.FC<OfficerPortalProps> = ({
  officerUser: propOfficerUser,
  onOpenOfficerLogin,
  onOfficerLogout
}) => {
  const currentOfficer = propOfficerUser !== undefined ? propOfficerUser : getStoredOfficerUser();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const filteredRequests = requests
    .filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || r.category === categoryFilter;
      const matchPriority = 
        priorityFilter === 'all' || 
        r.priority === priorityFilter || 
        (priorityFilter === 'medium' && r.priority === 'normal') || 
        (priorityFilter === 'urgent' && r.priority === 'very_urgent');

      const matchTopic =
        topicFilter === 'all' ||
        r.aiAutoTags?.primaryTopic === topicFilter ||
        (r.aiAutoTags?.topics && r.aiAutoTags.topics.includes(topicFilter as any));

      const term = (searchTerm || '').toLowerCase().trim();
      const matchSearch =
        !term ||
        (r.id || '').toLowerCase().includes(term) ||
        (r.title || '').toLowerCase().includes(term) ||
        (r.reason || '').toLowerCase().includes(term) ||
        (r.applicant?.fullName || '').toLowerCase().includes(term) ||
        (r.applicant?.department || '').toLowerCase().includes(term) ||
        (r.location || '').toLowerCase().includes(term) ||
        (r.aiAutoTags?.primaryTopic || '').toLowerCase().includes(term) ||
        (r.aiAutoTags?.reasoning || '').toLowerCase().includes(term) ||
        JSON.stringify(r.details || {}).toLowerCase().includes(term);

      const reqDate = new Date(r.createdAt);
      const matchStartDate = !startDate || reqDate >= new Date(`${startDate}T00:00:00`);
      const matchEndDate = !endDate || reqDate <= new Date(`${endDate}T23:59:59.999`);

      return matchStatus && matchCategory && matchPriority && matchTopic && matchSearch && matchStartDate && matchEndDate;
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

  // Stats Counters
  const totalCount = requests.length;
  const pendingReview = requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const actionRequired = requests.filter(r => r.status === 'action_required').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPendingSummaryPdfModal, setShowPendingSummaryPdfModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTestSmsModal, setShowTestSmsModal] = useState(false);
  const [showSmsTemplateModal, setShowSmsTemplateModal] = useState(false);
  const [testSmsTargetReq, setTestSmsTargetReq] = useState<RequestItem | null>(null);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [officerViewSection, setOfficerViewSection] = useState<'all' | 'requests' | 'analytics'>('all');
  const [showReportCenterModal, setShowReportCenterModal] = useState(false);
  const [showPreReviewModal, setShowPreReviewModal] = useState(false);
  const [showAdminVerificationModal, setShowAdminVerificationModal] = useState(false);
  const [adminVerificationReq, setAdminVerificationReq] = useState<RequestItem | null>(null);
  const [showApproversManagementModal, setShowApproversManagementModal] = useState(false);
  const [showAdminFolderModal, setShowAdminFolderModal] = useState(false);
  const [showApprovalPortalModal, setShowApprovalPortalModal] = useState(false);
  const [showApprovalHierarchyModal, setShowApprovalHierarchyModal] = useState(false);
  const [approvalSelectedReqId, setApprovalSelectedReqId] = useState<string | null>(null);
  const [printDocReq, setPrintDocReq] = useState<RequestItem | null>(null);
  const [appointmentModalReq, setAppointmentModalReq] = useState<RequestItem | null>(null);
  const [showDetailModalReq, setShowDetailModalReq] = useState<RequestItem | null>(null);
  const [showArchivesModal, setShowArchivesModal] = useState(false);
  const [showGoogleFormsModal, setShowGoogleFormsModal] = useState(false);
  const [eligibleArchiveCount, setEligibleArchiveCount] = useState<number>(0);

  // Automated 90-day archive check & cleanup on portal load
  useEffect(() => {
    const eligible = getEligibleRequestsForArchival(requests, 90);
    setEligibleArchiveCount(eligible.length);

    // Auto-run background archival if eligible items exist
    if (eligible.length > 0) {
      runAutomated90DayArchival(false, 'Automated 90-Day Retention Engine').then((res) => {
        if (res.archivedCount > 0) {
          reloadRequests();
          setSuccessMsg(`📦 ระบบทำการย้ายคำร้องที่เสร็จสิ้นเกิน 90 วันเข้าสู่คลังจัดเก็บ (Archive Collection) อัตโนมัติ ${res.archivedCount} รายการ เพื่อเพิ่มประสิทธิภาพระบบ`);
          setTimeout(() => setSuccessMsg(null), 6000);
        }
      });
    }
  }, [requests.length]);

  // Officer Role & Admin Privilege State
  const initialRole = currentOfficer?.role || getStoredOfficerRole();
  const [officerRole, setOfficerRoleState] = useState<OfficerRole>(initialRole);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');
  const [adminPasscodeError, setAdminPasscodeError] = useState<string | null>(null);
  const [pendingReportAction, setPendingReportAction] = useState<'report_center' | 'monthly_report' | 'pdf_report' | 'csv_export' | 'admin_verification' | 'approvers_management' | 'admin_folder' | 'cctv_csv_upload' | 'cctv_camera_csv_upload' | null>(null);
  const [showCctvCsvUploadModal, setShowCctvCsvUploadModal] = useState(false);
  const [showCctvCameraCsvModal, setShowCctvCameraCsvModal] = useState(false);

  // Update officer role state when currentOfficer changes
  useEffect(() => {
    if (currentOfficer) {
      setOfficerRoleState(currentOfficer.role);
    }
  }, [currentOfficer]);

  const switchOfficerRole = (newRole: OfficerRole) => {
    setStoredOfficerRole(newRole);
    setOfficerRoleState(newRole);
  };

  const handleOpenCctvCameraCsvUpload = () => {
    if (officerRole === 'admin') {
      setShowCctvCameraCsvModal(true);
    } else {
      setPendingReportAction('cctv_camera_csv_upload');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenCctvCsvUpload = () => {
    if (officerRole === 'admin') {
      setShowCctvCsvUploadModal(true);
    } else {
      setPendingReportAction('cctv_csv_upload');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenAdminFolderModal = () => {
    if (officerRole === 'admin') {
      setShowAdminFolderModal(true);
    } else {
      setPendingReportAction('admin_folder');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenAdminVerification = (targetReq?: RequestItem) => {
    const chosen = targetReq || selectedReq || requests.find(r => r.status === 'submitted' || r.status === 'under_review') || requests[0] || null;
    setAdminVerificationReq(chosen);
    if (officerRole === 'admin') {
      setShowAdminVerificationModal(true);
    } else {
      setPendingReportAction('admin_verification');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenReportCenter = () => {
    if (officerRole === 'admin') {
      setShowReportCenterModal(true);
    } else {
      setPendingReportAction('report_center');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenApproversManagement = () => {
    if (officerRole === 'admin') {
      setShowApproversManagementModal(true);
    } else {
      setPendingReportAction('approvers_management');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenMonthlyReport = () => {
    if (officerRole === 'admin') {
      setShowMonthlyReportModal(true);
    } else {
      setPendingReportAction('monthly_report');
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenPdfReport = () => {
    setShowPdfModal(true);
  };

  const getActiveFilterSummary = () => ({
    statusFilter,
    priorityFilter,
    categoryFilter,
    topicFilter,
    searchTerm,
    startDate,
    endDate,
    totalCount: requests.length,
    officerName: currentOfficer?.name || 'เจ้าหน้าที่ศูนย์ควบคุมกล้อง CCTV'
  });

  const handleExportFilteredExcel = () => {
    // If filtered requests contains CCTV requests or specific category, target them with full municipal headers
    const cctvFiltered = filteredRequests.filter(r => r.category === 'cctv');
    const listToExport = cctvFiltered.length > 0 ? cctvFiltered : filteredRequests;

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องที่ตรงตามเงื่อนไขตัวกรองในขณะนี้ กรุณาปรับเปลี่ยนตัวกรองก่อนส่งออก');
      return;
    }
    const filterSummary = getActiveFilterSummary();
    exportFilteredCctvRequestsToExcel(listToExport, {
      ...filterSummary,
      categoryFilter: cctvFiltered.length > 0 ? 'cctv' : filterSummary.categoryFilter,
      customTitle: 'รายงานสรุปคำร้องขอดูภาพกล้องวงจรปิด CCTV (Official CCTV Request Logs)',
      filenamePrefix: 'รายงานคำร้อง_CCTV_Filtered_Excel'
    });
    setSuccessMsg(`📊 ส่งออกรายการคำร้อง CCTV ที่กรอง (${listToExport.length} รายการ) เป็นไฟล์ Microsoft Excel (.xlsx) เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const handleExportFilteredCsv = () => {
    const cctvFiltered = filteredRequests.filter(r => r.category === 'cctv');
    const listToExport = cctvFiltered.length > 0 ? cctvFiltered : filteredRequests;

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องที่ตรงตามเงื่อนไขตัวกรองในขณะนี้ กรุณาปรับเปลี่ยนตัวกรองก่อนส่งออก');
      return;
    }
    const filterSummary = getActiveFilterSummary();
    exportFilteredCctvRequestsToCsv(listToExport, {
      ...filterSummary,
      categoryFilter: cctvFiltered.length > 0 ? 'cctv' : filterSummary.categoryFilter,
      customTitle: 'รายงานสรุปคำร้องขอดูภาพกล้องวงจรปิด CCTV (Official CCTV Request Logs)',
      filenamePrefix: 'รายงานคำร้อง_CCTV_Filtered_CSV'
    });
    setSuccessMsg(`📥 ส่งออกรายการคำร้อง CCTV ที่กรอง (${listToExport.length} รายการ) เป็นไฟล์ CSV (.csv) เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const handleQuickCsvExport = () => {
    let listToExport: RequestItem[] = [];
    if (selectedRequestIds.length > 0) {
      listToExport = requests.filter(r => selectedRequestIds.includes(r.id));
    } else if (filteredRequests.length > 0) {
      listToExport = filteredRequests;
    } else {
      listToExport = requests;
    }

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องสำหรับส่งออก CSV');
      return;
    }

    const filterSummary = getActiveFilterSummary();
    exportRequestsToCsv(listToExport, 'รายงานคำร้อง_CCTV_Offline_Analysis', { filterSummary });
    setSuccessMsg(`ดาวน์โหลดรายงานคำร้อง CSV สำหรับการวิเคราะห์แบบ Offline (${listToExport.length} รายการ) เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleExportIncidentTrendsCsv = () => {
    let listToExport: RequestItem[] = [];
    if (selectedRequestIds.length > 0) {
      listToExport = requests.filter(r => selectedRequestIds.includes(r.id));
    } else if (filteredRequests.length > 0) {
      listToExport = filteredRequests;
    } else {
      listToExport = requests;
    }

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องสำหรับส่งออกรายงานวิเคราะห์แนวโน้มเหตุการณ์');
      return;
    }

    exportIncidentTrendsToCsv(listToExport, 'รายงานวิเคราะห์แนวโน้มเหตุการณ์_Incident_Trends');
    setSuccessMsg(`📊 ส่งออกไฟล์ CSV วิเคราะห์แนวโน้มเหตุการณ์และพิกัด (${listToExport.length} รายการ) เรียบร้อยแล้ว!`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleExecuteExportCSV = () => {
    exportToCSV();
  };

  const handleUnlockAdmin = () => {
    if (verifyAdminPasscode(adminPasscodeInput)) {
      switchOfficerRole('admin');
      setShowAdminAuthModal(false);
      setAdminPasscodeInput('');
      setAdminPasscodeError(null);
      
      // Execute pending action if any
      if (pendingReportAction === 'report_center') {
        setShowReportCenterModal(true);
      } else if (pendingReportAction === 'admin_folder') {
        setShowAdminFolderModal(true);
      } else if (pendingReportAction === 'admin_verification') {
        setShowAdminVerificationModal(true);
      } else if (pendingReportAction === 'approvers_management') {
        setShowApproversManagementModal(true);
      } else if (pendingReportAction === 'monthly_report') {
        setShowMonthlyReportModal(true);
      } else if (pendingReportAction === 'pdf_report') {
        setShowPdfModal(true);
      } else if (pendingReportAction === 'csv_export') {
        exportToCSV();
      } else if (pendingReportAction === 'cctv_csv_upload') {
        setShowCctvCsvUploadModal(true);
      } else if (pendingReportAction === 'cctv_camera_csv_upload') {
        setShowCctvCameraCsvModal(true);
      }
      setPendingReportAction(null);
    } else {
      setAdminPasscodeError('รหัสผ่าน Admin ไม่ถูกต้อง (รหัสทดสอบ: 1234 หรือ admin)');
    }
  };


  // Action modal form state
  const defaultOfficerName = currentOfficer?.name || 'นางสาวจิราพร ใจดี (เจ้าหน้าที่รับเรื่อง)';
  const [newStatus, setNewStatus] = useState<RequestStatus>('under_review');
  const [officerNotes, setOfficerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSavingInternalNotes, setIsSavingInternalNotes] = useState(false);
  const [internalNotesMsg, setInternalNotesMsg] = useState<string | null>(null);
  const [assignedOfficer, setAssignedOfficer] = useState(defaultOfficerName);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin File Management state
  const [adminFileDesc, setAdminFileDesc] = useState('');
  const [adminFileCategory, setAdminFileCategory] = useState<DocumentCategoryType>('official_letter');
  const [attachmentCategoryFilter, setAttachmentCategoryFilter] = useState<DocumentCategoryType | 'all'>('all');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileMsg, setFileMsg] = useState<string | null>(null);

  // Internal Comment / Note state
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isCommentPinned, setIsCommentPinned] = useState(false);
  const [isCommentPublic, setIsCommentPublic] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState(defaultOfficerName);
  const [commentMsg, setCommentMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentOfficer) {
      setAssignedOfficer(currentOfficer.name);
      setCommentAuthor(currentOfficer.name);
    }
  }, [currentOfficer]);

  // Bulk Selection and Status Update state
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<RequestStatus>('under_review');
  const [bulkAssignOfficer, setBulkAssignOfficer] = useState(defaultOfficerName);
  const [bulkTargetPriority, setBulkTargetPriority] = useState<RequestItem['priority'] | 'keep'>('keep');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkInternalNotes, setBulkInternalNotes] = useState('');
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  const [showSelectionHelperMenu, setShowSelectionHelperMenu] = useState(false);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOfficer) {
      setBulkAssignOfficer(currentOfficer.name);
    }
  }, [currentOfficer]);

  // Bulk Toast Notification & Email Drafts state
  const [bulkToastNotification, setBulkToastNotification] = useState<BulkToastInfo | null>(null);
  const [showEmailDraftsModal, setShowEmailDraftsModal] = useState(false);
  const [selectedEmailDraft, setSelectedEmailDraft] = useState<SimulatedEmailDraft | null>(null);
  const [sendNotificationEmails, setSendNotificationEmails] = useState(true);
  const [sendNotificationSms, setSendNotificationSms] = useState(true);
  const [copyEmailSuccess, setCopyEmailSuccess] = useState(false);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'incident_trends' | 'csv' | 'xlsx'>('incident_trends');
  const [exportScope, setExportScope] = useState<'filtered' | 'selected' | 'all'>('filtered');

  const [createGoogleDocOnBulkUpdate, setCreateGoogleDocOnBulkUpdate] = useState(false);
  const [isGeneratingGoogleDocs, setIsGeneratingGoogleDocs] = useState(false);

  // Quick Direct Bulk Status Update Handler for 'under_review' and 'completed'
  const handleDirectQuickBulkStatusUpdate = async (targetStatus: 'under_review' | 'completed') => {
    if (selectedRequestIds.length === 0) {
      alert('กรุณาเลือกรายการคำร้องอย่างน้อย 1 รายการ');
      return;
    }

    const targetLabel = getStatusLabelTh(targetStatus);
    const confirmed = window.confirm(
      `คุณต้องการปรับสถานะคำร้องที่เลือกจำนวน ${selectedRequestIds.length} รายการเป็น "${targetLabel}" ทันทีใช่หรือไม่?\n\n(ระบบจะบันทึกสถานะใหม่และส่งการแจ้งเตือนโดยอัตโนมัติ)`
    );
    if (!confirmed) return;

    const affectedRequests = requests.filter(r => selectedRequestIds.includes(r.id));
    const officer = (bulkAssignOfficer || assignedOfficer || '').trim() || 'เจ้าหน้าที่ผู้ปฏิบัติงานสารบรรณ';
    const nowStr = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

    const count = bulkUpdateRequestStatus(
      selectedRequestIds,
      targetStatus,
      officer,
      `ปรับสถานะด่วนเป็น ${targetLabel} แบบกลุ่ม (${selectedRequestIds.length} รายการ)`
    );

    // Send notifications
    affectedRequests.forEach(r => {
      sendStatusEmailNotification(r, targetStatus, `ปรับสถานะด่วนเป็น ${targetLabel}`);
      sendStatusSmsNotification(r, targetStatus, `ปรับสถานะด่วนเป็น ${targetLabel}`);
    });

    setSuccessMsg(`⚡ ปรับสถานะคำร้องแบบกลุ่มสำเร็จ ${count} รายการเป็น "${targetLabel}" พร้อมส่งการแจ้งเตือนเรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 5000);

    setSelectedRequestIds([]);
    reloadRequests();
  };

  // Export selected or filtered requests to Google Docs
  const handleExportBulkGoogleDocs = async () => {
    let listToExport = requests.filter(r => selectedRequestIds.includes(r.id));
    if (listToExport.length === 0) {
      listToExport = filteredRequests.length > 0 ? filteredRequests : requests;
    }

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องสำหรับส่งออก Google Docs');
      return;
    }

    const confirmed = window.confirm(
      `คุณต้องการสร้างเอกสาร Google Docs สรุปรายงานคำร้องจำนวน ${listToExport.length} รายการใช่หรือไม่?`
    );
    if (!confirmed) return;

    setIsGeneratingGoogleDocs(true);
    try {
      const officer = (currentOfficer?.name || assignedOfficer || 'เจ้าหน้าที่งานสารบรรณ').trim();
      const docUrl = await exportRequestsToGoogleDocs(listToExport, 'รายงานสรุปคำร้องงานสารบรรณ_eService', officer);
      const openDoc = window.confirm('สร้างเอกสาร Google Docs สำเร็จเรียบร้อยแล้ว!\n\nต้องการเปิดเอกสาร Google Docs ตอนนี้เลยหรือไม่?');
      if (openDoc) {
        window.open(docUrl, '_blank');
      }
      setSuccessMsg(`📄 สร้างเอกสารสรุป Google Docs สำเร็จ (${listToExport.length} รายการ)`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to export to Google Docs:', err);
      alert(`การสร้าง Google Docs ผิดพลาด: ${err.message}`);
    } finally {
      setIsGeneratingGoogleDocs(false);
    }
  };

  // Export single request memo to Google Docs
  const handleExportSingleRequestGoogleDoc = async (req: RequestItem) => {
    setIsGeneratingGoogleDocs(true);
    try {
      const officer = (currentOfficer?.name || assignedOfficer || 'เจ้าหน้าที่งานสารบรรณ').trim();
      const docUrl = await createOfficialMemoGoogleDoc(req, officer);
      const openDoc = window.confirm(`สร้างบันทึกข้อความราชการใน Google Docs สำหรับคำร้อง ${req.id} สำเร็จ!\n\nต้องการเปิดเอกสารทันทีหรือไม่?`);
      if (openDoc) {
        window.open(docUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Failed to create single request Google Doc:', err);
      alert(`ไม่สามารถสร้าง Google Docs ได้: ${err.message}`);
    } finally {
      setIsGeneratingGoogleDocs(false);
    }
  };

  // Monthly & Quarterly CCTV CSV Export Modal State
  const [showMonthlyCsvModal, setShowMonthlyCsvModal] = useState(false);
  const [showQuarterlyExportModal, setShowQuarterlyExportModal] = useState(false);
  const [showExportExcelModal, setShowExportExcelModal] = useState(false);

  const handleOpenCctvExcelExportModal = () => {
    setShowExportExcelModal(true);
  };
  const [quarterlyYear, setQuarterlyYear] = useState<number>(new Date().getFullYear());
  const [quarterlyQuarter, setQuarterlyQuarter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [quarterlyStatusFilter, setQuarterlyStatusFilter] = useState<'all' | 'approved_only'>('all');

  const handleExportQuarterlyCsv = () => {
    let filtered = requests;

    if (quarterlyStatusFilter === 'approved_only') {
      filtered = filtered.filter(r => r.status === 'approved' || r.status === 'completed');
    }

    filtered = filtered.filter(r => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() !== quarterlyYear) return false;

      if (quarterlyQuarter !== 'all') {
        const m = d.getMonth() + 1;
        if (quarterlyQuarter === 'Q1' && (m < 1 || m > 3)) return false;
        if (quarterlyQuarter === 'Q2' && (m < 4 || m > 6)) return false;
        if (quarterlyQuarter === 'Q3' && (m < 7 || m > 9)) return false;
        if (quarterlyQuarter === 'Q4' && (m < 10 || m > 12)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      alert(`ไม่พบรายการคำร้อง CCTV ในช่วงไตรมาส ${quarterlyQuarter === 'all' ? 'ทั้งหมด' : quarterlyQuarter} ปี พ.ศ. ${quarterlyYear + 543}`);
      return;
    }

    const qLabel = quarterlyQuarter === 'all' 
      ? `ทุกไตรมาส_ปี${quarterlyYear + 543}` 
      : `ไตรมาส_${quarterlyQuarter}_ปี${quarterlyYear + 543}`;

    exportQuarterlyCctvRequestsToCsv(
      filtered,
      qLabel,
      'รายงานสรุปคำร้อง_CCTV_ประจำไตรมาส'
    );

    setSuccessMsg(`ส่งออกไฟล์ CSV รายงานสรุปคำร้อง CCTV ประจำไตรมาส (${qLabel}) จำนวน ${filtered.length} รายการ เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessMsg(null), 5000);
    setShowQuarterlyExportModal(false);
  };

  const handleToggleSelectRequest = (
    id: string, 
    index?: number, 
    event?: React.MouseEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>
  ) => {
    // Check if shift key was pressed and we have a previous index
    if (event && 'shiftKey' in event && (event as React.MouseEvent).shiftKey && lastSelectedIndex !== null && index !== undefined) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = filteredRequests.slice(start, end + 1).map(r => r.id);
      setSelectedRequestIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      setSelectedRequestIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  };

  const handleRemoveFromSelection = (id: string) => {
    setSelectedRequestIds(prev => prev.filter(i => i !== id));
  };

  const handleSelectAllFiltered = (filtered: RequestItem[]) => {
    const filteredIds = filtered.map(r => r.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedRequestIds.includes(id));
    if (allSelected) {
      setSelectedRequestIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedRequestIds, ...filteredIds]));
      setSelectedRequestIds(combined);
    }
    setShowSelectionHelperMenu(false);
  };

  const handleSelectByStatus = (statusList: RequestStatus[]) => {
    const matchingIds = filteredRequests.filter(r => statusList.includes(r.status)).map(r => r.id);
    setSelectedRequestIds(Array.from(new Set([...selectedRequestIds, ...matchingIds])));
    setShowSelectionHelperMenu(false);
  };

  const handleInvertFilteredSelection = () => {
    const filteredIds = filteredRequests.map(r => r.id);
    setSelectedRequestIds(prev => {
      const remaining = prev.filter(id => !filteredIds.includes(id));
      const newlySelected = filteredIds.filter(id => !prev.includes(id));
      return [...remaining, ...newlySelected];
    });
    setShowSelectionHelperMenu(false);
  };

  const handleClearSelection = () => {
    setSelectedRequestIds([]);
    setLastSelectedIndex(null);
    setShowSelectionHelperMenu(false);
    setShowBulkStatusDropdown(false);
  };

  const handleOpenBulkModal = (targetStatus?: RequestStatus) => {
    if (targetStatus) setBulkTargetStatus(targetStatus);
    setBulkInternalNotes('');
    setShowBulkStatusDropdown(false);
    setShowBulkModal(true);
  };

  const handleSelectUrgent = () => {
    const matchingIds = filteredRequests
      .filter(r => r.priority === 'urgent' || r.priority === 'very_urgent' || r.priority === 'high')
      .map(r => r.id);
    setSelectedRequestIds(Array.from(new Set([...selectedRequestIds, ...matchingIds])));
    setShowSelectionHelperMenu(false);
  };

  const handleSelectPendingPreReview = () => {
    const matchingIds = filteredRequests
      .filter(r => !r.preReviewCheck || r.preReviewCheck.resultStatus !== 'passed')
      .map(r => r.id);
    setSelectedRequestIds(Array.from(new Set([...selectedRequestIds, ...matchingIds])));
    setShowSelectionHelperMenu(false);
  };

  const handleExecuteBulkStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequestIds.length === 0) return;

    // Retrieve affected request items prior to mutation
    const affectedRequests = requests.filter(r => selectedRequestIds.includes(r.id));
    const officer = (bulkAssignOfficer || assignedOfficer || '').trim() || 'เจ้าหน้าที่ผู้ปฏิบัติงานสารบรรณ';
    const statusLabel = getStatusLabelTh(bulkTargetStatus);
    const nowStr = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

    const count = bulkUpdateRequestStatus(
      selectedRequestIds,
      bulkTargetStatus,
      officer,
      (bulkNote || '').trim() || `เปลี่ยนสถานะเป็น ${statusLabel} แบบกลุ่ม (${selectedRequestIds.length} รายการ)`,
      bulkAssignOfficer ? bulkAssignOfficer.trim() : undefined,
      bulkTargetPriority === 'keep' ? undefined : bulkTargetPriority,
      bulkInternalNotes.trim() || undefined
    );

    // Create simulated email draft confirmations
    const drafts: SimulatedEmailDraft[] = affectedRequests.map(r => ({
      requestId: r.id,
      requestTitle: r.title,
      recipientName: `${r.applicant?.prefix || ''}${r.applicant?.firstName || ''} ${r.applicant?.lastName || ''}`.trim(),
      recipientEmail: r.applicant?.email || '',
      newStatus: bulkTargetStatus,
      statusLabel: statusLabel,
      subject: `[ระบบสารบรรณอิเล็กทรอนิกส์] แจ้งผลพิจารณา/อัปเดตสถานะคำร้องเลขที่ ${r.id}: ${r.title}`,
      body: `เรียน คุณ${r.applicant?.prefix || ''}${r.applicant?.firstName || ''} ${r.applicant?.lastName || ''},\n\n` +
        `ระบบสารบรรณอิเล็กทรอนิกส์ขอแจ้งให้ทราบว่า คำร้องของท่าน เรื่อง "${r.title}" (รหัสติดตามคำร้อง: ${r.id}) ได้รับการอัปเดตสถานะเป็น "${statusLabel}" เรียบร้อยแล้ว\n\n` +
        `บันทึก/ข้อความการพิจารณาโดยเจ้าหน้าที่ (${officer}):\n` +
        `"${(bulkNote || '').trim() || 'ได้รับการปรับสถานะแบบกลุ่มเรียบร้อยแล้ว'}"\n\n` +
        `ท่านสามารถเข้าสู่ระบบเพื่อติดตามสถานะคำร้อง หรือดาวน์โหลดเอกสารอนุมัติได้ตลอด 24 ชั่วโมงที่ระบบติดตามคำร้องสารบรรณ\n\n` +
        `ขอแสดงความนับถือ,\n` +
        `${officer}\n` +
        `ศูนย์บริการสารบรรณดิจิทัลและหนังสือรับรอง`,
      sentAt: nowStr,
      officerName: officer
    }));

    // Dispatch automated Email and SMS notifications if enabled
    if (sendNotificationEmails) {
      affectedRequests.forEach(r => {
        sendStatusEmailNotification(r, bulkTargetStatus, (bulkNote || '').trim());
      });
    }
    if (sendNotificationSms) {
      affectedRequests.forEach(r => {
        sendStatusSmsNotification(r, bulkTargetStatus, (bulkNote || '').trim());
      });
    }

    const toastInfo: BulkToastInfo = {
      count,
      status: bulkTargetStatus,
      statusLabel,
      emailsSent: sendNotificationEmails ? count : 0,
      timestamp: nowStr,
      drafts
    };

    setBulkToastNotification(toastInfo);
    if (drafts.length > 0) {
      setSelectedEmailDraft(drafts[0]);
    }

    const notificationParts = [];
    if (sendNotificationEmails) notificationParts.push(`📧 อีเมล ${count} รายการ`);
    if (sendNotificationSms) notificationParts.push(`📱 SMS ${count} รายการ`);

    const notificationSummary = notificationParts.length > 0
      ? ` (พร้อมส่งการแจ้งเตือน: ${notificationParts.join(' และ ')})`
      : '';

    // If user requested Google Doc Memo generation, create it asynchronously
    if (createGoogleDocOnBulkUpdate) {
      createBulkStatusUpdateMemoGoogleDoc(
        affectedRequests,
        bulkTargetStatus,
        officer,
        (bulkNote || '').trim()
      ).then(docUrl => {
        const openDoc = window.confirm(`⚡ สร้างบันทึกข้อความสรุปการปรับสถานะแบบกลุ่มใน Google Docs สำเร็จแล้ว!\n\nต้องการเปิดเอกสาร Google Docs ตอนนี้เลยหรือไม่?`);
        if (openDoc) {
          window.open(docUrl, '_blank');
        }
      }).catch(err => {
        console.error('Failed to create bulk memo Google Doc:', err);
      });
    }

    setSuccessMsg(`⚡ ปรับสถานะคำร้องแบบกลุ่มสำเร็จ ${count} รายการเป็น "${statusLabel}"${notificationSummary}`);
    setTimeout(() => setSuccessMsg(null), 5000);

    setSelectedRequestIds([]);
    setShowBulkModal(false);
    setBulkNote('');
    setBulkTargetPriority('keep');
    setCreateGoogleDocOnBulkUpdate(false);
    reloadRequests();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !(newCommentContent || '').trim()) return;

    const updated = addInternalComment(
      selectedReq.id,
      (commentAuthor || '').trim() || 'เจ้าหน้าที่ผู้ปฏิบัติงาน',
      (newCommentContent || '').trim(),
      isCommentPinned,
      isCommentPublic
    );

    if (updated) {
      setSelectedReq(updated);
      setNewCommentContent('');
      setIsCommentPinned(false);
      setIsCommentPublic(false);
      setCommentMsg(isCommentPublic ? 'บันทึกโน้ตสาธารณะ (เปิดเผยแก่ผู้ยื่นคำร้อง) เรียบร้อยแล้ว' : 'บันทึกโน้ตภายในส่วนตัวเรียบร้อยแล้ว');
      setTimeout(() => setCommentMsg(null), 3000);
      reloadRequests();
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedReq) return;
    if (!window.confirm('คุณต้องการลบโน้ตนี้ใช่หรือไม่?')) return;

    const updated = deleteInternalComment(selectedReq.id, commentId);
    if (updated) {
      setSelectedReq(updated);
      setCommentMsg('ลบโน้ตเรียบร้อยแล้ว');
      setTimeout(() => setCommentMsg(null), 3000);
      reloadRequests();
    }
  };

  const handleTogglePinComment = (commentId: string) => {
    if (!selectedReq) return;
    const updated = togglePinInternalComment(selectedReq.id, commentId);
    if (updated) {
      setSelectedReq(updated);
      reloadRequests();
    }
  };

  const handleTogglePublicComment = (commentId: string) => {
    if (!selectedReq) return;
    const updated = togglePublicInternalComment(selectedReq.id, commentId);
    if (updated) {
      setSelectedReq(updated);
      setCommentMsg('อัปเดตสิทธิ์การเข้าถึงโน้ตเรียบร้อยแล้ว');
      setTimeout(() => setCommentMsg(null), 3000);
      reloadRequests();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedReq) return;

    setIsUploadingFile(true);
    let count = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const updated = addAdminAttachmentToRequest(
        selectedReq.id,
        {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: dataUrl || undefined,
          description: (adminFileDesc || '').trim() || 'เอกสารทางการ/หนังสืออนุมัติ โดยแอดมิน',
          documentCategory: adminFileCategory
        },
        assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'
      );

      if (updated) {
        setSelectedReq(updated);
        count++;
      }
    }

    setIsUploadingFile(false);
    setAdminFileDesc('');
    setFileMsg(`อัปโหลดไฟล์สำเร็จ ${count} รายการเรียบร้อยแล้ว!`);
    setTimeout(() => setFileMsg(null), 3500);
    reloadRequests();
  };

  const handleUpdateAttachmentCategoryTag = (attId: string, newCat: DocumentCategoryType) => {
    if (!selectedReq) return;
    const updated = updateAttachmentCategory(
      selectedReq.id,
      attId,
      newCat,
      assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'
    );
    if (updated) {
      setSelectedReq(updated);
      reloadRequests();
    }
  };

  const handleRemoveAttachment = (attId: string, fileName: string) => {
    if (!selectedReq) return;
    if (!window.confirm(`คุณต้องการลบไฟล์ "${fileName}" ออกจากคำร้องนี้ใช่หรือไม่?`)) return;

    const updated = removeAttachmentFromRequest(
      selectedReq.id,
      attId,
      assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'
    );

    if (updated) {
      setSelectedReq(updated);
      setFileMsg(`ลบไฟล์ "${fileName}" เรียบร้อยแล้ว`);
      setTimeout(() => setFileMsg(null), 3500);
      reloadRequests();
    }
  };

  const reloadRequests = () => {
    const list = getStoredRequests();
    setRequests(list);
  };

  useEffect(() => {
    reloadRequests();
  }, []);

  const openActionModal = (req: RequestItem) => {
    setSelectedReq(req);
    setNewStatus(req.status);
    setOfficerNotes(req.officerNotes || '');
    setInternalNotes(req.internalNotes || '');
    setInternalNotesMsg(null);
    if (req.assignedOfficer) setAssignedOfficer(req.assignedOfficer);
  };

  const handleSaveInternalNotesOnly = () => {
    if (!selectedReq) return;
    setIsSavingInternalNotes(true);
    setTimeout(() => {
      const officer = currentOfficer?.name || assignedOfficer || 'เจ้าหน้าที่ผู้รับผิดชอบ';
      const updated = updateRequestInternalNotes(selectedReq.id, internalNotes, officer);
      setIsSavingInternalNotes(false);
      if (updated) {
        setSelectedReq(updated);
        reloadRequests();
        setInternalNotesMsg('บันทึกข้อความภายในเฉพาะเจ้าหน้าที่ (Internal Notes) เรียบร้อยแล้ว');
        setTimeout(() => setInternalNotesMsg(null), 4000);
      }
    }, 250);
  };

  const handleUpdateStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsUpdating(true);

    setTimeout(() => {
      const updated = updateRequestStatus(
        selectedReq.id,
        newStatus,
        assignedOfficer || 'เจ้าหน้าที่ผู้รับเรื่อง',
        `อัปเดตสถานะเป็น ${getStatusLabelTh(newStatus)}`,
        officerNotes,
        assignedOfficer,
        internalNotes
      );

      let notificationsSent: string[] = [];
      if (updated) {
        if (sendNotificationEmails) {
          sendStatusEmailNotification(updated, newStatus, officerNotes);
          notificationsSent.push(`📧 อีเมล: ${updated.applicant?.email || 'ผู้ยื่นคำร้อง'}`);
        }
        if (sendNotificationSms) {
          sendStatusSmsNotification(updated, newStatus, officerNotes);
          notificationsSent.push(`📱 SMS: ${updated.applicant?.phone || 'เบอร์มือถือ'}`);
        }
      }

      setIsUpdating(false);
      const notificationNote = notificationsSent.length > 0
        ? ` (${notificationsSent.join(', ')})`
        : '';
      setSuccessMsg(`อัปเดตคำร้อง ${selectedReq.id} เป็น "${getStatusLabelTh(newStatus)}" เรียบร้อยแล้ว!${notificationNote}`);
      setTimeout(() => setSuccessMsg(null), 5000);

      reloadRequests();
      if (updated) setSelectedReq(updated);
    }, 400);
  };

  // CSV / Excel Export Handler
  const openExportModal = () => {
    if (selectedRequestIds.length > 0) {
      setExportScope('selected');
    } else {
      setExportScope('filtered');
    }
    setShowExportModal(true);
  };

  const handleExecuteExport = () => {
    let listToExport: RequestItem[] = [];
    if (exportScope === 'selected' && selectedRequestIds.length > 0) {
      listToExport = requests.filter(r => selectedRequestIds.includes(r.id));
    } else if (exportScope === 'all') {
      listToExport = requests;
    } else {
      listToExport = filteredRequests;
    }

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องที่จะส่งออกตามขอบเขตที่เลือก (หากเลือกรายการที่กรอง กรุณาตรวจสอบว่ามีคำร้องตรงตามเงื่อนไข)');
      return;
    }

    const filterSummary = getActiveFilterSummary();

    if (exportFormat === 'incident_trends') {
      exportIncidentTrendsToCsv(listToExport, `รายงานวิเคราะห์แนวโน้มเหตุการณ์_${exportScope}_Analysis`);
      setSuccessMsg(`📊 ส่งออกรายงานวิเคราะห์แนวโน้มเหตุการณ์ CSV (${listToExport.length} รายการ) เรียบร้อยแล้ว`);
    } else if (exportFormat === 'xlsx') {
      exportRequestsToExcel(listToExport, `รายงานคำร้อง_CCTV_${exportScope}_Excel`, { filterSummary });
      setSuccessMsg(`📊 ส่งออกข้อมูลคำร้อง ${listToExport.length} รายการเป็นไฟล์ Excel (.xlsx) เรียบร้อยแล้ว`);
    } else {
      exportRequestsToCsv(listToExport, `รายงานคำร้อง_CCTV_${exportScope}_CSV`, { filterSummary });
      setSuccessMsg(`📥 ส่งออกข้อมูลคำร้อง ${listToExport.length} รายการเป็นไฟล์ CSV (.csv) เรียบร้อยแล้ว`);
    }

    setTimeout(() => setSuccessMsg(null), 4500);
    setShowExportModal(false);
  };

  const exportToCSV = () => {
    openExportModal();
  };

  // Set indeterminate state on master checkbox
  useEffect(() => {
    if (masterCheckboxRef.current) {
      const filteredIds = filteredRequests.map(r => r.id);
      const selectedInFiltered = filteredIds.filter(id => selectedRequestIds.includes(id)).length;
      masterCheckboxRef.current.indeterminate = selectedInFiltered > 0 && selectedInFiltered < filteredIds.length;
    }
  }, [selectedRequestIds, filteredRequests]);

  if (printDocReq) {
    return (
      <OfficialDocumentPrint
        request={printDocReq}
        onBack={() => setPrintDocReq(null)}
      />
    );
  }

  // If officer is not logged in, prompt Officer Authentication Lock Screen
  if (!currentOfficer) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Official Officer Authentication Required
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            ระบบสำหรับเจ้าหน้าที่ผู้ปฏิบัติงาน (Officer Access Only)
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            ท่านจำเป็นต้องเข้าสู่ระบบในฐานะเจ้าหน้าที่หรือผู้ดูแลระบบเพื่อตรวจสอบ ตรวจรับ พิจารณาคำร้อง และออกหนังสืออนุมัติ
          </p>
        </div>

        <div className="bg-slate-900 text-white p-5 rounded-2xl text-left text-xs space-y-2 max-w-md mx-auto shadow-inner">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            ข้อมูลการสิทธิ์การใช้งานระบบเจ้าหน้าที่
          </div>
          <p className="text-slate-300">
            • <strong>อีเมลปฏิบัติงาน:</strong> officer@chaiyaphum.go.th หรือ admin@chaiyaphum.go.th<br />
            • <strong>รหัสผ่านทดสอบ (Passcode):</strong> <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">1234</code> หรือ <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">admin</code><br />
            • <strong>Google Sign-In:</strong> รองรับบัญชี Google Workspace เทศบาล
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onOpenOfficerLogin && (
            <button
              onClick={onOpenOfficerLogin}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-8 py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบเจ้าหน้าที่ (Officer Login)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Officer Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              มุมมองเจ้าหน้าที่ผู้ปฏิบัติงาน (Officer Portal)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
              👤 เจ้าหน้าที่: {currentOfficer?.name || 'เจ้าหน้าที่'} ({currentOfficer?.email || '-'})
            </span>
            {officerRole === 'admin' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                👑 สิทธิ์ปัจจุบัน: ผู้ดูแลระบบ (Admin)
                <button
                  onClick={() => switchOfficerRole('officer')}
                  className="ml-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-600 transition-colors cursor-pointer"
                  title="สลับสิทธิ์เป็นเจ้าหน้าที่ทั่วไป"
                >
                  สลับเป็น Officer
                </button>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                👤 สิทธิ์ปัจจุบัน: เจ้าหน้าที่ทั่วไป (Officer)
                <button
                  onClick={() => {
                    setPendingReportAction(null);
                    setShowAdminAuthModal(true);
                  }}
                  className="ml-1 text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded transition-colors shadow-xs cursor-pointer"
                  title="ยกระดับเป็น Admin เพื่อจัดทำรายงาน"
                >
                  🔑 ยกระดับเป็น Admin
                </button>
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            ระบบบริหารจัดการคำร้องและงานสารบรรณ
          </h2>
          <p className="text-xs text-slate-300">
            เข้าสู่ระบบโดย: {currentOfficer.name} ({currentOfficer.department || 'ฝ่ายบริการสารบรรณ'})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAdminVerification()}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-amber-300"
            title="ศูนย์ตรวจสอบและกลั่นกรองคำร้องสำหรับ Admin (5-Pillar Admin Verification & Audit Center)"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>🛡️ ตรวจสอบคำร้อง (Admin Audit) {officerRole !== 'admin' && '🔒'}</span>
          </button>

          <button
            onClick={() => {
              setApprovalSelectedReqId(null);
              setShowApprovalPortalModal(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-emerald-400/30"
            title="เปิดศูนย์อนุมัติคำร้องสำหรับผู้อนุมัติที่มีอำนาจพิจารณา"
          >
            <CheckSquare className="w-4 h-4 text-emerald-200" />
            <span>✅ ศูนย์อนุมัติคำร้อง (Approval Portal)</span>
            {pendingReview > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse ml-0.5">
                {pendingReview}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowApprovalHierarchyModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-700 to-blue-800 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer border border-indigo-400/30"
            title="ตั้งค่าผังลำดับชั้นการอนุมัติ (Sequential Routing Hierarchy) และดู Live Routing Path"
          >
            <GitMerge className="w-4 h-4 text-indigo-200" />
            <span>🌿 ลำดับชั้นการอนุมัติ (Approval Hierarchy)</span>
          </button>

          <button
            onClick={handleOpenApproversManagement}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-purple-400/40"
            title="จัดการรายชื่อผู้มีสิทธิ์อนุมัติ เพิ่ม/แก้ไขข้อมูล และกำหนดสิทธิ์การพิจารณาคำร้องเฉพาะทาง (Admin Only)"
          >
            <UserCheck className="w-4 h-4 text-purple-200" />
            <span>👥 ผู้มีสิทธิ์อนุมัติ & กำหนดสิทธิ์ {officerRole !== 'admin' && '🔒'}</span>
          </button>

          <button
            onClick={() => setShowAdminFolderModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-800 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-purple-400/40"
            title="คลังโฟลเดอร์เก็บข้อมูลแบ่งเป็นคำร้อง และโฟลเดอร์รายงานการทำความสะอาดกล้อง/ตรวจเช็คอุปกรณ์กล้อง (Admin Archive & Inspection Reports)"
          >
            <Folder className="w-4 h-4 text-purple-200 fill-purple-300/30" />
            <span>📁 คลังโฟลเดอร์คำร้อง & รายงานตรวจเช็คกล้อง {officerRole !== 'admin' && '🔒'}</span>
          </button>

          <button
            onClick={handleOpenCctvCameraCsvUpload}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-800 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-blue-400/40"
            title="อัปโหลดไฟล์ CSV กล้อง CCTV เพื่อแปลงและจัดโครงสร้างคอลัมน์มาตรฐาน (จุดติดตั้งตู้ครบคุม, รหัสสินทรัพย์, สถานะ ฯลฯ) สู่ระบบและ Firestore"
          >
            <Camera className="w-4 h-4 text-sky-200" />
            <span>📷 นำเข้ากล้อง CCTV (CSV) {officerRole !== 'admin' && '🔒'}</span>
          </button>

          <button
            onClick={handleOpenCctvCsvUpload}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-700 via-indigo-700 to-blue-800 hover:from-sky-600 hover:to-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-sky-400/40"
            title="อัปโหลดไฟล์ CSV เพื่ออัปเดตทะเบียนครุภัณฑ์ CCTV สู่ Cloud Firestore แบบกลุ่ม (Admin Bulk Update)"
          >
            <UploadCloud className="w-4 h-4 text-sky-200" />
            <span>📤 นำเข้าครุภัณฑ์ CSV (Firestore) {officerRole !== 'admin' && '🔒'}</span>
          </button>

          <button
            onClick={() => setShowArchivesModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-900 via-slate-800 to-indigo-950 hover:from-indigo-800 hover:to-slate-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-indigo-400/40"
            title="คลังจัดเก็บคำร้องเก่าใน Firestore (Archive Collection) สำหรับคำร้องที่ดำเนินการเสร็จสิ้นเกิน 90 วัน เพื่อรักษาความเร็วระบบ"
          >
            <Archive className="w-4 h-4 text-indigo-300" />
            <span>📦 คลังจัดเก็บคำร้องเก่า (&gt;90 วัน)</span>
            {eligibleArchiveCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {eligibleArchiveCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowNewRequestModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all scale-102 cursor-pointer"
            title="บันทึกคำร้องใหม่กรณี Walk-in, รับโทรศัพท์ หรือลงรับหนังสือสารบรรณ"
          >
            <Plus className="w-4 h-4 text-emerald-200 font-bold" />
            ➕ ลงรับคำร้องใหม่ / เพิ่มข้อมูล
          </button>

          <button
            onClick={() => {
              setOfficerViewSection('analytics');
              setTimeout(() => {
                const el = document.getElementById('officer-request-analytics-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-indigo-300/40"
            title="เปิดส่วนวิเคราะห์ข้อมูลคำร้อง (Request Analytics) ด้วย Recharts"
          >
            <TrendingUp className="w-4 h-4 text-cyan-200" />
            <span>📊 วิเคราะห์คำร้อง (Request Analytics)</span>
          </button>

          <button
            onClick={handleOpenReportCenter}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            title="ศูนย์จัดทำรายงานสรุปผู้บริหาร พิมพ์รายงานทางราชการ และวิเคราะห์สถิติ (เฉพาะ Admin)"
          >
            <BarChart3 className="w-4 h-4 text-blue-200" />
            📊 ศูนย์จัดทำรายงานสรุป (Report Center) {officerRole !== 'admin' && '🔒'}
          </button>

          <button
            onClick={() => setShowGoogleFormsModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-purple-400/40"
            title="ศูนย์จัดการ Google Forms แบบฟอร์มคำร้องออนไลน์ และแบบประเมินความพึงพอใจประชาชน"
          >
            <ClipboardList className="w-4 h-4 text-purple-200" />
            <span>📝 ศูนย์ Google Forms & แบบประเมิน</span>
          </button>

          <button
            onClick={() => setShowPermissionsModal(true)}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
            title="กำหนดสิทธิ์หมวดหมู่คำร้องและข้อจำกัดไฟล์จำแนกตามกลุ่มผู้ยื่นคำร้อง"
          >
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            กำหนดสิทธิ์ผู้ยื่น
          </button>

          <button
            id="officer-portal-test-sms-btn"
            onClick={() => {
              setTestSmsTargetReq(selectedReq || (requests.length > 0 ? requests[0] : null));
              setShowTestSmsModal(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition-all scale-102 cursor-pointer active:scale-95 border border-emerald-400/40"
            title="ทดสอบส่งข้อความ SMS แจ้งเตือนสถานะคำร้องไปยังเบอร์มือถือประชาชนโดยตรง (Smart SMS Gateway)"
          >
            <Smartphone className="w-4 h-4 text-emerald-200" />
            <span>📱 ทดสอบส่ง SMS (Test SMS)</span>
          </button>

          <button
            id="officer-portal-sms-templates-btn"
            onClick={() => setShowSmsTemplateModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition-all scale-102 cursor-pointer active:scale-95 border border-amber-400/40"
            title="ปรับแต่งเทมเพลตข้อความ SMS แจ้งเตือนสถานะคำร้องอัตโนมัติด้วยตัวแปร Placeholders (เช่น {TRACKING_ID}, {APPLICANT_NAME})"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-200" />
            <span>⚙️ ปรับแต่งเทมเพลต SMS (Templates)</span>
          </button>

          <button
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
            title="ดูประวัติการส่ง SMS และอีเมลแจ้งเตือนประชาชน"
          >
            <div className="flex items-center gap-1 text-emerald-400">
              <Smartphone className="w-4 h-4" />
              <Mail className="w-4 h-4" />
            </div>
            ประวัติแจ้งเตือน SMS & Email
          </button>

          <button
            onClick={() => setShowPendingSummaryPdfModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            title="พิมพ์รายงานสรุปรายการคำร้องคงค้างรอดำเนินการประจำวัน (Bulk Pending Summary PDF)"
          >
            <Printer className="w-4 h-4 text-amber-200" />
            🖨️ พิมพ์สรุปคำร้องคงค้าง (Pending PDF)
          </button>

          <button
            onClick={handleExportIncidentTrendsCsv}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 border border-teal-400/40"
            title="ส่งออกรายงาน CSV ข้อมูลเชิงลึกสำหรับวิเคราะห์แนวโน้มเหตุการณ์ (Incident Trends & Locations Analytics) รองรับการเปิดใน Excel/BI แบบ Offline"
          >
            <BarChart3 className="w-4 h-4 text-cyan-200" />
            <span>📈 ส่งออก CSV วิเคราะห์แนวโน้ม</span>
          </button>

          <button
            id="btn-officer-export-excel-topbar"
            onClick={handleOpenCctvExcelExportModal}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-emerald-400/50"
            title="ส่งออกรายงานคำร้องขอดูภาพกล้องวงจรปิด CCTV ที่กรองเป็นไฟล์ Excel (.xlsx) หรือ CSV สำหรับรายงานราชการ"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>📊 Export to Excel (CCTV)</span>
            <span className="bg-emerald-950/40 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {filteredRequests.filter(r => r.category === 'cctv').length > 0 ? filteredRequests.filter(r => r.category === 'cctv').length : filteredRequests.length}
            </span>
          </button>

          <button
            onClick={() => setShowMonthlyCsvModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all scale-102 cursor-pointer active:scale-95 border border-emerald-400/50"
            title="ส่งออกรายงานคำร้องขอดูภาพกล้อง CCTV ประจำเดือน เป็นไฟล์ CSV สำหรับสรุปรายงานราชการประจำเดือนและจัดเก็บสถิติสารบรรณ"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>📅 ส่งออก CSV ประจำเดือน</span>
          </button>

          <button
            onClick={() => setShowQuarterlyExportModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
            title="ดาวน์โหลดรายงานสรุปคำร้องขอดูภาพกล้อง CCTV ประจำไตรมาส เป็นไฟล์ CSV สำหรับผู้บริหารและสรุปภาระงาน"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            📊 CSV รายงานไตรมาส
          </button>

          <button
            onClick={handleQuickCsvExport}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 border border-slate-700"
            title="ส่งออกรายงานสรุปคำร้อง CCTV ทั้งหมดเป็นไฟล์ CSV สำหรับการวิเคราะห์แบบ Offline"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            📥 ส่งออก CSV (ทั่วไป)
          </button>
        </div>
      </div>


      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Bulk Status Toast Notification Banner */}
      {bulkToastNotification && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4.5 rounded-2xl shadow-xl border-2 border-emerald-500/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
              <MailCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  อัปเดตสถานะคำร้องแบบกลุ่มสำเร็จ!
                </span>
                <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-xs">
                  {bulkToastNotification.count} รายการ
                </span>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  สถานะใหม่: {bulkToastNotification.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                ระบบทำการบันทึกประวัติสถานะและ <strong className="text-amber-300">ร่างอีเมลยืนยันส่งถึงผู้ยื่นคำร้อง {bulkToastNotification.emailsSent} ฉบับ</strong> เรียบร้อยแล้ว ณ เวลา {bulkToastNotification.timestamp}
              </p>
              
              {/* Request ID badges preview */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {bulkToastNotification.drafts.slice(0, 5).map(d => (
                  <span key={d.requestId} className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-800/90 text-blue-200 border border-slate-700 px-2 py-0.5 rounded-md">
                    <Mail className="w-3 h-3 text-emerald-400" />
                    {d.requestId} ({d.recipientName})
                  </span>
                ))}
                {bulkToastNotification.drafts.length > 5 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{bulkToastNotification.drafts.length - 5} รายการ
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setShowEmailDraftsModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-slate-950" />
              📧 ดูร่างอีเมลยืนยัน ({bulkToastNotification.drafts.length} ฉบับ)
            </button>

            <button
              type="button"
              onClick={() => setBulkToastNotification(null)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`bg-white p-4 rounded-xl border text-slate-800 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'all' ? 'ring-2 ring-blue-500 border-blue-400' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-slate-500 block font-medium">คำร้องทั้งหมด</span>
          <span className="text-xl font-bold text-slate-900">{totalCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('submitted')}
          className={`bg-amber-50/60 p-4 rounded-xl border text-amber-900 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'submitted' || statusFilter === 'under_review' ? 'ring-2 ring-amber-500 border-amber-400' : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[11px] text-amber-800 block font-medium">รอดำเนินการ</span>
          <span className="text-xl font-bold text-amber-900">{pendingReview}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('action_required')}
          className={`bg-purple-50/60 p-4 rounded-xl border text-purple-900 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'action_required' ? 'ring-2 ring-purple-500 border-purple-400' : 'border-purple-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[11px] text-purple-800 block font-medium">รอแก้ไข/เพิ่มเอกสาร</span>
          <span className="text-xl font-bold text-purple-900">{actionRequired}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`bg-emerald-50/60 p-4 rounded-xl border text-emerald-900 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'approved' || statusFilter === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] text-emerald-800 block font-medium">อนุมัติแล้ว/เสร็จสิ้น</span>
          <span className="text-xl font-bold text-emerald-900">{approvedCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`bg-rose-50/60 p-4 rounded-xl border text-rose-900 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'rejected' ? 'ring-2 ring-rose-500 border-rose-400' : 'border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[11px] text-rose-800 block font-medium">ไม่อนุมัติ</span>
          <span className="text-xl font-bold text-rose-900">{rejectedCount}</span>
        </div>
      </div>

      {/* View Switcher: Requests Table vs Request Analytics vs All Views */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 ml-1 mr-1 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            มุมมองการทำงาน:
          </span>
          <button
            onClick={() => setOfficerViewSection('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              officerViewSection === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
            <span>📊 Request Analytics (วิเคราะห์คำร้อง & SLA)</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">Recharts</span>
          </button>
          <button
            onClick={() => setOfficerViewSection('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
              officerViewSection === 'requests'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>📋 รายการคำร้องและสารบรรณ ({filteredRequests.length})</span>
          </button>
          <button
            onClick={() => setOfficerViewSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              officerViewSection === 'all'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📑 แสดงแดชบอร์ดทั้งหมด
          </button>
        </div>

        <div className="text-xs text-slate-500 mr-2 flex items-center gap-2">
          <span>คำร้องในระบบ: <strong className="text-slate-800">{totalCount}</strong> เรื่อง</span>
        </div>
      </div>

      {/* Primary Request Analytics Section with Recharts (Submission Trends, Category Distribution, Average Response Times) */}
      {(officerViewSection === 'analytics' || officerViewSection === 'all') && (
        <RequestAnalyticsCard 
          requests={requests}
          onSelectStatusFilter={(status) => setStatusFilter(status)}
          onSelectCategoryFilter={(category) => setCategoryFilter(category)}
          onSelectPriorityFilter={(priority) => setPriorityFilter(priority)}
          currentStatusFilter={statusFilter}
          currentCategoryFilter={categoryFilter}
          currentPriorityFilter={priorityFilter}
          initialStartDate={startDate}
          initialEndDate={endDate}
          onDateRangeChange={(rangeType, sDate, eDate) => {
            if (rangeType === 'custom' && sDate && eDate) {
              setStartDate(sDate);
              setEndDate(eDate);
            } else if (rangeType === 'today') {
              handlePresetDate(0);
            } else if (rangeType === '7days') {
              handlePresetDate(7);
            } else if (rangeType === '30days') {
              handlePresetDate(30);
            } else if (rangeType === 'current_month') {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setStartDate(getFormattedDateStr(firstDay));
              setEndDate(getFormattedDateStr(lastDay));
            } else if (rangeType === 'last_month') {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
              setStartDate(getFormattedDateStr(firstDay));
              setEndDate(getFormattedDateStr(lastDay));
            } else if (rangeType === 'all') {
              setStartDate('');
              setEndDate('');
            }
          }}
          onExportData={(exportedList, format) => {
            setSuccessMsg(`📤 ส่งออกรายงานคำร้องสำเร็จ (${exportedList.length} รายการ) รูปแบบ ${format.toUpperCase()}`);
            setTimeout(() => setSuccessMsg(null), 5000);
          }}
          onViewRequestDetail={(req) => {
            setSelectedReq(req);
            setShowDetailModalReq(req);
          }}
          onOpenActionModal={(req) => {
            openActionModal(req);
          }}
          onNavigateToTable={() => {
            setOfficerViewSection('requests');
            setTimeout(() => {
              const el = document.getElementById('requests-table-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      )}

      {/* Additional Analytics Dashboards in All View */}
      {officerViewSection === 'all' && (
        <>
          {/* Executive Summary Dashboard with Average Response Time and Requests Resolved per Month */}
          <OfficerSummaryDashboard
            requests={requests}
            onSelectStatusFilter={(status) => setStatusFilter(status)}
            onSelectCategoryFilter={(category) => {
              setCategoryFilter(category);
            }}
            onSelectPriorityFilter={(priority) => setPriorityFilter(priority)}
          />

          {/* Dashboard Stats with Recharts (Category & Monthly Analysis) */}
          <OfficerDashboardStats 
            requests={requests}
            onSelectStatusFilter={(status) => setStatusFilter(status)}
          />

          {/* Simple Status Summary Widget */}
          <SimpleStatusWidget requests={requests} />

          {/* Prominent Donut Breakdown Dashboard Card */}
          <OfficerDonutDashboardCard
            requests={requests}
            onSelectStatusFilter={(status) => setStatusFilter(status)}
            currentStatusFilter={statusFilter}
          />
        </>
      )}

      {/* Filter and Search Table */}
      <div id="requests-table-section" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
        {/* Active Filter Strip if filters are set */}
        {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || topicFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                กำลังกรองตารางตาม:
              </span>

              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-blue-300 text-blue-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  หมวดหมู่: {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')} className="hover:text-rose-600 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  สถานะ: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-rose-600 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {priorityFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-rose-300 text-rose-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  ความเร่งด่วน: {priorityFilter}
                  <button onClick={() => setPriorityFilter('all')} className="hover:text-rose-600 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  ค้นหา: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-rose-600 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setPriorityFilter('all');
                setTopicFilter('all');
                setSearchTerm('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer transition-colors"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="ค้นหา Tracking ID, ชื่อผู้ยื่น หรือหน่วยงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">กรองสถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
            >
              <option value="all">สถานะทั้งหมด ({totalCount})</option>
              <option value="submitted">ยื่นคำร้องแล้ว</option>
              <option value="under_review">อยู่ระหว่างตรวจสอบ</option>
              <option value="action_required">ต้องการข้อมูลเพิ่มเติม</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="completed">ดำเนินการเสร็จสิ้น</option>
            </select>

            <span className="text-slate-500 font-medium ml-1">หมวดหมู่:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-800"
              title="กรองตามหมวดหมู่คำร้อง"
            >
              <option value="all">ทุกหมวดหมู่ (All)</option>
              <option value="cctv">กล้องวงจรปิด CCTV</option>
              <option value="certificate">หนังสือรับรองราชการ</option>
              <option value="maintenance">แจ้งซ่อมบำรุง/อุปกรณ์</option>
              <option value="leave">การลา/ปฏิบัติราชการ</option>
              <option value="budget">ขออนุมัติงบประมาณ</option>
              <option value="general">คำร้องทั่วไป/บริการอื่น</option>
            </select>

            <span className="text-slate-500 font-medium ml-1">ความเร่งด่วน:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-800"
              title="กรองตามระดับความเร่งด่วน"
            >
              <option value="all">ทุกความเร่งด่วน</option>
              <option value="low">🟢 ต่ำ (Low)</option>
              <option value="medium">🔵 ปานกลาง (Medium)</option>
              <option value="high">⚡ สูง (High)</option>
              <option value="urgent">🔥 ด่วนที่สุด (Urgent)</option>
            </select>

            <span className="text-slate-500 font-medium ml-1">🤖 AI Auto-Tag:</span>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="px-3 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/70 text-indigo-950 font-bold"
              title="กรองตามหมวดหมู่แท็กที่ AI วิเคราะห์และติดให้อัตโนมัติ"
            >
              <option value="all">ทุกหมวดหมู่ AI Auto-Tags</option>
              <option value="Maintenance">🔧 Maintenance (แจ้งซ่อม/บำรุงรักษา)</option>
              <option value="Access Request">🔑 Access Request (ขอคัดสำเนา/ภาพ)</option>
              <option value="Privacy Concern">🛡️ Privacy Concern (ความเป็นส่วนตัว/PDPA)</option>
              <option value="Traffic & Safety">🚗 Traffic & Safety (จราจร/ความปลอดภัย)</option>
              <option value="Property Damage / Theft">📦 Property Damage / Theft (ทรัพย์สินสูญหาย/ลักทรัพย์)</option>
              <option value="General Inquiry">❓ General Inquiry (สอบถามทั่วไป)</option>
            </select>

            <span className="text-slate-500 font-medium ml-1">เรียงลำดับ:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'title')}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-800"
              title="เรียงลำดับคำร้อง"
            >
              <option value="newest">🕒 ล่าสุดไปเก่าสุด (Newest First)</option>
              <option value="oldest">⌛ เก่าสุดไปล่าสุด (Oldest First)</option>
              <option value="title">🔤 ตามหัวข้อคำร้อง (Alphabetical by Title)</option>
            </select>

            <button
              onClick={handleOpenMonthlyReport}
              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm ml-1 cursor-pointer"
              title="สร้างรายงานสรุปดัชนีวัดผลประจำเดือน (Monthly Executive KPI Report) - สิทธิ์เฉพาะ Admin"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              รายงานประจำเดือน {officerRole !== 'admin' && '🔒'}
            </button>

            <button
              onClick={handleOpenPdfReport}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              title="พิมพ์รายงานสรุปทางราชการ / พรีวิวตารางรายงานพร้อมพิมพ์สำหรับรายการที่กรอง"
            >
              <Printer className="w-3.5 h-3.5 text-blue-100" />
              🖨️ พิมพ์รายงานสรุป ({selectedRequestIds.length > 0 ? selectedRequestIds.length : filteredRequests.length})
            </button>

            <button
              onClick={handleExportIncidentTrendsCsv}
              className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95 border border-teal-500/50"
              title="ส่งออกรายงาน CSV สำหรับวิเคราะห์แนวโน้มเหตุการณ์ (Incident Trends Analysis) พร้อมข้อมูลไตรมาส พิกัด และ SLA"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-200" />
              📈 CSV วิเคราะห์แนวโน้ม ({selectedRequestIds.length > 0 ? selectedRequestIds.length : filteredRequests.length})
            </button>

            <button
              onClick={() => setShowMonthlyCsvModal(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95 border border-emerald-500/50"
              title="ส่งออกรายงานสรุปคำร้อง CCTV ประจำเดือน (Monthly CSV Report) สำหรับงานสารบรรณและการจัดเก็บสถิติ"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-200" />
              📅 CSV รายงานประจำเดือน
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="btn-toolbar-export-excel"
                onClick={handleExportFilteredExcel}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 border border-emerald-400/40"
                title="ส่งออกรายการคำร้อง CCTV ในตารางเป็นไฟล์ Microsoft Excel (.xlsx) ที่จัดรูปแบบสีและหัวตารางสวยงาม"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Export to Excel ({filteredRequests.filter(r => r.category === 'cctv').length > 0 ? filteredRequests.filter(r => r.category === 'cctv').length : filteredRequests.length})</span>
              </button>

              <button
                type="button"
                id="btn-toolbar-export-modal"
                onClick={handleOpenCctvExcelExportModal}
                className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 border border-emerald-400/40"
                title="เปิดหน้าต่างปรับแต่งและเลือกรูปแบบการส่งออก Excel & CSV สำหรับคำร้อง CCTV"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-200" />
                <span>ตั้งค่า</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-toolbar-export-csv"
              onClick={handleExportFilteredCsv}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 border border-blue-400/40"
              title="ส่งออกรายการคำร้อง CCTV ในตารางเป็นไฟล์ CSV มาตรฐานรองรับภาษาไทย UTF-8"
            >
              <FileText className="w-3.5 h-3.5 text-blue-100" />
              <span>ส่งออก CSV ที่กรอง ({filteredRequests.length})</span>
            </button>

            <button
              type="button"
              id="btn-toolbar-export-options"
              onClick={handleExecuteExportCSV}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="เปิดตัวเลือกการส่งออกขั้นสูง (เลือกช่วงข้อมูล, ส่งออกแนวโน้ม, SLA)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ตัวเลือก Export</span>
            </button>
          </div>
        </div>

        {/* Date Range Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              กรองตามช่วงวันที่ยื่นคำร้อง:
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

            {/* Quick Preset Buttons */}
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

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            <div className="text-slate-600 font-medium text-[11px] flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>พบคำร้องตามเงื่อนไข:</span>
              <strong className="text-blue-700 font-extrabold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-xs">
                {filteredRequests.length}
              </strong>
              <span className="text-slate-400">/ {totalCount} รายการ</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 hidden md:inline">ส่งออกที่กรอง:</span>
              <button
                type="button"
                id="btn-quick-filter-excel"
                onClick={handleExportFilteredExcel}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                title={`ส่งออกรายการที่กรอง (${filteredRequests.length} รายการ) เป็นไฟล์ Microsoft Excel (.xlsx)`}
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-200" />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                id="btn-quick-filter-csv"
                onClick={handleExportFilteredCsv}
                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                title={`ส่งออกรายการที่กรอง (${filteredRequests.length} รายการ) เป็นไฟล์ CSV (.csv)`}
              >
                <FileText className="w-3 h-3 text-blue-200" />
                <span>CSV (.csv)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Bulk Status Action Bar */}
        {selectedRequestIds.length > 0 && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3.5 px-4 rounded-2xl shadow-lg border border-blue-600/70 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center justify-center font-bold shadow-inner">
                <ListChecks className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-2">
                  <span className="text-white">เลือกคำร้องสำหรับดำเนินการแบบกลุ่ม:</span>
                  <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-xs shadow-xs animate-pulse">
                    {selectedRequestIds.length} รายการ
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/90">
                  สามารถปรับสถานะพร้อมกัน ส่งการแจ้งเตือน หรือส่งออกข้อมูลแบบกลุ่มได้ทันที
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap relative">
              {/* Dropdown Menu Trigger for Bulk Status */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBulkStatusDropdown(!showBulkStatusDropdown)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-amber-300"
                >
                  <Layers className="w-4 h-4 text-slate-950" />
                  <span>⚡ ปรับเปลี่ยนสถานะ ({selectedRequestIds.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBulkStatusDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Bulk Status Dropdown Menu Popover */}
                {showBulkStatusDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-blue-600" />
                        <span>เลือกสถานะเป้าหมายที่ต้องการปรับ:</span>
                      </div>
                      <div className="text-[10px] text-slate-500">จะเปิดหน้าต่างยืนยันและร่างการแจ้งเตือน</div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('under_review')}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-amber-900 text-xs">อยู่ระหว่างตรวจสอบ (Under Review)</div>
                          <div className="text-[10px] text-slate-500">เริ่มตรวจเอกสารและข้อมูลกล้อง CCTV</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('action_required')}
                        className="w-full text-left p-2 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-purple-900 text-xs">ต้องการข้อมูลเพิ่มเติม (Action Required)</div>
                          <div className="text-[10px] text-slate-500">แจ้งขอเอกสาร/หลักฐานประกอบเพิ่มเติม</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('approved')}
                        className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-900 text-xs">อนุมัติแล้ว (Approved)</div>
                          <div className="text-[10px] text-slate-500">อนุมัติคำร้อง พร้อมนัดหมายรับไฟล์ภาพ</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('completed')}
                        className="w-full text-left p-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-900 text-xs">ดำเนินการเสร็จสิ้น (Completed)</div>
                          <div className="text-[10px] text-slate-500">ส่งมอบภาพและปิดงานคำร้องสมบูรณ์</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('rejected')}
                        className="w-full text-left p-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-2.5 cursor-pointer group"
                      >
                        <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-rose-900 text-xs">ไม่อนุมัติ (Rejected)</div>
                          <div className="text-[10px] text-slate-500">ปฏิเสธคำร้องพร้อมระบุเหตุผลข้อเท็จจริง</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenBulkModal('submitted')}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2.5 cursor-pointer group border-t border-slate-100 pt-2 mt-1"
                      >
                        <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-700 text-xs">รอการตรวจสอบ (Submitted)</div>
                          <div className="text-[10px] text-slate-500">ปรับสถานะย้อนกลับเป็นเรื่องรับใหม่</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Direct Status Buttons for under_review and completed */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDirectQuickBulkStatusUpdate('under_review')}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="ปรับเปลี่ยนสถานะที่เลือกทั้งหมดเป็น 'อยู่ระหว่างตรวจสอบ' ทันที"
                >
                  <span>🟡 ปรับเป็น Under Review ({selectedRequestIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectQuickBulkStatusUpdate('completed')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="ปรับเปลี่ยนสถานะที่เลือกทั้งหมดเป็น 'เสร็จสิ้น' ทันที"
                >
                  <span>🔵 ปรับเป็น Completed ({selectedRequestIds.length})</span>
                </button>
              </div>

              {/* Quick Status Pills */}
              <div className="hidden xl:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenBulkModal('action_required')}
                  className="px-2.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  title="ปรับเปลี่ยนเป็น ต้องการข้อมูลเพิ่มเติม"
                >
                  🟣 ขอเอกสารเพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenBulkModal('approved')}
                  className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  title="ปรับเปลี่ยนเป็น อนุมัติแล้ว"
                >
                  🟢 อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenBulkModal('rejected')}
                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                  title="ปรับเปลี่ยนเป็น ไม่อนุมัติ"
                >
                  🔴 ไม่อนุมัติ
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700 hidden sm:block" />

              {/* Google Docs Export for Selected Items */}
              <button
                type="button"
                onClick={handleExportBulkGoogleDocs}
                disabled={isGeneratingGoogleDocs}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-blue-400/40"
                title="สร้างเอกสารสรุปบันทึกข้อความราชการใน Google Docs สำหรับรายการที่เลือก"
              >
                <FileText className="w-3.5 h-3.5 text-blue-200" />
                <span>{isGeneratingGoogleDocs ? 'กำลังสร้าง Docs...' : `สร้าง Google Docs (${selectedRequestIds.length})`}</span>
              </button>

              {/* Quick Excel Export for Selected Items */}
              <button
                type="button"
                id="btn-bulk-export-excel"
                onClick={() => {
                  const listToExport = requests.filter(r => selectedRequestIds.includes(r.id));
                  exportRequestsToExcel(listToExport, 'รายงานคำร้อง_CCTV_Selected_Excel', {
                    filterSummary: getActiveFilterSummary()
                  });
                  setSuccessMsg(`📊 ส่งออกข้อมูลคำร้องที่เลือก ${listToExport.length} รายการเป็นไฟล์ Excel (.xlsx) เรียบร้อยแล้ว`);
                  setTimeout(() => setSuccessMsg(null), 4000);
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-emerald-400/40"
                title="ส่งออกเฉพาะรายการที่เลือกเป็นไฟล์ Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Excel ที่เลือก ({selectedRequestIds.length})</span>
              </button>

              {/* Quick CSV Export for Selected Items */}
              <button
                type="button"
                id="btn-bulk-export-csv"
                onClick={handleQuickCsvExport}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border border-emerald-400/40"
                title="ส่งออกเฉพาะรายการที่เลือกเป็นไฟล์ CSV สำหรับการวิเคราะห์"
              >
                <Download className="w-3.5 h-3.5 text-emerald-100" />
                <span>CSV ที่เลือก ({selectedRequestIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-white px-2.5 py-1.5 text-xs font-medium underline transition-colors cursor-pointer"
              >
                ล้างการเลือก
              </button>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 w-12 text-center relative">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={filteredRequests.length > 0 && filteredRequests.every(r => selectedRequestIds.includes(r.id))}
                      onChange={() => handleSelectAllFiltered(filteredRequests)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="เลือกทั้งหมด / ยกเลิกทั้งหมด"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSelectionHelperMenu(!showSelectionHelperMenu)}
                      className="text-slate-500 hover:text-blue-700 p-0.5 rounded hover:bg-slate-200 cursor-pointer"
                      title="เมนูตัวช่วยเลือกคำร้องแบบรวดเร็ว"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Selection Helper Popover Menu */}
                  {showSelectionHelperMenu && (
                    <div className="absolute left-2 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-slate-800 text-left font-normal animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        ตัวช่วยเลือกคำร้อง (Selection Preset)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectAllFiltered(filteredRequests)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between"
                      >
                        <span>เลือกทั้งหมดในหน้านี้</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">{filteredRequests.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectByStatus(['submitted'])}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center justify-between"
                      >
                        <span>⏳ รอการตรวจสอบ</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                          {filteredRequests.filter(r => r.status === 'submitted').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectByStatus(['under_review'])}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-xs font-medium text-amber-900 flex items-center justify-between"
                      >
                        <span>🟡 อยู่ระหว่างตรวจสอบ</span>
                        <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono">
                          {filteredRequests.filter(r => r.status === 'under_review').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectByStatus(['action_required'])}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-xs font-medium text-purple-900 flex items-center justify-between"
                      >
                        <span>🟣 ต้องการข้อมูลเพิ่ม</span>
                        <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded text-purple-800 font-mono">
                          {filteredRequests.filter(r => r.status === 'action_required').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectByStatus(['approved'])}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-xs font-medium text-emerald-900 flex items-center justify-between"
                      >
                        <span>🟢 อนุมัติแล้ว</span>
                        <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono">
                          {filteredRequests.filter(r => r.status === 'approved').length}
                        </span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={handleSelectUrgent}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-xs font-semibold text-rose-700 flex items-center justify-between"
                      >
                        <span>🔥 เลือกเฉพาะรายการด่วน/ด่วนที่สุด</span>
                        <span className="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded text-rose-800 font-mono">
                          {filteredRequests.filter(r => r.priority === 'urgent' || r.priority === 'very_urgent' || r.priority === 'high').length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectPendingPreReview}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-xs font-medium text-indigo-700 flex items-center justify-between"
                      >
                        <span>🔍 รอการตรวจสภาพเบื้องต้น</span>
                        <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-800 font-mono">
                          {filteredRequests.filter(r => !r.preReviewCheck || r.preReviewCheck.resultStatus !== 'passed').length}
                        </span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={handleInvertFilteredSelection}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        ⇄ สลับการเลือก (Invert)
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-xs font-medium text-rose-600"
                      >
                        ✕ ล้างการเลือกทั้งหมด
                      </button>
                    </div>
                  )}
                </th>
                <th className="p-3">Tracking ID</th>
                <th className="p-3">หัวข้อคำร้อง</th>
                <th className="p-3">ผู้ยื่นเรื่อง</th>
                <th className="p-3">หน่วยงาน</th>
                <th className="p-3">ความเร่งด่วน</th>
                <th className="p-3">วันที่ยื่น</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req, index) => {
                const isSelected = selectedRequestIds.includes(req.id);
                return (
                  <tr 
                    key={req.id} 
                    className={`transition-colors ${isSelected ? 'bg-blue-50/90 border-l-4 border-l-blue-600 font-medium' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectRequest(req.id, index, e)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title="กด Shift+คลิก เพื่อเลือกแบบช่วง (Range select)"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {req.id}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 max-w-xs space-y-1">
                      <div className="truncate font-bold text-slate-900">{req.title}</div>
                      {req.aiAutoTags?.topics && req.aiAutoTags.topics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {req.aiAutoTags.topics.map((t) => (
                            <AiTopicBadge key={t} topic={t} size="sm" isPrimary={t === req.aiAutoTags?.primaryTopic} />
                          ))}
                        </div>
                      )}
                      {req.internalNotes && (
                        <div 
                          className="flex items-center gap-1.5 text-[10px] text-amber-950 bg-amber-50 border border-amber-300/80 px-2 py-0.5 rounded-md w-fit max-w-[280px]"
                          title={`บันทึกภายในสำหรับเจ้าหน้าที่: ${req.internalNotes}`}
                        >
                          <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                          <span className="font-bold text-amber-800 shrink-0">โน้ตภายใน:</span>
                          <span className="truncate text-slate-700 italic">{req.internalNotes}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {req.applicant?.prefix || ''}{req.applicant?.fullName || 'ไม่ระบุชื่อ'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {req.applicant?.department || '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 ${getPriorityBadgeColor(req.priority)}`}>
                        {req.priority === 'urgent' || req.priority === 'very_urgent' ? '🔥 ' : req.priority === 'high' ? '⚡ ' : req.priority === 'medium' || req.priority === 'normal' ? '🔵 ' : '🟢 '}
                        {getPriorityLabelTh(req.priority)}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="p-3 whitespace-nowrap space-y-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold block w-fit ${getStatusBadgeColor(req.status)}`}>
                        {getStatusLabelTh(req.status)}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {req.adminAudit ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-800 border border-amber-400 inline-flex items-center gap-0.5 w-fit">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            🛡️ Admin ตรวจแล้ว
                          </span>
                        ) : req.preReviewCheck ? (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border inline-flex items-center gap-0.5 w-fit ${
                            req.preReviewCheck.resultStatus === 'passed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : req.preReviewCheck.resultStatus === 'pending_fix'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {req.preReviewCheck.resultStatus === 'passed' ? '✓ ตรวจเสนอแล้ว' : req.preReviewCheck.resultStatus === 'pending_fix' ? '⚠️ รอเอกสารเพิ่ม' : '✕ ตรวจไม่ผ่าน'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-block w-fit">
                            ⏳ รอตรวจเสนอ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenAdminVerification(req)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition-all shadow-sm text-xs cursor-pointer ${
                          req.adminAudit
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-400/50'
                        }`}
                        title="ตรวจสอบและกลั่นกรองคำร้องระดับ Admin (5-Pillar Admin Verification)"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{req.adminAudit ? 'ผลตรวจ Admin' : '🛡️ ตรวจสอบ (Admin)'}</span>
                      </button>
                      <button
                        onClick={() => setAppointmentModalReq(req)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors shadow-sm text-xs ${
                          req.appointment && req.appointment.status !== 'cancelled'
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title={req.appointment ? 'ดู/แก้ไขวันเวลานัดหมาย' : 'กำหนดวันเวลานัดหมาย'}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {req.appointment && req.appointment.status !== 'cancelled' ? `นัดหมาย: ${req.appointment.date}` : 'นัดหมาย'}
                      </button>
                      <button
                        onClick={() => setPrintDocReq(req)}
                        className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg font-semibold transition-colors shadow-sm text-xs"
                        title="พิมพ์ใบบันทึกคำร้อง / PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-300" />
                        พิมพ์ / Print
                      </button>
                      <button
                        onClick={() => openActionModal(req)}
                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-sm text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        พิจารณาคำร้อง
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action & Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-300 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="font-mono text-xs font-bold text-blue-600">{selectedReq.id}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadgeColor(selectedReq.status)}`}>
                    {getStatusLabelTh(selectedReq.status)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 ${getPriorityBadgeColor(selectedReq.priority)}`}>
                    {selectedReq.priority === 'urgent' || selectedReq.priority === 'very_urgent' ? '🔥 ' : selectedReq.priority === 'high' ? '⚡ ' : selectedReq.priority === 'medium' || selectedReq.priority === 'normal' ? '🔵 ' : '🟢 '}
                    ความเร่งด่วน: {getPriorityLabelTh(selectedReq.priority)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedReq.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportSingleRequestGoogleDoc(selectedReq)}
                  disabled={isGeneratingGoogleDocs}
                  className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-900 border border-blue-200 text-xs px-3 py-1.5 rounded-xl font-bold shadow-2xs transition-colors cursor-pointer"
                  title="สร้างบันทึกข้อความราชการใน Google Docs สำหรับคำร้องนี้"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  {isGeneratingGoogleDocs ? 'กำลังสร้าง...' : 'Google Docs'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModalReq(selectedReq)}
                  className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs px-3 py-1.5 rounded-xl font-bold shadow-2xs transition-colors cursor-pointer"
                  title="เปิดดูประวัติการดำเนินการ (Processing History) และบันทึกขั้นตอน"
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  ประวัติการดำเนินการ
                </button>
                <button
                  type="button"
                  onClick={() => setPrintDocReq(selectedReq)}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl font-semibold shadow transition-colors"
                  title="พิมพ์ใบบันทึกคำร้อง / PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-300" />
                  พิมพ์ / Print
                </button>
                <button
                  onClick={() => setSelectedReq(null)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Applicant Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
              <div><strong>ผู้ยื่น:</strong> {selectedReq.applicant?.prefix || ''}{selectedReq.applicant?.fullName || '-'}</div>
              <div><strong>หน่วยงาน:</strong> {selectedReq.applicant?.department || '-'}</div>
              <div className="flex items-center justify-between gap-1">
                <span><strong>โทร:</strong> {selectedReq.applicant?.phone || '-'}</span>
                <button
                  id="selected-req-test-sms-btn"
                  type="button"
                  onClick={() => {
                    setTestSmsTargetReq(selectedReq);
                    setShowTestSmsModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  title="ทดสอบส่ง SMS แจ้งเตือนสถานะไปยังเบอร์ผู้ยื่นคำร้องนี้"
                >
                  <Smartphone className="w-3 h-3 text-emerald-700" />
                  Test SMS
                </button>
              </div>
              <div><strong>อีเมล:</strong> {selectedReq.applicant?.email || '-'}</div>
            </div>

            {/* Private Internal Notes Display Card */}
            {selectedReq.internalNotes && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 p-3.5 rounded-xl text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    บันทึกข้อความภายในสถานะคำร้อง (Internal Notes)
                  </span>
                  <span className="text-[10px] bg-amber-200/90 text-amber-950 font-black px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-800" />
                    🔒 เฉพาะเจ้าหน้าที่เห็น (Internal Only)
                  </span>
                </div>
                <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 text-slate-800 leading-relaxed font-sans text-xs">
                  <p className="whitespace-pre-wrap">{selectedReq.internalNotes}</p>
                </div>
              </div>
            )}

            {/* Appointment Section for Officers */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  การนัดหมายวันเวลา-สถานที่ (Appointment)
                </span>
                <button
                  type="button"
                  onClick={() => setAppointmentModalReq(selectedReq)}
                  className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors font-bold"
                >
                  {selectedReq.appointment ? '✏️ แก้ไขการนัดหมาย' : '➕ กำหนดวันเวลานัดหมาย'}
                </button>
              </div>

              {selectedReq.appointment ? (
                <AppointmentCard
                  appointment={selectedReq.appointment}
                  requestId={selectedReq.id}
                  requestTitle={selectedReq.title}
                  applicantName={`${selectedReq.applicant?.prefix || ''}${selectedReq.applicant?.fullName || 'ผู้ยื่นคำร้อง'}`}
                  onEditAppointment={() => setAppointmentModalReq(selectedReq)}
                  isOfficer={true}
                />
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 italic flex items-center justify-between">
                  <span>ยังไม่ได้กำหนดวันเวลานัดหมายสำหรับคำร้องนี้</span>
                  <button
                    type="button"
                    onClick={() => setAppointmentModalReq(selectedReq)}
                    className="not-italic text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + คลิก เพื่อนัดหมาย
                  </button>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="text-xs space-y-1">
              <span className="font-bold text-slate-800">เหตุผลความจำเป็น:</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed document-font">
                {selectedReq.reason}
              </p>
            </div>

            {/* Pre-Review Inspection Section before Admin/Executive Proposal */}
            <div className="space-y-2.5 p-4 rounded-2xl border bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/70 border-indigo-200 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-2xs">
                    <ClipboardCheck className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">
                      การตรวจสอบคำร้องก่อนเสนอผู้บริหาร / Admin (Pre-Executive Review)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ตรวจสอบความถูกต้องของเอกสารหลักฐาน และไฟล์ภาพ CCTV ก่อนเสนอผู้บริหารอนุมัติ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreReviewModal(true)}
                  className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-1.5 active:scale-98"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>{selectedReq.preReviewCheck ? '✏️ แก้ไขผลการตรวจ' : '📋 ตรวจสอบคำร้องก่อนเสนอ'}</span>
                </button>
              </div>

              {selectedReq.preReviewCheck ? (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-2 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border flex items-center gap-1 ${
                        selectedReq.preReviewCheck.resultStatus === 'passed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : selectedReq.preReviewCheck.resultStatus === 'pending_fix'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {selectedReq.preReviewCheck.resultStatus === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {selectedReq.preReviewCheck.resultStatus === 'pending_fix' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                        {selectedReq.preReviewCheck.resultStatus === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                        {selectedReq.preReviewCheck.resultStatus === 'passed' ? '✓ ผ่านการตรวจสอบครบถ้วน' : selectedReq.preReviewCheck.resultStatus === 'pending_fix' ? '⚠️ รอแก้ไข/ขอเอกสารเพิ่ม' : '✕ ไม่ผ่านเกณฑ์'}
                      </span>

                      {selectedReq.preReviewCheck.forwardedToAdmin && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Send className="w-3 h-3 text-blue-600" />
                          ส่งเสนอผู้บริหาร/Admin แล้ว
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500">
                      ผู้ตรวจ: <strong className="text-slate-800 font-bold">{selectedReq.preReviewCheck.verifiedByOfficer}</strong> ({new Date(selectedReq.preReviewCheck.verifiedAt).toLocaleDateString('th-TH')})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] text-slate-700">
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.preReviewCheck.isIdentityVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      1. ยืนยันตัวตน {selectedReq.preReviewCheck.isIdentityVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.preReviewCheck.isReasonVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      2. ใบลด/บันทึกประจำวัน {selectedReq.preReviewCheck.isReasonVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.preReviewCheck.isLocationTimeVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      3. พิกัด-เวลา {selectedReq.preReviewCheck.isLocationTimeVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.preReviewCheck.isCctvFootageAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      4. ไฟล์ CCTV ต้นทาง {selectedReq.preReviewCheck.isCctvFootageAvailable ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.preReviewCheck.isPdpaConsentVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                      5. เงื่อนไข PDPA {selectedReq.preReviewCheck.isPdpaConsentVerified ? '✓' : '✕'}
                    </div>
                  </div>

                  {selectedReq.preReviewCheck.inspectionNote && (
                    <p className="bg-slate-50 p-2 rounded-lg text-slate-800 italic text-[11px] border border-slate-200">
                      "{selectedReq.preReviewCheck.inspectionNote}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    ยังไม่ได้ทำการตรวจสอบเอกสารและไฟล์ภาพ CCTV ก่อนเสนอผู้บริหาร
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPreReviewModal(true)}
                    className="text-[11px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-lg border border-amber-400 transition-colors shrink-0"
                  >
                    + คลิก เพื่อตรวจสอบ
                  </button>
                </div>
              )}
            </div>

            {/* Admin Verification & Audit Inspection Section */}
            <div className="space-y-2.5 p-4 rounded-2xl border bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-yellow-50/60 border-amber-300 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow-2xs font-bold">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs md:text-sm flex items-center gap-1.5">
                      <span>การตรวจสอบและกลั่นกรองคำร้องระดับ Admin (Admin Audit)</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        5 เสาหลัก
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      ตรวจทานความถูกต้องทางกฎหมาย สิทธิ์ผู้ขอ พิกัดกล้อง CCTV และระเบียบ PDPA โดยผู้ดูแลระบบ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAdminVerification(selectedReq)}
                  className="text-xs font-black px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md transition-all flex items-center gap-1.5 active:scale-98 border border-amber-300 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>{selectedReq.adminAudit ? '🛡️ แก้ไขผลตรวจ Admin' : '🛡️ ตรวจสอบคำร้อง (Admin)'}</span>
                </button>
              </div>

              {selectedReq.adminAudit ? (
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 ${
                        selectedReq.adminAudit.auditResult === 'approved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : selectedReq.adminAudit.auditResult === 'forward_executive'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : selectedReq.adminAudit.auditResult === 'action_required'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        ผลการวินิจฉัย Admin: {
                          selectedReq.adminAudit.auditResult === 'approved'
                            ? '🟢 อนุมัติส่งมอบข้อมูล'
                            : selectedReq.adminAudit.auditResult === 'forward_executive'
                            ? '🔵 เสนอผู้บริหารลงนาม'
                            : selectedReq.adminAudit.auditResult === 'action_required'
                            ? '🟡 ขอเอกสารเพิ่มเติม'
                            : '🔴 ไม่อนุมัติคำร้อง'
                        }
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {selectedReq.adminAudit.officialAuditCode || 'ADM-AUD-VERIFIED'}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      ตรวจโดย: <strong className="text-slate-900 font-bold">{selectedReq.adminAudit.adminName}</strong> ({new Date(selectedReq.adminAudit.auditTimestamp).toLocaleDateString('th-TH')})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] text-slate-700">
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.adminAudit.isIdentityVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      1. ตัวตน/สิทธิ์ {selectedReq.adminAudit.isIdentityVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.adminAudit.isPoliceReportVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      2. บันทึก ตร. {selectedReq.adminAudit.isPoliceReportVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.adminAudit.isCctvFootageConfirmed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      3. ไฟล์ CCTV {selectedReq.adminAudit.isCctvFootageConfirmed ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.adminAudit.isPdpaComplianceVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      4. ชอบด้วย PDPA {selectedReq.adminAudit.isPdpaComplianceVerified ? '✓' : '✕'}
                    </div>
                    <div className={`p-1.5 rounded-lg border text-center font-bold ${selectedReq.adminAudit.isDataRetentionValid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      5. ไม่เกินรอบเก็บ {selectedReq.adminAudit.isDataRetentionValid ? '✓' : '✕'}
                    </div>
                  </div>

                  {selectedReq.adminAudit.adminNotes && (
                    <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 text-[11px] text-slate-800">
                      <strong>ข้อสั่งการ/เหตุผลประกอบ:</strong> <span className="italic font-sans">"{selectedReq.adminAudit.adminNotes}"</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    ยังไม่ได้ทำการตรวจสอบและกลั่นกรองคำร้อง 5 เสาหลักระดับ Admin
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAdminVerification(selectedReq)}
                    className="text-[11px] font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg border border-amber-500 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    + คลิก เพื่อเริ่มตรวจ (Admin)
                  </button>
                </div>
              )}
            </div>

            {/* Approval Workflow Component for Officers (> 8 approvers) */}
            <ApprovalWorkflowViewer
              request={selectedReq}
              isOfficerMode={true}
              officerName={currentOfficer?.name || 'Admin ผู้จัดการคำร้อง'}
              onWorkflowUpdated={() => {
                reloadRequests();
                const refreshed = getStoredRequests().find(r => r.id === selectedReq.id);
                if (refreshed) setSelectedReq(refreshed);
              }}
              onOpenEditorModal={() => setShowWorkflowEditor(true)}
            />

            {/* Admin File Notification Alert */}
            {fileMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {fileMsg}
                </span>
              </div>
            )}

            {/* Attachments & Admin File Upload Section */}
            <div className="text-xs space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    รายการเอกสารแนบทั้งหมด ({selectedReq.attachments.length} รายการ)
                  </span>
                </div>
                
                {/* Category Filter Dropdown */}
                {selectedReq.attachments.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-medium">กรองหมวดหมู่:</span>
                    <select
                      value={attachmentCategoryFilter}
                      onChange={(e) => setAttachmentCategoryFilter(e.target.value as any)}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                    >
                      <option value="all">แสดงทุกหมวดหมู่ ({selectedReq.attachments.length})</option>
                      {DOCUMENT_CATEGORIES.map((cat) => {
                        const count = selectedReq.attachments.filter(a => (a.documentCategory || 'other') === cat.id).length;
                        return (
                          <option key={cat.id} value={cat.id} disabled={count === 0}>
                            {cat.labelTh} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* File list */}
              {selectedReq.attachments.length > 0 ? (
                <div className="space-y-2">
                  {selectedReq.attachments
                    .filter(att => attachmentCategoryFilter === 'all' || (att.documentCategory || 'other') === attachmentCategoryFilter)
                    .map((att) => {
                      const catDef = getDocumentCategoryDef(att.documentCategory);
                      return (
                        <div 
                          key={att.id} 
                          className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-[220px]">
                            <div className={`p-2 rounded-lg shrink-0 ${att.isOfficialDoc ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
                              {att.isOfficialDoc ? <ShieldCheck className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 truncate max-w-[220px]" title={att.name}>
                                  {att.name}
                                </span>

                                {/* Document Category Tag Badge */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${catDef.badgeBg} ${catDef.badgeText} ${catDef.badgeBorder}`}>
                                  <span>{catDef.labelTh}</span>
                                </span>

                                {att.isOfficialDoc ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    เอกสารทางการ
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    จากผู้ยื่น
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap">
                                <span>ขนาด: {typeof att.size === 'number' ? `${(att.size / 1024).toFixed(1)} KB` : att.size}</span>
                                <span>•</span>
                                <span>อัปโหลดเมื่อ: {new Date(att.uploadedAt).toLocaleString('th-TH')} น.</span>
                                {att.uploadedBy && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-slate-700">โดย {att.uploadedBy}</span>
                                  </>
                                )}
                              </p>

                              {att.description && (
                                <p className="text-[10px] text-slate-600 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">
                                  "{att.description}"
                                </p>
                              )}

                              {/* Document Category Change Select */}
                              <div className="pt-1 flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-medium">เปลี่ยนหมวดหมู่:</span>
                                <select
                                  value={att.documentCategory || 'other'}
                                  onChange={(e) => handleUpdateAttachmentCategoryTag(att.id, e.target.value as DocumentCategoryType)}
                                  className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {DOCUMENT_CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.labelTh}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {att.dataUrl ? (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                                title="ดาวน์โหลดไฟล์"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-600" />
                                ดาวน์โหลด
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">ไม่มีลิงก์ไฟล์</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id, att.name)}
                              className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                              title="ลบไฟล์นี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              ลบ
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-2">
                  - ยังไม่มีเอกสารแนบในคำร้องนี้ -
                </p>
              )}

              {/* File Upload Form Box by Admin */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    อัปเดต / เพิ่มไฟล์เอกสารแนบโดยแอดมิน (Admin File Upload)
                  </span>
                  <span className="text-[10px] text-slate-500">รองรับ PDF, รูปภาพ, DOCX, XLSX</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">🏷️ หมวดหมู่เอกสาร:</label>
                    <select
                      value={adminFileCategory}
                      onChange={(e) => setAdminFileCategory(e.target.value as DocumentCategoryType)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-800"
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.labelTh} ({cat.labelEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">📝 รายละเอียดเพิ่มเติม:</label>
                    <input
                      type="text"
                      placeholder="เช่น ใบอนุมัติเสร็จสิ้น / หนังสือราชการส่งกลับ..."
                      value={adminFileDesc}
                      onChange={(e) => setAdminFileDesc(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="md:col-span-3 pt-4 md:pt-0">
                    <input
                      type="file"
                      multiple
                      id="admin-file-upload-input"
                      onChange={handleAdminFileUpload}
                      disabled={isUploadingFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="admin-file-upload-input"
                      className={`w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors text-xs ${
                        isUploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {isUploadingFile ? 'กำลังอัปโหลด...' : 'เลือกไฟล์อัปโหลด'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Public/Private Notes & Admin Dialogue Section */}
            <div className="text-xs space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <StickyNote className="w-4 h-4 text-amber-700" />
                    บันทึกหมายเหตุข้อความ (Public/Private Notes)
                    {selectedReq.internalComments && selectedReq.internalComments.length > 0 && (
                      <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                        {selectedReq.internalComments.length}
                      </span>
                    )}
                  </span>
                  <p className="text-[10px] text-amber-800">
                    สามารถระบุเป็น <strong className="text-slate-800">🔒 บันทึกส่วนตัว (เจ้าหน้าที่เท่านั้น)</strong> หรือ <strong className="text-emerald-800">🌐 บันทึกสาธารณะ (แสดงให้ผู้ยื่นคำร้องมองเห็น)</strong>
                  </p>
                </div>
              </div>

              {commentMsg && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {commentMsg}
                </div>
              )}

              {/* Comments List */}
              {selectedReq.internalComments && selectedReq.internalComments.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedReq.internalComments
                    .slice()
                    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          comment.isPinned
                            ? 'bg-amber-100/90 border-amber-300 shadow-sm'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-100 pb-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {comment.isPinned && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                <Pin className="w-2.5 h-2.5 fill-white" /> ปักหมุด
                              </span>
                            )}

                            {comment.isPublic ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                <Globe className="w-2.5 h-2.5" /> สาธารณะ (ผู้ยื่นมองเห็น)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-slate-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                <Lock className="w-2.5 h-2.5" /> ส่วนตัว (เจ้าหน้าที่เท่านั้น)
                              </span>
                            )}

                            <span className="font-bold text-slate-800">{comment.author}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                            <span>{new Date(comment.createdAt).toLocaleString('th-TH')} น.</span>

                            <button
                              type="button"
                              onClick={() => handleTogglePublicComment(comment.id)}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-bold transition-colors flex items-center gap-1 ${
                                comment.isPublic
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={comment.isPublic ? 'คลิกเพื่อเปลี่ยนเป็นโน้ตส่วนตัว' : 'คลิกเพื่อเปลี่ยนเป็นโน้ตสาธารณะ (เปิดเผยแก่ผู้ยื่น)'}
                            >
                              {comment.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                              <span>{comment.isPublic ? 'เปลี่ยนเป็นส่วนตัว' : 'สลับเป็นสาธารณะ'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePinComment(comment.id)}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                                comment.isPinned ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'
                              }`}
                              title={comment.isPinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุดโน้ตนี้'}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="ลบโน้ตนี้"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-800/70 italic text-center py-2">
                  ยังไม่มีการบันทึกโน้ตสำหรับคำร้องนี้
                </p>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-2 border-t border-amber-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    เพิ่มโน้ต / บันทึกข้อความใหม่:
                  </span>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isCommentPinned}
                        onChange={(e) => setIsCommentPinned(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <Pin className="w-3 h-3 text-amber-600" />
                      ปักหมุด
                    </label>
                  </div>
                </div>

                {/* Public vs Private Selection Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/70 rounded-xl border border-amber-300/80">
                  <button
                    type="button"
                    onClick={() => setIsCommentPublic(false)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      !isCommentPublic
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-amber-200/60'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>🔒 บันทึกส่วนตัว (เจ้าหน้าที่เท่านั้น)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCommentPublic(true)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isCommentPublic
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/60'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>🌐 บันทึกสาธารณะ (แสดงแก่ผู้ยื่นคำร้อง)</span>
                  </button>
                </div>

                <textarea
                  rows={2}
                  placeholder={
                    isCommentPublic
                      ? "พิมพ์ข้อความสาธารณะที่จะแสดงให้ผู้ยื่นคำร้องเห็น เช่น 'กรุณาเข้าพบเจ้าหน้าที่พร้อมบัตรประชาชนตัวจริงที่ช่องบริการ 2', 'อยู่ระหว่างรอผลตรวจสอบจากฝ่ายการเงิน'..."
                      : "พิมพ์ข้อความบันทึกภายในส่วนตัว เช่น 'ประสานงานกองการเจ้าหน้าที่แล้ว รอเสนอผู้ช่วยอธิการบดีลงนาม', 'โทรติดตามเอกสารเพิ่มเติมเมื่อ 10:30 น.'..."
                  }
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-800 font-medium">ชื่อผู้บันทึก:</span>
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="px-2 py-1 border border-amber-300 rounded-lg text-[11px] bg-white outline-none focus:ring-1 focus:ring-amber-500 w-56"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!(newCommentContent || '').trim()}
                    className={`inline-flex items-center gap-1 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-xl shadow transition-colors text-xs shrink-0 ${
                      isCommentPublic
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isCommentPublic ? 'บันทึกโน้ตสาธารณะ' : 'บันทึกโน้ตส่วนตัว'}
                  </button>
                </div>
              </form>
            </div>

            {/* Decision & Status Update Form */}
            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs pt-3 border-t border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" />
                การพิจารณาและอัปเดตสถานะของเจ้าหน้าที่
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ปรับสถานะคำร้อง *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                  >
                    <option value="under_review">อยู่ระหว่างตรวจสอบ (Under Review)</option>
                    <option value="action_required">ต้องการข้อมูล/เอกสารเพิ่มเติม (Action Required)</option>
                    <option value="approved">อนุมัติคำร้อง (Approved)</option>
                    <option value="rejected">ไม่อนุมัติคำร้อง (Rejected)</option>
                    <option value="completed">ดำเนินการเสร็จสิ้น (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อเจ้าหน้าที่ผู้รับผิดชอบ</label>
                  <input
                    type="text"
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  บันทึกข้อความจากเจ้าหน้าที่ / คำอธิบายผลการพิจารณา (ส่งแจ้งประชาชนผู้ยื่นคำร้อง)
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุข้อความชี้แจง คำแนะนำ หรือรายละเอียดเหตุผลที่ต้องการแจ้งต่อประชาชน..."
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Internal Notes Field (Private to Authorized Officers Only) */}
              <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-50/70 p-3.5 rounded-xl border border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>บันทึกข้อความภายในสถานะคำร้อง (Internal Notes - เฉพาะเจ้าหน้าที่)</span>
                  </label>
                  <span className="text-[10px] font-bold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                    <ShieldCheck className="w-3 h-3 text-amber-800" />
                    🔒 Private / Officers Only
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  บันทึกข้อคิดเห็น ข้อสังเกต หรือข้อมูลประสานงานภายในเกี่ยวกับสถานะของคำร้องนี้สำหรับเจ้าหน้าที่ท่านอื่น (ข้อความนี้เป็นความลับเฉพาะเจ้าหน้าที่ <strong>ไม่แสดงต่อประชาชนผู้ยื่นคำร้อง</strong>)
                </p>
                <textarea
                  rows={3}
                  placeholder="ระบุข้อคิดเห็น หรือบันทึกภายในสถานะคำร้องสำหรับเจ้าหน้าที่ท่านอื่น เช่น 'ตรวจสอบตำแหน่งกล้องแยกไฟแดงแล้ว มีภาพเหตุการณ์ชัดเจน รอตำรวจนำหนังสือตัวจริงมาแสดง', 'นัดหมายช่างเทคนิคตรวจสอบฮาร์ดดิสก์สำรอง'..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white text-xs leading-relaxed"
                />

                {internalNotesMsg && (
                  <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {internalNotesMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-amber-800">
                    {selectedReq.internalNotes ? '✓ มีบันทึกภายในเดิมบันทึกไว้' : 'ยังไม่มีการบันทึกข้อความภายใน'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveInternalNotesOnly}
                    disabled={isSavingInternalNotes}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    title="บันทึกข้อความภายในทันทีโดยไม่ต้องเปลี่ยนสถานะคำร้อง"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingInternalNotes ? 'กำลังบันทึก...' : '💾 บันทึกเฉพาะโน้ตภายใน (Quick Save)'}</span>
                  </button>
                </div>
              </div>

              {/* Notification Options & Automated Notification Triggers */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>ช่องทางแจ้งเตือนอัตโนมัติถึงประชาชน (Automated Notifications)</span>
                  </div>
                  {(newStatus === 'completed' || newStatus === 'approved') && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      ⚡ แจ้งเตือนอัตโนมัติเมื่ออนุมัติ/เสร็จสิ้น
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={sendNotificationEmails}
                      onChange={(e) => setSendNotificationEmails(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        ส่งอีเมลแจ้งเตือน
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">
                        {selectedReq?.applicant.email || 'อีเมลผู้ยื่นคำร้อง'}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={sendNotificationSms}
                      onChange={(e) => setSendNotificationSms(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        ส่ง SMS ข้อความมือถือ
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {selectedReq?.applicant.phone || '081-XXX-XXXX'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* SMS Message Live Preview */}
                {sendNotificationSms && (
                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-slate-700 text-[11px] font-mono leading-relaxed space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <MessageSquareCheck className="w-3 h-3 text-emerald-400" />
                        ตัวอย่างข้อความ SMS บนมือถือประชาชน:
                      </span>
                      <span className="text-slate-400">เทศบาลเมืองชัยภูมิ</span>
                    </div>
                    <div className="bg-slate-800 p-2 rounded text-slate-200 text-[10.5px]">
                      [เทศบาลเมืองชัยภูมิ] คำร้องเลขที่ {selectedReq?.id} เรื่อง "{selectedReq?.title}" สถานะ: "{getStatusLabelTh(newStatus)}"{(officerNotes || '').trim() ? ` (${(officerNotes || '').trim()})` : ''} ติดตามที่ e-service.chaiyaphum.go.th
                    </div>
                  </div>
                )}
              </div>

              {/* Google Tasks Sync */}
              <GoogleTasksSyncWidget request={selectedReq} />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-xl shadow transition-colors"
                >
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการพิจารณา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PDF Summary Report Modal */}
      {showPdfModal && (
        <OfficerPdfReportModal
          requests={filteredRequests}
          filterLabel={
            statusFilter === 'all'
              ? 'คำร้องทั้งหมด'
              : `สถานะ: ${getStatusLabelTh(statusFilter as RequestStatus)}`
          }
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Monthly Report Modal */}
      {showMonthlyReportModal && (
        <MonthlyReportModal
          requests={requests}
          onClose={() => setShowMonthlyReportModal(false)}
          isAdmin={officerRole === 'admin'}
        />
      )}


      {/* Email Logs Modal */}
      {showEmailModal && (
        <EmailLogsModal onClose={() => setShowEmailModal(false)} />
      )}

      {/* Test SMS Modal for Administrators & Officers */}
      {showTestSmsModal && (
        <OfficerTestSmsModal
          isOpen={showTestSmsModal}
          onClose={() => setShowTestSmsModal(false)}
          onOpenTemplateEditor={() => setShowSmsTemplateModal(true)}
          initialRequest={testSmsTargetReq || selectedReq}
          requests={requests}
        />
      )}

      {/* SMS Template Settings & Placeholders Editor Modal */}
      {showSmsTemplateModal && (
        <OfficerSmsTemplateModal
          isOpen={showSmsTemplateModal}
          onClose={() => setShowSmsTemplateModal(false)}
          requests={requests}
          onOpenTestSms={(sampleReq) => {
            if (sampleReq) setTestSmsTargetReq(sampleReq);
            setShowSmsTemplateModal(false);
            setShowTestSmsModal(true);
          }}
        />
      )}

      {/* Approval Workflow Editor Modal */}
      {showWorkflowEditor && selectedReq && (
        <ApprovalWorkflowEditorModal
          request={selectedReq}
          officerName={assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'}
          onClose={() => setShowWorkflowEditor(false)}
          onSaveSuccess={() => {
            setShowWorkflowEditor(false);
            reloadRequests();
            const refreshed = getStoredRequests().find(r => r.id === selectedReq.id);
            if (refreshed) setSelectedReq(refreshed);
          }}
        />
      )}

      {/* Pre-Review Inspection Modal for Officer before Admin/Executive Submission */}
      {showPreReviewModal && selectedReq && (
        <PreReviewInspectionModal
          isOpen={showPreReviewModal}
          request={selectedReq}
          officerName={assignedOfficer || currentOfficer?.name || 'เจ้าหน้าที่ผู้ตรวจสอบ'}
          onClose={() => setShowPreReviewModal(false)}
          onSaved={() => {
            setShowPreReviewModal(false);
            reloadRequests();
            const refreshed = getStoredRequests().find(r => r.id === selectedReq.id);
            if (refreshed) setSelectedReq(refreshed);
          }}
        />
      )}

      {/* Floating Action Bar for Bulk Selection */}
      {selectedRequestIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white shadow-2xl rounded-2xl border border-slate-700 p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 max-w-4xl w-[94%] backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold border border-blue-500/40">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <span>เลือกคำร้องแล้ว</span>
                <span className="bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-full text-[11px] shadow-xs">
                  {selectedRequestIds.length} รายการ
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                เลือกเปลี่ยนสถานะพร้อมกัน หรือคลิกปุ่มด้านล่าง
              </p>
            </div>
          </div>

          {/* Quick Bulk Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleOpenBulkModal('under_review')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              title="ปรับเป็น อยู่ระหว่างตรวจสอบ"
            >
              <Clock className="w-3.5 h-3.5" />
              อยู่ระหว่างตรวจสอบ
            </button>

            <button
              onClick={() => handleOpenBulkModal('action_required')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              title="ปรับเป็น ต้องการข้อมูลเพิ่มเติม"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              ขอเอกสารเพิ่ม
            </button>

            <button
              onClick={() => handleOpenBulkModal('approved')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              title="ปรับเป็น อนุมัติแล้ว"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              อนุมัติคำร้อง
            </button>

            <button
              onClick={() => handleOpenBulkModal('completed')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              title="ปรับเป็น ดำเนินการเสร็จสิ้น"
            >
              <FileCheck className="w-3.5 h-3.5" />
              เสร็จสิ้น
            </button>

            <button
              onClick={() => handleOpenBulkModal('rejected')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              title="ปรับเป็น ไม่อนุมัติ"
            >
              <XCircle className="w-3.5 h-3.5" />
              ไม่อนุมัติ
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
              title="ยกเลิกการเลือก"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Status Update Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-300 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ปรับเปลี่ยนสถานะคำร้องแบบกลุ่ม (Bulk Update)
                  </h3>
                  <p className="text-xs text-slate-500">
                    มีผลกับคำร้องที่เลือกทั้งสิ้น <strong className="text-blue-600 font-bold">{selectedRequestIds.length} รายการ</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Selected Tracking IDs */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                  รายการคำร้องที่เลือก ({selectedRequestIds.length} รายการ):
                </span>
                <span className="text-[10px] text-slate-400 font-normal">คลิก 'x' เพื่อนำออกจากกลุ่ม</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                {selectedRequestIds.map(id => {
                  const reqItem = requests.find(r => r.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200" title={reqItem?.title}>
                      <span>{id}</span>
                      {reqItem && <span className="text-slate-400 font-normal max-w-[90px] truncate text-[9px]">({reqItem.title})</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromSelection(id)}
                        className="hover:bg-blue-200/60 rounded p-0.5 text-blue-500 hover:text-blue-900 transition-colors"
                        title="นำรายการนี้ออกจากการเลือก"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleExecuteBulkStatusUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    สถานะเป้าหมาย (Target Status):
                  </label>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value as RequestStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-white text-slate-800"
                  >
                    <option value="under_review">🟡 อยู่ระหว่างตรวจสอบ (Under Review)</option>
                    <option value="action_required">🟣 ต้องการข้อมูลเพิ่มเติม (Action Required)</option>
                    <option value="approved">🟢 อนุมัติแล้ว (Approved)</option>
                    <option value="completed">🔵 ดำเนินการเสร็จสิ้น (Completed)</option>
                    <option value="rejected">🔴 ไม่อนุมัติ (Rejected)</option>
                    <option value="submitted">⏳ รอการตรวจสอบ (Submitted)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    ปรับระดับความเร่งด่วน (Priority):
                  </label>
                  <select
                    value={bulkTargetPriority}
                    onChange={(e) => setBulkTargetPriority(e.target.value as RequestItem['priority'] | 'keep')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white text-slate-800"
                  >
                    <option value="keep">— คงระดับความเร่งด่วนเดิม —</option>
                    <option value="very_urgent">🔥 ด่วนที่สุด (Very Urgent)</option>
                    <option value="urgent">⚡ ด่วน (Urgent)</option>
                    <option value="high">🟡 ปานกลาง / สูง (High)</option>
                    <option value="normal">🔵 ปกติ (Normal)</option>
                    <option value="low">🟢 ไม่ด่วน (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-800">
                    เจ้าหน้าที่ผู้รับผิดชอบ / ผู้ดำเนินการ:
                  </label>
                  {currentOfficer && (
                    <button
                      type="button"
                      onClick={() => setBulkAssignOfficer(currentOfficer.name)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      ใส่ชื่อฉัน ({currentOfficer.name})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={bulkAssignOfficer}
                  onChange={(e) => setBulkAssignOfficer(e.target.value)}
                  placeholder="ระบุชื่อ-สกุล หรือตำแหน่งเจ้าหน้าที่ผู้รับผิดชอบ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800">
                    หมายเหตุ / บันทึกการเปลี่ยนสถานะแบบกลุ่ม (Bulk Note):
                  </label>
                  <span className="text-[10px] text-slate-400">เทมเพลตด่วนตามสถานะ:</span>
                </div>

                {/* Dynamic Smart note templates matching chosen target status */}
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {bulkTargetStatus === 'under_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBulkNote('เอกสารและหลักฐานครบถ้วน อยู่ระหว่างการตรวจสอบพิกัดกล้องและไฟล์ภาพ CCTV')}
                        className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[10px] transition-colors"
                      >
                        + ตรวจสอบพิกัดกล้อง
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkNote('รับเรื่องเข้าสู่ระบบและอยู่ระหว่างการประสานงานเจ้าหน้าที่ศูนย์ควบคุม')}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] transition-colors"
                      >
                        + ประสานงานศูนย์
                      </button>
                    </>
                  )}

                  {bulkTargetStatus === 'action_required' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBulkNote('ขอเอกสารหลักฐานเพิ่มเติม (สำเนาบัตรประชาชน / บันทึกประจำวันจากสถานีตำรวจ)')}
                        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[10px] transition-colors"
                      >
                        + ขอสำเนาบัตร/ใบแจ้งความ
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkNote('ขอระบุช่วงเวลาและสถานที่เกิดเหตุให้ชัดเจนเพิ่มเติม')}
                        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[10px] transition-colors"
                      >
                        + ขอระบุเวลาเพิ่ม
                      </button>
                    </>
                  )}

                  {bulkTargetStatus === 'approved' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBulkNote('อนุมัติคำร้องเรียบร้อยแล้ว ตรวจสอบพบไฟล์ภาพเหตุการณ์ พร้อมนัดหมายรับข้อมูล')}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] transition-colors"
                      >
                        + อนุมัติพร้อมนัดรับ
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkNote('อนุมัติคำร้องและส่งไฟล์ภาพเข้าสู่ระบบคลาวด์ดาวน์โหลด')}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] transition-colors"
                      >
                        + อนุมัติส่งไฟล์คลาวด์
                      </button>
                    </>
                  )}

                  {bulkTargetStatus === 'completed' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBulkNote('ส่งมอบข้อมูลภาพ CCTV และบันทึกประวัติการรับบริการเสร็จสิ้นเรียบร้อย')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] transition-colors"
                      >
                        + ส่งมอบภาพเสร็จสิ้น
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkNote('ประชาชนมารับข้อมูลภาพและลงนามรับมอบเรียบร้อย')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] transition-colors"
                      >
                        + ลงนามรับมอบแล้ว
                      </button>
                    </>
                  )}

                  {bulkTargetStatus === 'rejected' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBulkNote('ไม่อนุมัติเนื่องจากเกินระยะเวลาการจัดเก็บข้อมูลภาพ (30 วัน)')}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] transition-colors"
                      >
                        + เกิน 30 วัน
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkNote('จุดเกิดเหตุอยู่นอกรัศมีการบันทึกภาพของกล้อง CCTV เทศบาล')}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] transition-colors"
                      >
                        + นอกรัศมีกล้อง
                      </button>
                    </>
                  )}

                  {bulkTargetStatus === 'submitted' && (
                    <button
                      type="button"
                      onClick={() => setBulkNote('ปรับสถานะย้อนกลับเป็นเรื่องรับใหม่ เพื่อรอเจ้าหน้าที่รับเรื่อง')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] transition-colors"
                    >
                      + รับเรื่องใหม่
                    </button>
                  )}
                </div>

                <textarea
                  rows={2}
                  placeholder={`ระบุหมายเหตุสำหรับการปรับสถานะเป็น "${getStatusLabelTh(bulkTargetStatus)}" แบบกลุ่ม (ส่งแจ้งประชาชน)...`}
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed text-xs"
                />
              </div>

              {/* Bulk Internal Notes Field (Private / Officers Only) */}
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>บันทึกข้อความภายในสถานะคำร้องแบบกลุ่ม (Internal Notes - เฉพาะเจ้าหน้าที่)</span>
                  </label>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded flex items-center gap-1">
                    🔒 เจ้าหน้าที่เท่านั้น
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder="ระบุบันทึกข้อความภายในสำหรับคำร้องที่เลือกทั้งหมด เช่น 'ส่งต่อชุดข้อมูลให้ฝ่ายวิศวกรรมจราจรตรวจสอบ', 'อยู่ระหว่างรอการยืนยันไฟล์บันทึกสำรอง' (ประชาชนไม่เห็น)..."
                  value={bulkInternalNotes}
                  onChange={(e) => setBulkInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white text-xs leading-relaxed"
                />
              </div>

              {/* Automated Email & SMS Notification Options & Previews */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-blue-600" />
                    การแจ้งเตือนประชาชนอัตโนมัติ ({selectedRequestIds.length} คำร้อง)
                  </span>
                  {(bulkTargetStatus === 'completed' || bulkTargetStatus === 'approved') && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      ⚡ ส่งแจ้งเตือนเมื่ออนุมัติ/เสร็จสิ้น
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={sendNotificationEmails}
                      onChange={(e) => setSendNotificationEmails(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        ส่งอีเมลแจ้งเตือน
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ผู้ยื่นคำร้อง {selectedRequestIds.length} ราย
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={sendNotificationSms}
                      onChange={(e) => setSendNotificationSms(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        ส่ง SMS ข้อความมือถือ
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        เบอร์ผู้ยื่นคำร้อง {selectedRequestIds.length} ราย
                      </span>
                    </div>
                  </label>
                </div>

                {sendNotificationEmails && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <MailCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>ตัวอย่างร่างอีเมลยืนยันที่จะส่งออก (Email Draft Preview):</span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-md text-[10px] font-mono leading-relaxed space-y-1">
                      <div className="text-blue-300 font-bold">หัวข้อ: [เทศบาลเมืองชัยภูมิ] แจ้งผลคำร้อง/อัปเดตสถานะ → {getStatusLabelTh(bulkTargetStatus)}</div>
                      <div className="text-slate-300">เรียน คุณผู้ยื่นคำร้อง...</div>
                      <div className="text-slate-300">คำร้องของท่านได้รับการปรับสถานะเป็น "{getStatusLabelTh(bulkTargetStatus)}" เรียบร้อยแล้ว โดย {assignedOfficer || 'เจ้าหน้าที่ผู้ปฏิบัติงาน'}</div>
                      {Boolean((bulkNote || '').trim()) && <div className="text-amber-300 italic">"หมายเหตุ: {(bulkNote || '').trim()}"</div>}
                    </div>
                  </div>
                )}

                {sendNotificationSms && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <MessageSquareCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ตัวอย่างข้อความ SMS ที่จะส่งไปยังมือถือประชาชน:</span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-md text-[10px] font-mono leading-relaxed">
                      <span className="text-emerald-400 font-bold">[เทศบาลเมืองชัยภูมิ]</span> คำร้องของท่านได้รับการปรับสถานะเป็น "{getStatusLabelTh(bulkTargetStatus)}"{(bulkNote || '').trim() ? ` (${(bulkNote || '').trim()})` : ''} ตรวจสอบได้ที่ e-service.chaiyaphum.go.th
                    </div>
                  </div>
                )}
                {/* Google Docs Integration Option */}
                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createGoogleDocOnBulkUpdate}
                      onChange={(e) => setCreateGoogleDocOnBulkUpdate(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-blue-950 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        สร้างเอกสารบันทึกข้อความสรุปผลใน Google Docs อัตโนมัติ (Google Docs Audit Memo)
                      </span>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        ระบบจะสร้างเอกสาร Google Docs รูปแบบบันทึกข้อความราชการ สรุปรายชื่อคำร้อง {selectedRequestIds.length} รายการที่ได้รับการปรับสถานะ พร้อมเลขที่คำร้อง ผู้ยื่น และหมายเหตุประกอบ
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ยืนยันการปรับสถานะ {selectedRequestIds.length} รายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Scheduling Modal */}
      {appointmentModalReq && (
        <AppointmentModal
          isOpen={!!appointmentModalReq}
          onClose={() => setAppointmentModalReq(null)}
          request={appointmentModalReq}
          onSaveSuccess={() => {
            reloadRequests();
            const refreshed = getStoredRequests();
            if (selectedReq) {
              const found = refreshed.find(r => r.id === selectedReq.id);
              if (found) setSelectedReq(found);
            }
          }}
        />
      )}

      {/* Applicant Permissions Modal */}
      <ApplicantPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        onPermissionsUpdated={() => {
          // Re-trigger re-renders
        }}
      />

      {/* Officer Data Entry / New Request Creation Modal */}
      <OfficerNewRequestModal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        currentOfficerName={assignedOfficer}
        onSuccess={(created) => {
          reloadRequests();
          setSelectedReq(created);
          setSuccessMsg(`ลงรับคำร้องใหม่สำเร็จ (เลขคำร้อง: ${created.id})`);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* Officer Report Center Modal */}
      <OfficerReportCenterModal
        isOpen={showReportCenterModal}
        onClose={() => setShowReportCenterModal(false)}
        requests={requests}
        isAdmin={officerRole === 'admin'}
      />

      {/* Official Printable PDF / Document Report Modal */}
      {showPdfModal && (
        <OfficerPdfReportModal
          requests={selectedRequestIds.length > 0 ? requests.filter(r => selectedRequestIds.includes(r.id)) : filteredRequests}
          filterLabel={`สถานะ: ${statusFilter === 'all' ? 'ทั้งหมด' : getStatusLabelTh(statusFilter as RequestStatus)}, ความเร่งด่วน: ${priorityFilter === 'all' ? 'ทั้งหมด' : getPriorityLabelTh(priorityFilter as PriorityLevel)}${startDate ? `, ตั้งแต่ ${startDate}` : ''}${endDate ? `, ถึง ${endDate}` : ''}${selectedRequestIds.length > 0 ? ` (เลือกเฉพาะ ${selectedRequestIds.length} รายการ)` : ''}`}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Admin Authentication Modal */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin Access Required)</span>
              </div>
              <button
                onClick={() => {
                  setShowAdminAuthModal(false);
                  setPendingReportAction(null);
                  setAdminPasscodeError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  🔒 จำกัดเฉพาะผู้ใช้งานสิทธิ์ Admin
                </p>
                <p>
                  การจัดทำรายงานสรุปผู้บริหาร การพิมพ์รายงานทางราชการ และการส่งออกข้อมูลสารบรรณ จำกัดเฉพาะเจ้าหน้าที่ที่มีสิทธิ์ <strong>Admin</strong> เท่านั้น
                </p>
              </div>

              <div>
                <label className="block font-extrabold text-slate-800 text-xs mb-1.5">
                  ป้อนรหัสผ่าน Admin เพื่อยืนยันสิทธิ์:
                </label>
                <input
                  type="password"
                  value={adminPasscodeInput}
                  onChange={(e) => {
                    setAdminPasscodeInput(e.target.value);
                    setAdminPasscodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUnlockAdmin();
                    }
                  }}
                  placeholder="รหัสผ่าน Admin (เช่น 1234 หรือ admin)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                  autoFocus
                />
              </div>

              {adminPasscodeError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  ⚠️ {adminPasscodeError}
                </p>
              )}

              <p className="text-[11px] text-slate-500">
                💡 บัญชีทดสอบสามารถใช้รหัสผ่าน <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">1234</code> หรือ <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">admin</code>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowAdminAuthModal(false);
                  setPendingReportAction(null);
                  setAdminPasscodeError(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUnlockAdmin}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold rounded-xl shadow-md transition-all text-xs cursor-pointer"
              >
                ปลดล็อกสิทธิ์ Admin & ดำเนินการ
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>ส่งออกรายงานคำร้อง (Export Requests Report)</span>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Format selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  รูปแบบไฟล์และประเภทรายงาน (Export Report Type & Format):
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('incident_trends')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      exportFormat === 'incident_trends'
                        ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-400 text-teal-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1">
                        <span>CSV วิเคราะห์แนวโน้ม</span>
                        <span className="bg-teal-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black">แนะนำ</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                        มีไตรมาส, วันที่เกิดเหตุ, พิกัด/จุดติดตั้ง, SLA วันดำเนินการ, แท็ก AI สำหรับ Pivot Table
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 text-blue-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs">CSV คำร้องมาตรฐาน</div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                        ข้อมูลสารบรรณและสถานะครบถ้วน รองรับ UTF-8 BOM ภาษาไทย
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      exportFormat === 'xlsx'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 text-emerald-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-xs">Microsoft Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                        ตารางจัดรูปแบบสี, หัวตารางสวยงาม และรองรับสูตร
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Scope selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  ขอบเขตข้อมูลที่ต้องการส่งออก (Data Scope):
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    exportScope === 'filtered' ? 'bg-blue-50/70 border-blue-300 font-semibold text-blue-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'filtered'}
                      onChange={() => setExportScope('filtered')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>รายการที่ผ่านการกรองและค้นหาปัจจุบัน (<strong>{filteredRequests.length}</strong> รายการ)</span>
                  </label>

                  {selectedRequestIds.length > 0 && (
                    <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      exportScope === 'selected' ? 'bg-purple-50/70 border-purple-300 font-semibold text-purple-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'selected'}
                        onChange={() => setExportScope('selected')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>เฉพาะรายการที่เลือกด้วยเครื่องหมายถูก (<strong>{selectedRequestIds.length}</strong> รายการ)</span>
                    </label>
                  )}

                  <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    exportScope === 'all' ? 'bg-amber-50/70 border-amber-300 font-semibold text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>ข้อมูลคำร้องทั้งหมดในระบบ (<strong>{totalCount}</strong> รายการ)</span>
                  </label>
                </div>
              </div>

              {/* Filter details if scope is filtered */}
              {exportScope === 'filtered' && (
                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>เงื่อนไขตัวกรองที่จะถูกรวมในหัวรายงานสรุป:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200">
                      สถานะ: <strong>{statusFilter === 'all' ? 'ทั้งหมด' : statusFilter}</strong>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200">
                      ความสำคัญ: <strong>{priorityFilter === 'all' ? 'ทั้งหมด' : priorityFilter}</strong>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200">
                      หัวข้อ: <strong>{topicFilter === 'all' ? 'ทั้งหมด' : topicFilter}</strong>
                    </span>
                    {searchTerm && (
                      <span className="bg-white px-2 py-0.5 rounded border border-blue-200">
                        คำค้นหา: <strong>"{searchTerm}"</strong>
                      </span>
                    )}
                    {(startDate || endDate) && (
                      <span className="bg-white px-2 py-0.5 rounded border border-blue-200">
                        ช่วงวันที่: <strong>{startDate || '-'} ถึง {endDate || '-'}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Notice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                ℹ️ <strong>รายละเอียดในไฟล์รายงาน:</strong> รหัส Tracking ID, วันที่ยื่นเรื่อง, วันที่/เวลาเกิดเหตุ, พิกัดและจุดติดตั้งกล้อง CCTV, เลขที่บันทึกประจำวัน/หนังสือราชการ, วัตถุประสงค์, สถานะ, ความเร่งด่วน, SLA วันดำเนินการ, ข้อมูลผู้ยื่นคำร้อง, และหมายเหตุเจ้าหน้าที่อย่างครบถ้วน
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat('xlsx');
                    setTimeout(() => handleExecuteExport(), 50);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                  title="ส่งออกเป็น Excel ทันที"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ด่วน: Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat('csv');
                    setTimeout(() => handleExecuteExport(), 50);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                  title="ส่งออกเป็น CSV ทันที"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>ด่วน: CSV (.csv)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลดไฟล์ {exportFormat === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CCTV Excel & CSV Structured Export Modal for Authorized Staff */}
      <OfficerExportExcelModal
        isOpen={showExportExcelModal}
        onClose={() => setShowExportExcelModal(false)}
        filteredRequests={filteredRequests}
        allRequests={requests}
        selectedRequestIds={selectedRequestIds}
        activeFilters={{
          statusFilter,
          priorityFilter,
          categoryFilter,
          topicFilter,
          searchTerm,
          startDate,
          endDate
        }}
        currentOfficerName={assignedOfficer || 'เจ้าหน้าที่ศูนย์ควบคุมกล้อง CCTV'}
        officerRole={officerRole}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* Quarterly CSV Export Modal */}
      {showQuarterlyExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg p-6 space-y-5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    ดาวน์โหลด CSV รายงานประจำไตรมาส (Quarterly CSV)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    ส่งออกตารางสรุปคำร้อง CCTV จัดรูปโครงสร้างสำหรับผู้บริหารและการจัดทำรายงานทางราชการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuarterlyExportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Year Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  เลือกปี พ.ศ. (Fiscal/Calendar Year):
                </label>
                <select
                  value={quarterlyYear}
                  onChange={(e) => setQuarterlyYear(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={2026}>ปี พ.ศ. 2569 (2026)</option>
                  <option value={2025}>ปี พ.ศ. 2568 (2025)</option>
                  <option value={2024}>ปี พ.ศ. 2567 (2024)</option>
                </select>
              </div>

              {/* Quarter Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  เลือกไตรมาส (Quarter Period):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuarterlyQuarter('all')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      quarterlyQuarter === 'all'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">สรุปทุกไตรมาส (ทั้งปี)</div>
                    <div className="text-[10px] text-slate-500">มกราคม - ธันวาคม</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuarterlyQuarter('Q1')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      quarterlyQuarter === 'Q1'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">ไตรมาสที่ 1 (Q1)</div>
                    <div className="text-[10px] text-slate-500">ม.ค. - มี.ค.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuarterlyQuarter('Q2')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      quarterlyQuarter === 'Q2'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">ไตรมาสที่ 2 (Q2)</div>
                    <div className="text-[10px] text-slate-500">เม.ย. - มิ.ย.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuarterlyQuarter('Q3')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      quarterlyQuarter === 'Q3'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">ไตรมาสที่ 3 (Q3)</div>
                    <div className="text-[10px] text-slate-500">ก.ค. - ก.ย.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuarterlyQuarter('Q4')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 ${
                      quarterlyQuarter === 'Q4'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">ไตรมาสที่ 4 (Q4)</div>
                    <div className="text-[10px] text-slate-500">ต.ค. - ธ.ค.</div>
                  </button>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  เงื่อนไขสถานะคำร้อง (Status Filter):
                </label>
                <div className="flex gap-2">
                  <label className={`flex-1 p-2 rounded-xl border cursor-pointer text-center text-xs font-semibold transition-all ${
                    quarterlyStatusFilter === 'all' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="qStatus"
                      checked={quarterlyStatusFilter === 'all'}
                      onChange={() => setQuarterlyStatusFilter('all')}
                      className="sr-only"
                    />
                    คำร้องทั้งหมดในระบบ
                  </label>
                  <label className={`flex-1 p-2 rounded-xl border cursor-pointer text-center text-xs font-semibold transition-all ${
                    quarterlyStatusFilter === 'approved_only' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="qStatus"
                      checked={quarterlyStatusFilter === 'approved_only'}
                      onChange={() => setQuarterlyStatusFilter('approved_only')}
                      className="sr-only"
                    />
                    เฉพาะที่อนุมัติ/เสร็จสิ้น
                  </label>
                </div>
              </div>

              {/* Preview counter banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  จำนวนคำร้องที่พร้อมส่งออก:
                </span>
                <span className="bg-emerald-600 text-white font-extrabold px-3 py-0.5 rounded-full text-xs">
                  {requests.filter(r => {
                    if (quarterlyStatusFilter === 'approved_only' && !(r.status === 'approved' || r.status === 'completed')) return false;
                    const d = new Date(r.createdAt);
                    if (d.getFullYear() !== quarterlyYear) return false;
                    if (quarterlyQuarter !== 'all') {
                      const m = d.getMonth() + 1;
                      if (quarterlyQuarter === 'Q1' && (m < 1 || m > 3)) return false;
                      if (quarterlyQuarter === 'Q2' && (m < 4 || m > 6)) return false;
                      if (quarterlyQuarter === 'Q3' && (m < 7 || m > 9)) return false;
                      if (quarterlyQuarter === 'Q4' && (m < 10 || m > 12)) return false;
                    }
                    return true;
                  }).length} รายการ
                </span>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                💡 ไฟล์ CSV จะถูกจัดเข้ารหัส UTF-8 พร้อม BOM สอดคล้องกับมาตรฐานเปิดอ่านใน Microsoft Excel, Google Sheets, และ LibreOffice โดยไม่อ่านภาษาไทยเพี้ยน
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuarterlyExportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExportQuarterlyCsv}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-100" />
                ดาวน์โหลด CSV รายงานไตรมาส
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Bulk Email Draft Confirmations Modal */}
      {showEmailDraftsModal && bulkToastNotification && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl p-6 space-y-5 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3.5 shrink-0">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <MailCheck className="w-5 h-5 text-emerald-600" />
                  <span>ร่างอีเมลยืนยันการอัปเดตสถานะแบบกลุ่ม (Simulated Email Draft Confirmations)</span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  ร่างข้อความแจ้งเตือนที่ระบบสร้างอัตโนมัติส่งถึงผู้ยื่นคำร้องรวม {bulkToastNotification.drafts.length} ฉบับ
                </p>
              </div>
              <button onClick={() => setShowEmailDraftsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden flex-1 min-h-[360px]">
              {/* Left: Email List */}
              <div className="md:col-span-5 border border-slate-200 rounded-xl p-2 space-y-1.5 overflow-y-auto bg-slate-50 max-h-[420px]">
                <div className="text-[11px] font-bold text-slate-600 px-2 py-1 flex justify-between items-center border-b border-slate-200 mb-1">
                  <span>ผู้รับการแจ้งเตือน ({bulkToastNotification.drafts.length})</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                    ส่งเรียบร้อยแล้ว
                  </span>
                </div>

                {bulkToastNotification.drafts.map((draft) => {
                  const isSelected = selectedEmailDraft?.requestId === draft.requestId;
                  return (
                    <button
                      key={draft.requestId}
                      type="button"
                      onClick={() => setSelectedEmailDraft(draft)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] opacity-80 mb-0.5">
                        <span className="font-bold">{draft.requestId}</span>
                        <span>{draft.sentAt}</span>
                      </div>
                      <div className="font-bold text-xs truncate mb-0.5">{draft.recipientName}</div>
                      <div className="text-[11px] truncate opacity-90 font-mono">{draft.recipientEmail}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                          {draft.statusLabel}
                        </span>
                        <span className="text-[10px] opacity-75">📧 พร้อมส่ง</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Selected Email Detail */}
              <div className="md:col-span-7 border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between overflow-y-auto max-h-[420px]">
                {selectedEmailDraft ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-16">จาก (From):</span>
                        <span className="text-slate-800 font-medium">ระบบสารบรรณดิจิทัล &lt;noreply@saraban.mail.go.th&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-16">ถึง (To):</span>
                        <span className="text-blue-700 font-bold">{selectedEmailDraft.recipientName} &lt;{selectedEmailDraft.recipientEmail}&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-16">หัวข้อ:</span>
                        <span className="text-slate-900 font-bold">{selectedEmailDraft.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-200 pt-1 text-[10px] text-slate-500">
                        <span>วันที่สร้างร่าง: {selectedEmailDraft.sentAt}</span>
                        <span>•</span>
                        <span>ผู้ดำเนินการ: {selectedEmailDraft.officerName}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 flex-1 overflow-y-auto shadow-inner">
                      {selectedEmailDraft.body}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        สถานะ: บันทึกเข้าประวัติแจ้งเตือนและเตรียมส่งอีเมลสำเร็จ
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`หัวข้อ: ${selectedEmailDraft.subject}\n\n${selectedEmailDraft.body}`);
                          setCopyEmailSuccess(true);
                          setTimeout(() => setCopyEmailSuccess(false), 2500);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copyEmailSuccess ? 'คัดลอกข้อความแล้ว!' : 'คัดลอกเนื้อหาอีเมล'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    เลือกรายการอีเมลด้านซ้ายเพื่อเปิดดูรายละเอียดร่างข้อความ
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>📧 อีเมลยืนยันจำลองถูกแนบไว้ในระบบเรียบร้อย สามารถใช้เป็นหลักฐานการแจ้งเตือนประชาชนได้</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailDraftsModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow transition-colors cursor-pointer"
              >
                ตกลง / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Print Pending Summary PDF Modal */}
      <OfficerPendingSummaryPdfModal
        isOpen={showPendingSummaryPdfModal}
        onClose={() => setShowPendingSummaryPdfModal(false)}
        requests={requests}
        officerName={currentOfficer?.name || (assignedOfficer || '').trim() || 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV'}
      />

      {/* Approval Management Portal Modal */}
      <OfficerApprovalPortalModal
        isOpen={showApprovalPortalModal}
        onClose={() => setShowApprovalPortalModal(false)}
        requests={requests}
        onRefreshRequests={reloadRequests}
        initialSelectedRequestId={approvalSelectedReqId}
      />

      {/* Officer Pre-Review Inspection Modal */}
      {showPreReviewModal && selectedReq && (
        <PreReviewInspectionModal
          isOpen={showPreReviewModal}
          onClose={() => setShowPreReviewModal(false)}
          request={selectedReq}
          onSaved={(updatedReq) => {
            setSelectedReq(updatedReq);
            reloadRequests();
          }}
          officerName={currentOfficer?.name || (assignedOfficer || '').trim() || 'เจ้าหน้าที่ผู้ตรวจ'}
        />
      )}

      {/* Admin 5-Pillar Verification & Audit Inspection Modal */}
      {showAdminVerificationModal && (
        <AdminRequestVerificationModal
          isOpen={showAdminVerificationModal}
          onClose={() => {
            setShowAdminVerificationModal(false);
            setAdminVerificationReq(null);
          }}
          request={adminVerificationReq || selectedReq || requests[0] || null}
          allRequests={requests}
          initialBatchRequestIds={selectedRequestIds.length > 0 ? selectedRequestIds : undefined}
          onSaved={(updatedReq) => {
            if (selectedReq && selectedReq.id === updatedReq.id) {
              setSelectedReq(updatedReq);
            }
            reloadRequests();
            setSuccessMsg(`🛡️ บันทึกผลการตรวจสอบและกลั่นกรองคำร้อง (Admin Audit) เรียบร้อยแล้ว (เลขที่: ${updatedReq.id})`);
            setTimeout(() => setSuccessMsg(null), 5000);
          }}
          adminName={currentOfficer?.name || (assignedOfficer || '').trim() || 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)'}
          adminPosition={currentOfficer?.position || 'หัวหน้าฝ่ายนิติการและการรักษาความปลอดภัย / ผู้ดูแลระบบ'}
        />
      )}

      {/* Approval Hierarchy Routing Modal */}
      {showApprovalHierarchyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-slate-100 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-2xl border border-blue-400/30 shrink-0">
                  <GitMerge className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    ผังลำดับชั้นการอนุมัติคำร้อง (Approval Hierarchy & Sequential Routing)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    กำหนดและจัดลำดับผู้บังคับบัญชาตามชั้นอำนาจพิจารณา พร้อมการติดตาม Live Routing Path ประจำเทศบาลเมืองชัยภูมิ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApprovalHierarchyModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto flex-1">
              <ApprovalHierarchySection
                adminName={currentOfficer?.name || (assignedOfficer || '').trim() || 'Admin ผู้จัดการคำร้อง'}
                onRequestUpdated={reloadRequests}
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                💡 การแก้ไขผังการอนุมัติจะมีผลต่อการเสนอคำร้องตามสายงานบังคับบัญชาทันที
              </span>
              <button
                type="button"
                onClick={() => setShowApprovalHierarchyModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Approvers & Permissions Management Modal */}
      {showApproversManagementModal && (
        <AdminApproversManagementModal
          isOpen={showApproversManagementModal}
          onClose={() => setShowApproversManagementModal(false)}
          adminName={currentOfficer?.name || (assignedOfficer || '').trim() || 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)'}
          onApproversUpdated={() => {
            reloadRequests();
            setSuccessMsg('🛡️ บันทึกและอัปเดตข้อมูลผู้มีสิทธิ์อนุมัติพร้อมกำหนดสิทธิ์เรียบร้อยแล้ว');
            setTimeout(() => setSuccessMsg(null), 5000);
          }}
        />
      )}

      {/* Admin Folder & Maintenance Reports Archive Hub */}
      {showAdminFolderModal && (
        <AdminFolderSystemModal
          isOpen={showAdminFolderModal}
          onClose={() => setShowAdminFolderModal(false)}
          adminName={currentOfficer?.name || (assignedOfficer || '').trim() || 'นายสมศักดิ์ วงศ์สวรรค์ (Admin)'}
          onSelectRequest={(req) => {
            setSelectedReq(req);
            setShowAdminFolderModal(false);
          }}
        />
      )}

      {/* Request Detail & Processing History Modal */}
      {showDetailModalReq && (
        <RequestDetailModal
          isOpen={!!showDetailModalReq}
          onClose={() => setShowDetailModalReq(null)}
          request={showDetailModalReq}
          defaultTab="processing_history"
          onRequestUpdated={(updated) => {
            reloadRequests();
            setShowDetailModalReq(updated);
            if (selectedReq?.id === updated.id) {
              setSelectedReq(updated);
            }
          }}
        />
      )}

      {/* Firestore 90-Day Archived Requests Hub Modal */}
      {showArchivesModal && (
        <ArchivedRequestsModal
          isOpen={showArchivesModal}
          onClose={() => {
            setShowArchivesModal(false);
            reloadRequests();
          }}
          onViewRequestDetail={(req) => {
            setSelectedReq(req);
            setShowDetailModalReq(req);
          }}
        />
      )}

      {/* Google Forms Workspace Integration Modal */}
      {showGoogleFormsModal && (
        <GoogleFormsManagerModal
          isOpen={showGoogleFormsModal}
          onClose={() => setShowGoogleFormsModal(false)}
          currentRequest={selectedReq}
          onRefreshRequests={reloadRequests}
        />
      )}

      {/* CCTV Equipment CSV Bulk Upload to Firestore Modal (Admin Feature) */}
      {showCctvCsvUploadModal && (
        <CctvEquipmentCsvUploadModal
          isOpen={showCctvCsvUploadModal}
          onClose={() => setShowCctvCsvUploadModal(false)}
          adminName={currentOfficer?.name || 'เจ้าหน้าที่ผู้ดูแลระบบ'}
          onSuccess={(count) => {
            setSuccessMsg(`🚀 นำเข้าและอัปเดตทะเบียนครุภัณฑ์ CCTV สู่ Cloud Firestore สำเร็จ ${count} รายการ เรียบร้อยแล้ว`);
            setTimeout(() => setSuccessMsg(null), 6000);
          }}
        />
      )}

      {/* CCTV Camera CSV Ingestion Modal with Canonical Thai Column Mapping */}
      {showCctvCameraCsvModal && (
        <CctvCameraCsvUploadModal
          isOpen={showCctvCameraCsvModal}
          onClose={() => setShowCctvCameraCsvModal(false)}
          adminName={currentOfficer?.name || 'เจ้าหน้าที่ผู้ดูแลระบบ'}
          onSuccess={(count) => {
            setSuccessMsg(`📷 นำเข้าและแปลงโครงสร้างข้อมูลกล้อง CCTV สำเร็จ ${count} จุด เรียบร้อยแล้ว`);
            setTimeout(() => setSuccessMsg(null), 6000);
          }}
        />
      )}

      {/* Monthly CCTV Requests CSV Export for Record Keeping & Official Reporting */}
      <OfficerMonthlyCctvCsvModal
        isOpen={showMonthlyCsvModal}
        onClose={() => setShowMonthlyCsvModal(false)}
        requests={requests}
        officerName={currentOfficer?.name || (assignedOfficer || '').trim() || 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV'}
        officerRole={officerRole}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
};
