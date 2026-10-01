import React from 'react';
import { CctvCamera } from '../types/cctv';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface CctvRepairHistoryPrintModalProps {
  camera: CctvCamera;
  onClose: () => void;
}

export const CctvRepairHistoryPrintModal: React.FC<CctvRepairHistoryPrintModalProps> = ({
  camera,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const historyData = [
    ...(camera.status === 'faulty' ? [{ date: new Date().toISOString().split('T')[0], desc: camera.notes || 'แจ้งปัญหาสัญญาณภาพขาดหาย/ชำรุด', status: 'pending' }] : []),
    ...(camera.status === 'maintenance' ? [{ date: new Date().toISOString().split('T')[0], desc: camera.notes || 'ช่างกำลังเข้าดำเนินการ/รออะไหล่', status: 'in_progress' }] : []),
    { date: camera.lastMaintenance, desc: 'ตรวจสอบและทำความสะอาดตามวงรอบ', status: 'completed' },
    { date: '2023-11-15', desc: 'อัปเดตเฟิร์มแวร์ระบบและตั้งค่า IP ใหม่', status: 'completed' },
    { date: '2023-05-10', desc: 'ติดตั้งและตั้งค่าเริ่มต้น', status: 'completed' }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:block overflow-y-auto">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl my-auto print:shadow-none print:my-0 print:rounded-none">
        {/* Modal Controls - Hidden in print */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 no-print">
          <h3 className="text-lg font-bold text-slate-900">ตัวอย่างเอกสารก่อนพิมพ์</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร (Print PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 md:p-12 document-font print:p-0">
          <div className="max-w-[800px] mx-auto space-y-8">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-xl print:border print:border-slate-900">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">เทศบาลเมืองชัยภูมิ</h1>
                  <p className="text-sm text-slate-600">รายงานประวัติการบำรุงรักษากล้องวงจรปิด (CCTV)</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs text-slate-500">พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</p>
                <div className="inline-block border border-slate-300 px-3 py-1 rounded text-xs font-bold bg-slate-50">
                  รหัสเอกสาร: MN-CCTV-{new Date().getFullYear() + 543}
                </div>
              </div>
            </div>

            {/* Camera Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200 print:border-slate-300 print:bg-transparent">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">รหัสกล้อง (Camera ID)</h4>
                  <p className="text-base font-bold text-slate-900">{camera.id}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อจุดติดตั้ง</h4>
                  <p className="text-base font-bold text-slate-900">{camera.name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานที่ติดตั้ง</h4>
                  <p className="text-sm text-slate-800">
                    อาคาร: {camera.building}<br />
                    ชั้น: {camera.floor}<br />
                    โซน: {camera.zone}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเลข IP</h4>
                  <p className="text-base font-mono text-slate-900">{camera.ipAddress}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">รุ่น / ประเภท</h4>
                  <p className="text-sm text-slate-800">{camera.model} ({camera.type.toUpperCase()})</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะปัจจุบัน</h4>
                  <p className={`inline-block px-3 py-1 mt-1 rounded-full text-sm font-bold border ${
                    camera.status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    camera.status === 'faulty' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    camera.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                  } print:bg-transparent`}>
                    {camera.status === 'online' ? 'ออนไลน์ (ใช้งานปกติ)' :
                     camera.status === 'faulty' ? 'ขัดข้อง (รอการซ่อมแซม)' :
                     camera.status === 'maintenance' ? 'กำลังซ่อมบำรุง' : 'ออฟไลน์'}
                  </p>
                </div>
              </div>
            </div>

            {/* History Table */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                ประวัติการบำรุงรักษาและการตรวจสอบ
              </h3>
              
              <table className="w-full text-left text-sm border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 print:bg-slate-100">
                    <th className="px-4 py-3 font-bold border-r border-slate-300 w-32">วันที่</th>
                    <th className="px-4 py-3 font-bold border-r border-slate-300">รายละเอียดการดำเนินงาน</th>
                    <th className="px-4 py-3 font-bold w-40">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {historyData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-4 border-r border-slate-300 font-mono text-slate-700 align-top">
                        {item.date}
                      </td>
                      <td className="px-4 py-4 border-r border-slate-300 text-slate-800 whitespace-pre-wrap align-top">
                        {item.desc}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold border ${
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        } print:bg-transparent print:border-none print:px-0`}>
                          {item.status === 'completed' ? 'เสร็จสิ้น' : item.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-8 pt-16 mt-8">
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-600">ผู้รายงาน / ช่างเทคนิค</p>
                <div className="border-b-2 border-dashed border-slate-300 mx-12 pt-12"></div>
                <p className="text-sm font-bold text-slate-800 pt-2">(...................................................)</p>
                <p className="text-xs text-slate-500">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-600">ผู้รับรอง / หัวหน้างาน</p>
                <div className="border-b-2 border-dashed border-slate-300 mx-12 pt-12"></div>
                <p className="text-sm font-bold text-slate-800 pt-2">(...................................................)</p>
                <p className="text-xs text-slate-500">วันที่: ....... / ....... / .......</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
