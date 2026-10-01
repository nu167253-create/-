import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Columns, 
  X, 
  Eye, 
  Printer, 
  History, 
  Plus, 
  Calendar, 
  User, 
  Camera, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  Copy,
  Check,
  Star,
  Download,
  Trash2,
  Info
} from 'lucide-react';
import { RequestItem, RequestStatus } from '../types/request';
import { StatusBadge } from './StatusBadge';

interface RequestComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequests: RequestItem[];
  allRequests: RequestItem[];
  onAddRequest: (requestId: string) => void;
  onRemoveRequest: (requestId: string) => void;
  onSelectTrack: (trackingId: string) => void;
  onOpenDetail: (request: RequestItem) => void;
  onPrintRequest: (request: RequestItem) => void;
}

// Progress calculation based on status
function getProgressInfo(status: RequestStatus) {
  switch (status) {
    case 'submitted':
      return { step: 1, max: 5, label: 'ขั้นตอนที่ 1/5: ยื่นเรื่องแล้ว', percent: 20, color: 'bg-blue-500' };
    case 'under_review':
      return { step: 2, max: 5, label: 'ขั้นตอนที่ 2/5: ตรวจสอบคำร้อง', percent: 40, color: 'bg-indigo-500' };
    case 'action_required':
      return { step: 2, max: 5, label: 'ขั้นตอนที่ 2/5: รอข้อมูลเพิ่มเติม', percent: 40, color: 'bg-amber-500' };
    case 'approved':
      return { step: 4, max: 5, label: 'ขั้นตอนที่ 4/5: อนุมัติ/เตรียมไฟล์', percent: 80, color: 'bg-emerald-500' };
    case 'completed':
    case 'closed':
      return { step: 5, max: 5, label: 'ขั้นตอนที่ 5/5: สำเร็จเรียบร้อย', percent: 100, color: 'bg-emerald-600' };
    case 'rejected':
      return { step: 3, max: 5, label: 'ยุติการดำเนินการ (ไม่อนุมัติ)', percent: 50, color: 'bg-rose-500' };
    default:
      return { step: 1, max: 5, label: 'บันทึกฉบับร่าง', percent: 10, color: 'bg-slate-400' };
  }
}

