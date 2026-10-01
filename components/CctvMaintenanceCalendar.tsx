import React, { useState } from 'react';
import { CctvCamera } from '../types/cctv';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Wrench, ShieldCheck, MapPin } from 'lucide-react';

interface CctvMaintenanceCalendarProps {
  cameras: CctvCamera[];
  onSelectCamera: (camera: CctvCamera) => void;
}

export const CctvMaintenanceCalendar: React.FC<CctvMaintenanceCalendarProps> = ({ cameras, onSelectCamera }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // Mock scheduled maintenance calculations based on lastMaintenance
  // Let's assume maintenance happens every 6 months.
  const scheduledTasks = cameras.reduce((acc, cam) => {
    if (cam.lastMaintenance) {
      const lastDate = new Date(cam.lastMaintenance);
      const nextDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + 6, lastDate.getDate());
      
      // Also add some random tasks for the current month just for demonstration if it's empty
      if (nextDate.getFullYear() === currentDate.getFullYear() && nextDate.getMonth() === currentDate.getMonth()) {
        const dateKey = nextDate.getDate();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(cam);
      }
    }
    return acc;
  }, {} as Record<number, CctvCamera[]>);

  // If no tasks in this month naturally, inject some dummy ones for demonstration (since it's a demo)
  if (Object.keys(scheduledTasks).length === 0) {
    const dummyDates = [5, 12, 18, 25];
    dummyDates.forEach((d, i) => {
      if (cameras[i]) {
        scheduledTasks[d] = [cameras[i], cameras[(i + 1) % cameras.length]];
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">ปฏิทินซ่อมบำรุงเชิงรุก (Preventive Maintenance)</h3>
            <p className="text-sm text-slate-500">กำหนดการตรวจสอบและบำรุงรักษากล้องวงจรปิดประจำเดือน</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-base font-bold text-slate-800 min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {dayNames.map((day, idx) => (
          <div key={day} className={`bg-slate-50 py-3 text-center text-xs font-bold ${idx === 0 || idx === 6 ? 'text-rose-600' : 'text-slate-600'}`}>
            {day}
          </div>
        ))}
        
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white min-h-[120px] p-2 opacity-50" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = i + 1;
          const tasks = scheduledTasks[date] || [];
          const isToday = new Date().getDate() === date && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
          
          return (
            <div key={date} className={`bg-white min-h-[120px] p-2 border-t border-slate-100 transition-colors hover:bg-slate-50 ${isToday ? 'bg-blue-50/30' : ''}`}>
              <div className="flex items-start justify-between">
                <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                  {date}
                </span>
                {tasks.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    {tasks.length} งาน
                  </span>
                )}
              </div>
              
              <div className="mt-2 space-y-1.5">
                {tasks.slice(0, 3).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => onSelectCamera(cam)}
                    className="w-full text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded p-1.5 transition-colors group"
                  >
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800">
                      <Wrench className="w-3 h-3" />
                      PM: {cam.id}
                    </div>
                    <div className="text-[9px] text-amber-700/80 truncate mt-0.5 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {cam.building}
                    </div>
                  </button>
                ))}
                {tasks.length > 3 && (
                  <div className="text-[10px] text-center text-slate-500 font-medium py-1">
                    +{tasks.length - 3} เพิ่มเติม
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
          <div key={`empty-end-${i}`} className="bg-white min-h-[120px] p-2 opacity-50" />
        ))}
      </div>
    </div>
  );
};
