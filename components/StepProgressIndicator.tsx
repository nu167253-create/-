import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RequestStatus, RequestItem } from '../types/request';
import { 
  FileCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle,
  Clock,
  Sparkles,
  UserCheck,
  FileText,
  Calendar,
  History,
  Info,
  ChevronRight,
  HelpCircle,
  X,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowRight
} from 'lucide-react';

export interface StepProgressIndicatorProps {
  status: RequestStatus;
  statusHistory?: RequestItem['statusHistory'];
  createdAt?: string;
  updatedAt?: string;
  className?: string;
  showDetails?: boolean;
  initialViewMode?: 'stepper' | 'vertical_timeline' | 'both';
  allowToggleTimeline?: boolean;
}

export interface TimelineStep {
  id: string;
  stepNumber: number;
  labelTh: string;
  labelEn: string;
  description: string;
  icon: React.ReactNode;
}

// Thai calendar & date formatting constants
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];
const THAI_DAYS = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

/**
 * Format timestamp into exact Thai Date & Time with seconds precision
 */
export function formatExactDateTime(timestampStr: string) {
  if (!timestampStr) {
    return {
      fullDate: '-',
      shortDate: '-',
      exactTimeTh: '-',
      timeWithSeconds: '-',
      isoString: ''
    };
  }

  const d = new Date(timestampStr);
  if (isNaN(d.getTime())) {
    return {
      fullDate: timestampStr,
      shortDate: timestampStr,
      exactTimeTh: '',
      timeWithSeconds: '',
      isoString: timestampStr
    };
  }

  const dayName = THAI_DAYS[d.getDay()];
  const dateNum = d.getDate();
  const monthFull = THAI_MONTHS_FULL[d.getMonth()];
  const monthShort = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYear = d.getFullYear() > 2400 ? d.getFullYear() : d.getFullYear() + 543;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return {
    fullDate: `${dayName}ที่ ${dateNum} ${monthFull} พ.ศ. ${thaiYear}`,
    shortDate: `${dateNum} ${monthShort} ${thaiYear}`,
    exactTimeTh: `${hours}:${minutes}:${seconds} น.`,
    timeWithSeconds: `${hours}:${minutes}:${seconds}`,
    isoString: d.toISOString()
  };
}

export function getStatusLabelTh(st: RequestStatus): string {
  switch (st) {
    case 'submitted':
      return 'ยื่นคำร้องเรียบร้อย';
    case 'under_review':
      return 'อยู่ระหว่างตรวจสอบ';
    case 'action_required':
      return 'ขอเอกสาร/ข้อมูลเพิ่มเติม';
    case 'approved':
      return 'อนุมัติคำร้อง';
    case 'rejected':
      return 'ไม่อนุมัติคำร้อง';
    case 'completed':
      return 'ดำเนินการเสร็จสิ้น';
    case 'closed':
      return 'ปิดเรื่องเรียบร้อย';
    case 'draft':
      return 'ฉบับร่าง';
    default:
      return st;
  }
}

export function getStatusLabelEn(st: RequestStatus): string {
  switch (st) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under Review';
    case 'action_required':
      return 'Action Required';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'completed':
      return 'Completed';
    case 'closed':
      return 'Closed';
    case 'draft':
      return 'Draft';
    default:
      return st;
  }
}

export interface TransitionHistoryDetail {
  status: RequestStatus;
  statusLabelTh: string;
  statusLabelEn: string;
  timestamp: string;
  fullDate: string;
  shortDate: string;
  exactTimeTh: string;
  timeWithSeconds: string;
  actor: string;
  note?: string;
  isCurrentStatus: boolean;
}

