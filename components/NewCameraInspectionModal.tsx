import React, { useState } from 'react';
import { CameraInspectionItem } from '../types/adminFolders';
import { INITIAL_CCTV_CAMERAS } from '../data/cctvData';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Upload, Camera, Save, Star } from 'lucide-react';

interface NewCameraInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: Omit<CameraInspectionItem, 'id'>) => void;
  adminName: string;
}

export const NewCameraInspectionModal: React.FC<NewCameraInspectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  adminName
}) => {
  const [selectedCameraId, setSelectedCameraId] = useState(INITIAL_CCTV_CAMERAS[0]?.id || 'IPCamera 01');
  const [reportNo, setReportNo] = useState(`PM-${new Date().toISOString().slice(0, 7)}-${String(Math.floor(Math.random() * 900) + 100)}`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [inspectorName, setInspectorName] = useState(adminName || 'นายสมศักดิ์ วงศ์สวรรค์');
  const [inspectorPosition, setInspectorPosition] = useState('นายช่างไฟฟ้าชำนาญงาน');
  const [inspectorTeam, setInspectorTeam] = useState('ชุดปฏิบัติการบำรุงรักษา CCTV ชุดที่ 1');
  
  // Checklist states
  const [lensCleaning, setLensCleaning] = useState(true);
  const [lensClarityRating, setLensClarityRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [housingCondition, setHousingCondition] = useState<'good' | 'loose' | 'damaged' | 'corroded'>('good');
  const [waterproofSeal, setWaterproofSeal] = useState(true);
  const [powerSupplyVoltage, setPowerSupplyVoltage] = useState('PoE+ 48.2V');
  const [upsBackupStatus, setUpsBackupStatus] = useState<'normal' | 'battery_low' | 'replace_battery' | 'no_ups'>('normal');
  const [networkPingMs, setNetworkPingMs] = useState(5);
  const [nvrRecordingStatus, setNvrRecordingStatus] = useState<'recording' | 'storage_warning' | 'frame_drop' | 'error'>('recording');
  const [irNightVision, setIrNightVision] = useState<'working' | 'weak' | 'failed' | 'not_applicable'>('working');
  
  // Notes & Photos
  const [beforeCleaningNotes, setBeforeCleaningNotes] = useState('มีคราบฝุ่นละออง PM2.5 และหยดน้ำฝนเกาะหน้าเลนส์');
  const [afterCleaningNotes, setAfterCleaningNotes] = useState('เช็ดทำความสะอาดด้วยน้ำยาออปติกและผ้าไมโครไฟเบอร์ ภาพคมชัดปกติ');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  
  // Overall result
  const [overallResult, setOverallResult] = useState<'pass' | 'needs_attention' | 'critical_defect'>('pass');
  const [actionTaken, setActionTaken] = useState('ทำความสะอาดหน้าเลนส์และฝาครอบ ตรวจสอบสายสัญญาณและขายึด');
  const [recommendedAction, setRecommendedAction] = useState('ตรวจเช็คตามรอบปกติใน 30 วัน');

  if (!isOpen) return null;

  const currentCam = INITIAL_CCTV_CAMERAS.find(c => c.id === selectedCameraId) || INITIAL_CCTV_CAMERAS[0];

  const handleCameraChange = (camId: string) => {
    setSelectedCameraId(camId);
    const cam = INITIAL_CCTV_CAMERAS.find(c => c.id === camId);
    if (cam) {
      if (cam.status === 'offline' || cam.status === 'faulty') {
        setOverallResult('critical_defect');
        setNvrRecordingStatus('error');
        setNetworkPingMs(999);
      } else {
        setOverallResult('pass');
        setNvrRecordingStatus('recording');
        setNetworkPingMs(5);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (type === 'before') setBeforePhotoUrl(reader.result);
          else setAfterPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      reportNo,
      date,
      time,
      cameraId: selectedCameraId,
      cameraName: currentCam?.name || selectedCameraId,
      zone: currentCam?.zone || 'เขตเทศบาลเมืองชัยภูมิ',
      building: currentCam?.building || 'เขตเทศบาลเมืองชัยภูมิ',
      inspectorName,
      inspectorPosition,
      inspectorTeam,
      lensCleaning,
      lensClarityRating,
      housingCondition,
      waterproofSeal,
      powerSupplyVoltage,
      upsBackupStatus,
      networkPingMs,
      nvrRecordingStatus,
      irNightVision,
      beforeCleaningNotes,
      afterCleaningNotes,
      beforePhotoUrl: beforePhotoUrl || undefined,
      afterPhotoUrl: afterPhotoUrl || undefined,
      overallResult,
      actionTaken,
      recommendedAction,
      verifiedBy: `${adminName} (Admin)`,
      verifiedAt: `${date} ${time}`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-md text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                บันทึกรายงานการทำความสะอาดและตรวจเช็คอุปกรณ์กล้อง
                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  {reportNo}
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80">
                แบบบันทึกงานบำรุงรักษาเชิงป้องกัน (Preventive Maintenance Log & Checklist) ประจำรอบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">เลือกรหัสกล้อง CCTV / จุดติดตั้ง *</label>
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {INITIAL_CCTV_CAMERAS.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.id} : {cam.name} ({cam.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">วันที่ตรวจเช็ค *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">เวลาที่เข้าตรวจเช็ค *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">ผู้ตรวจเช็ค (ช่างผู้รับผิดชอบ) *</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">ตำแหน่ง</label>
              <input
                type="text"
                value={inspectorPosition}
                onChange={(e) => setInspectorPosition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">ชุดปฏิบัติการ / สังกัด</label>
              <input
                type="text"
                value={inspectorTeam}
                onChange={(e) => setInspectorTeam(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Checklist 6-Pillar Card */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60 space-y-4">
            <h4 className="font-black text-sm text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              รายการตรวจเช็ค 6 มิติ (Hardware & Environmental Checklist)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. Lens Cleaning & Clarity */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    ✨ 1. การทำความสะอาดเลนส์/ฝาครอบโดม
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lensCleaning}
                      onChange={(e) => setLensCleaning(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-emerald-300 font-bold">เช็ดทำความสะอาดแล้ว</span>
                  </label>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ระดับความคมชัดหลังทำความสะอาด:</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setLensClarityRating(star as any)}
                        className={`p-1 rounded transition-transform hover:scale-110 ${
                          lensClarityRating >= star ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                    <span className="text-amber-300 font-bold ml-2">
                      ({lensClarityRating}/5 {lensClarityRating === 5 ? 'ดีเยี่ยม/คมชัดสูง' : lensClarityRating >= 3 ? 'ผ่านเกณฑ์' : 'ต้องปรับปรุง'})
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Housing & Mount */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <span className="font-bold text-white block">
                  🔩 2. สภาพตัวกล้องและขายึด (Housing & Mount)
                </span>
                <select
                  value={housingCondition}
                  onChange={(e) => setHousingCondition(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 font-medium"
                >
                  <option value="good">🟢 สภาพสมบูรณ์ มั่นคงแข็งแรง ไม่หลวมคลอน</option>
                  <option value="loose">🟡 ขันยึดคลอนเล็กน้อย (ขันแน่นแล้ว)</option>
                  <option value="corroded">🟠 เริ่มมีคราบสนิม/คราบเกลือ</option>
                  <option value="damaged">🔴 เสียหาย/แตกร้าว ต้องเปลี่ยน</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={waterproofSeal}
                    onChange={(e) => setWaterproofSeal(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-slate-300">ซีลยางกันน้ำและข้อต่อสายสมบูรณ์</span>
                </label>
              </div>

              {/* 3. Power Supply & UPS */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <span className="font-bold text-white block">
                  ⚡ 3. ระบบไฟเลี้ยงและ UPS สำรองไฟ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block text-[10px]">แรงดันไฟเลี้ยง:</label>
                    <input
                      type="text"
                      value={powerSupplyVoltage}
                      onChange={(e) => setPowerSupplyVoltage(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px]">สถานะ UPS:</label>
                    <select
                      value={upsBackupStatus}
                      onChange={(e) => setUpsBackupStatus(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-[11px]"
                    >
                      <option value="normal">🟢 แบตเตอรี่ปกติ (สำรองไฟได้)</option>
                      <option value="battery_low">🟡 แบตเตอรี่ต่ำ</option>
                      <option value="replace_battery">🔴 แบตเตอรี่เสื่อม (ต้องเปลี่ยน)</option>
                      <option value="no_ups">⚪ ไม่มี UPS ในจุดนี้</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Network & Latency */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <span className="font-bold text-white block">
                  🌐 4. สัญญาณเครือข่าย & สาย Fiber Optic
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-slate-400 block text-[10px]">ค่าความหน่วง Latency (Ping ms):</label>
                    <input
                      type="number"
                      value={networkPingMs}
                      onChange={(e) => setNetworkPingMs(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div className="text-right pt-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      networkPingMs < 20 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {networkPingMs < 20 ? 'สัญญาณแรงเสถียร' : 'ความหน่วงสูง'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. NVR Recording */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <span className="font-bold text-white block">
                  💾 5. สถานะการบันทึกภาพลง NVR
                </span>
                <select
                  value={nvrRecordingStatus}
                  onChange={(e) => setNvrRecordingStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 font-medium"
                >
                  <option value="recording">🟢 บันทึกภาพต่อเนื่อง 24 ชม. ปกติ</option>
                  <option value="storage_warning">🟡 พื้นที่จัดเก็บใกล้เต็ม (&gt;90%)</option>
                  <option value="frame_drop">🟠 เฟรมภาพตกหล่น (Frame Drop)</option>
                  <option value="error">🔴 ไม่มีการบันทึกภาพ (Error)</option>
                </select>
              </div>

              {/* 6. IR Night Vision */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-2.5">
                <span className="font-bold text-white block">
                  🌙 6. หลอดอินฟราเรด & แสงสว่างกลางคืน
                </span>
                <select
                  value={irNightVision}
                  onChange={(e) => setIrNightVision(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 font-medium"
                >
                  <option value="working">🟢 IR สว่างชัดเจน ระยะครอบคลุม</option>
                  <option value="weak">🟡 IR สว่างลดลง (ระยะลดลง)</option>
                  <option value="failed">🔴 IR ไม่ทำงาน</option>
                  <option value="not_applicable">⚪ ไม่ได้ใช้งาน IR ในจุดนี้</option>
                </select>
              </div>

            </div>
          </div>

          {/* Notes Before & After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <label className="block text-amber-300 font-bold mb-1.5">
                🔍 สภาพก่อนทำความสะอาด / ปัญหาที่พบ (Before)
              </label>
              <textarea
                value={beforeCleaningNotes}
                onChange={(e) => setBeforeCleaningNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="ระบุคราบฝุ่น, หยากไย่, มุมกล้องเคลื่อน..."
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors text-[11px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>แนบรูปก่อนทำความสะอาด</span>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'before')} className="hidden" />
                </label>
                {beforePhotoUrl && <span className="text-emerald-400 font-bold">✓ แนบรูปแล้ว</span>}
              </div>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <label className="block text-emerald-300 font-bold mb-1.5">
                ✨ ผลหลังทำความสะอาดและแก้ไข (After)
              </label>
              <textarea
                value={afterCleaningNotes}
                onChange={(e) => setAfterCleaningNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="ระบุน้ำยาที่ใช้, การปรับมุม, ความคมชัด..."
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors text-[11px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>แนบรูปหลังทำความสะอาด</span>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'after')} className="hidden" />
                </label>
                {afterPhotoUrl && <span className="text-emerald-400 font-bold">✓ แนบรูปแล้ว</span>}
              </div>
            </div>
          </div>

          {/* Overall Evaluation */}
          <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/40 space-y-3">
            <label className="block text-white font-bold">สรุปผลการประเมินโดยรวม (Overall Inspection Result) *</label>
            <div className="grid grid-cols-3 gap-3">
              <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                overallResult === 'pass' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="overallResult"
                  value="pass"
                  checked={overallResult === 'pass'}
                  onChange={() => setOverallResult('pass')}
                  className="text-emerald-500"
                />
                <span>🟢 ผ่านเกณฑ์สมบูรณ์ (Pass)</span>
              </label>

              <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                overallResult === 'needs_attention' ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="overallResult"
                  value="needs_attention"
                  checked={overallResult === 'needs_attention'}
                  onChange={() => setOverallResult('needs_attention')}
                  className="text-amber-500"
                />
                <span>🟡 เฝ้าระวัง/มีจุดต้องซ่อม (Warning)</span>
              </label>

              <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                overallResult === 'critical_defect' ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="overallResult"
                  value="critical_defect"
                  checked={overallResult === 'critical_defect'}
                  onChange={() => setOverallResult('critical_defect')}
                  className="text-rose-500"
                />
                <span>🔴 ชำรุดวิกฤต/ต้องแก้ไขด่วน (Critical)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-300 font-bold mb-1">การดำเนินการแก้ไขที่ทำไปแล้ว:</label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">ข้อเสนอแนะ/แผนงานครั้งถัดไป:</label>
                <input
                  type="text"
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black shadow-lg flex items-center gap-2 transition-all cursor-pointer scale-102"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกรายงานเข้าโฟลเดอร์</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
