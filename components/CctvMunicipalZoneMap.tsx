import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { CctvCamera, CctvStatus, CctvType } from '../types/cctv';
import { updateCctvStatus } from '../data/cctvData';
import { 
  Camera, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  WifiOff, 
  MapPin, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Search, 
  Filter, 
  Radio, 
  Maximize2, 
  Activity, 
  ShieldCheck, 
  Building, 
  Navigation, 
  Compass, 
  Copy, 
  Check, 
  Edit3, 
  X, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Crosshair,
  Keyboard,
  HelpCircle,
  Locate
} from 'lucide-react';

interface CctvMunicipalZoneMapProps {
  cameras: CctvCamera[];
  onSelectCamera: (camera: CctvCamera) => void;
  onRequestCctvForCamera?: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onEditCamera?: (camera: CctvCamera) => void;
  onRefreshData?: () => void;
  isOfficerMode?: boolean;
}

// Municipal Zone Definition for Chaiyaphum Municipality
interface MunicipalZone {
  id: string;
  code: string;
  name: string;
  thaiName: string;
  description: string;
  color: string;
  fillColor: string;
  borderColor: string;
  landmarks: { name: string; x: number; y: number; icon: string }[];
  center: { x: number; y: number };
  svgPolygon: string; // SVG path or polygon points
}

const MUNICIPAL_ZONES: MunicipalZone[] = [
  {
    id: 'zone-1',
    code: 'ZONE-NW',
    name: 'North-West Heritage & Shrine Zone',
    thaiName: 'โซน 1: ศาลเจ้าพ่อพญาแล - หนองปลาเฒ่า (ทิศตะวันตกเฉียงเหนือ)',
    description: 'พื้นที่สามแยกโนนกอก, ศาลเจ้าพ่อพญาแล, สี่แยกหนองปลาเฒ่า และเส้นทางเชื่อมต่อรอบนอก',
    color: '#0284c7', // sky-600
    fillColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#38bdf8',
    center: { x: 32, y: 35 },
    svgPolygon: '15,18 48,18 48,45 15,45',
    landmarks: [
      { name: 'ศาลเจ้าพ่อพญาแล', x: 26, y: 28, icon: '🏛️' },
      { name: 'สนามแบดมินตันหนองปลาเฒ่า', x: 38, y: 34, icon: '🏸' },
      { name: 'สามแยกโนนกอก', x: 28, y: 38, icon: '🚦' }
    ]
  },
  {
    id: 'zone-2',
    code: 'ZONE-SW',
    name: 'South-West Commercial & Gateway',
    thaiName: 'โซน 2: สี่แยกโรบินสัน - ประตูเมือง (ทิศตะวันตกเฉียงใต้)',
    description: 'ประตูเมืองขาเข้าสายหลัก, ห้างสรรพสินค้าโรบินสัน และถนนเชื่อมต่อวงแหวนรอบนอก',
    color: '#059669', // emerald-600
    fillColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#34d399',
    center: { x: 25, y: 75 },
    svgPolygon: '15,55 48,55 48,90 15,90',
    landmarks: [
      { name: 'โรบินสัน ไลฟ์สไตล์ ชัยภูมิ', x: 20, y: 72, icon: '🏬' },
      { name: 'สี่แยกโรบินสัน (ประตูเมือง)', x: 24, y: 82, icon: '🚦' },
      { name: 'จุดตรวจจราจรขาเข้า', x: 36, y: 78, icon: '👮' }
    ]
  },
  {
    id: 'zone-3',
    code: 'ZONE-C',
    name: 'Central Business & Landmark Hub',
    thaiName: 'โซน 3: ตลาดน้ำพุ - หอนาฬิกา - สี่แยกโรงต้ม (ใจกลางเมือง)',
    description: 'ย่านการค้าพาณิชย์หลัก, ตลาดน้ำพุถนนคนเดิน, สี่แยกโรงต้ม และวงเวียนหอนาฬิกา',
    color: '#d97706', // amber-600
    fillColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#fbbf24',
    center: { x: 55, y: 55 },
    svgPolygon: '48,35 72,35 72,75 48,75',
    landmarks: [
      { name: 'วงเวียนหอนาฬิกา', x: 62, y: 46, icon: '⏰' },
      { name: 'ตลาดน้ำพุถนนคนเดิน', x: 56, y: 64, icon: '⛲' },
      { name: 'สี่แยกโรงต้ม', x: 50, y: 54, icon: '🚦' }
    ]
  },
  {
    id: 'zone-4',
    code: 'ZONE-E',
    name: 'Civic, Medical & Culture Zone',
    thaiName: 'โซน 4: โรงพยาบาลชัยภูมิ - วัดทรงศิลา (ทิศตะวันออก)',
    description: 'ศูนย์กลางการแพทย์และศาสนสถาน, รพ.ชัยภูมิ, วัดทรงศิลาพระอารามหลวง, สี่แยกหนองบ่อ',
    color: '#7c3aed', // violet-600
    fillColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: '#a78bfa',
    center: { x: 78, y: 52 },
    svgPolygon: '72,25 96,25 96,70 72,70',
    landmarks: [
      { name: 'โรงพยาบาลชัยภูมิ', x: 78, y: 64, icon: '🏥' },
      { name: 'วัดทรงศิลา (พระอารามหลวง)', x: 74, y: 44, icon: '🛕' },
      { name: 'สี่แยกหนองบ่อ', x: 80, y: 35, icon: '🚦' },
      { name: 'โรงแรมศิริชัย', x: 84, y: 56, icon: '🏨' }
    ]
  },
  {
    id: 'zone-5',
    code: 'ZONE-NE',
    name: 'Government & Municipal Workshop Zone',
    thaiName: 'โซน 5: กองช่างเทศบาล - ศาลากลาง - โรงเลื่อย (ทิศตะวันออกเฉียงเหนือ)',
    description: 'สำนักงานเทศบาล, อาคารกองช่าง, ศูนย์เครื่องจักรกล และแยกโรงเลื่อย',
    color: '#e11d48', // rose-600
    fillColor: 'rgba(225, 29, 72, 0.08)',
    borderColor: '#fb7185',
    center: { x: 85, y: 22 },
    svgPolygon: '55,8 96,8 96,25 55,25',
    landmarks: [
      { name: 'สำนักงานเทศบาล / กองช่าง', x: 88, y: 16, icon: '🏢' },
      { name: 'แยกโรงเลื่อย', x: 75, y: 18, icon: '🚦' }
    ]
  },
  {
    id: 'zone-6',
    code: 'ZONE-SE',
    name: 'Justice & Education District',
    thaiName: 'โซน 6: สถานศึกษา - ยุติธรรม - ราชทัณฑ์ (ทิศตะวันออกเฉียงใต้)',
    description: 'โรงเรียนสตรีชัยภูมิ, สี่แยกราชทัณฑ์, สี่แยกยุติธรรม และหน่วยงานราชการ',
    color: '#4f46e5', // indigo-600
    fillColor: 'rgba(79, 70, 229, 0.08)',
    borderColor: '#818cf8',
    center: { x: 65, y: 82 },
    svgPolygon: '48,75 96,75 96,95 48,95',
    landmarks: [
      { name: 'โรงเรียนสตรีชัยภูมิ', x: 55, y: 84, icon: '🏫' },
      { name: 'สี่แยกยุติธรรม / ศาล', x: 76, y: 86, icon: '⚖️' },
      { name: 'สี่แยกราชทัณฑ์', x: 86, y: 84, icon: '🏛️' }
    ]
  }
];

