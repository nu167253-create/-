import React, { useState, useRef, useEffect } from 'react';
import { AttachmentFile, DocumentCategoryType } from '../types/request';
import { DOCUMENT_CATEGORIES } from '../data/documentCategories';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  Sparkles, 
  Upload, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
  Crop,
  Eye
} from 'lucide-react';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachScannedFiles: (scannedFiles: AttachmentFile[]) => void;
  defaultDocCategory?: DocumentCategoryType;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onAttachScannedFiles,
  defaultDocCategory = 'id_card'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner settings & mode
  const [docType, setDocType] = useState<DocumentCategoryType>(defaultDocCategory);
  const [filterMode, setFilterMode] = useState<'enhanced' | 'grayscale' | 'color'>('enhanced');
  const [rotation, setRotation] = useState<number>(0);

  // Scanned pages pool
  const [scannedPages, setScannedPages] = useState<{
    id: string;
    dataUrl: string;
    docCategory: DocumentCategoryType;
    filter: 'enhanced' | 'grayscale' | 'color';
    rotation: number;
    title: string;
  }[]>([]);

  // Active snapshot preview
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);

  // Start / Stop Camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(newStream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'ไม่อนุญาตให้เข้าถึงกล้องถ่ายรูป โปรดตรวจสอบการตั้งค่าเบราว์เซอร์หรือใช้วิธีอัปโหลดไฟล์แทน'
          : 'ไม่สามารถเปิดกล้องได้ในอุปกรณ์นี้ หรือไม่มีกล้องที่ใช้งานได้'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCurrentSnapshot(null);
      setScannedPages([]);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const switchCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture image from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply Filter on canvas if needed
    if (filterMode === 'grayscale') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (filterMode === 'enhanced') {
      // Document enhancement (increased contrast + threshold)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const contrast = 1.35; // boost contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        // grayscale convert first
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // contrast
        gray = factor * (gray - 128) + 128;
        gray = Math.max(0, Math.min(255, gray));

        // slight binarization polish for text crispness
        if (gray > 165) gray = Math.min(255, gray * 1.08);
        else if (gray < 90) gray = Math.max(0, gray * 0.85);

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCurrentSnapshot(dataUrl);
  };

  const addCurrentSnapshotToPool = () => {
    if (!currentSnapshot) return;

    const categoryDef = DOCUMENT_CATEGORIES.find(c => c.id === docType);
    const label = categoryDef ? categoryDef.labelTh : 'เอกสารสแกน';

    const newPage = {
      id: `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dataUrl: currentSnapshot,
      docCategory: docType,
      filter: filterMode,
      rotation,
      title: `${label} (สแกนกล้อง #${scannedPages.length + 1})`
    };

    setScannedPages([...scannedPages, newPage]);
    setCurrentSnapshot(null);
  };

  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach(f => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const categoryDef = DOCUMENT_CATEGORIES.find(c => c.id === docType);
          const label = categoryDef ? categoryDef.labelTh : 'เอกสารอัปโหลด';

          setScannedPages(prev => [
            ...prev,
            {
              id: `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              dataUrl,
              docCategory: docType,
              filter: 'color',
              rotation: 0,
              title: f.name || `${label} #${prev.length + 1}`
            }
          ]);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const removePage = (id: string) => {
    setScannedPages(scannedPages.filter(p => p.id !== id));
  };

  const handleFinishAndAttach = () => {
    if (scannedPages.length === 0 && currentSnapshot) {
      // Add pending snapshot first
      const categoryDef = DOCUMENT_CATEGORIES.find(c => c.id === docType);
      const label = categoryDef ? categoryDef.labelTh : 'เอกสารสแกน';

      const page = {
        id: `scanned_${Date.now()}`,
        dataUrl: currentSnapshot,
        docCategory: docType,
        filter: filterMode,
        rotation,
        title: `${label} (สแกนผ่านกล้อง)`
      };

      const attachmentItem: AttachmentFile = {
        id: page.id,
        name: `${page.title}.jpg`,
        size: Math.round(page.dataUrl.length * 0.75),
        type: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        documentCategory: page.docCategory,
        description: 'สแกนผ่านกล้องถ่ายรูปด้วยระบบ Document Scanner',
        dataUrl: page.dataUrl
      };

      onAttachScannedFiles([attachmentItem]);
    } else if (scannedPages.length > 0) {
      const attachmentItems: AttachmentFile[] = scannedPages.map(page => ({
        id: page.id,
        name: `${page.title}.jpg`,
        size: Math.round(page.dataUrl.length * 0.75),
        type: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        documentCategory: page.docCategory,
        description: 'สแกนผ่านกล้องถ่ายรูปด้วยระบบ Document Scanner',
        dataUrl: page.dataUrl
      }));

      onAttachScannedFiles(attachmentItems);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">
                  ระบบสแกนเอกสารยืนยันตัวตน (Smart Camera Scanner)
                </h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  ปรับความคมชัดอัตโนมัติ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ถ่ายภาพบัตรประจำตัวประชาชน ใบลงบันทึกประจำวัน หรือเอกสารสำคัญแนบตรงกับคำร้อง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar: Document Category & Filter Mode */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="font-bold text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              ประเภทเอกสาร:
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentCategoryType)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.labelTh} ({cat.labelEn})
                </option>
              ))}
            </select>
          </div>

          {/* Enhancement Mode Pills */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 text-[11px] flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              โหมดภาพถ่าย:
            </span>
            <div className="inline-flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setFilterMode('enhanced')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterMode === 'enhanced' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                ✨ คมชัดสูง (Scan Filter)
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('grayscale')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterMode === 'grayscale' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⬛ ขาวดำ
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('color')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  filterMode === 'color' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                🎨 สีจริง
              </button>
            </div>
          </div>
        </div>

        {/* Camera View / Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative bg-black/60 min-h-[380px]">
          
          {cameraError ? (
            <div className="max-w-md text-center p-6 bg-slate-900 rounded-2xl border border-rose-500/40 text-xs space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-300">ไม่สามารถเปิดกล้องได้</h4>
                <p className="text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-400">ท่านสามารถอัปโหลดไฟล์ภาพเอกสารจากเครื่องแทนได้:</p>
                <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  <span>เลือกไฟล์ภาพเอกสารจากเครื่อง</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUploadFallback}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : currentSnapshot ? (
            /* Live Captured Snapshot Preview */
            <div className="flex flex-col items-center space-y-4 max-w-lg w-full">
              <div className="relative border-2 border-blue-500 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
                <img
                  src={currentSnapshot}
                  alt="Captured Document"
                  className="max-h-[360px] w-auto object-contain transition-transform"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
                <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ถ่ายภาพเรียบร้อย
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  หมุนภาพ 90°
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentSnapshot(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                  ถ่ายใหม่
                </button>

                <button
                  type="button"
                  onClick={addCurrentSnapshotToPool}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มหน้านี้เข้าคอลเลกชัน
                </button>
              </div>
            </div>
          ) : (
            /* Active Live Video Stream with Document Frame Overlay */
            <div className="relative max-w-xl w-full rounded-2xl overflow-hidden border-2 border-slate-700 bg-black flex items-center justify-center shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[400px] object-cover"
              />

              {/* Document Alignment Frame Overlay */}
              <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                {/* Corner Brackets */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                </div>

                <div className="text-center bg-black/60 backdrop-blur-xs text-emerald-300 font-bold text-xs py-1.5 px-3 rounded-full mx-auto max-w-xs border border-emerald-500/40">
                  📷 วางเอกสาร/บัตรประชาชนให้อยู่ในกรอบ
                </div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                </div>
              </div>

              {/* Shutter Action Button */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={switchCameraFacing}
                  className="p-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-700 backdrop-blur-md cursor-pointer"
                  title="สลับกล้องหน้า/หลัง"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-blue-500/50"
                  title="กดถ่ายภาพสแกน"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-900" />
                  </div>
                </button>

                <label
                  className="p-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-700 backdrop-blur-md cursor-pointer"
                  title="อัปโหลดภาพแทนการถ่าย"
                >
                  <Upload className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUploadFallback}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Hidden Canvas for capture manipulation */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Scanned Pages Collection Bar */}
        {scannedPages.length > 0 && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1 text-emerald-400">
                <Layers className="w-4 h-4" />
                รายการภาพเอกสารที่สแกนแล้ว ({scannedPages.length} หน้า):
              </span>
              <span className="text-[10px] text-slate-400">พร้อมแนบส่งรวมกับคำร้อง</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {scannedPages.map((pg, idx) => (
                <div
                  key={pg.id}
                  className="relative group bg-slate-800 p-1.5 rounded-xl border border-slate-700 shrink-0 w-24 space-y-1"
                >
                  <img
                    src={pg.dataUrl}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-16 object-cover rounded-lg border border-slate-700"
                  />
                  <div className="text-[10px] font-bold text-slate-200 truncate" title={pg.title}>
                    #{idx + 1} {pg.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePage(pg.id)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 group-hover:opacity-100 hover:bg-rose-500 transition-opacity"
                    title="ลบหน้านี้ออก"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleFinishAndAttach}
            disabled={scannedPages.length === 0 && !currentSnapshot}
            className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
              scannedPages.length > 0 || currentSnapshot
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>ยืนยันแนบไฟล์เอกสารที่สแกน ({scannedPages.length || (currentSnapshot ? 1 : 0)} รายการ)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
