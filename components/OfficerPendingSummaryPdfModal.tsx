import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { getThaiStatusText } from '../utils/notificationService';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Calendar, 
  Building2, 
  UserCheck, 
  Download,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Check,
  Copy,
  Layers,
  MapPin,
  Phone
} from 'lucide-react';

interface OfficerPendingSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestItem[];
  officerName?: string;
}

export const OfficerPendingSummaryPdfModal: React.FC<OfficerPendingSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  requests,
  officerName = 'เจ้าหน้าที่งานสารบรรณ/ศูนย์ CCTV'
}) => {
  const [filterDate, setFilterDate] = useState<'today' | 'week' | 'month' | 'all_pending'>('all_pending');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high_only' | 'normal'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Display Options
  const [showPhone, setShowPhone] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const formattedToday = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const documentRefCode = `ชย 52003/ว.${Math.floor(1000 + Math.random() * 9000)}`;

  // Filter pending requests (submitted, under_review, action_required)
  const pendingRequests = requests.filter(r => {
    const isPendingStatus = r.status === 'submitted' || r.status === 'under_review' || r.status === 'action_required';
    if (!isPendingStatus) return false;

    // Filter Date Range
    const reqDate = new Date(r.createdAt);
    if (filterDate === 'today') {
      if ((r.createdAt || '').split('T')[0] !== todayStr) return false;
    } else if (filterDate === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (reqDate < sevenDaysAgo) return false;
    } else if (filterDate === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (reqDate < thirtyDaysAgo) return false;
    }

    // Filter Priority
    if (filterPriority === 'high_only') {
      if (r.priority !== 'high' && r.priority !== 'very_urgent' && r.priority !== 'urgent') return false;
    } else if (filterPriority === 'normal') {
      if (r.priority === 'high' || r.priority === 'very_urgent' || r.priority === 'urgent') return false;
    }

    // Filter Category
    if (filterCategory !== 'all') {
      if ((r.category || 'cctv') !== filterCategory) return false;
    }

    return true;
  });

  // Priority Breakdown
  const urgentCount = pendingRequests.filter(r => r.priority === 'high' || r.priority === 'very_urgent' || r.priority === 'urgent').length;
  const normalCount = pendingRequests.length - urgentCount;

  // Category counts
  const categoryCounts = pendingRequests.reduce((acc, curr) => {
    const cat = curr.category || 'cctv';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTable = () => {
    let text = `รายงานสรุปรายการคำร้องคงค้าง CCTV เทศบาลเมืองชัยภูมิ (${formattedToday})\n`;
    text += `ลำดับ | รหัสติดตาม | เรื่อง | ผู้ยื่น | เบอร์โทร | สถานะ\n`;
    pendingRequests.forEach((item, idx) => {
      text += `${idx + 1} | ${item.id} | ${item.title} | ${item.applicant?.fullName || '-'} | ${item.applicant?.phone || '-'} | ${getThaiStatusText(item.status)}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] no-print">
        {/* Modal Header Controls (Hidden during print) */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">
                  พิมพ์รายงานสรุปคำร้องคงค้างรอดำเนินการ (Bulk Pending Summary PDF)
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Official Document
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                จัดทำหนังสือสรุปรายการคำร้องขอดูภาพ CCTV ที่ยังอยู่ระหว่างดำเนินการ เสนอผู้บริหารเทศบาลเมืองชัยภูมิ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyTable}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              title="คัดลอกตารางข้อมูลข้อความ"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกตาราง'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร / บันทึก PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Options Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              ขอบเขตข้อมูล:
            </span>

            {/* Date Range Selector */}
            <div className="inline-flex bg-white p-0.5 rounded-xl border border-slate-300 shadow-2xs">
              {[
                { id: 'today', label: 'เฉพาะวันนี้' },
                { id: 'week', label: '7 วันล่าสุด' },
                { id: 'month', label: '30 วันล่าสุด' },
                { id: 'all_pending', label: 'คงค้างทั้งหมด' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setFilterDate(item.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterDate === item.id 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">ความสำคัญ: ทั้งหมด</option>
              <option value="high_only">เฉพาะเคสด่วน (Urgent)</option>
              <option value="normal">เฉพาะเคสปกติ (Normal)</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">หมวดหมู่: ทั้งหมด</option>
              <option value="cctv">🎥 กล้องวงจรปิด CCTV</option>
              <option value="maintenance">🛠️ แจ้งซ่อมบำรุงกล้อง</option>
            </select>
          </div>

          {/* Toggle Switches for Document Rendering */}
          <div className="flex items-center gap-3 text-slate-600 font-medium text-[11px] flex-wrap">
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(e) => setShowPhone(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>เบอร์โทรศัพท์</span>
            </label>

            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>จุดเกิดเหตุ/กล้อง</span>
            </label>

            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>ช่องลงนามเสนอ</span>
            </label>

            <div className="text-slate-500 font-bold ml-2">
              รวม: <span className="text-blue-700 font-extrabold text-sm">{pendingRequests.length}</span> รายการ
            </div>
          </div>
        </div>

        {/* Printable Document Preview Canvas */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-100/70 print-full-width">
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl border border-slate-200 max-w-4xl mx-auto space-y-6 text-slate-900 document-font print-full-width print:shadow-none print:border-none print:p-0">
            
            {/* Official Municipal Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl border-2 border-amber-400 shrink-0 shadow-sm">
                    🏛️
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-wide text-slate-900 leading-tight">
                      เทศบาลเมืองชัยภูมิ อำเภอเมืองชัยภูมิ จังหวัดชัยภูมิ
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      ศูนย์บริหารจัดการและควบคุมกล้องวงจรปิด (CCTV Control Center) งานสารบรรณกลาง
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs space-y-1 font-mono text-slate-600 border-l border-slate-200 pl-4 shrink-0">
                  <div className="font-bold text-slate-800">เลขที่หนังสือ: {documentRefCode}</div>
                  <div>วันที่: {formattedToday}</div>
                  <div>เวลาพิมพ์: {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <h2 className="text-base font-extrabold text-slate-900 underline underline-offset-4 decoration-amber-500 decoration-2">
                  รายงานสรุปรายการคำร้องขอตรวจสอบและคัดสำเนาภาพกล้องวงจรปิด (CCTV) คงค้างรอดำเนินการ
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  เสนอนายกเทศมนตรีเมืองชัยภูมิ / ผู้อำนวยการกองช่าง เพื่อโปรดทราบและพิจารณา
                </p>
              </div>
            </div>

            {/* Overview Stats Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold">คำร้องทั้งหมดในระบบ</span>
                <span className="text-lg font-black text-slate-800">{requests.length}</span>
                <span className="text-[10px] text-slate-400 block">รายการ</span>
              </div>

              <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200">
                <span className="text-[10px] text-amber-800 block font-bold">คงค้างรอดำเนินการ</span>
                <span className="text-lg font-black text-amber-700">{pendingRequests.length}</span>
                <span className="text-[10px] text-amber-600 block font-medium">รายการ</span>
              </div>

              <div className="p-2 bg-rose-50/80 rounded-lg border border-rose-200">
                <span className="text-[10px] text-rose-800 block font-bold">กรณีด่วนที่สุด / ด่วน</span>
                <span className="text-lg font-black text-rose-700">{urgentCount}</span>
                <span className="text-[10px] text-rose-600 block font-medium">รายการ</span>
              </div>

              <div className="p-2 bg-blue-50/80 rounded-lg border border-blue-200">
                <span className="text-[10px] text-blue-800 block font-bold">เจ้าหน้าที่ผู้รวบรวม</span>
                <span className="text-xs font-bold text-slate-800 truncate block mt-1">{officerName}</span>
                <span className="text-[10px] text-blue-600 block">ศูนย์ CCTV</span>
              </div>
            </div>

            {/* Category Breakdown Pill Tags */}
            {Object.keys(categoryCounts).length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 shrink-0">หมวดหมู่คำร้องคงค้าง:</span>
                {Object.entries(categoryCounts).map(([cat, count]) => (
                  <span key={cat} className="bg-white px-2.5 py-0.5 rounded-md border border-slate-300 font-semibold text-slate-800 shadow-2xs">
                    {cat === 'cctv' ? '🎥 กล้องวงจรปิด (CCTV)' : cat === 'maintenance' ? '🛠️ แจ้งซ่อมบำรุง' : cat}: <strong className="text-blue-700">{count}</strong> รายการ
                  </span>
                ))}
              </div>
            )}

            {/* Table of Pending Requests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-l-4 border-amber-500 pl-2">
                  ตารางสรุปรายละเอียดคำร้องคงค้าง ({pendingRequests.length} รายการ)
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  * ข้อมูล ณ วันที่ {formattedToday}
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-700">ไม่พบรายการคำร้องคงค้างรอดำเนินการในเงื่อนไขที่เลือก</p>
                  <p className="text-[11px] text-slate-400">คำร้องทั้งหมดได้รับการอนุมัติและดำเนินการเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white border-b border-slate-300 font-bold text-[11px]">
                        <th className="p-2 border-r border-slate-700 w-8 text-center">ลำดับ</th>
                        <th className="p-2 border-r border-slate-700 w-28">รหัสติดตาม</th>
                        <th className="p-2 border-r border-slate-700">เรื่อง / วัตถุประสงค์ขอดูภาพ</th>
                        <th className="p-2 border-r border-slate-700 w-36">ผู้ยื่นคำร้อง</th>
                        {showLocation && <th className="p-2 border-r border-slate-700 w-32">สถานที่ / จุดกล้อง</th>}
                        <th className="p-2 border-r border-slate-700 w-24 text-center">วันที่ยื่นคำร้อง</th>
                        <th className="p-2 w-28 text-center">สถานะ / ความเร่งด่วน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {pendingRequests.map((item, index) => {
                        const isUrgent = item.priority === 'high' || item.priority === 'very_urgent' || item.priority === 'urgent';
                        return (
                          <tr key={item.id} className={isUrgent ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/80'}>
                            <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-700">
                              {index + 1}
                            </td>
                            
                            <td className="p-2 border-r border-slate-300 font-mono font-bold text-blue-900">
                              {item.id}
                            </td>

                            <td className="p-2 border-r border-slate-300">
                              <div className="font-semibold text-slate-900">{item.title}</div>
                              {item.reason && (
                                <div className="text-[10px] text-slate-600 line-clamp-2 mt-0.5 italic">
                                  เหตุผล: {item.reason}
                                </div>
                              )}
                            </td>

                            <td className="p-2 border-r border-slate-300">
                              <div className="font-bold text-slate-900">
                                {item.applicant?.prefix}{item.applicant?.fullName}
                              </div>
                              {item.applicant?.department && (
                                <div className="text-[10px] text-slate-500 truncate">
                                  {item.applicant.department}
                                </div>
                              )}
                              {showPhone && item.applicant?.phone && (
                                <div className="text-[10px] text-blue-700 font-mono font-medium flex items-center gap-0.5 mt-0.5">
                                  <Phone className="w-2.5 h-2.5" />
                                  {item.applicant.phone}
                                </div>
                              )}
                            </td>

                            {showLocation && (
                              <td className="p-2 border-r border-slate-300 text-[10px] text-slate-700">
                                {item.location || (item.details?.cameraLocation) || 'เขตเทศบาลเมืองชัยภูมิ'}
                              </td>
                            )}

                            <td className="p-2 border-r border-slate-300 text-center text-[10px] text-slate-700 font-mono">
                              {new Date(item.createdAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit'
                              })}
                            </td>

                            <td className="p-2 text-center">
                              <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full border inline-block ${
                                item.status === 'submitted'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : item.status === 'under_review'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {getThaiStatusText(item.status)}
                              </span>
                              {isUrgent && (
                                <span className="block text-[9px] font-extrabold text-rose-600 mt-0.5">
                                  ⚠️ ด่วนที่สุด
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Officer Sign-off Section */}
            {showSignatures && (
              <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
                <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800">ผู้รวบรวมและจัดทำรายงานสรุป</p>
                  <div className="pt-8">
                    <p>ลงชื่อ..........................................................</p>
                    <p className="font-bold text-slate-800 mt-1">({officerName})</p>
                    <p className="text-[11px] text-slate-500">เจ้าหน้าที่ศูนย์ควบคุมกล้องวงจรปิด CCTV</p>
                    <p className="text-[10px] text-slate-400 mt-1">วันที่..........เดือน........................พ.ศ. 2569</p>
                  </div>
                </div>

                <div className="space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800">ผู้ตรวจรับ / ผู้อำนวยการสั่งการ</p>
                  <div className="pt-8">
                    <p>ลงชื่อ..........................................................</p>
                    <p className="font-bold text-slate-800 mt-1">(นายวิเชียร ชัยภูมิพัฒนา)</p>
                    <p className="text-[11px] text-slate-500">ผู้อำนวยการกองช่าง / หัวหน้าศูนย์ CCTV</p>
                    <p className="text-[10px] text-slate-400 mt-1">วันที่..........เดือน........................พ.ศ. 2569</p>
                  </div>
                </div>
              </div>
            )}

            {/* Official Seal & Footer Notice */}
            <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-3 flex items-center justify-between gap-4">
              <span>ศูนย์บริการข้อมูลกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ โทร. 044-811-300</span>
              <span>เอกสารราชการสำหรับใช้งานภายในเทศบาลเมืองชัยภูมิเท่านั้น</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
