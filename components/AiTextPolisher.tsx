import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RefreshCw } from 'lucide-react';

interface AiTextPolisherProps {
  originalText?: string;
  text?: string;
  categoryTitle?: string;
  onApplyPolishedText?: (polishedText: string) => void;
  onPolished?: (polishedText: string) => void;
}

export const AiTextPolisher: React.FC<AiTextPolisherProps> = ({
  originalText: propOriginalText,
  text: propText,
  categoryTitle = 'ทั่วไป',
  onApplyPolishedText,
  onPolished
}) => {
  const originalText = propOriginalText || propText || '';
  const handleApply = onApplyPolishedText || onPolished || (() => {});
  const [loading, setLoading] = useState(false);
  const [polishedText, setPolishedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePolish = async () => {
    if (!originalText || (originalText || '').trim().length < 5) {
      setError('กรุณากรอกเหตุผลความจำเป็นอย่างน้อย 5 ตัวอักษรก่อนใช้ AI ช่วยปรับภาษา');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call server API route for Gemini API
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          categoryTitle
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.polishedText) {
          setPolishedText(data.polishedText);
          setLoading(false);
          return;
        }
      }

      // Fallback smart official Thai polisher if API unavailable or key empty
      await new Promise((r) => setTimeout(r, 800));
      const smartPolished = polishThaiTextLocally(originalText, categoryTitle);
      setPolishedText(smartPolished);
    } catch (err) {
      console.warn('Gemini API call fallback to smart local rules:', err);
      const smartPolished = polishThaiTextLocally(originalText, categoryTitle);
      setPolishedText(smartPolished);
    } finally {
      setLoading(false);
    }
  };

  const polishThaiTextLocally = (text: string, category: string): string => {
    let clean = (text || '').trim();
    
    // Prefix politely for formal Thai documents
    if (!clean.startsWith('มีความจำเป็นต้อง') && !clean.startsWith('เนื่องด้วย') && !clean.startsWith('มีความประสงค์')) {
      clean = `มีความประสงค์ขอ${category} เนื่องจาก${clean}`;
    }

    // Add formal conclusion if not present
    if (!clean.endsWith('เพื่อดำเนินการต่อไป') && !clean.endsWith('โปรดพิจารณาอนุมัติ')) {
      clean += ' เพื่อใช้เป็นหลักฐานประกอบการดำเนินการตามขั้นตอนต่อไป จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ';
    }

    return clean;
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>AI Assistant: ช่วยปรับข้อความให้เป็นภาษาทางการ (หนังสือราชการ)</span>
        </div>
        <button
          type="button"
          onClick={handlePolish}
          disabled={loading || !(originalText || '').trim()}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-all shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              กำลังเกลาภาษา...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              ปรับภาษาเป็นทางการ
            </>
          )}
        </button>
      </div>

      {error && <p className="text-rose-600 text-[11px]">{error}</p>}

      {polishedText && (
        <div className="mt-2 bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
          <div className="text-[11px] font-semibold text-indigo-900 border-b border-indigo-100 pb-1 flex items-center justify-between">
            <span>ข้อความภาษาทางการที่แนะนำ:</span>
            <button
              type="button"
              onClick={handlePolish}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[10px]"
            >
              <RefreshCw className="w-3 h-3" />
              ลองปรับใหม่
            </button>
          </div>
          <p className="text-slate-800 leading-relaxed document-font text-sm bg-indigo-50/50 p-2 rounded">
            "{polishedText}"
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onApplyPolishedText(polishedText);
                setPolishedText(null);
              }}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              นำข้อความนี้ไปใช้
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
