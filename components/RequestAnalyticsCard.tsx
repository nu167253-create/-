import React, { useState, useMemo, useEffect } from 'react';
import { RequestItem, RequestCategory, PriorityLevel, RequestStatus } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Calendar,
  Sparkles,
  TrendingUp,
  Activity,
  Timer,
  Zap,
  Download,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Info,
  Search,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Eye,
  Edit3,
  CheckCircle,
  Tag,
  ListFilter,
  Copy,
  Check,
  SlidersHorizontal,
  FolderOpen,
  FileSpreadsheet,
  FileText,
  FileDown
} from 'lucide-react';
import {
  exportFilteredRequestsToExcel,
  exportFilteredRequestsToCsv,
  FilterSummaryOptions
} from '../utils/csvExport';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
  ComposedChart
} from 'recharts';

export type AnalyticsTimeRange = 'today' | '7days' | '30days' | 'current_month' | 'last_month' | 'custom' | 'all';

export interface RequestAnalyticsCardProps {
  requests: RequestItem[];
  onSelectStatusFilter?: (status: string) => void;
  onSelectCategoryFilter?: (category: string) => void;
  onSelectPriorityFilter?: (priority: string) => void;
  currentStatusFilter?: string;
  currentCategoryFilter?: string;
  currentPriorityFilter?: string;
  onViewRequestDetail?: (request: RequestItem) => void;
  onOpenActionModal?: (request: RequestItem) => void;
  onNavigateToTable?: () => void;
  initialTimeRange?: AnalyticsTimeRange;
  initialStartDate?: string;
  initialEndDate?: string;
  onDateRangeChange?: (rangeType: AnalyticsTimeRange, startDate?: string, endDate?: string) => void;
  onExportData?: (filteredList: RequestItem[], format: 'csv' | 'xlsx', filterDescription: string) => void;
}

