import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { 
  PieChart as PieIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Layers,
  Filter,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface OfficerDonutDashboardCardProps {
  requests: RequestItem[];
  onSelectStatusFilter?: (status: string) => void;
  currentStatusFilter?: string;
}

export const OfficerDonutDashboardCard: React.FC<OfficerDonutDashboardCardProps> = ({
  requests,
  onSelectStatusFilter,
  currentStatusFilter = 'all',
}) => {
  const [timeRange, setTimeRange] = useState<'current_month' | 'all'>('all');

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  // Filter requests by time range
  const filteredRequests = requests.filter((r) => {
    if (timeRange === 'all') return true;
    const d = new Date(r.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalCount = filteredRequests.length;

  // 1. STATUS BREAKDOWN (Pending vs. Completed vs. Rejected)
  const submittedCount = filteredRequests.filter((r) => r.status === 'submitted').length;
  const underReviewCount = filteredRequests.filter((r) => r.status === 'under_review').length;
  const actionRequiredCount = filteredRequests.filter((r) => r.status === 'action_required').length;
  const approvedCount = filteredRequests.filter((r) => r.status === 'approved').length;
  const completedCount = filteredRequests.filter((r) => r.status === 'completed').length;
  const rejectedCount = filteredRequests.filter((r) => r.status === 'rejected').length;

  const pendingTotal = submittedCount + underReviewCount + actionRequiredCount;
  const finishedTotal = approvedCount + completedCount;

  const statusDonutData = [
    {
      id: 'pending',
      name: 'รอดำเนินการ (Pending)',
      shortName: 'รอดำเนินการ',
      value: pendingTotal,
      color: '#f59e0b', // amber-500
      filterKey: 'submitted',
      details: `ยื่นแล้ว ${submittedCount} | ตรวจสอบ ${underReviewCount} | แก้ไข ${actionRequiredCount}`
    },
    {
      id: 'completed',
      name: 'เสร็จสิ้น/อนุมัติแล้ว (Completed)',
      shortName: 'อนุมัติ/เสร็จสิ้น',
      value: finishedTotal,
      color: '#10b981', // emerald-500
      filterKey: 'approved',
      details: `อนุมัติแล้ว ${approvedCount} | ดำเนินการเสร็จสิ้น ${completedCount}`
    },
    {
      id: 'rejected',
      name: 'ไม่อนุมัติ (Rejected)',
      shortName: 'ไม่อนุมัติ',
      value: rejectedCount,
      color: '#ef4444', // rose-500
      filterKey: 'rejected',
      details: `ปฏิเสธ/ไม่อนุมัติ ${rejectedCount} เรื่อง`
    }
  ].filter((item) => item.value > 0);

  // Fallback if no data
  const statusDisplayData = statusDonutData.length > 0 ? statusDonutData : [
    { id: 'empty', name: 'ไม่มีข้อมูล', shortName: 'ไม่มีข้อมูล', value: 1, color: '#e2e8f0', filterKey: 'all', details: 'ไม่มีคำร้อง' }
  ];

  // 2. CATEGORY BREAKDOWN
  const categoryCountMap = new Map<string, number>();
  filteredRequests.forEach((r) => {
    categoryCountMap.set(r.category, (categoryCountMap.get(r.category) || 0) + 1);
  });

  const categoryColors: Record<string, string> = {
    cctv: '#0284c7',       // sky-600
    certificate: '#6366f1',// indigo-500
    leave: '#8b5cf6',      // violet-500
    maintenance: '#d97706',// amber-600
    budget: '#059669',     // emerald-600
    general: '#ec4899',    // pink-500
  };

  const categoryDonutData = REQUEST_CATEGORIES.map((cat, idx) => {
    const count = categoryCountMap.get(cat.id as any) || 0;
    const fallbackColor = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#ec4899'][idx % 6];
    return {
      id: cat.id,
      name: cat.titleTh,
      shortName: cat.titleTh.length > 18 ? cat.titleTh.substring(0, 17) + '…' : cat.titleTh,
      value: count,
      color: categoryColors[cat.id] || fallbackColor
    };
  }).filter((item) => item.value > 0);

  // Fallback if no category data
  const categoryDisplayData = categoryDonutData.length > 0 ? categoryDonutData : [
    { id: 'empty', name: 'ไม่มีข้อมูล', shortName: 'ไม่มีข้อมูล', value: 1, color: '#e2e8f0' }
  ];

  const completionPct = totalCount > 0 ? Math.round((finishedTotal / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingTotal / totalCount) * 100) : 0;

  // Custom Recharts Tooltip for Status Donut
  const CustomStatusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.id === 'empty') return null;
      const share = totalCount > 0 ? ((data.value / totalCount) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 backdrop-blur-xs">
          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="text-slate-200">
            จำนวน: <strong className="text-white text-sm font-extrabold">{data.value}</strong> เรื่อง ({share}%)
          </p>
          <p className="text-[10px] text-slate-400 font-mono pt-0.5">{data.details}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Category Donut
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.id === 'empty') return null;
      const share = totalCount > 0 ? ((data.value / totalCount) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 backdrop-blur-xs">
          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <p className="text-slate-200">
            จำนวน: <strong className="text-white text-sm font-extrabold">{data.value}</strong> เรื่อง ({share}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-6 space-y-6">
      
      {/* Top Header & Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-xs">
            <PieIcon className="w-5 h-5 text-blue-100" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              สรุปภาพรวมคำร้องด้วยแผนภูมิโดนัท (Executive Request Breakdown)
            </h3>
            <p className="text-xs text-slate-500">
              วิเคราะห์สัดส่วนคำร้องรอดำเนินการ vs เสร็จสิ้น และการกระจายตัวตามหมวดหมู่
            </p>
          </div>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/80">
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'hover:text-slate-900 text-slate-600'
            }`}
          >
            สะสมทั้งหมด ({requests.length} เรื่อง)
          </button>
          <button
            onClick={() => setTimeRange('current_month')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              timeRange === 'current_month'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'hover:text-slate-900 text-slate-600'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            เดือนปัจจุบัน ({currentMonthName})
          </button>
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">คำร้องทั้งหมด</span>
            <span className="text-xl font-extrabold text-slate-900">
              {totalCount} <span className="text-xs font-normal text-slate-500">เรื่อง</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
            100%
          </div>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] text-amber-800 block font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              รอดำเนินการ (Pending)
            </span>
            <span className="text-xl font-extrabold text-amber-900">
              {pendingTotal} <span className="text-xs font-normal text-amber-700">เรื่อง</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
            {pendingPct}%
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] text-emerald-800 block font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              เสร็จสิ้น/อนุมัติแล้ว
            </span>
            <span className="text-xl font-extrabold text-emerald-900">
              {finishedTotal} <span className="text-xs font-normal text-emerald-700">เรื่อง</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
            {completionPct}%
          </div>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200/80 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] text-rose-800 block font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              ไม่อนุมัติ (Rejected)
            </span>
            <span className="text-xl font-extrabold text-rose-900">
              {rejectedCount} <span className="text-xs font-normal text-rose-700">เรื่อง</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center font-bold text-xs">
            {totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* TWO DONUT CHARTS SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
        
        {/* DONUT 1: STATUS BREAKDOWN (Pending vs. Completed vs. Rejected) */}
        <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-800">
                1. สัดส่วนสถานะคำร้อง (Status Breakdown)
              </h4>
            </div>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
              Pending vs. Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Graphic */}
            <div className="sm:col-span-6 h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDisplayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDisplayData.map((entry, index) => (
                      <Cell 
                        key={`cell-status-${index}`} 
                        fill={entry.color} 
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => entry.filterKey && onSelectStatusFilter && onSelectStatusFilter(entry.filterKey)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomStatusTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {completionPct}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 pt-0.5">
                  อัตราสำเร็จ
                </span>
              </div>
            </div>

            {/* Donut Legend List */}
            <div className="sm:col-span-6 space-y-2 text-xs">
              {statusDonutData.map((item) => {
                const share = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : '0';
                const isSelected = currentStatusFilter === item.filterKey;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectStatusFilter && onSelectStatusFilter(item.filterKey)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-[11px] truncate">{item.shortName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.details}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 block">{item.value}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{share}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DONUT 2: CATEGORY BREAKDOWN */}
        <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                2. จำแนกตามหมวดหมู่คำร้อง (Category Breakdown)
              </h4>
            </div>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {categoryDonutData.length} หมวดหมู่
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Graphic */}
            <div className="sm:col-span-6 h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDisplayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryDisplayData.map((entry, index) => (
                      <Cell 
                        key={`cell-cat-${index}`} 
                        fill={entry.color} 
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomCategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {totalCount}
                </span>
                <span className="text-[10px] font-bold text-slate-500 pt-0.5">
                  เรื่องทั้งหมด
                </span>
              </div>
            </div>

            {/* Category Donut Legend List */}
            <div className="sm:col-span-6 space-y-1.5 text-xs max-h-56 overflow-y-auto pr-1">
              {categoryDonutData.map((cat) => {
                const share = totalCount > 0 ? ((cat.value / totalCount) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={cat.id}
                    className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-slate-800 text-[11px] truncate" title={cat.name}>
                        {cat.shortName}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cat.value} เรื่อง</span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                        {share}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
