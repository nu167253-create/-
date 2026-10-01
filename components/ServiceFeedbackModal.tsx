import React, { useState, useEffect } from 'react';
import { RequestItem, FeedbackInfo } from '../types/request';
import { saveServiceFeedback } from '../utils/storage';
import { 
  X, 
  Star, 
  Heart, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  ThumbsUp, 
  Send,
  Award,
  ShieldCheck
} from 'lucide-react';

interface ServiceFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem;
  onFeedbackSubmitted?: (updatedReq: RequestItem) => void;
}

const FEEDBACK_TAG_OPTIONS = [
  '⚡️ บริการรวดเร็วทันใจ',
  '😊 เจ้าหน้าที่พูดจาสุภาพ',
  '📄 ขั้นตอนชัดเจน เข้าใจง่าย',
  '🏛️ สถานบริการ/ระบบสะดวก',
  '🎯 แก้ไขปัญหาได้ตรงจุด',
  '💡 ได้รับคำแนะนำที่เป็นประโยชน์',
];

const RATING_DESCRIPTIONS: Record<number, { label: string; color: string }> = {
  1: { label: 'ควรปรับปรุงอย่างยิ่ง', color: 'text-rose-600' },
  2: { label: 'พอใช้ ต้องพัฒนาเพิ่ม', color: 'text-amber-600' },
  3: { label: 'ปานกลาง ตามมาตรฐาน', color: 'text-yellow-600' },
  4: { label: 'ดี ประทับใจ', color: 'text-emerald-600' },
  5: { label: 'ดีเยี่ยม ประทับใจอย่างมาก', color: 'text-blue-600' },
};

export const ServiceFeedbackModal: React.FC<ServiceFeedbackModalProps> = ({
  isOpen,
  onClose,
  request,
  onFeedbackSubmitted,
}) => {
  const existingFeedback = request.feedback;

  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingFeedback?.tags || []);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.rating || 5);
      setSelectedTags(existingFeedback.tags || []);
      setComment(existingFeedback.comment || '');
    } else {
      setRating(5);
      setSelectedTags([]);
      setComment('');
    }
    setIsSuccess(false);
  }, [existingFeedback, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const feedbackData: FeedbackInfo = {
      rating,
      tags: selectedTags,
      comment: (comment || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = saveServiceFeedback(request.id, feedbackData);
    setIsSubmitting(false);

    if (updated) {
      setIsSuccess(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(updated);
      }
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-400/20 text-yellow-300 rounded-2xl border border-yellow-400/30 shadow-xs">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                ประเมินความพึงพอใจการให้บริการ
              </h3>
              <p className="text-xs text-blue-200">
                คำร้องเลขที่ <span className="font-mono font-bold text-yellow-300">{request.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-blue-800/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-800">
                ขอบพระคุณสำหรับข้อติชมของท่าน!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ความคิดเห็นและคะแนนประเมินของท่านถูกบันทึกเรียบร้อยแล้ว เพื่อใช้พัฒนาคุณภาพการให้บริการสารบรรณประชาชนต่อไป
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-slate-800">
            
            {/* Request Summary Badge */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">เรื่องร้องเรียน/คำร้อง</span>
                <span className="font-bold text-slate-800 line-clamp-1">{request.title}</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] shrink-0 border border-emerald-200">
                อนุมัติเรียบร้อยแล้ว
              </span>
            </div>

            {/* Star Rating Section */}
            <div className="text-center space-y-2.5 bg-gradient-to-b from-blue-50/50 to-amber-50/30 p-4 rounded-2xl border border-blue-100">
              <label className="block text-xs font-bold text-slate-700">
                กรุณาให้คะแนนความพึงพอใจโดยรวม (1 - 5 ดาว) *
              </label>

              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors ${
                        star <= currentDisplayRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300 fill-slate-100'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="h-5">
                <span className={`text-xs font-extrabold ${RATING_DESCRIPTIONS[currentDisplayRating]?.color || 'text-slate-600'}`}>
                  {currentDisplayRating} / 5 — {RATING_DESCRIPTIONS[currentDisplayRating]?.label}
                </span>
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700">
                สิ่งที่ประทับใจ / จุดเด่นในการบริการ (เลือกได้มากกว่า 1 ข้อ):
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold scale-[1.02]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments Field */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  ข้อเสนอแนะเพิ่มเติม / ความคิดเห็นของท่าน:
                </span>
                <span className="text-[11px] font-normal text-slate-400">(ไม่บังคับ)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุข้อคิดเห็นเพิ่มเติม เช่น ความรวดเร็ว การให้บริการของเจ้าหน้าที่ หรือข้อเสนอแนะเพื่อการปรับปรุง..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-normal"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'กำลังบันทึก...' : (existingFeedback ? 'อัปเดตการประเมิน' : 'ส่งผลการประเมิน')}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
