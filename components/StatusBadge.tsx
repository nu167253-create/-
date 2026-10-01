import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RequestStatus } from '../types/request';
import { getStatusLabelTh } from '../utils/storage';
import { 
  Clock, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  CheckCheck, 
  XCircle, 
  Lock, 
  FileEdit,
  RefreshCw,
  LucideIcon
} from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  showEnLabel?: boolean;
  className?: string;
  id?: string;
  animated?: boolean;
}

interface StatusConfig {
  labelTh: string;
  labelEn: string;
  badgeClass: string;
  dotClass: string;
  pulseClass?: string;
  icon: LucideIcon;
  iconColor: string;
}

export const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  submitted: {
    labelTh: 'ยื่นคำร้องแล้ว',
    labelEn: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20',
    dotClass: 'bg-amber-500',
    pulseClass: 'bg-amber-400 animate-ping',
    icon: Clock,
    iconColor: 'text-amber-600'
  },
  under_review: {
    labelTh: 'อยู่ระหว่างตรวจสอบ',
    labelEn: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-400/20',
    dotClass: 'bg-blue-600',
    pulseClass: 'bg-blue-400 animate-ping',
    icon: Search,
    iconColor: 'text-blue-600'
  },
  action_required: {
    labelTh: 'ต้องการข้อมูลเพิ่ม',
    labelEn: 'Action Required',
    badgeClass: 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/20',
    dotClass: 'bg-purple-600',
    icon: AlertCircle,
    iconColor: 'text-purple-600'
  },
  approved: {
    labelTh: 'อนุมัติแล้ว',
    labelEn: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/20',
    dotClass: 'bg-emerald-600',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600'
  },
  completed: {
    labelTh: 'ดำเนินการเสร็จสิ้น',
    labelEn: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-950 border-emerald-400 ring-1 ring-emerald-500/25',
    dotClass: 'bg-emerald-600',
    icon: CheckCheck,
    iconColor: 'text-emerald-700'
  },
  closed: {
    labelTh: 'ปิดเรื่องดำเนินการแล้ว',
    labelEn: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-400/10',
    dotClass: 'bg-slate-500',
    icon: Lock,
    iconColor: 'text-slate-600'
  },
  rejected: {
    labelTh: 'ไม่อนุมัติ',
    labelEn: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-300 ring-1 ring-rose-400/20',
    dotClass: 'bg-rose-600',
    icon: XCircle,
    iconColor: 'text-rose-600'
  },
  draft: {
    labelTh: 'ร่างคำร้อง',
    labelEn: 'Draft',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300 ring-1 ring-slate-400/10',
    dotClass: 'bg-slate-400',
    icon: FileEdit,
    iconColor: 'text-slate-500'
  },
  pending_sync: {
    labelTh: 'รอซิงค์ข้อมูล',
    labelEn: 'Pending Sync',
    badgeClass: 'bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-400/25',
    dotClass: 'bg-amber-500',
    pulseClass: 'bg-amber-400 animate-ping',
    icon: RefreshCw,
    iconColor: 'text-amber-700'
  }
};

export interface PendingSyncBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  id?: string;
  showText?: boolean;
}

