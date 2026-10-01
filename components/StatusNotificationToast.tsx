import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus } from '../types/request';
import { 
  getThaiStatusText, 
  getStatusBadgeStyle, 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerBrowserNotification,
  playNotificationChime,
  isNotificationSupported 
} from '../utils/notificationService';
import { Bell, BellOff, CheckCircle, AlertCircle, ArrowRight, X, Volume2, VolumeX, Sparkles, Clock, AlertTriangle } from 'lucide-react';

export interface ActiveNotificationData {
  item: RequestItem;
  oldStatus?: RequestStatus;
  timestamp: Date;
  type?: 'status_change' | 'follow_up_reminder';
  daysPending?: number;
  message?: string;
}

interface NotificationToastProps {
  notification: ActiveNotificationData | null;
  onClose: () => void;
  onTrackRequest: (trackId: string) => void;
}

export const StatusNotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onTrackRequest,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted' && notification) {
      triggerBrowserNotification(notification.item, notification.oldStatus);
    }
  };

  const handleTestNotification = () => {
    if (permission === 'granted') {
      const mockItem: RequestItem = {
        id: 'REQ-DEMO-99',
        title: 'คำร้องขอดูภาพกล้องวงจรปิด (ทดสอบการแจ้งเตือน)',
        category: 'cctv',
        status: 'approved',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        applicant: {
          prefix: 'นาย',
          fullName: 'ผู้ใช้งานทดสอบ',
          citizenIdOrCode: '1234567890123',
          email: 'test@example.com',
          phone: '0812345678',
          department: 'ประชาชนทั่วไป',
          positionOrMajor: 'ประชาชน'
        },
        details: {},
        attachments: [],
        statusHistory: [],
        reason: 'ทดสอบระบบการแจ้งเตือนแบบเรียลไทม์'
      };
      triggerBrowserNotification(mockItem);
      if (soundEnabled) playNotificationChime();
    }
  };

  if (!notification) return null;

  const { item, oldStatus, timestamp, type = 'status_change', daysPending } = notification;
  const isFollowUp = type === 'follow_up_reminder';
  const statusBadge = getStatusBadgeStyle(item.status);
  const statusText = getThaiStatusText(item.status);

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-slide-up">
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-700/80 backdrop-blur-md relative overflow-hidden">
        {/* Accent Bar */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isFollowUp 
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500' 
              : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400'
          }`} 
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span 
            className={`p-1.5 rounded-lg flex items-center justify-center ${
              isFollowUp ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {isFollowUp ? (
              <Clock className="w-4 h-4 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 animate-bounce" />
            )}
          </span>
          <span 
            className={`text-xs font-bold uppercase tracking-wider ${
              isFollowUp ? 'text-amber-400' : 'text-blue-400'
            }`}
          >
            {isFollowUp ? 'แจ้งเตือนติดตามเรื่อง (Follow-up Reminder)' : 'อัปเดตสถานะเรียลไทม์ (Firestore Realtime)'}
          </span>
          <span className="text-[10px] text-slate-400 ml-auto mr-6 font-mono">
            {isFollowUp && daysPending ? `ค้าง ${daysPending} วัน` : timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Body Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
              {item.id}
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
              {statusText}
            </span>
            {isFollowUp && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>ไม่เคลื่อนไหวเกิน 7 วัน</span>
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
            {item.title || 'คำร้องขอดูหรือขอสำเนาภาพกล้องวงจรปิด'}
          </h4>

          {isFollowUp ? (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
              คำร้องนี้อยู่ในสถานะ <strong>"{statusText}"</strong> มานานกว่า {daysPending || 7} วัน โดยยังไม่มีความคืบหน้าเพิ่มเติม คลิกปุ่มด้านล่างเพื่อตรวจสอบรายละเอียดหรือติดตามเรื่อง
            </div>
          ) : oldStatus ? (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>สถานะเดิม: <strong className="text-slate-300">{getThaiStatusText(oldStatus)}</strong></span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span>สถานะใหม่: <strong className="text-emerald-400">{statusText}</strong></span>
            </p>
          ) : null}
        </div>

        {/* Actions & Browser Permission Row */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Browser Notification Status Indicator */}
          {permission === 'granted' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>ระบบแจ้งเตือนเปิดอยู่</span>
            </div>
          ) : (
            <button
              onClick={handleRequestPermission}
              className="flex items-center gap-1.5 text-[11px] text-amber-300 hover:text-amber-200 font-medium bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>เปิดการแจ้งเตือน</span>
            </button>
          )}

          {/* Direct Track Button */}
          <button
            onClick={() => {
              onTrackRequest(item.id);
              onClose();
            }}
            className={`flex items-center gap-1.5 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
              isFollowUp ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            <span>ติดตามคำร้องนี้</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
