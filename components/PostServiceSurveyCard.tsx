import React, { useState, useEffect } from 'react';
import { RequestItem, FeedbackInfo } from '../types/request';
import { saveServiceFeedback } from '../utils/storage';
import { 
  Star, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Award,
  HeartHandshake,
  Edit3
} from 'lucide-react';

interface PostServiceSurveyCardProps {
  request: RequestItem;
  onFeedbackSaved?: (updatedReq: RequestItem) => void;
  className?: string;
}

const FEEDBACK_TAG_OPTIONS = [
  '⚡️ บริการรวดเร็วทันใจ',
  '😊 เจ้าหน้าที่พูดจาสุภาพ',
  '📄 ขั้นตอนชัดเจน เข้าใจง่าย',
  '🏛️ ระบบใช้งานสะดวก',
  '🎯 แก้ไขปัญหาได้ตรงจุด',
  '💡 ได้รับคำแนะนำที่เป็นประโยชน์',
];

const RATING_DESCRIPTIONS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'ควรปรับปรุงอย่างยิ่ง', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  2: { label: 'พอใช้ ต้องพัฒนาเพิ่ม', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  3: { label: 'ปานกลาง ตามมาตรฐาน', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  4: { label: 'ดี ประทับใจ', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  5: { label: 'ดีเยี่ยม ประทับใจอย่างมาก', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

export const PostServiceSurveyCard: React.FC<PostServiceSurveyCardProps> = ({
  request,
  onFeedbackSaved,
  className = ''
}) => {
  const existingFeedback = request.feedback;

  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingFeedback?.tags || []);
  const [comment, setComment] = useState<string>(existingFeedback?.comment || '');
  const [isEditing, setIsEditing] = useState<boolean>(!existingFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.rating || 5);
      setSelectedTags(existingFeedback.tags || []);
      setComment(existingFeedback.comment || '');
      setIsEditing(false);
    } else {
      setRating(5);
      setSelectedTags([]);
      setComment('');
      setIsEditing(true);
    }
  }, [existingFeedback, request.id]);

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
      setIsEditing(false);
      setShowSuccessToast(true);
      if (onFeedbackSaved) {
        onFeedbackSaved(updated);
      }
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    }
  };

  const activeRating = hoverRating || rating;
  const ratingInfo = RATING_DESCRIPTIONS[activeRating] || RATING_DESCRIPTIONS[5];

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-indigo-500/30 overflow-hidden relative ${className}`}>
      {/* Decorative Accent Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-indigo-800/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 rounded-2xl shadow-md font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-md">
                Post-Service Citizen Survey
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                {request.id}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
              แบบประเมินความพึงพอใจการให้บริการ
            </h3>
          </div>
        </div>

        {existingFeedback && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 text-xs px-3 py-1.5 rounded-xl border border-indigo-600/50 transition-colors font-medium cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
            <span>แก้ไขการประเมิน</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {showSuccessToast && (
        <div className="my-4 bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-300 font-bold">บันทึกผลการประเมินเรียบร้อยแล้ว!</p>
            <p className="text-[11px] text-emerald-200/90">ขอบพระคุณสำหรับข้อติชมของท่าน เพื่อการพัฒนาคุณภาพการให้บริการภาครัฐ</p>
          </div>
        </div>
      )}

      {/* View Mode: Already Submitted Feedback Display */}
      {!isEditing && existingFeedback ? (
        <div className="mt-4 space-y-4 relative z-10">
          <div className="bg-indigo-900/40 border border-indigo-700/50 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= existingFeedback.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-indigo-800'
                    }`}
                  />
                ))}
                <span className="ml-2 font-mono font-extrabold text-amber-300 text-sm">
                  {existingFeedback.rating}/5 คะแนน
                </span>
              </div>
              {existingFeedback.createdAt && (
                <span className="text-[10px] text-indigo-300 font-mono">
                  ประเมินเมื่อ: {new Date(existingFeedback.createdAt).toLocaleString('th-TH')} น.
                </span>
              )}
            </div>

            {existingFeedback.tags && existingFeedback.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {existingFeedback.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-indigo-800/80 text-amber-200 border border-indigo-600/60 px-2.5 py-1 rounded-lg font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {existingFeedback.comment ? (
              <div className="bg-slate-950/50 border border-indigo-800/40 p-3 rounded-xl text-xs text-indigo-100 italic leading-relaxed">
                "{existingFeedback.comment}"
              </div>
            ) : (
              <p className="text-xs text-indigo-300 italic">ไม่มีข้อเสนอแนะเพิ่มเติม</p>
            )}
          </div>

          <div className="text-center text-xs text-indigo-300 flex items-center justify-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>ขอบพระคุณความเห็นของท่าน ข้อติชมนี้ถูกส่งไปยังหน่วยงานผู้รับผิดชอบเรียบร้อยแล้ว</span>
          </div>
        </div>
      ) : (
        /* Edit Mode / Interactive Survey Form */
        <form onSubmit={handleSubmit} className="mt-4 space-y-5 relative z-10">
          <p className="text-xs text-indigo-200 leading-relaxed">
            คำร้องของท่านได้รับการอนุมัติ / ปิดเรื่องดำเนินการเสร็จสิ้นแล้ว กรุณาสละเวลาประเมินความพึงพอใจการให้บริการของเจ้าหน้าที่
          </p>

          {/* Star Rating Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-200 flex items-center justify-between">
              <span>1. ให้คะแนนความพึงพอใจในภาพรวม (Overall Rating)</span>
              <span className={`text-xs font-bold ${ratingInfo.color} bg-white/10 px-2 py-0.5 rounded-md`}>
                {ratingInfo.label} ({activeRating}/5)
              </span>
            </label>

            <div className="flex items-center gap-2 bg-indigo-950/60 p-3 rounded-2xl border border-indigo-800/60 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-slate-600 hover:scale-125 transition-transform focus:outline-hidden cursor-pointer"
                  title={`${star} ดาว - ${RATING_DESCRIPTIONS[star]?.label}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= activeRating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                        : 'text-indigo-800 hover:text-indigo-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Feedback Tags */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-indigo-200 block">
              2. ประเด็นที่ท่านประทับใจ (เลือกได้มากกว่า 1 ข้อ)
            </label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-sm scale-102'
                        : 'bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-200 border-indigo-700/60'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Comment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>3. ข้อเสนอแนะหรือความคิดเห็นเพิ่มเติม (ถ้ามี)</span>
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="พิมพ์ข้อเสนอแนะ ข้อคิดเห็น หรือความประทับใจ..."
              className="w-full bg-slate-950/70 border border-indigo-700/60 rounded-xl p-3 text-xs text-white placeholder-indigo-400/60 focus:ring-2 focus:ring-amber-400 outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            {existingFeedback && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition-colors"
              >
                ยกเลิก
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 fill-slate-950" />
                  <span>{existingFeedback ? 'อัปเดตผลการประเมิน' : 'ส่งผลการประเมินความพึงพอใจ'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
