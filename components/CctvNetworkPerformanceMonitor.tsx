import React, { useState, useMemo } from 'react';
import { CctvCamera } from '../types/cctv';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  Wifi,
  WifiOff,
  Activity,
  Radio,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Server,
  TrendingUp,
  Search,
  Filter,
  Info,
  Wrench,
  Signal,
  BarChart2,
  Cpu,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Sliders
} from 'lucide-react';

interface CctvNetworkPerformanceMonitorProps {
  cameras: CctvCamera[];
  onSelectCamera?: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
}

interface ClusterMetrics {
  clusterName: string;
  totalCameras: number;
  onlineCount: number;
  faultyCount: number;
  offlineCount: number;
  maintenanceCount: number;
  uptimePercent: number; // e.g. 96.5
  avgLatencyMs: number;  // e.g. 14.2
  packetLossPercent: number; // e.g. 0.8
  signalNoiseDbm: number; // e.g. -68
  riskLevel: 'high' | 'medium' | 'low';
  interferenceCause: string;
  recommendedFix: string;
  cameras: CctvCamera[];
}

export const CctvNetworkPerformanceMonitor: React.FC<CctvNetworkPerformanceMonitorProps> = ({
  cameras,
  onSelectCamera,
  onReportRepairForCamera
}) => {
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [clusterSearchTerm, setClusterSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'diagnostics'>('overview');
  const [isSimulatingPulse, setIsSimulatingPulse] = useState(false);
  const [pulseLog, setPulseLog] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'warn' | 'success' }>>([]);
  const [lastTestedTime, setLastTestedTime] = useState<string>(new Date().toLocaleTimeString('th-TH'));

  // Calculate cluster network metrics based on camera dataset
  const clusterData = useMemo(() => {
    // Group by building/cluster
    const buildingMap: Record<string, CctvCamera[]> = {};
    cameras.forEach((cam) => {
      const bld = cam.building || 'พื้นที่ทั่วไป';
      if (!buildingMap[bld]) {
        buildingMap[bld] = [];
      }
      buildingMap[bld].push(cam);
    });

    const result: ClusterMetrics[] = Object.entries(buildingMap).map(([bld, bldCams]) => {
      const total = bldCams.length;
      const online = bldCams.filter((c) => c.status === 'online').length;
      const faulty = bldCams.filter((c) => c.status === 'faulty').length;
      const offline = bldCams.filter((c) => c.status === 'offline').length;
      const maintenance = bldCams.filter((c) => c.status === 'maintenance').length;

      const uptimePercent = total > 0 ? Number(((online / total) * 100).toFixed(1)) : 0;

      // Deterministic latency & packet loss mock based on cluster status
      let avgLatencyMs = 12 + Math.round((total - online) * 8.5);
      let packetLossPercent = Number(((total - online) * 2.1).toFixed(1));
      let signalNoiseDbm = -55 - Math.round((total - online) * 7);

      // Determine risk level & interference cause
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      let interferenceCause = 'สัญญาณปกติ (2.4/5GHz Channel Clear)';
      let recommendedFix = 'ตรวจสอบการทำงานตามรอบบำรุงรักษาปกติ';

      if (uptimePercent < 85 || offline + faulty >= 2) {
        riskLevel = 'high';
        if (bld.includes('ภายนอก') || bld.includes('เสา') || bld.includes('สนาม') || bld.includes('จอดรถ')) {
          interferenceCause = 'คลื่นรบกวนสภาพอากาศ / สัญญาณ Wi-Fi Bridge ตกขอบสายตา';
          recommendedFix = 'ติดตั้ง Fiber Optic Media Converter และสาย Shielded Outdoor Cat6';
        } else if (bld.includes('2') || bld.includes('3')) {
          interferenceCause = 'สัญญาณรบกวน RF แน่นหนา (2.4GHz Channel 6 Overlap)';
          recommendedFix = 'เปลี่ยนช่องสัญญาณไร้สายเป็น 5.8GHz Channel 149 หรือเดินสาย LAN เพิ่ม';
        } else {
          interferenceCause = 'แรงดันไฟฟ้า PoE Drop / สวิตช์ฮับชำรุดแพ็กเกจหลุดบ่อย';
          recommendedFix = 'เปลี่ยน PoE Switch ใหม่ และตรวจสอบหม้อแปลงจ่ายไฟกล้อง';
        }
      } else if (uptimePercent < 95 || offline + faulty >= 1) {
        riskLevel = 'medium';
        interferenceCause = 'มีการสูญเสียแพ็กเก็ตชั่วคราว (Jitter 18-35ms)';
        recommendedFix = 'ทำความสะอาดหัวคอนเนกเตอร์ RJ45 และรีสตาร์ท Port Switch';
      }

      return {
        clusterName: bld,
        totalCameras: total,
        onlineCount: online,
        faultyCount: faulty,
        offlineCount: offline,
        maintenanceCount: maintenance,
        uptimePercent,
        avgLatencyMs,
        packetLossPercent,
        signalNoiseDbm,
        riskLevel,
        interferenceCause,
        recommendedFix,
        cameras: bldCams
      };
    });

    return result.sort((a, b) => a.uptimePercent - b.uptimePercent); // Show highest risk (lowest uptime) first
  }, [cameras]);

  // General dashboard summary metrics
  const totalCamerasCount = cameras.length;
  const totalOnlineCount = cameras.filter((c) => c.status === 'online').length;
  const overallUptimePercent = totalCamerasCount > 0 ? Number(((totalOnlineCount / totalCamerasCount) * 100).toFixed(1)) : 0;
  const highRiskClustersCount = clusterData.filter((c) => c.riskLevel === 'high').length;
  const mediumRiskClustersCount = clusterData.filter((c) => c.riskLevel === 'medium').length;
  const avgOverallLatency = clusterData.length > 0 ? Math.round(clusterData.reduce((acc, c) => acc + c.avgLatencyMs, 0) / clusterData.length) : 0;
  const avgOverallPacketLoss = clusterData.length > 0 ? Number((clusterData.reduce((acc, c) => acc + c.packetLossPercent, 0) / clusterData.length).toFixed(1)) : 0;

  // Filtered clusters based on risk filter & search term
  const filteredClusters = useMemo(() => {
    return clusterData.filter((cluster) => {
      const matchRisk = selectedRiskFilter === 'all' || cluster.riskLevel === selectedRiskFilter;
      const q = (clusterSearchTerm || '').toLowerCase().trim();
      const matchSearch = !q || (cluster.clusterName || '').toLowerCase().includes(q) || (cluster.interferenceCause || '').toLowerCase().includes(q);
      return matchRisk && matchSearch;
    });
  }, [clusterData, selectedRiskFilter, clusterSearchTerm]);

  // Mock 24-hour trend data for area chart
  const hourlyTrendData = useMemo(() => {
    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    return hours.map((hour, idx) => {
      // Simulate peak interference during daytime hours (10:00 - 16:00)
      const isPeakHour = idx >= 5 && idx <= 8;
      const baseUptime = overallUptimePercent;
      const dip = isPeakHour ? (Math.random() * 3.5 + 1.2) : (Math.random() * 1.2);
      const uptime = Number((Math.max(82, baseUptime - dip)).toFixed(1));
      const latency = isPeakHour ? Math.round(avgOverallLatency + Math.random() * 15 + 8) : Math.round(avgOverallLatency + Math.random() * 4);
      const packetLoss = isPeakHour ? Number((avgOverallPacketLoss + Math.random() * 1.8 + 0.5).toFixed(1)) : Number((avgOverallPacketLoss * 0.7).toFixed(1));

      return {
        time: hour,
        uptime,
        latency,
        packetLoss,
        slaTarget: 95.0
      };
    });
  }, [overallUptimePercent, avgOverallLatency, avgOverallPacketLoss]);

  // Run simulated Ping & Network Pulse test
  const handleRunPulseTest = () => {
    setIsSimulatingPulse(true);
    setPulseLog([
      { timestamp: new Date().toLocaleTimeString('th-TH'), message: 'เริ่มส่งสัญญาณทดสอบ Ping & Packet Loss Pulse ทุกคลัสเตอร์...', type: 'info' }
    ]);

    setTimeout(() => {
      setPulseLog((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString('th-TH'), message: `ตรวจสอบ ${cameras.length} โหนดกล้องวงจรปิด ผ่านโปรโตคอล ICMP/RTSP...`, type: 'info' }
      ]);
    }, 600);

    setTimeout(() => {
      setPulseLog((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString('th-TH'), message: `พบโซนเสี่ยงสูง ${highRiskClustersCount} พื้นที่ (มีอัตราสัญญาณรบกวนเกินเกณฑ์มาตรฐาน 95%)`, type: highRiskClustersCount > 0 ? 'warn' : 'success' }
      ]);
    }, 1200);

    setTimeout(() => {
      setPulseLog((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString('th-TH'), message: 'การทดสอบเสร็จสิ้น! อัปเดตเมทริกซ์และค่าหน่วงเวลา (Latency) ล่าสุดเรียบร้อย', type: 'success' }
      ]);
      setIsSimulatingPulse(false);
      setLastTestedTime(new Date().toLocaleTimeString('th-TH'));
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Wifi className="w-64 h-64 text-blue-400" />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  ระบบเฝ้าระวังประสิทธิภาพเครือข่าย & สัญญาณรบกวน (Network Performance Monitor)
                </h2>
                <p className="text-xs text-slate-300">
                  วิเคราะห์อัตราการทำงาน (Uptime %) ตรวจหาคลื่นสัญญาณรบกวน (Signal Interference) และชี้เป้าโซนเสี่ยงสูงเรียลไทม์
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunPulseTest}
              disabled={isSimulatingPulse}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 border border-blue-400/30"
            >
              <RefreshCw className={`w-4 h-4 ${isSimulatingPulse ? 'animate-spin' : ''}`} />
              <span>{isSimulatingPulse ? 'กำลังยิงสัญญาณ Pulse Test...' : 'ยิงสัญญาณทดสอบ (Pulse Test)'}</span>
            </button>
          </div>
        </div>

        {/* Pulse Log Output if actively running or recently tested */}
        {pulseLog.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 font-bold flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                บันทึกการวินิจฉัยสัญญาณล่าสุด ({lastTestedTime})
              </span>
              <button
                onClick={() => setPulseLog([])}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ปิด Log
              </button>
            </div>
            {pulseLog.map((log, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${
                  log.type === 'warn'
                    ? 'text-amber-300 font-semibold'
                    : log.type === 'success'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Cluster Uptime */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>อัตรา Uptime เครือข่ายรวม</span>
            <Wifi className={`w-4 h-4 ${overallUptimePercent >= 95 ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${overallUptimePercent >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {overallUptimePercent}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium">(เป้าหมาย SLA ≥ 95.0%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                overallUptimePercent >= 95 ? 'bg-emerald-500' : overallUptimePercent >= 85 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, overallUptimePercent)}%` }}
            />
          </div>
        </div>

        {/* Card 2: High Risk Interference Zones */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>โซนเสี่ยงสัญญาณรบกวนสูง</span>
            <ShieldAlert className={`w-4 h-4 ${highRiskClustersCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${highRiskClustersCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {highRiskClustersCount} โซน
            </span>
            <span className="text-[10px] text-slate-500 font-medium">จากทั้งหมด {clusterData.length} คลัสเตอร์</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {highRiskClustersCount > 0
              ? 'พบปัญหาการหลุดของแพ็กเกจหรือคลื่นรบกวนสะสม'
              : 'สัญญาณมีเสถียรภาพอยู่ในเกณฑ์ความปลอดภัย'}
          </p>
        </div>

        {/* Card 3: Avg Network Latency */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>ค่าความหน่วงเวลาตอบสนอง (Ping)</span>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{avgOverallLatency} ms</span>
            <span className="text-[10px] text-slate-500 font-medium">ค่าเฉลี่ยทุกโหนดกล้อง</span>
          </div>
          <p className="text-[11px] text-slate-500">
            อัตราแพ็กเกจหลุดเฉลี่ย: <strong className="text-slate-800">{avgOverallPacketLoss}%</strong>
          </p>
        </div>

        {/* Card 4: Active Cameras in Network */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
            <span>กล้องในระบบการเฝ้าระวัง</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalOnlineCount} / {totalCamerasCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold">({overallUptimePercent}%)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            ออฟไลน์/ขัดข้อง: <span className="text-rose-600 font-bold">{totalCamerasCount - totalOnlineCount} จุด</span>
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>เปรียบเทียบ Uptime แยกตามคลัสเตอร์</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'trends'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>แนวโน้มสัญญาณรบกวน 24 ชม.</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>เจาะลึกโซนเสี่ยงสูง & แนวทางแก้ไข ({highRiskClustersCount})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CLUSTER UPTIME COMPARISON CHART */}
      {activeTab === 'overview' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Signal className="w-4 h-4 text-blue-600" />
                อัตราการทำงาน (Uptime %) & ระดับสัญญาณรบกวน แยกตามกลุ่มกล้อง/อาคาร
              </h3>
              <p className="text-xs text-slate-500">
                แท่งสีเขียว/เหลือง/แดงแสดงอัตรา Uptime % เส้นสีชมพูแสดงอัตราสัญญาณรบกวน/แพ็กเก็ตหลุด (Noise Index)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
                ปลอดภัย (&ge; 95%)
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-3 h-3 bg-amber-500 rounded-xs"></span>
                เฝ้าระวัง (85-94%)
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-medium">
                <span className="w-3 h-3 bg-rose-500 rounded-xs"></span>
                เสี่ยงสูง (&lt; 85%)
              </span>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={clusterData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="clusterName"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 20]}
                  tick={{ fontSize: 11, fill: '#f43f5e' }}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ClusterMetrics;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1.5 max-w-xs">
                          <div className="font-bold text-blue-300 text-sm border-b border-slate-800 pb-1">
                            {label}
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">อัตรา Uptime:</span>
                            <span className="font-bold text-emerald-400">{data.uptimePercent}%</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">กล้องปกติ/ทั้งหมด:</span>
                            <span className="font-bold">{data.onlineCount} / {data.totalCameras} ตัว</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">ค่า Ping Latency:</span>
                            <span className="font-bold text-amber-300">{data.avgLatencyMs} ms</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">Packet Loss:</span>
                            <span className="font-bold text-rose-400">{data.packetLossPercent}%</span>
                          </div>
                          <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 italic">
                            {data.interferenceCause}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={95}
                  label={{ value: 'เป้าหมาย SLA (95%)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                />
                <Bar yAxisId="left" dataKey="uptimePercent" name="อัตรา Uptime (%)" radius={[6, 6, 0, 0]}>
                  {clusterData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.uptimePercent >= 95
                          ? '#10b981'
                          : entry.uptimePercent >= 85
                          ? '#f59e0b'
                          : '#f43f5e'
                      }
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="packetLossPercent"
                  name="อัตราแพ็กเก็ตหลุด/รบกวน (%)"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f43f5e' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: 24-HOUR INTERFERENCE & UPTIME TREND CHART */}
      {activeTab === 'trends' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                แนวโน้มเสถียรภาพสัญญาณและอัตรา Uptime ย้อนหลัง 24 ชั่วโมง
              </h3>
              <p className="text-xs text-slate-500">
                วิเคราะห์การกระจายตัวของคลื่นสัญญาณรบกวนในช่วงเวลาทำการ peak-time
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              จุดพีคสัญญาณรบกวนสูงสุด: <strong className="text-amber-600">12:00 - 14:00 น.</strong>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorPacketLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine y={95} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'SLA Standard (95%)', fill: '#10b981', fontSize: 10 }} />
                <Area type="monotone" dataKey="uptime" name="Uptime % รวมระบบ" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUptime)" strokeWidth={2} />
                <Area type="monotone" dataKey="packetLoss" name="Packet Loss % รบกวน" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPacketLoss)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: HIGH-RISK INTERFERENCE ZONES & DIAGNOSTIC CARDS */}
      {(activeTab === 'diagnostics' || activeTab === 'overview') && (
        <div className="space-y-4">
          {/* Controls bar inside Diagnostics */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-700">กรองตามระดับความเสี่ยง:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedRiskFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRiskFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด ({clusterData.length})
                </button>
                <button
                  onClick={() => setSelectedRiskFilter('high')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRiskFilter === 'high' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  เสี่ยงสูง ({highRiskClustersCount})
                </button>
                <button
                  onClick={() => setSelectedRiskFilter('medium')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRiskFilter === 'medium' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  เฝ้าระวัง ({mediumRiskClustersCount})
                </button>
                <button
                  onClick={() => setSelectedRiskFilter('low')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedRiskFilter === 'low' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  ปกติ ({clusterData.length - highRiskClustersCount - mediumRiskClustersCount})
                </button>
              </div>
            </div>

            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="ค้นหาชื่อคลัสเตอร์ หรือ สาเหตุรบกวน..."
                value={clusterSearchTerm}
                onChange={(e) => setClusterSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Cluster List / Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClusters.map((cluster) => {
              const isHigh = cluster.riskLevel === 'high';
              const isMedium = cluster.riskLevel === 'medium';

              return (
                <div
                  key={cluster.clusterName}
                  className={`bg-white rounded-2xl border p-5 space-y-4 transition-all shadow-xs hover:shadow-md ${
                    isHigh
                      ? 'border-rose-300 bg-rose-50/10'
                      : isMedium
                      ? 'border-amber-300 bg-amber-50/10'
                      : 'border-slate-200/80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{cluster.clusterName}</h4>
                        {isHigh ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            โซนเสี่ยงสูง (High Risk)
                          </span>
                        ) : isMedium ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                            <Info className="w-3 h-3" />
                            โซนเฝ้าระวัง (Moderate)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            สัญญาณปกติ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 pt-0.5">
                        กล้องพร้อมใช้งาน {cluster.onlineCount} จาก {cluster.totalCameras} ตัว | ชำรุด {cluster.faultyCount} | ออฟไลน์ {cluster.offlineCount}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xl font-black ${isHigh ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {cluster.uptimePercent}%
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Uptime Cluster</span>
                    </div>
                  </div>

                  {/* Interference Diagnostic Info */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <Radio className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">สาเหตุการรบกวนหลัก: </strong>
                        <span className="text-slate-600">{cluster.interferenceCause}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-700 pt-1 border-t border-slate-200/60">
                      <Wrench className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">แนวทางแก้ไขที่แนะนำ: </strong>
                        <span className="text-blue-700 font-medium">{cluster.recommendedFix}</span>
                      </div>
                    </div>
                  </div>

                  {/* List of Affected / Problematic Cameras in this Cluster */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>รายการกล้องวงจรปิดในโซนนี้ ({cluster.cameras.length} จุด):</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {cluster.cameras.map((cam) => {
                        const isCamOffline = cam.status === 'offline' || cam.status === 'faulty';
                        return (
                          <div
                            key={cam.id}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                              isCamOffline ? 'bg-rose-50/50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-white border border-slate-300 rounded shrink-0">
                                {cam.id}
                              </span>
                              <span className="truncate font-semibold text-slate-900">{cam.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">({cam.ipAddress})</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  cam.status === 'online'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : cam.status === 'faulty'
                                    ? 'bg-rose-100 text-rose-800'
                                    : cam.status === 'maintenance'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {cam.status}
                              </span>

                              {isCamOffline && onReportRepairForCamera && (
                                <button
                                  onClick={() => onReportRepairForCamera(cam)}
                                  className="text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                  title="ส่งแจ้งซ่อม/ตรวจสอบกล้องตัวนี้"
                                >
                                  แจ้งซ่อม
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
