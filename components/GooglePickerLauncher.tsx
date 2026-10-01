import React, { useState } from 'react';
import { openGooglePicker, GooglePickerPickedFile, PickerViewMode } from '../utils/googlePicker';
import { googleSignIn, getAccessToken } from '../utils/googleAuth';
import { 
  HardDrive, 
  Image as ImageIcon, 
  FileVideo, 
  FileText, 
  UploadCloud, 
  Loader2, 
  Check, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface GooglePickerLauncherProps {
  onFilesPicked: (files: GooglePickerPickedFile[]) => void;
  buttonLabel?: string;
  variant?: 'primary' | 'secondary' | 'compact' | 'card';
  defaultView?: PickerViewMode;
  allowViewSelector?: boolean;
  className?: string;
}

export const GooglePickerLauncher: React.FC<GooglePickerLauncherProps> = ({
  onFilesPicked,
  buttonLabel = 'เลือกไฟล์จาก Google Drive (Google Picker)',
  variant = 'primary',
  defaultView = 'all',
  allowViewSelector = true,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedView, setSelectedView] = useState<PickerViewMode>(defaultView);

  const handleLaunchPicker = async (viewMode: PickerViewMode = selectedView) => {
    setIsLoading(true);
    setErrorMessage(null);
    setShowDropdown(false);

    try {
      // 1. Ensure token or trigger Google sign-in
      let token = await getAccessToken();
      if (!token) {
        const signinResult = await googleSignIn();
        if (!signinResult) {
          throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อเข้าถึง Google Drive');
        }
      }

      // 2. Open Google Picker
      await openGooglePicker({
        viewMode,
        multiSelect: true,
        title: viewMode === 'images' 
          ? 'เลือกภาพถ่ายหลักฐานจาก Google Drive' 
          : viewMode === 'videos' 
          ? 'เลือกคลิปวิดีโอ CCTV จาก Google Drive' 
          : viewMode === 'pdfs' 
          ? 'เลือกเอกสาร PDF / หนังสือราชการ' 
          : viewMode === 'upload'
          ? 'อัปโหลดไฟล์ใหม่เข้า Google Drive'
          : 'เลือกไฟล์และเอกสารจาก Google Drive',
        onPick: (pickedDocs) => {
          setIsLoading(false);
          if (pickedDocs && pickedDocs.length > 0) {
            onFilesPicked(pickedDocs);
          }
        },
        onCancel: () => {
          setIsLoading(false);
        },
        onError: (err) => {
          setIsLoading(false);
          setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเปิด Google Picker');
        }
      });
    } catch (err: any) {
      console.error('Google Picker error:', err);
      setIsLoading(false);
      setErrorMessage(err.message || 'ไม่สามารถเปิด Google Picker ได้');
    }
  };

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-3.5 rounded-2xl border border-indigo-900/60 shadow-md flex flex-col justify-between gap-2.5 ${className}`}>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
            <HardDrive className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>เลือกไฟล์จาก Google Drive</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                Google Picker
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              ดึงภาพถ่าย, บันทึกประจำวัน PDF, หรือคลิป CCTV จาก Google Drive ของคุณโดยตรง
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-900/50 border border-rose-500/40 text-rose-200 text-[10px] p-2 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleLaunchPicker('all')}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-indigo-400/30 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />}
            <span>เลือกไฟล์ทั้งหมด</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleLaunchPicker('images')}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-[11px] py-1.5 px-2 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <ImageIcon className="w-3 h-3 text-sky-400" />
            <span>เลือกเฉพาะรูปภาพ</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={() => handleLaunchPicker('all')}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          title="เปิด Google Picker เพื่อเลือกไฟล์จาก Drive"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5 text-indigo-200" />}
          <span>{buttonLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => handleLaunchPicker(selectedView)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-l-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50 border-r border-indigo-400/30"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <HardDrive className="w-4 h-4 text-indigo-200" />
          )}
          <span>{buttonLabel}</span>
        </button>

        {allowViewSelector && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isLoading}
              className="bg-indigo-700 hover:bg-indigo-600 text-white px-2.5 py-2.5 rounded-r-xl text-xs font-bold shadow-sm transition-colors cursor-pointer border-l border-indigo-500/40"
              title="เลือกมุมมอง Google Picker"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs text-slate-700 animate-fade-in">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  โหมดมุมมอง Google Picker
                </div>
                
                <button
                  type="button"
                  onClick={() => handleLaunchPicker('all')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ไฟล์ทั้งหมดในไดรฟ์ (All Drive Docs)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchPicker('images')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>รูปภาพและภาพถ่าย (Images / Photos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchPicker('videos')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileVideo className="w-3.5 h-3.5 text-purple-600" />
                  <span>คลิปวิดีโอ CCTV (Videos / Footages)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchPicker('pdfs')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>เอกสาร PDF / หนังสือราชการ (PDFs)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchPicker('upload')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>อัปโหลดไฟล์ใหม่เข้า Drive (Drive Upload)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
