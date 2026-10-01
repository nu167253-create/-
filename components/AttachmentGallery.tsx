import React, { useState } from 'react';
import { AttachmentFile, DocumentCategoryType } from '../types/request';
import { getDocumentCategoryDef, DOCUMENT_CATEGORIES } from '../data/documentCategories';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye, 
  Image as ImageIcon, 
  Film, 
  HardDrive, 
  Paperclip, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ShieldCheck, 
  Calendar, 
  User, 
  FileCheck,
  Grid,
  List,
  Filter
} from 'lucide-react';

interface AttachmentGalleryProps {
  attachments: AttachmentFile[];
  title?: string;
  variant?: 'full' | 'compact' | 'card' | 'print';
  showUploadPrompt?: boolean;
  onUploadClick?: () => void;
  emptyMessage?: string;
  className?: string;
}

export const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  attachments = [],
  title,
  variant = 'full',
  showUploadPrompt = false,
  onUploadClick,
  emptyMessage = 'ไม่มีไฟล์เอกสารแนบในคำร้องนี้',
  className = ''
}) => {
  const [selectedImage, setSelectedImage] = useState<AttachmentFile | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(variant === 'compact' ? 'list' : 'grid');

  const formatFileSize = (size: number | string | undefined): string => {
    if (size === undefined || size === null) return '-';
    if (typeof size === 'string') {
      if (size.endsWith('KB') || size.endsWith('MB') || size.endsWith('B')) return size;
      const parsed = parseFloat(size);
      if (isNaN(parsed)) return size;
      size = parsed;
    }
    if (typeof size === 'number') {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return '-';
  };

  const isImageFile = (att: AttachmentFile): boolean => {
    const mime = (att.type || '').toLowerCase();
    const name = (att.name || '').toLowerCase();
    return (
      mime.startsWith('image/') ||
      Boolean(att.dataUrl?.startsWith('data:image')) ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif') ||
      name.endsWith('.bmp') ||
      att.documentCategory === 'evidence_photo'
    );
  };

  const isVideoFile = (att: AttachmentFile): boolean => {
    const mime = (att.type || '').toLowerCase();
    const name = (att.name || '').toLowerCase();
    return (
      mime.startsWith('video/') ||
      name.endsWith('.mp4') ||
      name.endsWith('.mov') ||
      name.endsWith('.avi') ||
      name.endsWith('.mkv')
    );
  };

  const isPdfFile = (att: AttachmentFile): boolean => {
    const mime = (att.type || '').toLowerCase();
    const name = (att.name || '').toLowerCase();
    return mime === 'application/pdf' || name.endsWith('.pdf');
  };

  const isGoogleDriveFile = (att: AttachmentFile): boolean => {
    return Boolean(
      att.driveFileId || 
      att.driveViewUrl || 
      (att.url && att.url.includes('drive.google.com')) || 
      (att.id && att.id.startsWith('GDRIVE-'))
    );
  };

  const filteredAttachments = attachments.filter((att) => {
    if (activeCategoryFilter === 'all') return true;
    if (activeCategoryFilter === 'gdrive') return isGoogleDriveFile(att);
    if (activeCategoryFilter === 'official') return !!att.isOfficialDoc;
    return att.documentCategory === activeCategoryFilter;
  });

  // Extract unique categories for filter tabs
  const categoryCounts: Record<string, number> = {
    all: attachments.length,
    gdrive: attachments.filter(isGoogleDriveFile).length,
    official: attachments.filter(a => a.isOfficialDoc).length
  };

  attachments.forEach(att => {
    if (att.documentCategory) {
      categoryCounts[att.documentCategory] = (categoryCounts[att.documentCategory] || 0) + 1;
    }
  });

  const availableCategories = Object.keys(categoryCounts).filter(k => categoryCounts[k] > 0);

  const openLightbox = (att: AttachmentFile) => {
    setSelectedImage(att);
    setZoomLevel(1);
    setRotation(0);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  // Compact List view
  if (variant === 'compact') {
    if (attachments.length === 0) {
      return (
        <div className="text-xs text-slate-400 italic py-1">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((att) => {
            const isImg = isImageFile(att);
            const isGdrive = isGoogleDriveFile(att);
            const catDef = getDocumentCategoryDef(att.documentCategory);
            const previewSrc = att.dataUrl || (isImg && att.url ? att.url : undefined);

            return (
              <div
                key={att.id}
                className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                  {/* Thumbnail / Icon */}
                  {previewSrc ? (
                    <div 
                      onClick={() => openLightbox(att)}
                      className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 cursor-pointer bg-slate-100 relative group"
                      title="คลิกเพื่อดูภาพขนาดใหญ่"
                    >
                      <img
                        src={previewSrc}
                        alt={att.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isGdrive 
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                        : isPdfFile(att) 
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : isVideoFile(att)
                        ? 'bg-purple-50 text-purple-600 border border-purple-200'
                        : att.isOfficialDoc
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {isGdrive ? (
                        <HardDrive className="w-4 h-4" />
                      ) : isPdfFile(att) ? (
                        <FileText className="w-4 h-4" />
                      ) : isVideoFile(att) ? (
                        <Film className="w-4 h-4" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </div>
                  )}

                  {/* Title & Category Badge */}
                  <div className="overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs text-slate-800 truncate" title={att.name}>
                        {att.name}
                      </p>
                      {isGdrive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                          Drive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                      <span className={`px-1.5 py-0.2 rounded border font-medium ${catDef.badgeBg} ${catDef.badgeText} ${catDef.badgeBorder}`}>
                        {catDef.labelTh}
                      </span>
                      <span>• {formatFileSize(att.size)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {previewSrc && (
                    <button
                      type="button"
                      onClick={() => openLightbox(att)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="ดูภาพตัวอย่าง"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(att.driveViewUrl || att.url) && (
                    <a
                      href={att.driveViewUrl || att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                      title="เปิดใน Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {att.dataUrl && (
                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                      title="ดาวน์โหลดไฟล์"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && renderLightboxModal()}
      </div>
    );
  }

  // Full Gallery View (for Tracking, Modal Tabs, Submission Receipt)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Paperclip className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <span>{title || 'เอกสารแนบประกอบคำร้อง และหลักฐานในระบบ'}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {attachments.length} ไฟล์
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              รวมภาพถ่ายจุดเกิดเหตุ บันทึกประจำวัน สำเนาบัตร และไฟล์จาก Google Drive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          {attachments.length > 0 && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองตารางภาพ (Grid Preview)"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองรายการละเอียด (List View)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showUploadPrompt && onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>แนบไฟล์เพิ่มเติม</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      {availableCategories.length > 1 && attachments.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] text-slate-500 font-semibold shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-slate-400" />
            กรองหมวด:
          </span>
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              activeCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            ทั้งหมด ({categoryCounts.all})
          </button>

          {categoryCounts.gdrive > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('gdrive')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                activeCategoryFilter === 'gdrive'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              <HardDrive className="w-3 h-3" />
              Google Drive ({categoryCounts.gdrive})
            </button>
          )}

          {categoryCounts.official > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('official')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                activeCategoryFilter === 'official'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              ตอบรับทางการ ({categoryCounts.official})
            </button>
          )}

          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id];
            if (!count) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategoryFilter === cat.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : `${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} hover:brightness-95`
                }`}
              >
                {cat.labelTh.split(' / ')[0]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Main Attachments Grid / List */}
      {filteredAttachments.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAttachments.map((att) => {
              const isImg = isImageFile(att);
              const isGdrive = isGoogleDriveFile(att);
              const isPdf = isPdfFile(att);
              const isVid = isVideoFile(att);
              const catDef = getDocumentCategoryDef(att.documentCategory);
              const previewSrc = att.dataUrl || (isImg && att.url ? att.url : undefined);

              return (
                <div
                  key={att.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all overflow-hidden flex flex-col justify-between group"
                >
                  {/* Top Preview Canvas */}
                  <div className="relative bg-slate-100 h-36 w-full overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={att.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => openLightbox(att)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-400 p-4 text-center">
                        {isGdrive ? (
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-200">
                            <HardDrive className="w-8 h-8" />
                          </div>
                        ) : isPdf ? (
                          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200">
                            <FileText className="w-8 h-8" />
                          </div>
                        ) : isVid ? (
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-200">
                            <Film className="w-8 h-8" />
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-200 text-slate-600 rounded-2xl">
                            <Paperclip className="w-8 h-8" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                          {isGdrive ? 'Google Drive Document' : isPdf ? 'PDF Document' : isVid ? 'Video Footage' : 'File Attachment'}
                        </span>
                      </div>
                    )}

                    {/* Top Overlay Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shadow-xs backdrop-blur-xs ${catDef.badgeBg}/90 ${catDef.badgeText} ${catDef.badgeBorder}`}>
                        {catDef.labelTh.split(' / ')[0]}
                      </span>

                      {att.isOfficialDoc ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 shadow-xs border border-amber-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          ทางการ
                        </span>
                      ) : isGdrive ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          Drive
                        </span>
                      ) : null}
                    </div>

                    {/* Quick Preview Eye Button if image */}
                    {previewSrc && (
                      <button
                        type="button"
                        onClick={() => openLightbox(att)}
                        className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs backdrop-blur-xs shadow-md transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>ขยายภาพ</span>
                      </button>
                    )}
                  </div>

                  {/* Bottom Content & Meta */}
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={att.name}>
                        {att.name}
                      </h5>
                      {att.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {att.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {att.uploadedBy || 'ผู้ยื่นคำร้อง'}
                        </span>
                        <span>{formatFileSize(att.size)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {previewSrc && (
                          <button
                            type="button"
                            onClick={() => openLightbox(att)}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>ดูภาพ</span>
                          </button>
                        )}

                        {(att.driveViewUrl || att.url) && (
                          <a
                            href={att.driveViewUrl || att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-colors"
                            title="เปิดดูใน Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>เปิด Drive</span>
                          </a>
                        )}

                        {att.dataUrl && (
                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="inline-flex items-center justify-center p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors"
                            title="ดาวน์โหลดไฟล์"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredAttachments.map((att) => {
              const isImg = isImageFile(att);
              const isGdrive = isGoogleDriveFile(att);
              const isPdf = isPdfFile(att);
              const isVid = isVideoFile(att);
              const catDef = getDocumentCategoryDef(att.documentCategory);
              const previewSrc = att.dataUrl || (isImg && att.url ? att.url : undefined);

              return (
                <div
                  key={att.id}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {previewSrc ? (
                      <div
                        onClick={() => openLightbox(att)}
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 cursor-pointer bg-slate-100 relative group"
                        title="คลิกเพื่อดูภาพขนาดใหญ่"
                      >
                        <img
                          src={previewSrc}
                          alt={att.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isGdrive 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                          : isPdf 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : isVid
                          ? 'bg-purple-50 text-purple-600 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {isGdrive ? <HardDrive className="w-5 h-5" /> : isPdf ? <FileText className="w-5 h-5" /> : isVid ? <Film className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate" title={att.name}>
                          {att.name}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catDef.badgeBg} ${catDef.badgeText} ${catDef.badgeBorder}`}>
                          {catDef.labelTh}
                        </span>

                        {att.isOfficialDoc ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            ตอบรับจากแอดมิน
                          </span>
                        ) : isGdrive ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Google Drive
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {att.description ? `${att.description} • ` : ''}
                        {att.uploadedBy ? `โดย ${att.uploadedBy} • ` : ''}
                        {formatFileSize(att.size)} • {new Date(att.uploadedAt).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {previewSrc && (
                      <button
                        type="button"
                        onClick={() => openLightbox(att)}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>ดูภาพ</span>
                      </button>
                    )}

                    {(att.driveViewUrl || att.url) && (
                      <a
                        href={att.driveViewUrl || att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>เปิด Drive</span>
                      </a>
                    )}

                    {att.dataUrl && (
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
          <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-medium text-slate-500">
            {emptyMessage}
          </p>
          {showUploadPrompt && onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>อัปโหลดเอกสาร / ภาพหลักฐาน</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && renderLightboxModal()}
    </div>
  );

  function renderLightboxModal() {
    if (!selectedImage) return null;
    const catDef = getDocumentCategoryDef(selectedImage.documentCategory);
    const src = selectedImage.dataUrl || selectedImage.url;

    return (
      <div 
        className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        onClick={closeLightbox}
      >
        <div 
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Lightbox Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-sm text-white truncate" title={selectedImage.name}>
                  {selectedImage.name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                  <span className={`px-2 py-0.2 rounded font-semibold ${catDef.badgeBg} ${catDef.badgeText}`}>
                    {catDef.labelTh}
                  </span>
                  <span>{formatFileSize(selectedImage.size)}</span>
                  <span>• อัปโหลดโดย: {selectedImage.uploadedBy || 'ผู้ยื่นคำร้อง'}</span>
                </div>
              </div>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="ย่อขนาดภาพ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="ขยายภาพ"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="หมุนภาพ 90 องศา"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {selectedImage.dataUrl && (
                <a
                  href={selectedImage.dataUrl}
                  download={selectedImage.name}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
                  title="ดาวน์โหลดภาพต้นฉบับ"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition-colors ml-2"
                title="ปิด (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
            {src ? (
              <img
                src={src}
                alt={selectedImage.name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out'
                }}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-slate-500 text-sm text-center">
                ไม่สามารถแสดงภาพตัวอย่างได้
              </div>
            )}
          </div>

          {/* Lightbox Footer Note */}
          {selectedImage.description && (
            <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
              <span><strong>คำอธิบาย:</strong> {selectedImage.description}</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(selectedImage.uploadedAt).toLocaleString('th-TH')} น.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
};
