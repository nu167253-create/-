import React, { useState } from 'react';
import { CctvCamera, CctvStatus } from '../types/cctv';
import { updateCctvStatus } from '../data/cctvData';
import { 
  Printer, 
  FileText, 
  DollarSign, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  Building, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  Download, 
  RefreshCw,
  Send,
  User,
  Phone,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface CctvReportCenterModalProps {
  cameras: CctvCamera[];
  onClose: () => void;
  onRefreshData?: () => void;
}

export const CctvReportCenterModal: React.FC<CctvReportCenterModalProps> = ({
  cameras,
  onClose,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'quotation' | 'inspection' | 'request_form' | 'status_update'>('quotation');

  // Interactive Form State for Official Request Form
  const [applicantName, setApplicantName] = useState<string>('นายสมชาย ชัยภูมิ');
  const [idCardNumber, setIdCardNumber] = useState<string>('1-3699-00123-45-1');
  const [age, setAge] = useState<string>('38');
  const [occupation, setOccupation] = useState<string>('ค้าขาย');
  const [address, setAddress] = useState<string>('123 ถนนหอนาฬิกา ต.ในเมือง อ.เมืองชัยภูมิ จ.ชัยภูมิ 36000');
  const [phone, setPhone] = useState<string>('081-234-5678');
  const [locationRequested, setLocationRequested] = useState<string>('สี่แยกโรบินสัน ชัยภูมิ และ ตลาดน้ำพุถนนคนเดิน');
  const [dateRequested, setDateRequested] = useState<string>('2026-08-01');
  const [timeRangeRequested, setTimeRangeRequested] = useState<string>('18:00 น. - 20:30 น.');
  const [requestPurpose, setRequestPurpose] = useState<string>('เนื่องจากอุบัติเหตุรถเฉี่ยวชนบริเวณสี่แยกจราจร เพื่อประกอบหลักฐานการแจ้งความ');
  const [numCamerasCopy, setNumCamerasCopy] = useState<number>(2);
  const [attachPoliceReport, setAttachPoliceReport] = useState<boolean>(true);
  const [attachIdCopy, setAttachIdCopy] = useState<boolean>(true);

  // Quick Status Edit state
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<CctvStatus>('online');
  const [editNotes, setEditNotes] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Status Summary Calculations
  const totalCameras = cameras.length;
  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const faultyCount = cameras.filter(c => c.status === 'faulty').length;
  const maintenanceCount = cameras.filter(c => c.status === 'maintenance').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;

  const handlePrint = () => {
    window.print();
  };

  const handleQuickStatusSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCameraId) return;
    updateCctvStatus(editingCameraId, editStatus, editNotes);
    if (onRefreshData) onRefreshData();
    setUpdateSuccess(`อัปเดตสถานะกล้อง ${editingCameraId} เรียบร้อยแล้ว!`);
    setTimeout(() => setUpdateSuccess(null), 3000);
    setEditingCameraId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-auto border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header & Navigation Bar (No Print) */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  เทศบาลเมืองชัยภูมิ
                </span>
                <span className="text-xs text-slate-400">ระบบสารสนเทศ CCTV</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                ศูนย์รายงาน & จัดทำแบบคำร้องกล้องวงจรปิด (Chaiyaphum CCTV Report Center)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              พิมพ์เอกสาร / Export PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (No Print) */}
        <div className="no-print bg-slate-100 border-b border-slate-200 px-4 pt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'quotation'
                ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                : 'border-transparent hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>ใบเสนอราคาซ่อมแซม CCTV (บริษัท ซีนิธฯ)</span>
          </button>

          <button
            onClick={() => setActiveTab('inspection')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'inspection'
                ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                : 'border-transparent hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span>รายงานตรวจ NVR Hikvision & ตู้ควบคุม 26 ตู้</span>
          </button>

          <button
            onClick={() => setActiveTab('request_form')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'request_form'
                ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                : 'border-transparent hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>แบบคำร้องขอดู/สำเนาภาพ CCTV</span>
          </button>

          <button
            onClick={() => setActiveTab('status_update')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-1.5 ${
              activeTab === 'status_update'
                ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                : 'border-transparent hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-rose-600" />
            <span>อัปเดตสถานะกล้องด่วน ({offlineCount + faultyCount} จุดชำรุด)</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">

          {/* TAB 1: QUOTATION REPORT */}
          {activeTab === 'quotation' && (
            <div className="space-y-6 text-slate-900 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              {/* Header Box */}
              <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    บริษัท ซีนิธ อิมพีเม้นท์ โปรดักส์ จำกัด
                  </h3>
                  <p className="text-xs text-slate-600">ZENITH IMPLEMENT PRODUCTS CO., LTD.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    โทรศัพท์/ผู้ติดต่อ: คุณสุชาต โกมล (084-6730080) | ผู้บริหาร: Mr.Pumchit Thainthongsakul
                  </p>
                </div>
                <div className="text-right text-xs space-y-1 bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900">ใบเสนอราคา (QUOTATION)</div>
                  <div>เลขที่เอกสาร: <span className="font-mono font-bold">20260610</span></div>
                  <div>วันที่: <span className="font-mono">10 มิถุนายน 2569</span></div>
                  <div className="text-[11px] text-blue-700 font-semibold">โครงการ: ซ่อมแซมกล้องวงจรปิด เขตเทศบาลเมืองชัยภูมิ</div>
                </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-700">เรียน:</span> นายกเทศมนตรีเมืองชัยภูมิ / กองช่าง
                  <br />
                  <span className="font-bold text-slate-700">หน่วยงาน:</span> เทศบาลเมืองชัยภูมิ จ.ชัยภูมิ
                </div>
                <div>
                  <span className="font-bold text-slate-700">เงื่อนไขการส่งมอบ:</span> ภายใน 60 วัน
                  <br />
                  <span className="font-bold text-slate-700">กำหนดยืนราคา:</span> 30 วัน | <span className="font-bold text-slate-700">รับประกัน:</span> 1 ปี
                </div>
              </div>

              {/* Quotation Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-xs text-left text-slate-800">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                      <th className="py-2.5 px-3">รายการอุปกรณ์และงานติดตั้ง</th>
                      <th className="py-2.5 px-3 text-center w-20">จำนวน</th>
                      <th className="py-2.5 px-3 text-center w-20">หน่วย</th>
                      <th className="py-2.5 px-3 text-right w-28">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 text-right w-32">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-medium">
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3 font-semibold">อุปกรณ์แปลงสัญญาณจากสายไฟเบอร์ออฟติก (Fiber Media Converter)</td>
                      <td className="py-2.5 px-3 text-center font-mono">3</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">4,800.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">14,400.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">2</td>
                      <td className="py-2.5 px-3 font-semibold">อุปกรณ์กระจายสัญญาณภาพขนาด 4 ช่อง (Video Switch 4-Port)</td>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">4,500.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">4,500.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">3</td>
                      <td className="py-2.5 px-3 font-semibold">กล้องวงจรปิดใช้ภายนอกอาคารสำหรับรักษาความปลอดภัยทั่วไป แบบที่ 4</td>
                      <td className="py-2.5 px-3 text-center font-mono">2</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">22,000.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">44,000.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">4</td>
                      <td className="py-2.5 px-3 font-semibold">อุปกรณ์ป้องกันไฟตกไฟเกิน (Surge & Voltage Protection)</td>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">1,600.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">1,600.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">5</td>
                      <td className="py-2.5 px-3 font-semibold">พัดลมระบายความร้อน ขนาด 4 นิ้ว 220 โวลต์ (สำหรับตู้ควบคุม)</td>
                      <td className="py-2.5 px-3 text-center font-mono">18</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">950.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">17,100.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">6</td>
                      <td className="py-2.5 px-3 font-semibold">อุปกรณ์ตั้งเวลาทำงานพัดลม 24 ชั่วโมง (24-Hour Timer Switch)</td>
                      <td className="py-2.5 px-3 text-center font-mono">18</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">1,850.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">33,300.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">7</td>
                      <td className="py-2.5 px-3 font-semibold">สายสัญญาณ ชนิดใช้ภายนอกอาคาร (Outdoor Cat6 LAN Cable)</td>
                      <td className="py-2.5 px-3 text-center font-mono">100</td>
                      <td className="py-2.5 px-3 text-center">เมตร</td>
                      <td className="py-2.5 px-3 text-right font-mono">10.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">1,000.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">8</td>
                      <td className="py-2.5 px-3 font-semibold">อุปกรณ์ประกอบการติดตั้ง ท่อร้อยสาย และหัวคอนเนคเตอร์</td>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3 text-center">ชุด</td>
                      <td className="py-2.5 px-3 text-right font-mono">8,000.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">8,000.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-center font-mono">9</td>
                      <td className="py-2.5 px-3 font-semibold">ค่าแรงติดตั้ง รื้อถอน ทดสอบระบบสตรีมวิดีโอ และเชื่อมต่อเครือข่าย</td>
                      <td className="py-2.5 px-3 text-center font-mono">1</td>
                      <td className="py-2.5 px-3 text-center">งาน</td>
                      <td className="py-2.5 px-3 text-right font-mono">64,000.00</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">64,000.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold divide-y divide-slate-300">
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right">รวมเงิน (Subtotal):</td>
                      <td colSpan={2} className="py-2 px-3 text-right font-mono text-slate-900">187,900.00 บาท</td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right">ภาษีมูลค่าเพิ่ม 7% (VAT):</td>
                      <td colSpan={2} className="py-2 px-3 text-right font-mono text-slate-900">13,153.00 บาท</td>
                    </tr>
                    <tr className="bg-blue-50 text-blue-900 text-sm">
                      <td colSpan={4} className="py-3 px-3 text-right font-extrabold">จำนวนเงินรวมทั้งสิ้น (Grand Total):</td>
                      <td colSpan={2} className="py-3 px-3 text-right font-mono font-black text-blue-900 text-base">201,053.00 บาท</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-2">
                  <p className="font-bold text-slate-700">ผู้เสนอราคา / Authorized Representative</p>
                  <div className="h-12 border-b border-dashed border-slate-400 w-48 mx-auto flex items-end justify-center pb-1 font-serif text-blue-800">
                    Pumchit Thainthongsakul
                  </div>
                  <p className="font-bold text-slate-900">( Mr.Pumchit Thainthongsakul )</p>
                  <p className="text-slate-500">Managing Director / Zenith Implement Products Co., Ltd.</p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-700">ผู้อนุมัติสั่งจ้าง / เทศบาลเมืองชัยภูมิ</p>
                  <div className="h-12 border-b border-dashed border-slate-400 w-48 mx-auto" />
                  <p className="font-bold text-slate-900">( นายบรรยงค์ เกียรติก้องชูชัย )</p>
                  <p className="text-slate-500">นายกเทศมนตรีเมืองชัยภูมิ</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NVR INSPECTION & CABINET BREAKDOWN */}
          {activeTab === 'inspection' && (
            <div className="space-y-6 text-slate-900">
              
              {/* NVR Device Health Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700 font-bold">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        Hik-Partner Pro Report
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        รายงานการตรวจความสมบูรณ์เครื่องบันทึกภาพ NVR (Hikvision DS-7616NI-K2 J89086017)
                      </h3>
                      <p className="text-xs text-slate-500">
                        วิศวกรผู้ตรวจ: panupong fachaiyaphum | สถานที่: เทศบาลเมืองชัยภูมิ (IP: 192.168.1.6)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                      HDD Health: ปกติ (SMART OK)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">HDD No.1 Status</div>
                    <div className="font-bold text-emerald-700">ปกติ (35°C / 100% Usage)</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">HDD No.2 Status</div>
                    <div className="font-bold text-emerald-700">ปกติ (31°C / Standby)</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">กล้องออนไลน์ (Online)</div>
                    <div className="font-bold text-emerald-600 text-sm">4 / 16 ช่อง</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">กล้องชำรุด/ออฟไลน์</div>
                    <div className="font-bold text-rose-600 text-sm">12 / 16 ช่อง</div>
                  </div>
                </div>

                {/* 16 Channels Hikvision Detailed Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-2 px-3">ช่องสัญญาณ / IP</th>
                        <th className="py-2 px-3">จุดติดตั้งกล้อง</th>
                        <th className="py-2 px-3 text-center">สถานะ</th>
                        <th className="py-2 px-3">วันที่เริ่มออฟไลน์/ขัดข้อง</th>
                        <th className="py-2 px-3">สาเหตุปัญหาจากรายงาน Hikvision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-medium">
                      {cameras.filter(c => c.id.startsWith('IPCamera')).map((cam) => (
                        <tr key={cam.id} className={cam.status !== 'online' ? 'bg-rose-50/40' : 'bg-emerald-50/20'}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            {cam.id} ({cam.ipAddress})
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{cam.name}</td>
                          <td className="py-2 px-3 text-center">
                            {cam.status === 'online' ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                🟢 ออนไลน์
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                🔴 ออฟไลน์
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {cam.status === 'online' ? '-' : cam.lastMaintenance}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {cam.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 26 Control Cabinets Summary Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    รายงานสรุปตู้ควบคุม 26 ตู้ และเส้นทางสายไฟเบอร์ออฟติก (เทศบาลเมืองชัยภูมิ)
                  </h3>
                  <p className="text-xs text-slate-500">ตู้ควบคุมโหนดจุดตัดสี่แยกจราจรและพื้นที่สาธารณะสำคัญในเขตเทศบาล</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-900">📍 ตู้สามแยกโนนกอก (3 กล้อง)</div>
                    <div className="text-slate-700">เกิดไฟไหม้สาย Fiber Optic บริเวณใกล้สามแยกหนองปลาเฒ่า ระยะทางเสียหาย 100 เมตร (จากระยะรวม 3,585 เมตร)</div>
                  </div>
                  <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                    <div className="font-bold text-rose-900">📍 ตู้สี่แยกโรงต้ม (4 กล้อง)</div>
                    <div className="text-slate-700">สาย Fiber Optic ถูกตัดจากการนำสายไฟลงใต้ดิน ต้องเดินสายไฟเบอร์ใหม่ลงใต้ดินเชื่อมต่อกลับศูนย์</div>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-900">📍 ตู้สามแยกหอนาฬิกา (3 กล้อง)</div>
                    <div className="text-slate-700">ตู้ใส่อุปกรณ์โดนรถยนต์เฉี่ยวชนพังเสียหาย ต้องเปลี่ยนตู้ใส่อุปกรณ์ใหม่และเบรกเกอร์</div>
                  </div>
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-900">📍 ตู้สี่แยกหนองบ่อ (2 กล้อง)</div>
                    <div className="text-slate-700">Breaker switch ABB ในตู้ควบคุมเสีย ไม่มีไฟจ่ายให้อุปกรณ์สวิตช์แลน</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: OFFICIAL CCTV FOOTAGE APPLICATION FORM */}
          {activeTab === 'request_form' && (
            <div className="space-y-6">
              
              {/* Form Input Controls (No Print) */}
              <div className="no-print bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>กรอกข้อมูลเพื่อพิมพ์ "แบบคำร้องขอดู/ขอสำเนาข้อมูลภาพ CCTV เทศบาลเมืองชัยภูมิ"</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">ชื่อ-นามสกุล ผู้ยื่นคำร้อง</label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">เลขบัตรประจำตัวประชาชน</label>
                    <input
                      type="text"
                      value={idCardNumber}
                      onChange={(e) => setIdCardNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">จุดกล้องวงจรปิด/บริเวณที่ขอดูภาพ</label>
                    <input
                      type="text"
                      value={locationRequested}
                      onChange={(e) => setLocationRequested(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">วันที่ต้องการดูภาพ</label>
                    <input
                      type="date"
                      value={dateRequested}
                      onChange={(e) => setDateRequested(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* PRINTABLE OFFICIAL THAI DOCUMENT FORM */}
              <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md text-slate-900 space-y-6 text-sm font-serif max-w-4xl mx-auto leading-relaxed">
                
                {/* Official Garuda Emblem Header */}
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold tracking-widest text-slate-900 mb-1">
                    ตราครุฑ
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    แบบคำร้องขอดูหรือขอสำเนาข้อมูลภาพจากกล้องวงจรปิด (CCTV)
                  </h2>
                  <h3 className="text-base font-extrabold text-blue-900">
                    เทศบาลเมืองชัยภูมิ อำเภอเมืองชัยภูมิ จังหวัดชัยภูมิ
                  </h3>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div>เขียนที่: เทศบาลเมืองชัยภูมิ</div>
                  <div>วันที่ <span className="underline font-bold px-2">{new Date().getDate()}</span> เดือน <span className="underline font-bold px-2">สิงหาคม</span> พ.ศ. <span className="underline font-bold px-2">2569</span></div>
                </div>

                {/* Salutation */}
                <div className="text-sm font-bold pt-2">
                  เรียน นายกเทศมนตรีเมืองชัยภูมิ
                </div>

                {/* Applicant Bio Block */}
                <div className="text-xs space-y-2 text-justify">
                  <p>
                    ข้าพเจ้า <span className="font-bold underline px-2">{applicantName}</span> 
                    หมายเลขบัตรประจำตัวประชาชน <span className="font-bold font-mono underline px-2">{idCardNumber}</span> 
                    อายุ <span className="font-bold underline px-2">{age}</span> ปี อาชีพ <span className="font-bold underline px-2">{occupation}</span>
                  </p>
                  <p>
                    อยู่บ้านเลขที่ <span className="font-bold underline px-2">{address}</span>
                    เบอร์โทรศัพท์ติดต่อ <span className="font-bold font-mono underline px-2">{phone}</span>
                  </p>
                  <p className="pt-2">
                    มีความประสงค์ขอดูภาพ / ขอบันทึกสำเนาภาพจากกล้องวงจรปิด (CCTV) ของเทศบาลเมืองชัยภูมิ บริเวณ:
                    <br />
                    <span className="font-bold underline px-4 block py-1 bg-slate-50 rounded border border-slate-200 mt-1">
                      {locationRequested}
                    </span>
                  </p>
                  <p>
                    ประจำวันที่ <span className="font-bold underline px-2">{dateRequested}</span> 
                    ช่วงเวลาตั้งแต่ <span className="font-bold underline px-2">{timeRangeRequested}</span>
                  </p>
                  <p>
                    เนื่องจาก: <span className="font-bold underline px-2">{requestPurpose}</span>
                  </p>
                </div>

                {/* Results & Document Attachments Checklist */}
                <div className="border-t border-b border-slate-300 py-3 text-xs space-y-2">
                  <div className="font-bold text-slate-900">เอกสารแนบประกอบคำร้อง:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={attachPoliceReport} onChange={e => setAttachPoliceReport(e.target.checked)} className="rounded" />
                      <span>สำเนาบันทึกประจำวัน / ใบแจ้งความ จากสถานีตำรวจ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={attachIdCopy} onChange={e => setAttachIdCopy(e.target.checked)} className="rounded" />
                      <span>สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสิทธิ์</span>
                    </label>
                  </div>
                </div>

                {/* Signature Applicant */}
                <div className="pt-4 flex justify-end text-xs text-center">
                  <div className="space-y-2 w-64">
                    <div>ลงชื่อ...................................................................ผู้ยื่นคำร้อง</div>
                    <div className="font-bold">({applicantName})</div>
                  </div>
                </div>

                {/* HIERARCHICAL APPROVAL CHAIN (5 SIGNATURE BOXES) */}
                <div className="pt-6 border-t-2 border-slate-800 space-y-4">
                  <h4 className="font-bold text-xs text-slate-900 text-center uppercase tracking-wider">
                    ความเห็นและการพิจารณาตามลำดับการบังคับบัญชา
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                    
                    {/* Step 1: นักจัดการงานเทศกิจปฏิบัติการ */}
                    <div className="p-3 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                        1. ความเห็นของเจ้าหน้าที่ตรวจสอบ (เทศกิจ)
                      </div>
                      <div className="space-y-1">
                        <div>[ ✓ ] ได้ทำการตรวจสอบกล้องวงจรปิดเรียบร้อยแล้ว</div>
                        <div>[ ✓ ] พบภาพเหตุการณ์ / [  ] ไม่พบภาพเหตุการณ์</div>
                      </div>
                      <div className="pt-3 text-center space-y-1">
                        <div>ลงชื่อ............................................................</div>
                        <div className="font-bold text-slate-900">( ว่าที่ ร.ต. ธนกฤต ถือสมบัติ )</div>
                        <div className="text-slate-600">นักจัดการงานเทศกิจปฏิบัติการ</div>
                      </div>
                    </div>

                    {/* Step 2: หัวหน้าฝ่ายปกครอง */}
                    <div className="p-3 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                        2. ความเห็นของหัวหน้าฝ่ายปกครอง
                      </div>
                      <div className="space-y-1">
                        <div>เห็นควรเสนออนุญาตให้เปิดตรวจดูข้อมูลภาพได้</div>
                      </div>
                      <div className="pt-6 text-center space-y-1">
                        <div>ลงชื่อ............................................................</div>
                        <div className="font-bold text-slate-900">( จ.ส.ท. อนุรัตน์ ไพศาลพันธุ์ )</div>
                        <div className="text-slate-600">หัวหน้าฝ่ายปกครอง</div>
                      </div>
                    </div>

                    {/* Step 3: รักษาราชการแทนหัวหน้าสำนักปลัดเทศบาล */}
                    <div className="p-3 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                        3. ความเห็นหัวหน้าสำนักปลัดเทศบาล
                      </div>
                      <div className="space-y-1">
                        <div>เห็นควรเสนอปลัดเทศบาลเพื่อพิจารณาอนุมัติ</div>
                      </div>
                      <div className="pt-6 text-center space-y-1">
                        <div>ลงชื่อ............................................................</div>
                        <div className="font-bold text-slate-900">( จ.ส.ท. อนุรัตน์ ไพศาลพันธุ์ )</div>
                        <div className="text-slate-600">รักษาราชการแทนหัวหน้าสำนักปลัดเทศบาล</div>
                      </div>
                    </div>

                    {/* Step 4: ปลัดเทศบาลเมืองชัยภูมิ */}
                    <div className="p-3 border border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                        4. ความเห็นของปลัดเทศบาล
                      </div>
                      <div className="space-y-1">
                        <div>เรียน นายกเทศมนตรีเมืองชัยภูมิ เพื่อโปรดพิจารณา</div>
                      </div>
                      <div className="pt-6 text-center space-y-1">
                        <div>ลงชื่อ............................................................</div>
                        <div className="font-bold text-slate-900">( ส.ต.ท. ทรงวุฒิ ศรีลุนช่าง )</div>
                        <div className="text-slate-600">ปลัดเทศบาลเมืองชัยภูมิ</div>
                      </div>
                    </div>

                  </div>

                  {/* Step 5: คำสั่งนายกเทศมนตรีเมืองชัยภูมิ (Final Decision) */}
                  <div className="p-4 border-2 border-blue-900 rounded-xl space-y-3 bg-blue-50/40 text-[11px]">
                    <div className="font-bold text-blue-950 border-b border-blue-200 pb-1 text-xs">
                      5. คำสั่งนายกเทศมนตรีเมืองชัยภูมิ
                    </div>
                    <div className="flex items-center gap-6 font-bold text-slate-900">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mayor_decision" defaultChecked className="text-blue-600" />
                        <span>[ ✓ ] อนุญาต</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="mayor_decision" className="text-blue-600" />
                        <span>[  ] ไม่อนุญาต</span>
                      </label>
                    </div>
                    <div className="pt-4 text-center space-y-1">
                      <div>ลงชื่อ...........................................................................................</div>
                      <div className="font-bold text-slate-900 text-xs">( นายบรรยงค์ เกียรติก้องชูชัย )</div>
                      <div className="font-bold text-blue-900">นายกเทศมนตรีเมืองชัยภูมิ</div>
                    </div>
                  </div>

                  {/* PDPA Warning Notice */}
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>คำเตือนทางกฎหมายและข้อปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA):</span>
                    </div>
                    <div>
                      ห้ามนำข้อมูลภาพกล้องวงจรปิด CCTV ไปเผยแพร่ในอินเทอร์เน็ต โซเชียลมีเดีย หรือเพื่อการอื่นนอกเหนือวัตถุประสงค์ที่ได้รับอนุญาต ผู้ฝ่าฝืนต้องรับผิดชอบทั้งทางแพ่งและทางอาญาตามกฎหมายทุกประการ
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 4: QUICK CAMERA STATUS UPDATER */}
          {activeTab === 'status_update' && (
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      อัปเดตสถานะกล้องวงจรปิดเรียลไทม์ (Live Camera Status Management)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เลือกจุดติดตั้งเพื่อปรับเปลี่ยนสถานะ (ออนไลน์ / ชำรุด / อยู่ระหว่างซ่อม) ระบบจะบันทึกข้อมูลทันที
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
                    ทั้งหมด {totalCameras} จุด
                  </span>
                </div>

                {updateSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{updateSuccess}</span>
                  </div>
                )}

                {/* Edit Form Modal Overlay */}
                {editingCameraId && (
                  <form onSubmit={handleQuickStatusSave} className="bg-slate-900 text-white p-4 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-blue-400 font-mono">
                        แก้ไขสถานะกล้อง ID: {editingCameraId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingCameraId(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">เลือกสถานะใหม่ *</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as CctvStatus)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="online">🟢 ออนไลน์ / ปกติ (Online)</option>
                          <option value="faulty">🔴 ชำรุด / ขัดข้อง (Faulty)</option>
                          <option value="maintenance">🟡 อยู่ระหว่างซ่อม (Maintenance)</option>
                          <option value="offline">⚪ ออฟไลน์ (Offline)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">หมายเหตุ / บันทึกการซ่อม</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="ระบุสาเหตุหรือความคืบหน้า..."
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingCameraId(null)}
                        className="px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded-lg font-semibold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded-lg shadow"
                      >
                        บันทึกเปลี่ยนสถานะ
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Cameras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cameras.map((cam) => (
                    <div key={cam.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                            {cam.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cam.status === 'online' ? 'bg-emerald-100 text-emerald-800' :
                            cam.status === 'faulty' ? 'bg-rose-100 text-rose-800' :
                            cam.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {cam.status === 'online' ? '🟢 ใช้งานได้' :
                             cam.status === 'faulty' ? '🔴 ชำรุด' :
                             cam.status === 'maintenance' ? '🟡 ซ่อมแซม' : '⚪ ออฟไลน์'}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{cam.name}</p>
                        <p className="text-[11px] text-slate-500">📍 {cam.zone} | IP: <span className="font-mono">{cam.ipAddress}</span></p>
                        {cam.notes && (
                          <p className="text-[10px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                            💬 {cam.notes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setEditingCameraId(cam.id);
                          setEditStatus(cam.status);
                          setEditNotes(cam.notes || '');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 transition-colors"
                      >
                        เปลี่ยนสถานะ
                      </button>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
