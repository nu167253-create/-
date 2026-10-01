import React from 'react';
import { CctvCamera, CctvStatus } from '../types/cctv';
import { 
  Printer, 
  Download, 
  X, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  WifiOff, 
  Building, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Layers,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface CctvMonthlyPdfModalProps {
  cameras: CctvCamera[];
  onClose: () => void;
}

export const CctvMonthlyPdfModal: React.FC<CctvMonthlyPdfModalProps> = ({
  cameras,
  onClose
}) => {
  const now = new Date();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const currentMonthTh = thaiMonths[now.getMonth()];
  const currentYearTh = now.getFullYear() + 543;
  const printDateStr = `${now.getDate()} ${currentMonthTh} ${currentYearTh}`;
  const docRef = `รายงานการประชุม CCTV/${currentYearTh}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Stats calculation
  const total = cameras.length;
  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const faultyCount = cameras.filter(c => c.status === 'faulty').length;
  const maintenanceCount = cameras.filter(c => c.status === 'maintenance').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const operationalRate = total > 0 ? ((onlineCount / total) * 100).toFixed(1) : '0';

  // Group by building
  const buildingsMap = cameras.reduce((acc, cam) => {
    if (!acc[cam.building]) {
      acc[cam.building] = [];
    }
    acc[cam.building].push(cam);
    return acc;
  }, {} as Record<string, CctvCamera[]>);

  const buildingStats = Object.keys(buildingsMap).map(building => {
    const cams = buildingsMap[building];
    return {
      building,
      total: cams.length,
      online: cams.filter(c => c.status === 'online').length,
      faulty: cams.filter(c => c.status === 'faulty').length,
      maintenance: cams.filter(c => c.status === 'maintenance').length,
      offline: cams.filter(c => c.status === 'offline').length,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text(`CCTV Status & Map Summary Report`, 15, 20);
    doc.setFontSize(11);
    doc.text(`Chaiyaphum Municipality - Monthly Oversight Meeting (${currentMonthTh} ${currentYearTh})`, 15, 27);
    doc.text(`Document Reference: ${docRef} | Date: ${printDateStr}`, 15, 33);

    // Divider
    doc.setLineWidth(0.5);
    doc.line(15, 36, 195, 36);

    // Summary Statistics
    doc.setFontSize(12);
    doc.text(`1. Executive Summary Statistics`, 15, 44);
    doc.setFontSize(10);
    doc.text(`- Total Cameras Installed: ${total} points`, 20, 51);
    doc.text(`- Operational / Online: ${onlineCount} points (${operationalRate}%)`, 20, 57);
    doc.text(`- Faulty / Damaged: ${faultyCount} points`, 20, 63);
    doc.text(`- Under Maintenance: ${maintenanceCount} points`, 20, 69);
    doc.text(`- Offline / Disconnected: ${offlineCount} points`, 20, 75);

    // Building Breakdown
    doc.setFontSize(12);
    doc.text(`2. Camera Distribution by Location / Building`, 15, 85);
    
    let y = 92;
    doc.setFontSize(9);
    doc.text(`Building / Location`, 20, y);
    doc.text(`Total`, 100, y);
    doc.text(`Online`, 120, y);
    doc.text(`Faulty`, 140, y);
    doc.text(`Maint.`, 160, y);
    doc.text(`Offline`, 180, y);

    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    buildingStats.forEach(b => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(b.building.slice(0, 35), 20, y);
      doc.text(String(b.total), 100, y);
      doc.text(String(b.online), 120, y);
      doc.text(String(b.faulty), 140, y);
      doc.text(String(b.maintenance), 160, y);
      doc.text(String(b.offline), 180, y);
      y += 6;
    });

    // Urgent Issues Section
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 6;
    }

    doc.setFontSize(12);
    doc.text(`3. Cameras Requiring Repair Attention (${faultyCount + offlineCount} points)`, 15, y);
    y += 7;

    const issuesList = cameras.filter(c => c.status === 'faulty' || c.status === 'offline');
    doc.setFontSize(9);
    if (issuesList.length === 0) {
      doc.text(`All CCTV cameras are operating normally. No urgent repairs needed.`, 20, y);
    } else {
      issuesList.slice(0, 15).forEach(c => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`[${c.id}] ${c.name} - ${c.building} (${c.status.toUpperCase()})`, 20, y);
        y += 5;
      });
    }

    doc.save(`Chaiyaphum_CCTV_Monthly_Report_${now.getFullYear()}_${now.getMonth() + 1}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-auto border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Controls (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  ประชุมคณะกรรมการประจำเดือน
                </span>
                <span className="text-xs text-slate-400">รายงานสารสนเทศ CCTV</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                รายงานสรุปสถิติ & แผนผังจุดติดตั้งกล้องวงจรปิด (PDF Oversight Report)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              ดาวน์โหลดไฟล์ PDF
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-100" />
              พิมพรายงาน (Print/A4)
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Content */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-8 flex-1 bg-white text-slate-900 font-serif print:p-0 print:overflow-visible">
          
          {/* Header Block */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-400 flex items-center justify-center font-bold text-xl border-2 border-amber-400 shadow-xs">
                เทศบาล
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              รายงานสรุปการบริหารจัดการและสถิติสถานะกล้องวงจรปิด (CCTV)
            </h1>
            <h2 className="text-sm font-semibold text-slate-700">
              เทศบาลเมืองชัยภูมิ อำเภอเมืองชัยภูมิ จังหวัดชัยภูมิ
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              เอกสารประกอบการประชุมคณะกรรมการกำกับดูแลและติดตามผลการดำเนินงานระบบกล้องวงจรปิด ประจำเดือน{currentMonthTh} พ.ศ. {currentYearTh}
            </p>
            
            <div className="flex justify-between items-center text-xs font-sans text-slate-500 pt-3">
              <span>เลขที่เอกสาร: <strong className="font-mono text-slate-800">{docRef}</strong></span>
              <span>วันที่จัดทำรายงาน: <strong className="text-slate-800">{printDateStr}</strong></span>
            </div>
          </div>

          {/* Section 1: Executive Key Metrics */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3 py-0.5 bg-blue-50">
              1. สรุปภาพรวมสถิติและอัตราความพร้อมใช้งาน (Executive Summary & KPIs)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="border border-slate-300 rounded-xl p-3 text-center bg-slate-50">
                <div className="text-xs text-slate-500">จุดติดตั้งทั้งหมด</div>
                <div className="text-2xl font-black text-slate-900 my-1">{total}</div>
                <div className="text-[10px] text-slate-600">กล้อง CCTV ทุกโซน</div>
              </div>

              <div className="border border-emerald-300 rounded-xl p-3 text-center bg-emerald-50/70">
                <div className="text-xs text-emerald-800 font-bold">ใช้งานได้ปกติ</div>
                <div className="text-2xl font-black text-emerald-700 my-1">{onlineCount}</div>
                <div className="text-[10px] text-emerald-800 font-medium">ความพร้อม {operationalRate}%</div>
              </div>

              <div className="border border-rose-300 rounded-xl p-3 text-center bg-rose-50/70">
                <div className="text-xs text-rose-800 font-bold">ชำรุด/ขัดข้อง</div>
                <div className="text-2xl font-black text-rose-700 my-1">{faultyCount}</div>
                <div className="text-[10px] text-rose-800 font-medium">รอการซ่อมแซม</div>
              </div>

              <div className="border border-amber-300 rounded-xl p-3 text-center bg-amber-50/70">
                <div className="text-xs text-amber-900 font-bold">อยู่ระหว่างซ่อม</div>
                <div className="text-2xl font-black text-amber-800 my-1">{maintenanceCount}</div>
                <div className="text-[10px] text-amber-900 font-medium">กำลังดำเนินการ</div>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 text-center bg-slate-200">
                <div className="text-xs text-slate-700 font-bold">ขาดการเชื่อมต่อ</div>
                <div className="text-2xl font-black text-slate-900 my-1">{offlineCount}</div>
                <div className="text-[10px] text-slate-600">ออฟไลน์/สัญญาณขาด</div>
              </div>
            </div>
          </div>

          {/* Section 2: Distribution by Location Table */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3 py-0.5 bg-blue-50">
              2. สถิติการจำแนกตามอาคาร สถานที่ และพื้นที่ติดตั้ง (Location & Building Breakdown)
            </h3>

            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300">อาคาร / สถานที่ติดตั้ง</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">รวม (จุด)</th>
                  <th className="p-2.5 border-r border-slate-300 text-center text-emerald-700">ปกติ</th>
                  <th className="p-2.5 border-r border-slate-300 text-center text-rose-700">ชำรุด</th>
                  <th className="p-2.5 border-r border-slate-300 text-center text-amber-700">ระหว่างซ่อม</th>
                  <th className="p-2.5 text-center text-slate-700">ออฟไลน์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {buildingStats.map((b, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-2.5 border-r border-slate-300 font-semibold text-slate-900">{b.building}</td>
                    <td className="p-2.5 border-r border-slate-300 text-center font-bold">{b.total}</td>
                    <td className="p-2.5 border-r border-slate-300 text-center text-emerald-700 font-bold">{b.online}</td>
                    <td className="p-2.5 border-r border-slate-300 text-center text-rose-700 font-bold">{b.faulty}</td>
                    <td className="p-2.5 border-r border-slate-300 text-center text-amber-700 font-bold">{b.maintenance}</td>
                    <td className="p-2.5 text-center text-slate-700 font-bold">{b.offline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Simplified Map Layout & Coordinates Overview */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3 py-0.5 bg-blue-50">
              3. ผังตำแหน่งพิกัดทางภูมิศาสตร์ และแผนผังจุดติดตั้ง (Geographic Coordinates & Map Layout)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 bg-slate-50/50">
              <div className="space-y-2">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  ศูนย์กลางพิกัดเทศบาลเมืองชัยภูมิ:
                </div>
                <div className="font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                  ละติจูด (Lat): 13.847510° N | ลองจิจูด (Lng): 100.569120° E
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  จุดติดตั้งกล้องทั้งหมดเชื่อมโยงกับระบบเครือข่ายความเร็วสูง Fiber Optic เทศบาลเมืองชัยภูมิ
                  พร้อมพิกัดดาวเทียมเพื่อใช้อ้างอิงในงานสอบสวนและหลักฐานทางกฎหมาย
                </p>
              </div>

              <div className="border border-slate-300 bg-slate-900 text-white rounded-xl p-3 flex flex-col justify-between text-xs font-mono space-y-2">
                <div className="flex justify-between items-center text-slate-300 border-b border-slate-700 pb-1 text-[11px]">
                  <span>[CCTV MAP LAYER ACTIVE]</span>
                  <span className="text-emerald-400 font-bold">ONLINE MAP GRID</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-200">
                  <div>• โซนศูนย์ราชการ: {cameras.filter(c => c.building.includes('อำนวยการ') || c.building.includes('เทศบาล')).length} กล้อง</div>
                  <div>• โซนตลาดย่านชุมชน: {cameras.filter(c => c.building.includes('ตลาด')).length} กล้อง</div>
                  <div>• โซนงานป้องกันฯ / ศูนย์ดับเพลิง: {cameras.filter(c => c.building.includes('ป้องกัน')).length} กล้อง</div>
                  <div>• โซนอาคารวัฒนธรรม / หอประชุม: {cameras.filter(c => c.building.includes('หอประชุม') || c.building.includes('วัฒนธรรม')).length} กล้อง</div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Google Earth 3D Project</span>
                  <a 
                    href="https://earth.google.com/earth/d/16Z10iSFTtUgXwLv5ekTPRBarpH_eR5Bs?usp=sharing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-sans font-bold flex items-center gap-1"
                  >
                    <span>🌐 ลิงก์แผนที่ Google Earth</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Urgent Maintenance Action Plan */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-rose-600 pl-3 py-0.5 bg-rose-50">
              4. รายการกล้องวงจรปิดที่ต้องเร่งรัดการซ่อมแซม (Action Items for Maintenance)
            </h3>

            {faultyCount + offlineCount === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                ✓ กล้องวงจรปิดทุกจุดอยู่ในสถานะพร้อมใช้งานปกติ ไม่มีจุดขัดข้องที่ต้องเร่งรัดซ่อมแซมในเดือนนี้
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">รหัสกล้อง</th>
                    <th className="p-2 border-r border-slate-300">ชื่อจุดติดตั้ง</th>
                    <th className="p-2 border-r border-slate-300">สถานที่ / อาคาร</th>
                    <th className="p-2 border-r border-slate-300">สถานะ</th>
                    <th className="p-2">สาเหตุ / อาการชำรุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cameras
                    .filter(c => c.status === 'faulty' || c.status === 'offline')
                    .map(c => (
                      <tr key={c.id}>
                        <td className="p-2 border-r border-slate-300 font-mono font-bold">{c.id}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{c.name}</td>
                        <td className="p-2 border-r border-slate-300">{c.building} - {c.floor}</td>
                        <td className="p-2 border-r border-slate-300 font-bold text-rose-700">
                          {c.status === 'faulty' ? 'ชำรุดขัดข้อง' : 'ขาดการเชื่อมต่อ'}
                        </td>
                        <td className="p-2 text-slate-600">{c.notes || 'สัญญาณวิดีโอไม่ปรากฏ'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Official Signatures Block for Oversight Meeting */}
          <div className="pt-8 border-t border-slate-300 font-sans space-y-6">
            <div className="text-xs text-slate-700 font-medium text-center">
              เสนอ คณะกรรมการกำกับดูแลและติดตามผลการดำเนินงานระบบกล้องวงจรปิด เทศบาลเมืองชัยภูมิ พิจารณา
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center space-y-12">
                <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                <div className="text-xs text-slate-800 space-y-1">
                  <p className="font-bold">( นายสมศักดิ์ ป้องกันภัย )</p>
                  <p className="text-slate-600">หัวหน้าฝ่ายป้องกันและบรรเทาสาธารณภัย</p>
                  <p className="text-slate-500 text-[11px]">ผู้จัดทำรายงานสถิติ CCTV</p>
                </div>
              </div>

              <div className="text-center space-y-12">
                <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                <div className="text-xs text-slate-800 space-y-1">
                  <p className="font-bold">( นายชัยภูมิ มั่นคง )</p>
                  <p className="text-slate-600">ประธานคณะกรรมการกำกับดูแลระบบ CCTV</p>
                  <p className="text-slate-500 text-[11px]">เทศบาลเมืองชัยภูมิ</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
