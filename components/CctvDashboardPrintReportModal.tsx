import React, { useState, useMemo } from 'react';
import { CctvCamera } from '../types/cctv';
import { getStoredRequests } from '../utils/storage';
import { RequestItem, RequestStatus } from '../types/request';
import { 
  Printer, 
  X, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  WifiOff, 
  Building, 
  Calendar, 
  Clock, 
  User, 
  FileText,
  Filter,
  ShieldCheck,
  Check
} from 'lucide-react';

interface CctvDashboardPrintReportModalProps {
  cameras: CctvCamera[];
  onClose: () => void;
  isOfficerMode?: boolean;
}

export const CctvDashboardPrintReportModal: React.FC<CctvDashboardPrintReportModalProps> = ({
  cameras,
  onClose,
  isOfficerMode = false
}) => {
  const [cameraFilter, setCameraFilter] = useState<'all' | 'faulty_only' | 'online_only'>('all');
  const [includeRepairRequests, setIncludeRepairRequests] = useState<boolean>(true);

  // Fetch CCTV repair requests from stored requests
  const cctvRequests = useMemo(() => {
    const all = getStoredRequests();
    return all.filter(r => {
      const isCctvCategory = r.category === 'cctv';
      const titleMatches = (r.title || '').toLowerCase().includes('cctv') || (r.title || '').toLowerCase().includes('กล้อง');
      return isCctvCategory || titleMatches;
    });
  }, []);

  const activeRepairRequests = useMemo(() => {
    return cctvRequests.filter(r => r.status !== 'completed' && r.status !== 'rejected');
  }, [cctvRequests]);

  // Overall Statistics
  const total = cameras.length;
  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const faultyCount = cameras.filter(c => c.status === 'faulty').length;
  const maintenanceCount = cameras.filter(c => c.status === 'maintenance').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const operationalRate = total > 0 ? Math.round((onlineCount / total) * 100) : 0;

  // Breakdown by Building
  const buildingSummary = useMemo(() => {
    const bldMap: Record<string, { total: number; online: number; faulty: number; maintenance: number; offline: number }> = {};
    cameras.forEach(c => {
      const bName = c.building || 'อาคารอื่นๆ';
      if (!bldMap[bName]) {
        bldMap[bName] = { total: 0, online: 0, faulty: 0, maintenance: 0, offline: 0 };
      }
      bldMap[bName].total += 1;
      if (c.status === 'online') bldMap[bName].online += 1;
      if (c.status === 'faulty') bldMap[bName].faulty += 1;
      if (c.status === 'maintenance') bldMap[bName].maintenance += 1;
      if (c.status === 'offline') bldMap[bName].offline += 1;
    });

    return Object.entries(bldMap).map(([building, stats]) => ({
      building,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  }, [cameras]);

  // Filtered cameras for print table
  const displayedCameras = useMemo(() => {
    if (cameraFilter === 'faulty_only') {
      return cameras.filter(c => c.status === 'faulty' || c.status === 'maintenance' || c.status === 'offline');
    }
    if (cameraFilter === 'online_only') {
      return cameras.filter(c => c.status === 'online');
    }
    return cameras;
  }, [cameras, cameraFilter]);

  const handleTriggerPrint = () => {
    window.print();
  };

  const getStatusThText = (status: CctvCamera['status']) => {
    switch (status) {
      case 'online': return 'ปกติ (Online)';
      case 'faulty': return 'ชำรุด (Faulty)';
      case 'maintenance': return 'อยู่ระหว่างซ่อม';
      case 'offline': return 'ขาดการเชื่อมต่อ';
      default: return status;
    }
  };

  const getRequestStatusThText = (status: RequestStatus) => {
    switch (status) {
      case 'submitted': return 'ยื่นคำร้องแล้ว';
      case 'under_review': return 'อยู่ระหว่างตรวจสอบ';
      case 'action_required': return 'ขอข้อมูลเพิ่มเติม';
      case 'approved': return 'อนุมัติ / รอดำเนินการซ่อม';
      case 'completed': return 'ซ่อมแซมเสร็จสิ้น';
      case 'rejected': return 'ไม่อนุมัติ / ยกเลิก';
      default: return status;
    }
  };

  const reportDateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const reportTimeStr = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static overflow-y-auto">
      {/* CSS Print Styles specific for printer layout */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: 'Sarabun', sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          .keep-together {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white max-w-5xl w-full rounded-2xl shadow-2xl my-auto print:shadow-none print:my-0 print:rounded-none print:max-w-none border border-slate-200 print:border-none">
        
        {/* Top Control Bar - Hidden when printing */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900 text-white rounded-t-2xl border-b border-slate-800 no-print gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-500/40">
              <Printer className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                พิมพ์รายงานสรุปสถานะ CCTV และรายการแจ้งซ่อม (Print Report)
              </h3>
              <p className="text-xs text-slate-300">
                ตัวอย่างเอกสารก่อนพิมพ์ / พิมพ์ออกเป็นไฟล์ PDF หรือพิมพ์ผ่านเครื่องพิมพ์ (Printer)
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setCameraFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  cameraFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                กล้องทั้งหมด ({cameras.length})
              </button>
              <button
                type="button"
                onClick={() => setCameraFilter('faulty_only')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  cameraFilter === 'faulty_only' ? 'bg-rose-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                เฉพาะชำรุด/ซ่อม/ออฟไลน์ ({faultyCount + maintenanceCount + offlineCount})
              </button>
            </div>

            {/* Checkbox include repair requests */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-200 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRepairRequests}
                onChange={e => setIncludeRepairRequests(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span>รวมรายการแจ้งซ่อม ({cctvRequests.length})</span>
            </label>

            {/* Action Buttons */}
            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer border border-blue-400/40 active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" />
              สั่งพิมพ์รายงาน (Print / Save PDF)
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="p-6 md:p-10 document-font print:p-0 print-area text-slate-900 leading-relaxed">
          <div className="max-w-[850px] mx-auto space-y-6">

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xl print:border print:border-slate-900 shrink-0">
                    <ShieldCheck className="w-9 h-9 text-blue-300" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">เทศบาลเมืองชัยภูมิ</h1>
                    <p className="text-xs font-bold text-slate-700">ศูนย์ควบคุมและเฝ้าระวังระบบกล้องวงจรปิด (CCTV Command Center)</p>
                    <p className="text-[11px] text-slate-500">ฝ่ายเทคโนโลยีสารสนเทศและการสื่อสาร สำนักเทศมนตรี</p>
                  </div>
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <div className="inline-block border border-slate-400 px-3 py-1 rounded-md text-xs font-bold bg-slate-50 font-mono">
                    รหัสรายงาน: RPT-CCTV-{new Date().getFullYear() + 543}-{String(new Date().getMonth() + 1).padStart(2, '0')}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">วันที่ออกรายงาน: {reportDateStr}</p>
                  <p className="text-[10px] text-slate-500">เวลาออกรายงาน: {reportTimeStr} น.</p>
                </div>
              </div>

              <div className="text-center bg-slate-100/90 py-2.5 px-4 rounded-xl border border-slate-300 print:bg-slate-50">
                <h2 className="text-base font-extrabold text-slate-900">
                  รายงานสรุปสถานะความพร้อมใช้งานระบบกล้องวงจรปิด และรายการแจ้งซ่อมคงค้าง
                </h2>
                <p className="text-xs text-slate-600">
                  (CCTV Infrastructure Status & Active Repair Requests Summary Report)
                </p>
              </div>
            </div>

            {/* SECTION 1: Summary Statistics Overview */}
            <div className="space-y-3 keep-together">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-l-4 border-blue-600 pl-2">
                ส่วนที่ 1: สรุปภาพรวมสถานะระบบกล้องวงจรปิด (System Overview)
              </h3>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 block">จุดติดตั้งทั้งหมด</span>
                  <span className="text-lg font-extrabold text-slate-900 block">{total}</span>
                  <span className="text-[10px] text-slate-500 block">จุด</span>
                </div>

                <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 block">ปกติ (Online)</span>
                  <span className="text-lg font-extrabold text-emerald-700 block">{onlineCount}</span>
                  <span className="text-[10px] text-emerald-700 font-bold block">{operationalRate}%</span>
                </div>

                <div className="p-3 bg-rose-50/80 border border-rose-300 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-rose-800 block">ชำรุด (Faulty)</span>
                  <span className="text-lg font-extrabold text-rose-700 block">{faultyCount}</span>
                  <span className="text-[10px] text-rose-600 block">จุด</span>
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 block">อยู่ระหว่างซ่อม</span>
                  <span className="text-lg font-extrabold text-amber-800 block">{maintenanceCount}</span>
                  <span className="text-[10px] text-amber-800 block">จุด</span>
                </div>

                <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 block">ออฟไลน์</span>
                  <span className="text-lg font-extrabold text-slate-800 block">{offlineCount}</span>
                  <span className="text-[10px] text-slate-500 block">จุด</span>
                </div>
              </div>

              {/* Readiness bar */}
              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-800 text-[11px]">
                  <span>อัตราความพร้อมใช้งานของระบบกล้องวงจรปิด (Operational Rate)</span>
                  <span className={operationalRate >= 80 ? 'text-emerald-700' : 'text-rose-700'}>{operationalRate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex border border-slate-300">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(onlineCount / Math.max(total, 1)) * 100}%` }} title="Online" />
                  <div className="bg-amber-500 h-full" style={{ width: `${(maintenanceCount / Math.max(total, 1)) * 100}%` }} title="Maintenance" />
                  <div className="bg-rose-500 h-full" style={{ width: `${(faultyCount / Math.max(total, 1)) * 100}%` }} title="Faulty" />
                  <div className="bg-slate-400 h-full" style={{ width: `${(offlineCount / Math.max(total, 1)) * 100}%` }} title="Offline" />
                </div>
              </div>
            </div>

            {/* SECTION 2: Building Breakdown Table */}
            <div className="space-y-2.5 keep-together">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-l-4 border-blue-600 pl-2">
                ส่วนที่ 2: สรุปสถานะแยกตามอาคาร/สถานที่ (Building Breakdown)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 w-10 text-center">ลำดับ</th>
                      <th className="p-2 border border-slate-300">อาคาร / สถานที่</th>
                      <th className="p-2 border border-slate-300 text-center w-16">จำนวนรวม</th>
                      <th className="p-2 border border-slate-300 text-center w-16 text-emerald-800 bg-emerald-50/50">ปกติ</th>
                      <th className="p-2 border border-slate-300 text-center w-16 text-rose-800 bg-rose-50/50">ชำรุด</th>
                      <th className="p-2 border border-slate-300 text-center w-20 text-amber-800 bg-amber-50/50">กำลังซ่อม</th>
                      <th className="p-2 border border-slate-300 text-center w-16 text-slate-700 bg-slate-100/50">ออฟไลน์</th>
                      <th className="p-2 border border-slate-300 text-center w-20">อัตราพร้อม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingSummary.map((b, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold text-slate-900">{b.building}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold">{b.total}</td>
                        <td className="p-2 border border-slate-300 text-center text-emerald-700 font-bold bg-emerald-50/30">{b.online}</td>
                        <td className="p-2 border border-slate-300 text-center text-rose-700 font-bold bg-rose-50/30">{b.faulty}</td>
                        <td className="p-2 border border-slate-300 text-center text-amber-800 font-bold bg-amber-50/30">{b.maintenance}</td>
                        <td className="p-2 border border-slate-300 text-center text-slate-600 font-medium bg-slate-100/30">{b.offline}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-slate-800">{b.rate}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-200 font-extrabold text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="p-2 border border-slate-300 text-right">รวมทั้งสิ้น (Grand Total):</td>
                      <td className="p-2 border border-slate-300 text-center">{total}</td>
                      <td className="p-2 border border-slate-300 text-center text-emerald-800">{onlineCount}</td>
                      <td className="p-2 border border-slate-300 text-center text-rose-800">{faultyCount}</td>
                      <td className="p-2 border border-slate-300 text-center text-amber-900">{maintenanceCount}</td>
                      <td className="p-2 border border-slate-300 text-center text-slate-800">{offlineCount}</td>
                      <td className="p-2 border border-slate-300 text-center">{operationalRate}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: Active CCTV Repair Requests */}
            {includeRepairRequests && (
              <div className="space-y-2.5 keep-together">
                <div className="flex items-center justify-between border-l-4 border-blue-600 pl-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    ส่วนที่ 3: รายการคำร้องแจ้งซ่อมระบบ CCTV ที่อยู่ระหว่างดำเนินการ ({activeRepairRequests.length} รายการ)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    (ข้อมูลจากระบบคำร้องออนไลน์)
                  </span>
                </div>

                {activeRepairRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">
                          <th className="p-2 border border-slate-300 w-24">เลขคำร้อง</th>
                          <th className="p-2 border border-slate-300 w-24">วันที่แจ้ง</th>
                          <th className="p-2 border border-slate-300">ผู้แจ้งซ่อม / หน่วยงาน</th>
                          <th className="p-2 border border-slate-300">หัวข้อ / รายละเอียดความชำรุด</th>
                          <th className="p-2 border border-slate-300 w-28 text-center">สถานะการซ่อม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRepairRequests.map((req, idx) => (
                          <tr key={req.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">{req.id}</td>
                            <td className="p-2 border border-slate-300 font-mono text-[11px]">
                              {new Date(req.createdAt).toLocaleDateString('th-TH')}
                            </td>
                            <td className="p-2 border border-slate-300">
                              <span className="font-bold text-slate-900 block">{req.applicant.prefix}{req.applicant.fullName}</span>
                              <span className="text-[10px] text-slate-600 block">{req.applicant.department} ({req.applicant.phone})</span>
                            </td>
                            <td className="p-2 border border-slate-300">
                              <span className="font-bold text-slate-800 block">{req.title}</span>
                              <p className="text-[11px] text-slate-600 line-clamp-2">{req.description}</p>
                            </td>
                            <td className="p-2 border border-slate-300 text-center font-bold">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] border bg-amber-50 text-amber-900 border-amber-300">
                                {getRequestStatusThText(req.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium">
                    ✅ ไม่พบรายการคำร้องแจ้งซ่อม CCTV คงค้างในระบบ - กล้องวงจรปิดพร้อมใช้งานสมบูรณ์
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: Camera Inventory Detail Table */}
            <div className="space-y-2.5 keep-together">
              <div className="flex items-center justify-between border-l-4 border-blue-600 pl-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  ส่วนที่ 4: รายละเอียดจุดติดตั้งกล้องวงจรปิด ({displayedCameras.length} จุด)
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  {cameraFilter === 'faulty_only' ? 'แสดงเฉพาะกล้องที่มีปัญหา/อยู่ระหว่างซ่อม' : 'แสดงกล้องทั้งหมด'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-300">
                      <th className="p-2 border border-slate-300 w-10 text-center">ลำดับ</th>
                      <th className="p-2 border border-slate-300 w-24">รหัสกล้อง</th>
                      <th className="p-2 border border-slate-300">ชื่อจุดติดตั้ง</th>
                      <th className="p-2 border border-slate-300">สถานที่ / อาคาร / โซน</th>
                      <th className="p-2 border border-slate-300 w-24 text-center font-mono">IP Address</th>
                      <th className="p-2 border border-slate-300 w-24 text-center">สถานะ</th>
                      <th className="p-2 border border-slate-300">หมายเหตุ / ประวัติซ่อมล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCameras.map((cam, idx) => (
                      <tr key={cam.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900">{cam.id}</td>
                        <td className="p-2 border border-slate-300 font-bold text-slate-900">{cam.name}</td>
                        <td className="p-2 border border-slate-300 text-[11px] text-slate-700">
                          {cam.building} - {cam.floor} ({cam.zone})
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-mono text-[11px] text-slate-800">{cam.ipAddress}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-[10px]">
                          <span className={`inline-block px-2 py-0.5 rounded border ${
                            cam.status === 'online' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            cam.status === 'faulty' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                            cam.status === 'maintenance' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                            'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {getStatusThText(cam.status)}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-300 text-[11px] text-slate-600">
                          {cam.notes || `ตรวจสอบรอบล่าสุดเมื่อ ${cam.lastMaintenance}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: Official Signatures */}
            <div className="pt-6 border-t-2 border-slate-300 keep-together space-y-6">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                {/* Box 1 */}
                <div className="space-y-12 p-4 border border-slate-300 rounded-xl bg-slate-50/50">
                  <p className="font-bold text-slate-900">ผู้สำรวจและจัดทำรายงาน</p>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-mono text-[11px]">......................................................................</p>
                    <p className="font-bold text-slate-800">(......................................................................)</p>
                    <p className="text-[11px] text-slate-600">ตำแหน่ง: เจ้าหน้าที่วิเคราะห์ระบบงานคอมพิวเตอร์</p>
                    <p className="text-[10px] text-slate-500">วันที่ .......... / ........................ / .................</p>
                  </div>
                </div>

                {/* Box 2 */}
                <div className="space-y-12 p-4 border border-slate-300 rounded-xl bg-slate-50/50">
                  <p className="font-bold text-slate-900">ผู้ตรวจสอบและรับรองรายงาน</p>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-mono text-[11px]">......................................................................</p>
                    <p className="font-bold text-slate-800">(......................................................................)</p>
                    <p className="text-[11px] text-slate-600">ตำแหน่ง: หัวหน้าศูนย์เฝ้าระวังกล้องวงจรปิด CCTV</p>
                    <p className="text-[10px] text-slate-500">วันที่ .......... / ........................ / .................</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
                เอกสารนี้สร้างขึ้นโดยอัตโนมัติจากระบบบริหารจัดการและติดตามสถานะกล้องวงจรปิด (CCTV Dashboard System) • เทศบาลเมืองชัยภูมิ
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
