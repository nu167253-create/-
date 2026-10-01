import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  QrCode, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  Video, 
  Search, 
  FileText, 
  Sparkles, 
  MessageCircle,
  Download
} from 'lucide-react';
import { LineIcon } from './LineShareButton';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  trackingId?: string;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'submit',
  trackingId
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<boolean>(true);

  if (!isOpen) return null;

  // Derive base URL cleanly
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const baseUrl = `${currentOrigin}${currentPath}`;

  // Direct URLs
  const mainUrl = baseUrl;
  const cctvUrl = `${baseUrl}?tab=cctv`;
  const trackUrl = trackingId ? `${baseUrl}?trackId=${encodeURIComponent(trackingId)}` : `${baseUrl}?tab=track`;
  const submitUrl = `${baseUrl}?tab=submit`;
  const assistantUrl = `${baseUrl}?tab=assistant`;

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const shareViaLineUrl = (urlToShare: string, title: string) => {
    const message = `${title}\n${urlToShare}`;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  const shareViaFacebook = (urlToShare: string) => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlToShare)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  // QR code image URL via reliable QR API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(mainUrl)}&margin=10`;

  return (
    <div 
      id="share-app-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print"
      onClick={onClose}
    >
      <div 
        id="share-app-modal-container"
        className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 relative border-b border-blue-800/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-xs">
                <Globe className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ทุกคนที่มีลิงก์เข้าใช้ได้ทันที
                  </span>
                  <span className="text-[11px] text-blue-200 font-mono">Public Access</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  แชร์ลิงก์ระบบบริการประชาชน เทศบาลเมืองชัยภูมิ
                </h3>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-share-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-blue-200/90 mt-2">
            สามารถส่งลิงก์เว็บนี้ให้กับประชาชน หรือเจ้าหน้าที่ได้ทันที ใช้งานผ่านเว็บบราวเซอร์บนมือถือ แท็บเล็ต และคอมพิวเตอร์ โดยไม่ต้องดาวน์โหลดแอป
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Primary Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>ลิงก์หน้าหลักของระบบ (Main URL)</span>
              {copiedKey === 'main' && (
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  คัดลอกลิงก์สำเร็จแล้ว!
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={mainUrl}
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-800 font-mono text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                id="btn-copy-main-link"
                onClick={() => copyToClipboard(mainUrl, 'main')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                {copiedKey === 'main' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => shareViaLineUrl(mainUrl, 'ระบบบริการคำร้องขอดูภาพ CCTV และติดตามสถานะ เทศบาลเมืองชัยภูมิ เปิดให้ใช้งานแล้ว:')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <LineIcon className="w-4 h-4 text-white" />
              <span>แชร์เข้า LINE ทันที</span>
            </button>

            <button
              type="button"
              onClick={() => shareViaFacebook(mainUrl)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>แชร์ลง Facebook</span>
            </button>
          </div>

          {/* QR Code Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">QR Code สแกนเข้าเว็บด้วยกล้องมือถือ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                {showQr ? 'ซ่อน' : 'แสดง QR'}
              </button>
            </div>

            {showQr && (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code สำหรับเปิดระบบบริการ CCTV เทศบาลเมืองชัยภูมิ"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <div className="text-xs space-y-2 text-slate-600">
                  <p className="font-semibold text-slate-800">
                    สามารถเปิดกล้องมือถือส่องเพื่อเข้าใช้งานได้ทันที
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    สะดวกสำหรับการพิมพ์ติดป้ายประกาศ ณ ที่ทำการเทศบาลเมืองชัยภูมิ หรือจุดบริการประชาชน เพื่อให้สแกนเข้าถึงแบบฟอร์มได้ทันที
                  </p>
                  <a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    download="cctv-chaiyaphum-qrcode.png"
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs pt-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>บันทึกภาพ QR Code ขนาดเต็ม</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Deep links section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>ลิงก์ตรงสำหรับแต่ละเมนู (Direct Deep-links)</span>
            </label>
            
            <div className="space-y-1.5 text-xs">
              {/* CCTV Map */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Video className="w-4 h-4 text-sky-600 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-800 truncate">แผนที่กล้องวงจรปิด CCTV</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{cctvUrl}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cctvUrl, 'cctv')}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'cctv' ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                </button>
              </div>

              {/* Submit Form */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-800 truncate">แบบฟอร์มยื่นคำร้องใหม่</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{submitUrl}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(submitUrl, 'submit')}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'submit' ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                </button>
              </div>

              {/* Tracking */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Search className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-800 truncate">ตรวจสอบและติดตามสถานะคำร้อง</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{trackUrl}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trackUrl, 'track')}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'track' ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                </button>
              </div>

              {/* AI Assistant */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-800 truncate">ผู้ช่วย AI อัจฉริยะ (Gemini)</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{assistantUrl}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(assistantUrl, 'assistant')}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0 cursor-pointer"
                >
                  {copiedKey === 'assistant' ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>เข้าถึงได้แบบสาธารณะ ไม่จำกัดผู้ใช้งาน</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
