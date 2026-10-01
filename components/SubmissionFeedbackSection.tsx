import React, { useState, useEffect } from 'react';
import { RequestItem, FeedbackInfo } from '../types/request';
import { saveServiceFeedback } from '../utils/storage';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Edit3,
  ThumbsUp,
  HeartHandshake
} from 'lucide-react';

interface SubmissionFeedbackSectionProps {
  request: RequestItem;
  onFeedbackSaved?: (updatedRequest: RequestItem) => void;
}

const FEEDBACK_TAGS = [
  '⚡️ ขั้นตอนกระชับ สะดวก',
  '📄 ข้อมูลชัดเจน กรอกง่าย',
  '💾 บันทึกร่างอัตโนมัติช่วยได้มาก',
  '📱 ใช้งานบนมือถือสะดวก',
  '✉️ มีระบบแจ้งเตือนชัดเจน',
  '🔒 รู้สึกปลอดภัยและมั่นใจ',
];

const RATING_LABELS: Record<number, { label: string; colorClass: string }> = {
  1: { label: 'ควรปรับปรุงอย่างยิ่ง', colorClass: 'text-rose-600' },
  2: { label: 'พอใช้ ต้องพัฒนาเพิ่ม', colorClass: 'text-amber-600' },
  3: { label: 'ปานกลาง ตามมาตรฐาน', colorClass: 'text-yellow-600' },
  4: { label: 'ดีเยี่ยม ประทับใจ', colorClass: 'text-emerald-600' },
  5: { label: 'ดีเยี่ยม ประทับใจอย่างมาก', colorClass: 'text-blue-600' },
};

export const SubmissionFeedbackSection: React.FC<SubmissionFeedbackSectionProps> = ({
  request,
  onFeedbackSaved,
}) => {
  const existingFeedback = request.feedback;

  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingFeedback?.tags || []);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(Boolean(existingFeedback));
  const [savedFeedback, setSavedFeedback] = useState<FeedbackInfo | undefined>(existingFeedback);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (request.feedback) {
      setSavedFeedback(request.feedback);
      setRating(request.feedback.rating);
      setSelectedTags(request.feedback.tags || []);
      setComment(request.feedback.comment || '');
      setIsSubmitted(true);
    }
  }, [request]);

  const handleToggleTag = (tag: string) => {
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

    setTimeout(() => {
      const updated = saveServiceFeedback(request.id, feedbackData);
      setIsSubmitting(false);

      if (updated) {
        setSavedFeedback(feedbackData);
        setIsSubmitted(true);
        setShowEditForm(false);
        if (onFeedbackSaved) {
          onFeedbackSaved(updated);
        }
      }
    }, 400);
  };

  const activeDisplayRating = hoverRating || rating;

  if (isSubmitted && !showEditForm && savedFeedback) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl p-5 text-left space-y-3 shadow-xs animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-900">
                  ขอบพระคุณสำหรับคะแนนการประเมิน!
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Saved Feedback
                </span>
              </div>
              <p className="text-xs text-slate-600 pt-0.5">
                ความคิดเห็นของท่านถูกบันทึกเพื่อใช้พัฒนาคุณภาพบริการสารบรรณดิจิทัล
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowEditForm(true)}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-bold bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            แก้ไขการประเมิน
          </button>
        </div>

        {/* Display Submitted Feedback Summary */}
        <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-200/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= savedFeedback.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200 fill-slate-100'
                  }`}
                />
              ))}
              <span className="font-extrabold text-slate-800 text-xs ml-1.5">
                ({savedFeedback.rating}/5 ดาว - {RATING_LABELS[savedFeedback.rating]?.label})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(savedFeedback.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </span>
          </div>

          {savedFeedback.tags && savedFeedback.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {savedFeedback.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {savedFeedback.comment && (
            <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11.5px] leading-relaxed">
              "{savedFeedback.comment}"
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              ประเมินความพึงพอใจการยื่นคำร้องออนไลน์
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h4>
            <p className="text-xs text-slate-500">
              โปรดให้คะแนนเพื่อช่วยพัฒนาคุณภาพบริการดิจิทัลของเทศบาลเมืองชัยภูมิ
            </p>
          </div>
        </div>

        {showEditForm && (
          <button
            onClick={() => setShowEditForm(false)}
            className="text-xs text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
          >
            ยกเลิกแก้ไข
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Star Rating Bar */}
        <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <label className="block font-bold text-slate-700 text-xs">
            คะแนนความพึงพอใจโดยรวมในการใช้บริการวันนี้ (1 - 5 ดาว) *
          </label>

          <div className="flex items-center justify-center gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= activeDisplayRating
                      ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                      : 'text-slate-300 fill-slate-100'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-xs font-extrabold text-slate-800 h-4">
            <span className={RATING_LABELS[activeDisplayRating]?.colorClass}>
              {activeDisplayRating} / 5 — {RATING_LABELS[activeDisplayRating]?.label}
            </span>
          </div>
        </div>

        {/* Quick Tag Options */}
        <div className="space-y-2">
          <label className="block font-bold text-slate-700 text-xs">
            จุดเด่นที่ท่านประทับใจ (เลือกได้มากกว่า 1 ข้อ):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Box */}
        <div className="space-y-1.5">
          <label className="block font-bold text-slate-700 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              ข้อเสนอแนะเพิ่มเติมสำหรับปรับปรุงระบบ e-Service:
            </span>
            <span className="text-[10px] text-slate-400 font-normal">(ไม่บังคับ)</span>
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="เช่น อยากให้เพิ่มช่องทางค้นหา หรือขั้นตอนลงนามรวดเร็วเข้าใจง่าย..."
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'กำลังบันทึก...' : 'ส่งประเมินความพึงพอใจ'}
          </button>
        </div>
      </form>
    </div>
  );
};
