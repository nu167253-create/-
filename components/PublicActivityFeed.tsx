import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { RequestItem, RequestCategory, RequestStatus } from '../types/request';
import { getStoredRequests } from '../utils/storage';
import { subscribeToFirestoreRequests } from '../utils/firestoreService';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Search, 
  Filter, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  FileText, 
  Sparkles, 
  Eye, 
  RefreshCw, 
  Lock, 
  Copy, 
  ExternalLink,
  Zap,
  Camera,
  FileCheck,
  Calendar,
  Wrench,
  Receipt,
  HelpCircle,
  Building2,
  Check
} from 'lucide-react';

interface PublicActivityFeedProps {
  onSelectTrack?: (requestId: string) => void;
  className?: string;
}

export interface ActivityFeedEvent {
  id: string;
  requestId: string;
  category: RequestCategory;
  categoryLabel: string;
  title: string;
  status: RequestStatus;
  previousStatus?: RequestStatus;
  timestamp: string;
  anonymizedApplicant: string;
  actor: string;
  note?: string;
  department?: string;
}

// Category Helper Definitions
const CATEGORY_MAP: Record<RequestCategory, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  cctv: {
    label: 'ขอดูภาพกล้องวงจรปิด',
    icon: <Camera className="w-3.5 h-3.5 text-indigo-600" />,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200'
  },
  certificate: {
    label: 'ขอหนังสือรับรอง / เอกสาร',
    icon: <FileCheck className="w-3.5 h-3.5 text-blue-600" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  leave: {
    label: 'ยื่นใบลาพักผ่อน / ปฏิบัติงาน',
    icon: <Calendar className="w-3.5 h-3.5 text-emerald-600" />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  maintenance: {
    label: 'แจ้งซ่อมแซมอุปกรณ์ / กล้อง',
    icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  budget: {
    label: 'อนุมัติงบประมาณ / ใบเบิก',
    icon: <Receipt className="w-3.5 h-3.5 text-purple-600" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  general: {
    label: 'คำร้องทั่วไป / สอบถาม',
    icon: <HelpCircle className="w-3.5 h-3.5 text-teal-600" />,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200'
  }
};

// Status Helper Definitions
const STATUS_MAP: Record<RequestStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'ยื่นคำร้องใหม่',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <Clock className="w-3.5 h-3.5 text-blue-600" />
  },
  under_review: {
    label: 'อยู่ระหว่างตรวจสอบ',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
  },
  action_required: {
    label: 'ต้องการข้อมูลเพิ่ม',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
  },
  approved: {
    label: 'อนุมัติเรียบร้อยแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
  },
  rejected: {
    label: 'ไม่อนุมัติ / สั่งตก',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />
  },
  completed: {
    label: 'ดำเนินการเสร็จสมบูรณ์',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
  },
  draft: {
    label: 'ฉบับร่าง',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />
  },
  closed: {
    label: 'ปิดงาน / เสร็จสิ้น',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
  }
};

// Mask ID for privacy (e.g. REQ-20260806-001 -> REQ-****-001)
const anonymizeRequestId = (id: string): string => {
  if (!id) return 'REQ-****';
  const parts = id.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-****-${parts[parts.length - 1]}`;
  }
  if (id.length > 8) {
    return `${id.substring(0, 3)}****${id.substring(id.length - 3)}`;
  }
  return `${id.substring(0, 2)}****`;
};

// Mask full name for PDPA compliance
const anonymizeFullName = (name?: string, prefix?: string): string => {
  if (!name || name.trim() === '') return 'ประชาชนทั่วไป';
  const cleanName = name.trim();
  const nameParts = cleanName.split(' ');
  const pfx = prefix || '';

  if (nameParts.length >= 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[1];
    const maskedFirst = firstName.length > 1 ? `${firstName.charAt(0)}...` : firstName;
    const maskedLast = lastName.length > 1 ? `${lastName.charAt(0)}...` : lastName;
    return `${pfx}${maskedFirst} ${maskedLast}`;
  }
  return `${pfx}${cleanName.charAt(0)}***`;
};

// Relative Time Formatter (Thai)
const formatRelativeTimeTh = (isoString: string): string => {
  try {
    const eventTime = new Date(isoString).getTime();
    if (isNaN(eventTime)) return 'เมื่อสักครู่';

    const now = Date.now();
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'เมื่อสักครู่นี้';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays === 1) return 'เมื่อวานนี้';
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return new Date(isoString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'เมื่อเร็วๆ นี้';
  }
};

export const PublicActivityFeed: React.FC<PublicActivityFeedProps> = ({
  onSelectTrack,
  className = ''
}) => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'ticker'>('cards');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString('th-TH'));

  // Load and subscribe to real-time request updates
  useEffect(() => {
    // Initial load from storage
    const initial = getStoredRequests();
    setRequests(initial);

    // Real-time firestore subscription
    const unsubscribe = subscribeToFirestoreRequests((items) => {
      if (items && items.length > 0) {
        setRequests(items);
        setLastRefreshedAt(new Date().toLocaleTimeString('th-TH'));
      }
    });

    return () => unsubscribe();
  }, []);

  // Extract activity feed events from status history
  const allActivityEvents = useMemo(() => {
    const events: ActivityFeedEvent[] = [];

    requests.forEach((req) => {
      // 1. Created event
      const catDef = CATEGORY_MAP[req.category] || CATEGORY_MAP.general;
      const anonApplicant = anonymizeFullName(req.applicant?.fullName, req.applicant?.prefix);

      // Sanitize title for general public feed
      let safeTitle = req.title || 'คำร้องออนไลน์';
      if (safeTitle.length > 60) {
        safeTitle = `${safeTitle.substring(0, 58)}...`;
      }

      // Add status history items or current status
      if (req.statusHistory && req.statusHistory.length > 0) {
        req.statusHistory.forEach((hist, index) => {
          const prevHist = index > 0 ? req.statusHistory[index - 1] : undefined;
          events.push({
            id: `${req.id}-hist-${index}`,
            requestId: req.id,
            category: req.category,
            categoryLabel: catDef.label,
            title: safeTitle,
            status: hist.status,
            previousStatus: prevHist?.status,
            timestamp: hist.timestamp || req.createdAt,
            anonymizedApplicant: anonApplicant,
            actor: hist.actor || 'เจ้าหน้าที่ผู้รับผิดชอบ',
            note: hist.note,
            department: req.applicant?.department
          });
        });
      } else {
        // Fallback if no history items exist yet
        events.push({
          id: `${req.id}-created`,
          requestId: req.id,
          category: req.category,
          categoryLabel: catDef.label,
          title: safeTitle,
          status: req.status,
          timestamp: req.createdAt,
          anonymizedApplicant: anonApplicant,
          actor: 'ผู้ยื่นคำร้อง',
          department: req.applicant?.department
        });
      }
    });

    // Sort events newest first
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  }, [requests]);

  // Filtered Activity Events
  const filteredEvents = useMemo(() => {
    return allActivityEvents.filter((ev) => {
      // Category Filter
      if (selectedCategoryFilter !== 'all' && ev.category !== selectedCategoryFilter) {
        return false;
      }
      // Status Filter
      if (selectedStatusFilter !== 'all' && ev.status !== selectedStatusFilter) {
        return false;
      }
      // Search Query Filter
      if ((searchQuery || '').trim() !== '') {
        const queryLower = (searchQuery || '').toLowerCase().trim();
        const matchId = (ev.requestId || '').toLowerCase().includes(queryLower);
        const matchTitle = (ev.title || '').toLowerCase().includes(queryLower);
        const matchCat = (ev.categoryLabel || '').toLowerCase().includes(queryLower);
        if (!matchId && !matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [allActivityEvents, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalReqs = requests.length;
    const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
    const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
    const successRate = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 100;

    return {
      totalReqs,
      approvedCount,
      pendingCount,
      successRate
    };
  }, [requests]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden space-y-0 ${className}`}>
      
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Transparency Stream
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                • อัปเดตล่าสุด {lastRefreshedAt} น.
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-indigo-400 shrink-0" />
              <span>Public Transparency Feed (ติดตามการดำเนินงานสาธารณะ)</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              รายงานการอัปเดตสถานะคำร้องและผลการพิจารณาในระบบแบบ Real-Time ไม่ระบุตัวตนบุคคล เพื่อสร้างความโปร่งใสและตรวจสอบได้ในองค์กร
            </p>
          </div>

          {/* Action / View Switch */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                📜 รายการการ์ด
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ticker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'ticker'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ⚡ ข้อความวิ่งสด
              </button>
            </div>
          </div>
        </div>

        {/* Public Summary Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              รวมคำร้องสาธารณะ
            </span>
            <div className="text-xl font-black text-white font-mono flex items-center justify-between">
              <span>{metrics.totalReqs}</span>
              <FileText className="w-4 h-4 text-indigo-400 opacity-60" />
            </div>
            <span className="text-[10px] text-indigo-300 font-medium block">คำร้องทั้งหมดในระบบ</span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              อนุมัติ / สำเร็จแล้ว
            </span>
            <div className="text-xl font-black text-emerald-300 font-mono flex items-center justify-between">
              <span>{metrics.approvedCount}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60" />
            </div>
            <span className="text-[10px] text-emerald-200 font-medium block">อัตราการอนุมัติ {metrics.successRate}%</span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
              กำลังดำเนินการ
            </span>
            <div className="text-xl font-black text-amber-300 font-mono flex items-center justify-between">
              <span>{metrics.pendingCount}</span>
              <Clock className="w-4 h-4 text-amber-400 opacity-60" />
            </div>
            <span className="text-[10px] text-amber-200 font-medium block">อยู่ระหว่างเจ้าหน้าที่ตรวจเสนอ</span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-md space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-blue-300 block tracking-wider">
              ความเร็วเฉลี่ย
            </span>
            <div className="text-xl font-black text-blue-200 font-mono flex items-center justify-between">
              <span>1-2 วัน</span>
              <TrendingUp className="w-4 h-4 text-blue-400 opacity-60" />
            </div>
            <span className="text-[10px] text-blue-200 font-medium block">การพิจารณาตามมาตรฐาน e-Service</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🌐 ทุกหมวดหมู่ ({allActivityEvents.length})
            </button>

            {Object.entries(CATEGORY_MAP).map(([catKey, catDef]) => {
              const count = allActivityEvents.filter(e => e.category === catKey).length;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(catKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedCategoryFilter === catKey
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {catDef.icon}
                  <span>{catDef.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedCategoryFilter === catKey ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Select Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">ทุกสถานะการพิจารณา</option>
              <option value="submitted">📥 ยื่นคำร้องใหม่</option>
              <option value="under_review">🔍 อยู่ระหว่างตรวจสอบ</option>
              <option value="approved">✅ อนุมัติแล้ว</option>
              <option value="completed">🎉 ดำเนินการเสร็จสมบูรณ์</option>
              <option value="rejected">❌ ไม่อนุมัติ / สั่งตก</option>
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามรหัสคำร้องย่อ (เช่น REQ-****-001) หรือหัวข้อคำร้อง..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* FEED CONTENT AREA */}
      <div className="p-5">

        {/* LIVE TICKER MODE */}
        {viewMode === 'ticker' ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                  สตรีมข้อความวิ่งกิจกรรมล่าสุด (Live Ticker)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  แสดง {filteredEvents.length} กิจกรรมล่าสุด
                </span>
              </div>

              {/* Ticker Items Container */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    ไม่พบรายการอัปเดตตามเงื่อนไขที่เลือก
                  </p>
                ) : (
                  filteredEvents.map((ev, idx) => {
                    const st = STATUS_MAP[ev.status] || STATUS_MAP.submitted;
                    const cat = CATEGORY_MAP[ev.category] || CATEGORY_MAP.general;
                    const anonId = anonymizeRequestId(ev.requestId);

                    return (
                      <div 
                        key={ev.id || idx}
                        className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all flex flex-wrap items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs" />
                          <div className="space-y-0.5 truncate">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                                #{anonId}
                              </span>
                              <span className="text-slate-300 font-semibold truncate max-w-xs">
                                {ev.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${st.bg} ${st.text} border ${st.border}`}>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>ยื่นโดย: <strong className="text-slate-200">{ev.anonymizedApplicant}</strong></span>
                              <span>•</span>
                              <span>{formatRelativeTimeTh(ev.timestamp)}</span>
                            </p>
                          </div>
                        </div>

                        {onSelectTrack && (
                          <button
                            type="button"
                            onClick={() => onSelectTrack(ev.requestId)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0"
                          >
                            <span>ตรวจสอบ</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* CARDS VIEW MODE */
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <Search className="w-10 h-10 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">ไม่พบข้อมูลการอัปเดตคำร้อง</h4>
                  <p className="text-xs text-slate-500">
                    ลองเปลี่ยนเงื่อนไขการค้นหา หรือเลือกตัวกรองหมวดหมู่อื่น
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('all');
                    setSelectedStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredEvents.map((ev, idx) => {
                  const st = STATUS_MAP[ev.status] || STATUS_MAP.submitted;
                  const cat = CATEGORY_MAP[ev.category] || CATEGORY_MAP.general;
                  const anonId = anonymizeRequestId(ev.requestId);

                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.28, 
                        delay: Math.min(idx * 0.04, 0.28),
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      whileHover={{ 
                        y: -3, 
                        boxShadow: '0 10px 24px -5px rgba(0, 0, 0, 0.08), 0 4px 8px -3px rgba(0, 0, 0, 0.03)',
                        transition: { duration: 0.2 } 
                      }}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs transition-colors space-y-3 group relative overflow-hidden"
                    >
                      {/* Top Bar inside Card */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${cat.bg} ${cat.color} ${cat.border}`}>
                            {cat.icon}
                            <span>{cat.label}</span>
                          </span>

                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            #{anonId}
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatRelativeTimeTh(ev.timestamp)}
                        </span>
                      </div>

                      {/* Request Title & Anonymized Applicant */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-xs md:text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {ev.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            ผู้ยื่น: <strong className="text-slate-800 font-bold">{ev.anonymizedApplicant}</strong>
                          </span>

                          {ev.department && (
                            <span className="text-slate-400 font-medium">
                              {ev.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Officer Note */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1.5 ${st.bg} ${st.text} ${st.border}`}>
                            {st.icon}
                            <span>{st.label}</span>
                          </span>

                          {ev.note && (
                            <span className="text-[10px] text-slate-500 italic max-w-[180px] truncate">
                              "{ev.note}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(e, ev.requestId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="คัดลอกรหัสคำร้องจริง (สำหรับเจ้าของคำร้อง)"
                          >
                            {copiedId === ev.requestId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {onSelectTrack && (
                            <button
                              type="button"
                              onClick={() => onSelectTrack(ev.requestId)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-[11px] font-bold transition-all flex items-center gap-1"
                            >
                              <span>ติดตาม</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PDPA Privacy Notice Disclaimer */}
        <div className="mt-6 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <span className="font-bold block text-indigo-900">
              การคุ้มครองข้อมูลส่วนบุคคล (PDPA Transparency Standard)
            </span>
            <p className="text-[11px] text-indigo-800/90 leading-relaxed">
              ข้อมูลชื่อ-นามสกุล และรหัสคำร้องที่ปรากฏใน Public Feed ถูกเข้ารหัสปกปิดตัวตน (Anonymized) เพื่อคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ท่านเจ้าของเรื่องสามารถใช้รหัสติดตามฉบับเต็มในการตรวจสอบรายละเอียดเชิงลึกผ่านเมนู "ติดตามสถานะคำร้อง" ได้โดยตรง
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
