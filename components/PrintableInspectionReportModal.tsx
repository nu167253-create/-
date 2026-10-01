import React, { useRef } from 'react';
import { CameraInspectionItem } from '../types/adminFolders';
import { X, Printer, Download, ShieldCheck, CheckCircle2, AlertTriangle, Star } from 'lucide-react';

interface PrintableInspectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CameraInspectionItem | null;
}

export const PrintableInspectionReportModal: React.FC<PrintableInspectionReportModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const getResultBadge = (res: CameraInspectionItem['overallResult']) => {
    switch (res) {
      case 'pass':
        return <span className="text-emerald-700 font-extrabold border border-emerald-500 bg-emerald-50 px-3 py-1 rounded-md">🟢 ผ่านเกณฑ์การตรวจเช็ค (PASS)</span>;
      case 'needs_attention':
        return <span className="text-amber-700 font-extrabold border border-amber-500 bg-amber-50 px-3 py-1 rounded-md">🟡 เฝ้าระวัง / มีรายการซ่อม (WARNING)</span>;
      case 'critical_defect':
        return <span className="text-rose-700 font-extrabold border border-rose-500 bg-rose-50 px-3 py-1 rounded-md">🔴 ชำรุดวิกฤต / ต้องซ่อมด่วน (CRITICAL)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 my-auto flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:rounded-none print:border-none">
        
        {/* Modal Toolbar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">แบบรายงานผลการตรวจเช็คและทำความสะอาดกล้อง CCTV (Official Document)</span>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
              {report.reportNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสารราชการ (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Canvas */}
        <div ref={printRef} className="p-8 md:p-12 overflow-y-auto print:overflow-visible flex-1 text-slate-900 bg-white leading-relaxed font-sans">
          
          {/* Header with Thai Emblem */}
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5">
            <div className="inline-block p-2 bg-slate-100 rounded-full border border-slate-300 mb-1">
              <span className="text-2xl font-black">🏛️</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              แบบรายงานผลการตรวจเช็ค ทำความสะอาด และบำรุงรักษากล้องโทรทัศน์วงจรปิด (CCTV)
            </h2>
            <p className="text-sm font-semibold text-slate-700">
              เทศบาลเมืองชัยภูมิ อำเภอเมืองชัยภูมิ จังหวัดชัยภูมิ
            </p>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 px-4">
              <span><strong>เลขที่เอกสารรายงาน:</strong> {report.reportNo}</span>
              <span><strong>วันที่ตรวจเช็ค:</strong> {report.date} เวลา {report.time} น.</span>
            </div>
          </div>

          {/* Section 1: Equipment Profile */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold bg-slate-100 px-3 py-1.5 rounded border border-slate-300 text-slate-800">
              ๑. ข้อมูลจุดติดตั้งและอุปกรณ์กล้องโทรทัศน์วงจรปิด
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs px-3">
              <div><strong>รหัสกล้อง (Camera ID):</strong> <span className="font-mono font-bold text-blue-700">{report.cameraId}</span></div>
              <div><strong>ชื่อจุดติดตั้ง:</strong> {report.cameraName}</div>
              <div><strong>ตู้ควบคุม / โซน:</strong> {report.zone}</div>
              <div><strong>สถานที่ / เขตพื้นที่:</strong> {report.building}</div>
              <div><strong>ผู้ตรวจเช็ค:</strong> {report.inspectorName} ({report.inspectorPosition})</div>
              <div><strong>ชุดปฏิบัติการ:</strong> {report.inspectorTeam || 'ชุดซ่อมบำรุง CCTV เทศบาล'}</div>
            </div>
          </div>

          {/* Section 2: 6-Pillar Checklist Table */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold bg-slate-100 px-3 py-1.5 rounded border border-slate-300 text-slate-800">
              ๒. ผลการตรวจเช็คสภาพทางกายภาพและระบบเครือข่าย (๖ มิติ)
            </h3>
            
            <table className="w-full text-xs border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold">
                  <th className="border border-slate-400 p-2 text-center w-12">ลำดับ</th>
                  <th className="border border-slate-400 p-2 text-left">รายการตรวจเช็คและบำรุงรักษา</th>
                  <th className="border border-slate-400 p-2 text-center w-36">ผลการตรวจเช็ค</th>
                  <th className="border border-slate-400 p-2 text-left">รายละเอียด / ค่าที่วัดได้</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๑</td>
                  <td className="border border-slate-400 p-2 font-semibold">การทำความสะอาดกระจกหน้าเลนส์ และฝาครอบโดม</td>
                  <td className="border border-slate-400 p-2 text-center font-bold text-emerald-700">
                    {report.lensCleaning ? '✓ ดำเนินการแล้ว' : '✗ ยังไม่ดำเนินการ'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    ความคมชัด: {report.lensClarityRating}/5 ดาว ({report.afterCleaningNotes || 'ภาพคมชัดสมบูรณ์'})
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๒</td>
                  <td className="border border-slate-400 p-2 font-semibold">สภาพตัวกล้อง ขายึด และซีลยางกันน้ำ</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">
                    {report.housingCondition === 'good' ? '🟢 มั่นคงแข็งแรง' : '🟡 มีจุดหลวม/แก้ไข'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    ซีลกันน้ำ: {report.waterproofSeal ? 'ปกติสมบูรณ์' : 'ต้องเปลี่ยนซีล'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๓</td>
                  <td className="border border-slate-400 p-2 font-semibold">ระบบไฟเลี้ยงและเครื่องสำรองไฟ (UPS)</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">
                    {report.upsBackupStatus === 'normal' ? '🟢 พร้อมใช้งาน' : '🔴 แบตเตอรี่เสื่อม'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    แรงดันไฟ: {report.powerSupplyVoltage || '48V PoE+'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๔</td>
                  <td className="border border-slate-400 p-2 font-semibold">สัญญาณเครือข่ายและสาย Fiber Optic</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">
                    {report.networkPingMs < 20 ? '🟢 ปกติ (ปกติ)' : '🔴 ล่าช้า/สัญญาณขาด'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    Ping Latency: {report.networkPingMs} ms
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๕</td>
                  <td className="border border-slate-400 p-2 font-semibold">สถานะการบันทึกภาพลงเครื่องบันทึก NVR</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">
                    {report.nvrRecordingStatus === 'recording' ? '🟢 บันทึกต่อเนื่อง 24ชม.' : '🔴 ผิดปกติ'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    การเก็บข้อมูลภาพย้อนหลังสมบูรณ์
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 text-center">๖</td>
                  <td className="border border-slate-400 p-2 font-semibold">ระบบอินฟราเรด (IR) และการส่องสว่างกลางคืน</td>
                  <td className="border border-slate-400 p-2 text-center font-bold">
                    {report.irNightVision === 'working' ? '🟢 ทำงานปกติ' : '⚪ ไม่ระบุ/ชำรุด'}
                  </td>
                  <td className="border border-slate-400 p-2">
                    ครอบคลุมรัศมีในระยะตรวจจับ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Before & After Cleaning */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold bg-slate-100 px-3 py-1.5 rounded border border-slate-300 text-slate-800">
              ๓. สภาพก่อนและหลังการทำความสะอาด
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 rounded p-3 bg-slate-50">
                <strong className="block text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                  ก่อนทำความสะอาด (Before):
                </strong>
                <p className="text-slate-700 min-h-[40px]">{report.beforeCleaningNotes || 'มีคราบฝุ่นละอองตามรอบการใช้งาน'}</p>
                {report.beforePhotoUrl && (
                  <div className="mt-2 h-28 border border-slate-300 rounded overflow-hidden">
                    <img src={report.beforePhotoUrl} alt="Before Cleaning" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="border border-slate-300 rounded p-3 bg-slate-50">
                <strong className="block text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                  หลังทำความสะอาดและปรับปรุง (After):
                </strong>
                <p className="text-slate-700 min-h-[40px]">{report.afterCleaningNotes || 'เช็ดทำความสะอาดเรียบร้อย ภาพคมชัดสมบูรณ์'}</p>
                {report.afterPhotoUrl && (
                  <div className="mt-2 h-28 border border-slate-300 rounded overflow-hidden">
                    <img src={report.afterPhotoUrl} alt="After Cleaning" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Summary Result & Actions */}
          <div className="mt-6 space-y-2 border border-slate-300 rounded-lg p-4 bg-slate-50 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300">
              <span className="font-bold text-sm text-slate-900">๔. สรุปผลการประเมินโดยรวม:</span>
              <div>{getResultBadge(report.overallResult)}</div>
            </div>
            <div className="pt-2 space-y-1">
              <div><strong>การดำเนินการที่ได้กระทำ:</strong> {report.actionTaken || 'เช็ดทำความสะอาดและตรวจเช็คสัญญาณเครือข่าย'}</div>
              <div><strong>ข้อเสนอแนะในการบำรุงรักษาครั้งต่อไป:</strong> {report.recommendedAction || 'เข้าตรวจเช็คตามรอบปกติ ๓๐ วัน'}</div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-slate-300">
            <div className="space-y-6">
              <p className="font-semibold">ลงชื่อ ................................................................</p>
              <div>
                <p className="font-bold">({report.inspectorName})</p>
                <p className="text-slate-600">{report.inspectorPosition}</p>
                <p className="text-slate-500">ผู้ตรวจเช็คและบันทึกรายงาน</p>
                <p className="text-slate-500">วันที่ {report.date}</p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="font-semibold">ลงชื่อ ................................................................</p>
              <div>
                <p className="font-bold">({report.verifiedBy || 'นายสมศักดิ์ วงศ์สวรรค์'})</p>
                <p className="text-slate-600">หัวหน้าฝ่ายความมั่นคงและเทคโนโลยีสารสนเทศ (Admin)</p>
                <p className="text-slate-500">ผู้ตรวจรับรองรายงาน</p>
                <p className="text-slate-500">วันที่ {report.verifiedAt ? report.verifiedAt.slice(0, 10) : report.date}</p>
              </div>
            </div>
          </div>

          {/* Document Footer Note */}
          <div className="mt-10 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            ระบบบริหารจัดการกล้องโทรทัศน์วงจรปิดและคลังแฟ้มเอกสารดิจิทัล เทศบาลเมืองชัยภูมิ • วันที่พิมพ์ {new Date().toLocaleDateString('th-TH')}
          </div>

        </div>

      </div>
    </div>
  );
};
