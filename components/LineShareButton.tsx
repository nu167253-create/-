import React, { useState } from 'react';
import { RequestItem } from '../types/request';
import { shareViaLine, getRequestTrackingUrl } from '../utils/lineShare';
import { Copy, Check } from 'lucide-react';

interface LineShareButtonProps {
  request: RequestItem;
  variant?: 'primary' | 'secondary' | 'compact';
  className?: string;
}

export const LineIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63h-2.425v1.182h2.425c.349 0 .63.285.63.631 0 .346-.281.63-.63.63h-3.055c-.349 0-.63-.285-.63-.63V8.052c0-.346.281-.63.63-.63h3.055c.349 0 .63.284.63.63 0 .346-.281.63-.63.63h-2.425v1.181h2.425zm-3.83-2.441c.349 0 .63.284.63.63v4.545c0 .346-.281.63-.63.63-.349 0-.63-.284-.63-.63V8.052c0-.346.281-.63.63-.63zm-2.498 0c.349 0 .63.284.63.63v2.871l-2.008-3.328c-.097-.16-.271-.258-.458-.258-.04 0-.08.005-.12.016-.217.058-.367.255-.367.481v4.545c0 .346.281.63.63.63.349 0 .63-.284.63-.63V9.528l2.008 3.328c.097.16.271.258.458.258.04 0 .08-.005.12-.016.217-.058.367-.255.367-.481V8.052c0-.346-.281-.63-.63-.63zm-5.719 0c.349 0 .63.284.63.63v4.545c0 .346-.281.63-.63.63H4.263c-.349 0-.63-.285-.63-.63V8.052c0-.346.281-.63.63-.63.349 0 .63.284.63.63v3.914h2.425c.349 0 .63.285.63.631zM12 2C6.477 2 2 5.925 2 10.767c0 4.329 3.567 7.973 8.384 8.653.326.07.77.215.882.493.101.25.066.643.033.896-.057.438-.262 1.71-.3 2.074-.06.574.265.566.559.37 2.378-1.583 6.425-4.327 8.77-7.406C21.714 14.155 22 12.518 22 10.767 22 5.925 17.523 2 12 2z" />
  </svg>
);

export const LineShareButton: React.FC<LineShareButtonProps> = ({
  request,
  variant = 'primary',
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    shareViaLine(request);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = getRequestTrackingUrl(request.id);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleShareClick}
        type="button"
        title="แชร์รหัสติดตามผ่าน LINE"
        className={`inline-flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 ${className}`}
      >
        <LineIcon className="w-3.5 h-3.5" />
        <span>แชร์ LINE</span>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={handleShareClick}
        type="button"
        className={`inline-flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 hover:shadow-lg ${className}`}
      >
        <LineIcon className="w-4 h-4 text-white" />
        <span>แชร์ผ่าน LINE</span>
      </button>

      <button
        onClick={handleCopyLink}
        type="button"
        title="คัดลอกลิงก์ติดตามคำร้อง"
        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2.5 rounded-xl border border-slate-200 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-bold">คัดลอกลิงก์แล้ว!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-500" />
            <span>คัดลอกลิงก์</span>
          </>
        )}
      </button>
    </div>
  );
};
