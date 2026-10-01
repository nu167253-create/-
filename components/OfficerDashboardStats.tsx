import React, { useState, useMemo } from 'react';
import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { getStatusLabelTh, getPriorityLabelTh } from '../utils/storage';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Layers, 
  PieChart as PieIcon, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Download, 
  Camera,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface OfficerDashboardStatsProps {
  requests: RequestItem[];
  onSelectCategoryFilter?: (category: string) => void;
  onSelectStatusFilter?: (status: string) => void;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const CATEGORY_COLORS: Record<string, string> = {
  cctv: '#0284c7',       // Sky 600
  certificate: '#6366f1',// Indigo 500
  leave: '#8b5cf6',      // Violet 500
  maintenance: '#d97706',// Amber 600
  budget: '#059669',     // Emerald 600
  general: '#ec4899',    // Pink 500
};

export const OfficerDashboardStats: React.FC<OfficerDashboardStatsProps> = ({
  requests,
  onSelectCategoryFilter,
  onSelectStatusFilter,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'all' | 'category' | 'status' | 'monthly'>('all');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  // Available Years extracted from requests
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    requests.forEach(r => {
      if (r.createdAt) {
        const year = new Date(r.createdAt).getFullYear();
        if (!isNaN(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [requests]);

  // Filter requests by year if selected
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (selectedYear === 'all') return true;
      if (!r.createdAt) return false;
      const yr = new Date(r.createdAt).getFullYear();
      return yr.toString() === selectedYear;
    });
  }, [requests, selectedYear]);

  // Total metrics
  const totalCount = filteredRequests.length;
  const cctvOnlyCount = useMemo(() => {
    return filteredRequests.filter(r => r.category === 'cctv').length;
  }, [filteredRequests]);

  const completedCount = useMemo(() => {
    return filteredRequests.filter(r => r.status === 'completed' || r.status === 'approved').length;
  }, [filteredRequests]);

  const pendingCount = useMemo(() => {
    return filteredRequests.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required').length;
  }, [filteredRequests]);

  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 1. DATA AGGREGATION BY CATEGORY
  const categoryData = useMemo(() => {
    const countsMap: Record<string, { total: number; completed: number; pending: number; rejected: number }> = {};
    
    // Initialize standard categories
    REQUEST_CATEGORIES.forEach(cat => {
      countsMap[cat.id] = { total: 0, completed: 0, pending: 0, rejected: 0 };
    });

    filteredRequests.forEach(r => {
      const catKey = r.category || 'general';
      if (!countsMap[catKey]) {
        countsMap[catKey] = { total: 0, completed: 0, pending: 0, rejected: 0 };
      }
      countsMap[catKey].total += 1;
      if (r.status === 'completed' || r.status === 'approved') {
        countsMap[catKey].completed += 1;
      } else if (r.status === 'rejected') {
        countsMap[catKey].rejected += 1;
      } else {
        countsMap[catKey].pending += 1;
      }
    });

    return REQUEST_CATEGORIES.map((cat, idx) => {
      const stats = countsMap[cat.id] || { total: 0, completed: 0, pending: 0, rejected: 0 };
      const fallbackColor = ['#0284c7', '#6366f1', '#8b5cf6', '#d97706', '#059669', '#ec4899'][idx % 6];
      const pct = totalCount > 0 ? Math.round((stats.total / totalCount) * 100) : 0;

      return {
        id: cat.id,
        name: cat.titleTh,
        shortName: cat.titleTh.length > 20 ? cat.titleTh.substring(0, 19) + '…' : cat.titleTh,
        count: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        rejected: stats.rejected,
        percentage: pct,
        fill: CATEGORY_COLORS[cat.id] || fallbackColor,
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredRequests, totalCount]);

  // Top Category
  const topCategory = categoryData[0] || { name: 'กล้องวงจรปิด CCTV', count: 0 };

  // 2. DATA AGGREGATION BY MONTH
  const monthlyData = useMemo(() => {
    const monthlyMap: Record<string, { 
      year: number; 
      month: number; 
      monthKey: string; 
      monthLabel: string;
      total: number;
      cctv: number;
      certificate: number;
      leave: number;
      maintenance: number;
      budget: number;
      general: number;
      completed: number;
      pending: number;
    }> = {};

    filteredRequests.forEach(r => {
      if (!r.createdAt) return;
      const dateObj = new Date(r.createdAt);
      if (isNaN(dateObj.getTime())) return;

      const year = dateObj.getFullYear();
      const month = dateObj.getMonth(); // 0-11
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const thaiYear = (year + 543) % 100;
      const monthLabel = `${THAI_MONTHS_SHORT[month]} ${thaiYear}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          year,
          month,
          monthKey,
          monthLabel,
          total: 0,
          cctv: 0,
          certificate: 0,
          leave: 0,
          maintenance: 0,
          budget: 0,
          general: 0,
          completed: 0,
          pending: 0,
        };
      }

      monthlyMap[monthKey].total += 1;

      // Category counts
      const cat = r.category as keyof typeof CATEGORY_COLORS;
      if (cat in monthlyMap[monthKey]) {
        (monthlyMap[monthKey] as any)[cat] += 1;
      } else {
        monthlyMap[monthKey].general += 1;
      }

      // Status
      if (r.status === 'completed' || r.status === 'approved') {
        monthlyMap[monthKey].completed += 1;
      } else if (r.status !== 'rejected') {
        monthlyMap[monthKey].pending += 1;
      }
    });

    // If map is empty, fill last 6 months for clear visualization
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
          total: 0,
          cctv: 0,
          certificate: 0,
          leave: 0,
          maintenance: 0,
          budget: 0,
          general: 0,
          completed: 0,
          pending: 0,
        };
      }
    }

    // Sort chronologically by monthKey
    return Object.values(monthlyMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRequests]);

  // Peak month
  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return { monthLabel: '-', total: 0 };
    return [...monthlyData].sort((a, b) => b.total - a.total)[0];
  }, [monthlyData]);

  // Custom Category Bar Chart Tooltip
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-xs">
          <p className="font-extrabold flex items-center gap-2" style={{ color: data.fill }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
            {data.name}
          </p>
          <div className="text-slate-200 space-y-1 border-t border-slate-800 pt-1.5">
            <p className="flex justify-between gap-4">
              <span>จำนวนคำร้องรวม:</span>
              <strong className="text-white font-extrabold">{data.count} เรื่อง ({data.percentage}%)</strong>
            </p>
            <p className="flex justify-between gap-4 text-emerald-400">
              <span>อนุมัติ/เสร็จสิ้น:</span>
              <strong>{data.completed} เรื่อง</strong>
            </p>
            <p className="flex justify-between gap-4 text-amber-400">
              <span>กำลังดำเนินการ/ตรวจสอบ:</span>
              <strong>{data.pending} เรื่อง</strong>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Monthly Chart Tooltip
  const CustomMonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 border border-slate-700 backdrop-blur-xs min-w-48">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-amber-300">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              เดือน {item.monthLabel}
            </span>
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px]">
              รวม {item.total} คำร้อง
            </span>
          </div>

          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between items-center text-sky-400 font-bold">
              <span className="flex items-center gap-1">📹 กล้องวงจรปิด CCTV:</span>
              <span>{item.cctv} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-amber-400">
              <span>🛠️ แจ้งซ่อม IT / อาคาร:</span>
              <span>{item.maintenance} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-indigo-400">
              <span>📜 ขอหนังสือรับรอง:</span>
              <span>{item.certificate} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span>💰 เบิกจ่ายงบประมาณ:</span>
              <span>{item.budget} เรื่อง</span>
            </div>
            <div className="flex justify-between items-center text-violet-400">
              <span>📅 การลา / เวลาทำงาน:</span>
              <span>{item.leave} เรื่อง</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 3. STATUS VOLUME AGGREGATION
  const statusVolumeData = useMemo(() => {
    const statusCountsMap: Record<string, number> = {
      submitted: 0,
      under_review: 0,
      action_required: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
    };

    filteredRequests.forEach((r) => {
      if (r.status in statusCountsMap) {
        statusCountsMap[r.status] += 1;
      } else {
        statusCountsMap.submitted += 1;
      }
    });

    const statusConfigList = [
      { id: 'submitted', name: 'ยื่นคำร้องใหม่', shortName: 'ยื่นคำร้อง', color: '#3b82f6', desc: 'รอดำเนินการรับเรื่อง' },
      { id: 'under_review', name: 'อยู่ระหว่างตรวจสอบ', shortName: 'กำลังตรวจสอบ', color: '#f59e0b', desc: 'เจ้าหน้าที่กำลังตรวจสอบหลักฐาน' },
      { id: 'action_required', name: 'ขอเอกสารเพิ่มเติม', shortName: 'ขอเอกสารเพิ่ม', color: '#a855f7', desc: 'รอผู้ยื่นแนบหลักฐานเพิ่มเติม' },
      { id: 'approved', name: 'อนุมัติคำร้องแล้ว', shortName: 'อนุมัติแล้ว', color: '#10b981', desc: 'ผ่านอนุมัติ รอออกหนังสือ/ถอดไฟล์' },
      { id: 'completed', name: 'ดำเนินการเสร็จสิ้น', shortName: 'เสร็จสิ้น', color: '#0d9488', desc: 'ส่งมอบภาพ/เสร็จสิ้นกระบวนการ' },
      { id: 'rejected', name: 'ไม่อนุมัติคำร้อง', shortName: 'ไม่อนุมัติ', color: '#ef4444', desc: 'ปฏิเสธ/ไม่อยู่ในเงื่อนไข' },
    ];

    return statusConfigList.map((cfg) => {
      const count = statusCountsMap[cfg.id] || 0;
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return {
        ...cfg,
        count,
        value: count,
        percentage: pct,
        fill: cfg.color,
      };
    });
  }, [filteredRequests, totalCount]);

  // Custom Status Chart Tooltip
  const CustomStatusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-xs">
          <p className="font-extrabold flex items-center gap-2" style={{ color: data.color || data.fill }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || data.fill }} />
            {data.name}
          </p>
          <div className="text-slate-200 space-y-1 border-t border-slate-800 pt-1.5">
            <p className="flex justify-between gap-4">
              <span>จำนวนคำร้อง:</span>
              <strong className="text-white font-extrabold">{data.count} เรื่อง ({data.percentage}%)</strong>
            </p>
            <p className="text-[10px] text-slate-400 font-medium">{data.desc}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 space-y-6">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-amber-400 rounded-2xl shadow-sm border border-slate-800">
            <BarChart3 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                แดชบอร์ดสถิติคำร้อง CCTV และบริการดิจิทัล (Dashboard Stats)
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Recharts Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-500">
              แสดงการกระจายตัวของคำร้องตามหมวดหมู่บริการ และแนวโน้มรายเดือนสำหรับวิเคราะห์ข้อมูลเชิงลึก
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="text-slate-500 pl-2 text-[11px] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> ปีที่ยื่น:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white text-slate-900 font-bold px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทุกปีสะสม ({requests.length} คำร้อง)</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>ปี {yr + 543} ({yr})</option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold flex-wrap">
            <button
              onClick={() => setChartViewMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartViewMode === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แสดงกราฟทั้งหมด
            </button>
            <button
              onClick={() => setChartViewMode('category')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartViewMode === 'category' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              หมวดหมู่
            </button>
            <button
              onClick={() => setChartViewMode('status')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartViewMode === 'status' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สถานะคำร้อง
            </button>
            <button
              onClick={() => setChartViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartViewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แนวโน้มรายเดือน
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC HIGHLIGHT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 p-4 rounded-2xl border border-sky-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-600" />
                ขอดูภาพ CCTV
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {cctvOnlyCount} <span className="text-xs font-normal text-slate-500">รายการ</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {totalCount > 0 ? Math.round((cctvOnlyCount / totalCount) * 100) : 0}%
            </div>
          </div>
          <div className="mt-2 text-[11px] text-sky-700 font-medium">
            หมวดหมู่ที่ถูกยื่นขอบ่อยที่สุดอันดับ 1
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                อัตราการอนุมัติ/สำเร็จ
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {completionRate}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {completedCount} เรื่อง
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            ดำเนินการเสร็จแล้ว {completedCount} / {totalCount} เรื่อง
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                อยู่ระหว่างดำเนินการ
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {pendingCount} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
              {totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            ยื่นแล้ว & อยู่ระหว่างตรวจสารบรรณ
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/60 p-4 rounded-2xl border border-purple-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                เดือนที่มีสถิติต่างสูงสุด
              </span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {peakMonth.monthLabel}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {peakMonth.total} เรื่อง
            </div>
          </div>
          <div className="mt-2 text-[11px] text-purple-700 font-medium">
            ปริมาณงานสูงสุดในรอบปี
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER */}
      <div className="space-y-8 pt-2">
        
        {/* CHART 1: COUNT BY CATEGORY (BAR CHART) */}
        {(chartViewMode === 'all' || chartViewMode === 'category') && (
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-500 animate-pulse" />
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  1. จำนวนคำร้องแยกตามหมวดหมู่บริการ (Count of Requests by Category)
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                รวม {categoryData.length} หมวดหมู่
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Recharts Horizontal Bar Chart */}
              <div className="lg:col-span-8 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis 
                      dataKey="shortName" 
                      type="category" 
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      width={130}
                    />
                    <Tooltip content={<CustomCategoryTooltip />} />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 8, 8, 0]} 
                      barSize={22}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(entry) => onSelectCategoryFilter && onSelectCategoryFilter(entry.id)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-cat-bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend & Breakdown Cards */}
              <div className="lg:col-span-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                {categoryData.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => onSelectCategoryFilter && onSelectCategoryFilter(cat.id)}
                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-xs group-hover:text-sky-600 transition-colors truncate">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          สำเร็จ {cat.completed} | กำลังตรวจ {cat.pending}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-slate-900 block">{cat.count} <span className="text-[10px] text-slate-500 font-normal">เรื่อง</span></span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHART 2: STATUS VOLUMES BREAKDOWN (DONUT & CARDS WITH RECHARTS) */}
        {(chartViewMode === 'all' || chartViewMode === 'status') && (
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse" />
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  2. ปริมาณคำร้องแยกตามสถานะการพิจารณา (Current Status Volume Distribution)
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                รวม {totalCount} คำร้อง
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Recharts Pie/Donut Chart */}
              <div className="lg:col-span-5 h-72 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusVolumeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      onClick={(entry: any) => onSelectStatusFilter && onSelectStatusFilter(entry?.id || entry?.name)}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    >
                      {statusVolumeData.map((entry, index) => (
                        <Cell key={`cell-status-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomStatusTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    รวมคำร้อง
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {totalCount}
                  </span>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-0.5">
                    {pendingCount} รอดำเนินการ
                  </span>
                </div>
              </div>

              {/* Status Volume Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {statusVolumeData.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => onSelectStatusFilter && onSelectStatusFilter(st.id)}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-98"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: st.color }} />
                        <span className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors truncate">
                          {st.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate pl-5">
                        {st.desc}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 block">
                        {st.count} <span className="text-[10px] text-slate-500 font-normal">เรื่อง</span>
                      </span>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block"
                        style={{ backgroundColor: `${st.color}15`, color: st.color }}
                      >
                        {st.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHART 3: MONTHLY TREND (AREA / STACKED CHART) */}
        {(chartViewMode === 'all' || chartViewMode === 'monthly') && (
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-pulse" />
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  3. แนวโน้มคำร้องรายเดือน (Monthly Trend Analysis)
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1 text-sky-600 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> กล้อง CCTV
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> ดำเนินการสำเร็จ
                </span>
              </div>
            </div>

            <div className="h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorCctv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} 
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomMonthlyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="รวมคำร้องทุกหมวดหมู่" 
                    stroke="#4f46e5" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    strokeWidth={2.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cctv" 
                    name="เฉพาะคำร้อง CCTV" 
                    stroke="#0284c7" 
                    fillOpacity={1} 
                    fill="url(#colorCctv)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    name="ดำเนินการสำเร็จ" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: '#10b981' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