// Category Configuration & Colors
const CATEGORY_CONFIG: Record<string, { labelTh: string; color: string; bgLight: string }> = {
  cctv: { labelTh: 'กล้องวงจรปิด CCTV', color: '#0284c7', bgLight: 'bg-sky-50 text-sky-700 border-sky-200' },
  certificate: { labelTh: 'หนังสือรับรองราชการ', color: '#6366f1', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  maintenance: { labelTh: 'แจ้งซ่อมบำรุง/อุปกรณ์', color: '#d97706', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  leave: { labelTh: 'การลา/ปฏิบัติราชการ', color: '#8b5cf6', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  budget: { labelTh: 'ขออนุมัติงบประมาณ', color: '#059669', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  general: { labelTh: 'คำร้องทั่วไป/บริการอื่น', color: '#ec4899', bgLight: 'bg-pink-50 text-pink-700 border-pink-200' },
};

// Priority Configuration & Colors
const PRIORITY_CONFIG: Record<string, { labelTh: string; color: string; bgClass: string }> = {
  urgent: { labelTh: 'ด่วนที่สุด (Urgent)', color: '#ef4444', bgClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  very_urgent: { labelTh: 'ด่วนที่สุด', color: '#ef4444', bgClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  immediate: { labelTh: 'ด่วนที่สุด', color: '#ef4444', bgClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  high: { labelTh: 'ด่วนมาก (High)', color: '#f59e0b', bgClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  medium: { labelTh: 'ปานกลาง (Medium)', color: '#3b82f6', bgClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  normal: { labelTh: 'ปกติ (Normal)', color: '#3b82f6', bgClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  low: { labelTh: 'ปกติ/ต่ำ (Low)', color: '#64748b', bgClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

// Status Configuration
const STATUS_CONFIG: Record<string, { labelTh: string; color: string; bgLight: string }> = {
  submitted: { labelTh: 'ยื่นคำร้องแล้ว', color: '#3b82f6', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  under_review: { labelTh: 'อยู่ระหว่างตรวจสอบ', color: '#f59e0b', bgLight: 'bg-amber-50 text-amber-800 border-amber-200' },
  action_required: { labelTh: 'ขอเอกสารเพิ่มเติม', color: '#a855f7', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  approved: { labelTh: 'อนุมัติแล้ว', color: '#10b981', bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  completed: { labelTh: 'ดำเนินการเสร็จสิ้น', color: '#0d9488', bgLight: 'bg-teal-50 text-teal-800 border-teal-200' },
  rejected: { labelTh: 'ไม่อนุมัติ/สั่งตก', color: '#ef4444', bgLight: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const getFormattedDateStr = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const RequestAnalyticsCard: React.FC<RequestAnalyticsCardProps> = ({
  requests,
  onSelectStatusFilter,
  onSelectCategoryFilter,
  onSelectPriorityFilter,
  currentStatusFilter = 'all',
  currentCategoryFilter = 'all',
  currentPriorityFilter = 'all',
  onViewRequestDetail,
  onOpenActionModal,
  onNavigateToTable,
  initialTimeRange = 'current_month',
  initialStartDate = '',
  initialEndDate = '',
  onDateRangeChange,
  onExportData,
}) => {
  // Navigation tab inside Analytics: All in one, or focused on Trends, Categories, or Response Times
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'trends' | 'categories' | 'response_time'>('overview');
  
  // Date Range and Timeframe State
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(initialTimeRange);
  const [responseTimeUnit, setResponseTimeUnit] = useState<'hours' | 'days'>('hours');

  const now = useMemo(() => new Date(), []);

  const defaultCustomStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return getFormattedDateStr(d);
  }, []);

  const defaultCustomEndDate = useMemo(() => {
    return getFormattedDateStr(new Date());
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(initialStartDate || defaultCustomStartDate);
  const [customEndDate, setCustomEndDate] = useState<string>(initialEndDate || defaultCustomEndDate);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(initialTimeRange === 'custom');

  // Interactive filter state synchronized with props
  const [activeCategory, setActiveCategory] = useState<string>(currentCategoryFilter || 'all');
  const [activeStatus, setActiveStatus] = useState<string>(currentStatusFilter || 'all');
  const [activePriority, setActivePriority] = useState<string>(currentPriorityFilter || 'all');
  const [underlyingSearch, setUnderlyingSearch] = useState<string>('');
  const [underlyingPage, setUnderlyingPage] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUnderlyingSection, setShowUnderlyingSection] = useState<boolean>(true);

  // Export Data state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportScope, setExportScope] = useState<'underlying' | 'timerange' | 'all'>('underlying');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  // Sync state if props change from external components
  useEffect(() => {
    setActiveCategory(currentCategoryFilter || 'all');
  }, [currentCategoryFilter]);

  useEffect(() => {
    setActiveStatus(currentStatusFilter || 'all');
  }, [currentStatusFilter]);

  useEffect(() => {
    setActivePriority(currentPriorityFilter || 'all');
  }, [currentPriorityFilter]);

  useEffect(() => {
    if (initialTimeRange) setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  useEffect(() => {
    if (initialStartDate) setCustomStartDate(initialStartDate);
  }, [initialStartDate]);

  useEffect(() => {
    if (initialEndDate) setCustomEndDate(initialEndDate);
  }, [initialEndDate]);

  const currentMonthName = useMemo(() => {
    return now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  }, [now]);

  const prevMonthDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, [now]);

  const lastMonthName = useMemo(() => {
    return prevMonthDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  }, [prevMonthDate]);

  // Total days in custom date range
  const customRangeDaysCount = useMemo(() => {
    if (!customStartDate || !customEndDate) return 0;
    const s = new Date(customStartDate).getTime();
    const e = new Date(customEndDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [customStartDate, customEndDate]);

  // Human-readable active timeframe label
  const activeTimeframeLabel = useMemo(() => {
    if (timeRange === 'today') return 'วันนี้';
    if (timeRange === '7days') return '7 วันล่าสุด';
    if (timeRange === '30days') return '30 วันล่าสุด';
    if (timeRange === 'current_month') return `เดือนนี้ (${currentMonthName})`;
    if (timeRange === 'last_month') return `เดือนที่แล้ว (${lastMonthName})`;
    if (timeRange === 'all') return 'สะสมทั้งหมดในระบบ';
    if (timeRange === 'custom') {
      if (customStartDate && customEndDate) {
        const s = new Date(customStartDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const e = new Date(customEndDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${s} – ${e} (${customRangeDaysCount} วัน)`;
      }
      if (customStartDate) return `ตั้งแต่ ${customStartDate}`;
      if (customEndDate) return `ถึง ${customEndDate}`;
      return 'กำหนดช่วงวันที่เอง';
    }
    return '';
  }, [timeRange, currentMonthName, lastMonthName, customStartDate, customEndDate, customRangeDaysCount]);

  // Quick preset applicator for custom date picker
  const applyDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'current_month' | 'last_month' | 'quarter' | 'year') => {
    const today = new Date();
    const todayStr = getFormattedDateStr(today);

    if (preset === 'today') {
      setTimeRange('today');
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('today', todayStr, todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getFormattedDateStr(y);
      setTimeRange('custom');
      setCustomStartDate(yStr);
      setCustomEndDate(yStr);
      if (onDateRangeChange) onDateRangeChange('custom', yStr, yStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      const pastStr = getFormattedDateStr(past);
      setTimeRange('7days');
      setCustomStartDate(pastStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('7days', pastStr, todayStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      const pastStr = getFormattedDateStr(past);
      setTimeRange('30days');
      setCustomStartDate(pastStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('30days', pastStr, todayStr);
    } else if (preset === 'current_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstStr = getFormattedDateStr(firstDay);
      setTimeRange('current_month');
      setCustomStartDate(firstStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('current_month', firstStr, todayStr);
    } else if (preset === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      const firstStr = getFormattedDateStr(firstDay);
      const lastStr = getFormattedDateStr(lastDay);
      setTimeRange('last_month');
      setCustomStartDate(firstStr);
      setCustomEndDate(lastStr);
      if (onDateRangeChange) onDateRangeChange('last_month', firstStr, lastStr);
    } else if (preset === 'quarter') {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      const firstDay = new Date(today.getFullYear(), quarterMonth, 1);
      const firstStr = getFormattedDateStr(firstDay);
      setTimeRange('custom');
      setCustomStartDate(firstStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('custom', firstStr, todayStr);
    } else if (preset === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const firstStr = getFormattedDateStr(firstDay);
      setTimeRange('custom');
      setCustomStartDate(firstStr);
      setCustomEndDate(todayStr);
      if (onDateRangeChange) onDateRangeChange('custom', firstStr, todayStr);
    }
  };

  // 1. Filter requests based on selected timeRange & custom dates
  const filteredRequests = useMemo(() => {
    const nowTime = now.getTime();
    return requests.filter((r) => {
      if (!r.createdAt) return true;
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return true;

      if (timeRange === 'today') {
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth() &&
          created.getDate() === now.getDate()
        );
      }
      if (timeRange === '7days') {
        const diffDays = (nowTime - created.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeRange === '30days') {
        const diffDays = (nowTime - created.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (timeRange === 'current_month') {
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
      }
      if (timeRange === 'last_month') {
        return (
          created.getFullYear() === prevMonthDate.getFullYear() &&
          created.getMonth() === prevMonthDate.getMonth()
        );
      }
      if (timeRange === 'custom') {
        if (customStartDate && customEndDate) {
          const start = new Date(`${customStartDate}T00:00:00`).getTime();
          const end = new Date(`${customEndDate}T23:59:59.999`).getTime();
          const c = created.getTime();
          return c >= start && c <= end;
        } else if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`).getTime();
          return created.getTime() >= start;
        } else if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59.999`).getTime();
          return created.getTime() <= end;
        }
        return true;
      }
      return true; // 'all'
    });
  }, [requests, timeRange, now, prevMonthDate, customStartDate, customEndDate]);

  // 2. Compute Response Time Metrics for each request
  const requestsWithMetrics = useMemo(() => {
    const nowTime = now.getTime();

    return filteredRequests.map((r) => {
      const createdTime = new Date(r.createdAt || now).getTime();
      const updatedTime = new Date(r.updatedAt || r.createdAt || now).getTime();

      // First Response Time (hours)
      let firstResponseHours = 0;
      let hasFirstResponse = false;

      if (r.processingHistory && r.processingHistory.length > 1) {
        const firstAction = r.processingHistory[1];
        if (firstAction.timestamp) {
          const firstActionTime = new Date(firstAction.timestamp).getTime();
          firstResponseHours = Math.max(0.5, (firstActionTime - createdTime) / (1000 * 60 * 60));
          hasFirstResponse = true;
        }
      }

      if (!hasFirstResponse) {
        if (r.status !== 'submitted') {
          firstResponseHours = Math.max(1, (updatedTime - createdTime) / (1000 * 60 * 60));
        } else {
          firstResponseHours = Math.max(0.5, (nowTime - createdTime) / (1000 * 60 * 60));
        }
      }

      // Resolution Time (hours)
      let resolutionHours = 0;
      const isResolved = r.status === 'completed' || r.status === 'approved' || r.status === 'rejected';
      if (isResolved) {
        resolutionHours = Math.max(1, (updatedTime - createdTime) / (1000 * 60 * 60));
      } else {
        resolutionHours = Math.max(1, (nowTime - createdTime) / (1000 * 60 * 60));
      }

      // SLA Compliance check (Standard: First response <= 24h, Resolution <= 72h)
      const metFirstResponseSla = firstResponseHours <= 24;
      const metResolutionSla = isResolved ? resolutionHours <= 72 : (nowTime - createdTime) / (1000 * 60 * 60) <= 72;

      return {
        ...r,
        createdDateObj: new Date(r.createdAt || now),
        firstResponseHours: Math.round(firstResponseHours * 10) / 10,
        resolutionHours: Math.round(resolutionHours * 10) / 10,
        isResolved,
        metFirstResponseSla,
        metResolutionSla,
      };
    });
  }, [filteredRequests, now]);

  // 3. Overall KPI Metrics
  const totalCount = requestsWithMetrics.length;
  const overallCount = requests.length;
  const resolvedCount = useMemo(() => requestsWithMetrics.filter((r) => r.isResolved).length, [requestsWithMetrics]);
  const pendingCount = totalCount - resolvedCount;
  const completionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const avgFirstResponseHours = useMemo(() => {
    if (totalCount === 0) return 0;
    const sum = requestsWithMetrics.reduce((acc, curr) => acc + curr.firstResponseHours, 0);
    return Math.round((sum / totalCount) * 10) / 10;
  }, [requestsWithMetrics, totalCount]);

  const avgFirstResponseDays = useMemo(() => {
    return Math.round((avgFirstResponseHours / 24) * 10) / 10;
  }, [avgFirstResponseHours]);

  const avgResolutionHours = useMemo(() => {
    const resolvedItems = requestsWithMetrics.filter((r) => r.isResolved);
    if (resolvedItems.length === 0) return avgFirstResponseHours * 2 || 24;
    const sum = resolvedItems.reduce((acc, curr) => acc + curr.resolutionHours, 0);
    return Math.round((sum / resolvedItems.length) * 10) / 10;
  }, [requestsWithMetrics, avgFirstResponseHours]);

  const avgResolutionDays = useMemo(() => {
    return Math.round((avgResolutionHours / 24) * 10) / 10;
  }, [avgResolutionHours]);

  const slaCompliancePercent = useMemo(() => {
    if (totalCount === 0) return 100;
    const compliantCount = requestsWithMetrics.filter((r) => r.metFirstResponseSla).length;
    return Math.round((compliantCount / totalCount) * 100);
  }, [requestsWithMetrics, totalCount]);

  // 4. SUBMISSION TRENDS DATA PREPARATION (Recharts Area & Bar)
  const submissionTrendData = useMemo(() => {
    const map = new Map<string, { dateStr: string; timestamp: number; submitted: number; resolved: number; cumulative: number }>();

    requestsWithMetrics.forEach((r) => {
      const d = r.createdDateObj;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      if (!map.has(key)) {
        map.set(key, {
          dateStr: label,
          timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          submitted: 0,
          resolved: 0,
          cumulative: 0
        });
      }

      const item = map.get(key)!;
      item.submitted += 1;
      if (r.isResolved) {
        item.resolved += 1;
      }
    });

    const list = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    let runningTotal = 0;
    list.forEach((item) => {
      runningTotal += item.submitted;
      item.cumulative = runningTotal;
    });

    return list;
  }, [requestsWithMetrics]);

  // Weekday distribution
  const weekdayTrendData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    requestsWithMetrics.forEach((r) => {
      const day = r.createdDateObj.getDay();
      counts[day] += 1;
    });

    return [
      { day: 'จันทร์', dayIdx: 1, count: counts[1], fill: '#3b82f6' },
      { day: 'อังคาร', dayIdx: 2, count: counts[2], fill: '#3b82f6' },
      { day: 'พุธ', dayIdx: 3, count: counts[3], fill: '#3b82f6' },
      { day: 'พฤหัสบดี', dayIdx: 4, count: counts[4], fill: '#3b82f6' },
      { day: 'ศุกร์', dayIdx: 5, count: counts[5], fill: '#3b82f6' },
      { day: 'เสาร์', dayIdx: 6, count: counts[6], fill: '#94a3b8' },
      { day: 'อาทิตย์', dayIdx: 0, count: counts[0], fill: '#94a3b8' },
    ];
  }, [requestsWithMetrics]);

  // 5. CATEGORY DISTRIBUTION DATA PREPARATION (Recharts)
  const categoryDistributionData = useMemo(() => {
    const map = new Map<string, { count: number; resolved: number }>();

    requestsWithMetrics.forEach((r) => {
      const cat = r.category || 'general';
      if (!map.has(cat)) {
        map.set(cat, { count: 0, resolved: 0 });
      }
      const item = map.get(cat)!;
      item.count += 1;
      if (r.isResolved) item.resolved += 1;
    });

    return Object.keys(CATEGORY_CONFIG).map((catKey) => {
      const item = map.get(catKey) || { count: 0, resolved: 0 };
      const config = CATEGORY_CONFIG[catKey];
      const percent = totalCount > 0 ? Number(((item.count / totalCount) * 100).toFixed(1)) : 0;

      return {
        categoryId: catKey,
        name: config.labelTh,
        shortName: config.labelTh.split(' ')[0],
        value: item.count,
        count: item.count,
        resolved: item.resolved,
        pending: item.count - item.resolved,
        percentage: percent,
        color: config.color,
      };
    }).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  }, [requestsWithMetrics, totalCount]);

  // Status breakdown for Recharts
  const statusDistributionData = useMemo(() => {
    const map = new Map<string, number>();
    requestsWithMetrics.forEach((r) => {
      map.set(r.status, (map.get(r.status) || 0) + 1);
    });

    return Object.keys(STATUS_CONFIG).map((statusKey) => {
      const val = map.get(statusKey) || 0;
      const percent = totalCount > 0 ? Number(((val / totalCount) * 100).toFixed(1)) : 0;
      return {
        statusKey,
        name: STATUS_CONFIG[statusKey].labelTh,
        value: val,
        count: val,
        percentage: percent,
        color: STATUS_CONFIG[statusKey].color,
      };
    }).filter((item) => item.value > 0);
  }, [requestsWithMetrics, totalCount]);

  // 6. AVERAGE RESPONSE TIMES DATA PREPARATION (Recharts)
  // A. By Category
  const responseTimeByCategoryData = useMemo(() => {
    const map = new Map<string, { firstResponseTotal: number; resolutionTotal: number; count: number; resolvedCount: number }>();

    requestsWithMetrics.forEach((r) => {
      const cat = r.category || 'general';
      if (!map.has(cat)) {
        map.set(cat, { firstResponseTotal: 0, resolutionTotal: 0, count: 0, resolvedCount: 0 });
      }
      const item = map.get(cat)!;
      item.count += 1;
      item.firstResponseTotal += r.firstResponseHours;
      if (r.isResolved) {
        item.resolvedCount += 1;
        item.resolutionTotal += r.resolutionHours;
      }
    });

    return Object.keys(CATEGORY_CONFIG).map((catKey) => {
      const data = map.get(catKey);
      if (!data || data.count === 0) return null;

      const avgFirstResp = Number((data.firstResponseTotal / data.count).toFixed(1));
      const avgResolve = data.resolvedCount > 0 
        ? Number((data.resolutionTotal / data.resolvedCount).toFixed(1)) 
        : avgFirstResp * 2;

      return {
        categoryId: catKey,
        name: CATEGORY_CONFIG[catKey].labelTh,
        shortName: CATEGORY_CONFIG[catKey].labelTh.split(' ')[0],
        avgFirstResponseHours: avgFirstResp,
        avgFirstResponseDays: Number((avgFirstResp / 24).toFixed(1)),
        avgResolutionHours: avgResolve,
        avgResolutionDays: Number((avgResolve / 24).toFixed(1)),
        color: CATEGORY_CONFIG[catKey].color,
        count: data.count,
      };
    }).filter(Boolean) as Array<{
      categoryId: string;
      name: string;
      shortName: string;
      avgFirstResponseHours: number;
      avgFirstResponseDays: number;
      avgResolutionHours: number;
      avgResolutionDays: number;
      color: string;
      count: number;
    }>;
  }, [requestsWithMetrics]);

  // B. By Priority Level
  const responseTimeByPriorityData = useMemo(() => {
    const priorityGroups: Record<string, { label: string; count: number; firstResponseTotal: number; resolutionTotal: number; color: string }> = {
      urgent: { label: 'ด่วนที่สุด (Urgent)', count: 0, firstResponseTotal: 0, resolutionTotal: 0, color: '#ef4444' },
      high: { label: 'ด่วนมาก (High)', count: 0, firstResponseTotal: 0, resolutionTotal: 0, color: '#f59e0b' },
      medium: { label: 'ปานกลาง (Medium)', count: 0, firstResponseTotal: 0, resolutionTotal: 0, color: '#3b82f6' },
      low: { label: 'ปกติ/ต่ำ (Low)', count: 0, firstResponseTotal: 0, resolutionTotal: 0, color: '#64748b' },
    };

    requestsWithMetrics.forEach((r) => {
      const p = r.priority || 'medium';
      let groupKey = 'medium';
      if (p === 'urgent' || p === 'very_urgent' || p === 'immediate') groupKey = 'urgent';
      else if (p === 'high') groupKey = 'high';
      else if (p === 'low') groupKey = 'low';

      const g = priorityGroups[groupKey];
      g.count += 1;
      g.firstResponseTotal += r.firstResponseHours;
      g.resolutionTotal += r.resolutionHours;
    });

    return Object.keys(priorityGroups).map((key) => {
      const g = priorityGroups[key];
      const avgFirst = g.count > 0 ? Number((g.firstResponseTotal / g.count).toFixed(1)) : 0;
      const avgResolve = g.count > 0 ? Number((g.resolutionTotal / g.count).toFixed(1)) : 0;

      return {
        priorityKey: key,
        name: g.label,
        count: g.count,
        avgFirstResponseHours: avgFirst,
        avgFirstResponseDays: Number((avgFirst / 24).toFixed(1)),
        avgResolutionHours: avgResolve,
        avgResolutionDays: Number((avgResolve / 24).toFixed(1)),
        color: g.color,
      };
    }).filter((p) => p.count > 0);
  }, [requestsWithMetrics]);

  // ========================================================
  // INTERACTIVE FILTER HANDLERS
  // ========================================================
  const handleCategoryClick = (categoryId: string) => {
    const nextVal = activeCategory === categoryId ? 'all' : categoryId;
    setActiveCategory(nextVal);
    setUnderlyingPage(1);
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(nextVal);
    }
    setTimeout(() => {
      const el = document.getElementById('underlying-requests-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  const handleStatusClick = (statusKey: string) => {
    const nextVal = activeStatus === statusKey ? 'all' : statusKey;
    setActiveStatus(nextVal);
    setUnderlyingPage(1);
    if (onSelectStatusFilter) {
      onSelectStatusFilter(nextVal);
    }
    setTimeout(() => {
      const el = document.getElementById('underlying-requests-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  const handlePriorityClick = (priorityKey: string) => {
    const nextVal = activePriority === priorityKey ? 'all' : priorityKey;
    setActivePriority(nextVal);
    setUnderlyingPage(1);
    if (onSelectPriorityFilter) {
      onSelectPriorityFilter(nextVal);
    }
    setTimeout(() => {
      const el = document.getElementById('underlying-requests-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  const handleClearAllFilters = () => {
    setActiveCategory('all');
    setActiveStatus('all');
    setActivePriority('all');
    setTimeRange('current_month');
    setShowCustomDatePicker(false);
    setUnderlyingSearch('');
    setUnderlyingPage(1);
    if (onSelectCategoryFilter) onSelectCategoryFilter('all');
    if (onSelectStatusFilter) onSelectStatusFilter('all');
    if (onSelectPriorityFilter) onSelectPriorityFilter('all');
    if (onDateRangeChange) onDateRangeChange('current_month');
  };

  const isDateFiltered = timeRange !== 'all' && timeRange !== 'current_month';
  const hasActiveFilters = activeCategory !== 'all' || activeStatus !== 'all' || activePriority !== 'all' || isDateFiltered;

  // ========================================================
  // UNDERLYING REQUESTS FILTERING & PAGINATION
  // ========================================================
  const underlyingRequests = useMemo(() => {
    return requestsWithMetrics.filter((r) => {
      const matchCat = activeCategory === 'all' || r.category === activeCategory;
      const matchStat = activeStatus === 'all' || r.status === activeStatus;
      const matchPrio = activePriority === 'all' || 
        r.priority === activePriority ||
        (activePriority === 'medium' && r.priority === 'normal') ||
        (activePriority === 'urgent' && (r.priority === 'very_urgent' || r.priority === 'immediate'));

      const term = underlyingSearch.toLowerCase().trim();
      const matchSearch = !term ||
        (r.id || '').toLowerCase().includes(term) ||
        (r.title || '').toLowerCase().includes(term) ||
        (r.reason || '').toLowerCase().includes(term) ||
        (r.applicant?.fullName || '').toLowerCase().includes(term) ||
        (r.applicant?.department || '').toLowerCase().includes(term) ||
        (r.location || '').toLowerCase().includes(term);

      return matchCat && matchStat && matchPrio && matchSearch;
    });
  }, [requestsWithMetrics, activeCategory, activeStatus, activePriority, underlyingSearch]);

  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(underlyingRequests.length / itemsPerPage));
  const paginatedUnderlyingRequests = useMemo(() => {
    const start = (underlyingPage - 1) * itemsPerPage;
    return underlyingRequests.slice(start, start + itemsPerPage);
  }, [underlyingRequests, underlyingPage]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Data Execution Handler
  const handleExecuteExportData = (targetFormat?: 'xlsx' | 'csv', targetScope?: 'underlying' | 'timerange' | 'all') => {
    const chosenFormat = targetFormat || exportFormat;
    const chosenScope = targetScope || exportScope;

    let listToExport: RequestItem[] = [];
    let scopeDesc = '';

    if (chosenScope === 'underlying') {
      listToExport = underlyingRequests;
      scopeDesc = hasActiveFilters ? 'รายการที่กรองตามเงื่อนไข' : `รายการ_${activeTimeframeLabel}`;
    } else if (chosenScope === 'timerange') {
      listToExport = filteredRequests;
      scopeDesc = `รายการทั้งหมด_${activeTimeframeLabel}`;
    } else {
      listToExport = requests;
      scopeDesc = 'คำร้องทั้งหมดในระบบ';
    }

    if (listToExport.length === 0) {
      alert('ไม่พบรายการคำร้องที่ตรงตามเงื่อนไขสำหรับส่งออก');
      return;
    }

    const categoryName = activeCategory !== 'all' ? (CATEGORY_CONFIG[activeCategory]?.labelTh || activeCategory) : undefined;
    const statusName = activeStatus !== 'all' ? (STATUS_CONFIG[activeStatus]?.labelTh || activeStatus) : undefined;
    const priorityName = activePriority !== 'all' ? (PRIORITY_CONFIG[activePriority]?.labelTh || activePriority) : undefined;

    const filterSummary: FilterSummaryOptions = {
      categoryFilter: activeCategory !== 'all' ? activeCategory : undefined,
      statusFilter: activeStatus !== 'all' ? activeStatus : undefined,
      priorityFilter: activePriority !== 'all' ? activePriority : undefined,
      searchTerm: underlyingSearch || undefined,
      startDate: customStartDate || undefined,
      endDate: customEndDate || undefined,
      timeRangeLabel: activeTimeframeLabel,
      totalCount: requests.length,
      officerName: 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV',
      customTitle: categoryName 
        ? `รายงานสรุปรายการคำร้อง - หมวด${categoryName}` 
        : `รายงานสรุปรายการคำร้องและการปฏิบัติงานทางราชการ (${activeTimeframeLabel})`,
      filenamePrefix: activeCategory !== 'all'
        ? `รายงานคำร้อง_${activeCategory}_${chosenFormat === 'xlsx' ? 'Excel' : 'CSV'}`
        : `รายงานคำร้อง_${chosenFormat === 'xlsx' ? 'Excel' : 'CSV'}`
    };

    const filterDesc = [
      activeCategory !== 'all' ? `หมวดหมู่: ${categoryName}` : null,
      activeStatus !== 'all' ? `สถานะ: ${statusName}` : null,
      activePriority !== 'all' ? `ความเร่งด่วน: ${priorityName}` : null,
      `ช่วงเวลา: ${activeTimeframeLabel}`,
      underlyingSearch ? `คำค้นหา: "${underlyingSearch}"` : null
    ].filter(Boolean).join(' | ');

    if (chosenFormat === 'xlsx') {
      exportFilteredRequestsToExcel(listToExport, filterSummary);
      setExportSuccessMsg(`📊 ส่งออกไฟล์ Excel (.xlsx) จำนวน ${listToExport.length} รายการ เรียบร้อยแล้ว`);
    } else {
      exportFilteredRequestsToCsv(listToExport, filterSummary);
      setExportSuccessMsg(`📥 ส่งออกไฟล์ CSV (.csv) จำนวน ${listToExport.length} รายการ เรียบร้อยแล้ว`);
    }

    if (onExportData) {
      onExportData(listToExport, chosenFormat, filterDesc);
    }

    setShowExportModal(false);
    setShowExportDropdown(false);
    setTimeout(() => {
      setExportSuccessMsg(null);
    }, 4500);
  };

  // Custom Tooltips for Recharts
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>วันที่ {label}</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white">{entry.value} รายการ</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-md">
          <p className="font-bold text-sm" style={{ color: data.color }}>{data.name}</p>
          <div className="text-[11px] space-y-1 pt-1 border-t border-slate-800">
            <div className="flex justify-between gap-3 text-slate-300">
              <span>จำนวนคำร้อง:</span>
              <strong className="text-white">{data.count || data.value} เรื่อง</strong>
            </div>
            <div className="flex justify-between gap-3 text-slate-300">
              <span>สัดส่วน:</span>
              <strong className="text-emerald-400">{data.percentage || ((data.value / totalCount) * 100).toFixed(1)}%</strong>
            </div>
            {data.resolved !== undefined && (
              <div className="flex justify-between gap-3 text-slate-300">
                <span>เสร็จสิ้นแล้ว:</span>
                <strong className="text-teal-300">{data.resolved} เรื่อง</strong>
              </div>
            )}
          </div>
          <div className="text-[10px] text-blue-300 pt-1 font-semibold border-t border-slate-800/80">
            👉 คลิกเพื่อกรองและดูรายการคำร้อง
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomResponseTimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 backdrop-blur-md min-w-[200px]">
          <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>{label}</span>
          </div>
          {payload.map((entry: any, index: number) => {
            const isHours = responseTimeUnit === 'hours';
            const unitLabel = isHours ? 'ชั่วโมง' : 'วัน';
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-bold text-white">
                  {entry.value} {unitLabel}
                </span>
              </div>
            );
          })}
          <div className="text-[10px] text-blue-300 pt-1 font-semibold border-t border-slate-800/80">
            👉 คลิกแท่งกราฟเพื่อกรองคำร้องในกลุ่มนี้
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="officer-request-analytics-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white rounded-2xl shadow-md">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                ศูนย์วิเคราะห์ข้อมูลคำร้อง (Request Analytics)
              </h3>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                Date-Range Filter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกช่วงเวลาที่ต้องการวิเคราะห์ หรือคลิกส่วนของแผนภูมิเพื่อเจาะลึก (Drill-Down) ข้อมูลคำร้อง
            </p>
          </div>
        </div>

        {/* Time Filter & SubTab Controllers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Filter Bar */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/80 flex-wrap">
            <button
              onClick={() => {
                setTimeRange('7days');
                setShowCustomDatePicker(false);
                if (onDateRangeChange) onDateRangeChange('7days');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '7days' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => {
                setTimeRange('30days');
                setShowCustomDatePicker(false);
                if (onDateRangeChange) onDateRangeChange('30days');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '30days' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              30 วัน
            </button>
            <button
              onClick={() => {
                setTimeRange('current_month');
                setShowCustomDatePicker(false);
                if (onDateRangeChange) onDateRangeChange('current_month');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                timeRange === 'current_month' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              เดือนนี้
            </button>
            <button
              onClick={() => {
                setTimeRange('last_month');
                setShowCustomDatePicker(false);
                if (onDateRangeChange) onDateRangeChange('last_month');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                timeRange === 'last_month' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
              title={`เดือนที่แล้ว (${lastMonthName})`}
            >
              เดือนที่แล้ว
            </button>
            <button
              onClick={() => {
                const nextCustom = timeRange !== 'custom' || !showCustomDatePicker;
                setTimeRange('custom');
                setShowCustomDatePicker(nextCustom);
                if (onDateRangeChange) onDateRangeChange('custom', customStartDate, customEndDate);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                timeRange === 'custom' 
                  ? 'bg-blue-600 text-white font-bold shadow-xs' 
                  : 'hover:text-slate-900 text-slate-700'
              }`}
              title="เลือกช่วงวันที่เริ่มต้นและสิ้นสุดด้วยตนเอง"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>กำหนดเอง {timeRange === 'custom' && `(${customRangeDaysCount} วัน)`}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showCustomDatePicker && timeRange === 'custom' ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => {
                setTimeRange('all');
                setShowCustomDatePicker(false);
                if (onDateRangeChange) onDateRangeChange('all');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              สะสมทั้งหมด ({overallCount})
            </button>
          </div>

          {/* Unit Switcher (Hours / Days) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/80">
            <button
              onClick={() => setResponseTimeUnit('hours')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                responseTimeUnit === 'hours' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
              title="แสดงระยะเวลาตอบกลับเป็นชั่วโมง"
            >
              ชั่วโมง
            </button>
            <button
              onClick={() => setResponseTimeUnit('days')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                responseTimeUnit === 'days' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
              title="แสดงระยะเวลาตอบกลับเป็นวัน"
            >
              วัน
            </button>
          </div>

          {/* Export Data Dropdown Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
              title="ส่งออกข้อมูลรายงานคำร้องเป็น Excel หรือ CSV ตามช่วงเวลาและตัวกรองที่เลือก"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data</span>
              <span className="bg-emerald-800/60 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-300/30">
                {underlyingRequests.length}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Fast Export Action Dropdown */}
            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 z-40 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-slate-100">
                  <div className="font-extrabold text-slate-800 flex items-center justify-between">
                    <span>ส่งออกข้อมูลรายงาน</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                      {underlyingRequests.length} รายการ
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5" title={activeTimeframeLabel}>
                    🗓️ {activeTimeframeLabel} {activeCategory !== 'all' ? `• หมวด: ${CATEGORY_CONFIG[activeCategory]?.labelTh || activeCategory}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteExportData('xlsx', 'underlying')}
                  className="w-full p-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">ส่งออกเป็น Excel (.xlsx)</div>
                    <div className="text-[10px] text-slate-400">ตารางสีสันสมบูรณ์สำหรับงานสารบรรณ</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteExportData('csv', 'underlying')}
                  className="w-full p-2 hover:bg-blue-50 text-slate-700 hover:text-blue-900 rounded-xl transition-colors flex items-center gap-2.5 text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">ส่งออกเป็น CSV (.csv)</div>
                    <div className="text-[10px] text-slate-400">UTF-8 พร้อม BOM เปิดใน Excel ภาษาไทยไม่เพี้ยน</div>
                  </div>
                </button>

                <div className="border-t border-slate-100 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportDropdown(false);
                      setShowExportModal(true);
                    }}
                    className="w-full py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                    <span>ตัวเลือกการส่งออกขั้นสูง...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Date-Range Picker Sub-Bar */}
      {(showCustomDatePicker || timeRange === 'custom') && (
        <div className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/40 rounded-2xl border border-blue-200/90 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900">ตัวกรองช่วงวันที่ (Date-Range Filter):</span>
                <span className="text-slate-500 ml-1.5 text-[11px]">
                  ระบุวันที่เริ่มต้นและสิ้นสุด หรือกดปุ่มลัดเพื่อกรองแผนภูมิและเมทริกซ์ทั้งหมด
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {customRangeDaysCount > 0 && (
                <span className="bg-white border border-blue-200 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                  🗓️ รวม {customRangeDaysCount} วัน ({activeTimeframeLabel})
                </span>
              )}
              <button
                onClick={() => setShowCustomDatePicker(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="ย่อแถบกำหนดช่วงวันที่"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Start Date */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">เริ่มต้น:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setTimeRange('custom');
                  if (onDateRangeChange) onDateRangeChange('custom', e.target.value, customEndDate);
                }}
                className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
              />
            </div>

            <span className="text-slate-400 font-bold text-xs">ถึง</span>

            {/* End Date */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">สิ้นสุด:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setTimeRange('custom');
                  if (onDateRangeChange) onDateRangeChange('custom', customStartDate, e.target.value);
                }}
                className="text-xs font-semibold text-slate-800 outline-none bg-transparent"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold ml-1">ปุ่มลัด:</span>
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('yesterday')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                เมื่อวาน
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('7days')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('30days')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                30 วัน
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('current_month')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last_month')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                เดือนที่แล้ว
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('quarter')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                ไตรมาสนี้
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('year')}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                ปีนี้ (YTD)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Active Filters Notice Banner */}
      {hasActiveFilters && (
        <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-black text-blue-950">
              <Filter className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>ตัวกรองที่เลือกจากการคลิกแผนภูมิ & ช่วงเวลา:</span>
            </div>

            {isDateFiltered && (
              <span className="inline-flex items-center gap-1 bg-white border border-indigo-300 text-indigo-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                <Calendar className="w-3 h-3 text-indigo-600" />
                <span>ช่วงเวลา: {activeTimeframeLabel}</span>
                <button 
                  onClick={() => {
                    setTimeRange('current_month');
                    setShowCustomDatePicker(false);
                    if (onDateRangeChange) onDateRangeChange('current_month');
                  }}
                  className="hover:bg-indigo-100 rounded-full p-0.5 text-indigo-700 cursor-pointer"
                  title="รีเซ็ตกลับไปเป็นเดือนนี้"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white border border-blue-300 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_CONFIG[activeCategory]?.color || '#3b82f6' }} />
                <span>หมวด: {CATEGORY_CONFIG[activeCategory]?.labelTh || activeCategory}</span>
                <button 
                  onClick={() => handleCategoryClick(activeCategory)}
                  className="hover:bg-blue-100 rounded-full p-0.5 text-blue-600 cursor-pointer"
                  title="ลบตัวกรองหมวดหมู่"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[activeStatus]?.color || '#f59e0b' }} />
                <span>สถานะ: {STATUS_CONFIG[activeStatus]?.labelTh || activeStatus}</span>
                <button 
                  onClick={() => handleStatusClick(activeStatus)}
                  className="hover:bg-amber-100 rounded-full p-0.5 text-amber-700 cursor-pointer"
                  title="ลบตัวกรองสถานะ"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activePriority !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white border border-rose-300 text-rose-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_CONFIG[activePriority]?.color || '#ef4444' }} />
                <span>ความเร่งด่วน: {PRIORITY_CONFIG[activePriority]?.labelTh || activePriority}</span>
                <button 
                  onClick={() => handlePriorityClick(activePriority)}
                  className="hover:bg-rose-100 rounded-full p-0.5 text-rose-700 cursor-pointer"
                  title="ลบตัวกรองความเร่งด่วน"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="text-xs text-blue-700 font-semibold ml-1">
              (พบ <strong>{underlyingRequests.length}</strong> รายการ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExportScope('underlying');
                setShowExportModal(true);
              }}
              className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="ส่งออกรายการตามตัวกรองนี้เป็น Excel หรือ CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export ที่กรอง ({underlyingRequests.length})</span>
            </button>

            <button
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 px-3 py-1 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
            
            {onNavigateToTable && (
              <button
                onClick={onNavigateToTable}
                className="text-xs font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-3 py-1 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>ดูในตารางหลัก</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Top Metric KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Submission Volume */}
        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-4 rounded-2xl border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">คำร้องช่วงเวลาที่เลือก</span>
            <div className="p-1.5 bg-blue-500 text-white rounded-lg shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500">เรื่อง</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-blue-700 font-medium">
            <span>เสร็จสิ้น: {resolvedCount} เรื่อง</span>
            <span className="font-bold bg-blue-100 px-2 py-0.5 rounded-full">{completionRate}%</span>
          </div>
        </div>

        {/* KPI 2: Average First Response Time */}
        <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">ตอบกลับครั้งแรกเฉลี่ย</span>
            <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {responseTimeUnit === 'hours' ? avgFirstResponseHours : avgFirstResponseDays}
            </span>
            <span className="text-xs text-slate-500">
              {responseTimeUnit === 'hours' ? 'ชั่วโมง' : 'วัน'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-amber-800 font-medium">
            <span>เป้าหมาย SLA: ≤ 24 ชม.</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
              {avgFirstResponseHours <= 24 ? 'อยู่ในเกณฑ์' : 'เกินเกณฑ์'}
            </span>
          </div>
        </div>

        {/* KPI 3: Average Resolution Time */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">เวลาปิดงานเฉลี่ย (Resolution)</span>
            <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {responseTimeUnit === 'hours' ? avgResolutionHours : avgResolutionDays}
            </span>
            <span className="text-xs text-slate-500">
              {responseTimeUnit === 'hours' ? 'ชั่วโมง' : 'วัน'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
            <span>เป้าหมาย SLA: ≤ 72 ชม.</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
              {avgResolutionHours <= 72 ? 'รวดเร็ว' : 'ปานกลาง'}
            </span>
          </div>
        </div>

        {/* KPI 4: SLA Compliance Rate */}
        <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/50 p-4 rounded-2xl border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900">ดัชนีผ่านเกณฑ์ SLA</span>
            <div className="p-1.5 bg-purple-500 text-white rounded-lg shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-900">{slaCompliancePercent}%</span>
            <span className="text-xs text-purple-600">ตามมาตรฐาน</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-purple-800 font-medium">
            <span>ค้างดำเนินการ: {pendingCount} เรื่อง</span>
            <span className="font-bold bg-purple-100 px-2 py-0.5 rounded-full">มาตรฐานดีเยี่ยม</span>
          </div>
        </div>

      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAnalyticsSubTab('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            analyticsSubTab === 'overview'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>แดชบอร์ดภาพรวม 3 มิติ</span>
        </button>

        <button
          onClick={() => setAnalyticsSubTab('trends')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            analyticsSubTab === 'trends'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>แนวโน้มการยื่นคำร้อง (Submission Trends)</span>
        </button>

        <button
          onClick={() => setAnalyticsSubTab('categories')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            analyticsSubTab === 'categories'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <PieIcon className="w-3.5 h-3.5" />
          <span>สัดส่วนหมวดหมู่ & สถานะ (Category & Status)</span>
        </button>

        <button
          onClick={() => setAnalyticsSubTab('response_time')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            analyticsSubTab === 'response_time'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>ระยะเวลาตอบกลับเฉลี่ย (Average Response Times)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: SUBMISSION TRENDS (แนวโน้มการยื่นคำร้อง)       */}
      {/* ======================================================== */}
      {(analyticsSubTab === 'overview' || analyticsSubTab === 'trends') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  1. แนวโน้มปริมาณการยื่นคำร้อง (Submission Volume Trends)
                </h4>
                <p className="text-[11px] text-slate-500">
                  กราฟ Recharts Area & Bar Chart แสดงจำนวนคำร้องที่ยื่นใหม่เทียบกับคำร้องที่ดำเนินการเสร็จสิ้น (คลิกที่แผนภูมิเพื่อเจาะลึก)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>รวม {totalCount} เรื่อง ({activeTimeframeLabel})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Main Area Chart: Submissions vs Resolved */}
            <div className="lg:col-span-2 bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>ปริมาณคำร้องรายวัน & การปิดงาน (Daily Submissions vs Resolved)</span>
                <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  ลากเมาส์ดูตัวเลขรายวัน
                </span>
              </div>

              <div className="h-64 w-full pt-1">
                {submissionTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={submissionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradientSubmitted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradientResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="dateStr" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        tickMargin={8}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        allowDecimals={false} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Area 
                        type="monotone" 
                        dataKey="submitted" 
                        name="ยื่นคำร้องใหม่" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#gradientSubmitted)" 
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="resolved" 
                        name="ดำเนินการเสร็จสิ้น" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#gradientResolved)" 
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    ไม่พบข้อมูลคำร้องในช่วงเวลานี้
                  </div>
                )}
              </div>
            </div>

            {/* Weekday Distribution Bar Chart */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>พฤติกรรมการยื่นคำร้องตามวัน (Weekday Pattern)</span>
                <span className="text-[10px] text-blue-600 font-semibold">วันทำงาน vs วันหยุด</span>
              </div>

              <div className="h-64 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      allowDecimals={false} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(val: any) => [`${val} เรื่อง`, 'คำร้อง']} 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {weekdayTrendData.map((entry, idx) => (
                        <Cell 
                          key={`cell-${idx}`} 
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: CATEGORY DISTRIBUTION (การกระจายตามหมวดหมู่)    */}
      {/* ======================================================== */}
      {(analyticsSubTab === 'overview' || analyticsSubTab === 'categories') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <PieIcon className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  2. การกระจายสัดส่วนคำร้องตามหมวดหมู่และสถานะ (Interactive Category & Status Distribution)
                </h4>
                <p className="text-[11px] text-slate-500">
                  คลิกที่ชิ้นเค้กหมวดหมู่ หรือแถบสถานะเพื่อกรองและเรียกดูรายการคำร้องในกลุ่มนั้นๆ ทันที
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
              {categoryDistributionData.length} หมวดหมู่ ({activeTimeframeLabel})
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Donut Pie Chart for Category Distribution */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <PieIcon className="w-3.5 h-3.5 text-indigo-600" />
                  สัดส่วนรายหมวดหมู่ (Category Share %)
                </span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-full">
                  👈 คลิกที่ชิ้นเค้กเพื่อกรอง
                </span>
              </div>

              <div className="h-72 w-full flex items-center justify-center relative">
                {categoryDistributionData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistributionData}
                          cx="50%"
                          cy="48%"
                          innerRadius={65}
                          outerRadius={102}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(entry: any) => {
                            const catId = entry?.categoryId || entry?.payload?.categoryId;
                            if (catId) {
                              handleCategoryClick(catId);
                            }
                          }}
                        >
                          {categoryDistributionData.map((entry, index) => {
                            const isSelected = activeCategory === entry.categoryId;
                            const isDimmed = activeCategory !== 'all' && !isSelected;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke={isSelected ? '#0f172a' : '#ffffff'}
                                strokeWidth={isSelected ? 3.5 : 2}
                                opacity={isDimmed ? 0.35 : 1}
                                className="cursor-pointer transition-all duration-300 hover:opacity-90"
                                onClick={() => handleCategoryClick(entry.categoryId)}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip content={<CustomCategoryTooltip />} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={40} 
                          iconType="circle"
                          iconSize={8}
                          formatter={(value, entry: any) => {
                            const catKey = entry?.payload?.categoryId;
                            const isSelected = activeCategory === catKey;
                            return (
                              <span 
                                onClick={() => catKey && handleCategoryClick(catKey)}
                                className={`text-[11px] font-semibold cursor-pointer transition-colors px-1 py-0.5 rounded ${
                                  isSelected ? 'text-blue-700 bg-blue-100/80 font-black underline' : 'text-slate-700 hover:text-blue-600'
                                }`}
                              >
                                {value}
                              </span>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                      {activeCategory !== 'all' ? (
                        <>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">กำลังกรอง</span>
                          <span className="text-sm font-black text-slate-900 max-w-[130px] truncate text-center">
                            {CATEGORY_CONFIG[activeCategory]?.labelTh.split(' ')[0] || activeCategory}
                          </span>
                          <span className="text-xs font-bold text-slate-600 mt-0.5">
                            {underlyingRequests.length} เรื่อง
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-medium text-slate-400">คำร้องที่วิเคราะห์</span>
                          <span className="text-2xl font-black text-slate-800">{totalCount}</span>
                          <span className="text-[10px] text-blue-600 font-semibold">คลิกชิ้นเค้ก</span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-10">
                    ไม่มีข้อมูลคำร้องในสถิติตามเงื่อนไขที่เลือก
                  </div>
                )}
              </div>
            </div>

            {/* Category Ranking List & Status Distribution Card */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
                    อันดับปริมาณคำร้องรายหมวดหมู่ (Category Ranking)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">คลิกเลือกหมวดหมู่</span>
                </div>

                <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                  {categoryDistributionData.map((cat) => {
                    const isSelected = activeCategory === cat.categoryId;
                    return (
                      <div
                        key={cat.categoryId}
                        onClick={() => handleCategoryClick(cat.categoryId)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/25 shadow-xs' 
                            : 'bg-white hover:bg-slate-100/80 border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: cat.color }} 
                            />
                            <span className={`font-bold ${isSelected ? 'text-blue-900 font-black' : 'text-slate-800'}`}>
                              {cat.name}
                            </span>
                            {isSelected && (
                              <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                กรองอยู่
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{cat.count} เรื่อง</span>
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md border border-slate-200">
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                            className="h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Breakdown Segment Bar */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    สัดส่วนสถานะงาน (คลิกเพื่อกรองสถานะ)
                  </span>
                  {activeStatus !== 'all' && (
                    <button
                      onClick={() => handleStatusClick(activeStatus)}
                      className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      ล้างสถานะ
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {Object.keys(STATUS_CONFIG).map((statusKey) => {
                    const cfg = STATUS_CONFIG[statusKey];
                    const count = requestsWithMetrics.filter(r => r.status === statusKey).length;
                    const isSelected = activeStatus === statusKey;

                    return (
                      <button
                        key={statusKey}
                        onClick={() => handleStatusClick(statusKey)}
                        className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-blue-500/30'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                        title={`กรองสถานะ: ${cfg.labelTh}`}
                      >
                        <span 
                          className="w-2 h-2 rounded-full mb-1" 
                          style={{ backgroundColor: cfg.color }} 
                        />
                        <span className={`text-[10px] font-bold truncate max-w-full ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {cfg.labelTh.split(' ')[0]}
                        </span>
                        <span className={`text-[11px] font-black ${isSelected ? 'text-sky-300' : 'text-slate-600'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: AVERAGE RESPONSE TIMES (ระยะเวลาตอบกลับเฉลี่ย)  */}
      {/* ======================================================== */}
      {(analyticsSubTab === 'overview' || analyticsSubTab === 'response_time') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <Timer className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  3. ระยะเวลาตอบกลับและปิดงานเฉลี่ย (Average Response & Resolution Times)
                </h4>
                <p className="text-[11px] text-slate-500">
                  คลิกแท่งกราฟหมวดหมู่ หรือแท่งความเร่งด่วน เพื่อดูรายการคำร้องในกลุ่มเวลานั้นๆ ({activeTimeframeLabel})
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>หน่วย: {responseTimeUnit === 'hours' ? 'ชั่วโมง (Hours)' : 'วัน (Days)'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Chart 1: Average Response Time by Category */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>ระยะเวลาตอบกลับเฉลี่ยแยกตามหมวดหมู่ (Response Time by Category)</span>
                <span className="text-[10px] text-blue-600 font-semibold">คลิกแท่งเพื่อกรอง</span>
              </div>

              <div className="h-72 w-full pt-1">
                {responseTimeByCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={responseTimeByCategoryData} 
                      margin={{ top: 15, right: 15, left: -20, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="shortName" 
                        tick={{ fontSize: 10, fill: '#475569' }} 
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomResponseTimeTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        height={32} 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px' }} 
                      />
                      <Bar 
                        dataKey={responseTimeUnit === 'hours' ? 'avgFirstResponseHours' : 'avgFirstResponseDays'} 
                        name="เวลาตอบกลับแรก" 
                        fill="#3b82f6" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={30}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.categoryId) {
                            handleCategoryClick(entry.categoryId);
                          }
                        }}
                      >
                        {responseTimeByCategoryData.map((entry, idx) => (
                          <Cell 
                            key={`cell-resp-1-${idx}`} 
                            fill={entry.color}
                            opacity={activeCategory !== 'all' && activeCategory !== entry.categoryId ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey={responseTimeUnit === 'hours' ? 'avgResolutionHours' : 'avgResolutionDays'} 
                        name="เวลาดำเนินการเสร็จสิ้น" 
                        fill="#10b981" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={30}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.categoryId) {
                            handleCategoryClick(entry.categoryId);
                          }
                        }}
                      >
                        {responseTimeByCategoryData.map((entry, idx) => (
                          <Cell 
                            key={`cell-resp-2-${idx}`} 
                            fill="#10b981"
                            opacity={activeCategory !== 'all' && activeCategory !== entry.categoryId ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                      {/* SLA Reference Line (24 hours or 1 day) */}
                      <ReferenceLine 
                        y={responseTimeUnit === 'hours' ? 24 : 1} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4"
                        label={{ 
                          value: responseTimeUnit === 'hours' ? 'SLA 24 ชม.' : 'SLA 1 วัน', 
                          position: 'right', 
                          fill: '#ef4444', 
                          fontSize: 10,
                          fontWeight: 'bold'
                        }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    ไม่มีข้อมูลสำหรับคำนวณระยะเวลา
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Average Response Time by Priority Level */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>ระยะเวลาตอบกลับจำแนกตามความเร่งด่วน (Response Time by Priority)</span>
                <span className="text-[10px] text-blue-600 font-semibold">คลิกแท่งเพื่อกรอง</span>
              </div>

              <div className="h-72 w-full pt-1">
                {responseTimeByPriorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={responseTimeByPriorityData} 
                      margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#475569' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomResponseTimeTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        height={32} 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '11px' }} 
                      />
                      <Bar 
                        dataKey={responseTimeUnit === 'hours' ? 'avgFirstResponseHours' : 'avgFirstResponseDays'} 
                        name="เวลาตอบกลับแรก" 
                        fill="#f59e0b" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={35}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.priorityKey) {
                            handlePriorityClick(entry.priorityKey);
                          }
                        }}
                      >
                        {responseTimeByPriorityData.map((entry, idx) => (
                          <Cell 
                            key={`cell-prio-1-${idx}`} 
                            fill={entry.color}
                            opacity={activePriority !== 'all' && activePriority !== entry.priorityKey ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey={responseTimeUnit === 'hours' ? 'avgResolutionHours' : 'avgResolutionDays'} 
                        name="เวลาปิดงาน" 
                        fill="#059669" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={35}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.priorityKey) {
                            handlePriorityClick(entry.priorityKey);
                          }
                        }}
                      >
                        {responseTimeByPriorityData.map((entry, idx) => (
                          <Cell 
                            key={`cell-prio-2-${idx}`} 
                            fill="#059669"
                            opacity={activePriority !== 'all' && activePriority !== entry.priorityKey ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    ไม่มีข้อมูลสำหรับคำนวณความเร่งด่วน
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Response Time Highlights & Policy Note */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                ข้อกำหนดมาตรฐานการให้บริการ (Service Level Agreement - SLA เทศบาลเมืองชัยภูมิ):
              </p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                • <strong>คำร้องขอดูภาพ CCTV:</strong> ตอบกลับภายใน 24 ชม. และส่งมอบภาพหรือสำเนาภายใน 48-72 ชม. (ข้อมูลจัดเก็บในระบบบันทึก 30 วัน)<br />
                • <strong>คำร้องด่วนพิเศษ (อุบัติเหตุ/คดีอาญา):</strong> ดำเนินการตรวจสอบและประสานสถานีตำรวจภูธรเมืองชัยภูมิทันทีภายใน 12 ชม.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: UNDERLYING REQUESTS DRILL-DOWN LIST           */}
      {/* ======================================================== */}
      <div 
        id="underlying-requests-section" 
        className="mt-6 pt-5 border-t border-slate-200/90 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-extrabold text-white tracking-tight">
                  รายการคำร้องตามส่วนของกราฟที่เลือก (Underlying Requests)
                </h4>
                <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {underlyingRequests.length} รายการ
                </span>
                <span className="bg-indigo-700/70 text-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/40">
                  {activeTimeframeLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {hasActiveFilters ? (
                  <span>
                    แสดงผลลัพธ์เฉพาะกลุ่ม:{' '}
                    {activeCategory !== 'all' && <strong>{CATEGORY_CONFIG[activeCategory]?.labelTh} </strong>}
                    {activeStatus !== 'all' && <strong>• สถานะ: {STATUS_CONFIG[activeStatus]?.labelTh} </strong>}
                    {activePriority !== 'all' && <strong>• ความเร่งด่วน: {PRIORITY_CONFIG[activePriority]?.labelTh} </strong>}
                    {isDateFiltered && <strong>• ช่วงเวลา: {activeTimeframeLabel}</strong>}
                  </span>
                ) : (
                  <span>แสดงคำร้องทั้งหมดในช่วงเวลาที่เลือก (คลิกที่ส่วนใดส่วนหนึ่งของกราฟเพื่อกรองเฉพาะกลุ่ม)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export buttons for this group */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExecuteExportData('xlsx', 'underlying')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                title="ดาวน์โหลดรายการในกลุ่มนี้เป็นไฟล์ Excel (.xlsx) ทันที"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExecuteExportData('csv', 'underlying')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-100 bg-blue-700/80 hover:bg-blue-600 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 border border-blue-500/30"
                title="ดาวน์โหลดรายการในกลุ่มนี้เป็นไฟล์ CSV (.csv) ทันที"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportScope('underlying');
                  setShowExportModal(true);
                }}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-700"
                title="เปิดหน้าต่างตัวเลือกส่งออกข้อมูล"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>แสดงทั้งหมด</span>
              </button>
            )}

            {onNavigateToTable && (
              <button
                onClick={onNavigateToTable}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <span>เปิดในตารางสารบรรณเต็ม</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowUnderlyingSection(!showUnderlyingSection)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
              title={showUnderlyingSection ? 'ย่อรายการ' : 'ขยายรายการ'}
            >
              {showUnderlyingSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {showUnderlyingSection && (
          <div className="space-y-3">
            {/* Quick Search and Filter Tags inside Drill-Down */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="ค้นหารายการในกลุ่มนี้ (Tracking ID, เรื่อง, ชื่อผู้ยื่น, สถานที่)..."
                  value={underlyingSearch}
                  onChange={(e) => {
                    setUnderlyingSearch(e.target.value);
                    setUnderlyingPage(1);
                  }}
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                {underlyingSearch && (
                  <button
                    onClick={() => setUnderlyingSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Category switcher pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">หมวดหมู่:</span>
                <button
                  onClick={() => handleCategoryClick('all')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                    activeCategory === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  ทั้งหมด
                </button>
                {Object.keys(CATEGORY_CONFIG).map((catKey) => {
                  const cfg = CATEGORY_CONFIG[catKey];
                  const isSelected = activeCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => handleCategoryClick(catKey)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {cfg.labelTh.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Request Cards Grid */}
            {paginatedUnderlyingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedUnderlyingRequests.map((req) => {
                  const catConfig = CATEGORY_CONFIG[req.category] || CATEGORY_CONFIG.general;
                  const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.under_review;
                  const priorityConfig = PRIORITY_CONFIG[req.priority || 'medium'] || PRIORITY_CONFIG.medium;
                  const createdStr = req.createdDateObj.toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  });

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                    >
                      {/* Top Header: ID & Badges */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <span>{req.id}</span>
                            <button
                              onClick={(e) => handleCopyId(req.id, e)}
                              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="คัดลอกรหัสคำร้อง"
                            >
                              {copiedId === req.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bgLight}`}>
                            {statusConfig.labelTh}
                          </span>
                        </div>

                        {/* Title & Reason */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 line-clamp-2 transition-colors">
                            {req.title}
                          </h5>
                          {req.reason && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {req.reason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Category, Priority, Applicant */}
                      <div className="space-y-2 text-[11px] pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${catConfig.bgLight}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catConfig.color }} />
                            {catConfig.labelTh}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityConfig.bgClass}`}>
                            {priorityConfig.labelTh}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <span className="truncate max-w-[140px]">
                            👤 {req.applicant?.fullName || 'ไม่ระบุผู้ยื่น'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {createdStr}
                          </span>
                        </div>

                        {/* SLA Indicator */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-50 p-1.5 rounded-lg">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Timer className="w-3 h-3 text-amber-500" />
                            เวลาตอบกลับ:
                          </span>
                          <span className="font-bold text-slate-800">
                            {req.firstResponseHours} ชม.
                            {req.metFirstResponseSla ? (
                              <span className="text-emerald-600 font-bold ml-1">✓ ในเกณฑ์</span>
                            ) : (
                              <span className="text-rose-500 font-bold ml-1">เกินเกณฑ์</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {onViewRequestDetail && (
                          <button
                            onClick={() => onViewRequestDetail(req)}
                            className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูรายละเอียด</span>
                          </button>
                        )}
                        {onOpenActionModal && (
                          <button
                            onClick={() => onOpenActionModal(req)}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="จัดการ/อัปเดตสถานะ"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-700">ไม่พบรายการคำร้องที่ตรงตามเงื่อนไขตัวกรองและช่วงเวลา</p>
                <p className="text-[11px] text-slate-400">
                  ลองปรับเปลี่ยนช่วงเวลาวันที่ หรือคลิกปุ่ม "ล้างตัวกรองทั้งหมด" เพื่อแสดงรายการคำร้องทั้งหมด
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ล้างตัวกรองเพื่อแสดงทั้งหมด</span>
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs pt-2 px-1 text-slate-500">
                <span>
                  แสดง {(underlyingPage - 1) * itemsPerPage + 1} - {Math.min(underlyingPage * itemsPerPage, underlyingRequests.length)} จาก {underlyingRequests.length} รายการ
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUnderlyingPage((p) => Math.max(1, p - 1))}
                    disabled={underlyingPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs font-bold"
                  >
                    ย้อนกลับ
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    {underlyingPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setUnderlyingPage((p) => Math.min(totalPages, p + 1))}
                    disabled={underlyingPage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-xs font-bold"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Success Toast Banner */}
      {exportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-100">{exportSuccessMsg}</div>
            <div className="text-[10px] text-slate-400">ไฟล์พร้อมใช้งานในโฟลเดอร์ Downloads ของท่าน</div>
          </div>
          <button
            onClick={() => setExportSuccessMsg(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    ส่งออกข้อมูลรายงานคำร้อง (Export Request Logs)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    ดาวน์โหลดรายงานคำร้องราชการตามช่วงเวลาและตัวกรองที่เลือก
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Format Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  1. เลือกรูปแบบไฟล์ (File Format):
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportFormat === 'xlsx'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold text-emerald-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-800">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Excel (.xlsx)
                      </span>
                      {exportFormat === 'xlsx' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      ตารางสวยงามพร้อมช่องข้อมูลทางการ, สรุป KPI สถิติด้านบน, รองรับ Microsoft Excel
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 font-bold text-blue-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 text-blue-800">
                        <FileText className="w-4 h-4 text-blue-600" />
                        CSV (.csv)
                      </span>
                      {exportFormat === 'csv' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      มาตรฐาน UTF-8 พร้อม BOM สำหรับเปิดภาษาไทยไม่เป็นภาษาต่างดาว นำเข้าฐานข้อมูลได้
                    </div>
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  2. เลือกขอบเขตข้อมูลที่จะส่งออก (Export Scope):
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    exportScope === 'underlying' 
                      ? 'bg-blue-50/70 border-blue-300 font-semibold text-blue-950 ring-1 ring-blue-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="cardExportScope"
                      checked={exportScope === 'underlying'}
                      onChange={() => setExportScope('underlying')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">
                          รายการตามเงื่อนไขที่กรองในขณะนี้
                        </span>
                        <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                          {underlyingRequests.length} รายการ
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ช่วงเวลา: <strong>{activeTimeframeLabel}</strong>
                        {activeCategory !== 'all' && <> • หมวด: <strong>{CATEGORY_CONFIG[activeCategory]?.labelTh}</strong></>}
                        {activeStatus !== 'all' && <> • สถานะ: <strong>{STATUS_CONFIG[activeStatus]?.labelTh}</strong></>}
                        {underlyingSearch && <> • ค้นหา: <strong>"{underlyingSearch}"</strong></>}
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    exportScope === 'timerange' 
                      ? 'bg-indigo-50/70 border-indigo-300 font-semibold text-indigo-950 ring-1 ring-indigo-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="cardExportScope"
                      checked={exportScope === 'timerange'}
                      onChange={() => setExportScope('timerange')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">
                          รายการทั้งหมดในช่วงเวลาที่เลือก (ทุกหมวดและสถานะ)
                        </span>
                        <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                          {filteredRequests.length} รายการ
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ช่วงเวลา: <strong>{activeTimeframeLabel}</strong> (ไม่จำกัดเฉพาะหมวดหมู่ที่คลิก)
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    exportScope === 'all' 
                      ? 'bg-amber-50/70 border-amber-300 font-semibold text-amber-950 ring-1 ring-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="cardExportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">
                          ข้อมูลคำร้องทั้งหมดในระบบ (All Records)
                        </span>
                        <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                          {requests.length} รายการ
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ส่งออกฐานข้อมูลคำร้องทั้งหมดทุกช่วงเวลาและทุกสถานะ
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Summary Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>ข้อมูลที่รวมในรายงาน:</span>
                </div>
                <div className="text-slate-500 leading-relaxed text-[10px]">
                  Tracking ID, วันที่ยื่นคำร้อง, หมวดหมู่งาน, รายละเอียดคำร้อง, ชื่อผู้ยื่น, เบอร์โทร/อีเมล, สถานะ, ความเร่งด่วน, SLA วันดำเนินการ, หมายเหตุเจ้าหน้าที่, และผลการประเมิน
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleExecuteExportData()}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>
                  ดาวน์โหลดไฟล์ {exportFormat === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