export const RequestComparisonModal: React.FC<RequestComparisonModalProps> = ({
  isOpen,
  onClose,
  selectedRequests,
  allRequests,
  onAddRequest,
  onRemoveRequest,
  onSelectTrack,
  onOpenDetail,
  onPrintRequest
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState<boolean>(false);
  const [focusMode, setFocusMode] = useState<'all' | 'status_only'>('all');

  if (!isOpen) return null;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySummary = () => {
    const summaryText = selectedRequests.map((r, idx) => {
      const progress = getProgressInfo(r.status);
      return `${idx + 1}. [${r.id}] ${r.title}\n` +
        `   สถานะ: ${r.status} (${progress.label})\n` +
        `   วันที่ยื่น: ${new Date(r.createdAt).toLocaleDateString('th-TH')}\n` +
        `   ผู้รับผิดชอบ: ${r.assignedOfficer || 'ยังไม่ระบุ'}\n` +
        `   อัปเดตล่าสุด: ${new Date(r.updatedAt || r.createdAt).toLocaleDateString('th-TH')}`;
    }).join('\n\n');

    navigator.clipboard.writeText(`สรุปการเปรียบเทียบคำร้อง (${selectedRequests.length} รายการ):\n\n${summaryText}`);
    alert('คัดลอกสรุปการเปรียบเทียบคำร้องลงในคลิปบอร์ดแล้ว');
  };

  // Requests that can still be added
  const availableToAdd = allRequests.filter(
    (req) => !selectedRequests.some((sel) => sel.id === req.id)
  );

  return (
    <div 
      id="request-comparison-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <motion.div
        id="request-comparison-modal-container"
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ตารางเปรียบเทียบสถานะคำร้อง (Side-by-Side Comparison)
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {selectedRequests.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ติดตามความคืบหน้า ตรวจสอบสถานะ และเปรียบเทียบข้อมูลคำร้องหลายฉบับพร้อมกันแบบคู่ขนาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Filter */}
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex text-xs">
              <button
                type="button"
                onClick={() => setFocusMode('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  focusMode === 'all' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ข้อมูลครบถ้วน
              </button>
              <button
                type="button"
                onClick={() => setFocusMode('status_only')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  focusMode === 'status_only' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                เน้นสถานะ & ขั้นตอน
              </button>
            </div>

            {/* Copy Summary Button */}
            {selectedRequests.length > 0 && (
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="คัดลอกสรุปผลการเปรียบเทียบไปยังคลิปบอร์ด"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">คัดลอกสรุป</span>
              </button>
            )}

            {/* Add Request Dropdown */}
            {availableToAdd.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มคำร้อง
                </button>

                {showAddDropdown && (
                  <div className="absolute right-0 mt-2 w-72 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 text-slate-800 z-50 p-2 space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      เลือกคำร้องที่ต้องการนำมาเปรียบเทียบ
                    </div>
                    {availableToAdd.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onAddRequest(item.id);
                          setShowAddDropdown(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono font-bold text-blue-600">{item.id}</span>
                          <p className="text-slate-700 text-[11px] truncate">{item.title}</p>
                        </div>
                        <StatusBadge status={item.status} size="xs" showIcon={false} showDot={false} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Comparison Matrix */}
        <div className="overflow-auto flex-1 p-4 sm:p-6 bg-slate-50/50">
          {selectedRequests.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <Columns className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">ยังไม่ได้เลือกคำร้องเพื่อเปรียบเทียบ</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                กรุณาเลือกคำร้องจากปุ่ม "เพิ่มคำร้อง" ด้านบน หรือติ๊กเลือกที่หน้ารายการคำร้องเพื่อดูการเปรียบเทียบสถานะแบบคู่ขนาน
              </p>
              {availableToAdd.length > 0 && (
                <div className="mt-4 flex justify-center gap-2 flex-wrap">
                  {availableToAdd.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onAddRequest(item.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {item.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      {/* Fixed Attribute Label Header */}
                      <th className="p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-48 sm:w-56 sticky left-0 bg-slate-100/95 backdrop-blur-xs z-10 border-r border-slate-200">
                        หัวข้อการเปรียบเทียบ
                      </th>

                      {/* Request Header Columns */}
                      {selectedRequests.map((req) => (
                        <th 
                          key={req.id} 
                          className="p-3 sm:p-4 text-xs font-semibold text-slate-800 min-w-[240px] max-w-[300px] border-r border-slate-200 last:border-r-0 align-top"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                                  {req.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(req.id)}
                                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                                  title="คัดลอกรหัสติดตาม"
                                >
                                  {copiedId === req.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs line-clamp-2 mt-1">
                                {req.title}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => onRemoveRequest(req.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                              title="นำออกจากการเปรียบเทียบ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    {/* Row: สถานะปัจจุบัน (Current Status) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          สถานะปัจจุบัน
                        </div>
                      </td>
                      {selectedRequests.map((req) => (
                        <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                          <StatusBadge status={req.status} size="sm" showIcon showDot showEnLabel />
                        </td>
                      ))}
                    </tr>

                    {/* Row: ความคืบหน้าขั้นตอน (Step Progress Milestone) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-slate-50/30">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          ความคืบหน้าขั้นตอน
                        </div>
                      </td>
                      {selectedRequests.map((req) => {
                        const progress = getProgressInfo(req.status);
                        return (
                          <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-800">{progress.label}</span>
                                <span className="font-bold text-slate-600">{progress.percent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${progress.color} transition-all duration-500`} 
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {req.statusHistory && req.statusHistory.length > 0 ? (
                                  <span>อัปเดตโดย: {req.statusHistory[0].actor || 'ระบบ'}</span>
                                ) : (
                                  <span>รอการตรวจสอบ</span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row: วันที่ยื่นคำร้อง (Submission Date) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          วันที่ยื่นเรื่อง
                        </div>
                      </td>
                      {selectedRequests.map((req) => (
                        <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                          <div className="font-medium text-slate-900">
                            {new Date(req.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            เวลา {new Date(req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Row: อัปเดตล่าสุด (Last Updated) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-slate-50/30">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-purple-600" />
                          อัปเดตล่าสุด
                        </div>
                      </td>
                      {selectedRequests.map((req) => (
                        <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                          <div className="font-medium text-slate-900">
                            {new Date(req.updatedAt || req.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(req.updatedAt || req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Row: เจ้าหน้าที่ผู้รับผิดชอบ (Assigned Officer) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-600" />
                          เจ้าหน้าที่ผู้รับผิดชอบ
                        </div>
                      </td>
                      {selectedRequests.map((req) => (
                        <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                          {req.assignedOfficer ? (
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded text-xs inline-block">
                              {req.assignedOfficer}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">อยู่ระหว่างจัดสรรเจ้าหน้าที่</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Row: หมวดหมู่ & รายละเอียดกล้อง CCTV (Category & Cameras) */}
                    {focusMode === 'all' && (
                      <tr className="hover:bg-blue-50/30 transition-colors bg-slate-50/30">
                        <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-sky-600" />
                            ข้อมูลกล้อง CCTV & เหตุการณ์
                          </div>
                        </td>
                        {selectedRequests.map((req) => {
                          const cctvCount = req.details?.cctvCount || req.details?.cameraCount || 1;
                          const locations = req.details?.cameraLocations || req.details?.location || req.location || '-';
                          const incidentDate = req.details?.incidentDate || '-';
                          const timeRange = req.details?.incidentTimeStart && req.details?.incidentTimeEnd 
                            ? `${req.details.incidentTimeStart} - ${req.details.incidentTimeEnd}`
                            : '-';

                          return (
                            <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0 space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500 font-medium">จำนวนกล้อง:</span>
                                <strong className="text-slate-900">{cctvCount} ตัว</strong>
                              </div>
                              <div className="text-[11px] text-slate-600 line-clamp-2">
                                <span className="text-slate-400">จุดติดตั้ง:</span> {locations}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                <span className="text-slate-400">วัน/เวลาเหตุการณ์:</span> {incidentDate} ({timeRange})
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Row: บันทึก/ข้อความจากเจ้าหน้าที่ (Officer Notes) */}
                    <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          บันทึกจากเจ้าหน้าที่
                        </div>
                      </td>
                      {selectedRequests.map((req) => {
                        const note = req.officerNotes || 
                          (req.statusHistory && req.statusHistory[0]?.note) || 
                          null;
                        return (
                          <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                            {note ? (
                              <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-2 rounded-lg text-xs">
                                {note}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ไม่มีบันทึกข้อความเพิ่มเติม</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Row: ข้อมูลการนัดหมาย (Appointment) */}
                    {focusMode === 'all' && (
                      <tr className="hover:bg-blue-50/30 transition-colors bg-slate-50/30">
                        <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            การนัดหมาย
                          </div>
                        </td>
                        {selectedRequests.map((req) => (
                          <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                            {req.appointment ? (
                              <div className="bg-teal-50 border border-teal-200 text-teal-900 p-2 rounded-lg text-xs space-y-0.5">
                                <div className="font-bold">
                                  {req.appointment.date} เวลา {req.appointment.time} น.
                                </div>
                                <div className="text-[11px] text-teal-700 truncate">
                                  สถานที่: {req.appointment.location}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ยังไม่มีกำหนดการนัดหมาย</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Row: การประเมินความพึงพอใจ (Service Feedback) */}
                    {focusMode === 'all' && (
                      <tr className="hover:bg-blue-50/30 transition-colors bg-white">
                        <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            ความพึงพอใจ
                          </div>
                        </td>
                        {selectedRequests.map((req) => (
                          <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                            {req.feedback ? (
                              <div className="flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded w-fit border border-amber-200">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{req.feedback.rating} ดาว</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ยังไม่ได้รับการประเมิน</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Row: ปุ่มการทำงานด่วน (Quick Actions) */}
                    <tr className="bg-slate-50/80">
                      <td className="p-3 sm:p-4 font-bold text-slate-700 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                        การดำเนินการ
                      </td>
                      {selectedRequests.map((req) => (
                        <td key={req.id} className="p-3 sm:p-4 border-r border-slate-200 last:border-r-0">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTrack(req.id);
                                onClose();
                              }}
                              className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              ติดตามสถานะ
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenDetail(req)}
                                className="flex-1 inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] py-1 px-2 rounded-lg transition-colors cursor-pointer"
                                title="ดูประวัติการดำเนินการอย่างละเอียด"
                              >
                                <History className="w-3 h-3 text-purple-600" />
                                ประวัติ
                              </button>

                              <button
                                type="button"
                                onClick={() => onPrintRequest(req)}
                                className="flex-1 inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] py-1 px-2 rounded-lg transition-colors cursor-pointer"
                                title="พิมพ์ใบคำร้อง"
                              >
                                <Printer className="w-3 h-3 text-slate-600" />
                                พิมพ์
                              </button>
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              ตารางนี้อัปเดตแบบเรียลไทม์ตามสถานะล่าสุดในระบบ ท่านสามารถคลิก "ติดตามสถานะ" เพื่อดูรายละเอียดเชิงลึกของแต่ละคำร้องได้
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedRequests.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  selectedRequests.forEach(r => onRemoveRequest(r.id));
                }}
                className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                ล้างการเลือกทั้งหมด
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
