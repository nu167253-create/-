import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { syncRequestToKeep, KeepSyncResult } from '../utils/googleKeep';
import { Check, Loader2, ExternalLink } from 'lucide-react';

interface SaveToKeepButtonProps {
  request: RequestItem;
  variant?: 'primary' | 'secondary' | 'compact' | 'outline' | 'amber';
  className?: string;
  onSuccess?: (result: KeepSyncResult) => void;
}

export const KeepIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
  </svg>
);

export const SaveToKeepButton: React.FC<SaveToKeepButtonProps> = ({
  request,
  variant = 'amber',
  className = '',
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [keepUrl, setKeepUrl] = useState<string>('https://keep.google.com/');

  const handleSaveToKeep = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await syncRequestToKeep(request);
      setSynced(true);
      setKeepUrl(result.keepUrl);
      setStatusMessage(result.message);
      if (onSuccess) onSuccess(result);

      // Auto clear message after 6 seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 6000);
    } catch (err: any) {
      console.error('Failed to sync with Keep:', err);
      setStatusMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกไปยัง Google Keep');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenKeep = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(keepUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'compact') {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleSaveToKeep}
          disabled={loading}
          type="button"
          title={`บันทึกคำร้อง ${request.id} ไปยัง Google Keep`}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 ${
            synced
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
          } ${className}`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
          ) : synced ? (
            <Check className="w-3.5 h-3.5 text-amber-700" />
          ) : (
            <KeepIcon className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{synced ? 'บันทึกใน Keep แล้ว' : 'Save to Keep'}</span>
        </button>

        {statusMessage && (
          <div className="absolute bottom-full mb-2 right-0 z-30 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-700 w-64 space-y-1 animate-in fade-in zoom-in-95">
            <p className="font-medium text-amber-300">💡 บันทึกช่วยจำ Google Keep</p>
            <p className="text-slate-300 text-[10px] leading-relaxed">{statusMessage}</p>
            <button
              onClick={handleOpenKeep}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 underline pt-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" /> เปิด Google Keep
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="inline-flex items-center gap-2">
        <button
          onClick={handleSaveToKeep}
          disabled={loading}
          type="button"
          className={`inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
            synced
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400 ring-2 ring-amber-300/50'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 border border-amber-300 hover:shadow-lg'
          } ${className}`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
          ) : synced ? (
            <Check className="w-4 h-4 text-slate-950" />
          ) : (
            <KeepIcon className="w-4 h-4 text-slate-950" />
          )}
          <span>{loading ? 'กำลังซิงค์ Keep...' : synced ? 'บันทึกใน Google Keep แล้ว' : 'Save to Keep (Google Keep)'}</span>
        </button>

        {synced && (
          <button
            onClick={handleOpenKeep}
            type="button"
            title="เปิด Google Keep ในแท็บใหม่"
            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
            <span>เปิด Keep</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="mt-2 bg-slate-900 text-white text-[11px] px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-center max-w-sm animate-in fade-in slide-in-from-top-1">
          <p className="text-amber-300 font-medium">✨ {statusMessage}</p>
        </div>
      )}
    </div>
  );
};
