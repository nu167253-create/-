import React from 'react';
import { AppointmentInfo } from '../types/request';
import { Calendar, Clock, MapPin, FileText, User, Download, Printer, CheckCircle2, AlertCircle } from 'lucide-react';

interface AppointmentCardProps {
  appointment: AppointmentInfo;
  requestId: string;
  requestTitle: string;
  applicantName?: string;
  onEditAppointment?: () => void;
  isOfficer?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  requestId,
  requestTitle,
  applicantName,
  onEditAppointment,
  isOfficer = false
}) => {
  if (appointment.status === 'cancelled') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5 text-rose-700">
            <AlertCircle className="w-4 h-4" />
            การนัดหมายถูกยกเลิกแล้ว
          </span>
          {isOfficer && onEditAppointment && (
            <button
              onClick={onEditAppointment}
              className="text-[11px] bg-white hover:bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-300 font-bold transition-colors"
            >
              เพื่อนัดหมายใหม่
            </button>
          )}
        </div>
        <p className="text-[11px] text-rose-600">
          วันเวลานัดหมายเดิม ({appointment.date} {appointment.time} น.) ถูกยกเลิกโดยเจ้าหน้าที่
        </p>
      </div>
    );
  }

  // Format date to Thai format
  const formatDateTh = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Generate Google Calendar URL
  const getGoogleCalendarUrl = () => {
    const title = encodeURIComponent(`นัดหมายติดต่อรับบริการ: ${requestTitle} (${requestId})`);
    const details = encodeURIComponent(`วัตถุประสงค์: ${appointment.purpose}\nสถานที่: ${appointment.location}\nผู้ประสานงาน: ${appointment.officerName}\nหมายเหตุ: ${appointment.notes || '-'}`);
    const location = encodeURIComponent(appointment.location);
    
    // Parse start & end time
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const startDate = new Date(appointment.date);
    startDate.setHours(hours || 9, minutes || 0, 0);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // + 1 hour

    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  // Print Appointment Slip
  const handlePrintSlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>บัตรนัดหมาย - ${requestId}</title>
          <style>
            body { font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif; padding: 40px; color: #1e293b; max-width: 650px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px double #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 20px; font-weight: bold; color: #0369a1; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #64748b; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; background: #f8fafc; margin-bottom: 20px; }
            .row { display: flex; margin-bottom: 12px; font-size: 14px; }
            .label { font-weight: bold; width: 140px; color: #334155; shrink: 0; }
            .value { flex: 1; color: #0f172a; font-weight: 500; }
            .highlight { background: #e0f2fe; color: #0369a1; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; font-size: 16px; margin: 15px 0; border: 1px border #93c5fd; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ใบบันทึกนัดหมายติดต่อราชการ / รับบริการ</div>
            <div class="subtitle">ระบบบริการยื่นคำร้องและติดตามสถานะออนไลน์ (Online Request System)</div>
          </div>

          <div class="card">
            <div class="row"><div class="label">รหัสคำร้อง:</div><div class="value" style="font-family: monospace; font-weight: bold;">${requestId}</div></div>
            <div class="row"><div class="label">หัวข้อคำร้อง:</div><div class="value">${requestTitle}</div></div>
            ${applicantName ? `<div class="row"><div class="label">ผู้ยื่นคำร้อง:</div><div class="value">${applicantName}</div></div>` : ''}
            
            <div class="highlight">
              📅 วันที่ ${formatDateTh(appointment.date)} เวลา ${appointment.time} น.
            </div>

            <div class="row"><div class="label">สถานที่นัดหมาย:</div><div class="value">${appointment.location}</div></div>
            <div class="row"><div class="label">วัตถุประสงค์:</div><div class="value">${appointment.purpose}</div></div>
            <div class="row"><div class="label">เจ้าหน้าที่ผู้นัด:</div><div class="value">${appointment.officerName}</div></div>
            ${appointment.notes ? `<div class="row"><div class="label">ข้อแนะนำ/หมายเหตุ:</div><div class="value">${appointment.notes}</div></div>` : ''}
          </div>

          <div class="footer">
            พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} | กรุณานำบัตรประจำตัวประชาชนหรือใบนัดหมายนี้มาแสดงต่อเจ้าหน้าที่
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/90 via-sky-50 to-indigo-50/50 border border-blue-200/90 rounded-2xl p-4 shadow-sm relative overflow-hidden space-y-3">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-blue-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-900">กำหนดการนัดหมาย (Appointment)</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ยืนยันการนัดแล้ว
              </span>
            </div>
            <p className="text-[10px] text-blue-700">
              สำหรับคำร้อง {requestId}
            </p>
          </div>
        </div>

        {isOfficer && onEditAppointment && (
          <button
            onClick={onEditAppointment}
            className="text-[11px] bg-white hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-300 font-bold transition-colors shadow-2xs"
          >
            แก้ไขวันนัดหมาย
          </button>
        )}
      </div>

      {/* Primary Highlight Box */}
      <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-blue-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันนัดหมาย</div>
            <div className="text-xs font-extrabold text-blue-900 mt-0.5">
              {formatDateTh(appointment.date)}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เวลานัดหมาย</div>
            <div className="text-xs font-extrabold text-amber-900 mt-0.5">
              {appointment.time} น.
            </div>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-1.5 text-xs text-slate-700 bg-white/50 p-3 rounded-xl border border-blue-100/70">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">สถานที่นัดหมาย:</span>{' '}
            <span className="text-slate-700">{appointment.location}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">วัตถุประสงค์:</span>{' '}
            <span className="text-slate-700">{appointment.purpose}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">เจ้าหน้าที่ผู้นัดหมาย:</span>{' '}
            <span className="text-slate-700">{appointment.officerName}</span>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-2 pt-2 border-t border-blue-100 text-[11px] text-slate-600 italic">
            📌 <strong>หมายเหตุเพิ่มเติม:</strong> {appointment.notes}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <a
          href={getGoogleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200 transition-colors shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          เพิ่มลง Google Calendar
        </a>

        <button
          onClick={handlePrintSlip}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-colors shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-blue-200" />
          พิมพ์ใบนัดหมาย
        </button>
      </div>

    </div>
  );
};
