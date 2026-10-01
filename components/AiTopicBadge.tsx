import React from 'react';
import { AutoTagTopic, AiAutoTagResult } from '../types/request';
import { Sparkles, Wrench, Key, ShieldAlert, Car, PackageX, HelpCircle, Tag, CheckCircle2 } from 'lucide-react';

interface AiTopicBadgeProps {
  topic?: AutoTagTopic | string;
  topics?: (AutoTagTopic | string)[];
  primaryTopic?: AutoTagTopic | string;
  isPrimary?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showSparkle?: boolean;
}

export const getTopicConfig = (topic: string) => {
  switch (topic) {
    case 'Maintenance':
      return {
        labelTh: 'การบำรุงรักษา / แจ้งซ่อม (Maintenance)',
        shortLabel: 'แจ้งซ่อม / บำรุงรักษา',
        bg: 'bg-amber-50 text-amber-800 border-amber-300/80 hover:bg-amber-100',
        dotBg: 'bg-amber-500',
        icon: Wrench
      };
    case 'Access Request':
      return {
        labelTh: 'ขอคัดสำเนา / เข้าถึงข้อมูล (Access Request)',
        shortLabel: 'ขอคัดสำเนาภาพ',
        bg: 'bg-blue-50 text-blue-800 border-blue-300/80 hover:bg-blue-100',
        dotBg: 'bg-blue-500',
        icon: Key
      };
    case 'Privacy Concern':
      return {
        labelTh: 'ข้อกังวลสิทธิ์ความเป็นส่วนตัว (Privacy Concern)',
        shortLabel: 'ความเป็นส่วนตัว / PDPA',
        bg: 'bg-purple-50 text-purple-800 border-purple-300/80 hover:bg-purple-100',
        dotBg: 'bg-purple-500',
        icon: ShieldAlert
      };
    case 'Traffic & Safety':
      return {
        labelTh: 'คดีจราจรและความปลอดภัย (Traffic & Safety)',
        shortLabel: 'จราจร / อุบัติเหตุ',
        bg: 'bg-rose-50 text-rose-800 border-rose-300/80 hover:bg-rose-100',
        dotBg: 'bg-rose-500',
        icon: Car
      };
    case 'Property Damage / Theft':
      return {
        labelTh: 'ทรัพย์สินเสียหาย / ลักทรัพย์ (Property Damage / Theft)',
        shortLabel: 'ทรัพย์สินสูญหาย / ลักทรัพย์',
        bg: 'bg-slate-100 text-slate-800 border-slate-300/80 hover:bg-slate-200',
        dotBg: 'bg-slate-500',
        icon: PackageX
      };
    default:
      return {
        labelTh: 'สอบถามข้อมูลทั่วไป (General Inquiry)',
        shortLabel: 'สอบถามทั่วไป',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300/80 hover:bg-emerald-100',
        dotBg: 'bg-emerald-500',
        icon: HelpCircle
      };
  }
};

export const AiTopicBadge: React.FC<AiTopicBadgeProps> = ({
  topic,
  topics,
  primaryTopic,
  isPrimary = false,
  size = 'md',
  showIcon = true,
  showSparkle = false
}) => {
  if (topics && topics.length > 0) {
    return (
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {topics.map((t) => (
          <AiTopicBadge
            key={t}
            topic={t}
            isPrimary={primaryTopic ? t === primaryTopic : isPrimary}
            size={size}
            showIcon={showIcon}
            showSparkle={showSparkle}
          />
        ))}
      </div>
    );
  }

  if (!topic) return null;

  const config = getTopicConfig(topic);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-md border',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold rounded-lg border',
    lg: 'text-xs px-3 py-1.5 gap-2 font-bold rounded-xl border'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <span
      className={`inline-flex items-center transition-colors shadow-2xs ${config.bg} ${sizeClasses} ${
        isPrimary ? 'ring-2 ring-blue-400/30 ring-offset-1' : ''
      }`}
      title={`AI Auto-Tag: ${config.labelTh}`}
    >
      {showSparkle && <Sparkles className={`${iconSizes} text-amber-500 animate-pulse`} />}
      {showIcon && !showSparkle && <IconComponent className={iconSizes} />}
      <span>{config.shortLabel}</span>
      {isPrimary && (
        <span className="text-[10px] opacity-75 font-normal border-l border-current/30 pl-1 ml-0.5">
          หลัก
        </span>
      )}
    </span>
  );
};

interface AiAutoTagBannerProps {
  autoTags?: AiAutoTagResult;
  tagResult?: AiAutoTagResult;
  compact?: boolean;
  onRefresh?: () => void;
  isAnalyzing?: boolean;
  className?: string;
}

export const AiAutoTagBanner: React.FC<AiAutoTagBannerProps> = ({
  autoTags,
  tagResult,
  compact = false,
  onRefresh,
  isAnalyzing = false,
  className = ''
}) => {
  const effectiveTags = autoTags || tagResult;
  if (!effectiveTags && !isAnalyzing) return null;

  return (
    <div
      className={`bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white ${
        compact ? 'p-2.5 rounded-xl' : 'p-3.5 rounded-2xl'
      } border border-blue-500/30 shadow-md ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-blue-200">ระบบ AI วิเคราะห์และติดแท็กหมวดหมู่อัตโนมัติ</span>
              {effectiveTags?.confidence && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                  {(effectiveTags.confidence * 100).toFixed(0)}% Match
                </span>
              )}
            </div>
            {effectiveTags?.reasoning ? (
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{effectiveTags.reasoning}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">ประมวลผลจัดหมวดหมู่ตามบริบทคำร้องเพื่อช่วยคัดกรองงานให้เจ้าหน้าที่</p>
            )}
          </div>
        </div>

        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>AI กำลังวิเคราะห์ข้อความ...</span>
          </div>
        ) : effectiveTags && effectiveTags.topics ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {effectiveTags.topics.map((t) => (
              <AiTopicBadge
                key={t}
                topic={t}
                isPrimary={t === effectiveTags.primaryTopic}
                size="sm"
                showIcon={true}
              />
            ))}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="text-[10px] text-blue-300 hover:text-white underline ml-1 cursor-pointer"
                title="วิเคราะห์หมวดหมู่อีกครั้ง"
              >
                สแกนใหม่
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
