import React from 'react';
import { CctvCamera } from '../types/cctv';
import { 
  Printer, 
  Download, 
  X, 
  Wrench, 
  Calendar, 
  Building, 
  FileText, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface CctvMaintenanceSchedulePrintModalProps {
  cameras: CctvCamera[];
  onClose: () => void;
}

export const CctvMaintenanceSchedulePrintModal: React.FC<CctvMaintenanceSchedulePrintModalProps> = ({
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
  const docRef = `MNT-SCHED-${currentYearTh}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calculated Stats
  const totalSelected = cameras.length;
  const faultyCount = cameras.filter(c => c.status === 'faulty').length;
  const maintenanceCount = cameras.filter(c => c.status === 'maintenance').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const onlineCount = cameras.filter(c => c.status === 'online').length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // Header
    doc.setFontSize(15);
    doc.text(`CCTV Maintenance Schedule Summary`, 15, 18);
    doc.setFontSize(10);
    doc.text(`Chaiyaphum Municipality - Technical Maintenance Division`, 15, 24);
    doc.text(`Ref No: ${docRef} | Compiled Date: ${printDateStr}`, 15, 29);

    doc.setLineWidth(0.4);
    doc.line(15, 32, 195, 32);

    // Summary Stats
    doc.setFontSize(11);
    doc.text(`Selected Cameras Summary (${totalSelected} units total):`, 15, 39);
    doc.setFontSize(9.5);
    doc.text(`- Operational (Online): ${onlineCount} units`, 20, 45);
    doc.text(`- Faulty / Damaged: ${faultyCount} units`, 20, 50);
    doc.text(`- Under Maintenance: ${maintenanceCount} units`, 20, 55);
    doc.text(`- Offline / No Signal: ${offlineCount} units`, 20, 60);

    // Schedule Table Header
    let y = 69;
    doc.setFontSize(10);
    doc.text(`Maintenance Work Order List`, 15, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.text(`Camera ID`, 15, y);
    doc.text(`Camera Name & Location`, 40, y);
    doc.text(`Status`, 110, y);
    doc.text(`Technician Notes & Action Needed`, 135, y);

    doc.line(15, y + 2, 195, y + 2);
    y += 7;

    cameras.forEach((cam) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const locationStr = `${cam.building} (${cam.floor ? `Fl.${cam.floor}` : ''} ${cam.zone ? `Zone: ${cam.zone}` : ''})`;
      const noteStr = cam.notes ? cam.notes.replace(/\n/g, ' ') : 'วงรอบตรวจสอบและทำความสะอาดปกติ';

      doc.setFontSize(8.5);
      doc.text(cam.id, 15, y);
      doc.text(cam.name.slice(0, 32), 40, y);
      doc.setFontSize(7.5);
      doc.text(locationStr.slice(0, 42), 40, y + 4);
      doc.setFontSize(8.5);
      doc.text(cam.status.toUpperCase(), 110, y);
      doc.setFontSize(8);
      doc.text(noteStr.slice(0, 35), 135, y);

      y += 10;
    });

    doc.save(`CCTV_Maintenance_Schedule_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-auto border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header Bar (Hidden during Print) */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  ตารางเข้าซ่อมบำรุงประจำกลุ่ม
                </span>
                <span className="text-xs text-slate-400">เลือกไว้ {totalSelected} รายการ</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                สรุปตารางการซ่อมบำรุงและหมายเหตุช่างเทคนิค (Maintenance Schedule Summary)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              ดาวน์โหลด PDF
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-100" />
              พิมพ์เอกสาร (Print)
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-8 flex-1 bg-white text-slate-900 font-serif print:p-0 print:overflow-visible">
          
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl border-2 border-amber-400 shadow-xs">
                เทศบาล
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              ตารางสรุปแผนการเข้าซ่อมบำรุงและหมายเหตุช่างเทคนิค (Maintenance Schedule Summary)
            </h1>
            <h2 className="text-sm font-semibold text-slate-700">
              ฝ่ายป้องกันและบรรเทาสาธารณภัย / ศูนย์ควบคุมระบบกล้องวงจรปิด (CCTV) เทศบาลเมืองชัยภูมิ
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              รายงานรวบรวมข้อมูลกล้องวงจรปิดกลุ่มที่เลือก ({totalSelected} จุด) เพื่อมอบหมายทีมช่างเทคนิคเข้าดำเนินการตรวจเช็กและซ่อมแซม
            </p>

            <div className="flex flex-wrap justify-between items-center text-xs font-sans text-slate-600 pt-3 border-t border-slate-200 mt-2">
              <span>เลขที่อ้างอิงเอกสาร: <strong className="font-mono text-slate-900">{docRef}</strong></span>
              <span>วันที่พิมพ์สั่งการ: <strong className="text-slate-900">{printDateStr}</strong></span>
              <span>จำนวนกล้องในตาราง: <strong className="text-blue-700 font-bold">{totalSelected} จุด</strong></span>
            </div>
          </div>

          {/* Section 1: Executive Work Allocation Overview */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-amber-500 pl-3 py-0.5 bg-amber-50">
              1. ภาพรวมประเภทสถานะกล้องในตารางซ่อมบำรุง (Selected Units Summary)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 text-center">
                <div className="text-xs text-slate-500">จำนวนกล้องที่เลือกทั้งหมด</div>
                <div className="text-2xl font-black text-slate-900 my-1">{totalSelected}</div>
                <div className="text-[10px] text-slate-600">รายการในเอกสารฉบับนี้</div>
              </div>

              <div className="border border-amber-300 rounded-xl p-3 bg-amber-50/70 text-center">
                <div className="text-xs text-amber-900 font-bold">อยู่ระหว่างซ่อมแซม</div>
                <div className="text-2xl font-black text-amber-800 my-1">{maintenanceCount}</div>
                <div className="text-[10px] text-amber-800">ทีมช่างรับเรื่องแล้ว</div>
              </div>

              <div className="border border-rose-300 rounded-xl p-3 bg-rose-50/70 text-center">
                <div className="text-xs text-rose-900 font-bold">ชำรุด / ขัดข้อง</div>
                <div className="text-2xl font-black text-rose-700 my-1">{faultyCount}</div>
                <div className="text-[10px] text-rose-800">ต้องเข้าตรวจสอบด่วน</div>
              </div>

              <div className="border border-emerald-300 rounded-xl p-3 bg-emerald-50/70 text-center">
                <div className="text-xs text-emerald-900 font-bold">ปกติ / ตรวจเช็กวงรอบ</div>
                <div className="text-2xl font-black text-emerald-700 my-1">{onlineCount + offlineCount}</div>
                <div className="text-[10px] text-emerald-800">ออนไลน์ {onlineCount} / ออฟไลน์ {offlineCount}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Maintenance Schedule Table */}
          <div className="space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3 py-0.5 bg-blue-50">
              2. ตารางรายละเอียดจุดติดตั้ง และหมายเหตุช่างเทคนิค (Maintenance Schedule & Location Notes)
            </h3>

            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300 text-center w-12">ลำดับ</th>
                  <th className="p-2.5 border-r border-slate-300 w-28">รหัสกล้อง</th>
                  <th className="p-2.5 border-r border-slate-300">ชื่อจุดติดตั้ง / รุ่นประเภท</th>
                  <th className="p-2.5 border-r border-slate-300">อาคาร / สถานที่ / ชั้น / โซน</th>
                  <th className="p-2.5 border-r border-slate-300 text-center w-24">สถานะปัจจุบัน</th>
                  <th className="p-2.5">หมายเหตุช่างเทคนิค & Action Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cameras.map((cam, idx) => {
                  let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                  let statusText = 'ปกติ';

                  if (cam.status === 'online') {
                    statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                    statusText = 'ปกติ (Online)';
                  } else if (cam.status === 'faulty') {
                    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
                    statusText = 'ชำรุด (Faulty)';
                  } else if (cam.status === 'maintenance') {
                    statusBadgeClass = 'bg-amber-50 text-amber-900 border-amber-300';
                    statusText = 'กำลังซ่อม';
                  } else if (cam.status === 'offline') {
                    statusBadgeClass = 'bg-slate-200 text-slate-800 border-slate-400';
                    statusText = 'ออฟไลน์';
                  }

                  return (
                    <tr key={cam.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-300 font-mono font-bold text-blue-900">{cam.id}</td>
                      <td className="p-2.5 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{cam.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {cam.model || 'Fixed IP'} | IP: {cam.ipAddress || 'Dynamic'}
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-slate-300">
                        <div className="font-semibold text-slate-800">{cam.building}</div>
                        <div className="text-[10px] text-slate-600">
                          ชั้น {cam.floor || '-'} | โซน: {cam.zone || 'ทั่วไป'}
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="text-slate-800 text-[11px] whitespace-pre-line leading-relaxed">
                          {cam.notes ? cam.notes : 'ตรวจเช็กความสะอาดเลนส์ สายสัญญาณ และไฟเลี้ยงตามวงรอบปกติ'}
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 font-sans">
                          เข้าดูแลล่าสุด: {cam.lastMaintenance || 'ไม่ระบุ'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Technician Assignment & Execution Instructions */}
          <div className="space-y-3 font-sans pt-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-l-4 border-slate-700 pl-3 py-0.5 bg-slate-100">
              3. ข้อปฏิบัติในการเข้าซ่อมบำรุงและรายงานผล (Field Execution Guidelines)
            </h3>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">1.</span>
                <span>ตรวจสอบแรงดันไฟฟ้า สายสัญญาณ Fiber Optic / UTP และ POE Switch ณ จุดติดตั้งก่อนปรับเปลี่ยนอุปกรณ์</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">2.</span>
                <span>บันทึกภาพถ่ายก่อน-หลัง การดำเนินการซ่อมแซมเพื่อประกอบการลงบันทึกประวัติในระบบบริหารจัดการ CCTV</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-900">3.</span>
                <span>เมื่อซ่อมแซมเสร็จสิ้น ให้ช่างผู้รับผิดชอบปรับสถานะกล้องในระบบเป็น "ใช้งานปกติ" พร้อมระบุรายละเอียดผลการซ่อม</span>
              </div>
            </div>
          </div>

          {/* Official Signature Block */}
          <div className="pt-10 border-t border-slate-300 font-sans space-y-6">
            <div className="text-xs text-slate-700 font-semibold text-center">
              ใบมอบหมายงานและตารางซ่อมบำรุงระบบกล้องวงจรปิด เทศบาลเมืองชัยภูมิ
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center space-y-12">
                <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                <div className="text-xs text-slate-800 space-y-1">
                  <p className="font-bold">( ................................................................ )</p>
                  <p className="text-slate-600">ช่างเทคนิคผู้รับมอบหมายงานซ่อมบำรุง</p>
                  <p className="text-slate-500 text-[11px]">วันที่เข้าปฏิบัติงาน: ......./......./.......</p>
                </div>
              </div>

              <div className="text-center space-y-12">
                <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                <div className="text-xs text-slate-800 space-y-1">
                  <p className="font-bold">( นายสมศักดิ์ ป้องกันภัย )</p>
                  <p className="text-slate-600">หัวหน้าฝ่ายป้องกันและบรรเทาสาธารณภัย</p>
                  <p className="text-slate-500 text-[11px]">ผู้อนุมัติตารางเข้าซ่อมบำรุง</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
