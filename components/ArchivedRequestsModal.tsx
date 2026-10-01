import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  RefreshCw, 
  RotateCcw, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  X, 
  Filter, 
  Eye, 
  Clock, 
  ShieldCheck, 
  Trash2,
  ExternalLink,
  Layers,
  Database
} from 'lucide-react';
import { 
  ArchivedRequestItem, 
  subscribeToArchivedRequests, 
  restoreArchivedRequest, 
  runAutomated90DayArchival, 
  deletePermanentlyFromArchive,
  getEligibleRequestsForArchival,
  archiveRequestsToFirestore,
  LAST_ARCHIVE_RUN_KEY
} from '../utils/archiveService';
import { RequestItem } from '../types/request';
import { getStoredRequests } from '../utils/storage';
import { exportRequestsToCsv } from '../utils/csvExport';

interface ArchivedRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewRequestDetail?: (item: RequestItem) => void;
}

export function ArchivedRequestsModal({
  isOpen,
  onClose,
  onViewRequestDetail
}: ArchivedRequestsModalProps) {
  const [archivedList, setArchivedList] = useState<ArchivedRequestItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isArchivingNow, setIsArchivingNow] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<ArchivedRequestItem | null>(null);
  const [pendingEligibleCount, setPendingEligibleCount] = useState<number>(0);
  const [lastRunDate, setLastRunDate] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    // Subscribe to real-time updates of Firestore archives collection
    const unsubscribe = subscribeToArchivedRequests((items) => {
      setArchivedList(items);
      setIsLoading(false);
    });

    // Check eligible active items > 90 days
    const activeItems = getStoredRequests();
    const eligible = getEligibleRequestsForArchival(activeItems, 90);
    setPendingEligibleCount(eligible.length);

    // Read last run date
    const lastRun = localStorage.getItem(LAST_ARCHIVE_RUN_KEY);
    setLastRunDate(lastRun);

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleRunArchival = async () => {
    setIsArchivingNow(true);
    try {
      const activeItems = getStoredRequests();
      const eligible = getEligibleRequestsForArchival(activeItems, 90);
      
      if (eligible.length === 0) {
        showNotification('ไม่พบคำร้องที่เสร็จสิ้นเกิน 90 วันที่ต้องย้ายในขณะนี้ (ฐานข้อมูลมีความสดใหม่สูงสุด)', 'info');
        setIsArchivingNow(false);
        return;
      }

      const res = await archiveRequestsToFirestore(eligible, 'เจ้าหน้าที่กดสั่งย้ายข้อมูล (Manual Officer Trigger)');
      if (res.success) {
        showNotification(`ย้ายคำร้องที่เกิน 90 วันเข้าสู่คลังจัดเก็บสำเร็จ ${res.archivedCount} รายการ เพื่อเพิ่มประสิทธิภาพระบบ`, 'success');
        setPendingEligibleCount(0);
        setLastRunDate(new Date().toISOString());
      } else {
        showNotification(`ย้ายสำเร็จ ${res.archivedCount} รายการ (พบข้อผิดพลาดบางส่วน: ${res.errors.join(', ')})`, 'error');
      }
    } catch (e: any) {
      showNotification(`เกิดข้อผิดพลาดในการย้ายข้อมูล: ${e?.message || 'Unknown'}`, 'error');
    } finally {
      setIsArchivingNow(false);
    }
  };

  const handleRestore = async (archiveId: string) => {
    try {
      const res = await restoreArchivedRequest(archiveId, 'เจ้าหน้าที่กู้คืนข้อมูล');
      if (res.success) {
        showNotification(`เรียกคืนคำร้องรหัส ${archiveId} กลับสู่ระบบหลักสำเร็จ`, 'success');
        if (selectedArchiveItem?.id === archiveId) {
          setSelectedArchiveItem(null);
        }
      } else {
        showNotification(`ไม่สามารถเรียกคืนคำร้องได้: ${res.error}`, 'error');
      }
    } catch (e: any) {
      showNotification(`เกิดข้อผิดพลาด: ${e?.message}`, 'error');
    }
  };

  const handleDeletePermanently = async (archiveId: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำร้องรหัส ${archiveId} ออกจากคลังถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    try {
      const res = await deletePermanentlyFromArchive(archiveId);
      if (res.success) {
        showNotification(`ลบรายการคำร้อง ${archiveId} จากคลังเอกสารถาวรแล้ว`, 'info');
        if (selectedArchiveItem?.id === archiveId) {
          setSelectedArchiveItem(null);
        }
      } else {
        showNotification(`ลบไม่สำเร็จ: ${res.error}`, 'error');
      }
    } catch (e: any) {
      showNotification(`เกิดข้อผิดพลาดในการลบ: ${e?.message}`, 'error');
    }
  };

  const handleExportCsv = () => {
    if (archivedList.length === 0) {
      showNotification('ไม่มีรายการในคลังสำหรับส่งออก', 'info');
      return;
    }
    exportRequestsToCsv(archivedList, `cctv_archived_requests_${new Date().toISOString().split('T')[0]}`);
    showNotification(`ส่งออกไฟล์ข้อมูลคลังคำร้อง ${archivedList.length} รายการ เรียบร้อยแล้ว`, 'success');
  };

  const filteredItems = archivedList.filter((item) => {
    const matchesSearch = 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">คลังจัดเก็บคำร้องเก่า (Firestore Archives Collection)</h2>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-300" /> นโยบาย 90 วัน
                </span>
              </div>
              <p className="text-xs text-slate-300">
                ระบบแยกจัดเก็บคำร้องที่ดำเนินการเสร็จสิ้นเกิน 90 วัน เพื่อรักษาความเร็วและประสิทธิภาพของฐานข้อมูลหลัก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between shrink-0 border-b ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : actionFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {actionFeedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {actionFeedback.type === 'info' && <Layers className="w-4 h-4 text-blue-600" />}
              <span>{actionFeedback.message}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metric & Trigger Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">คำร้องในคลังจัดเก็บเก่า</p>
              <p className="text-xl font-bold text-slate-900">{archivedList.length} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">พบคำร้องที่ครบ 90 วัน</p>
              <p className="text-xl font-bold text-amber-600">{pendingEligibleCount} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">สถานะคลังข้อมูล Firestore</p>
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                <Database className="w-3.5 h-3.5" /> /archives คอลเลกชัน
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-1.5">
            <button
              onClick={handleRunArchival}
              disabled={isArchivingNow}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                pendingEligibleCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white cursor-pointer animate-pulse'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isArchivingNow ? 'animate-spin' : ''}`} />
              <span>{isArchivingNow ? 'กำลังย้ายข้อมูล...' : 'ตรวจเช็ค & ย้ายเข้าคลังทันที'}</span>
            </button>
            {lastRunDate && (
              <p className="text-[10px] text-slate-400 text-center">
                ย้ายล่าสุด: {new Date(lastRunDate).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัสคำร้อง, ชื่อผู้ขอ, เบอร์โทร, รายละเอียด..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
            >
              <option value="all">ทุกประเภทคำร้อง</option>
              <option value="cctv">ขอดู/ขอภาพ CCTV</option>
              <option value="maintenance">แจ้งซ่อมบำรุงกล้อง</option>
              <option value="general">คำร้องทั่วไป</option>
              <option value="complaint">เรื่องร้องเรียน</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              ส่งออก CSV
            </button>
          </div>
        </div>

        {/* Archived Requests Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">กำลังโหลดรายการคำร้องจาก Firestore Archives...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8">
              <Archive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">ไม่พบข้อมูลในคลังจัดเก็บ</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนคำค้นหาหรือตัวกรอง' 
                  : 'ยังไม่มีคำร้องที่ดำเนินการเสร็จสิ้นเกิน 90 วันถูกย้ายเข้าสู่คลังจัดเก็บ'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">รหัสคำร้อง</th>
                    <th className="py-2.5 px-3">หัวข้อคำร้อง</th>
                    <th className="py-2.5 px-3">ผู้ยื่นคำร้อง</th>
                    <th className="py-2.5 px-3">วันที่ยื่น/เสร็จสิ้น</th>
                    <th className="py-2.5 px-3">วันที่ย้ายเข้าคลัง</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                        {item.id}
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <div className="font-semibold text-slate-900 truncate" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.reason}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{item.requesterName || 'ไม่ระบุชื่อ'}</div>
                        <div className="text-[11px] text-slate-500">{item.phone || '-'}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        <div>ยื่น: {new Date(item.createdAt).toLocaleDateString('th-TH')}</div>
                        {item.updatedAt && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            เสร็จสิ้น: {new Date(item.updatedAt).toLocaleDateString('th-TH')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-700">
                          <Archive className="w-3 h-3" />
                          {item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('th-TH') : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.archivedBy || 'ระบบอัตโนมัติ'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedArchiveItem(item)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="ดูรายละเอียดฉบับสมบูรณ์"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRestore(item.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                            title="เรียกคืนคำร้องกลับสู่ฐานข้อมูลหลัก"
                          >
                            <RotateCcw className="w-3 h-3" />
                            เรียกคืน
                          </button>
                          <button
                            onClick={() => handleDeletePermanently(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="ลบออกจากคลังถาวร"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal Overlay for a specific archived item */}
        {selectedArchiveItem && (
          <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm">รายละเอียดคำร้องในคลังจัดเก็บ: {selectedArchiveItem.id}</h3>
                </div>
                <button onClick={() => setSelectedArchiveItem(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">นโยบายการจัดเก็บข้อมูล</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedArchiveItem.archiveReason}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ย้ายเข้าคลังเมื่อ: {selectedArchiveItem.archivedAt ? new Date(selectedArchiveItem.archivedAt).toLocaleString('th-TH') : '-'} โดย {selectedArchiveItem.archivedBy || 'ระบบอัตโนมัติ'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">ชื่อผู้ยื่นคำร้อง</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedArchiveItem.requesterName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">เบอร์โทรศัพท์</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedArchiveItem.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">อีเมล</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedArchiveItem.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">เลขประจำตัวประชาชน</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedArchiveItem.citizenId || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500">หัวข้อคำร้อง</label>
                  <p className="font-bold text-slate-900 mt-0.5 text-sm">{selectedArchiveItem.title}</p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500">รายละเอียดและเหตุผล</label>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-0.5 leading-relaxed whitespace-pre-wrap">
                    {selectedArchiveItem.reason}
                  </p>
                </div>

                {selectedArchiveItem.internalNotes && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">บันทึกข้อความภายในของเจ้าหน้าที่</label>
                    <p className="text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-200/60 mt-0.5 leading-relaxed whitespace-pre-wrap">
                      {selectedArchiveItem.internalNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedArchiveItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ปิด
                </button>
                <div className="flex items-center gap-2">
                  {onViewRequestDetail && (
                    <button
                      onClick={() => {
                        onViewRequestDetail(selectedArchiveItem);
                        setSelectedArchiveItem(null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      เปิดหน้าตรวจคำร้องเต็ม
                    </button>
                  )}
                  <button
                    onClick={() => handleRestore(selectedArchiveItem.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    เรียกคืนคำร้องกลับสู่ระบบหลัก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>ระบบตรวจสอบอัตโนมัติทุก 6 ชั่วโมง เพื่อลดขนาดภาระการประมวลผลของคอลเลกชันหลัก</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
