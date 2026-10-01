import React, { useState, useEffect, useMemo } from 'react';
import { CctvEquipmentItem } from '../types/cctv';
import { getStoredCctvEquipment } from '../data/cctvData';
import { subscribeToFirestoreCctvEquipment } from '../utils/firestoreService';
import { CctvEquipmentCsvUploadModal } from './CctvEquipmentCsvUploadModal';
import {
  X,
  HardDrive,
  Tv,
  Zap,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Printer,
  ShieldCheck,
  Radio,
  UploadCloud,
  Database
} from 'lucide-react';

interface CctvEquipmentRegisterModalProps {
  onClose: () => void;
}

export const CctvEquipmentRegisterModal: React.FC<CctvEquipmentRegisterModalProps> = ({ onClose }) => {
  const [equipmentList, setEquipmentList] = useState<CctvEquipmentItem[]>(() => getStoredCctvEquipment());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'NVR' | 'TV' | 'UPS' | 'SWITCH'>('all');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isFirestoreSynced, setIsFirestoreSynced] = useState(false);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    try {
      const unsubscribe = subscribeToFirestoreCctvEquipment(
        (items) => {
          if (items && items.length > 0) {
            setEquipmentList(items);
            setIsFirestoreSynced(true);
          }
        },
        () => {
          setIsFirestoreSynced(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setIsFirestoreSynced(false);
    }
  }, []);

  const filteredItems = useMemo(() => {
    return equipmentList.filter((item) => {
      const matchType = typeFilter === 'all' || item.equipmentType === typeFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.communityOrOffice.toLowerCase().includes(q) ||
        item.locationName.toLowerCase().includes(q) ||
        item.assetCode.toLowerCase().includes(q) ||
        (item.systemAssetCode && item.systemAssetCode.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q));

      return matchType && matchSearch;
    });
  }, [equipmentList, searchTerm, typeFilter]);

  const nvrCount = equipmentList.filter((i) => i.equipmentType === 'NVR').length;
  const tvCount = equipmentList.filter((i) => i.equipmentType === 'TV').length;
  const totalCount = equipmentList.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-bold px-3 py-0.5 rounded-full border border-indigo-400/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                เทศบาลเมืองชัยภูมิ (Chaiyaphum Municipality)
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                ทะเบียนสินทรัพย์ครุภัณฑ์
              </span>
              {isFirestoreSynced ? (
                <span className="bg-indigo-900/60 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  Firestore Live Sync
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                  <Database className="w-3 h-3 text-slate-400" />
                  Local Registry
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <HardDrive className="w-6 h-6 text-indigo-400" />
              ทะเบียนอุปกรณ์ส่วนกลาง NVR และจอแสดงผลประจำชุมชน
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              บันทึกรหัสสินทรัพย์ เครื่องบันทึกภาพกล้องวงจรปิด NVR และจอสมาร์ททีวีประจำ 16 ชุมชนและสำนักงานเทศบาล
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats & Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium">อุปกรณ์ทั้งหมด</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{totalCount} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
            </div>
            <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200 shadow-2xs">
              <span className="text-indigo-800 font-medium flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" /> เครื่อง NVR
              </span>
              <div className="text-xl font-black text-indigo-950 mt-0.5">{nvrCount} <span className="text-xs font-normal text-indigo-700">เครื่อง</span></div>
            </div>
            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-blue-800 font-medium flex items-center gap-1">
                <Tv className="w-3.5 h-3.5 text-blue-600" /> จอแสดงผลสมาร์ททีวี
              </span>
              <div className="text-xl font-black text-blue-950 mt-0.5">{tvCount} <span className="text-xs font-normal text-blue-700">เครื่อง</span></div>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-emerald-800 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> ชุมชนที่ติดตั้ง
              </span>
              <div className="text-xl font-black text-emerald-950 mt-0.5">16 <span className="text-xs font-normal text-emerald-700">ชุมชน</span></div>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารหัสสินทรัพย์ (เช่น 455-67-00..), ชื่อเครื่อง, ชุมชน หรือสถานที่ติดตั้ง..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type selector pills */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  typeFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({equipmentList.length})
              </button>
              <button
                onClick={() => setTypeFilter('NVR')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  typeFilter === 'NVR' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3 h-3 text-indigo-600" />
                NVR ({nvrCount})
              </button>
              <button
                onClick={() => setTypeFilter('TV')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  typeFilter === 'TV' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tv className="w-3 h-3 text-blue-600" />
                ทีวี ({tvCount})
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                title="อัปโหลดไฟล์ CSV เพื่ออัปเดตทะเบียนครุภัณฑ์ขึ้นสู่ Cloud Firestore แบบกลุ่ม"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-200" />
                <span>นำเข้า CSV สู่ Firestore</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ทะเบียน</span>
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Table Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                  <th className="p-3 text-center w-12">ลำดับ</th>
                  <th className="p-3 min-w-[200px]">ชื่อครุภัณฑ์/อุปกรณ์</th>
                  <th className="p-3 whitespace-nowrap min-w-[130px]">รหัสสินทรัพย์</th>
                  <th className="p-3 whitespace-nowrap min-w-[140px]">รหัสสินทรัพย์ในระบบ</th>
                  <th className="p-3 min-w-[160px]">ชุมชน/หน่วยงานผู้รับผิดชอบ</th>
                  <th className="p-3 min-w-[150px]">จุดติดตั้ง</th>
                  <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลอุปกรณ์ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isNvr = item.equipmentType === 'NVR';
                    const isOnline = item.status === 'online';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {isNvr ? (
                              <HardDrive className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Tv className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <span>{item.name}</span>
                          </div>
                          {item.model && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              รุ่น: {item.model}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-slate-500">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.assetCode}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                          {item.systemAssetCode ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {item.systemAssetCode}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.communityOrOffice}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {item.locationName}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ใช้งานได้
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ชำรุด
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-500 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-indigo-500" />
            ข้อมูลครุภัณฑ์เชื่อมโยงกับฐานข้อมูลกองช่างและฝ่ายความมั่นคง เทศบาลเมืองชัยภูมิ
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>

      {showCsvModal && (
        <CctvEquipmentCsvUploadModal
          isOpen={showCsvModal}
          onClose={() => setShowCsvModal(false)}
          adminName="เจ้าหน้าที่งานสารบรรณ/Admin"
          onSuccess={(count) => {
            console.log(`Updated ${count} items to Firestore`);
          }}
        />
      )}
    </div>
  );
};
