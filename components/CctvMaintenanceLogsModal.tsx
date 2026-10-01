import React, { useMemo } from 'react';
import { CctvCamera } from '../types/cctv';
import { X, ClipboardList, Clock, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { getStoredRequests } from '../utils/storage';

interface CctvMaintenanceLogsModalProps {
  camera: CctvCamera;
  onClose: () => void;
  onViewRequest?: (trackId: string) => void;
}

export const CctvMaintenanceLogsModal: React.FC<CctvMaintenanceLogsModalProps> = ({ camera, onClose, onViewRequest }) => {
  const parseLogs = (notes: string = '') => {
    if (!notes) return [];
    
    const lines = notes.split('\n');
    return lines.map((line, idx) => {
      const match = line.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) {
        return {
          id: idx,
          date: match[1],
          content: match[2],
        };
      }
      return {
        id: idx,
        date: 'ไม่ระบุวันที่',
        content: line,
      };
    }).reverse();
  };

  const logs = parseLogs(camera.notes);

  const matchingRequests = useMemo(() => {
    const allRequests = getStoredRequests();
    return allRequests.filter(req => 
      req.category === 'maintenance' && 
      (req.title.includes(camera.id) || req.reason.includes(camera.id) || req.details?.equipmentType?.includes(camera.id) || req.details?.location?.includes(camera.id))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [camera.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'action_required': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted': return 'ยื่นคำร้องแล้ว';
      case 'under_review': return 'อยู่ระหว่างตรวจสอบ';
      case 'action_required': return 'ต้องการข้อมูลเพิ่มเติม';
      case 'approved': return 'อนุมัติแล้ว / รับเรื่องแล้ว';
      case 'rejected': return 'ไม่อนุมัติ / สั่งตก';
      case 'completed': return 'ดำเนินการเสร็จสิ้น';
      default: return 'ไม่ทราบสถานะ';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">บันทึกประวัติการบำรุงรักษา (Audit Logs)</h3>
              <p className="text-sm text-slate-500">รหัสกล้อง: {camera.id} - {camera.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Related Maintenance Requests */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              คำร้องแจ้งซ่อมที่เกี่ยวข้อง ({matchingRequests.length})
            </h4>
            
            {matchingRequests.length > 0 ? (
              <div className="space-y-3">
                {matchingRequests.map(req => (
                  <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{req.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusColor(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                        <h5 className="text-sm font-semibold text-slate-900">{req.title}</h5>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">{new Date(req.createdAt).toLocaleDateString('th-TH')}</div>
                        {onViewRequest && (
                          <button 
                            onClick={() => {
                              onViewRequest(req.id);
                              onClose();
                            }}
                            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 inline-flex"
                          >
                            ดูคำร้อง <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{req.reason}</p>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="font-semibold text-slate-700">ผู้แจ้ง:</span> {req.applicant.fullName} ({req.applicant.department || '-'})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-sm text-slate-500">
                ไม่พบประวัติการยื่นคำร้องแจ้งซ่อมสำหรับกล้องตัวนี้
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Quick Notes Logs */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              บันทึกหมายเหตุเพิ่มเติม (Quick Notes)
            </h4>
            {logs.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-300 before:to-slate-200">
                {logs.map((log, index) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                          {log.date}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">ไม่มีข้อมูลบันทึก Quick Notes</p>
                <p className="text-xs mt-1">สามารถเพิ่มโน้ตได้ที่หน้าต่างแก้ไขสถานะกล้อง</p>
              </div>
            )}
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
