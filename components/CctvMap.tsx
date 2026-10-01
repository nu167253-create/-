import React, { useState } from 'react';
import { CctvCamera, CctvStatus } from '../types/cctv';
import { updateCctvStatus } from '../data/cctvData';
import { 
  Camera, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertTriangle, 
  Wrench, 
  WifiOff, 
  CheckCircle2, 
  Video, 
  Building, 
  Layers, 
  Eye, 
  Edit3, 
  Info,
  SlidersHorizontal,
  Maximize2,
  Activity,
  RefreshCw,
  Check,
  Send,
  Search
} from 'lucide-react';

interface CctvMapProps {
  cameras: CctvCamera[];
  onSelectCamera: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onUpdateCameraPosition?: (camera: CctvCamera, x: number, y: number) => void;
  onRefreshData?: () => void;
  onEditCamera?: (camera: CctvCamera) => void;
  isOfficerMode?: boolean;
}

export const CctvMap: React.FC<CctvMapProps> = ({
  cameras,
  onSelectCamera,
  onReportRepairForCamera,
  onUpdateCameraPosition,
  onRefreshData,
  onEditCamera,
  isOfficerMode = false
}) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [hoveredCamera, setHoveredCamera] = useState<CctvCamera | null>(null);
  const [activeCamera, setActiveCamera] = useState<CctvCamera | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinEditMode, setIsPinEditMode] = useState<boolean>(false);
  const [selectedForPinMove, setSelectedForPinMove] = useState<string | null>(null);

  // Status Update & Diagnostics Modal
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [isTestingSignal, setIsTestingSignal] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ping: number; fps: number; quality: string } | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<CctvStatus>('online');
  const [statusNoteInput, setStatusNoteInput] = useState<string>('');
  const [statusSuccessMsg, setStatusSuccessMsg] = useState<string | null>(null);

  // Buildings list
  const buildings = Array.from(new Set(cameras.map((c) => c.building)));

  // Filtered list
  const filteredCameras = cameras.filter((c) => {
    const matchBuilding = selectedBuilding === 'all' || c.building === selectedBuilding;
    let matchStatus = true;
    if (selectedStatus === 'operational') matchStatus = c.status === 'online';
    else if (selectedStatus === 'non_operational') matchStatus = c.status !== 'online';
    else if (selectedStatus !== 'all') matchStatus = c.status === selectedStatus;
    
    return matchBuilding && matchStatus;
  });

  // Calculate default coordinates if missing
  const getCameraCoordinates = (cam: CctvCamera, index: number) => {
    if (cam.coordinates && typeof cam.coordinates.x === 'number' && typeof cam.coordinates.y === 'number') {
      return cam.coordinates;
    }
    // Fallback deterministic grid positioning based on index
    const col = index % 4;
    const row = Math.floor(index / 4);
    return {
      x: 20 + col * 20,
      y: 25 + row * 22
    };
  };

  const getStatusColor = (status: CctvStatus) => {
    switch (status) {
      case 'online':
        return {
          bg: 'bg-emerald-500',
          ring: 'ring-emerald-400',
          border: 'border-emerald-600',
          text: 'text-emerald-700',
          pulse: 'bg-emerald-400',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          label: '🟢 ใช้งานได้ปกติ (Operational)'
        };
      case 'faulty':
        return {
          bg: 'bg-rose-500',
          ring: 'ring-rose-400',
          border: 'border-rose-600',
          text: 'text-rose-700',
          pulse: 'bg-rose-400',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
          label: '🔴 ชำรุด/ขัดข้อง (Faulty)'
        };
      case 'maintenance':
        return {
          bg: 'bg-amber-500',
          ring: 'ring-amber-400',
          border: 'border-amber-600',
          text: 'text-amber-700',
          pulse: 'bg-amber-400',
          badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
          label: '🟡 อยู่ระหว่างซ่อม (Maintenance)'
        };
      case 'offline':
      default:
        return {
          bg: 'bg-slate-500',
          ring: 'ring-slate-400',
          border: 'border-slate-600',
          text: 'text-slate-700',
          pulse: 'bg-slate-400',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          label: '⚪ ออฟไลน์ (Offline)'
        };
    }
  };

  // Run live signal test
  const handleRunDiagnostic = () => {
    if (!activeCamera) return;
    setIsTestingSignal(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTestingSignal(false);
      const isOnline = activeCamera.status === 'online';
      setTestResult({
        ping: isOnline ? Math.floor(12 + Math.random() * 25) : 0,
        fps: isOnline ? 30 : 0,
        quality: isOnline ? 'สัญญาณเสถียร (HD 1080p Stream OK)' : 'ไม่มีสัญญาณตอบรับจาก IP Address'
      });
    }, 1200);
  };

  // Submit point status update
  const handleSaveStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCamera) return;
    updateCctvStatus(activeCamera.id, newStatusValue, statusNoteInput);
    
    // Update active state locally
    const updatedCam = {
      ...activeCamera,
      status: newStatusValue,
      notes: statusNoteInput,
      lastMaintenance: new Date().toISOString().slice(0, 10)
    };
    setActiveCamera(updatedCam);
    if (onRefreshData) onRefreshData();

    setStatusSuccessMsg('อัปเดตข้อมูลจุดติดตั้งสำเร็จแล้ว!');
    setTimeout(() => setStatusSuccessMsg(null), 3000);
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPinEditMode || e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPinEditMode) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isPinEditMode) return;
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomLevel(prev => Math.max(0.6, Math.min(2.5, Number((prev + delta).toFixed(2)))));
  };

  const handleResetMap = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Handle map click for repositioning
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinEditMode || !selectedForPinMove || !onUpdateCameraPosition) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to percentage
    const percentX = Math.round((clickX / rect.width) * 100);
    const percentY = Math.round((clickY / rect.height) * 100);

    const targetCam = cameras.find((c) => c.id === selectedForPinMove);
    if (targetCam) {
      onUpdateCameraPosition(targetCam, percentX, percentY);
      setSelectedForPinMove(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Point Select Dropdown */}
          <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>เลือกจุดติดตั้ง:</span>
            <select
              value={activeCamera?.id || ''}
              onChange={(e) => {
                const target = cameras.find((c) => c.id === e.target.value);
                if (target) {
                  setActiveCamera(target);
                  onSelectCamera(target);
                }
              }}
              className="bg-white px-2 py-1 border border-blue-300 rounded-lg outline-none font-bold text-blue-900 cursor-pointer"
            >
              <option value="">-- คลิกเลือกจุดบนแผนที่ หรือเลือกจากรายการที่นี่ --</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.id}] {c.name} ({c.status === 'online' ? '🟢 ใช้งานได้' : '🔴 ชำรุด/ออฟไลน์'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 font-semibold text-slate-700 ml-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span>พื้นที่:</span>
          </div>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="all">ทุกอาคาร ({buildings.length} อาคาร)</option>
            {buildings.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>กรองตามสถานะ:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="operational">🟢 ใช้งานได้ปกติเท่านั้น</option>
            <option value="non_operational">🔴 ใช้งานไม่ได้/ชำรุดเท่านั้น</option>
            <option value="online">ปกติ (Online)</option>
            <option value="faulty">ชำรุด/ขัดข้อง (Faulty)</option>
            <option value="maintenance">อยู่ระหว่างซ่อม</option>
            <option value="offline">ออฟไลน์</option>
          </select>
        </div>

        {/* Zoom & Admin Edit Tools */}
        <div className="flex items-center gap-2">
          {isOfficerMode && onUpdateCameraPosition && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-amber-800">ย้ายหมุด Pin:</span>
              <select
                value={selectedForPinMove || ''}
                onChange={(e) => {
                  setSelectedForPinMove(e.target.value || null);
                  setIsPinEditMode(!!e.target.value);
                }}
                className="text-[11px] px-2 py-1 bg-white border border-amber-300 rounded-lg outline-none font-semibold text-amber-900"
              >
                <option value="">-- เลือกจุดเพื่อย้าย --</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.id}] {c.name.substring(0, 20)}...
                  </option>
                ))}
              </select>
              {isPinEditMode && (
                <span className="text-[10px] text-amber-700 font-medium animate-pulse">
                  *(คลิกวางบนแผนที่)*
                </span>
              )}
            </div>
          )}

          <div className="flex items-center bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 gap-1.5">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(Number((prev - 0.2).toFixed(1)), 0.6))}
              className="p-1 text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="ย่อแผนที่ (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[10px] font-bold text-slate-700 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(Number((prev + 0.2).toFixed(1)), 2.5))}
              className="p-1 text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="ขยายแผนที่ (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetMap}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors ml-0.5 cursor-pointer flex items-center gap-1"
              title="รีเซ็ตตำแหน่งและขนาดมุมมอง"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Layout Container */}
      <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[580px] flex flex-col justify-between">
        
        {/* Map Header Status Summary Bar */}
        <div className="p-3.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 text-xs z-20">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="font-bold tracking-wide text-slate-100">
              แผนผังอาคารและจุดติดตั้งกล้อง CCTV (Site Plan Interactive Map)
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
              แสดง {filteredCameras.length} จาก {cameras.length} จุด
            </span>
          </div>

          {/* Map Status Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="text-emerald-300">ปกติ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="text-rose-300">ชำรุด</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="text-amber-300">อยู่ระหว่างซ่อม</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
              <span className="text-slate-400">ออฟไลน์</span>
            </div>
          </div>
        </div>

        {/* Blueprint Map Container Canvas */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleMapClick}
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`, 
            transformOrigin: 'center' 
          }}
          className={`relative flex-1 w-full min-h-[500px] transition-transform duration-75 select-none p-6 ${
            isPinEditMode 
              ? 'cursor-crosshair bg-slate-950/90' 
              : isDragging 
                ? 'cursor-grabbing' 
                : 'cursor-grab'
          }`}
        >
          {/* Background Technical Grid / Blueprint Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
          
          {/* Simulated Building Boundaries & Floor Layout Graphics */}
          <div className="absolute inset-4 border border-slate-800/90 rounded-2xl pointer-events-none grid grid-cols-12 grid-rows-6 gap-2 p-4">
            {/* Zone 1: อาคารอำนวยการ */}
            <div className="col-span-5 row-span-3 border-2 border-blue-500/20 bg-blue-950/10 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  อาคารอำนวยการ (Main Administration)
                </span>
                <span className="text-[10px] text-blue-300/60 font-mono">3 ชั้น</span>
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>• ชั้น 1: ประตูหลัก & โถงประชาสัมพันธ์</div>
                <div>• ชั้น 2: ห้องประชุมใหญ่</div>
                <div>• ชั้น 3: Data Center & เซิร์ฟเวอร์</div>
              </div>
            </div>

            {/* Zone 2: คลังพัสดุ / อาคารบริการ 2 */}
            <div className="col-span-3 row-span-2 border-2 border-indigo-500/20 bg-indigo-950/10 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-indigo-400">
                อาคารบริการ 2 (คลังพัสดุ)
              </span>
              <span className="text-[10px] text-slate-500">โซนจัดเก็บเอกสารและพัสดุกลาง</span>
            </div>

            {/* Zone 3: ลานจอดรถ B */}
            <div className="col-span-4 row-span-2 border-2 border-slate-700/40 bg-slate-800/20 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">
                ลานจอดรถ B (ผู้มาติดต่อ)
              </span>
              <span className="text-[10px] text-slate-500">พื้นที่กลางแจ้งทิศใต้</span>
            </div>

            {/* Zone 4: อาคารบริการ 1 */}
            <div className="col-span-6 row-span-3 border-2 border-cyan-500/20 bg-cyan-950/10 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                <span>อาคารบริการ 1 (เรียน/ปฏิบัติการ)</span>
                <span className="text-[10px] text-cyan-300/60 font-mono">2 ชั้น</span>
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>• ชั้น 1: โถงกิจกรรมเอนกประสงค์</div>
                <div>• ชั้น 2: ห้องปฏิบัติการคอมพิวเตอร์</div>
              </div>
            </div>

            {/* Zone 5: โรงอาหารกลาง */}
            <div className="col-span-3 row-span-3 border-2 border-emerald-500/20 bg-emerald-950/10 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-400">
                อาคารอเนกประสงค์ / โรงอาหาร
              </span>
              <span className="text-[10px] text-slate-500">ศูนย์อาหารบุคลากร</span>
            </div>

            {/* Zone 6: ลานจอดรถ A */}
            <div className="col-span-3 row-span-3 border-2 border-amber-500/20 bg-amber-950/10 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-400">
                ลานจอดรถ A (บุคลากร)
              </span>
              <span className="text-[10px] text-slate-500">ลานจอดรถมุมทิศเหนือ</span>
            </div>
          </div>

          {/* Render Camera Markers / Pins */}
          {filteredCameras.map((cam, idx) => {
            const coords = getCameraCoordinates(cam, idx);
            const colorScheme = getStatusColor(cam.status);
            const isHovered = hoveredCamera?.id === cam.id;
            const isActive = activeCamera?.id === cam.id;

            return (
              <div
                key={cam.id}
                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300"
                onMouseEnter={() => setHoveredCamera(cam)}
                onMouseLeave={() => setHoveredCamera(null)}
              >
                {/* Marker Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCamera(cam);
                    onSelectCamera(cam);
                  }}
                  className={`group relative flex items-center justify-center p-2 rounded-full border-2 transition-transform duration-200 cursor-pointer ${colorScheme.bg} ${colorScheme.border} ${
                    isHovered || isActive ? 'scale-125 z-30 ring-4 ' + colorScheme.ring : 'scale-100 shadow-lg'
                  }`}
                >
                  {/* Pulse effect for online / faulty */}
                  {(cam.status === 'online' || cam.status === 'faulty') && (
                    <span className={`absolute -inset-1.5 rounded-full animate-ping opacity-50 ${colorScheme.pulse}`} />
                  )}

                  <Camera className="w-4 h-4 text-white relative z-10" />

                  {/* Camera ID Badge Tag */}
                  <span className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900/90 text-white border border-slate-700 shadow-md opacity-90 group-hover:opacity-100">
                    {cam.id}
                  </span>
                </button>

                {/* Hover Tooltip Preview Card */}
                {isHovered && !isActive && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-2xl z-40 text-xs space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-mono text-[11px] font-bold text-blue-400">{cam.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colorScheme.badgeBg}`}>
                        {colorScheme.label}
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 text-xs leading-tight">{cam.name}</p>
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-0.5">
                      <div>📍 {cam.building} ({cam.floor}) - {cam.zone}</div>
                      <div>🌐 IP: <span className="font-mono">{cam.ipAddress}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Camera Live Preview Overlay Modal Drawer */}
        {activeCamera && (
          <div className="p-4 bg-slate-950/95 border-t border-slate-800 text-white z-30 animate-in slide-in-from-bottom duration-200 shadow-2xl">
            <div className="max-w-5xl mx-auto space-y-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Left Info & Live Simulation Feed Box */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Simulated Live Video Preview Box */}
                  <div className="relative w-32 h-20 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                    <Video className="w-8 h-8 text-slate-600" />
                    <div className="absolute top-1 left-1.5 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${activeCamera.status === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                      <span className="text-[9px] font-mono text-slate-400 font-bold">LIVE STREAM</span>
                    </div>
                    <div className="absolute bottom-1 right-1 font-mono text-[8px] text-slate-400 bg-black/70 px-1 rounded">
                      FPS: {activeCamera.status === 'online' ? '30.0' : '0.0'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                        {activeCamera.id}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(activeCamera.status).badgeBg}`}>
                        {getStatusColor(activeCamera.status).label}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">{activeCamera.name}</h4>
                    <p className="text-xs text-slate-400">
                      📍 {activeCamera.building} ({activeCamera.floor}) | โซน: {activeCamera.zone} | IP: <span className="font-mono text-slate-300">{activeCamera.ipAddress}</span>
                    </p>
                    {activeCamera.notes && (
                      <p className="text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                        💬 หมายเหตุ: {activeCamera.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setNewStatusValue(activeCamera.status);
                      setStatusNoteInput(activeCamera.notes || '');
                      setShowDiagnosticModal(true);
                      handleRunDiagnostic();
                    }}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-200" />
                    ทดสอบสัญญาณ & อัปเดตข้อมูล
                  </button>

                  <button
                    onClick={() => onSelectCamera(activeCamera)}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    สเปกกล้องฉบับเต็ม
                  </button>

                  {onEditCamera && (
                    <button
                      onClick={() => {
                        const cam = activeCamera;
                        setActiveCamera(null);
                        onEditCamera(cam);
                      }}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-200" />
                      แก้ไขจุดติดตั้ง
                    </button>
                  )}

                  {(activeCamera.status === 'faulty' || activeCamera.status === 'offline') && onReportRepairForCamera && (
                    <button
                      onClick={() => onReportRepairForCamera(activeCamera)}
                      className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      ยื่นแจ้งซ่อมจุดนี้
                    </button>
                  )}

                  <button
                    onClick={() => setActiveCamera(null)}
                    className="px-3 py-2 text-slate-400 hover:text-white text-xs font-medium"
                  >
                    ปิด
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* DIAGNOSTIC & STATUS UPDATE MODAL FOR SELECTED POINT */}
      {showDiagnosticModal && activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-300 shadow-2xl space-y-5 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {activeCamera.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  ทดสอบระบบ & อัปเดตข้อมูลจุดติดตั้ง
                </h3>
                <p className="text-xs text-slate-500">{activeCamera.name}</p>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Signal Test Box */}
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  การทดสอบสัญญาณการเชื่อมต่อ (Signal Diagnostics)
                </span>
                <button
                  onClick={handleRunDiagnostic}
                  disabled={isTestingSignal}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingSignal ? 'animate-spin' : ''}`} />
                  {isTestingSignal ? 'กำลังทดสอบ...' : 'ทดสอบใหม่'}
                </button>
              </div>

              {isTestingSignal ? (
                <div className="py-4 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">กำลังส่งสัญญาณ Ping ไปยัง IP: {activeCamera.ipAddress}...</p>
                </div>
              ) : testResult ? (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>IP Address: <strong>{activeCamera.ipAddress}</strong></span>
                    <span className={testResult.ping > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {testResult.ping > 0 ? `Latency: ${testResult.ping}ms` : 'TIMEOUT (No Response)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    สถานะสตรีม: <span className="text-slate-200">{testResult.quality}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Status Update Form */}
            <form onSubmit={handleSaveStatusUpdate} className="space-y-4 text-xs">
              {statusSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{statusSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  อัปเดตสถานะการใช้งานจุดติดตั้ง *
                </label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value as CctvStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                >
                  <option value="online">🟢 ใช้งานได้ปกติ (Operational)</option>
                  <option value="faulty">🔴 ชำรุด/ขัดข้อง (Faulty)</option>
                  <option value="maintenance">🟡 อยู่ระหว่างซ่อมแซม (Maintenance)</option>
                  <option value="offline">⚪ ขาดการเชื่อมต่อ (Offline)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  บันทึกเพิ่มเติม / อาการขัดข้อง / หมายเหตุ
                </label>
                <textarea
                  rows={3}
                  value={statusNoteInput}
                  onChange={(e) => setStatusNoteInput(e.target.value)}
                  placeholder="ระบุรายละเอียดอาการชำรุด หรือผลการตรวจสอบจุดติดตั้ง..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  ปิด
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  บันทึกการอัปเดตข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