export const PendingSyncBadge: React.FC<PendingSyncBadgeProps> = ({
  size = 'sm',
  className = '',
  id,
  showText = true
}) => {
  return (
    <span
      id={id || 'badge-pending-sync'}
      className={`inline-flex items-center gap-1.5 font-bold tracking-tight rounded-full border border-amber-300/90 bg-amber-50 text-amber-900 shadow-2xs ${
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
      title="คำร้องนี้บันทึกในอุปกรณ์และกำลังรอซิงค์ขึ้นฐานข้อมูลเมื่อต่ออินเทอร์เน็ต (Pending Sync)"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <RefreshCw className={`shrink-0 text-amber-700 animate-spin ${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} style={{ animationDuration: '3s' }} />
      {showText && <span>รอซิงค์ข้อมูล (Pending Sync)</span>}
    </span>
  );
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  showDot = true,
  showEnLabel = false,
  className = '',
  id,
  animated = true
}) => {
  const config = STATUS_CONFIG_MAP[status] || {
    labelTh: getStatusLabelTh(status as RequestStatus) || status,
    labelEn: status,
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
    dotClass: 'bg-gray-500',
    icon: Clock,
    iconColor: 'text-gray-500'
  };

  const IconComponent = config.icon;

  const sizeClasses = {
    xs: {
      badge: 'text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-md border',
      dot: 'w-1.5 h-1.5',
      icon: 'w-2.5 h-2.5'
    },
    sm: {
      badge: 'text-xs px-2.5 py-1 gap-1.5 font-bold rounded-lg border shadow-2xs',
      dot: 'w-2 h-2',
      icon: 'w-3.5 h-3.5'
    },
    md: {
      badge: 'text-xs px-3 py-1.5 gap-2 font-bold rounded-xl border shadow-xs',
      dot: 'w-2.5 h-2.5',
      icon: 'w-4 h-4'
    },
    lg: {
      badge: 'text-sm px-4 py-2 gap-2.5 font-black rounded-xl border shadow-sm',
      dot: 'w-3 h-3',
      icon: 'w-4.5 h-4.5'
    }
  }[size];

  // Track state updates to provide subtle visual feedback on change
  const prevStatusRef = useRef<string>(status);
  const isFirstRender = useRef<boolean>(true);
  const [hasChanged, setHasChanged] = useState<boolean>(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevStatusRef.current = status;
      return;
    }

    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      setHasChanged(true);
      const timer = setTimeout(() => {
        setHasChanged(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!animated) {
    return (
      <span
        id={id || `status-badge-${status}`}
        className={`inline-flex items-center tracking-tight transition-all duration-200 ${config.badgeClass} ${sizeClasses.badge} ${className}`}
      >
        {/* Animated or Solid Status Dot */}
        {showDot && (
          <span className="relative flex items-center justify-center shrink-0">
            {config.pulseClass && (
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulseClass}`}
              />
            )}
            <span className={`relative inline-flex rounded-full ${config.dotClass} ${sizeClasses.dot}`} />
          </span>
        )}

        {/* Status Icon */}
        {showIcon && (
          <IconComponent className={`${sizeClasses.icon} ${config.iconColor} shrink-0`} />
        )}

        {/* Status Label Text */}
        <span className="whitespace-nowrap">
          {config.labelTh}
          {showEnLabel && (
            <span className="opacity-75 font-medium ml-1 text-[0.9em]">
              ({config.labelEn})
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        id={id || `status-badge-${status}`}
        initial={{ opacity: 0.7, scale: 0.92, y: 1 }}
        animate={{ 
          opacity: 1, 
          scale: hasChanged ? [0.93, 1.06, 1] : 1, 
          y: 0 
        }}
        exit={{ opacity: 0, scale: 0.94, y: -1 }}
        transition={{ 
          duration: 0.32, 
          ease: [0.16, 1, 0.3, 1] 
        }}
        className={`relative inline-flex items-center tracking-tight transition-colors duration-300 ${config.badgeClass} ${sizeClasses.badge} ${className}`}
      >
        {/* Subtle expanding ripple ring feedback when state updates */}
        {hasChanged && (
          <motion.span
            initial={{ opacity: 0.7, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute -inset-0.5 rounded-xl ring-2 ring-current opacity-40 pointer-events-none"
          />
        )}

        {/* Animated Status Dot */}
        {showDot && (
          <motion.span 
            layout
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22 }}
            className="relative flex items-center justify-center shrink-0"
          >
            {config.pulseClass && (
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulseClass}`}
              />
            )}
            <span className={`relative inline-flex rounded-full ${config.dotClass} ${sizeClasses.dot}`} />
          </motion.span>
        )}

        {/* Animated Status Icon */}
        {showIcon && (
          <motion.span
            initial={{ rotate: -12, scale: 0.75, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="shrink-0 flex items-center justify-center"
          >
            <IconComponent className={`${sizeClasses.icon} ${config.iconColor} shrink-0`} />
          </motion.span>
        )}

        {/* Animated Status Label Text */}
        <motion.span 
          initial={{ opacity: 0, x: -3 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="whitespace-nowrap inline-flex items-center"
        >
          {config.labelTh}
          {showEnLabel && (
            <span className="opacity-75 font-medium ml-1 text-[0.9em]">
              ({config.labelEn})
            </span>
          )}
        </motion.span>
      </motion.span>
    </AnimatePresence>
  );
};
