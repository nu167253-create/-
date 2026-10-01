import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { addOrUpdateAppointment, cancelAppointment } from '../utils/storage';
import { Calendar, Clock, MapPin, FileText, User, X, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem;
  officerNameDefault?: string;
  onSaveSuccess: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  request,
  officerNameDefault = 'นางสาวจิราพร ใจดี (เจ้าหน้าที่รับเรื่อง)',
  onSaveSuccess
}) => {
  const existing = request?.appointment;

  // Set default date to tomorrow or existing
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().slice(0, 10);

  const [date, setDate] = useState(existing?.date || defaultDateStr);
  const [time, setTime] = useState(existing?.time || '10:00');
  const [location, setLocation] = useState(existing?.location || 'ห้องสารบรรณและรับคำร้อง ชั้น 1 อาคารอำนวยการ');
  const [purpose, setPurpose] = useState(existing?.purpose || 'รับหนังสืออนุมัติฉบับจริง และเอกสารประกอบการเดินทาง');
  const [officerName, setOfficerName] = useState(existing?.officerName || officerNameDefault);
  const [notes, setNotes] = useState(existing?.notes || 'โปรดนำบัตรประจำตัวประชาชน หรือบัตรพนักงานมาแสดงต่อเจ้าหน้าที่');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !(location || '').trim() || !(purpose || '').trim()) {
      setErrorMsg('กรุณากรอกข้อมูลวันที่ เวลา สถานที่ และวัตถุประสงค์การนัดหมายให้ครบถ้วน');
      return;
    }

    const updated = addOrUpdateAppointment(request.id, {
      date,
      time,
      location: (location || '').trim(),
      purpose: (purpose || '').trim(),
      officerName: (officerName || '').trim() || officerNameDefault,
      notes: (notes || '').trim()
    });

    if (updated) {
      onSaveSuccess();
      onClose();
    } else {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูลนัดหมาย');
    }
  };

  const handleCancelAppointment = () => {
    if (confirm('คุณต้องการยกเลิกการนัดหมายคำร้องนี้ใช่หรือไม่?')) {
      cancelAppointment(request.id, officerNameDefault, 'เจ้าหน้าที่ทำการยกเลิกนัดหมาย');
      onSaveSuccess();
      onClose();
    }
  };

  const locationPresets = [
    'ห้องสารบรรณและรับคำร้อง ชั้น 1 อาคารอำนวยการ',
    'สำนักบริหารงานวิชาการ ชั้น 2 อาคารเรียนรวม',
    'กองบริการการศึกษา อาคารพฤกษศาสตร์ Room 102',
    'ฝ่ายพัสดุและอาคารสถานที่ ชั้น 1'
  ];

  const purposePresets = [
    'รับหนังสืออนุมัติฉบับจริง และเอกสารประกอบการเดินทาง',
    'ลงนามบันทึกข้อตกลงและรับมอบเอกสารสำคัญ',
    'เข้ารับการตรวจสอบเอกสารหลักฐานเพิ่มเติมตัวจริง',
    'รับหนังสือรับรองสิทธิ์ / ใบรับรองทางการ'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {existing ? 'แก้ไขวันเวลานัดหมาย' : 'กำหนดวันเวลานัดหมาย (Appointment)'}
              </h3>
              <p className="text-xs text-slate-500">
                สำหรับคำร้องรหัส <span className="font-mono font-bold text-blue-600">{request.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applicant Summary */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-800">{request.title}</div>
          <div className="text-slate-600">
            ผู้ยื่นคำร้อง: <strong className="text-slate-800">{request.applicant.prefix}{request.applicant.fullName}</strong> ({request.applicant.department}) | โทร: {request.applicant.phone}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                วันที่นัดหมาย *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                เวลานัดหมาย *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              สถานที่นัดหมาย *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ระบุสถานที่นัดหมายติดต่อ/รับเอกสาร"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 mb-1.5"
              required
            />
            <div className="flex flex-wrap gap-1">
              {locationPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLocation(preset)}
                  className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              วัตถุประสงค์การนัดหมาย *
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="เช่น รับหนังสืออนุมัติฉบับจริง หรือตรวจสอบเอกสาร"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 mb-1.5"
              required
            />
            <div className="flex flex-wrap gap-1">
              {purposePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPurpose(preset)}
                  className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              เจ้าหน้าที่ผู้นัดหมาย
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              หมายเหตุ / ข้อแนะนำสำหรับผู้ยื่นคำร้อง
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุสิ่งที่ผู้ยื่นคำร้องต้องเตรียมมา..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed text-slate-800"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            {existing && existing.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={handleCancelAppointment}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ยกเลิกนัดหมาย
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                บันทึกการนัดหมาย
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