export const CctvMunicipalZoneMap: React.FC<CctvMunicipalZoneMapProps> = ({
  cameras,
  onSelectCamera,
  onRequestCctvForCamera,
  onReportRepairForCamera,
  onEditCamera,
  onRefreshData,
  isOfficerMode = false
}) => {
  // View controls
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<'vector' | 'grid' | 'density' | 'fiber'>('vector');
  const [showCoverage, setShowCoverage] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showFiberNetwork, setShowFiberNetwork] = useState<boolean>(true);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);

  // Interactive Zoom and Pan States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchPinchDist, setTouchPinchDist] = useState<number | null>(null);

  const [hoveredCamera, setHoveredCamera] = useState<CctvCamera | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<CctvCamera | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diagnostic Simulation Modal
  const [showDiagnostic, setShowDiagnostic] = useState<boolean>(false);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{ ping: number; fps: number; bandwidth: string; packetLoss: number } | null>(null);

  // Quick Status Edit for Officers
  const [editingStatus, setEditingStatus] = useState<CctvStatus | null>(null);
  const [statusNote, setStatusNote] = useState<string>('');
  const [statusSuccess, setStatusSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Determine which zone a camera belongs to
  const getCameraZone = (cam: CctvCamera): MunicipalZone => {
    const x = cam.coordinates?.x ?? 50;
    const y = cam.coordinates?.y ?? 50;

    // Check specific name or location patterns
    const text = `${cam.name} ${cam.floor} ${cam.zone}`.toLowerCase();
    if (text.includes('โรบินสัน')) return MUNICIPAL_ZONES[1]; // Zone 2
    if (text.includes('โนนกอก') || text.includes('พญาแล') || text.includes('หนองปลาเฒ่า')) return MUNICIPAL_ZONES[0]; // Zone 1
    if (text.includes('น้ำพุ') || text.includes('หอนาฬิกา') || text.includes('โรงต้ม')) return MUNICIPAL_ZONES[2]; // Zone 3
    if (text.includes('โรงพยาบาล') || text.includes('วัดทรงศิลา') || text.includes('หนองบ่อ') || text.includes('ศิริชัย')) return MUNICIPAL_ZONES[3]; // Zone 4
    if (text.includes('กองช่าง') || text.includes('โรงเลื่อย')) return MUNICIPAL_ZONES[4]; // Zone 5
    if (text.includes('สตรีชัยภูมิ') || text.includes('ยุติธรรม') || text.includes('ราชทัณฑ์') || text.includes('เคลิ้ม')) return MUNICIPAL_ZONES[5]; // Zone 6

    // Fallback based on coordinates
    if (x < 48 && y < 50) return MUNICIPAL_ZONES[0];
    if (x < 48 && y >= 50) return MUNICIPAL_ZONES[1];
    if (x >= 48 && x < 72 && y < 75) return MUNICIPAL_ZONES[2];
    if (x >= 72 && y >= 25 && y < 70) return MUNICIPAL_ZONES[3];
    if (y < 25) return MUNICIPAL_ZONES[4];
    return MUNICIPAL_ZONES[5];
  };

  // Filtered cameras based on controls
  const filteredCameras = useMemo(() => {
    return cameras.filter(cam => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = cam.name.toLowerCase().includes(term);
        const matchId = cam.id.toLowerCase().includes(term);
        const matchZone = cam.zone.toLowerCase().includes(term);
        const matchIp = (cam.ipAddress || '').toLowerCase().includes(term);
        const matchChannel = (cam.channel || '').toLowerCase().includes(term);
        const matchCabinet = (cam.cabinetNumber || '').toLowerCase().includes(term);
        const matchAsset = (cam.assetCode || '').toLowerCase().includes(term) || (cam.systemAssetCode || '').toLowerCase().includes(term);
        const matchCommunity = (cam.community || '').toLowerCase().includes(term);
        const matchNotes = (cam.notes || '').toLowerCase().includes(term);
        if (!matchName && !matchId && !matchZone && !matchIp && !matchChannel && !matchCabinet && !matchAsset && !matchCommunity && !matchNotes) return false;
      }

      // Zone filter
      if (selectedZoneId !== 'all') {
        const zone = getCameraZone(cam);
        if (zone.id !== selectedZoneId) return false;
      }

      // Status filter
      if (selectedStatusFilter === 'online' && cam.status !== 'online') return false;
      if (selectedStatusFilter === 'faulty' && cam.status !== 'faulty') return false;
      if (selectedStatusFilter === 'maintenance' && cam.status !== 'maintenance') return false;
      if (selectedStatusFilter === 'offline' && cam.status !== 'offline') return false;
      if (selectedStatusFilter === 'needs_repair' && cam.status !== 'faulty' && cam.status !== 'offline') return false;

      return true;
    });
  }, [cameras, searchTerm, selectedZoneId, selectedStatusFilter]);

  // Zone statistics breakdown
  const zoneStats = useMemo(() => {
    const map = new Map<string, { total: number; online: number; faulty: number; offline: number; maintenance: number }>();
    MUNICIPAL_ZONES.forEach(z => {
      map.set(z.id, { total: 0, online: 0, faulty: 0, offline: 0, maintenance: 0 });
    });

    cameras.forEach(cam => {
      const z = getCameraZone(cam);
      const st = map.get(z.id);
      if (st) {
        st.total += 1;
        if (cam.status === 'online') st.online += 1;
        else if (cam.status === 'faulty') st.faulty += 1;
        else if (cam.status === 'maintenance') st.maintenance += 1;
        else if (cam.status === 'offline') st.offline += 1;
      }
    });

    return map;
  }, [cameras]);

  // Overall Statistics
  const totalCams = cameras.length;
  const onlineCams = cameras.filter(c => c.status === 'online').length;
  const faultyCams = cameras.filter(c => c.status === 'faulty').length;
  const maintenanceCams = cameras.filter(c => c.status === 'maintenance').length;
  const offlineCams = cameras.filter(c => c.status === 'offline').length;
  const readinessPercent = totalCams > 0 ? Math.round((onlineCams / totalCams) * 100) : 0;

  // Pan navigation helpers
  const handlePan = (dx: number, dy: number) => {
    setPanOffset(prev => ({
      x: Math.round(prev.x + dx),
      y: Math.round(prev.y + dy)
    }));
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => {
      const next = Math.max(0.6, Math.min(3.5, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedZoneId('all');
  };

  // Focus and auto-pan to a specific municipal zone
  const handleFocusZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    if (zoneId === 'all') {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    const zone = MUNICIPAL_ZONES.find(z => z.id === zoneId);
    if (!zone) return;

    // SVG coordinate space is 1000 x 650. Target center is (500, 325)
    const targetZoom = 1.75;
    const zoneCenterX = zone.center.x * 10;
    const zoneCenterY = zone.center.y * 6.5;

    // Calculate pan offset to bring zone center to viewport center
    const targetPanX = (500 - zoneCenterX) * 0.7;
    const targetPanY = (325 - zoneCenterY) * 0.7;

    setZoomLevel(targetZoom);
    setPanOffset({
      x: Math.round(targetPanX),
      y: Math.round(targetPanY)
    });
  };

  // Focus and auto-pan to a specific camera
  const handleFocusCamera = (cam: CctvCamera) => {
    setSelectedCamera(cam);
    onSelectCamera(cam);

    const cx = (cam.coordinates?.x ?? 50) * 10;
    const cy = (cam.coordinates?.y ?? 50) * 6.5;
    const targetZoom = 2.2;

    setZoomLevel(targetZoom);
    setPanOffset({
      x: Math.round((500 - cx) * 0.8),
      y: Math.round((325 - cy) * 0.8)
    });
  };

  // Mouse Drag Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button and not on interactive buttons
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    // Bound the pan offset to reasonable limits based on zoom level
    const maxPan = 600 * zoomLevel;
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomLevel(prev => Math.max(0.6, Math.min(3.5, Number((prev + zoomDelta).toFixed(2)))));
  };

  // Touch handlers for mobile pan and pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPanOffset({ x: newX, y: newY });
    } else if (e.touches.length === 2 && touchPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - touchPinchDist;
      if (Math.abs(diff) > 8) {
        setZoomLevel(prev => Math.max(0.6, Math.min(3.5, Number((prev + (diff > 0 ? 0.08 : -0.08)).toFixed(2)))));
        setTouchPinchDist(dist);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchPinchDist(null);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handlePan(0, 40);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlePan(0, -40);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePan(40, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlePan(-40, 0);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoom(0.2);
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoom(-0.2);
          break;
        case '0':
        case 'Escape':
          handleResetView();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Run live diagnostic simulation
  const handleRunDiagnostic = (cam: CctvCamera) => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    setShowDiagnostic(true);
    setTimeout(() => {
      setIsDiagnosing(false);
      const isOnline = cam.status === 'online';
      setDiagnosticResult({
        ping: isOnline ? Math.floor(10 + Math.random() * 18) : 0,
        fps: isOnline ? (cam.type === 'ptz' ? 60 : 30) : 0,
        bandwidth: isOnline ? '4.8 Mbps (H.265 Main Profile)' : '0 Kbps (No Carrier Signal)',
        packetLoss: isOnline ? 0 : 100
      });
    }, 1000);
  };

  // Copy coordinates helper
  const handleCopyCoords = (cam: CctvCamera) => {
    const lat = cam.latitude || 15.8085;
    const lng = cam.longitude || 102.0345;
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedId(cam.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Quick Status Save
  const handleSaveStatus = () => {
    if (!selectedCamera || !editingStatus) return;
    updateCctvStatus(selectedCamera.id, editingStatus, statusNote);
    const updated = {
      ...selectedCamera,
      status: editingStatus,
      notes: statusNote ? `${selectedCamera.notes ? selectedCamera.notes + '\n' : ''}[${new Date().toLocaleDateString('th-TH')}] ${statusNote}` : selectedCamera.notes,
      lastMaintenance: new Date().toISOString().slice(0, 10)
    };
    setSelectedCamera(updated);
    if (onRefreshData) onRefreshData();
    setStatusSuccess(true);
    setEditingStatus(null);
    setStatusNote('');
    setTimeout(() => setStatusSuccess(false), 3000);
  };

  // Helper status color and badges
  const getStatusVisuals = (status: CctvStatus) => {
    switch (status) {
      case 'online':
        return {
          bg: '#10b981', // emerald-500
          border: '#059669',
          glow: 'rgba(16, 185, 129, 0.4)',
          text: 'text-emerald-700',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          label: 'ปกติ (Online)'
        };
      case 'faulty':
        return {
          bg: '#f43f5e', // rose-500
          border: '#e11d48',
          glow: 'rgba(244, 63, 94, 0.45)',
          text: 'text-rose-700',
          badge: 'bg-rose-50 text-rose-800 border-rose-300',
          label: 'ชำรุด/ขัดข้อง (Faulty)'
        };
      case 'maintenance':
        return {
          bg: '#f59e0b', // amber-500
          border: '#d97706',
          glow: 'rgba(245, 158, 11, 0.4)',
          text: 'text-amber-700',
          badge: 'bg-amber-50 text-amber-900 border-amber-300',
          label: 'อยู่ระหว่างซ่อมแซม (Maintenance)'
        };
      case 'offline':
      default:
        return {
          bg: '#64748b', // slate-500
          border: '#475569',
          glow: 'rgba(100, 116, 139, 0.3)',
          text: 'text-slate-700',
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          label: 'ขาดการเชื่อมต่อ (Offline)'
        };
    }
  };

  const getCameraTypeRadius = (type?: CctvType) => {
    switch (type) {
      case 'ptz': return 14; // Speed dome 360/PTZ
      case '360_degree': return 12; // Fisheye 360
      case 'bullet': return 9; // Fixed bullet
      case 'dome': default: return 7; // Fixed dome
    }
  };

  // Check if view has been moved or zoomed
  const isViewModified = zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0;

  return (
    <div className="space-y-4">
      {/* Top Header & Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Chaiyaphum Municipal Geographic Information System (GIS)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              ความพร้อมรวม {readinessPercent}%
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>🗺️ แผนที่การกระจายตัวจุดติดตั้งกล้อง CCTV เขตเทศบาลเมืองชัยภูมิ</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            ระบบแผนที่เชิงโต้ตอบ: รองรับการลากเลื่อน (Pan & Drag), ย่อ/ขยาย (Zoom 60%-350%), ซูมเจาะจงโซนเทศบาล 
            และโครงข่ายสายใยแก้วนำแสง Fiber Optic Backbone
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-800/80 backdrop-blur px-3 py-2 rounded-xl border border-slate-700 text-center min-w-[75px]">
            <div className="text-[10px] text-slate-400 font-medium">ทั้งหมด</div>
            <div className="text-base font-black text-white">{totalCams} <span className="text-[10px] text-slate-400 font-normal">จุด</span></div>
          </div>
          <div 
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'online' ? 'all' : 'online')}
            className={`px-3 py-2 rounded-xl border text-center min-w-[75px] cursor-pointer transition-all ${
              selectedStatusFilter === 'online' 
                ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30' 
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/50'
            }`}
            title="กรองเฉพาะกล้องที่ทำงานปกติ"
          >
            <div className="text-[10px] font-medium">🟢 ปกติ</div>
            <div className="text-base font-black">{onlineCams}</div>
          </div>
          <div 
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'faulty' ? 'all' : 'faulty')}
            className={`px-3 py-2 rounded-xl border text-center min-w-[75px] cursor-pointer transition-all ${
              selectedStatusFilter === 'faulty' 
                ? 'bg-rose-600/30 border-rose-400 text-rose-300 ring-2 ring-rose-500/30' 
                : 'bg-rose-950/40 border-rose-800/60 text-rose-400 hover:bg-rose-900/50'
            }`}
            title="กรองเฉพาะกล้องที่ชำรุด"
          >
            <div className="text-[10px] font-medium">🔴 ชำรุด</div>
            <div className="text-base font-black">{faultyCams}</div>
          </div>
          <div 
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'offline' ? 'all' : 'offline')}
            className={`px-3 py-2 rounded-xl border text-center min-w-[75px] cursor-pointer transition-all ${
              selectedStatusFilter === 'offline' 
                ? 'bg-slate-700 border-slate-400 text-slate-200 ring-2 ring-slate-400/30' 
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="กรองเฉพาะกล้องที่ขาดการเชื่อมต่อ/สายขาด"
          >
            <div className="text-[10px] font-medium">⚪ ออฟไลน์</div>
            <div className="text-base font-black">{offlineCams}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Zone Selector, Search, Layers and Visualization Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="ค้นหาจุดติดตั้ง, รหัสกล้อง, โซน หรือ IP Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-xs font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Zone Selector with Auto-Pan & Zoom Focus */}
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">เลือกโซน (Auto Focus):</span>
            <select
              value={selectedZoneId}
              onChange={(e) => handleFocusZone(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800 text-xs"
            >
              <option value="all">🗺️ ทุกโซนพื้นที่เทศบาล ({totalCams} จุด)</option>
              {MUNICIPAL_ZONES.map((z) => {
                const count = zoneStats.get(z.id)?.total || 0;
                return (
                  <option key={z.id} value={z.id}>
                    {z.thaiName} ({count} จุด)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-700 text-xs"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="online">🟢 ใช้งานได้ปกติ (Online)</option>
              <option value="needs_repair">🔴 ต้องซ่อมแซม (ชำรุด/ออฟไลน์)</option>
              <option value="faulty">🔴 ชำรุด/ขัดข้อง (Faulty)</option>
              <option value="maintenance">🟡 อยู่ระหว่างซ่อม (Maintenance)</option>
              <option value="offline">⚪ ขาดการเชื่อมต่อ (Offline)</option>
            </select>
          </div>

          {/* Map Layer Mode Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 ml-auto">
            <button
              onClick={() => setActiveLayer('vector')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeLayer === 'vector' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แผนที่เชิงผังเมืองและอาณาเขตโซน"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>ผังโซนเทศบาล</span>
            </button>
            <button
              onClick={() => setActiveLayer('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeLayer === 'grid' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แผนผังเมทริกซ์พิกัดตารางกริด"
            >
              <Navigation className="w-3.5 h-3.5 text-indigo-600" />
              <span>ตารางกริดพิกัด</span>
            </button>
            <button
              onClick={() => setActiveLayer('fiber')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeLayer === 'fiber' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="โครงข่ายสายใยแก้วนำแสง Fiber Optic Backbone"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>โครงข่ายไฟเบอร์</span>
            </button>
          </div>
        </div>

        {/* Layer Toggles, Zone Jump Chips & Quick Zoom Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              ชั้นข้อมูล:
            </span>

            <button
              type="button"
              onClick={() => setShowCoverage(!showCoverage)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showCoverage 
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${showCoverage ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>รัศมีเฝ้าระวัง ({showCoverage ? 'เปิด' : 'ปิด'})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLandmarks(!showLandmarks)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showLandmarks 
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🏛️ แลนด์มาร์ก ({showLandmarks ? 'เปิด' : 'ปิด'})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFiberNetwork(!showFiberNetwork)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showFiberNetwork 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>⚡ โครงข่าย Fiber ({showFiberNetwork ? 'เปิด' : 'ปิด'})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showMiniMap 
                  ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🗺️ เรดาร์ย่อ (Radar Mini-Map)</span>
            </button>
          </div>

          {/* Zoom Slider and Percentage Pill */}
          <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="ย่อมุมมอง (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="60"
              max="350"
              step="10"
              value={Math.round(zoomLevel * 100)}
              onChange={(e) => setZoomLevel(Number(e.target.value) / 100)}
              className="w-20 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
              title="ปรับระดับการซูม"
            />

            <span className="font-mono text-[11px] font-extrabold text-blue-900 min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => handleZoom(0.2)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="ขยายมุมมอง (Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetView}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isViewModified
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white'
              }`}
              title="รีเซ็ตตำแหน่งและขนาดมุมมองกลับสู่ค่าเริ่มต้น"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>

            <button
              onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition-colors ml-0.5"
              title="ดูปุ่มลัดคีย์บอร์ดสำหรับการเลื่อนและซูม"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Zone Focus Shortcut Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="font-bold text-slate-600 flex items-center gap-1 shrink-0">
            <Locate className="w-3.5 h-3.5 text-blue-600" />
            <span>ซูมด่วนรายโซน:</span>
          </span>
          {MUNICIPAL_ZONES.map((z) => (
            <button
              key={`focus-${z.id}`}
              type="button"
              onClick={() => handleFocusZone(selectedZoneId === z.id ? 'all' : z.id)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedZoneId === z.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }}></span>
              <span>{z.code}: {z.thaiName.split(':')[1]?.split('(')[0] || z.name}</span>
            </button>
          ))}
        </div>

        {/* Keyboard Shortcuts Helper Drawer */}
        {showShortcutsHelp && (
          <div className="bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-bold text-white">ปุ่มลัดคีย์บอร์ดสำหรับการควบคุมแผนที่:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">↓</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">→</kbd> เลื่อนมุมมอง (Pan)</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">+</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">-</kbd> ย่อ/ขยาย (Zoom)</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">Scroll</kbd> ลูกกลิ้งเมาส์</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">0</kbd> หรือ <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600">Esc</kbd> รีเซ็ตมุมมอง</span>
            </div>
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Map Canvas and Zone Card Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left / Main: SVG Vector Interactive Municipal Map (Span 3 cols) */}
        <div 
          ref={containerRef}
          className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative min-h-[590px]"
        >
          {/* Map Top Floating Overlay Info */}
          <div className="absolute top-3 left-3 z-20 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700 text-white text-xs flex items-center gap-3 shadow-lg pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-slate-200">
                {selectedZoneId === 'all' ? 'ผังรวมทุกโซนเทศบาลเมืองชัยภูมิ' : MUNICIPAL_ZONES.find(z => z.id === selectedZoneId)?.thaiName}
              </span>
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
              แสดง {filteredCameras.length} จุด
            </span>
          </div>

          {/* Map Legend Overlay (Top Right) */}
          <div className="absolute top-3 right-3 z-20 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 text-[11px] text-slate-300 space-y-1.5 shadow-lg hidden sm:block pointer-events-none">
            <div className="font-bold text-slate-200 text-[10px] uppercase tracking-wider border-b border-slate-800 pb-1">
              สัญลักษณ์สถานะ
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-300">ปกติ ({onlineCams})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-rose-300">ชำรุด ({faultyCams})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-300">ซ่อมแซม ({maintenanceCams})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-400">ออฟไลน์ ({offlineCams})</span>
              </div>
            </div>
          </div>

          {/* Floating On-Map Navigation D-Pad & Zoom Controls Widget (Bottom-Left) */}
          <div className="absolute bottom-16 left-3 z-20 flex flex-col gap-2 pointer-events-auto">
            {/* D-Pad Navigator */}
            <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl flex flex-col items-center gap-1">
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">
                PAN & NAV
              </div>

              {/* Up */}
              <button
                type="button"
                onClick={() => handlePan(0, 50)}
                className="w-7 h-7 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="เลื่อนขึ้นบน (North)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* Left, Center/Reset, Right */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePan(50, 0)}
                  className="w-7 h-7 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
                  title="เลื่อนไปทางซ้าย (West)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="w-7 h-7 bg-blue-950 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg flex items-center justify-center transition-colors border border-blue-800/80 shadow-2xs cursor-pointer active:scale-95"
                  title="รีเซ็ตและจัดกึ่งกลาง (Center & Reset)"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePan(-50, 0)}
                  className="w-7 h-7 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
                  title="เลื่อนไปทางขวา (East)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Down */}
              <button
                type="button"
                onClick={() => handlePan(0, -50)}
                className="w-7 h-7 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="เลื่อนลงล่าง (South)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <div className="w-full h-px bg-slate-800 my-0.5"></div>

              {/* Quick Zoom In / Out Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleZoom(0.25)}
                  className="w-7 h-7 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95 font-bold text-xs"
                  title="ขยาย (+25%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(-0.25)}
                  className="w-7 h-7 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95 font-bold text-xs"
                  title="ย่อ (-25%)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Radar Mini-Map Viewport Thumbnail (Bottom-Right) */}
          {showMiniMap && (
            <div className="absolute bottom-16 right-3 z-20 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl hidden md:block pointer-events-auto">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                <span>RADAR MINI-MAP</span>
                <span className="font-mono text-blue-400">{Math.round(zoomLevel * 100)}%</span>
              </div>
              <div 
                className="w-36 h-24 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = (e.clientX - rect.left) / rect.width; // 0 to 1
                  const clickY = (e.clientY - rect.top) / rect.height; // 0 to 1
                  const targetSvgX = clickX * 1000;
                  const targetSvgY = clickY * 650;
                  setPanOffset({
                    x: Math.round((500 - targetSvgX) * (zoomLevel * 0.7)),
                    y: Math.round((325 - targetSvgY) * (zoomLevel * 0.7))
                  });
                }}
                title="คลิกที่เรดาร์เพื่อเลื่อนมุมมองไปยังตำแหน่งนั้นทันที"
              >
                <svg viewBox="0 0 1000 650" className="w-full h-full opacity-60">
                  {/* Mini Zones */}
                  {MUNICIPAL_ZONES.map(z => {
                    const rawPoints = z.svgPolygon.split(' ');
                    const scaledPoints = rawPoints.map(p => {
                      const [px, py] = p.split(',').map(Number);
                      return `${px * 10},${py * 6.5}`;
                    }).join(' ');
                    return (
                      <polygon
                        key={`mini-${z.id}`}
                        points={scaledPoints}
                        fill={z.color}
                        fillOpacity={0.25}
                        stroke={z.color}
                        strokeWidth="1.5"
                      />
                    );
                  })}
                  {/* Mini Road */}
                  <path d="M 60,480 L 300,480 Q 420,480 500,400 T 680,300 L 940,300" fill="none" stroke="#475569" strokeWidth="18" />
                  {/* Mini Camera Dots */}
                  {filteredCameras.map((c, i) => (
                    <circle
                      key={`mini-dot-${c.id}`}
                      cx={(c.coordinates?.x ?? (20 + (i % 5) * 15)) * 10}
                      cy={(c.coordinates?.y ?? (25 + Math.floor(i / 5) * 14)) * 6.5}
                      r="10"
                      fill={c.status === 'online' ? '#10b981' : c.status === 'faulty' ? '#f43f5e' : '#64748b'}
                    />
                  ))}
                </svg>

                {/* Dynamic Viewport View Rectangle */}
                <div
                  className="absolute border-2 border-blue-400 bg-blue-400/20 rounded pointer-events-none transition-all duration-75 shadow-xs"
                  style={{
                    width: `${Math.max(15, Math.min(100, 100 / zoomLevel))}%`,
                    height: `${Math.max(15, Math.min(100, 100 / zoomLevel))}%`,
                    left: `${Math.max(0, Math.min(85, 50 - (50 / zoomLevel) - (panOffset.x / (12 * zoomLevel))))}%`,
                    top: `${Math.max(0, Math.min(85, 50 - (50 / zoomLevel) - (panOffset.y / (8 * zoomLevel))))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Interactive Pan & Zoom Canvas Area */}
          <div 
            className={`flex-1 w-full h-full min-h-[580px] p-2 flex items-center justify-center overflow-hidden bg-radial from-slate-900 to-slate-950 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div 
              className="w-full h-full relative transition-transform duration-75 origin-center will-change-transform"
              style={{ 
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` 
              }}
            >
              <svg
                viewBox="0 0 1000 650"
                className="w-full h-full select-none"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
              >
                <defs>
                  {/* Grid Pattern */}
                  <pattern id="municipalGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                  </pattern>
                  <pattern id="denseGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56, 189, 248, 0.03)" strokeWidth="0.5" />
                  </pattern>

                  {/* Fiber line gradient */}
                  <linearGradient id="fiberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
                  </linearGradient>

                  {/* Damaged Fiber line gradient */}
                  <linearGradient id="fiberDamageGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Base Background Rect */}
                <rect width="1000" height="650" fill="#090d16" />
                <rect width="1000" height="650" fill="url(#municipalGrid)" />
                {activeLayer === 'grid' && <rect width="1000" height="650" fill="url(#denseGrid)" />}

                {/* River / Natural Waterway (Lam Pao / Huai Lam Kradon) */}
                <path
                  d="M 50,40 Q 180,120 320,180 T 520,320 T 750,420 T 950,580"
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="14"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                />
                <text x="80" y="70" fill="#38bdf8" fontSize="10" opacity="0.6" fontStyle="italic">ลำห้วยธรรมชาติ / ทางน้ำเทศบาล</text>

                {/* Municipal Boundary Outer Ring */}
                <rect
                  x="40"
                  y="40"
                  width="920"
                  height="570"
                  rx="24"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />

                {/* Major Municipal Road Network */}
                {/* 1. Highway 201 Ring Road (West to East) */}
                <path d="M 60,480 L 300,480 Q 420,480 500,400 T 680,300 L 940,300" fill="none" stroke="#1e293b" strokeWidth="22" strokeLinecap="round" />
                <path d="M 60,480 L 300,480 Q 420,480 500,400 T 680,300 L 940,300" fill="none" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
                <path d="M 60,480 L 300,480 Q 420,480 500,400 T 680,300 L 940,300" fill="none" stroke="#facc15" strokeWidth="1.5" strokeDasharray="8 6" />

                {/* 2. Main Avenue: Robinson to Fountain Market & Wat Song Sila (Diagonal) */}
                <path d="M 180,550 L 550,380 L 820,360 L 920,240" fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
                <path d="M 180,550 L 550,380 L 820,360 L 920,240" fill="none" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />

                {/* 3. North Avenue: Nong Pla Thao -> Clock Tower -> Engineering Dept */}
                <path d="M 280,180 L 550,380 L 620,280 L 880,140" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
                <path d="M 280,180 L 550,380 L 620,280 L 880,140" fill="none" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />

                {/* Road Labels */}
                <text x="120" y="500" fill="#94a3b8" fontSize="9" fontWeight="bold" opacity="0.75">ถ.นิเวศน์รัตน์ (ทล.201)</text>
                <text x="630" y="270" fill="#94a3b8" fontSize="9" fontWeight="bold" opacity="0.75">ถ.หฤทัย / หอนาฬิกา</text>
                <text x="740" y="380" fill="#94a3b8" fontSize="9" fontWeight="bold" opacity="0.75">ถ.ยุติธรรม - รพ.ชัยภูมิ</text>

                {/* Municipal Zones Poly Regions (Interactive) */}
                {MUNICIPAL_ZONES.map((zone) => {
                  const isSelected = selectedZoneId === zone.id;
                  const stats = zoneStats.get(zone.id);

                  // Convert normalized polygon points (percentage to 1000x650)
                  const rawPoints = zone.svgPolygon.split(' ');
                  const scaledPoints = rawPoints.map(p => {
                    const [px, py] = p.split(',').map(Number);
                    return `${(px * 10).toFixed(0)},${(py * 6.5).toFixed(0)}`;
                  }).join(' ');

                  const centerX = zone.center.x * 10;
                  const centerY = zone.center.y * 6.5;

                  return (
                    <g 
                      key={zone.id} 
                      className="cursor-pointer transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusZone(selectedZoneId === zone.id ? 'all' : zone.id);
                      }}
                    >
                      <polygon
                        points={scaledPoints}
                        fill={isSelected ? zone.color : zone.fillColor}
                        fillOpacity={isSelected ? 0.22 : 0.08}
                        stroke={isSelected ? zone.color : zone.borderColor}
                        strokeWidth={isSelected ? 3 : 1}
                        strokeDasharray={isSelected ? 'none' : '4 4'}
                        className="hover:fill-opacity-25 transition-all"
                      />

                      {/* Zone Center Label Badge */}
                      <g transform={`translate(${centerX}, ${centerY})`}>
                        <rect
                          x="-80"
                          y="-16"
                          width="160"
                          height="32"
                          rx="8"
                          fill="#0f172a"
                          fillOpacity="0.88"
                          stroke={isSelected ? zone.color : '#334155'}
                          strokeWidth={isSelected ? 2 : 1.5}
                        />
                        <text
                          x="0"
                          y="-2"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {zone.code}
                        </text>
                        <text
                          x="0"
                          y="10"
                          textAnchor="middle"
                          fill={zone.borderColor}
                          fontSize="8"
                          fontWeight="medium"
                        >
                          กล้อง {stats?.total || 0} จุด ({stats?.online || 0} ปกติ)
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Fiber Optic Backbone Lines Layer */}
                {showFiberNetwork && (
                  <g>
                    {/* Normal Fiber lines */}
                    <path
                      d="M 180,550 L 220,530 L 550,420 L 580,440 L 650,380 L 760,370 L 820,380"
                      fill="none"
                      stroke="url(#fiberGlow)"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      opacity="0.85"
                    />
                    <path
                      d="M 550,420 L 620,340 L 680,300 L 720,310 L 780,400"
                      fill="none"
                      stroke="url(#fiberGlow)"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      opacity="0.85"
                    />

                    {/* Damaged Fiber Section (Fire Damage Near Nong Pla Thao to Phaya Lae) */}
                    <path
                      d="M 280,230 L 350,250 L 380,260 L 450,360"
                      fill="none"
                      stroke="url(#fiberDamageGlow)"
                      strokeWidth="3.5"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                    <text x="310" y="240" fill="#f43f5e" fontSize="9" fontWeight="bold">⚠️ จุดสายไฟเบอร์ขาด (ไฟไหม้)</text>

                    {/* Underground Project Cut Line near Rong Tom */}
                    <path
                      d="M 450,360 L 480,380"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3"
                      strokeDasharray="3 3"
                    />
                    <text x="430" y="375" fill="#f43f5e" fontSize="8" fontWeight="bold">⚠️ สายขาด (นำสายลงดิน)</text>
                  </g>
                )}

                {/* Landmarks Markers Layer */}
                {showLandmarks && MUNICIPAL_ZONES.map(z => (
                  <g key={`landmarks-${z.id}`}>
                    {z.landmarks.map((lm, idx) => (
                      <g key={idx} transform={`translate(${lm.x * 10}, ${lm.y * 6.5})`}>
                        <circle r="12" fill="#1e293b" fillOpacity="0.8" stroke="#475569" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fontSize="11">{lm.icon}</text>
                        <text
                          x="0"
                          y="18"
                          textAnchor="middle"
                          fill="#cbd5e1"
                          fontSize="8"
                          fontWeight="bold"
                          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                        >
                          {lm.name}
                        </text>
                      </g>
                    ))}
                  </g>
                ))}

                {/* Camera Coverage Cones / Circles Layer */}
                {showCoverage && filteredCameras.map((cam) => {
                  const cx = (cam.coordinates?.x ?? 50) * 10;
                  const cy = (cam.coordinates?.y ?? 50) * 6.5;
                  const radius = getCameraTypeRadius(cam.type) * 4;
                  const visuals = getStatusVisuals(cam.status);
                  const isHovered = hoveredCamera?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  return (
                    <g key={`coverage-${cam.id}`} opacity={isSelected || isHovered ? 0.6 : 0.2}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={visuals.bg}
                        stroke={visuals.border}
                        strokeWidth="1.5"
                        strokeDasharray={cam.type === 'ptz' ? 'none' : '3 3'}
                      />
                      {/* Direction arrow / Field of View cone */}
                      {cam.type === 'bullet' && (
                        <path
                          d={`M ${cx},${cy} L ${cx - radius * 0.7},${cy - radius} L ${cx + radius * 0.7},${cy - radius} Z`}
                          fill={visuals.bg}
                          fillOpacity="0.3"
                        />
                      )}
                    </g>
                  );
                })}

                {/* CCTV Camera Pins (Interactive Elements) */}
                {filteredCameras.map((cam, index) => {
                  const cx = (cam.coordinates?.x ?? (20 + (index % 5) * 15)) * 10;
                  const cy = (cam.coordinates?.y ?? (25 + Math.floor(index / 5) * 14)) * 6.5;
                  const visuals = getStatusVisuals(cam.status);
                  const isHovered = hoveredCamera?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  return (
                    <g
                      key={cam.id}
                      transform={`translate(${cx}, ${cy})`}
                      className="cursor-pointer transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusCamera(cam);
                      }}
                      onMouseEnter={() => setHoveredCamera(cam)}
                      onMouseLeave={() => setHoveredCamera(null)}
                    >
                      {/* Pulsing ring for online or faulty */}
                      {(cam.status === 'online' || cam.status === 'faulty') && (
                        <circle
                          r={isSelected ? 18 : 12}
                          fill="none"
                          stroke={visuals.bg}
                          strokeWidth="1.5"
                          opacity={isSelected ? 0.8 : 0.4}
                          className="animate-ping"
                        />
                      )}

                      {/* Selection Highlight Ring */}
                      {isSelected && (
                        <circle
                          r="16"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                        />
                      )}

                      {/* Base Camera Pin Circle */}
                      <circle
                        r={isHovered || isSelected ? 10 : 8}
                        fill={visuals.bg}
                        stroke="#ffffff"
                        strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
                      />

                      {/* Camera Type Mini-Icon / Dot */}
                      <circle
                        r="3"
                        fill="#ffffff"
                      />

                      {/* Camera ID Pin Label */}
                      <g transform="translate(0, 14)">
                        <rect
                          x="-32"
                          y="-7"
                          width="64"
                          height="14"
                          rx="4"
                          fill="#0f172a"
                          fillOpacity="0.9"
                          stroke={visuals.border}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {cam.id.replace('IPCamera ', 'CAM-')}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Map Bottom Footer Information Bar */}
          <div className="p-3 bg-slate-950/95 border-t border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 text-xs z-10 px-4">
            <div className="flex flex-wrap items-center gap-3 text-slate-300 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-blue-400" />
                <span>คลิกค้างเพื่อลากเลื่อน (Pan & Drag) | หมุนลูกกลิ้งเมาส์เพื่อซูม</span>
              </span>
              <span className="text-slate-500 hidden md:inline">|</span>
              <span className="text-emerald-400 font-medium hidden md:inline">
                ⚡ ระบบโครงข่าย Fiber Optic NVR Hikvision DS-7616NI-K2
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://earth.google.com/earth/d/16Z10iSFTtUgXwLv5ekTPRBarpH_eR5Bs?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800 transition-colors"
                title="เปิดดูพิกัด 3D บน Google Earth"
              >
                <span>🌐 Google Earth 3D</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Selected Camera Details Drawer & Zone Matrix (Span 1 col) */}
        <div className="space-y-4">
          {/* 1. Selected Camera Quick Inspector Card */}
          {selectedCamera ? (
            <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md p-4 space-y-3 animate-fade-in text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedCamera.id}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1 leading-tight">
                    {selectedCamera.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCamera(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusVisuals(selectedCamera.status).badge}`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusVisuals(selectedCamera.status).bg }}></span>
                  {getStatusVisuals(selectedCamera.status).label}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {selectedCamera.type.toUpperCase()} • {selectedCamera.resolution}
                </span>
              </div>

              {/* Specs & Physical Info */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1.5">
                {selectedCamera.cabinetNumber && (
                  <div>🗄️ <strong>ตู้ควบคุม:</strong> <span className="font-semibold text-slate-800">{selectedCamera.cabinetNumber}</span></div>
                )}
                {selectedCamera.channel && (
                  <div>📡 <strong>ช่องสัญญาณ:</strong> <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">{selectedCamera.channel}</span></div>
                )}
                {selectedCamera.systemAssetCode && (
                  <div>🏷️ <strong>รหัสสินทรัพย์ในระบบ:</strong> <span className="font-mono text-slate-800 font-semibold">{selectedCamera.systemAssetCode}</span></div>
                )}
                {selectedCamera.assetCode && (
                  <div>📦 <strong>รหัสสินทรัพย์:</strong> <span className="font-mono text-blue-800 font-bold">{selectedCamera.assetCode}</span></div>
                )}
                {selectedCamera.assetName && (
                  <div>🔍 <strong>ชื่อสินทรัพย์:</strong> <span className="text-slate-700">{selectedCamera.assetName}</span></div>
                )}
                {selectedCamera.community && (
                  <div>🏡 <strong>ชุมชน:</strong> <span className="font-medium text-emerald-800">{selectedCamera.community}</span></div>
                )}
                <div>🏢 <strong>สถานที่:</strong> {selectedCamera.building}</div>
                <div>📍 <strong>จุดติดตั้ง/แยก:</strong> {selectedCamera.floor}</div>
                {selectedCamera.ipAddress && (
                  <div>🌐 <strong>IP Address:</strong> <span className="font-mono text-blue-900 font-bold">{selectedCamera.ipAddress}</span></div>
                )}
                {selectedCamera.serialNumber && !selectedCamera.assetCode && (
                  <div>🏷️ <strong>S/N:</strong> <span className="font-mono text-slate-600">{selectedCamera.serialNumber}</span></div>
                )}
                <div>🗓️ <strong>ตรวจเช็กล่าสุด:</strong> {selectedCamera.lastMaintenance}</div>
              </div>

              {/* Notes / Issue description */}
              {selectedCamera.notes && (
                <div className="bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200 text-[11px] space-y-0.5">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>หมายเหตุ / สาเหตุขัดข้อง:</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line text-amber-900/90">{selectedCamera.notes}</p>
                </div>
              )}

              {/* Coordinates & Copy */}
              <div className="flex items-center justify-between text-[11px] bg-slate-100 p-2 rounded-xl border border-slate-200">
                <span className="font-mono text-slate-600">
                  {(selectedCamera.latitude || 15.8085).toFixed(5)}, {(selectedCamera.longitude || 102.0345).toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCoords(selectedCamera)}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  {copiedId === selectedCamera.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedCamera.id ? 'คัดลอกแล้ว' : 'คัดลอกพิกัด'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                {onRequestCctvForCamera && (
                  <button
                    type="button"
                    onClick={() => onRequestCctvForCamera(selectedCamera)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer active:scale-98"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📹 ยื่นคำร้องขอดูภาพจากกล้องนี้</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {onReportRepairForCamera && (selectedCamera.status === 'faulty' || selectedCamera.status === 'offline') && (
                    <button
                      type="button"
                      onClick={() => onReportRepairForCamera(selectedCamera)}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>แจ้งซ่อมแซม</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic(selectedCamera)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-2.5 rounded-xl transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ทดสอบสัญญาณ</span>
                  </button>

                  {onEditCamera && (
                    <button
                      type="button"
                      onClick={() => onEditCamera(selectedCamera)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลจุดติดตั้ง"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Officer Direct Status Change */}
                {isOfficerMode && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ปรับสถานะจุดติดตั้งด่วน (เจ้าหน้าที่):
                    </label>
                    <div className="grid grid-cols-2 gap-1 mb-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus('online');
                          setStatusNote('ทดสอบสัญญาณภาพปกติ');
                        }}
                        className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 text-[10px]"
                      >
                        🟢 ปกติ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus('faulty');
                          setStatusNote('พบปัญหาชำรุดรอซ่อม');
                        }}
                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-300 text-[10px]"
                      >
                        🔴 ชำรุด
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus('maintenance');
                          setStatusNote('ช่างกำลังดำเนินการซ่อมแซม');
                        }}
                        className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-300 text-[10px]"
                      >
                        🟡 อยู่ระหว่างซ่อม
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus('offline');
                          setStatusNote('สัญญาณสายไฟเบอร์หลุด/ดับ');
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 text-[10px]"
                      >
                        ⚪ ขาดการเชื่อมต่อ
                      </button>
                    </div>

                    {editingStatus && (
                      <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 animate-fade-in">
                        <input
                          type="text"
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="ระบุหมายเหตุการเปลี่ยนสถานะ..."
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingStatus(null)}
                            className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveStatus}
                            className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    )}

                    {statusSuccess && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200 text-center animate-fade-in">
                        ✓ อัปเดตสถานะจุดติดตั้งเรียบร้อย
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center text-slate-500 space-y-2">
              <MapPin className="w-8 h-8 text-blue-500 mx-auto opacity-70" />
              <div className="font-bold text-slate-800 text-xs">คลิกเลือกจุดกล้องบนแผนที่</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                คลิกที่หมุดกล้องเพื่อดูรายละเอียดสเปก พิกัด ทดสอบสัญญาณ หรือยื่นคำร้องขอดูภาพ CCTV
              </p>
            </div>
          )}

          {/* 2. Municipal Zones Overview Cards List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 space-y-2.5 text-xs">
            <div className="font-extrabold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>สรุปการกระจายตัวรายโซน ({MUNICIPAL_ZONES.length} โซน)</span>
              </span>
              {selectedZoneId !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleFocusZone('all')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                >
                  ดูทุกโซน
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {MUNICIPAL_ZONES.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const stats = zoneStats.get(zone.id);
                const total = stats?.total || 0;
                const online = stats?.online || 0;
                const issues = (stats?.faulty || 0) + (stats?.offline || 0);
                const percent = total > 0 ? Math.round((online / total) * 100) : 0;

                return (
                  <div
                    key={zone.id}
                    onClick={() => handleFocusZone(selectedZoneId === zone.id ? 'all' : zone.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs' 
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }}></span>
                        <span>{zone.code}: {zone.thaiName.split(':')[1]?.split('(')[0] || zone.name}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {total} จุด
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span className="text-emerald-700 font-medium">🟢 ปกติ: {online}</span>
                      {issues > 0 && <span className="text-rose-600 font-bold">🔴 ชำรุด/ออฟไลน์: {issues}</span>}
                      <span className="font-bold text-slate-700">{percent}%</span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Signal Diagnostic Live Test Modal */}
      {showDiagnostic && selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm text-white">ทดสอบสัญญาณวิดีโอ & สตรีมสด (Diagnostic)</h3>
              </div>
              <button
                onClick={() => setShowDiagnostic(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="text-slate-400">Target IP: <span className="text-blue-400 font-bold">{selectedCamera.ipAddress}</span></div>
              <div className="text-slate-400">Camera ID: <span className="text-white font-bold">{selectedCamera.id}</span> ({selectedCamera.name})</div>
              <div className="text-slate-400">Hardware S/N: <span className="text-slate-300">{selectedCamera.serialNumber}</span></div>
            </div>

            {isDiagnosing ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <div className="text-xs font-bold text-slate-300">กำลังส่งแพ็กเกจทดสอบ ICMP & RTSP Stream ไปยัง {selectedCamera.ipAddress}...</div>
              </div>
            ) : diagnosticResult ? (
              <div className="space-y-3 animate-fade-in text-xs">
                <div className={`p-3 rounded-xl border font-semibold ${
                  diagnosticResult.ping > 0 
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}>
                  {diagnosticResult.ping > 0 ? '✓ การเชื่อมต่อสัญญาณ RTSP ตอบสนองปกติ' : '✗ ไม่สามารถติดต่อ IP Address ปลายทางได้ (Host Unreachable)'}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Latency / Ping</div>
                    <div className="text-base font-extrabold text-white">{diagnosticResult.ping > 0 ? `${diagnosticResult.ping} ms` : 'Timeout'}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">FPS / Frame Rate</div>
                    <div className="text-base font-extrabold text-white">{diagnosticResult.fps} FPS</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Bandwidth Stream</div>
                    <div className="text-[11px] font-bold text-slate-200 mt-1">{diagnosticResult.bandwidth}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Packet Loss</div>
                    <div className="text-base font-extrabold text-white">{diagnosticResult.packetLoss}%</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleRunDiagnostic(selectedCamera)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ทดสอบอีกครั้ง</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDiagnostic(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
