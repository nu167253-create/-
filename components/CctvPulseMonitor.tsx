import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CctvCamera } from '../types/cctv';
import {
  CameraPulseState,
  ConnectivityDropEvent,
  PulseCheckSummary,
  getStoredDropLogs,
  saveDropLogs,
  acknowledgeDropAlert,
  acknowledgeAllDropAlerts,
  clearDropLogs,
  getAudioMutedSetting,
  setAudioMutedSetting,
  playDropAlertChime,
  playHeartbeatChime,
  runDatabasePulseCheck,
  simulateCameraConnectivityDrop,
  restoreAllCamerasToOnline
} from '../utils/cctvPulseMonitorService';
import { updateCctvStatus } from '../data/cctvData';
import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  ExternalLink,
  Wrench,
  Radio,
  Zap,
  Server,
  Layers,
  Check,
  Download,
  Trash2,
  ChevronRight,
  TrendingUp,
  Cpu,
  Eye,
  Sliders,
  Play
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface CctvPulseMonitorProps {
  cameras: CctvCamera[];
  onSelectCamera?: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onRefreshData?: () => void;
}

export const CctvPulseMonitor: React.FC<CctvPulseMonitorProps> = ({
  cameras,
  onSelectCamera,
  onReportRepairForCamera,
  onRefreshData
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<'matrix' | 'logs' | 'cabinets'>('matrix');
  const [autoPulseInterval, setAutoPulseInterval] = useState<number>(5); // 3s, 5s, 10s, 30s, 0 (manual)
  const [countdown, setCountdown] = useState<number>(5);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(getAudioMutedSetting());
  const [pulseStates, setPulseStates] = useState<Map<string, CameraPulseState>>(new Map());
  const [dropLogs, setDropLogs] = useState<ConnectivityDropEvent[]>(getStoredDropLogs());
  const [summary, setSummary] = useState<PulseCheckSummary | null>(null);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString('th-TH'));

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'drops'>('all');
  const [selectedCabinet, setSelectedCabinet] = useState<string>('all');
  const [viewDensity, setViewDensity] = useState<'cards' | 'compact'>('cards');

  // Selected camera for pulse diagnostic modal
  const [inspectedCamera, setInspectedCamera] = useState<CctvCamera | null>(null);
  const [pingHistory, setPingHistory] = useState<Array<{ time: string; latency: number }>>([]);

  // Toast notice for officer actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Heartbeat animation frame
  const [heartbeatTick, setHeartbeatTick] = useState(0);

  // Trigger pulse check against database
  const executePulseCheck = () => {
    setIsCheckingNow(true);
    const { updatedStates, summary: newSummary } = runDatabasePulseCheck(pulseStates);
    setPulseStates(updatedStates);
    setSummary(newSummary);
    setDropLogs(getStoredDropLogs());
    setLastCheckTime(new Date().toLocaleTimeString('th-TH'));
    setHeartbeatTick((prev) => prev + 1);

    if (onRefreshData) {
      onRefreshData();
    }

    setTimeout(() => {
      setIsCheckingNow(false);
    }, 400);
  };

  // Initial check on mount
  useEffect(() => {
    executePulseCheck();
  }, []);

  // Periodic Pulse Check interval
  useEffect(() => {
    if (autoPulseInterval === 0) return;

    setCountdown(autoPulseInterval);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          executePulseCheck();
          return autoPulseInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPulseInterval]);

  // Sync audio muted state
  const handleToggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    setAudioMutedSetting(nextMuted);
    if (!nextMuted) {
      playHeartbeatChime();
      showToast('🔊 เปิดเสียงสัญญาณเตือนเรียบร้อยแล้ว');
    } else {
      showToast('🔇 ปิดเสียงสัญญาณเตือนแล้ว');
    }
  };

  // Handle acknowledge single drop
  const handleAcknowledge = (dropId: string) => {
    const updated = acknowledgeDropAlert(dropId, 'เจ้าหน้าที่ศูนย์สั่งการ CCTV');
    setDropLogs(updated);
    showToast('✅ รับทราบเหตุสัญญาณขาดหายเรียบร้อย');
  };

  // Handle acknowledge all drops
  const handleAcknowledgeAll = () => {
    const updated = acknowledgeAllDropAlerts('เจ้าหน้าที่ศูนย์สั่งการ CCTV');
    setDropLogs(updated);
    showToast('✅ รับทราบเหตุการณ์ทั้งหมดเรียบร้อยแล้ว');
  };

  // Simulate connectivity drop test
  const handleSimulateDrop = () => {
    const result = simulateCameraConnectivityDrop();
    if (result) {
      executePulseCheck();
      showToast(`⚡ จำลองเหตุสัญญาณหลุดที่กล้อง "${result.cameraName}" สำเร็จ!`);
    } else {
      showToast('ไม่พบกล้องสถานะออนไลน์สำหรับจำลองเหตุ');
    }
  };

  // Restore all cameras to online
  const handleRestoreAll = () => {
    const count = restoreAllCamerasToOnline();
    executePulseCheck();
    showToast(`✅ กู้คืนสัญญาณกล้องทั้งหมด ${count} ตัว กลับสู่ออนไลน์เรียบร้อย`);
  };

  // Clear log history
  const handleClearLogs = () => {
    if (confirm('คุณต้องการล้างประวัติบันทึกเหตุการณ์สัญญาณหลุดทั้งหมดหรือไม่?')) {
      clearDropLogs();
      setDropLogs([]);
      showToast('ล้างประวัติการหลุดเรียบร้อย');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (dropLogs.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }
    const headers = ['ลำดับ', 'รหัสกล้อง', 'ชื่อจุดติดตั้ง', 'IP Address', 'โซน/ตู้ควบคุม', 'เวลาที่หลุด', 'สาเหตุ', 'สถานะการรับทราบ', 'ผู้รับทราบ'];
    const rows = dropLogs.map((log, idx) => [
      idx + 1,
      `"${log.cameraId}"`,
      `"${log.cameraName}"`,
      `"${log.ipAddress}"`,
      `"${log.zone || log.cabinetNumber || ''}"`,
      `"${new Date(log.droppedAt).toLocaleString('th-TH')}"`,
      `"${log.reason}"`,
      log.acknowledged ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ',
      `"${log.acknowledgedBy || '-'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CCTV_Drop_Incident_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ส่งออกไฟล์ CSV รายงานเหตุการณ์สัญญาณหลุดเรียบร้อย');
  };

  // Open diagnostic modal for a camera
  const handleInspectCamera = (cam: CctvCamera) => {
    setInspectedCamera(cam);
    const pulse = pulseStates.get(cam.id);
    const baseLatency = pulse?.latencyMs || (cam.status === 'online' ? 14 : 0);
    // Generate realistic 10-ping waveform
    const history = Array.from({ length: 10 }).map((_, i) => ({
      time: `-${(10 - i) * 2}s`,
      latency: cam.status === 'online' ? Math.max(8, baseLatency + Math.floor(Math.sin(i) * 5) + (i % 3)) : 0
    }));
    setPingHistory(history);
  };

  // Cabinets list
  const cabinetList = useMemo(() => {
    const set = new Set<string>();
    cameras.forEach(c => {
      if (c.cabinetNumber) set.add(c.cabinetNumber);
      else if (c.zone?.includes('ตู้')) set.add(c.zone);
    });
    return Array.from(set);
  }, [cameras]);

  // Filtered cameras for pulse matrix
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const pulse = pulseStates.get(cam.id);
      const isOnline = cam.status === 'online';
      const isOffline = cam.status === 'offline' || cam.status === 'faulty';
      const isRecentDrop = pulse?.isRecentDrop;

      if (statusFilter === 'online' && !isOnline) return false;
      if (statusFilter === 'offline' && !isOffline) return false;
      if (statusFilter === 'drops' && !isRecentDrop && !isOffline) return false;

      if (selectedCabinet !== 'all') {
        const matchesCabinet = cam.cabinetNumber === selectedCabinet || cam.zone === selectedCabinet;
        if (!matchesCabinet) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cam.name.toLowerCase().includes(q);
        const matchesId = cam.id.toLowerCase().includes(q);
        const matchesIp = cam.ipAddress.toLowerCase().includes(q);
        const matchesZone = (cam.zone || '').toLowerCase().includes(q);
        const matchesBuilding = (cam.building || '').toLowerCase().includes(q);
        const matchesCommunity = (cam.community || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesIp && !matchesZone && !matchesBuilding && !matchesCommunity) {
          return false;
        }
      }

      return true;
    });
  }, [cameras, pulseStates, statusFilter, selectedCabinet, searchQuery]);

  // Unacknowledged drops
  const unacknowledgedDrops = useMemo(() => {
    return dropLogs.filter(d => !d.acknowledged);
  }, [dropLogs]);

  // Aggregate cabinet health
  const cabinetHealthMetrics = useMemo(() => {
    const map: Record<string, { total: number; online: number; offline: number; cameras: CctvCamera[] }> = {};
    cameras.forEach((cam) => {
      const cabName = cam.cabinetNumber ? `ตู้ควบคุม ${cam.cabinetNumber}` : (cam.zone?.includes('ตู้') ? cam.zone : 'จุดติดตั้งทั่วไป');
      if (!map[cabName]) {
        map[cabName] = { total: 0, online: 0, offline: 0, cameras: [] };
      }
      map[cabName].total++;
      if (cam.status === 'online') map[cabName].online++;
      else map[cabName].offline++;
      map[cabName].cameras.push(cam);
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      uptime: data.total > 0 ? Math.round((data.online / data.total) * 100) : 0
    })).sort((a, b) => a.uptime - b.uptime);
  }, [cameras]);

  const totalCams = cameras.length;
  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status === 'offline' || c.status === 'faulty').length;
  const uptimeRate = totalCams > 0 ? ((onlineCount / totalCams) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* TOP PULSE MONITOR HUD & HEARTBEAT CONTROLS */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ambient Radar Grid Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-4">
              {/* Radar Pulse Wave Beacon */}
              <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className={`absolute w-full h-full rounded-2xl bg-emerald-500/20 ${unacknowledgedDrops.length > 0 ? 'bg-rose-500/30 ring-2 ring-rose-500 animate-ping' : 'animate-ping'}`} />
                {unacknowledgedDrops.length > 0 ? (
                  <WifiOff className="w-7 h-7 text-rose-400 relative z-10 animate-bounce" />
                ) : (
                  <Activity className="w-7 h-7 text-emerald-400 relative z-10 animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE PULSE ENGINE
                  </span>
                  <span className="text-xs text-slate-400">
                    อัปเดตล่าสุด: <strong className="text-slate-200">{lastCheckTime}</strong>
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
                  ระบบตรวจจับชีพจรกล้องวงจรปิดเรียลไทม์
                </h2>
                <p className="text-xs text-slate-300">
                  ตรวจสอบการตอบสนองระดับฮาร์ตบีต (Ping & Frame Health) เทียบเคียงฐานข้อมูลกล้องเทศบาล พร้อมแจ้งเตือนเหตุสัญญาณหลุดทันที
                </p>
              </div>
            </div>

            {/* Controls Bar: Interval, Manual Check, Audio, Test simulation */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              {/* Sound Toggle */}
              <button
                onClick={handleToggleAudio}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAudioMuted
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950'
                }`}
                title={isAudioMuted ? 'เปิดเสียงแจ้งเตือนสัญญาณหลุด' : 'ปิดเสียงแจ้งเตือนสัญญาณหลุด'}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">{isAudioMuted ? 'เสียง: ปิด' : 'เสียง: เปิด'}</span>
              </button>

              {/* Polling Interval Select */}
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-400 hidden sm:inline">ตรวจอัตโนมัติ:</span>
                <select
                  value={autoPulseInterval}
                  onChange={(e) => setAutoPulseInterval(Number(e.target.value))}
                  className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
                >
                  <option value={3} className="bg-slate-900 text-white">ทุก 3 วินาที (ด่วนพิเศษ)</option>
                  <option value={5} className="bg-slate-900 text-white">ทุก 5 วินาที (แนะนำ)</option>
                  <option value={10} className="bg-slate-900 text-white">ทุก 10 วินาที</option>
                  <option value={30} className="bg-slate-900 text-white">ทุก 30 วินาที</option>
                  <option value={0} className="bg-slate-900 text-white">ปิดตรวจอัตโนมัติ (Manual)</option>
                </select>
                {autoPulseInterval > 0 && (
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 font-mono text-[11px] font-bold flex items-center justify-center ml-1">
                    {countdown}s
                  </span>
                )}
              </div>

              {/* Pulse Check Now Button */}
              <button
                onClick={executePulseCheck}
                disabled={isCheckingNow}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingNow ? 'animate-spin' : ''}`} />
                <span>ตรวจชีพจรเดี๋ยวนี้</span>
              </button>

              {/* Simulation Drop Button */}
              <button
                onClick={handleSimulateDrop}
                className="px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="จำลองสถานการณ์สัญญาณหลุดเพื่อทดสอบระบบเตือนภัยและการทำงานของเจ้าหน้าที่"
              >
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden lg:inline">จำลองสัญญาณหลุด</span>
              </button>

              {/* Restore All Button */}
              <button
                onClick={handleRestoreAll}
                className="px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="กู้คืนสถานะสัญญาณกล้องทั้งหมดให้กลับมาเป็น Online"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">กู้คืนทั้งหมด</span>
              </button>
            </div>
          </div>

          {/* Quick HUD Metrics & Animated Rhythm Waveform */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Metric 1: System Uptime */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>อัตราความพร้อมใช้งาน</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-emerald-400">{uptimeRate}%</span>
                <span className="text-[11px] text-slate-400">ความพร้อมระบบ</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${uptimeRate}%` }}
                />
              </div>
            </div>

            {/* Metric 2: Live Online Streams */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>สัญญาณออนไลน์สด</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-white">{onlineCount}</span>
                <span className="text-xs text-slate-400">/ {totalCams} จุด</span>
              </div>
              <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> สตรีมภาพทำงานสมบูรณ์
              </p>
            </div>

            {/* Metric 3: Drops & Offline Alerts */}
            <div className={`rounded-2xl p-4 flex flex-col justify-between border transition-all ${
              unacknowledgedDrops.length > 0 
                ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/50' 
                : 'bg-slate-800/60 border-slate-700/60'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span className={unacknowledgedDrops.length > 0 ? 'text-rose-300 font-bold' : ''}>
                  สัญญาณขาดหาย / ออฟไลน์
                </span>
                <AlertTriangle className={`w-3.5 h-3.5 ${unacknowledgedDrops.length > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl lg:text-3xl font-black ${unacknowledgedDrops.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {offlineCount}
                </span>
                <span className="text-xs text-slate-400">จุดขัดข้อง</span>
              </div>
              <p className="text-[11px] text-rose-300 mt-1 font-medium">
                {unacknowledgedDrops.length > 0 ? `⚠️ รอรับทราบ ${unacknowledgedDrops.length} รายการ` : 'ไม่มีการหลุดใหม่'}
              </p>
            </div>

            {/* Metric 4: Average Latency */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>ค่าความหน่วงเฉลี่ย (Ping)</span>
                <Radio className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl lg:text-3xl font-black text-sky-400">
                  {summary ? `${summary.avgLatencyMs} ms` : '16 ms'}
                </span>
                <span className="text-[11px] text-slate-400">RTT</span>
              </div>
              <p className="text-[11px] text-sky-300/80 mt-1">Fiber Ring Latency ปลอดภัย</p>
            </div>

            {/* Metric 5: Visual Simulated Heartbeat Line (ECG / Pulse wave) */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>ชีพจรสัญญาณ (Rhythm)</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </div>
              <div className="h-10 flex items-center justify-center my-1 overflow-hidden relative">
                {/* SVG ECG line animation */}
                <svg className="w-full h-full text-emerald-400" viewBox="0 0 160 40" fill="none">
                  <path
                    d={`M 0 20 L 30 20 L 38 8 L 46 32 L 54 10 L 62 26 L 70 20 L 100 20 L 108 5 L 116 35 L 124 15 L 132 24 L 140 20 L 160 20`}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-80"
                  />
                </svg>
                {/* Scanning gradient glow */}
                <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-pulse" />
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono text-center">
                HEARTBEAT FREQ: {autoPulseInterval > 0 ? `${autoPulseInterval}s` : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE DROP ALERTS BANNER (เตือนเจ้าหน้าที่เมื่อตรวจพบกล้องหลุดสัญญาณ) */}
      {unacknowledgedDrops.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900/90 via-red-900/80 to-rose-950 text-white rounded-3xl p-5 shadow-2xl border-2 border-rose-500/70 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/30 border border-rose-400/60 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-6 h-6 text-rose-200 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase bg-rose-500 text-white animate-pulse">
                    สัญญาณขาดหายฉุกเฉิน ({unacknowledgedDrops.length} จุด)
                  </span>
                  <span className="text-xs text-rose-200">
                    ตรวจพบผ่าน Pulse Engine ประจำศูนย์ควบคุม
                  </span>
                </div>
                <h3 className="text-base md:text-lg font-bold text-white mt-1">
                  แจ้งเตือนด่วน: ตรวจพบกล้อง CCTV หลุดการเชื่อมต่อจากโครงข่าย
                </h3>
                <p className="text-xs text-rose-100/90 mt-0.5">
                  กล้องต่อไปนี้หยุดส่งสัญญาณภาพและไม่ตอบสนองต่อ Ping กรุณาตรวจสอบลิงก์ใยแก้วนำแสงหรือส่งช่างเทคนิคตรวจสอบจุดติดตั้ง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={handleAcknowledgeAll}
                className="px-4 py-2 rounded-xl bg-white text-rose-900 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-rose-800" />
                <span>รับทราบทั้งหมด ({unacknowledgedDrops.length})</span>
              </button>
            </div>
          </div>

          {/* Cards for top unacknowledged drops */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {unacknowledgedDrops.slice(0, 3).map((drop) => (
              <div
                key={drop.id}
                className="bg-black/40 border border-rose-400/40 rounded-2xl p-3.5 flex flex-col justify-between space-y-2 backdrop-blur-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800">
                      {drop.cameraId}
                    </span>
                    <span className="text-[11px] text-rose-200 font-mono">
                      {new Date(drop.droppedAt).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">{drop.cameraName}</h4>
                  <div className="text-xs text-rose-200/80 flex items-center gap-1 mt-0.5">
                    <span>IP: {drop.ipAddress}</span>
                    <span>•</span>
                    <span className="line-clamp-1">{drop.zone || drop.cabinetNumber}</span>
                  </div>
                  <p className="text-[11px] text-rose-300 mt-2 bg-rose-950/50 p-1.5 rounded-lg border border-rose-800/40 line-clamp-2">
                    สาเหตุ: {drop.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-rose-800/40 gap-2">
                  <button
                    onClick={() => {
                      const cam = cameras.find(c => c.id === drop.cameraId);
                      if (cam && onReportRepairForCamera) onReportRepairForCamera(cam);
                    }}
                    className="text-xs text-rose-200 hover:text-white flex items-center gap-1 font-semibold cursor-pointer underline"
                  >
                    <Wrench className="w-3.5 h-3.5 text-rose-300" />
                    แจ้งช่างซ่อม
                  </button>
                  <button
                    onClick={() => handleAcknowledge(drop.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    รับทราบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT TABS & FILTER BAR */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
        {/* Navigation Tabs and Search / Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* View Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>กระดานชีพจรสด (Live Pulse Matrix)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                {cameras.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-4 h-4 text-rose-600" />
              <span>ประวัติสัญญาณหลุด (Drop Logs)</span>
              {dropLogs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold font-mono">
                  {dropLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('cabinets')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'cabinets'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>สุขภาพจุดรวมตู้ควบคุม (Cabinets & Nodes)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                {cabinetHealthMetrics.length}
              </span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {activeTab === 'logs' && (
              <>
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>ส่งออก CSV</span>
                </button>
                <button
                  onClick={handleClearLogs}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>ล้างประวัติ</span>
                </button>
              </>
            )}

            {activeTab === 'matrix' && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setViewDensity('cards')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    viewDensity === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  การ์ดละเอียด
                </button>
                <button
                  onClick={() => setViewDensity('compact')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    viewDensity === 'compact' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  เมทริกซ์กระทัดรัด
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: LIVE PULSE MATRIX VIEW */}
        {activeTab === 'matrix' && (
          <div className="space-y-5">
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสกล้อง, ชื่อ, IP, โซนตู้ควบคุม..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <div className="flex items-center flex-wrap gap-1.5 w-full md:w-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทั้งหมด ({cameras.length})
                </button>
                <button
                  onClick={() => setStatusFilter('online')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    statusFilter === 'online'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ออนไลน์ ({onlineCount})
                </button>
                <button
                  onClick={() => setStatusFilter('offline')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    statusFilter === 'offline'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  ออฟไลน์/ขัดข้อง ({offlineCount})
                </button>
                {unacknowledgedDrops.length > 0 && (
                  <button
                    onClick={() => setStatusFilter('drops')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      statusFilter === 'drops'
                        ? 'bg-rose-900 text-white shadow-xs'
                        : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    หลุดล่าสุด ({unacknowledgedDrops.length})
                  </button>
                )}

                {/* Cabinet Filter */}
                <select
                  value={selectedCabinet}
                  onChange={(e) => setSelectedCabinet(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium outline-none cursor-pointer"
                >
                  <option value="all">ทุกตู้ควบคุม / โซน</option>
                  {cabinetList.map((cab) => (
                    <option key={cab} value={cab}>{cab}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cameras Display */}
            {filteredCameras.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <WifiOff className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700">ไม่พบกล้องที่ตรงกับเงื่อนไขการค้นหา</h4>
                <p className="text-xs">กรุณาลองปรับเปลี่ยนตัวกรอง หรือค้นหาด้วยคำค้นอื่น</p>
              </div>
            ) : viewDensity === 'cards' ? (
              /* CARD VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCameras.map((cam) => {
                  const pulse = pulseStates.get(cam.id);
                  const isOnline = cam.status === 'online';
                  const isFaulty = cam.status === 'faulty';
                  const isMaintenance = cam.status === 'maintenance';
                  const isOffline = cam.status === 'offline';
                  const latency = pulse?.latencyMs || (isOnline ? 14 : 0);

                  return (
                    <div
                      key={cam.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between p-4.5 space-y-3 ${
                        isOnline
                          ? 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                          : 'bg-rose-50/40 border-rose-300/80 shadow-xs hover:border-rose-400'
                      }`}
                    >
                      {/* Top status & ID */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Visual Pulse Indicator Beacon */}
                            <div className="relative flex items-center justify-center w-4 h-4">
                              {isOnline ? (
                                <>
                                  <span className="absolute w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                  <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                </>
                              ) : isFaulty ? (
                                <>
                                  <span className="absolute w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                                  <span className="relative w-2.5 h-2.5 rounded-full bg-amber-500" />
                                </>
                              ) : (
                                <>
                                  <span className="absolute w-full h-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                                  <span className="relative w-2.5 h-2.5 rounded-full bg-rose-600" />
                                </>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {cam.id}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isOnline 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : isFaulty 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isMaintenance
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                          }`}>
                            {isOnline ? 'Online' : isFaulty ? 'Degraded' : isMaintenance ? 'Maintenance' : 'Drop / Offline'}
                          </span>
                        </div>

                        {/* Camera Name & Zone */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1" title={cam.name}>
                            {cam.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 line-clamp-1">
                            <span>{cam.zone || cam.cabinetNumber || 'เทศบาลชัยภูมิ'}</span>
                            {cam.community && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600">{cam.community}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Live Ping & Telemetry Row */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Ping Latency</span>
                            <span className={`font-mono font-bold ${
                              !isOnline ? 'text-rose-600' : latency < 35 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {isOnline ? `${latency} ms` : 'Timeout'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">Bitrate</span>
                            <span className="font-mono font-semibold text-slate-700">
                              {isOnline ? `${pulse?.bitrateKbps || 2048} kbps` : '0 kbps'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block">Loss Rate</span>
                            <span className={`font-mono font-bold ${isOnline ? 'text-slate-600' : 'text-rose-600'}`}>
                              {isOnline ? '0.0%' : '100%'}
                            </span>
                          </div>
                        </div>

                        {/* IP & Last Heartbeat */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                          <span>IP: {cam.ipAddress}</span>
                          <span className="text-slate-400">
                            {isOnline ? 'Active pulse' : 'No heartbeat'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleInspectCamera(cam)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>เจาะลึกสัญญาณ</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {onSelectCamera && (
                            <button
                              onClick={() => onSelectCamera(cam)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="ดูรายละเอียดข้อมูลกล้อง"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onReportRepairForCamera && (
                            <button
                              onClick={() => onReportRepairForCamera(cam)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                !isOnline ? 'text-rose-600 hover:bg-rose-100' : 'text-slate-400 hover:text-slate-700'
                              }`}
                              title="ส่งแจ้งซ่อมบำรุง"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT METRIC TABLE VIEW */
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">สถานะชีพจร</th>
                        <th className="py-3 px-4">รหัสกล้อง</th>
                        <th className="py-3 px-4">ชื่อจุดติดตั้ง</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">ตู้ควบคุม / โซน</th>
                        <th className="py-3 px-4 text-center">Ping (RTT)</th>
                        <th className="py-3 px-4 text-center">Bitrate / FPS</th>
                        <th className="py-3 px-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredCameras.map((cam) => {
                        const pulse = pulseStates.get(cam.id);
                        const isOnline = cam.status === 'online';
                        const latency = pulse?.latencyMs || (isOnline ? 14 : 0);

                        return (
                          <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'
                                }`} />
                                <span className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{cam.id}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{cam.name}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{cam.ipAddress}</td>
                            <td className="py-2.5 px-4 text-slate-600">{cam.zone || cam.cabinetNumber || '-'}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold">
                              <span className={isOnline ? 'text-emerald-600' : 'text-rose-600'}>
                                {isOnline ? `${latency} ms` : 'Timeout'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {isOnline ? `${pulse?.bitrateKbps || 2048}k / 25fps` : '0k / 0fps'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleInspectCamera(cam)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                >
                                  วิเคราะห์
                                </button>
                                {onReportRepairForCamera && (
                                  <button
                                    onClick={() => onReportRepairForCamera(cam)}
                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="แจ้งซ่อม"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DROP LOGS AUDIT TRAIL */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">บันทึกประวัติการขาดหายของสัญญาณ (Drop Incident History)</h3>
                <p className="text-xs text-slate-500">
                  ระบบบันทึกประวัติทันทีเมื่อมีการตัดขาดการเชื่อมต่อ หรือค่าสถานะในฐานข้อมูลถูกเปลี่ยนเป็นออฟไลน์
                </p>
              </div>

              {unacknowledgedDrops.length > 0 && (
                <button
                  onClick={handleAcknowledgeAll}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>รับทราบที่ค้างทั้งหมด ({unacknowledgedDrops.length})</span>
                </button>
              )}
            </div>

            {dropLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700">ไม่มีประวัติสัญญาณหลุดในระบบ</h4>
                <p className="text-xs">สัญญาณกล้องทุกตัวเชื่อมต่อสมบูรณ์ตลอดการทำงาน</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">เวลาที่หลุด</th>
                        <th className="py-3 px-4">รหัสกล้อง</th>
                        <th className="py-3 px-4">ชื่อจุดติดตั้ง</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">โซน / ตู้ควบคุม</th>
                        <th className="py-3 px-4">สาเหตุการหลุด / รายละเอียดทางเทคนิค</th>
                        <th className="py-3 px-4 text-center">สถานะรับทราบ</th>
                        <th className="py-3 px-4 text-right">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {dropLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`transition-colors ${
                            !log.acknowledged ? 'bg-rose-50/50 hover:bg-rose-100/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {new Date(log.droppedAt).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.cameraId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{log.cameraName}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{log.ipAddress}</td>
                          <td className="py-3 px-4 text-slate-600">{log.zone || log.cabinetNumber || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md inline-block max-w-xs truncate" title={log.reason}>
                              {log.reason}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.acknowledged ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                รับทราบแล้ว
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                                รอดำเนินการ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!log.acknowledged && (
                                <button
                                  onClick={() => handleAcknowledge(log.id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  รับทราบ
                                </button>
                              )}
                              {onReportRepairForCamera && (
                                <button
                                  onClick={() => {
                                    const c = cameras.find(cam => cam.id === log.cameraId);
                                    if (c) onReportRepairForCamera(c);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  แจ้งซ่อม
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CABINETS & FIBER NODES HEALTH */}
        {activeTab === 'cabinets' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">สุขภาพโครงข่ายตามจุดรวมตู้ควบคุม (Cabinet Nodes & Fiber Links)</h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์การรวมศูนย์ของสายสัญญาณใยแก้วนำแสงในแต่ละตู้ควบคุม เพื่อตรวจจับว่ามีการขาดหายทั้งตู้หรือเฉพาะจุด
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cabinetHealthMetrics.map((cab) => (
                <div
                  key={cab.name}
                  className={`rounded-2xl border p-4.5 space-y-3 transition-all ${
                    cab.uptime === 100
                      ? 'bg-white border-slate-200 hover:border-emerald-300'
                      : cab.uptime > 50
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-rose-50/40 border-rose-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{cab.name}</h4>
                      <p className="text-xs text-slate-500">{cab.total} ช่องสัญญาณกล้อง</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                      cab.uptime === 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : cab.uptime > 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {cab.uptime}% พร้อมใช้งาน
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        cab.uptime === 100 ? 'bg-emerald-500' : cab.uptime > 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${cab.uptime}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-emerald-700 font-semibold">● ออนไลน์ {cab.online} ตัว</span>
                    <span className={`font-semibold ${cab.offline > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      ● หลุด/ขัดข้อง {cab.offline} ตัว
                    </span>
                  </div>

                  {/* Camera chips in cabinet */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cab.cameras.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleInspectCamera(c)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                          c.status === 'online'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                        }`}
                        title={`${c.name} (${c.ipAddress})`}
                      >
                        {c.id}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CAMERA PULSE DEEP INSPECTION MODAL */}
      {inspectedCamera && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  inspectedCamera.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-400">{inspectedCamera.id}</span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                      inspectedCamera.status === 'online' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                    }`}>
                      {inspectedCamera.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1">{inspectedCamera.name}</h3>
                </div>
              </div>

              <button
                onClick={() => setInspectedCamera(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Telemetry Waveform Graph */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-sky-500" />
                    กราฟความหน่วงสัญญาณย้อนหลัง (Ping Waveform)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    RTT: {inspectedCamera.status === 'online' ? `${pulseStates.get(inspectedCamera.id)?.latencyMs || 14} ms` : 'No Response'}
                  </span>
                </div>
                <div className="h-40 w-full bg-slate-900 rounded-2xl p-2.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pingHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 60]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">IP Address / Port</span>
                  <span className="font-mono font-bold text-slate-800">{inspectedCamera.ipAddress}:554 (RTSP)</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">ตู้ควบคุม / โซน</span>
                  <span className="font-semibold text-slate-800">{inspectedCamera.zone || inspectedCamera.cabinetNumber || '-'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">ชนิดกล้อง & ความละเอียด</span>
                  <span className="font-semibold text-slate-800">{inspectedCamera.type.toUpperCase()} • {inspectedCamera.resolution}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">ตรวจเช็กล่าสุด</span>
                  <span className="font-semibold text-slate-800">{inspectedCamera.lastMaintenance || '-'}</span>
                </div>
              </div>

              {/* Notes */}
              {inspectedCamera.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                  <strong className="block font-bold">บันทึกอาการทางเทคนิค:</strong>
                  <p className="whitespace-pre-line text-slate-700">{inspectedCamera.notes}</p>
                </div>
              )}

              {/* Quick Status Override Controls */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">ปรับสถานะทันที:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      updateCctvStatus(inspectedCamera.id, 'online');
                      executePulseCheck();
                      setInspectedCamera(null);
                      showToast(`ปรับสถานะ ${inspectedCamera.id} เป็น Online เรียบร้อย`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Online
                  </button>
                  <button
                    onClick={() => {
                      updateCctvStatus(inspectedCamera.id, 'faulty', 'สัญญาณภาพขาดๆ หายๆ / ติดขัด');
                      executePulseCheck();
                      setInspectedCamera(null);
                      showToast(`ปรับสถานะ ${inspectedCamera.id} เป็น Faulty เรียบร้อย`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Faulty
                  </button>
                  <button
                    onClick={() => {
                      updateCctvStatus(inspectedCamera.id, 'offline', 'ตัดสัญญาณ / ขาดการเชื่อมต่อ');
                      executePulseCheck();
                      setInspectedCamera(null);
                      showToast(`ปรับสถานะ ${inspectedCamera.id} เป็น Offline เรียบร้อย`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Offline
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              {onReportRepairForCamera && (
                <button
                  onClick={() => {
                    const cam = inspectedCamera;
                    setInspectedCamera(null);
                    onReportRepairForCamera(cam);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>แจ้งซ่อมบำรุงกล้องตัวนี้</span>
                </button>
              )}
              <button
                onClick={() => setInspectedCamera(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold ml-auto transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
