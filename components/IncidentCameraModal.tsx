import React, { useState, useRef, useEffect } from 'react';
import { AttachmentFile, DocumentCategoryType } from '../types/request';
import { DOCUMENT_CATEGORIES } from '../data/documentCategories';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  Trash2, 
  Sparkles, 
  Upload, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  Image as ImageIcon,
  CheckCircle2,
  Plus,
  Layers,
  MapPin,
  Clock,
  Zap,
  ZapOff,
  Grid,
  Maximize2,
  Tag,
  FileText
} from 'lucide-react';

interface IncidentCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachPhotos: (photos: AttachmentFile[]) => void;
  defaultLocationName?: string;
  requestTitle?: string;
  initialPreset?: 'broken_camera' | 'incident_site' | 'scene' | 'damage' | 'plate' | 'cctv_point' | 'custom';
}

interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  timestamp: string;
  documentCategory: DocumentCategoryType;
  description: string;
  sizeBytes: number;
}

export const IncidentCameraModal: React.FC<IncidentCameraModalProps> = ({
  isOpen,
  onClose,
  onAttachPhotos,
  defaultLocationName = 'ศูนย์กล้องวงจรปิด เทศบาลเมืองชัยภูมิ',
  requestTitle = '',
  initialPreset = 'broken_camera'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera Stream States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Camera Controls
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [addWatermark, setAddWatermark] = useState(true);
  const [watermarkLocation, setWatermarkLocation] = useState(defaultLocationName);
  const [incidentTagPreset, setIncidentTagPreset] = useState<'broken_camera' | 'incident_site' | 'scene' | 'damage' | 'plate' | 'cctv_point' | 'custom'>(initialPreset);
  const [customTagNote, setCustomTagNote] = useState('');
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);

  // Photo Reel / Captured Collection
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);

  // Sound Effect using Web Audio API
  const playCameraClick = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Short high pitch click followed by mechanical sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      // Audio context may be restricted
    }
  };

  // Enumerate video input devices
  const refreshDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  };

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode, deviceId?: string) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setCameraActive(true);

      // Check for torch/flashlight capability
      const track = newStream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }

      refreshDevices();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('ไม่ได้รับอนุญาตให้เข้าถึงกล้องถ่ายรูป โปรดกดยินยอมหรืออนุญาตการใช้งานกล้องในเบราว์เซอร์');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('ไม่พบอุปกรณ์กล้องถ่ายรูปในเครื่องของคุณ');
      } else {
        setCameraError(`ไม่สามารถเปิดกล้องได้ (${err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกล้อง'})`);
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Front / Back Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Could not toggle torch:', err);
      }
    }
  };

  // Capture Snapshot from Live Video
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Play shutter sound & trigger flash
    playCameraClick();
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // If Watermark / Stamp is enabled, draw official stamp
    if (addWatermark) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const tagText = 
        incidentTagPreset === 'broken_camera' ? '📸 ภาพกล้องชำรุด / อุปกรณ์ขัดข้อง' :
        incidentTagPreset === 'incident_site' ? '📍 ภาพสถานที่เกิดเหตุ / จุดเกิดเหตุ' :
        incidentTagPreset === 'scene' ? '🏙️ สภาพแวดล้อม / ภาพรวมสถานที่' :
        incidentTagPreset === 'damage' ? '💥 ภาพร่องรอยความเสียหาย / การชน' :
        incidentTagPreset === 'plate' ? '🚗 ป้ายทะเบียนรถ / รายละเอียดคู่กรณี' :
        incidentTagPreset === 'cctv_point' ? '📹 จุดติดตั้งกล้อง CCTV ที่สังเกตเห็น' :
        customTagNote || '📸 ภาพถ่ายหลักฐานประกอบคำร้อง';

      // Watermark Bar Background at bottom
      const barHeight = Math.max(50, Math.round(height * 0.08));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Top subtle accent line on watermark bar
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fillRect(0, height - barHeight, width, Math.max(2, Math.round(barHeight * 0.05)));

      // Watermark Text styling
      const fontSize = Math.max(14, Math.round(barHeight * 0.28));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Left Column: Municipality & Location
      const leftY1 = height - (barHeight * 0.65);
      const leftY2 = height - (barHeight * 0.30);
      ctx.fillText(`🏛️ ${watermarkLocation || 'เทศบาลเมืองชัยภูมิ'} | ${tagText}`, 20, leftY1);
      
      ctx.font = `${Math.max(12, Math.round(fontSize * 0.85))}px sans-serif`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`⏱️ บันทึกภาพเมื่อ: ${dateStr} ${timeStr} น. ${requestTitle ? `• เรื่อง: ${requestTitle.substring(0, 30)}` : ''}`, 20, leftY2);

      // Right Column: Official E-Service badge
      ctx.font = `bold ${Math.max(11, Math.round(fontSize * 0.75))}px sans-serif`;
      ctx.fillStyle = '#60a5fa';
      ctx.textAlign = 'right';
      ctx.fillText('CCTV E-SERVICE EVIDENCE', width - 20, leftY1);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `${Math.max(10, Math.round(fontSize * 0.65))}px monospace`;
      ctx.fillText(`PHOTO-ID: ${Date.now().toString().slice(-8)}`, width - 20, leftY2);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const sizeBytes = Math.round((dataUrl.length * 3) / 4);

    const defaultDesc = 
      incidentTagPreset === 'broken_camera' ? 'ภาพถ่ายกล้องวงจรปิดชำรุด / เสาหรืออุปกรณ์ขัดข้อง' :
      incidentTagPreset === 'incident_site' ? 'ภาพถ่ายสถานที่เกิดเหตุ / จุดเกิดเหตุจริง' :
      incidentTagPreset === 'scene' ? 'ภาพถ่ายสภาพแวดล้อมโดยรอบ / พื้นที่เกิดเหตุ' :
      incidentTagPreset === 'damage' ? 'ภาพถ่ายความเสียหาย / รอยชนเฉี่ยว' :
      incidentTagPreset === 'plate' ? 'ภาพถ่ายป้ายทะเบียนรถหรือลักษณะยานพาหนะ' :
      incidentTagPreset === 'cctv_point' ? 'ภาพถ่ายจุดติดตั้งหรือทิศทางกล้อง CCTV' :
      customTagNote || 'ภาพถ่ายหลักฐานประกอบคำร้อง';

    const newPhoto: CapturedPhotoItem = {
      id: `CAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dataUrl,
      timestamp: new Date().toISOString(),
      documentCategory: 'evidence_photo',
      description: defaultDesc,
      sizeBytes
    };

    setCapturedPhotos(prev => [...prev, newPhoto]);
    setActivePreviewIndex(capturedPhotos.length);
  };

  // Fallback Upload from Files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        if (dataUrl) {
          const newPhoto: CapturedPhotoItem = {
            id: `UPLOAD-${Date.now()}-${index}`,
            dataUrl,
            timestamp: new Date().toISOString(),
            documentCategory: 'evidence_photo',
            description: file.name,
            sizeBytes: file.size
          };
          setCapturedPhotos(prev => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Delete a captured photo from the reel
  const handleRemovePhoto = (id: string) => {
    setCapturedPhotos(prev => prev.filter(p => p.id !== id));
    if (activePreviewIndex !== null && activePreviewIndex >= capturedPhotos.length - 1) {
      setActivePreviewIndex(Math.max(0, capturedPhotos.length - 2));
    }
  };

  // Update photo metadata
  const handleUpdateDescription = (id: string, text: string) => {
    setCapturedPhotos(prev => prev.map(p => p.id === id ? { ...p, description: text } : p));
  };

  const handleUpdateCategory = (id: string, cat: DocumentCategoryType) => {
    setCapturedPhotos(prev => prev.map(p => p.id === id ? { ...p, documentCategory: cat } : p));
  };

  // Confirm and Attach all photos to the Request Form
  const handleConfirmAndAttach = () => {
    if (capturedPhotos.length === 0) return;

    const attachmentFiles: AttachmentFile[] = capturedPhotos.map((photo, idx) => ({
      id: `ATTACH-CAM-${Date.now()}-${idx}`,
      name: `ภาพถ่ายเหตุการณ์_${idx + 1}_${new Date().toISOString().slice(0, 10)}.jpg`,
      size: photo.sizeBytes,
      type: 'image/jpeg',
      uploadedAt: photo.timestamp,
      dataUrl: photo.dataUrl,
      uploadedBy: 'ผู้ยื่นคำร้อง (บันทึกภาพผ่านกล้อง)',
      isOfficialDoc: false,
      description: photo.description || 'ภาพถ่ายหลักฐาน / สถานที่เกิดเหตุ',
      documentCategory: photo.documentCategory || 'evidence_photo'
    }));

    onAttachPhotos(attachmentFiles);
    stopCamera();
    onClose();
  };

  // Start camera when modal opens, stop when modal closes
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activePhoto = activePreviewIndex !== null && capturedPhotos[activePreviewIndex] ? capturedPhotos[activePreviewIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] text-slate-100">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>ถ่ายภาพเหตุการณ์ / สถานที่เกิดเหตุ</span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Live Camera
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ใช้กล้องบนอุปกรณ์บันทึกภาพความเสียหาย จุดเกิดเหตุ หรือป้ายทะเบียนแนบในคำร้อง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left / Main Camera Viewport (7 Cols on desktop) */}
          <div className="lg:col-span-7 bg-black p-3 sm:p-4 flex flex-col items-center justify-center relative min-h-[340px] sm:min-h-[420px]">
            
            {/* Shutter flash animation overlay */}
            {isShutterFlashing && (
              <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
            )}

            {/* Video Viewport Container */}
            <div className="relative w-full h-full max-h-[420px] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
              
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Hidden Canvas for capture rendering */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Rule-of-Thirds Grid Overlay */}
              {cameraActive && showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20 flex items-center justify-center">
                    {/* Center Focus Reticle */}
                    <div className="w-12 h-12 border-2 border-blue-400/60 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    </div>
                  </div>
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="" />
                </div>
              )}

              {/* Viewport Top HUD Controls */}
              {cameraActive && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                  <div className="flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700 text-[11px] font-bold text-emerald-400 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>กล้องพร้อมใช้งาน ({facingMode === 'environment' ? 'กล้องหลัง/มุมกว้าง' : 'กล้องหน้า'})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Grid Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowGrid(prev => !prev)}
                      className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                        showGrid 
                          ? 'bg-blue-600/80 text-white border-blue-400' 
                          : 'bg-slate-950/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                      title="เปิด/ปิดเส้นตารางวัดระดับภาพ"
                    >
                      <Grid className="w-4 h-4" />
                    </button>

                    {/* Torch Toggle if available */}
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                          torchOn 
                            ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' 
                            : 'bg-slate-950/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                        title="เปิด/ปิดไฟแฟลชฉายสว่าง"
                      >
                        {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Flip Camera */}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md transition-all active:rotate-180"
                      title="สลับกล้องหน้า/กล้องหลัง"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Watermark Preview Overlay at bottom of video */}
              {cameraActive && addWatermark && (
                <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-700/60 text-[10px] text-slate-300 flex items-center justify-between pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate font-semibold text-white">
                      {watermarkLocation || 'เทศบาลเมืองชัยภูมิ'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-blue-300 font-medium">
                      {incidentTagPreset === 'scene' ? 'จุดเกิดเหตุ' :
                       incidentTagPreset === 'damage' ? 'รอยชน/ความเสียหาย' :
                       incidentTagPreset === 'plate' ? 'ป้ายทะเบียน' :
                       incidentTagPreset === 'cctv_point' ? 'จุดกล้อง' : customTagNote || 'ภาพเหตุการณ์'}
                    </span>
                  </div>
                  <div className="text-slate-400 shrink-0 flex items-center gap-1 text-[9px] font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Auto-Timestamp</span>
                  </div>
                </div>
              )}

              {/* Camera Error Message Screen */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="font-bold text-rose-300 text-sm">ไม่สามารถเข้าถึงกล้องได้</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      ลองเชื่อมต่อใหม่อีกครั้ง
                    </button>
                    
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      เลือกภาพจากเครื่องแทน
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Shutter and Trigger Area */}
            <div className="w-full flex items-center justify-between mt-3 px-2">
              {/* Manual upload button */}
              <label className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm">
                <Upload className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">นำเข้าภาพจากเครื่อง</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Main Shutter Button */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!cameraActive}
                  className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all duration-150 active:scale-90 shadow-xl cursor-pointer ${
                    cameraActive
                      ? 'border-white bg-gradient-to-tr from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 ring-4 ring-rose-500/30'
                      : 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                  title="กดเพื่อบันทึกภาพถ่าย (Shutter)"
                >
                  <div className="w-11 h-11 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <span className="text-[10px] text-slate-400 font-bold">กดเพื่อถ่ายภาพ</span>
              </div>

              {/* Device Selector if multiple cameras exist */}
              {availableDevices.length > 1 ? (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(facingMode, e.target.value);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-2 py-1.5 text-xs max-w-[130px] truncate outline-none"
                >
                  {availableDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `กล้อง ${idx + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-20 text-right text-[11px] text-slate-400">
                  {capturedPhotos.length > 0 && `ถ่ายแล้ว ${capturedPhotos.length} รูป`}
                </div>
              )}
            </div>
          </div>

          {/* Right / Photo Reel & Tagging Panel (5 Cols on desktop) */}
          <div className="lg:col-span-5 bg-slate-850 p-4 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col justify-between space-y-4">
            
            <div className="space-y-3.5">
              
              {/* Photo Watermark & Stamp Settings */}
              <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <label className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>ตราประทับภาพถ่ายหลักฐาน (Timestamp & Tag)</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addWatermark}
                      onChange={(e) => setAddWatermark(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {addWatermark && (
                  <div className="space-y-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">🏷️ เลือกแท็กประเภทเหตุการณ์ที่กำลังถ่าย:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'broken_camera', label: '📸 กล้องชำรุด/ขัดข้อง' },
                          { id: 'incident_site', label: '📍 สถานที่เกิดเหตุ' },
                          { id: 'damage', label: '💥 รอยความเสียหาย' },
                          { id: 'plate', label: '🚗 ป้ายทะเบียนรถ' },
                          { id: 'scene', label: '🏙️ สภาพแวดล้อม' },
                          { id: 'cctv_point', label: '📹 ทิศทางมุมกล้อง' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setIncidentTagPreset(t.id as any)}
                            className={`px-2 py-1.5 rounded-xl border text-left text-[10px] font-semibold transition-all ${
                              incidentTagPreset === t.id
                                ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-xs'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">สถานที่ / พิกัดระบุบนภาพ:</span>
                      <input
                        type="text"
                        value={watermarkLocation}
                        onChange={(e) => setWatermarkLocation(e.target.value)}
                        placeholder="เช่น สี่แยกหน้าโรงพยาบาล / ถนนหฤทัย"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reel of Captured Photos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>รูปถ่ายที่บันทึกแล้ว ({capturedPhotos.length} รูป)</span>
                  </h4>
                  {capturedPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCapturedPhotos([])}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      ล้างรูปทั้งหมด
                    </button>
                  )}
                </div>

                {capturedPhotos.length === 0 ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-400 text-xs space-y-1">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto stroke-1" />
                    <p className="font-bold text-slate-300">ยังไม่มีภาพถ่ายในชุดนี้</p>
                    <p className="text-[11px] text-slate-500">
                      หันกล้องไปยังสถานที่เกิดเหตุหรือเอกสาร แล้วกดปุ่มชัตเตอร์สีแดงเพื่อถ่ายภาพ
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Thumbnail strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                      {capturedPhotos.map((photo, idx) => (
                        <div
                          key={photo.id}
                          onClick={() => setActivePreviewIndex(idx)}
                          className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer group transition-all ${
                            activePreviewIndex === idx
                              ? 'border-blue-500 ring-2 ring-blue-500/30 scale-105'
                              : 'border-slate-700 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={photo.dataUrl}
                            alt="Snapshot"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center font-bold text-white py-0.5">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(photo.id);
                            }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="ลบรูปนี้"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Active Selected Photo Editor */}
                    {activePhoto && (
                      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-700/80 space-y-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <img
                            src={activePhoto.dataUrl}
                            alt="Selected"
                            className="w-20 h-20 object-cover rounded-xl border border-slate-700 shrink-0"
                          />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                📝 คำอธิบายภาพถ่ายนี้:
                              </label>
                              <input
                                type="text"
                                value={activePhoto.description}
                                onChange={(e) => handleUpdateDescription(activePhoto.id, e.target.value)}
                                placeholder="เช่น รอยชนหน้ารถสีขาว ทะเบียน กข-1234"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                🏷️ หมวดหมู่เอกสารแนบ:
                              </label>
                              <select
                                value={activePhoto.documentCategory || 'evidence_photo'}
                                onChange={(e) => handleUpdateCategory(activePhoto.id, e.target.value as DocumentCategoryType)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                              >
                                {DOCUMENT_CATEGORIES.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.labelTh}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                          <span>ขนาดภาพ: {(activePhoto.sizeBytes / 1024).toFixed(1)} KB</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(activePhoto.id)}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="w-3 h-3" />
                            ลบภาพนี้
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Confirm Button */}
            <div className="pt-3 border-t border-slate-750 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmAndAttach}
                disabled={capturedPhotos.length === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  capturedPhotos.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-95 shadow-emerald-950/40'
                    : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>แนบรูปถ่าย {capturedPhotos.length > 0 ? `(${capturedPhotos.length} รูป)` : ''} เข้าระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