export const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({
  status,
  statusHistory = [],
  createdAt,
  updatedAt,
  className = '',
  showDetails = true,
  initialViewMode = 'stepper',
  allowToggleTimeline = true,
}) => {
  const isRejected = status === 'rejected';
  const isActionRequired = status === 'action_required';
  const isClosed = status === 'closed';

  // Toggle view: 'stepper' or 'vertical_timeline' or 'both'
  const [viewMode, setViewMode] = useState<'stepper' | 'vertical_timeline' | 'both'>(initialViewMode);
  // Sort order for timeline events: 'desc' (latest first) or 'asc' (chronological)
  const [timelineSortOrder, setTimelineSortOrder] = useState<'desc' | 'asc'>('desc');

  // State for active tooltip on hover and mobile tap
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [tappedStepIndex, setTappedStepIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tapped tooltip on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTappedStepIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate current step index (0 to 3)
  const getStepIndex = (st: RequestStatus): number => {
    switch (st) {
      case 'submitted':
        return 0;
      case 'under_review':
      case 'action_required':
        return 1;
      case 'approved':
      case 'rejected':
        return 2;
      case 'completed':
      case 'closed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const isAllCompleted = status === 'completed' || status === 'closed';

  // Define the 4 standard milestone steps
  const steps: TimelineStep[] = [
    {
      id: 'submitted',
      stepNumber: 1,
      labelTh: 'ยื่นคำร้องเรียบร้อย',
      labelEn: 'Submitted',
      description: 'ระบบรับข้อมูลและออกรหัสติดตามคำร้องเรียบร้อยแล้ว',
      icon: <FileCheck className="w-4 h-4" />
    },
    {
      id: 'under_review',
      stepNumber: 2,
      labelTh: isActionRequired ? 'ขอเอกสาร/ข้อมูลเพิ่ม' : 'อยู่ระหว่างตรวจสอบ',
      labelEn: isActionRequired ? 'Action Required' : 'Reviewing',
      description: isActionRequired ? 'รอผู้ยื่นส่งเอกสารหรือข้อมูลประกอบเพิ่มเติม' : 'เจ้าหน้าที่กำลังตรวจสอบรายละเอียดและหลักฐาน',
      icon: isActionRequired ? <AlertTriangle className="w-4 h-4" /> : <Search className="w-4 h-4" />
    },
    {
      id: 'approved_or_rejected',
      stepNumber: 3,
      labelTh: isRejected ? 'ผลพิจารณา: ไม่อนุมัติ' : 'อนุมัติคำร้อง',
      labelEn: isRejected ? 'Rejected' : 'Approved',
      description: isRejected ? 'คำร้องไม่ผ่านการอนุมัติเนื่องจากไม่ตรงตามเงื่อนไข' : 'ผู้มีอำนาจพิจารณาอนุมัติคำร้องเรียบร้อย',
      icon: isRejected ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
    },
    {
      id: 'completed',
      stepNumber: 4,
      labelTh: isClosed ? 'ปิดเรื่องเรียบร้อย' : 'ดำเนินการเสร็จสิ้น',
      labelEn: isClosed ? 'Closed' : 'Completed',
      description: 'ส่งมอบผลงาน/เอกสารทางการและจัดเก็บเรื่องเรียบร้อย',
      icon: <ShieldCheck className="w-4 h-4" />
    }
  ];

  // Helper to collect all exact status transitions for a specific step
  const getStepTransitions = (stepIndex: number): TransitionHistoryDetail[] => {
    let targetStatuses: RequestStatus[] = [];
    if (stepIndex === 0) targetStatuses = ['submitted', 'draft'];
    else if (stepIndex === 1) targetStatuses = ['under_review', 'action_required'];
    else if (stepIndex === 2) targetStatuses = ['approved', 'rejected'];
    else if (stepIndex === 3) targetStatuses = ['completed', 'closed'];

    const transitions: TransitionHistoryDetail[] = [];

    // Search inside statusHistory
    if (statusHistory && statusHistory.length > 0) {
      statusHistory.forEach((h) => {
        if (targetStatuses.includes(h.status)) {
          const formatted = formatExactDateTime(h.timestamp);
          transitions.push({
            status: h.status,
            statusLabelTh: getStatusLabelTh(h.status),
            statusLabelEn: getStatusLabelEn(h.status),
            timestamp: h.timestamp,
            fullDate: formatted.fullDate,
            shortDate: formatted.shortDate,
            exactTimeTh: formatted.exactTimeTh,
            timeWithSeconds: formatted.timeWithSeconds,
            actor: h.actor || 'เจ้าหน้าที่รับเรื่อง',
            note: h.note,
            isCurrentStatus: h.status === status
          });
        }
      });
    }

    // Fallback for Step 1 (Submitted) if statusHistory has no submitted entry, but createdAt exists
    if (stepIndex === 0 && transitions.length === 0 && createdAt) {
      const formatted = formatExactDateTime(createdAt);
      transitions.push({
        status: 'submitted',
        statusLabelTh: getStatusLabelTh('submitted'),
        statusLabelEn: getStatusLabelEn('submitted'),
        timestamp: createdAt,
        fullDate: formatted.fullDate,
        shortDate: formatted.shortDate,
        exactTimeTh: formatted.exactTimeTh,
        timeWithSeconds: formatted.timeWithSeconds,
        actor: 'ผู้ยื่นคำร้อง (ยื่นคำร้องผ่านระบบ)',
        note: 'ยื่นคำร้องผ่านระบบบริการออนไลน์ e-Service สำเร็จ',
        isCurrentStatus: status === 'submitted'
      });
    }

    // Sort transitions chronologically (oldest first)
    transitions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return transitions;
  };

  // Helper to find primary history entry for static display under step
  const getStepHistoryInfo = (stepIndex: number) => {
    const transitions = getStepTransitions(stepIndex);
    if (transitions.length === 0) return null;
    const latest = transitions[transitions.length - 1];
    return {
      timestamp: `${latest.shortDate} ${latest.timeWithSeconds}`,
      exactTimeTh: latest.exactTimeTh,
      actor: latest.actor,
      note: latest.note,
      count: transitions.length
    };
  };

  // Build unified chronological timeline list with exact dates and times for vertical timeline view
  const chronologicalTimelineEvents = useMemo<TransitionHistoryDetail[]>(() => {
    const events: TransitionHistoryDetail[] = [];
    const seenMap = new Set<string>();

    if (statusHistory && statusHistory.length > 0) {
      statusHistory.forEach((item, index) => {
        const formatted = formatExactDateTime(item.timestamp);
        const uniqueKey = `${item.status}-${item.timestamp}-${index}`;
        if (!seenMap.has(uniqueKey)) {
          seenMap.add(uniqueKey);
          events.push({
            status: item.status,
            statusLabelTh: getStatusLabelTh(item.status),
            statusLabelEn: getStatusLabelEn(item.status),
            timestamp: item.timestamp,
            fullDate: formatted.fullDate,
            shortDate: formatted.shortDate,
            exactTimeTh: formatted.exactTimeTh,
            timeWithSeconds: formatted.timeWithSeconds,
            actor: item.actor || 'เจ้าหน้าที่รับเรื่อง',
            note: item.note,
            isCurrentStatus: item.status === status
          });
        }
      });
    }

    // Always ensure initial creation / submission timestamp exists
    const hasSubmitted = events.some(e => e.status === 'submitted' || e.status === 'draft');
    if (!hasSubmitted && createdAt) {
      const formatted = formatExactDateTime(createdAt);
      events.push({
        status: 'submitted',
        statusLabelTh: getStatusLabelTh('submitted'),
        statusLabelEn: getStatusLabelEn('submitted'),
        timestamp: createdAt,
        fullDate: formatted.fullDate,
        shortDate: formatted.shortDate,
        exactTimeTh: formatted.exactTimeTh,
        timeWithSeconds: formatted.timeWithSeconds,
        actor: 'ผู้ยื่นคำร้อง (ยื่นคำร้องผ่านระบบ e-Service)',
        note: 'ยื่นคำร้องและสร้างรายการในระบบสำเร็จ',
        isCurrentStatus: status === 'submitted'
      });
    }

    // Sort according to timelineSortOrder
    events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timelineSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return events;
  }, [statusHistory, createdAt, status, timelineSortOrder]);

  // Status visual badge styling helper for vertical timeline nodes
  const getStatusBadgeStyle = (st: RequestStatus) => {
    switch (st) {
      case 'submitted':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          dot: 'bg-blue-600',
          border: 'border-blue-400',
          icon: <FileCheck className="w-4 h-4 text-blue-600" />
        };
      case 'under_review':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          border: 'border-amber-400',
          icon: <Search className="w-4 h-4 text-amber-600" />
        };
      case 'action_required':
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-800',
          dot: 'bg-purple-600',
          border: 'border-purple-400',
          icon: <AlertTriangle className="w-4 h-4 text-purple-600" />
        };
      case 'approved':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-600',
          border: 'border-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        };
      case 'rejected':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          dot: 'bg-rose-600',
          border: 'border-rose-400',
          icon: <XCircle className="w-4 h-4 text-rose-600" />
        };
      case 'completed':
        return {
          bg: 'bg-teal-50 border-teal-200 text-teal-800',
          dot: 'bg-teal-600',
          border: 'border-teal-400',
          icon: <ShieldCheck className="w-4 h-4 text-teal-600" />
        };
      case 'closed':
        return {
          bg: 'bg-slate-100 border-slate-300 text-slate-800',
          dot: 'bg-slate-600',
          border: 'border-slate-400',
          icon: <CheckCircle2 className="w-4 h-4 text-slate-600" />
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          dot: 'bg-slate-500',
          border: 'border-slate-300',
          icon: <Clock className="w-4 h-4 text-slate-500" />
        };
    }
  };

  // Compute progress bar percentage for desktop timeline connection line
  const lineFillPercentage = isAllCompleted ? 100 : Math.min(100, (currentIndex / (steps.length - 1)) * 100);

  return (
    <div ref={containerRef} className={`space-y-3.5 ${className}`}>
      {/* View Switcher Bar (Stepper vs Vertical Timeline) */}
      {allowToggleTimeline && (
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-blue-100 text-blue-700 rounded-md">
              <History className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-slate-800">
              มุมมองความคืบหน้า (Progress View)
            </span>
            {chronologicalTimelineEvents.length > 0 && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-full font-bold">
                {chronologicalTimelineEvents.length} เหตุการณ์
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('stepper')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                viewMode === 'stepper'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>ขั้นตอน (Stepper)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('vertical_timeline')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                viewMode === 'vertical_timeline'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>เส้นเวลาแนวตั้ง (Vertical Timeline)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2 py-1 rounded-md transition-all font-medium hidden md:flex items-center gap-1 ${
                viewMode === 'both'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แสดงทั้งสองแบบพร้อมกัน"
            >
              <span>แสดงคู่</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Standard Horizontal / Mobile Stepper View */}
      {(viewMode === 'stepper' || viewMode === 'both') && (
        <div className="relative px-2 py-4">
        {/* Desktop Connector Line Background */}
        <div className="absolute top-[34px] left-[12.5%] right-[12.5%] h-1 bg-slate-200 rounded-full z-0 hidden sm:block" />

        {/* Desktop Active Filled Connector Line */}
        <div
          className={`absolute top-[34px] left-[12.5%] h-1 rounded-full z-0 transition-all duration-700 hidden sm:block ${
            isRejected
              ? 'bg-gradient-to-r from-blue-500 via-amber-500 to-rose-500'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'
          }`}
          style={{ width: `${(currentIndex / 3) * 75}%` }}
        />

        {/* Mobile Vertical Connector Line Background */}
        <div className="absolute left-[30px] top-7 bottom-9 w-1 bg-slate-200 rounded-full z-0 sm:hidden" />
        <div
          className={`absolute left-[30px] top-7 w-1 rounded-full z-0 transition-all duration-700 sm:hidden ${
            isRejected
              ? 'bg-gradient-to-b from-blue-500 via-amber-500 to-rose-500'
              : 'bg-gradient-to-b from-blue-600 via-indigo-600 to-emerald-500'
          }`}
          style={{ height: `calc(${lineFillPercentage}% * 0.85)` }}
        />

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 sm:gap-3 relative z-10">
          {steps.map((st, idx) => {
            const isCompleted = isAllCompleted || idx < currentIndex;
            const isCurrent = !isAllCompleted && idx === currentIndex;
            const transitions = getStepTransitions(idx);
            const historyInfo = getStepHistoryInfo(idx);
            const isTooltipVisible = hoveredStepIndex === idx || tappedStepIndex === idx;

            // Node Circle Styling
            let nodeBg = 'bg-white border-slate-300 text-slate-400 hover:border-slate-400';
            let labelColor = 'text-slate-500';

            if (isCompleted) {
              nodeBg = 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-100 hover:ring-4 hover:ring-emerald-200';
              labelColor = 'text-slate-800 font-bold';
            } else if (isCurrent) {
              if (isRejected) {
                nodeBg = 'bg-rose-600 border-rose-600 text-white shadow-md ring-4 ring-rose-100 animate-pulse';
                labelColor = 'text-rose-900 font-extrabold';
              } else if (isActionRequired) {
                nodeBg = 'bg-purple-600 border-purple-600 text-white shadow-md ring-4 ring-purple-100 animate-pulse';
                labelColor = 'text-purple-900 font-extrabold';
              } else {
                nodeBg = 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 animate-pulse';
                labelColor = 'text-blue-900 font-extrabold';
              }
            }

            // Fallback native title for quick native tooltip
            const nativeTooltipText = transitions.length > 0
              ? transitions.map(t => `[${t.exactTimeTh} ${t.shortDate}] ${t.statusLabelTh} โดย ${t.actor}${t.note ? ` - ${t.note}` : ''}`).join('\n')
              : `${st.labelTh} (${st.labelEn}) - ${isCompleted ? 'เสร็จสิ้นแล้ว' : isCurrent ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}`;

            return (
              <div
                key={st.id}
                className="relative flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-3 sm:gap-2 group/step cursor-pointer select-none"
                onMouseEnter={() => setHoveredStepIndex(idx)}
                onMouseLeave={() => setHoveredStepIndex(null)}
                onClick={() => setTappedStepIndex(prev => prev === idx ? null : idx)}
                onFocus={() => setHoveredStepIndex(idx)}
                onBlur={() => setHoveredStepIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`ขั้นตอนที่ ${st.stepNumber}: ${st.labelTh}. ชี้หรือแตะเพื่อดูวันเวลาที่เปลี่ยนสถานะ`}
              >
                {/* Milestone Node Circle */}
                <div
                  title={nativeTooltipText}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 transform group-hover/step:scale-105 ${nodeBg}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    st.icon
                  )}
                </div>

                {/* Step Details */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center sm:justify-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                      STEP {st.stepNumber}
                    </span>
                    
                    {/* Status Pill Badge */}
                    {isCompleted ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        ✓ เสร็จแล้ว
                      </span>
                    ) : isCurrent ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs inline-flex items-center gap-1 ${
                        isRejected 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : isActionRequired 
                          ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {isRejected ? '✕ ไม่อนุมัติ' : isActionRequired ? '⚠ ขอเอกสารเพิ่ม' : '⏳ กำลังดำเนินการ'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1">
                        ○ รอดำเนินการ
                      </span>
                    )}

                    {/* Small hover indicator cue */}
                    {transitions.length > 0 && (
                      <span className="text-[9px] font-mono text-slate-400 group-hover/step:text-blue-600 transition-colors inline-flex items-center gap-0.5" title="ชี้เพื่อดูวันเวลาที่เปลี่ยนสถานะ">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">เวลา</span>
                      </span>
                    )}
                  </div>

                  <h5 className={`text-xs leading-snug transition-colors group-hover/step:text-blue-700 ${labelColor}`}>
                    {st.labelTh}
                  </h5>

                  <p className="text-[10px] font-medium text-slate-400 leading-tight">
                    {st.labelEn}
                  </p>

                  {showDetails && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {st.description}
                    </p>
                  )}

                  {/* Static compact timestamp summary */}
                  {historyInfo?.timestamp && (
                    <div className="mt-1.5 space-y-1">
                      <div className="text-[10px] text-slate-600 font-mono flex items-center sm:justify-center gap-1 font-semibold bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-md inline-flex flex-wrap group-hover/step:bg-blue-50 group-hover/step:border-blue-200 transition-colors">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0 group-hover/step:text-blue-500" />
                        <span>{historyInfo.exactTimeTh || historyInfo.timestamp}</span>
                        {historyInfo.actor && (
                          <span className="text-slate-500 font-normal border-l border-slate-300 pl-1 ml-0.5">
                            โดย {historyInfo.actor}
                          </span>
                        )}
                      </div>

                      {historyInfo.note && (
                        <p className="text-[10px] text-slate-600 bg-amber-50/80 border border-amber-200/70 p-1.5 rounded-md leading-relaxed text-left">
                          <strong className="text-amber-900">หมายเหตุ:</strong> {historyInfo.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================================
                    RICH HOVER-OVER TOOLTIP WITH EXACT DATE AND TIME
                    ========================================================= */}
                {isTooltipVisible && (
                  <div
                    role="tooltip"
                    className={`absolute z-50 transition-all duration-200 ease-out transform pointer-events-auto sm:pointer-events-none group-hover/step:pointer-events-auto
                      bottom-full mb-3.5
                      ${
                        idx === 0
                          ? 'left-0 sm:left-0 sm:translate-x-0'
                          : idx === steps.length - 1
                          ? 'right-0 sm:right-0 sm:left-auto sm:translate-x-0'
                          : 'left-1/2 -translate-x-1/2'
                      }
                      w-80 sm:w-92 max-w-[calc(100vw-2.5rem)]
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Tooltip Card Container */}
                    <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 space-y-3 text-left">
                      {/* Tooltip Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60">
                              ขั้นตอนที่ {st.stepNumber} จาก 4
                            </span>
                            {isCompleted ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                                ✓ สำเร็จแล้ว
                              </span>
                            ) : isCurrent ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                isRejected
                                  ? 'text-rose-400 bg-rose-950/80 border-rose-800/60'
                                  : isActionRequired
                                  ? 'text-purple-400 bg-purple-950/80 border-purple-800/60'
                                  : 'text-amber-400 bg-amber-950/80 border-amber-800/60'
                              }`}>
                                ⏳ ขั้นตอนปัจจุบัน
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                                ○ รอดำเนินการ
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 pt-1">
                            {st.icon}
                            <span>{st.labelTh}</span>
                            <span className="text-xs font-normal text-slate-400">({st.labelEn})</span>
                          </h4>
                        </div>

                        {/* Mobile close tap button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTappedStepIndex(null);
                            setHoveredStepIndex(null);
                          }}
                          className="sm:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
                          aria-label="ปิดกล่องข้อความ"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Transition History Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                          <span className="flex items-center gap-1.5 text-blue-300">
                            <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>ประวัติการเปลี่ยนสถานะ (Status Transition History)</span>
                          </span>
                          {transitions.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                              {transitions.length} รายการ
                            </span>
                          )}
                        </div>

                        {/* List of exact status transitions occurred */}
                        {transitions.length > 0 ? (
                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {transitions.map((trans, tIdx) => (
                              <div
                                key={`${trans.status}-${trans.timestamp}-${tIdx}`}
                                className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                                  trans.isCurrentStatus
                                    ? 'bg-slate-800/90 border-blue-500/50 shadow-xs'
                                    : 'bg-slate-800/50 border-slate-700/60'
                                }`}
                              >
                                {/* Transition Header Badge */}
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                    <span>{trans.statusLabelTh}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({trans.statusLabelEn})</span>
                                  </span>

                                  {transitions.length > 1 && (
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                                      ลำดับที่ {tIdx + 1}
                                    </span>
                                  )}
                                </div>

                                {/* Exact Date and Time with Seconds */}
                                <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="text-[11px] text-slate-200">{trans.fullDate}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="text-[11px] font-bold text-amber-300 tracking-wide">
                                      เวลา {trans.exactTimeTh}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      ({trans.timeWithSeconds})
                                    </span>
                                  </div>
                                </div>

                                {/* Actor info */}
                                {trans.actor && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300 pt-0.5">
                                    <UserCheck className="w-3 h-3 text-sky-400 shrink-0" />
                                    <span>
                                      ผู้ทำรายการ: <strong className="text-slate-100 font-medium">{trans.actor}</strong>
                                    </span>
                                  </div>
                                )}

                                {/* Remarks / Notes if present */}
                                {trans.note && (
                                  <div className="text-[10px] text-amber-200/90 bg-amber-950/30 border border-amber-800/40 rounded-md p-1.5 leading-relaxed">
                                    <span className="font-semibold text-amber-300">บันทึก:</span> {trans.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Fallback when no transition history exists for this step yet */
                          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                              <Info className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>ยังไม่มีประวัติการเปลี่ยนสถานะในขั้นตอนนี้</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
                              {isCurrent
                                ? 'ขั้นตอนนี้เป็นขั้นตอนปัจจุบันที่กำลังอยู่ระหว่างการดำเนินการ'
                                : 'จะมีการบันทึกวัน-เวลาและผู้ทำรายการแบบเรียลไทม์เมื่อคำร้องดำเนินมาถึงขั้นตอนนี้'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tooltip Footer Info */}
                      <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Sparkles className="w-3 h-3 text-blue-400" />
                          <span>บันทึกตามเวลามาตรฐานระดับวินาที</span>
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">
                          {isCompleted ? '✓ บันทึกสมบูรณ์' : isCurrent ? '⏳ อัปเดตล่าสุด' : '○ รอดำเนินการ'}
                        </span>
                      </div>
                    </div>

                    {/* Downward Pointer Arrow */}
                    <div
                      className={`absolute -bottom-1.5 w-3.5 h-3.5 bg-slate-900 border-r border-b border-slate-700/80 rotate-45 transform ${
                        idx === 0
                          ? 'left-6 sm:left-6'
                          : idx === steps.length - 1
                          ? 'right-6 sm:right-6 sm:left-auto'
                          : 'left-1/2 -translate-x-1/2'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 2. Enhanced Vertical Timeline View */}
      {(viewMode === 'vertical_timeline' || viewMode === 'both') && (
        <div className="bg-white/95 rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
          {/* Timeline Header & Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-slate-800">
                  ประวัติการเปลี่ยนสถานะตามลำดับเวลา (Status Change Timeline)
                </h5>
                <p className="text-[11px] text-slate-500">
                  แสดงวัน-เวลาที่เกิดการเปลี่ยนสถานะจริง พร้อมข้อมูลเจ้าหน้าที่ผู้ดำเนินการและบันทึกช่วยจำ
                </p>
              </div>
            </div>

            {/* Sort Toggle (Latest first vs Oldest first) */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">เรียงลำดับ:</span>
              <button
                type="button"
                onClick={() => setTimelineSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition-colors"
                title="คลิกเพื่อสลับลำดับการแสดงผล"
              >
                {timelineSortOrder === 'desc' ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>ล่าสุดก่อน (Newest First)</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>เก่าสุดก่อน (Oldest First)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Timeline Node List */}
          {chronologicalTimelineEvents.length === 0 ? (
            <div className="text-center py-6 text-slate-400 space-y-1">
              <History className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-xs font-medium">ยังไม่มีประวัติการเปลี่ยนสถานะที่บันทึกไว้</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-slate-200 before:to-slate-200">
              {chronologicalTimelineEvents.map((evt, idx) => {
                const style = getStatusBadgeStyle(evt.status);
                const isFirst = idx === 0;

                return (
                  <div key={`${evt.status}-${evt.timestamp}-${idx}`} className="relative group">
                    {/* Timeline Node Dot / Icon */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${style.border} ${
                        evt.isCurrentStatus ? 'ring-3 ring-blue-100' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    </div>

                    {/* Timeline Event Card */}
                    <div
                      className={`rounded-xl border p-3.5 transition-all text-xs space-y-2 ${
                        evt.isCurrentStatus
                          ? 'bg-blue-50/40 border-blue-200/90 shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      {/* Top Header: Status Name & Date-Time Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border inline-flex items-center gap-1.5 ${style.bg}`}
                          >
                            {style.icon}
                            <span>{evt.statusLabelTh}</span>
                            <span className="text-[10px] opacity-75 font-normal">({evt.statusLabelEn})</span>
                          </span>

                          {evt.isCurrentStatus && (
                            <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                              สถานะปัจจุบัน (Current)
                            </span>
                          )}

                          {isFirst && timelineSortOrder === 'desc' && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                              อัปเดตล่าสุด
                            </span>
                          )}
                        </div>

                        {/* Exact Date & Time with Seconds Precision */}
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-slate-800">{evt.fullDate}</span>
                          <span className="text-slate-400">|</span>
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-bold text-blue-700">{evt.exactTimeTh || evt.timeWithSeconds}</span>
                        </div>
                      </div>

                      {/* Actor & Action Detail */}
                      <div className="flex flex-wrap items-center gap-3 text-slate-600 pt-0.5">
                        {evt.actor && (
                          <div className="flex items-center gap-1 font-medium text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-500">ผู้ดำเนินการ:</span>
                            <span className="font-bold text-slate-800">{evt.actor}</span>
                          </div>
                        )}
                      </div>

                      {/* Note / Remarks if available */}
                      {evt.note && (
                        <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200 text-slate-700 text-[11px] flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong className="text-slate-800">บันทึกเพิ่มเติม:</strong> {evt.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Helpful discoverability hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 px-2 pt-1 border-t border-slate-200/60">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            {viewMode === 'vertical_timeline'
              ? 'แสดงประวัติการเปลี่ยนสถานะตามเวลามาตรฐานระดับวินาที สามารถสลับมุมมองเป็น Stepper ได้ที่แถบด้านบน'
              : 'ชี้เมาส์ (Hover) หรือแตะที่ขั้นตอน เพื่อดูวันและเวลาที่เปลี่ยนสถานะจริงระดับวินาทีในประวัติคำร้อง'}
          </span>
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          4 ขั้นตอนมาตรฐาน
        </span>
      </div>
    </div>
  );
};


