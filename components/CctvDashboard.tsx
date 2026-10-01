import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CctvCamera, CctvStatus, CctvType, CctvAttachment } from '../types/cctv';
import { getStoredCctvCameras, updateCctvStatus, addCctvCamera, updateCctvCamera, deleteCctvCamera, saveCctvCameras } from '../data/cctvData';
import { CctvMap } from './CctvMap';
import { CctvGeoMap } from './CctvGeoMap';
import { CctvMunicipalZoneMap } from './CctvMunicipalZoneMap';
import { CctvNetworkPerformanceMonitor } from './CctvNetworkPerformanceMonitor';
import { CctvReportCenterModal } from './CctvReportCenterModal';
import { CctvRepairHistoryPrintModal } from './CctvRepairHistoryPrintModal';
import { CctvMaintenanceCalendar } from './CctvMaintenanceCalendar';
import { CctvMaintenanceLogsModal } from './CctvMaintenanceLogsModal';
import { CctvMonthlyPdfModal } from './CctvMonthlyPdfModal';
import { CctvMaintenanceSchedulePrintModal } from './CctvMaintenanceSchedulePrintModal';
import { CctvDashboardPrintReportModal } from './CctvDashboardPrintReportModal';
import { AdminFolderSystemModal } from './AdminFolderSystemModal';
import { CctvEquipmentRegisterModal } from './CctvEquipmentRegisterModal';
import { CctvSearchIndex, SmartSearchResult } from '../utils/cctvSearchIndex';
import { CctvSmartSearchBar } from './CctvSmartSearchBar';
import { CctvPulseMonitor } from './CctvPulseMonitor';
import { getStoredDropLogs } from '../utils/cctvPulseMonitorService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Camera, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  WifiOff, 
  Activity,
  Search, 
  Filter, 
  Plus, 
  Printer, 
  Download, 
  MapPin, 
  Building, 
  Layers, 
  ShieldAlert, 
  Info, 
  ExternalLink,
  Edit3,
  Check,
  X,
  RefreshCw,
  Eye,
  FileText,
  Copy,
  Globe,
  DollarSign,
  Calendar,
  ClipboardList,
  CheckSquare,
  Square,
  Save,
  Trash2,
  HardDrive,
  Crosshair,
  Compass,
  Sparkles,
  Upload,
  Paperclip,
  Image as ImageIcon,
  ZoomIn,
  FolderOpen,
  Maximize2,
  FileCheck,
  Flame
} from 'lucide-react';

interface CctvDashboardProps {
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onRequestCctvForCamera?: (camera: CctvCamera) => void;
  isOfficerMode?: boolean;
  onViewRequest?: (trackId: string) => void;
}

