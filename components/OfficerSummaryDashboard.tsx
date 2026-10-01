import React, { useState, useMemo } from 'react';
import { RequestItem, RequestCategory, PriorityLevel } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Zap, 
  Layers, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  PieChart as PieIcon,
  RefreshCw,
  Sliders,
  Target,
  FileCheck2,
  Award,
  Timer
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  ReferenceLine
} from 'recharts';

interface OfficerSummaryDashboardProps {
  requests: RequestItem[];
  onSelectStatusFilter?: (status: string) => void;
  onSelectCategoryFilter?: (category: string) => void;
  onSelectPriorityFilter?: (priority: string) => void;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const CATEGORY_NAMES: Record<string, string> = {
  cctv: 'กล้อง CCTV',
  certificate: 'หนังสือรับรอง',
  leave: 'การลา/เวลาทำงาน',
  maintenance: 'แจ้งซ่อม IT/อาคาร',
  budget: 'เบิกจ่ายงบประมาณ',
  general: 'คำร้องทั่วไป'
};

const CATEGORY_COLORS: Record<string, string> = {
  cctv: '#0284c7',       // Sky 600
  certificate: '#6366f1',// Indigo 500
  leave: '#8b5cf6',      // Violet 500
  maintenance: '#d97706',// Amber 600
  budget: '#059669',     // Emerald 600
  general: '#ec4899',    // Pink 500
};

export const OfficerSummaryDashboard: React.FC<OfficerSummaryDashboardProps> = ({
  requests,
  onSelectStatusFilter,
  onSelectCategoryFilter,
  onSelectPriorityFilter
}) => {
  // Filter & Display States
  const [timeRange, setTimeRange] = useState<'all' | 'year' | '90days' | '30days'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [timeUnit, setTimeUnit] = useState<'hours' | 'days'>('hours');
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'resolved' | 'response' | 'category' | 'sla'>('all');
  const [slaBenchmarkHours, setSlaBenchmarkHours] = useState<number>(24); // Standard 24h for first response, 72h for resolution

  // 1. Filtered Requests by Time Range, Category, Priority
  const filteredRequests = useMemo(() => {
    const now = new Date();
    return requests.filter((r) => {
      // Category filter
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      // Priority filter
      if (selectedPriority !== 'all' && r.priority !== selectedPriority) return false;

      // Time range filter
      if (!r.createdAt) return true;
      const created = new Date(r.createdAt);
      if (isNaN(created.getTime())) return true;

      if (timeRange === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return created >= past30;
      }
      if (timeRange === '90days') {
        const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return created >= past90;
      }
      if (timeRange === 'year') {
        return created.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [requests, timeRange, selectedCategory, selectedPriority]);

  // 2. Compute Durations & Metrics for each Request
  const requestsWithMetrics = useMemo(() => {
    const now = new Date().getTime();

    return filteredRequests.map((r) => {
      const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : now;
      const updatedTime = r.updatedAt ? new Date(r.updatedAt).getTime() : createdTime;

      // Calculate First Response Time (in Hours)
      let firstResponseTimeHours = 0;
      let hasFirstResponse = false;

      if (r.statusHistory && r.statusHistory.length > 1) {
        // Find first entry after submitted
        const firstAction = r.statusHistory.find(
          (h) => h.status !== 'submitted' && h.timestamp
        );
        if (firstAction && firstAction.timestamp) {
          const actionTime = new Date(firstAction.timestamp).getTime();
          firstResponseTimeHours = Math.max(0.1, (actionTime - createdTime) / (1000 * 60 * 60));
          hasFirstResponse = true;
        }
      }

      if (!hasFirstResponse) {
        if (r.status !== 'submitted') {
          // If status is progressed but history is concise
          firstResponseTimeHours = Math.max(0.5, (updatedTime - createdTime) / (1000 * 60 * 60));
          hasFirstResponse = true;
        } else {
          // Still waiting for first response
          firstResponseTimeHours = Math.max(0.1, (now - createdTime) / (1000 * 60 * 60));
        }
      }

      // Calculate Resolution Time (in Hours and Days)
      const isResolved = r.status === 'completed' || r.status === 'approved' || r.status === 'closed';
      let resolutionTimeHours = 0;

      if (isResolved) {
        // Find resolution timestamp
        let resolveTime = updatedTime;
        if (r.statusHistory && r.statusHistory.length > 0) {
          const resolveEntry = [...r.statusHistory].reverse().find(
            (h) => h.status === 'completed' || h.status === 'approved' || h.status === 'closed'
          );
          if (resolveEntry && resolveEntry.timestamp) {
            resolveTime = new Date(resolveEntry.timestamp).getTime();
          }
        }
        resolutionTimeHours = Math.max(1, (resolveTime - createdTime) / (1000 * 60 * 60));
      } else {
        // Active Aging duration
        resolutionTimeHours = Math.max(1, (now - createdTime) / (1000 * 60 * 60));
      }

      const resolutionTimeDays = Number((resolutionTimeHours / 24).toFixed(1));
      const firstResponseTimeDays = Number((firstResponseTimeHours / 24).toFixed(1));

      // SLA Targets (Urgent: 12h response / 24h resolve; High: 24h response / 48h resolve; Normal: 48h response / 72h resolve)
      const maxTargetHours = (r.priority === 'urgent' || r.priority === 'very_urgent') ? 24 : (r.priority === 'high' ? 48 : 72);
      const isWithinSla = isResolved ? resolutionTimeHours <= maxTargetHours : resolutionTimeHours <= maxTargetHours;

      return {
        ...r,
        firstResponseTimeHours: Number(firstResponseTimeHours.toFixed(1)),
        firstResponseTimeDays,
        resolutionTimeHours: Number(resolutionTimeHours.toFixed(1)),
        resolutionTimeDays,
        isResolved,
        isWithinSla,
        createdDateObj: new Date(createdTime),
      };
    });
  }, [filteredRequests]);

  // 3. High-Level Summary KPI Metrics
  const totalCount = requestsWithMetrics.length;
  const resolvedRequests = requestsWithMetrics.filter((r) => r.isResolved);
  const resolvedCount = resolvedRequests.length;
  const pendingCount = totalCount - resolvedCount;

  // Average Response Time
  const avgResponseHours = useMemo(() => {
    if (requestsWithMetrics.length === 0) return 0;
    const sum = requestsWithMetrics.reduce((acc, curr) => acc + curr.firstResponseTimeHours, 0);
    return Number((sum / requestsWithMetrics.length).toFixed(1));
  }, [requestsWithMetrics]);

  const avgResponseDays = useMemo(() => {
    return Number((avgResponseHours / 24).toFixed(1));
  }, [avgResponseHours]);

  // Average Resolution Time (for resolved requests)
  const avgResolutionHours = useMemo(() => {
    if (resolvedRequests.length === 0) return 0;
    const sum = resolvedRequests.reduce((acc, curr) => acc + curr.resolutionTimeHours, 0);
    return Number((sum / resolvedRequests.length).toFixed(1));
  }, [resolvedRequests]);

  const avgResolutionDays = useMemo(() => {
    return Number((avgResolutionHours / 24).toFixed(1));
  }, [avgResolutionHours]);

  // SLA Compliance Rate
  const slaComplianceRate = useMemo(() => {
    if (resolvedRequests.length === 0) return totalCount > 0 ? 100 : 0;
    const compliant = resolvedRequests.filter((r) => r.isWithinSla).length;
    return Math.round((compliant / resolvedRequests.length) * 100);
  }, [resolvedRequests, totalCount]);

  // Resolution Rate %
  const resolutionRatePercent = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((resolvedCount / totalCount) * 100);
  }, [totalCount, resolvedCount]);

  // 4. DATA AGGREGATION: MONTHLY RESOLVED & INFLOW TRENDS
  const monthlyMetricsData = useMemo(() => {
    const monthlyMap: Record<string, {
      year: number;
      month: number;
      monthKey: string;
      monthLabel: string;
      inflowCount: number;
      resolvedCount: number;
      pendingCount: number;
      avgResponseHours: number;
      avgResolutionDays: number;
      responseSumHours: number;
      resolutionSumDays: number;
      resolvedItemsCount: number;
      slaMetCount: number;
    }> = {};

    requestsWithMetrics.forEach((r) => {
      const year = r.createdDateObj.getFullYear();
      const month = r.createdDateObj.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const thaiYear = (year + 543) % 100;
      const monthLabel = `${THAI_MONTHS_SHORT[month]} ${thaiYear}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          year,
          month,
          monthKey,
          monthLabel,
          inflowCount: 0,
          resolvedCount: 0,
          pendingCount: 0,
          avgResponseHours: 0,
          avgResolutionDays: 0,
          responseSumHours: 0,
          resolutionSumDays: 0,
          resolvedItemsCount: 0,
          slaMetCount: 0,
        };
      }

      monthlyMap[monthKey].inflowCount += 1;
      monthlyMap[monthKey].responseSumHours += r.firstResponseTimeHours;

      if (r.isResolved) {
        monthlyMap[monthKey].resolvedCount += 1;
        monthlyMap[monthKey].resolutionSumDays += r.resolutionTimeDays;
        monthlyMap[monthKey].resolvedItemsCount += 1;
        if (r.isWithinSla) monthlyMap[monthKey].slaMetCount += 1;
      } else {
        monthlyMap[monthKey].pendingCount += 1;
      }
    });

    // Ensure at least last 6 months exist if sparse data
    if (Object.keys(monthlyMap).length === 0) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const thaiY = (y + 543) % 100;
        monthlyMap[key] = {
          year: y,
          month: m,
          monthKey: key,
          monthLabel: `${THAI_MONTHS_SHORT[m]} ${thaiY}`,
          inflowCount: 0,
          resolvedCount: 0,
          pendingCount: 0,
          avgResponseHours: 0,
          avgResolutionDays: 0,
          responseSumHours: 0,
          resolutionSumDays: 0,
          resolvedItemsCount: 0,
          slaMetCount: 0,
        };
      }
    }

    // Finalize averages and percentages
    const sorted = Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return sorted.map((m) => {
      const avgResp = m.inflowCount > 0 ? Number((m.responseSumHours / m.inflowCount).toFixed(1)) : 0;
      const avgResol = m.resolvedItemsCount > 0 ? Number((m.resolutionSumDays / m.resolvedItemsCount).toFixed(1)) : 0;
      const resolutionRate = m.inflowCount > 0 ? Math.min(100, Math.round((m.resolvedCount / m.inflowCount) * 100)) : 0;
      const slaRate = m.resolvedItemsCount > 0 ? Math.round((m.slaMetCount / m.resolvedItemsCount) * 100) : 100;

      return {
        ...m,
        avgResponseHours: avgResp,
        avgResponseDays: Number((avgResp / 24).toFixed(1)),
        avgResolutionDays: avgResol,
        resolutionRate,
        slaRate,
      };
    });
  }, [requestsWithMetrics]);

  // Top resolved month
  const topResolvedMonth = useMemo(() => {
    if (monthlyMetricsData.length === 0) return { monthLabel: '-', resolvedCount: 0 };
    return [...monthlyMetricsData].sort((a, b) => b.resolvedCount - a.resolvedCount)[0];
  }, [monthlyMetricsData]);

  // 5. DATA AGGREGATION: CATEGORY PERFORMANCE & RESOLUTION TIME
  const categoryPerformanceData = useMemo(() => {
    const catMap: Record<string, {
      id: string;
      name: string;
      total: number;
      resolved: number;
      pending: number;
      responseSum: number;
      resolutionSum: number;
      color: string;
    }> = {};

    REQUEST_CATEGORIES.forEach((c) => {
      catMap[c.id] = {
        id: c.id,
        name: c.titleTh,
        total: 0,
        resolved: 0,
        pending: 0,
        responseSum: 0,
        resolutionSum: 0,
        color: CATEGORY_COLORS[c.id] || '#0284c7',
      };
    });

    requestsWithMetrics.forEach((r) => {
      const catKey = r.category || 'general';
      if (!catMap[catKey]) {
        catMap[catKey] = {
          id: catKey,
          name: CATEGORY_NAMES[catKey] || catKey,
          total: 0,
          resolved: 0,
          pending: 0,
          responseSum: 0,
          resolutionSum: 0,
          color: CATEGORY_COLORS[catKey] || '#64748b',
        };
      }

      catMap[catKey].total += 1;
      catMap[catKey].responseSum += r.firstResponseTimeHours;

      if (r.isResolved) {
        catMap[catKey].resolved += 1;
        catMap[catKey].resolutionSum += r.resolutionTimeHours;
      } else {
        catMap[catKey].pending += 1;
      }
    });

    return Object.values(catMap)
      .filter((c) => c.total > 0)
      .map((c) => {
        const avgResp = c.total > 0 ? Number((c.responseSum / c.total).toFixed(1)) : 0;
        const avgResolHours = c.resolved > 0 ? Number((c.resolutionSum / c.resolved).toFixed(1)) : 0;
        const avgResolDays = Number((avgResolHours / 24).toFixed(1));
        const rate = c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0;

        return {
          ...c,
          avgResponseHours: avgResp,
          avgResolutionHours: avgResolHours,
          avgResolutionDays: avgResolDays,
          resolutionRate: rate,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [requestsWithMetrics]);

  // 6. SLA BREAKDOWN DISTRIBUTION
  const slaBreakdownData = useMemo(() => {
    let fastCount = 0;     // < 12 Hours
    let standardCount = 0; // 12 - 24 Hours
    let normalCount = 0;   // 24 - 48 Hours
    let extendedCount = 0; // > 48 Hours

    requestsWithMetrics.forEach((r) => {
      const time = r.firstResponseTimeHours;
      if (time <= 12) fastCount++;
      else if (time <= 24) standardCount++;
      else if (time <= 48) normalCount++;
      else extendedCount++;
    });

    return [
      { name: '⚡ รวดเร็วพิเศษ (< 12 ชม.)', count: fastCount, color: '#10b981', desc: 'ตอบสนองทันใจภายในครึ่งวัน' },
      { name: '🟢 มาตรฐาน SLA (12-24 ชม.)', count: standardCount, color: '#06b6d4', desc: 'ตอบสนองภายใน 1 วันทำการ' },
      { name: '🟡 ปานกลาง (24-48 ชม.)', count: normalCount, color: '#f59e0b', desc: 'ตอบสนองภายใน 2 วันทำการ' },
      { name: '🔴 เกินกำหนด (> 48 ชม.)', count: extendedCount, color: '#ef4444', desc: 'ใช้เวลาตรวจสอบนานกว่า 2 วัน' },
    ];
  }, [requestsWithMetrics]);

  // Custom Chart Tooltips
  const CustomResolvedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl text-xs space-y-2 border border-slate-700 backdrop-blur-xs min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              เดือน {data.monthLabel}
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-mono">
              สำเร็จ {data.resolutionRate}%
            </span>
          </div>
          <div className="space-y-1.5 text-slate-200">
            <div className="flex justify-between items-center text-emerald-400 font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ดำเนินการเสร็จสิ้น (Resolved):
              </span>
              <span>{data.resolvedCount} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-sky-400">
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" /> รับเรื่องเข้าใหม่ (Inflow):
              </span>
              <span>{data.inflowCount} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-amber-300">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> ยังอยู่ระหว่างดำเนินการ:
              </span>
              <span>{data.pendingCount} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-purple-300 border-t border-slate-800 pt-1 text-[11px]">
              <span>ระยะเวลาปิดงานเฉลี่ย:</span>
              <strong className="text-white font-mono">{data.avgResolutionDays} วัน</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomResponseTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 border border-slate-700 backdrop-blur-xs min-w-[200px]">
          <div className="font-bold text-sky-300 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>เดือน {data.monthLabel}</span>
            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-700 px-1.5 py-0.5 rounded">
              SLA {data.slaRate}%
            </span>
          </div>
          <div className="space-y-1 text-slate-200">
            <div className="flex justify-between items-center text-amber-400 font-bold">
              <span>เวลาตอบสนองเฉลี่ย (Response):</span>
              <span className="text-white font-mono">{data.avgResponseHours} ชม.</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-bold">
              <span>เวลาปิดงานเฉลี่ย (Resolution):</span>
              <span className="text-white font-mono">{data.avgResolutionDays} วัน</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>เป้าหมายมาตรฐาน SLA:</span>
              <span className="text-slate-300">≤ 24 ชม.</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-6">
      {/* 1. DASHBOARD HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-900 via-blue-900 to-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-md border border-slate-700">
            <BarChart3 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                แดชบอร์ดสรุปผลการปฏิบัติงานและดัชนีชี้วัด (Executive Summary Dashboard)
              </h3>
              <span className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border border-emerald-300/60 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Live Performance Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามเวลาตอบสนองเฉลี่ย (Average Response Time), คำร้องที่ดำเนินการสำเร็จรายเดือน (Requests Resolved per Month) และความเร็วตามเกณฑ์มาตรฐาน SLA
            </p>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-indigo-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'year' ? 'bg-white text-indigo-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปีนี้
            </button>
            <button
              onClick={() => setTimeRange('90days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '90days' ? 'bg-white text-indigo-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90 วัน
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '30days' ? 'bg-white text-indigo-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 วัน
            </button>
          </div>

          {/* Time Unit Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-[10px] text-slate-500 px-1.5 flex items-center gap-0.5">
              <Timer className="w-3 h-3 text-slate-400" /> หน่วย:
            </span>
            <button
              onClick={() => setTimeUnit('hours')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                timeUnit === 'hours' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ชั่วโมง (Hrs)
            </button>
            <button
              onClick={() => setTimeUnit('days')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                timeUnit === 'days' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              วัน (Days)
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 text-slate-800 font-bold px-3 py-2 rounded-xl border border-slate-200 shadow-2xs focus:outline-none cursor-pointer"
          >
            <option value="all">ทุกหมวดหมู่ ({requests.length})</option>
            {REQUEST_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.titleTh}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CORE KEY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: AVERAGE RESPONSE TIME */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/20 p-5 rounded-2xl border-2 border-amber-300/80 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                เวลาตอบสนองเฉลี่ย (Avg Response)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-slate-950 font-mono">
                  {timeUnit === 'hours' ? `${avgResponseHours}` : `${avgResponseDays}`}
                </span>
                <span className="text-xs font-bold text-amber-900">
                  {timeUnit === 'hours' ? 'ชั่วโมง' : 'วันทำการ'}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base shadow-sm shrink-0">
              <Zap className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200/70 flex items-center justify-between text-xs">
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-600" /> เป้าหมาย SLA: ≤ 24 ชม.
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
              avgResponseHours <= 24 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {avgResponseHours <= 24 ? '🟢 ตามเกณฑ์มาตรฐาน' : '🔴 เกินเกณฑ์'}
            </span>
          </div>
        </div>

        {/* KPI 2: REQUESTS RESOLVED PER MONTH / TOTAL */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50/50 to-teal-50/20 p-5 rounded-2xl border-2 border-emerald-300/80 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                คำร้องที่สำเร็จ (Resolved Count)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-slate-950 font-mono">
                  {resolvedCount}
                </span>
                <span className="text-xs font-bold text-emerald-900">
                  / {totalCount} เรื่อง ({resolutionRatePercent}%)
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-200/70 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-semibold">
              เดือนที่สูงสุด: <strong>{topResolvedMonth.monthLabel}</strong>
            </span>
            <span className="font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
              {topResolvedMonth.resolvedCount} เรื่อง
            </span>
          </div>
        </div>

        {/* KPI 3: AVERAGE RESOLUTION TIME (END-TO-END) */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-50/50 to-indigo-50/20 p-5 rounded-2xl border-2 border-blue-300/80 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-blue-600" />
                ระยะเวลาปิดงานเฉลี่ย (Avg Resolution)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-slate-950 font-mono">
                  {timeUnit === 'hours' ? `${avgResolutionHours}` : `${avgResolutionDays}`}
                </span>
                <span className="text-xs font-bold text-blue-900">
                  {timeUnit === 'hours' ? 'ชั่วโมง' : 'วันทำการ'}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200/70 flex items-center justify-between text-xs">
            <span className="text-blue-800 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> เทียบเกณฑ์ SLA: ≤ 3 วัน
            </span>
            <span className="font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
              รวดเร็ว {avgResolutionDays <= 3 ? 'ระดับดีมาก' : 'ปานกลาง'}
            </span>
          </div>
        </div>

        {/* KPI 4: SLA COMPLIANCE RATE */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-50/50 to-pink-50/20 p-5 rounded-2xl border-2 border-purple-300/80 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                อัตราตรงตามเวลา (SLA Compliance)
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-slate-950 font-mono">
                  {slaComplianceRate}%
                </span>
                <span className="text-xs font-bold text-purple-900">
                  สำเร็จตามเวลา
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-purple-200/70 flex items-center justify-between text-xs">
            <span className="text-purple-800 font-semibold">
              งานคงค้าง: <strong>{pendingCount} เรื่อง</strong>
            </span>
            <span className="font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px]">
              {pendingCount === 0 ? 'เคลียร์ครบ 100%' : 'กำลังดำเนินการ'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. CHART VIEW SWITCHER NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveChartTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeChartTab === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          แสดงภาพรวมทั้งหมด (All Charts)
        </button>

        <button
          onClick={() => setActiveChartTab('resolved')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeChartTab === 'resolved'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          คำร้องที่สำเร็จรายเดือน (Resolved per Month)
        </button>

        <button
          onClick={() => setActiveChartTab('response')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeChartTab === 'response'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          เวลาตอบสนองเฉลี่ย (Average Response Time)
        </button>

        <button
          onClick={() => setActiveChartTab('category')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeChartTab === 'category'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          ประสิทธิภาพแยกตามหมวดหมู่
        </button>

        <button
          onClick={() => setActiveChartTab('sla')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeChartTab === 'sla'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          การกระจายตัว SLA
        </button>
      </div>

      {/* 4. VISUALIZATION CHARTS SECTION */}
      <div className="space-y-6">
        
        {/* CHART 1: REQUESTS RESOLVED PER MONTH VS INFLOW (COMPOSED BAR & LINE) */}
        {(activeChartTab === 'all' || activeChartTab === 'resolved') && (
          <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    1. ปริมาณคำร้องที่สำเร็จรายเดือน vs คำร้องรับเข้าใหม่ (Requests Resolved vs Inflow per Month)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบจำนวนคำร้องที่อนุมัติ/เสร็จสิ้น (Resolved) เทียบกับคำร้องที่ยื่นใหม่ (Inflow) พร้อมอัตราความสำเร็จ %
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> ดำเนินการเสร็จสิ้น (Resolved)
                </span>
                <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-100/80 px-2.5 py-1 rounded-lg border border-sky-300/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> รับเข้าใหม่ (Inflow)
                </span>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyMetricsData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} 
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    allowDecimals={false} 
                    label={{ value: 'จำนวนคำร้อง (เรื่อง)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11, fill: '#8b5cf6' }} 
                    unit="%"
                    label={{ value: 'อัตราความสำเร็จ (%)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#8b5cf6' }}
                  />
                  <Tooltip content={<CustomResolvedTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  
                  {/* Bar 1: Inflow */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="inflowCount" 
                    name="คำร้องรับเข้าใหม่ (Inflow)" 
                    fill="#38bdf8" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20}
                  />

                  {/* Bar 2: Resolved */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="resolvedCount" 
                    name="ดำเนินการเสร็จสิ้น (Resolved)" 
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20}
                  />

                  {/* Line: Resolution Rate */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="resolutionRate" 
                    name="อัตราความสำเร็จ (% Rate)" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#8b5cf6' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly mini breakdown list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
              {monthlyMetricsData.slice(-6).map((m) => (
                <div key={m.monthKey} className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                  <div className="font-extrabold text-xs text-slate-800">{m.monthLabel}</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {m.resolvedCount} <span className="text-[10px] text-slate-400 font-normal">สำเร็จ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    จากรับเข้า {m.inflowCount} เรื่อง ({m.resolutionRate}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHART 2: AVERAGE RESPONSE TIME & RESOLUTION TIME TREND (LINE / AREA) */}
        {(activeChartTab === 'all' || activeChartTab === 'response') && (
          <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    2. แนวโน้มเวลาตอบสนองและระยะเวลาปิดงานเฉลี่ย (Average Response & Resolution Time Trend)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิเคราะห์ความเร็วของเจ้าหน้าที่ในการเริ่มตรวจรับเอกสารและระยะเวลาจนถึงออกหนังสืออนุมัติ
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> เวลาตอบสนองแรก ({timeUnit === 'hours' ? 'ชั่วโมง' : 'วัน'})
                </span>
                <span className="inline-flex items-center gap-1 text-indigo-800 bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-300/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> ระยะเวลาปิดงาน (วัน)
                </span>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyMetricsData}
                  margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorResol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.7}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    label={{ value: timeUnit === 'hours' ? 'ระยะเวลา (ชั่วโมง)' : 'ระยะเวลา (วัน)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomResponseTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  
                  {/* Reference Line for SLA Standard */}
                  <ReferenceLine 
                    y={timeUnit === 'hours' ? 24 : 1} 
                    label={{ value: 'เป้าหมาย SLA (24 ชม.)', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                  />

                  {/* Area 1: Avg Response */}
                  <Area 
                    type="monotone" 
                    dataKey={timeUnit === 'hours' ? 'avgResponseHours' : 'avgResponseDays'} 
                    name={`เวลาตอบสนองเฉลี่ย (${timeUnit === 'hours' ? 'ชั่วโมง' : 'วัน'})`} 
                    stroke="#f59e0b" 
                    strokeWidth={2.5} 
                    fill="url(#colorResp)" 
                  />

                  {/* Line 2: Avg Resolution Days */}
                  <Line 
                    type="monotone" 
                    dataKey="avgResolutionDays" 
                    name="ระยะเวลาปิดงานเฉลี่ย (วัน)" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#4f46e5' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3 & 4: CATEGORY PERFORMANCE & SLA DISTRIBUTION (2-COLUMN GRID) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CATEGORY AVERAGE RESOLUTION TIME (BAR CHART) */}
          {(activeChartTab === 'all' || activeChartTab === 'category') && (
            <div className={`${activeChartTab === 'category' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-slate-50/70 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <h4 className="text-sm font-black text-slate-900">
                      3. ระยะเวลาปิดงานเฉลี่ยรายหมวดหมู่ (Resolution Time by Category)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เปรียบเทียบระยะเวลาในการจัดการคำร้องของแต่ละหมวดบริการ (วันทำการ)
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {categoryPerformanceData.length} หมวดหมู่
                </span>
              </div>

              <div className="h-72 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryPerformanceData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} unit=" วัน" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                      width={120}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value} วัน (สำเร็จ ${props.payload.resolved}/${props.payload.total} เรื่อง)`, 
                        'ระยะเวลาเฉลี่ย'
                      ]}
                    />
                    <Bar 
                      dataKey="avgResolutionDays" 
                      name="ระยะเวลาเฉลี่ย (วัน)" 
                      radius={[0, 6, 6, 0]} 
                      barSize={20}
                    >
                      {categoryPerformanceData.map((entry, index) => (
                        <Cell key={`cell-cat-perf-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category mini cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {categoryPerformanceData.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCategoryFilter && onSelectCategoryFilter(c.id)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-xs truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-400">ตอบสนอง: {c.avgResponseHours} ชม.</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900">{c.avgResolutionDays} วัน</span>
                      <span className="block text-[9px] font-bold text-emerald-600">สำเร็จ {c.resolutionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLA TIME DISTRIBUTION (DONUT / RADIAL) */}
          {(activeChartTab === 'all' || activeChartTab === 'sla') && (
            <div className={`${activeChartTab === 'sla' ? 'lg:col-span-12' : 'lg:col-span-5'} bg-slate-50/70 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-600" />
                    <h4 className="text-sm font-black text-slate-900">
                      4. การกระจายความเร็วตอบสนอง (SLA Distribution)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สัดส่วนคำร้องจำแนกตามช่วงเวลาในการเริ่มพิจารณา
                  </p>
                </div>
              </div>

              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={slaBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {slaBreakdownData.map((entry, index) => (
                        <Cell key={`cell-sla-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: any, p: any) => [
                        `${val} คำร้อง (${totalCount > 0 ? Math.round((val / totalCount) * 100) : 0}%)`,
                        p.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ตรงตาม SLA</span>
                  <span className="text-xl font-black text-slate-900">{slaComplianceRate}%</span>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                    ยอดเยี่ยม
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2 pt-1">
                {slaBreakdownData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-800 text-[11px]">{item.name}</span>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {item.count} <span className="text-[10px] text-slate-500 font-normal">เรื่อง ({totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 5. SUMMARY FOOTER & EXPORT ACTIONS */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-0.5">
            <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <span>ดัชนีชี้วัดประสิทธิภาพสารบรรณและ CCTV เทศบาลเมืองชัยภูมิ</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              คำร้องสะสม {totalCount} เรื่อง | เวลาตอบสนองเฉลี่ย {avgResponseHours} ชม. | ปิดงานสำเร็จ {resolvedCount} เรื่อง ({resolutionRatePercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            พิมพ์สรุปสถิติ
          </button>
        </div>
      </div>
    </div>
  );
};
