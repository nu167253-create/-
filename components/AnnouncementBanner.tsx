import React, { useState, useEffect } from 'react';
import { 
  getStoredAnnouncement, 
  saveStoredAnnouncement, 
  AnnouncementBannerData 
} from '../utils/storage';
import { 
  Megaphone, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  AlertOctagon, 
  X, 
  Edit3, 
  Save, 
  Check, 
  Eye, 
  EyeOff,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface AnnouncementBannerProps {
  isOfficerMode?: boolean;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ isOfficerMode = false }) => {
  const [announcement, setAnnouncement] = useState<AnnouncementBannerData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editEnabled, setEditEnabled] = useState(true);
  const [editType, setEditType] = useState<'info' | 'warning' | 'alert' | 'success'>('warning');
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editBadgeText, setEditBadgeText] = useState('');
  const [editLinkText, setEditLinkText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    loadAnnouncement();
  }, []);

  const loadAnnouncement = () => {
    const data = getStoredAnnouncement();
    setAnnouncement(data);
    setEditEnabled(data.enabled);
    setEditType(data.type);
    setEditTitle(data.title);
    setEditMessage(data.message);
    setEditBadgeText(data.badgeText || '');
    setEditLinkText(data.linkText || '');

    // Check if dismissed in sessionStorage for current session
    const dismissedId = sessionStorage.getItem('dismissed_announcement_id');
    if (dismissedId === data.id && !isOfficerMode) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      sessionStorage.setItem('dismissed_announcement_id', announcement.id);
    }
    setIsDismissed(true);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement) return;

    const updated: AnnouncementBannerData = {
      id: `ann-${Date.now()}`,
      enabled: editEnabled,
      type: editType,
      title: (editTitle || '').trim(),
      message: (editMessage || '').trim(),
      badgeText: (editBadgeText || '').trim() || undefined,
      linkText: (editLinkText || '').trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    saveStoredAnnouncement(updated);
    setAnnouncement(updated);
    setIsEditing(false);
    setIsDismissed(false);
    sessionStorage.removeItem('dismissed_announcement_id');

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  if (!announcement) return null;

  // Don't render banner if disabled or dismissed (unless in officer mode where officer can see/manage it)
  if (!announcement.enabled && !isOfficerMode) return null;
  if (isDismissed && !isOfficerMode) return null;

  // Theme styling based on announcement type
  const getTypeStyles = (type: AnnouncementBannerData['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600',
          textColor: 'text-white',
          badgeBg: 'bg-amber-950/40 text-amber-100 border-amber-300/40',
          icon: <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />,
          buttonBg: 'bg-white/20 hover:bg-white/30 text-white'
        };
      case 'alert':
        return {
          bg: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700',
          textColor: 'text-white',
          badgeBg: 'bg-rose-950/40 text-rose-100 border-rose-300/40',
          icon: <AlertOctagon className="w-4 h-4 text-rose-200 shrink-0" />,
          buttonBg: 'bg-white/20 hover:bg-white/30 text-white'
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700',
          textColor: 'text-white',
          badgeBg: 'bg-emerald-950/40 text-emerald-100 border-emerald-300/40',
          icon: <CheckCircle className="w-4 h-4 text-emerald-200 shrink-0" />,
          buttonBg: 'bg-white/20 hover:bg-white/30 text-white'
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700',
          textColor: 'text-white',
          badgeBg: 'bg-blue-950/40 text-blue-100 border-blue-300/40',
          icon: <Info className="w-4 h-4 text-blue-200 shrink-0" />,
          buttonBg: 'bg-white/20 hover:bg-white/30 text-white'
        };
    }
  };

  const style = getTypeStyles(announcement.type);

  return (
    <div className="w-full no-print relative z-40">
      {/* Save Toast Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-800 text-white text-xs px-4 py-2 text-center font-semibold flex items-center justify-center gap-2">
          <Check className="w-4 h-4 text-emerald-300" />
          อัปเดตประกาศแจ้งเตือนระบบเรียบร้อยแล้ว
        </div>
      )}

      {/* Admin Edit Modal / Panel */}
      {isEditing ? (
        <div className="bg-slate-900 text-white p-4 sm:p-6 border-b border-slate-700 shadow-xl animate-in slide-in-from-top duration-200">
          <form onSubmit={handleSaveAnnouncement} className="max-w-5xl mx-auto space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-amber-400 flex items-center gap-2 text-sm">
                <Megaphone className="w-4 h-4 text-amber-400" />
                จัดการป้ายประกาศแจ้งเตือนระบบ (System Announcement Manager)
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Enable Toggle */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">สถานะการแสดงผล:</label>
                <button
                  type="button"
                  onClick={() => setEditEnabled(!editEnabled)}
                  className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors ${
                    editEnabled 
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {editEnabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                  {editEnabled ? 'เปิดใช้งาน (แสดงป้าย)' : 'ปิดใช้งาน (ซ่อนป้าย)'}
                </button>
              </div>

              {/* Type Select */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">ประเภทการแจ้งเตือน:</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="warning">⚠️ แจ้งเตือนปิดปรับปรุง / คำเตือน (Warning - สีส้ม)</option>
                  <option value="alert">🚨 เรื่องด่วนวิกฤต (Alert - สีแดง)</option>
                  <option value="info">ℹ️ ข่าวประชาสัมพันธ์ทั่วไป (Info - สีฟ้า)</option>
                  <option value="success">✅ ข่าวแจ้งผลการดำเนินงาน (Success - สีเขียว)</option>
                </select>
              </div>

              {/* Badge Text */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">ป้ายกำกับ (Badge Label):</label>
                <input
                  type="text"
                  placeholder="เช่น ประกาศสำคัญ, ปิดปรับปรุงระบบ"
                  value={editBadgeText}
                  onChange={(e) => setEditBadgeText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">หัวข้อประกาศ:</label>
                <input
                  type="text"
                  placeholder="เช่น แจ้งปิดปรับปรุงระบบชั่วคราว"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Link Text Optional */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">ข้อความปุ่มเพิ่มเติม (ถ้ามี):</label>
                <input
                  type="text"
                  placeholder="เช่น ดูรายละเอียดเพิ่มเติม"
                  value={editLinkText}
                  onChange={(e) => setEditLinkText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Message Detail */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">รายละเอียดข้อความประกาศ:</label>
              <textarea
                rows={2}
                placeholder="พิมพ์รายละเอียดประกาศแจ้งเตือน..."
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-md"
              >
                <Save className="w-4 h-4" />
                บันทึกประกาศระบบ
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Active Banner Display */
        <div className={`${style.bg} ${style.textColor} shadow-md transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {style.icon}

              {announcement.badgeText && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${style.badgeBg} shrink-0`}>
                  {announcement.badgeText}
                </span>
              )}

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide shrink-0">
                  {announcement.title}:
                </span>
                <span className="text-white/95 text-xs leading-relaxed font-normal">
                  {announcement.message}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {!announcement.enabled && isOfficerMode && (
                <span className="text-[10px] font-bold bg-black/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30">
                  (ซ่อนอยู่จากผู้ใช้ทั่วไป)
                </span>
              )}

              {/* Officer Admin Edit Trigger Button */}
              {isOfficerMode && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-white font-semibold text-[11px] border border-white/20 transition-colors shadow-xs"
                  title="แก้ไขประกาศระบบ (สำหรับแอดมิน)"
                >
                  <Edit3 className="w-3 h-3 text-amber-300" />
                  <span>แก้ไขประกาศ</span>
                </button>
              )}

              {/* Dismiss X Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors"
                title="ปิดการแจ้งเตือนนี้"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