export const CctvDashboard: React.FC<CctvDashboardProps> = ({
  onReportRepairForCamera,
  onRequestCctvForCamera,
  isOfficerMode = false,
  onViewRequest
}) => {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'municipal' | 'geomap' | 'heatmap' | 'pulse' | 'map' | 'grid' | 'table' | 'building' | 'floorplan' | 'calendar' | 'network'>('municipal');
  const [showReportCenterModal, setShowReportCenterModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [showMonthlyPdfModal, setShowMonthlyPdfModal] = useState<boolean>(false);
  const [showSelectedPdfModal, setShowSelectedPdfModal] = useState<boolean>(false);
  const [showMaintenanceScheduleModal, setShowMaintenanceScheduleModal] = useState<boolean>(false);
  const [showSummaryPrintModal, setShowSummaryPrintModal] = useState<boolean>(false);
  const [showAdminFolderModal, setShowAdminFolderModal] = useState<boolean>(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState<boolean>(false);

  // Bulk selection state
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  const toggleSelectCamera = (id: string) => {
    setSelectedCameraIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCameraIds.length === filteredCameras.length && filteredCameras.length > 0) {
      setSelectedCameraIds([]);
    } else {
      setSelectedCameraIds(filteredCameras.map(c => c.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedCameraIds([]);
  };

  const handleBulkStatusChange = (newStatus: CctvStatus) => {
    if (selectedCameraIds.length === 0) return;

    const statusLabelMap: Record<CctvStatus, string> = {
      online: 'ใช้งานได้ปกติ (Online)',
      maintenance: 'อยู่ระหว่างซ่อมแซม (Maintenance)',
      faulty: 'ชำรุด/ขัดข้อง (Faulty)',
      offline: 'ขาดการเชื่อมต่อ (Offline)'
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const updated = cameras.map(cam => {
      if (selectedCameraIds.includes(cam.id)) {
        const noteUpdate = `[${new Date().toLocaleDateString('th-TH')}] ปรับสถานะเป็น ${statusLabelMap[newStatus]} (ปรับพร้อมกัน ${selectedCameraIds.length} จุด)`;
        return {
          ...cam,
          status: newStatus,
          lastMaintenance: todayStr,
          notes: cam.notes ? `${cam.notes}\n${noteUpdate}` : noteUpdate
        };
      }
      return cam;
    });

    setCameras(updated);
    saveCctvCameras(updated);
    setBulkSuccessMessage(`ปรับสถานะกล้องจำนวน ${selectedCameraIds.length} จุด เป็น "${statusLabelMap[newStatus]}" สำเร็จเรียบร้อยแล้ว`);
    setTimeout(() => setBulkSuccessMessage(null), 4000);
  };
  
  const handleUpdateCameraPosition = (camera: CctvCamera, x: number, y: number) => {
    const updated = cameras.map((c) => {
      if (c.id === camera.id) {
        return { ...c, coordinates: { x, y } };
      }
      return c;
    });
    setCameras(updated);
    saveCctvCameras(updated);
  };
  
  // Selected camera for detail/modal
  const [activeCamera, setActiveCamera] = useState<CctvCamera | null>(null);
  
  // Copy coordinates helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyCoords = (camId: string, lat?: number, lng?: number) => {
    const text = `${lat ?? 13.84751}, ${lng ?? 100.56912}`;
    navigator.clipboard.writeText(text);
    setCopiedId(camId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Admin add camera form state
  const [quickNote, setQuickNote] = useState('');

  const handleAddQuickNote = () => {
    if (!activeCamera || !(quickNote || '').trim()) return;
    const notes = activeCamera.notes 
      ? `${activeCamera.notes}\n[${new Date().toLocaleDateString('th-TH')}] ${(quickNote || '').trim()}`
      : `[${new Date().toLocaleDateString('th-TH')}] ${(quickNote || '').trim()}`;
    updateCctvStatus(activeCamera.id, activeCamera.status, notes);
    setActiveCamera({ ...activeCamera, notes });
    setCameras(getStoredCctvCameras());
    setQuickNote('');
  };
  // Camera Add/Edit modal state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [cameraFormNotice, setCameraFormNotice] = useState<string | null>(null);
  const [cameraFormData, setCameraFormData] = useState<Partial<CctvCamera>>({
    id: '',
    name: '',
    building: 'อาคารอำนวยการ',
    floor: 'ชั้น 1',
    zone: 'โถงทางเดิน',
    type: 'dome',
    resolution: '1080p Full HD',
    ipAddress: '192.168.10.150',
    serialNumber: '',
    status: 'online',
    latitude: 13.84751,
    longitude: 100.56912,
    notes: '',
    inspector: 'นายสมชาย ช่างเทคนิค CCTV',
    lastMaintenance: new Date().toISOString().slice(0, 10),
    installedDate: new Date().toISOString().slice(0, 10),
    attachments: [],
    imageUrl: ''
  });

  // File upload state in camera modal
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<CctvAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processUploadedFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    // Limit check: 10MB per file
    const MAX_SIZE = 10 * 1024 * 1024;
    const oversized = fileArr.find(f => f.size > MAX_SIZE);
    if (oversized) {
      setUploadError(`ไฟล์ "${oversized.name}" มีขนาดเกิน 10MB กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB`);
      return;
    }

    fileArr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (!base64Url) return;

        const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
        const newAttachment: CctvAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url: base64Url,
          size: file.size,
          type: file.type || (isImg ? 'image/jpeg' : (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')),
          uploadedAt: new Date().toISOString(),
          category: isImg ? 'site_photo' : (file.name.endsWith('.pdf') ? 'spec_sheet' : 'other')
        };

        setCameraFormData((prev) => {
          const currentList = prev.attachments || [];
          const updatedList = [...currentList, newAttachment];
          // If no primary imageUrl set yet and this is an image, set it as primary
          const primaryImg = prev.imageUrl || (isImg ? base64Url : undefined);
          return {
            ...prev,
            attachments: updatedList,
            imageUrl: primaryImg
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (attId: string) => {
    setCameraFormData((prev) => {
      const currentList = prev.attachments || [];
      const updatedList = currentList.filter(a => a.id !== attId);
      const removedAtt = currentList.find(a => a.id === attId);
      let updatedImageUrl = prev.imageUrl;
      // If removed attachment was the primary image, pick another image or clear
      if (removedAtt && prev.imageUrl === removedAtt.url) {
        const nextImg = updatedList.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'));
        updatedImageUrl = nextImg ? nextImg.url : '';
      }
      return {
        ...prev,
        attachments: updatedList,
        imageUrl: updatedImageUrl
      };
    });
  };

  const handleSetPrimaryImage = (url: string) => {
    setCameraFormData((prev) => ({
      ...prev,
      imageUrl: url
    }));
    setCameraFormNotice('🌟 กำหนดเป็นรูปภาพหน้าปกหลักของจุดติดตั้งเรียบร้อยแล้ว');
    setTimeout(() => setCameraFormNotice(null), 3000);
  };

  const handleOpenAddCameraModal = () => {
    setEditingCameraId(null);
    setCameraFormNotice(null);
    setUploadError(null);
    setCameraFormData({
      id: `CAM-BLD-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      building: 'อาคารอำนวยการ',
      floor: 'ชั้น 1',
      zone: 'โถงทางเดิน',
      type: 'dome',
      resolution: '1080p Full HD',
      ipAddress: `192.168.10.${Math.floor(10 + Math.random() * 200)}`,
      serialNumber: `SN-CAM-${Date.now().toString().slice(-6)}`,
      status: 'online',
      latitude: 13.84751,
      longitude: 100.56912,
      notes: '',
      inspector: 'นายสมชาย ช่างเทคนิค CCTV',
      lastMaintenance: new Date().toISOString().slice(0, 10),
      installedDate: new Date().toISOString().slice(0, 10),
      attachments: [],
      imageUrl: ''
    });
    setShowCameraModal(true);
  };

  const handleOpenEditCameraModal = (cam: CctvCamera) => {
    setEditingCameraId(cam.id);
    setCameraFormNotice(null);
    setUploadError(null);
    setCameraFormData({
      ...cam,
      attachments: cam.attachments || [],
      imageUrl: cam.imageUrl || ''
    });
    setShowCameraModal(true);
  };

  const handleFetchCurrentGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCameraFormData((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          }));
          setCameraFormNotice('📍 ดึงพิกัด GPS ปัจจุบันสำเร็จแล้ว');
          setTimeout(() => setCameraFormNotice(null), 3000);
        },
        () => {
          setCameraFormData((prev) => ({
            ...prev,
            latitude: 13.84751,
            longitude: 100.56912
          }));
          setCameraFormNotice('ℹ️ ใช้พิกัดมาตรฐานของมหาวิทยาลัยเกษตรศาสตร์');
          setTimeout(() => setCameraFormNotice(null), 3000);
        }
      );
    }
  };

  // Edit status modal state
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [editCamStatus, setEditCamStatus] = useState<CctvStatus>('online');
  const [editCamNotes, setEditCamNotes] = useState('');

  useEffect(() => {
    setCameras(getStoredCctvCameras());
  }, []);

  const refreshList = () => {
    setCameras(getStoredCctvCameras());
    setPulseActiveDropsCount(getStoredDropLogs().filter(d => !d.acknowledged).length);
  };

  // Pulse Monitor drop alert tracking
  const [pulseActiveDropsCount, setPulseActiveDropsCount] = useState<number>(() => {
    return getStoredDropLogs().filter(d => !d.acknowledged).length;
  });

  // Periodic poll to keep drop alerts and camera status synced with database
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      const logs = getStoredDropLogs();
      const unack = logs.filter(d => !d.acknowledged).length;
      setPulseActiveDropsCount(unack);
    }, 4000);
    return () => clearInterval(pulseTimer);
  }, []);

  // Helper stats
  const total = cameras.length;
  const onlineCount = cameras.filter((c) => c.status === 'online').length;
  const faultyCount = cameras.filter((c) => c.status === 'faulty').length;
  const maintenanceCount = cameras.filter((c) => c.status === 'maintenance').length;
  const offlineCount = cameras.filter((c) => c.status === 'offline').length;
  const operationalRate = total > 0 ? Math.round((onlineCount / total) * 100) : 0;

  // Buildings, Zones & Communities (Districts) list
  const buildings = useMemo(() => Array.from(new Set(cameras.map((c) => c.building).filter(Boolean))), [cameras]);
  const zones = useMemo(() => Array.from(new Set(cameras.map((c) => c.zone).filter(Boolean))), [cameras]);
  const communities = useMemo(() => Array.from(new Set(cameras.map((c) => c.community).filter(Boolean))), [cameras]);

  // High-performance Internal Search Index (inverted token index + NLP query parser)
  const searchIndexRef = useRef<CctvSearchIndex>(new CctvSearchIndex(cameras));

  useEffect(() => {
    searchIndexRef.current.buildIndex(cameras);
  }, [cameras]);

  // Execute smart search query powered by the internal search index
  const smartSearchResult = useMemo<SmartSearchResult>(() => {
    return searchIndexRef.current.search(searchTerm);
  }, [searchTerm, cameras]);

  // Filtered cameras based on smart search index and faceted dropdown selections
  const filteredCameras = useMemo(() => {
    // If a search query is active, start from ranked smart search results; otherwise start from full cameras list
    let candidateList = searchTerm.trim() ? smartSearchResult.cameras : cameras;

    if (selectedBuilding !== 'all') {
      candidateList = candidateList.filter(c => c.building === selectedBuilding);
    }
    if (selectedCommunity !== 'all') {
      candidateList = candidateList.filter(c => c.community === selectedCommunity);
    }
    if (selectedZone !== 'all') {
      candidateList = candidateList.filter(c => c.zone === selectedZone);
    }
    if (selectedStatus !== 'all') {
      candidateList = candidateList.filter(c => c.status === selectedStatus);
    }
    if (selectedType !== 'all') {
      candidateList = candidateList.filter(c => c.type === selectedType);
    }

    return candidateList;
  }, [searchTerm, smartSearchResult, cameras, selectedBuilding, selectedCommunity, selectedZone, selectedStatus, selectedType]);

  const isAllSelected = filteredCameras.length > 0 && selectedCameraIds.length === filteredCameras.length;

  const chartData = useMemo(() => {
    const data = buildings.map(building => {
      const bldCams = cameras.filter(c => c.building === building);
      return {
        name: building,
        online: bldCams.filter(c => c.status === 'online').length,
        faulty: bldCams.filter(c => c.status === 'faulty').length,
        maintenance: bldCams.filter(c => c.status === 'maintenance').length,
        offline: bldCams.filter(c => c.status === 'offline').length,
        total: bldCams.length,
      };
    });
    return data.sort((a, b) => b.total - a.total);
  }, [buildings, cameras]);

  const getStatusBadge = (status: CctvStatus) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ใช้งานได้ปกติ (Online)
          </span>
        );
      case 'faulty':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            ชำรุด/ขัดข้อง (Faulty)
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Wrench className="w-3 h-3 text-amber-600" />
            อยู่ระหว่างซ่อม (Maintenance)
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            <WifiOff className="w-3 h-3 text-slate-500" />
            ขาดการเชื่อมต่อ (Offline)
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: CctvType) => {
    switch (type) {
      case 'dome':
        return 'Dome Camera';
      case 'bullet':
        return 'Bullet Camera';
      case 'ptz':
        return 'PTZ Speed Dome';
      case '360_degree':
        return 'Fisheye 360°';
      default:
        return type;
    }
  };

  // Submit status edit
  const handleUpdateStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCamera) return;

    updateCctvStatus(activeCamera.id, editCamStatus, editCamNotes);
    refreshList();
    setShowEditStatusModal(false);
    setActiveCamera({
      ...activeCamera,
      status: editCamStatus,
      notes: editCamNotes,
      lastMaintenance: new Date().toISOString().slice(0, 10)
    });
  };

  // Save Camera Submit (Handles both ADD and EDIT with Save button)
  const handleSaveCameraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraFormData.name?.trim()) {
      alert('กรุณาระบุชื่อจุดติดตั้งหรือบริเวณ');
      return;
    }

    if (editingCameraId) {
      // Edit mode
      const updatedCam: CctvCamera = {
        id: editingCameraId,
        name: cameraFormData.name.trim(),
        building: cameraFormData.building || 'อาคารอำนวยการ',
        floor: cameraFormData.floor || 'ชั้น 1',
        zone: cameraFormData.zone || 'โถงทางเดิน',
        type: (cameraFormData.type as CctvType) || 'dome',
        resolution: cameraFormData.resolution || '1080p Full HD',
        ipAddress: cameraFormData.ipAddress || '192.168.1.100',
        serialNumber: cameraFormData.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
        status: (cameraFormData.status as CctvStatus) || 'online',
        lastMaintenance: cameraFormData.lastMaintenance || new Date().toISOString().slice(0, 10),
        installedDate: cameraFormData.installedDate || new Date().toISOString().slice(0, 10),
        latitude: Number(cameraFormData.latitude) || 13.84751,
        longitude: Number(cameraFormData.longitude) || 100.56912,
        notes: cameraFormData.notes || '',
        inspector: cameraFormData.inspector || '',
        attachments: cameraFormData.attachments || [],
        imageUrl: cameraFormData.imageUrl || (cameraFormData.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'))?.url || ''),
        coordinates: cameraFormData.coordinates
      };

      updateCctvCamera(updatedCam);
      refreshList();
      if (activeCamera && activeCamera.id === editingCameraId) {
        setActiveCamera(updatedCam);
      }
      setBulkSuccessMessage(`✅ บันทึกการแก้ไขข้อมูลจุดติดตั้งกล้อง ${updatedCam.id} (${updatedCam.name}) เรียบร้อยแล้ว`);
      setTimeout(() => setBulkSuccessMessage(null), 5000);
      setShowCameraModal(false);
    } else {
      // Add mode
      const generatedId = (cameraFormData.id && cameraFormData.id.trim()) 
        ? cameraFormData.id.trim()
        : `CAM-${(cameraFormData.building || 'SYS').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const newFullCam: CctvCamera = {
        id: generatedId,
        name: cameraFormData.name.trim(),
        building: cameraFormData.building || 'อาคารอำนวยการ',
        floor: cameraFormData.floor || 'ชั้น 1',
        zone: cameraFormData.zone || 'โถงทางเดิน',
        type: (cameraFormData.type as CctvType) || 'dome',
        resolution: cameraFormData.resolution || '1080p Full HD',
        ipAddress: cameraFormData.ipAddress || '192.168.1.100',
        serialNumber: cameraFormData.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
        status: (cameraFormData.status as CctvStatus) || 'online',
        lastMaintenance: cameraFormData.lastMaintenance || new Date().toISOString().slice(0, 10),
        installedDate: cameraFormData.installedDate || new Date().toISOString().slice(0, 10),
        latitude: Number(cameraFormData.latitude) || 13.84751,
        longitude: Number(cameraFormData.longitude) || 100.56912,
        notes: cameraFormData.notes || '',
        inspector: cameraFormData.inspector || '',
        attachments: cameraFormData.attachments || [],
        imageUrl: cameraFormData.imageUrl || (cameraFormData.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'))?.url || '')
      };

      addCctvCamera(newFullCam);
      refreshList();
      setBulkSuccessMessage(`✅ บันทึกและเพิ่มจุดติดตั้งกล้อง ${newFullCam.id} (${newFullCam.name}) เรียบร้อยแล้ว`);
      setTimeout(() => setBulkSuccessMessage(null), 5000);
      setShowCameraModal(false);
    }
  };

  const handleDeleteCamera = (id: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบจุดติดตั้งกล้องรหัส "${id}" ออกจากระบบ?`)) {
      deleteCctvCamera(id);
      refreshList();
      if (activeCamera && activeCamera.id === id) {
        setActiveCamera(null);
      }
      setShowCameraModal(false);
      setBulkSuccessMessage(`🗑️ ลบจุดติดตั้งกล้อง ${id} ออกจากระบบเรียบร้อยแล้ว`);
      setTimeout(() => setBulkSuccessMessage(null), 5000);
    }
  };

  // Export CCTV Report as CSV
  const handleExportCSV = () => {
    const headers = ['ลำดับที่ (No.)', 'รหัสกล้อง (Camera ID)', 'ชื่อจุดติดตั้ง (Name)', 'อาคาร (Building)', 'ชั้น (Floor)', 'โซน (Zone)', 'ละติจูด (Latitude)', 'ลองจิจูด (Longitude)', 'สถานะการใช้งาน (Status)', 'สถานะใช้งานได้/ไม่ได้', 'IP Address', 'หมายเหตุ (Notes)'];
    const rows = cameras.map((c, idx) => [
      idx + 1,
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.building}"`,
      `"${c.floor}"`,
      `"${c.zone}"`,
      c.latitude ?? 13.84751,
      c.longitude ?? 100.56912,
      c.status,
      c.status === 'online' ? 'ใช้งานได้' : 'ใช้งานไม่ได้',
      c.ipAddress,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cctv_inventory_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-1.5">
            <Video className="w-3.5 h-3.5 text-blue-400" />
            ระบบสำรวจจุดติดตั้งและสถานะกล้องวงจรปิด (CCTV Monitoring System)
          </span>
          <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            รายงานและแผนผังจุดติดตั้งกล้อง CCTV
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            ตรวจสอบความพร้อมใช้งาน สเปกทางเทคนิค และแจ้งซ่อมแซมกล้องวงจรปิดรายจุดออนไลน์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://earth.google.com/earth/d/16Z10iSFTtUgXwLv5ekTPRBarpH_eR5Bs?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all cursor-pointer border border-cyan-500/50"
            title="เปิดแผนผังพิกัด 3D บน Google Earth"
          >
            <Globe className="w-4 h-4 text-cyan-200" />
            Google Earth 3D Map
          </a>

          <button
            onClick={() => setShowSummaryPrintModal(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all cursor-pointer border border-blue-400/50"
            title="พิมพ์รายงานสรุปสถานะกล้อง CCTV และรายการแจ้งซ่อมคงค้าง (Print Report)"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            พิมพ์รายงานสรุป (Print Report)
          </button>

          <button
            onClick={() => setShowMonthlyPdfModal(true)}
            className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all cursor-pointer border border-rose-500/50"
            title="ออกรายงานสถิติและแผนผัง PDF สำหรับประชุมประจำเดือน"
          >
            <Printer className="w-4 h-4 text-rose-200" />
            รายงาน PDF ประจำเดือน
          </button>

          <button
            onClick={() => setShowEquipmentModal(true)}
            className="inline-flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all cursor-pointer border border-indigo-400/50"
            title="เปิดดูทะเบียนครุภัณฑ์ NVR, Smart TV และอุปกรณ์ส่วนกลาง 16 ชุมชน"
          >
            <HardDrive className="w-4 h-4 text-indigo-200" />
            <span>ทะเบียนครุภัณฑ์ NVR & ชุมชน (37 เครื่อง)</span>
          </button>

          <button
            onClick={() => setShowAdminFolderModal(true)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all cursor-pointer border border-purple-400/50"
            title="เปิดคลังโฟลเดอร์บันทึกรายงานการทำความสะอาดและตรวจเช็คอุปกรณ์กล้อง (6-Pillar Inspection Hub)"
          >
            <FolderOpen className="w-4 h-4 text-purple-200" />
            📁 คลังรายงานตรวจเช็ค & บำรุงรักษากล้อง
          </button>

          <button
            onClick={() => setShowReportCenterModal(true)}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-100" />
            ศูนย์จัดทำรายงาน & ใบเสนอราคา
          </button>

          <button
            onClick={handleOpenAddCameraModal}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-colors cursor-pointer border border-emerald-400/40"
            title="เพิ่มจุดติดตั้งกล้อง CCTV ตัวใหม่เข้าสู่ระบบ พร้อมบันทึกพิกัดและสเปก"
          >
            <Plus className="w-4 h-4 text-emerald-100" />
            <span>เพิ่มจุดติดตั้งกล้องใหม่</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl shadow transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            รายงาน CSV
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>จุดติดตั้งทั้งหมด</span>
            <Camera className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{total} <span className="text-xs font-normal text-slate-500">จุด</span></div>
          <p className="text-[10px] text-emerald-600 font-medium">พร้อมใช้งาน {operationalRate}%</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('online')}
          className={`p-4 rounded-2xl border shadow-sm space-y-1 cursor-pointer transition-all ${
            selectedStatus === 'online' ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
            <span>ใช้งานได้ปกติ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900">{onlineCount}</div>
          <p className="text-[10px] text-emerald-700 font-medium">สัญญาณวิดีโอปรกติ</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('faulty')}
          className={`p-4 rounded-2xl border shadow-sm space-y-1 cursor-pointer transition-all ${
            selectedStatus === 'faulty' ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-500/20' : 'bg-rose-50/50 border-rose-200 hover:bg-rose-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 text-xs font-medium">
            <span>ชำรุด/ขัดข้อง</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900">{faultyCount}</div>
          <p className="text-[10px] text-rose-700 font-medium">ต้องการการแจ้งซ่อม</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('maintenance')}
          className={`p-4 rounded-2xl border shadow-sm space-y-1 cursor-pointer transition-all ${
            selectedStatus === 'maintenance' ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/20' : 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-900 text-xs font-medium">
            <span>อยู่ระหว่างซ่อม</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{maintenanceCount}</div>
          <p className="text-[10px] text-amber-800 font-medium">ช่างกำลังดำเนินการ</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('offline')}
          className={`p-4 rounded-2xl border shadow-sm space-y-1 cursor-pointer transition-all ${
            selectedStatus === 'offline' ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500/20' : 'bg-slate-100 border-slate-200 hover:bg-slate-200/60'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 text-xs font-medium">
            <span>ขาดการเชื่อมต่อ</span>
            <WifiOff className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{offlineCount}</div>
          <p className="text-[10px] text-slate-500 font-medium">ออฟไลน์ / สายหลุด</p>
        </div>
      </div>

      {/* CCTV Status Distribution Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          สัดส่วนสถานะกล้องวงจรปิด แยกตามอาคาร/สถานที่
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false} 
                axisLine={false}
              />
              <RechartsTooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="online" name="ปกติ (Online)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="faulty" name="ชำรุด (Faulty)" stackId="a" fill="#f43f5e" />
              <Bar dataKey="maintenance" name="ซ่อมแซม (Maintenance)" stackId="a" fill="#f59e0b" />
              <Bar dataKey="offline" name="ออฟไลน์ (Offline)" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Search Bar: Natural Language Queries powered by Internal Search Index */}
      <CctvSmartSearchBar
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        smartResult={smartSearchResult}
        totalCameras={total}
        filteredCount={filteredCameras.length}
        onClear={() => setSearchTerm('')}
        onSelectSuggestion={(q) => setSearchTerm(q)}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleSelectAll}
      />

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Real-time Keyword Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="ค้นหาด้วยรหัสกล้อง (ID), ชื่อสถานที่, อาคาร, โซน หรือ IP Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-28 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-xs font-medium shadow-2xs transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 shrink-0">
                พบ {filteredCameras.length} จุด
              </span>

              {/* Bulk Select All Quick Button */}
              <button
                type="button"
                onClick={handleSelectAll}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  isAllSelected
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="เลือกหรือยกเลิกเลือกกล้องทั้งหมด"
              >
                {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{isAllSelected ? 'เลือกอยู่' : 'เลือกทั้งหมด'}</span>
              </button>
            </div>
          </div>

          {/* District / Community Filter */}
          {communities.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-xs"
                title="กรองตามเขต/ชุมชน"
              >
                <option value="all">ทุกเขต/ชุมชน ({communities.length})</option>
                {communities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Building Filter */}
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-xs"
            >
              <option value="all">ทุกอาคาร/สถานที่ ({buildings.length})</option>
              {buildings.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Zone Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-xs"
            >
              <option value="all">ทุกโซนพื้นที่ ({zones.length})</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-xs"
            >
              <option value="all">ทุกสถานะการใช้งาน</option>
              <option value="online">🟢 ใช้งานได้ปกติ (Online)</option>
              <option value="faulty">🔴 ชำรุด/ขัดข้อง (Faulty)</option>
              <option value="maintenance">🟡 อยู่ระหว่างซ่อม (Maintenance)</option>
              <option value="offline">⚪ ขาดการเชื่อมต่อ (Offline)</option>
            </select>
          </div>

          {/* Clear All Filters Button */}
          {(searchTerm || selectedBuilding !== 'all' || selectedCommunity !== 'all' || selectedZone !== 'all' || selectedStatus !== 'all' || selectedType !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedBuilding('all');
                setSelectedCommunity('all');
                setSelectedZone('all');
                setSelectedStatus('all');
                setSelectedType('all');
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors shrink-0"
              title="ล้างเงื่อนไขการค้นหาทั้งหมด"
            >
              <X className="w-3.5 h-3.5" />
              ล้างการกรอง
            </button>
          )}

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 ml-auto">
            <button
              onClick={() => setViewMode('municipal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'municipal' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              แผนที่โซนเทศบาล (Municipal Map)
            </button>
            <button
              onClick={() => setViewMode('geomap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'geomap' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              แผนที่ดาวเทียม (Google Maps)
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'heatmap' 
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm font-bold ring-2 ring-rose-300' 
                  : 'text-slate-700 hover:text-rose-700 hover:bg-rose-50'
              }`}
              title="เปิดดูแผนที่ Heatmap แสดงจุดเกิดเหตุและคำร้องขอภาพ CCTV บ่อย"
            >
              <Flame className={`w-3.5 h-3.5 ${viewMode === 'heatmap' ? 'text-amber-200 animate-pulse' : 'text-rose-500'}`} />
              <span>แผนที่ Heatmap จุดเสี่ยง</span>
            </button>
            <button
              onClick={() => setViewMode('pulse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'pulse'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm font-bold ring-2 ring-emerald-300'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
              title="เปิดระบบตรวจจับชีพจรกล้อง (Pulse Monitor) ตรวจสถานะออนไลน์/ออฟไลน์สดและแจ้งเตือนสัญญาณหลุด"
            >
              <span className="relative flex items-center justify-center">
                <Activity className={`w-3.5 h-3.5 ${viewMode === 'pulse' ? 'text-white animate-pulse' : 'text-emerald-600'}`} />
                {pulseActiveDropsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </span>
              <span>ชีพจรกล้อง (Pulse)</span>
              {pulseActiveDropsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                  {pulseActiveDropsCount} หลุด
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              แผนผังอาคาร (Blueprint)
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              การ์ดจุดติดตั้ง
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              ตารางรายละเอียด
            </button>
            <button
              onClick={() => setViewMode('building')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'building' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              แยกตามอาคาร
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'floorplan' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              ผังชั้นอาคาร (Grid)
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              ปฏิทินซ่อมบำรุง
            </button>
            <button
              onClick={() => setViewMode('network')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'network' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              ประสิทธิภาพเครือข่าย (Network)
            </button>
          </div>
        </div>

        {/* Quick Filter Tag Chips Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-bold text-slate-600 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            แท็กกรองด่วน:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 py-0.5">
            {/* Quick Zone Chips */}
            {zones.map((z) => (
              <button
                key={`zone-chip-${z}`}
                type="button"
                onClick={() => setSelectedZone(selectedZone === z ? 'all' : z)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                  selectedZone === z
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
                title={`กรองเฉพาะโซน ${z}`}
              >
                <span>📍 โซน: {z}</span>
              </button>
            ))}

            {/* Quick Building Chips */}
            {buildings.map((b) => (
              <button
                key={`bld-chip-${b}`}
                type="button"
                onClick={() => setSelectedBuilding(selectedBuilding === b ? 'all' : b)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                  selectedBuilding === b
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
                title={`กรองเฉพาะอาคาร ${b}`}
              >
                <span>🏢 {b}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bulk Selection Action Bar */}
      {selectedCameraIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400 font-black shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
                <span>เลือกแล้ว {selectedCameraIds.length} / {filteredCameras.length} จุด</span>
                <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800 font-mono">
                  BULK SELECTION ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ดำเนินการปรับสถานะพร้อมกัน หรือออกรายงานสรุปสำหรับกล้องกลุ่มนี้
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('maintenance')}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer border border-amber-500/50"
              title="ปรับสถานะเป็นอยู่ระหว่างซ่อมแซม"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-200" />
              <span>ปรับเป็น 'อยู่ระหว่างซ่อม'</span>
            </button>

            <button
              onClick={() => handleBulkStatusChange('online')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer border border-emerald-500/50"
              title="ปรับสถานะเป็นใช้งานได้ปกติ"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>ปรับเป็น 'ใช้งานปกติ'</span>
            </button>

            <button
              onClick={() => handleBulkStatusChange('faulty')}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer border border-rose-500/50"
              title="ปรับสถานะเป็นชำรุด/ขัดข้อง"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-200" />
              <span>ปรับเป็น 'ชำรุด/ขัดข้อง'</span>
            </button>

            <button
              onClick={() => setShowMaintenanceScheduleModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer border border-indigo-500/50"
              title="สรุปตารางการซ่อมบำรุงและหมายเหตุช่างเทคนิคสำหรับกล้องที่เลือก"
            >
              <ClipboardList className="w-3.5 h-3.5 text-indigo-200" />
              <span>สรุปตารางซ่อมบำรุง ({selectedCameraIds.length})</span>
            </button>

            <button
              onClick={() => setShowSelectedPdfModal(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer border border-blue-500/50"
              title="ออกรายงาน PDF เฉพาะกล้องที่เลือก"
            >
              <Printer className="w-3.5 h-3.5 text-blue-200" />
              <span>รายงาน PDF กลุ่มที่เลือก ({selectedCameraIds.length})</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer ml-1 border border-slate-700"
              title="ล้างการเลือกทั้งหมด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Toast Notification */}
      {bulkSuccessMessage && (
        <div className="bg-emerald-800 text-white p-3.5 rounded-2xl shadow-lg border border-emerald-600 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{bulkSuccessMessage}</span>
          </div>
          <button
            onClick={() => setBulkSuccessMessage(null)}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ambient Pulse Drop Alert Ribbon (เตือนเหตุสัญญาณหลุดเมื่อเปิดดูหน้าจออื่น) */}
      {pulseActiveDropsCount > 0 && viewMode !== 'pulse' && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white px-4 py-3 rounded-2xl border border-rose-500/80 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/30 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-rose-300 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>ระบบตรวจจับชีพจรกล้อง (Pulse Alert): ตรวจพบกล้องขาดการเชื่อมต่อ {pulseActiveDropsCount} จุด</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono animate-pulse">LIVE DROP</span>
              </p>
              <p className="text-[11px] text-rose-200">
                ระบบตรวจพบกล้องหยุดส่งสัญญาณภาพ กรุณาตรวจสอบสถานะและส่งช่างเทคนิคแก้ไข
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('pulse')}
            className="px-3.5 py-1.5 rounded-xl bg-white text-rose-950 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ml-auto"
          >
            <Activity className="w-3.5 h-3.5 text-rose-700" />
            <span>เปิดดู Pulse Monitor</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {/* 0. MUNICIPAL ZONE VECTOR/GRID MAP VIEW */}
      {viewMode === 'municipal' && (
        <CctvMunicipalZoneMap
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
          onRequestCctvForCamera={onRequestCctvForCamera}
          onReportRepairForCamera={onReportRepairForCamera}
          onEditCamera={handleOpenEditCameraModal}
          onRefreshData={refreshList}
          isOfficerMode={isOfficerMode}
        />
      )}

      {/* 1. BLUEPRINT MAP VIEW */}
      {viewMode === 'map' && (
        <CctvMap
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
          onReportRepairForCamera={onReportRepairForCamera}
          onUpdateCameraPosition={handleUpdateCameraPosition}
          onRefreshData={refreshList}
          onEditCamera={handleOpenEditCameraModal}
          isOfficerMode={isOfficerMode}
        />
      )}

      {/* GEO MAP & HEATMAP VIEW */}
      {(viewMode === 'geomap' || viewMode === 'heatmap') && (
        <CctvGeoMap
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
          onRequestCctvForCamera={onRequestCctvForCamera}
          onReportRepairForCamera={onReportRepairForCamera}
          onEditCamera={handleOpenEditCameraModal}
          initialShowHeatmap={viewMode === 'heatmap' || true}
        />
      )}

      {/* REAL-TIME PULSE MONITOR VIEW */}
      {viewMode === 'pulse' && (
        <CctvPulseMonitor
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
          onReportRepairForCamera={onReportRepairForCamera}
          onRefreshData={refreshList}
        />
      )}

      {/* NETWORK PERFORMANCE MONITOR VIEW */}
      {viewMode === 'network' && (
        <CctvNetworkPerformanceMonitor
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
          onReportRepairForCamera={onReportRepairForCamera}
        />
      )}

      {/* 1. GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCameras.map((cam) => {
            const isSelected = selectedCameraIds.includes(cam.id);
            return (
              <div
                key={cam.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between p-5 space-y-4 ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/10' 
                    : 'border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCamera(cam.id)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600 shrink-0"
                        title="เลือก/ยกเลิกเลือกกล้องนี้"
                      />
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                        {cam.id}
                      </span>
                    </div>
                    {getStatusBadge(cam.status)}
                  </div>

                  {/* Camera Thumbnail or Cover Photo if available */}
                  {(cam.imageUrl || (cam.attachments && cam.attachments.length > 0)) && (
                    <div
                      onClick={() => setActiveCamera(cam)}
                      className="w-full h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative group cursor-pointer shadow-inner"
                    >
                      {cam.imageUrl || cam.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image')) ? (
                        <img
                          src={cam.imageUrl || cam.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'))?.url}
                          alt={cam.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 gap-1.5 text-xs font-semibold">
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <span>มีเอกสารแนบ ({cam.attachments?.length} ไฟล์)</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Paperclip className="w-3 h-3" />
                        <span>{cam.attachments?.length || (cam.imageUrl ? 1 : 0)} ไฟล์</span>
                      </div>
                    </div>
                  )}

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {cam.name}
                </h3>

                <div className="space-y-1 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><strong>{cam.building}</strong> ({cam.floor}) - {cam.zone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{getTypeLabel(cam.type)} | {cam.resolution}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                    <span className="text-slate-400">IP:</span> {cam.ipAddress}
                  </div>
                  <div className="flex items-center justify-between gap-1.5 text-slate-500 font-mono text-[11px] pt-1">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cam.latitude?.toFixed(5) || '13.84751'}, {cam.longitude?.toFixed(5) || '100.56910'}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCoords(cam.id, cam.latitude, cam.longitude)}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
                      title="คัดลอกพิกัด lat, long"
                    >
                      {copiedId === cam.id ? <span className="text-emerald-600 font-bold">คัดลอกแล้ว!</span> : <><Copy className="w-3 h-3" /> คัดลอกพิกัด</>}
                    </button>
                  </div>
                </div>

                {cam.notes && (
                  <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-700 border border-slate-200/80 mt-2">
                    <span className="font-semibold text-slate-800">หมายเหตุ: </span>
                    {cam.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveCamera(cam)}
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors text-[11px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    รายละเอียด
                  </button>

                  <button
                    onClick={() => handleOpenEditCameraModal(cam)}
                    className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-semibold px-2.5 py-1 rounded-lg transition-colors text-[11px]"
                    title="แก้ไขข้อมูลจุดติดตั้ง เช่น ชื่อ พิกัด สเปก"
                  >
                    <Edit3 className="w-3 h-3" />
                    แก้ไขจุดติดตั้ง
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {(cam.status === 'faulty' || cam.status === 'offline') && onReportRepairForCamera && (
                    <button
                      onClick={() => onReportRepairForCamera(cam)}
                      className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg shadow transition-colors text-[11px]"
                    >
                      <Wrench className="w-3 h-3" />
                      แจ้งซ่อม
                    </button>
                  )}

                  {isOfficerMode && (
                    <button
                      onClick={() => {
                        setActiveCamera(cam);
                        setEditCamStatus(cam.status);
                        setEditCamNotes(cam.notes || '');
                        setShowEditStatusModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-semibold px-2 py-1 rounded-lg transition-colors text-[11px]"
                      title="ปรับเปลี่ยนสถานะการใช้งาน"
                    >
                      ปรับสถานะ
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* 2. TABLE VIEW: 5-COLUMN CCTV STATUS TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                ตารางสรุปสถานะกล้องวงจรปิด CCTV (CCTV Status Table)
              </h3>
              <p className="text-[11px] text-slate-500">
                แสดงข้อมูลจุดติดตั้ง พิกัดทางภูมิศาสตร์ (Lat, Long) และสถานะการใช้งานจริง ({filteredCameras.length} รายการ)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                🟢 ใช้งานได้ปกติ: {filteredCameras.filter(c => c.status === 'online').length} ตัว
              </span>
              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full border border-rose-300">
                🔴 ใช้งานไม่ได้: {filteredCameras.filter(c => c.status !== 'online').length} ตัว
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-extrabold border-b border-slate-200">
                  <th className="p-3 text-center whitespace-nowrap w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                      title="เลือก/ยกเลิกเลือกทั้งหมด"
                    />
                  </th>
                  <th className="p-3 text-center whitespace-nowrap w-16">1. ตัวที่</th>
                  <th className="p-3 min-w-[240px]">2. รายละเอียดจุดติดตั้ง</th>
                  <th className="p-3 whitespace-nowrap min-w-[180px]">3. ละติจูด-ลองจิจูด</th>
                  <th className="p-3 whitespace-nowrap min-w-[190px]">4. สถานะใช้งาน - ใช้งานไม่ได้</th>
                  <th className="p-3 min-w-[200px]">5. หมายเหตุ</th>
                  <th className="p-3 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCameras.map((cam, idx) => {
                  const latVal = cam.latitude ?? 13.84751;
                  const lngVal = cam.longitude ?? 100.56912;
                  const isOnline = cam.status === 'online';
                  const isSelected = selectedCameraIds.includes(cam.id);

                  return (
                    <tr
                      key={cam.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="p-3 text-center align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCamera(cam.id)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600 mt-1"
                          title="เลือก/ยกเลิกเลือกกล้องนี้"
                        />
                      </td>

                      {/* 1. ตัวที่ (Index & Camera ID) */}
                      <td className="p-3 text-center align-top">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-black text-slate-800 bg-slate-200/80 w-6 h-6 rounded-full flex items-center justify-center mb-1">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {cam.id}
                          </span>
                        </div>
                      </td>

                      {/* 2. รายละเอียดจุดติดตั้ง */}
                      <td className="p-3 align-top space-y-1">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{cam.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1">
                          {cam.cabinetNumber && (
                            <span className="font-semibold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {cam.cabinetNumber}
                            </span>
                          )}
                          {cam.channel && (
                            <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {cam.channel}
                            </span>
                          )}
                          {cam.assetCode && (
                            <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`รหัสสินทรัพย์ในระบบ: ${cam.systemAssetCode || '-'}`}>
                              🏷️ {cam.assetCode}
                            </span>
                          )}
                          <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                            {cam.building}
                          </span>
                          <span>({cam.floor})</span>
                          <span className="text-slate-300">•</span>
                          <span>โซน {cam.zone}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 pt-0.5">
                          <span>IP: <strong className="text-slate-700">{cam.ipAddress}</strong></span>
                          <span>•</span>
                          <span>{getTypeLabel(cam.type)} ({cam.resolution})</span>
                          {cam.assetName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-sans">{cam.assetName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. ละติจูด-ลองจิจูด */}
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{latVal.toFixed(5)}, {lngVal.toFixed(5)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <button
                              onClick={() => handleCopyCoords(cam.id, cam.latitude, cam.longitude)}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 font-semibold"
                              title="คัดลอกพิกัด lat, long"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              {copiedId === cam.id ? <span className="text-emerald-600 font-bold">คัดลอกแล้ว!</span> : 'คัดลอก'}
                            </button>
                            <span className="text-slate-300">|</span>
                            <a
                              href={`https://www.google.com/maps?q=${latVal},${lngVal}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              <Globe className="w-2.5 h-2.5" /> Google Maps
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* 4. สถานะใช้งาน - ใช้งานไม่ได้ */}
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              🟢 ใช้งานได้ (Online)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              🔴 ใช้งานไม่ได้ ({cam.status === 'faulty' ? 'ชำรุด/ขัดข้อง' : cam.status === 'maintenance' ? 'อยู่ระหว่างซ่อม' : 'ขาดการเชื่อมต่อ'})
                            </span>
                          )}
                          <div className="text-[10px] text-slate-500 pl-1 font-mono">
                            เช็กล่าสุด: {cam.lastMaintenance}
                          </div>
                        </div>
                      </td>

                      {/* 5. หมายเหตุ */}
                      <td className="p-3 align-top text-xs text-slate-800">
                        {cam.notes ? (
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] leading-relaxed font-medium">
                            {cam.notes}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- ไม่มีหมายเหตุ -</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveCamera(cam)}
                            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="ดูรายละเอียดฉบับเต็ม"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditCameraModal(cam)}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2 py-1 rounded-lg text-[11px] transition-colors"
                            title="แก้ไขข้อมูลจุดติดตั้ง เช่น ชื่อ พิกัด สเปก IP"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>แก้ไข</span>
                          </button>

                          {!isOnline && onReportRepairForCamera && (
                            <button
                              onClick={() => onReportRepairForCamera(cam)}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-2xs transition-colors"
                              title="ยื่นแจ้งซ่อมกล้องนี้"
                            >
                              แจ้งซ่อม
                            </button>
                          )}

                          {isOfficerMode && (
                            <button
                              onClick={() => {
                                setActiveCamera(cam);
                                setEditCamStatus(cam.status);
                                setEditCamNotes(cam.notes || '');
                                setShowEditStatusModal(true);
                              }}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold px-2 py-1 rounded-lg text-[11px] transition-colors"
                              title="ปรับเปลี่ยนสถานะ"
                            >
                              ปรับสถานะ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BUILDING / ZONE GROUPED VIEW */}
      {viewMode === 'building' && (
        <div className="space-y-6">
          {buildings.map((bld) => {
            const bldCams = filteredCameras.filter((c) => c.building === bld);
            if (bldCams.length === 0) return null;

            return (
              <div key={bld} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    {bld}
                    <span className="text-xs font-normal text-slate-500">
                      ({bldCams.length} จุดติดตั้ง)
                    </span>
                  </h3>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      ปกติ {bldCams.filter((c) => c.status === 'online').length}
                    </span>
                    <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                      ชำรุด {bldCams.filter((c) => c.status === 'faulty' || c.status === 'offline').length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bldCams.map((cam) => {
                    const isSelected = selectedCameraIds.includes(cam.id);
                    return (
                      <div
                        key={cam.id}
                        onClick={() => setActiveCamera(cam)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm' 
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectCamera(cam.id);
                              }}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600 shrink-0"
                              title="เลือก/ยกเลิกเลือกกล้องนี้"
                            />
                            <span className="font-mono text-xs font-bold text-blue-700">{cam.id}</span>
                          </div>
                          {getStatusBadge(cam.status)}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{cam.name}</h4>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                          <p className="text-[11px] text-slate-500">ชั้น {cam.floor} | โซน {cam.zone}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditCameraModal(cam);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-50 inline-flex items-center gap-0.5"
                            title="แก้ไขข้อมูลจุดติดตั้ง"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            แก้ไข
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. FLOOR PLAN / GRID VIEW */}
      {viewMode === 'floorplan' && (
        <div className="space-y-6">
          {buildings.map((bld) => {
            const bldCams = filteredCameras.filter((c) => c.building === bld);
            if (bldCams.length === 0) return null;

            // Group cameras by floor
            const floors = Array.from(new Set(bldCams.map((c) => c.floor))).sort();

            return (
              <div key={bld} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    {bld} - แผนผังชั้น (Floor Plans)
                  </h3>
                </div>

                <div className="space-y-8">
                  {floors.map((floor) => {
                    const floorCams = bldCams.filter((c) => c.floor === floor);
                    
                    return (
                      <div key={floor} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" />
                          {floor} <span className="text-xs font-normal text-slate-500">({floorCams.length} จุดติดตั้ง)</span>
                        </h4>

                        <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 min-h-[250px] overflow-x-auto overflow-y-hidden flex items-center">
                          {/* Decorative floor plan background lines */}
                          <div className="absolute inset-0 pointer-events-none grid grid-cols-5 grid-rows-2 opacity-40">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div key={i} className="border border-slate-100" />
                            ))}
                          </div>
                          
                          {/* Floor Plan Grid Layout */}
                          <div className="relative z-10 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 min-w-[600px]">
                            {floorCams.map((cam, idx) => {
                              const isSelected = selectedCameraIds.includes(cam.id);
                              return (
                                <div
                                  key={cam.id}
                                  onClick={() => setActiveCamera(cam)}
                                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40' :
                                    cam.status === 'online' ? 'border-emerald-200 bg-emerald-50/90 hover:border-emerald-400' :
                                    cam.status === 'faulty' ? 'border-rose-200 bg-rose-50/90 hover:border-rose-400' :
                                    cam.status === 'maintenance' ? 'border-amber-200 bg-amber-50/90 hover:border-amber-400' :
                                    'border-slate-200 bg-slate-50/90 hover:border-slate-400'
                                  }`}
                                >
                                  {/* Position Indicator */}
                                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black border-2 border-white shadow-sm">
                                    {idx + 1}
                                  </div>

                                  {/* Checkbox Top Right */}
                                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectCamera(cam.id)}
                                      className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                                      title="เลือก/ยกเลิกเลือกกล้องนี้"
                                    />
                                  </div>
                                
                                <div className="flex flex-col items-center text-center space-y-2 mt-1">
                                  <div className="relative">
                                    <Camera className={`w-10 h-10 ${
                                      cam.status === 'online' ? 'text-emerald-500' :
                                      cam.status === 'faulty' ? 'text-rose-500' :
                                      cam.status === 'maintenance' ? 'text-amber-500' :
                                      'text-slate-400'
                                    }`} />
                                    {(cam.status === 'online' || cam.status === 'faulty') && (
                                      <span className={`absolute top-0 right-0 w-3 h-3 rounded-full animate-ping ${
                                        cam.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'
                                      }`} />
                                    )}
                                  </div>
                                  
                                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-200">
                                    {cam.id}
                                  </span>
                                  
                                  <div className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px]">
                                    {cam.name}
                                  </div>
                                  
                                  <div className="text-[10px] font-medium text-slate-600 bg-white/80 px-2 py-1 rounded-md w-full truncate border border-slate-100">
                                    โซน: {cam.zone}
                                  </div>

                                  <div className="flex items-center gap-1 mt-1">
                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                      cam.status === 'online' ? 'bg-emerald-500' :
                                      cam.status === 'faulty' ? 'bg-rose-500' :
                                      cam.status === 'maintenance' ? 'bg-amber-500' :
                                      'bg-slate-400'
                                    }`} />
                                    <span className={`text-[10px] font-bold ${
                                      cam.status === 'online' ? 'text-emerald-700' :
                                      cam.status === 'faulty' ? 'text-rose-700' :
                                      cam.status === 'maintenance' ? 'text-amber-700' :
                                      'text-slate-600'
                                    }`}>
                                      {cam.status === 'online' ? 'ออนไลน์' :
                                       cam.status === 'faulty' ? 'ขัดข้อง' :
                                       cam.status === 'maintenance' ? 'ซ่อมบำรุง' :
                                       'ออฟไลน์'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <CctvMaintenanceCalendar 
          cameras={filteredCameras}
          onSelectCamera={(cam) => setActiveCamera(cam)}
        />
      )}

      {/* CAMERA DETAIL MODAL */}
      {activeCamera && !showEditStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-300 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {activeCamera.id}
                  </span>
                  {getStatusBadge(activeCamera.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeCamera.name}</h3>
              </div>
              <button
                onClick={() => setActiveCamera(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Cover Image Banner if available */}
            {(activeCamera.imageUrl || (activeCamera.attachments && activeCamera.attachments.some(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image')))) && (
              <div 
                onClick={() => {
                  const coverAtt = activeCamera.attachments?.find(a => a.url === activeCamera.imageUrl) || 
                                   activeCamera.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'));
                  if (coverAtt) {
                    setPreviewAttachment(coverAtt);
                  } else if (activeCamera.imageUrl) {
                    setPreviewAttachment({
                      id: 'cover',
                      name: `ภาพจุดติดตั้ง ${activeCamera.name}`,
                      url: activeCamera.imageUrl,
                      type: 'image/jpeg',
                      uploadedAt: activeCamera.installedDate
                    });
                  }
                }}
                className="w-full h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative group cursor-pointer shadow-inner"
              >
                <img
                  src={activeCamera.imageUrl || activeCamera.attachments?.find(a => a.type?.startsWith('image/') || a.url?.startsWith('data:image'))?.url}
                  alt={activeCamera.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end justify-between p-3 text-white">
                  <div className="flex items-center gap-1.5 text-xs font-semibold drop-shadow">
                    <ImageIcon className="w-4 h-4 text-amber-300" />
                    <span>ภาพถ่ายหน้างานจริงของจุดติดตั้ง</span>
                  </div>
                  <span className="text-[11px] bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> คลิกดูภาพใหญ่
                  </span>
                </div>
              </div>
            )}

            {/* Specifications List */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {activeCamera.cabinetNumber && (
                  <div><strong>ตู้ควบคุม:</strong> <span className="font-semibold text-slate-900">{activeCamera.cabinetNumber}</span></div>
                )}
                {activeCamera.channel && (
                  <div><strong>ช่องสัญญาณ:</strong> <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">{activeCamera.channel}</span></div>
                )}
                {activeCamera.systemAssetCode && (
                  <div><strong>รหัสสินทรัพย์ในระบบ:</strong> <span className="font-mono text-slate-800">{activeCamera.systemAssetCode}</span></div>
                )}
                {activeCamera.assetCode && (
                  <div><strong>รหัสสินทรัพย์:</strong> <span className="font-mono font-bold text-blue-700">{activeCamera.assetCode}</span></div>
                )}
                {activeCamera.assetName && (
                  <div className="col-span-2"><strong>ชื่อสินทรัพย์:</strong> <span className="text-slate-800">{activeCamera.assetName}</span></div>
                )}
                {activeCamera.community && (
                  <div className="col-span-2"><strong>ชุมชน:</strong> <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{activeCamera.community}</span></div>
                )}
                <div><strong>อาคาร/สถานที่:</strong> {activeCamera.building}</div>
                <div><strong>ชั้น/พื้นที่:</strong> {activeCamera.floor}</div>
                <div><strong>โซน:</strong> {activeCamera.zone}</div>
                <div><strong>ชนิดกล้อง:</strong> {getTypeLabel(activeCamera.type)}</div>
                <div><strong>ความละเอียด:</strong> {activeCamera.resolution}</div>
                <div><strong>IP Address:</strong> <span className="font-mono">{activeCamera.ipAddress}</span></div>
                <div><strong>Serial Number:</strong> <span className="font-mono">{activeCamera.serialNumber}</span></div>
                <div className="col-span-2 flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-200 mt-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <strong>พิกัดแผนที่:</strong> 
                    <span className="font-mono text-slate-700">
                      {activeCamera.latitude?.toFixed(5) || '13.84751'}, {activeCamera.longitude?.toFixed(5) || '100.56910'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCoords(activeCamera.id, activeCamera.latitude, activeCamera.longitude)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 font-semibold text-xs border border-blue-200 bg-white shadow-sm"
                    title="คัดลอกพิกัด lat, long"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === activeCamera.id ? <span className="text-emerald-600 font-bold">คัดลอกแล้ว!</span> : 'คัดลอกพิกัด'}
                  </button>
                </div>
                <div><strong>ผู้ตรวจสอบ:</strong> {activeCamera.inspector || '-'}</div>
                <div><strong>ตรวจเช็กล่าสุด:</strong> {activeCamera.lastMaintenance}</div>
              </div>

              {activeCamera.notes && (
                <div className="pt-2 border-t border-slate-200 text-slate-700">
                  <strong>บันทึกอาการ/หมายเหตุ:</strong>
                  <p className="mt-0.5 bg-white p-2.5 rounded border border-slate-200">{activeCamera.notes}</p>
                </div>
              )}
            </div>

            {/* Repair History List */}
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-slate-500" />
                  ประวัติการแจ้งซ่อมและบำรุงรักษา (Recent History)
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLogsModal(true)}
                    className="text-[10px] flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md transition-colors font-bold border border-indigo-200"
                  >
                    <ClipboardList className="w-3 h-3" />
                    Audit Logs
                  </button>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="text-[10px] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors font-bold border border-slate-200"
                  >
                    <Printer className="w-3 h-3" />
                    พิมพ์ (PDF)
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {[
                  ...(activeCamera.status === 'faulty' ? [{ date: new Date().toISOString().split('T')[0], desc: activeCamera.notes || 'แจ้งปัญหาสัญญาณภาพขาดหาย/ชำรุด', status: 'pending' }] : []),
                  ...(activeCamera.status === 'maintenance' ? [{ date: new Date().toISOString().split('T')[0], desc: activeCamera.notes || 'ช่างกำลังเข้าดำเนินการ/รออะไหล่', status: 'in_progress' }] : []),
                  { date: activeCamera.lastMaintenance, desc: 'ตรวจสอบและทำความสะอาดตามวงรอบ', status: 'completed' },
                  { date: '2023-11-15', desc: 'อัปเดตเฟิร์มแวร์ระบบและตั้งค่า IP ใหม่', status: 'completed' },
                  { date: '2023-05-10', desc: 'ติดตั้งและตั้งค่าเริ่มต้น', status: 'completed' }
                ].map((history, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      history.status === 'completed' ? 'bg-emerald-500' : 
                      history.status === 'in_progress' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 font-medium truncate">{history.desc}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">วันที่: {history.date}</p>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        history.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        history.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {history.status === 'completed' ? 'เสร็จสิ้น' : history.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Files & Site Photos Section */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  ภาพถ่ายและเอกสารแนบประจำจุดติดตั้ง ({activeCamera.attachments?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const cam = activeCamera;
                    setActiveCamera(null);
                    handleOpenEditCameraModal(cam);
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  เพิ่ม/แก้ไขไฟล์แนบ
                </button>
              </div>

              {activeCamera.attachments && activeCamera.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {activeCamera.attachments.map((att) => {
                    const isImage = att.type?.startsWith('image/') || att.url?.startsWith('data:image');
                    const getCatLabel = (cat?: string) => {
                      switch (cat) {
                        case 'site_photo': return '📷 ภาพหน้างาน';
                        case 'diagram': return '🗺️ แผนผัง';
                        case 'spec_sheet': return '📄 สเปก/คู่มือ';
                        case 'maintenance_doc': return '🔧 เอกสารซ่อม';
                        default: return '📁 ไฟล์แนบ';
                      }
                    };

                    return (
                      <div
                        key={att.id}
                        className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 flex items-center gap-2.5 hover:bg-slate-100/80 transition-colors"
                      >
                        <div
                          onClick={() => setPreviewAttachment(att)}
                          className="w-11 h-11 rounded-lg bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center cursor-pointer group relative"
                        >
                          {isImage ? (
                            <>
                              <img
                                src={att.url}
                                alt={att.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <ZoomIn className="w-3.5 h-3.5" />
                              </div>
                            </>
                          ) : (
                            <FileText className="w-5 h-5 text-blue-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                            {att.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-sans text-[9px]">
                              {getCatLabel(att.category)}
                            </span>
                            <span>{formatFileSize(att.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                            title="ดูตัวอย่าง"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={att.url}
                            download={att.name}
                            className="p-1 text-slate-500 hover:text-emerald-600 rounded transition-colors"
                            title="ดาวน์โหลดไฟล์"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500">
                  <span>ยังไม่มีการแนบภาพถ่ายหรือเอกสารสำหรับกล้องตัวนี้</span>
                </div>
              )}
            </div>

            {/* Quick Add Note (Technician) */}
            {isOfficerMode && (
              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  เพิ่มบันทึกด่วน (Quick Note)
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="พิมพ์บันทึกหรือข้อสังเกตเบื้องต้น..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddQuickNote();
                    }}
                  />
                  <button 
                    onClick={handleAddQuickNote}
                    disabled={!(quickNote || '').trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-slate-100 mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const cam = activeCamera;
                    setActiveCamera(null);
                    handleOpenEditCameraModal(cam);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="แก้ไขข้อมูลจุดติดตั้ง เช่น ชื่อ พิกัด สเปก IP Address"
                >
                  <Edit3 className="w-4 h-4 text-indigo-100" />
                  แก้ไขข้อมูลจุดติดตั้ง
                </button>

                {isOfficerMode && (
                  <button
                    onClick={() => {
                      setEditCamStatus(activeCamera.status);
                      setEditCamNotes(activeCamera.notes || '');
                      setShowEditStatusModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl shadow transition-colors"
                  >
                    ปรับอัปเดตสถานะ
                  </button>
                )}
              </div>

              {onRequestCctvForCamera && (
                <button
                  onClick={() => {
                    const cam = activeCamera;
                    setActiveCamera(null);
                    onRequestCctvForCamera(cam);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  title="ยื่นคำร้องขอดูหรือขอสำเนาไฟล์ภาพจากกล้องวงจรปิดจุดนี้"
                >
                  <Camera className="w-4 h-4 text-blue-100" />
                  ยื่นคำร้องขอดูภาพกล้องนี้
                </button>
              )}

              {(activeCamera.status === 'faulty' || activeCamera.status === 'offline') && onReportRepairForCamera && (
                <button
                  onClick={() => {
                    const cam = activeCamera;
                    setActiveCamera(null);
                    onReportRepairForCamera(cam);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  ยื่นแบบฟอร์มแจ้งซ่อมกล้องนี้
                </button>
              )}

              <button
                onClick={() => setActiveCamera(null)}
                className="ml-auto px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STATUS MODAL (Officer Mode) */}
      {showEditStatusModal && activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-300 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                ปรับอัปเดตสถานะกล้อง: {activeCamera.id}
              </h3>
              <button
                onClick={() => setShowEditStatusModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เลือกสถานะการใช้งานใหม่ *</label>
                <select
                  value={editCamStatus}
                  onChange={(e) => setEditCamStatus(e.target.value as CctvStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                >
                  <option value="online">ใช้งานได้ปกติ (Online)</option>
                  <option value="faulty">ชำรุด/ขัดข้อง (Faulty)</option>
                  <option value="maintenance">อยู่ระหว่างซ่อมแซม (Maintenance)</option>
                  <option value="offline">ขาดการเชื่อมต่อ (Offline)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บันทึกข้อความ / รายละเอียดอาการ</label>
                <textarea
                  rows={3}
                  value={editCamNotes}
                  onChange={(e) => setEditCamNotes(e.target.value)}
                  placeholder="ระบุสาเหตุหรือความคืบหน้า..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditStatusModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  บันทึกสถานะ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CAMERA MODAL (WITH SAVE & EDIT BUTTONS) */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-300 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${editingCameraId ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {editingCameraId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingCameraId ? `แก้ไขข้อมูลจุดติดตั้งกล้องวงจรปิด (${editingCameraId})` : 'เพิ่มจุดติดตั้งกล้องวงจรปิดใหม่'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingCameraId ? 'ปรับปรุงรายละเอียดทางเทคนิค พิกัด หรือสถานที่ติดตั้งของกล้องตัวนี้' : 'กรอกรายละเอียดเพื่อบันทึกจุดติดตั้งกล้อง CCTV ตัวใหม่เข้าสู่ระบบ'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCameraModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraFormNotice && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 flex items-center gap-2">
                <span>{cameraFormNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveCameraSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสกล้อง (Camera ID) <span className="text-slate-400 font-normal">(สร้างให้อัตโนมัติหากว่าง)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น CAM-ADM-101"
                    value={cameraFormData.id || ''}
                    disabled={!!editingCameraId}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อจุดติดตั้ง / บริเวณ * <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ทางเข้าทิศเหนือ, โถงลิฟต์ชั้น 1"
                    value={cameraFormData.name || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อาคาร (Building)</label>
                  <select
                    value={cameraFormData.building || 'อาคารอำนวยการ'}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, building: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="อาคารอำนวยการ">อาคารอำนวยการ</option>
                    <option value="อาคารสารสนเทศ">อาคารสารสนเทศ</option>
                    <option value="อาคารเรียนรวม 1">อาคารเรียนรวม 1</option>
                    <option value="อาคารเรียนรวม 2">อาคารเรียนรวม 2</option>
                    <option value="อาคารปฏิบัติการวิทยาศาสตร์">อาคารปฏิบัติการวิทยาศาสตร์</option>
                    <option value="หอประชุมใหญ่">หอประชุมใหญ่</option>
                    <option value="อาคารกีฬาและนันทนาการ">อาคารกีฬาและนันทนาการ</option>
                    <option value="อาคารจอดรถ">อาคารจอดรถ</option>
                    <option value="บริเวณภายนอกอาคาร / ถนน">บริเวณภายนอกอาคาร / ถนน</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชั้น (Floor)</label>
                  <input
                    type="text"
                    placeholder="เช่น ชั้น 1, ชั้น 2, ดาดฟ้า"
                    value={cameraFormData.floor || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">โซน / ตำแหน่งย่อย</label>
                  <input
                    type="text"
                    placeholder="เช่น โถงทางเดิน, ประตู A, บันไดหนีไฟ"
                    value={cameraFormData.zone || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, zone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชนิดกล้อง (Type)</label>
                  <select
                    value={cameraFormData.type || 'dome'}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, type: e.target.value as CctvType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="dome">Dome Camera (โดมในอาคาร)</option>
                    <option value="bullet">Bullet Camera (กระบอกภายนอก)</option>
                    <option value="ptz">PTZ Speed Dome (หมุน ซูมได้)</option>
                    <option value="360_degree">Fisheye 360° (มุมมองรอบทิศ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ความละเอียด (Resolution)</label>
                  <select
                    value={cameraFormData.resolution || '1080p Full HD'}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, resolution: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="1080p Full HD">1080p Full HD (2MP)</option>
                    <option value="4MP 2K Quad HD">4MP 2K Quad HD</option>
                    <option value="4K Ultra HD (8MP)">4K Ultra HD (8MP)</option>
                    <option value="720p HD">720p HD</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สถานะการใช้งาน</label>
                  <select
                    value={cameraFormData.status || 'online'}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, status: e.target.value as CctvStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-slate-800"
                  >
                    <option value="online">🟢 ใช้งานได้ปกติ (Online)</option>
                    <option value="faulty">🔴 ชำรุด/ขัดข้อง (Faulty)</option>
                    <option value="maintenance">🟡 อยู่ระหว่างซ่อมแซม (Maintenance)</option>
                    <option value="offline">⚪ ขาดการเชื่อมต่อ (Offline)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.10.xxx"
                    value={cameraFormData.ipAddress || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="SN-CCTV-..."
                    value={cameraFormData.serialNumber || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Coordinates: Lat & Lng & GPS Button */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    พิกัดภูมิศาสตร์ (GPS Coordinates)
                  </span>
                  <button
                    type="button"
                    onClick={handleFetchCurrentGps}
                    className="inline-flex items-center gap-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-blue-600" />
                    ดึงพิกัด GPS ปัจจุบัน
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">ละติจูด (Latitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      placeholder="13.847510"
                      value={cameraFormData.latitude ?? 13.84751}
                      onChange={(e) => setCameraFormData({ ...cameraFormData, latitude: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">ลองจิจูด (Longitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      placeholder="100.569120"
                      value={cameraFormData.longitude ?? 100.56912}
                      onChange={(e) => setCameraFormData({ ...cameraFormData, longitude: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่ตรวจสอบ / บันทึกล่าสุด</label>
                  <input
                    type="date"
                    value={cameraFormData.lastMaintenance || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, lastMaintenance: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ตรวจสอบ / ช่างเทคนิคผู้ดูแล</label>
                  <input
                    type="text"
                    placeholder="เช่น นายสมชาย ช่างเทคนิค CCTV"
                    value={cameraFormData.inspector || ''}
                    onChange={(e) => setCameraFormData({ ...cameraFormData, inspector: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม / ข้อสังเกตสภาพกล้อง</label>
                <textarea
                  rows={2}
                  placeholder="เช่น มุมมองชัดเจน, ปรับมุมมองใหม่เมื่อเดือนก่อน, สายสัญญาณเดิม..."
                  value={cameraFormData.notes || ''}
                  onChange={(e) => setCameraFormData({ ...cameraFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 📸 Attachment & Photo Upload Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      อัปโหลดไฟล์ / รูปภาพจุดติดตั้งกล้อง (Camera Photos & Attachments)
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      แนบภาพถ่ายจุดติดตั้งจริง แผนผัง เอกสารสเปก หรือคู่มือ (สูงสุด 10MB ต่อไฟล์)
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Hidden file input for general files */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          processUploadedFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                    {/* Hidden file input for camera capture */}
                    <input
                      ref={cameraCaptureInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          processUploadedFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => cameraCaptureInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      title="เปิดกล้องอุปกรณ์เพื่อถ่ายภาพหน้างานจริง"
                    >
                      <Camera className="w-3.5 h-3.5 text-rose-600" />
                      ถ่ายภาพหน้างาน
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      เลือกไฟล์จากเครื่อง
                    </button>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files) {
                      processUploadedFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-white bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5 text-slate-500">
                    <div className="p-2.5 bg-white rounded-full border border-slate-200 text-blue-600 shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 underline">คลิกเพื่อเลือกไฟล์</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      รองรับไฟล์รูปภาพ JPG, PNG, WEBP, GIF และเอกสาร PDF, DOCX, XLSX (สูงสุด 10MB ต่อไฟล์)
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Uploaded Files & Images Gallery */}
                {cameraFormData.attachments && cameraFormData.attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>ไฟล์ที่แนบแล้ว ({cameraFormData.attachments.length} ไฟล์):</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        คลิกที่รูปเพื่อดูภาพขนาดเต็ม หรือคลิกตั้งเป็นภาพหน้าปก
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cameraFormData.attachments.map((att) => {
                        const isImage = att.type?.startsWith('image/') || att.url?.startsWith('data:image');
                        const isPrimary = cameraFormData.imageUrl === att.url;

                        return (
                          <div
                            key={att.id}
                            className={`p-2.5 rounded-xl border flex items-center gap-3 transition-all relative ${
                              isPrimary
                                ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/40'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            {/* Thumbnail / Icon */}
                            <div
                              onClick={() => setPreviewAttachment(att)}
                              className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative group"
                            >
                              {isImage ? (
                                <>
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <ZoomIn className="w-4 h-4" />
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-500">
                                  <FileText className="w-6 h-6 text-blue-600" />
                                  <span className="text-[9px] font-bold uppercase mt-0.5 text-slate-600">
                                    {att.name.split('.').pop() || 'FILE'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Info & Category */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                                  {att.name}
                                </p>
                                {isPrimary && (
                                  <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-full shrink-0">
                                    ⭐ ภาพปก
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {formatFileSize(att.size)}
                                {att.uploadedAt && ` • ${new Date(att.uploadedAt).toLocaleDateString('th-TH')}`}
                              </p>

                              {/* Category tag / change */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <select
                                  value={att.category || (isImage ? 'site_photo' : 'other')}
                                  onChange={(e) => {
                                    const newCat = e.target.value as any;
                                    setCameraFormData((prev) => ({
                                      ...prev,
                                      attachments: prev.attachments?.map((a) =>
                                        a.id === att.id ? { ...a, category: newCat } : a
                                      )
                                    }));
                                  }}
                                  className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 outline-none"
                                >
                                  <option value="site_photo">📷 ภาพถ่ายจุดติดตั้ง</option>
                                  <option value="diagram">🗺️ แผนผัง/ตำแหน่ง</option>
                                  <option value="spec_sheet">📄 เอกสารสเปก/คู่มือ</option>
                                  <option value="maintenance_doc">🔧 บันทึกซ่อม/ตรวจรับ</option>
                                  <option value="other">📁 อื่นๆ</option>
                                </select>

                                {isImage && !isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(att.url)}
                                    className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer"
                                    title="ตั้งรูปนี้เป็นรูปปกหลักของกล้อง"
                                  >
                                    ตั้งเป็นรูปหลัก
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="ดูตัวอย่าง / ดูขนาดเต็ม"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="ลบไฟล์นี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Save & Edit & Delete */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  {editingCameraId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCamera(editingCameraId)}
                      className="inline-flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 px-3.5 py-2 font-bold rounded-xl transition-colors cursor-pointer"
                      title="ลบจุดติดตั้งนี้ออกจากระบบ"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>ลบจุดติดตั้งนี้</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl shadow-md transition-all cursor-pointer text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingCameraId ? 'บันทึกการแก้ไขจุดติดตั้ง' : 'บันทึกและเพิ่มจุดติดตั้ง'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAIR HISTORY PRINT MODAL */}
      {showPrintModal && activeCamera && (
        <CctvRepairHistoryPrintModal 
          camera={activeCamera} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}

      {/* MAINTENANCE LOGS MODAL */}
      {showLogsModal && activeCamera && (
        <CctvMaintenanceLogsModal 
          camera={activeCamera} 
          onClose={() => setShowLogsModal(false)} 
          onViewRequest={onViewRequest}
        />
      )}

      {/* CCTV REPORT & QUOTATION CENTER MODAL */}
      {showReportCenterModal && (
        <CctvReportCenterModal
          cameras={cameras}
          onClose={() => setShowReportCenterModal(false)}
          onRefreshData={refreshList}
        />
      )}

      {/* MONTHLY PDF OVERSIGHT REPORT MODAL */}
      {showMonthlyPdfModal && (
        <CctvMonthlyPdfModal
          cameras={cameras}
          onClose={() => setShowMonthlyPdfModal(false)}
        />
      )}

      {/* BULK SELECTED UNITS PDF OVERSIGHT REPORT MODAL */}
      {showSelectedPdfModal && (
        <CctvMonthlyPdfModal
          cameras={cameras.filter(c => selectedCameraIds.includes(c.id))}
          onClose={() => setShowSelectedPdfModal(false)}
        />
      )}

      {/* BULK SELECTED UNITS MAINTENANCE SCHEDULE SUMMARY PRINT MODAL */}
      {showMaintenanceScheduleModal && (
        <CctvMaintenanceSchedulePrintModal
          cameras={cameras.filter(c => selectedCameraIds.includes(c.id))}
          onClose={() => setShowMaintenanceScheduleModal(false)}
        />
      )}

      {/* SUMMARY PRINT REPORT MODAL */}
      {showSummaryPrintModal && (
        <CctvDashboardPrintReportModal
          cameras={cameras}
          onClose={() => setShowSummaryPrintModal(false)}
          isOfficerMode={isOfficerMode}
        />
      )}

      {/* ATTACHMENT / IMAGE LIGHTBOX PREVIEW MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-sm truncate" title={previewAttachment.name}>
                  {previewAttachment.name}
                </span>
                {previewAttachment.size && (
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    ({formatFileSize(previewAttachment.size)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.url}
                  download={previewAttachment.name}
                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลด
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50 min-h-[300px]">
              {previewAttachment.type?.startsWith('image/') || previewAttachment.url?.startsWith('data:image') ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
                />
              ) : (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                  <p className="font-bold text-base text-slate-200">{previewAttachment.name}</p>
                  <p className="text-xs text-slate-400">ไฟล์เอกสารแนบสำหรับจุดติดตั้งนี้</p>
                  <a
                    href={previewAttachment.url}
                    download={previewAttachment.name}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md mt-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดไฟล์เอกสารเพื่อเปิดดู
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>ประเภท: {previewAttachment.category || 'เอกสาร/ภาพถ่ายจุดติดตั้ง'}</span>
              {previewAttachment.uploadedAt && (
                <span>อัปโหลดเมื่อ: {new Date(previewAttachment.uploadedAt).toLocaleString('th-TH')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Folder & Maintenance Reports Hub */}
      {showAdminFolderModal && (
        <AdminFolderSystemModal
          isOpen={showAdminFolderModal}
          onClose={() => setShowAdminFolderModal(false)}
          adminName="นายสมศักดิ์ วงศ์สวรรค์ (Admin ผู้ดูแลระบบ)"
          defaultActiveTab="inspections"
        />
      )}

      {/* CCTV Equipment & Central Assets Modal */}
      {showEquipmentModal && (
        <CctvEquipmentRegisterModal
          onClose={() => setShowEquipmentModal(false)}
        />
      )}
    </div>
  );
};
