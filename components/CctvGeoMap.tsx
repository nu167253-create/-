// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { CctvCamera } from '../types/cctv';
import { CctvMunicipalZoneMap } from './CctvMunicipalZoneMap';
import { CctvHeatmapOverlay } from './CctvHeatmapOverlay';
import { 
  getFilteredHeatmapPoints, 
  getDynamicHighIncidentZones, 
  getHeatmapSummaryStats, 
  HighIncidentZoneSummary 
} from '../utils/cctvHeatmapService';
import { 
  Video, 
  ShieldCheck, 
  Eye, 
  Layers, 
  Radio, 
  Copy, 
  Check, 
  Filter, 
  Wrench, 
  Camera, 
  FileText, 
  Edit3, 
  Compass, 
  Info,
  Flame,
  Sliders,
  TrendingUp,
  AlertOctagon,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Zap
} from 'lucide-react';

declare const google: any;

const API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// Get camera coverage radius in meters based on type
const getCoverageRadius = (type?: string) => {
  switch (type) {
    case 'ptz': return 80;
    case '360_degree': return 60;
    case 'bullet': return 50;
    case 'dome': return 35;
    default: return 45;
  }
};

const getCameraTypeLabel = (type?: string) => {
  switch (type) {
    case 'ptz': return 'PTZ Speed Dome (80m)';
    case '360_degree': return 'Fisheye 360° (60m)';
    case 'bullet': return 'Bullet Camera (50m)';
    case 'dome': return 'Dome Camera (35m)';
    default: return 'Standard CCTV (45m)';
  }
};

// Component to render Coverage Area Circle on Google Map
const CameraCoverageCircle = ({
  center,
  radius,
  status,
  visible
}: {
  center: { lat: number; lng: number };
  radius: number;
  status: string;
  visible: boolean;
}) => {
  const map = useMap();
  const circleRef = useRef<any>(null);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'online': return '#10b981'; // emerald
      case 'faulty': return '#f43f5e'; // rose
      case 'maintenance': return '#f59e0b'; // amber
      case 'offline': default: return '#64748b'; // slate
    }
  };

  useEffect(() => {
    if (!map) return;

    if (!visible) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      return;
    }

    const color = getStatusColor(status);

    if (!circleRef.current) {
      if (typeof google !== 'undefined' && google.maps && google.maps.Circle) {
        circleRef.current = new google.maps.Circle({
          map,
          center,
          radius,
          fillColor: color,
          fillOpacity: 0.18,
          strokeColor: color,
          strokeOpacity: 0.65,
          strokeWeight: 1.5,
          clickable: false,
        });
      }
    } else {
      circleRef.current.setOptions({
        map,
        center,
        radius,
        fillColor: color,
        fillOpacity: 0.18,
        strokeColor: color,
        strokeOpacity: 0.65,
        strokeWeight: 1.5,
      });
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, center.lat, center.lng, radius, status, visible]);

  return null;
};

// Component to handle auto-bounds fitting
const MapBoundsHandler = ({ cameras }: { cameras: CctvCamera[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || cameras.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let hasValid = false;

    cameras.forEach(c => {
      if (c.latitude && c.longitude) {
        bounds.extend({ lat: c.latitude, lng: c.longitude });
        hasValid = true;
      }
    });

    if (hasValid) {
      map.fitBounds(bounds, { top: 80, bottom: 70, left: 50, right: 50 });
      if (cameras.length === 1) {
        map.setZoom(17);
      }
    }
  }, [map, cameras]);

  return null;
};

// Component to handle smooth panning and zooming to a selected high-incident zone
const MapFlyToHandler = ({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(target.zoom || 17);
  }, [map, target]);

  return null;
};

interface MarkerWithInfoWindowProps {
  camera: CctvCamera;
  onSelectCamera: (camera: CctvCamera) => void;
  showCoverage: boolean;
  onRequestCctvForCamera?: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onEditCamera?: (camera: CctvCamera) => void;
}

const MarkerWithInfoWindow = ({
  camera,
  onSelectCamera,
  showCoverage,
  onRequestCctvForCamera,
  onReportRepairForCamera,
  onEditCamera
}: MarkerWithInfoWindowProps) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const lat = camera.latitude || 13.8475;
  const lng = camera.longitude || 100.5691;
  const radius = getCoverageRadius(camera.type);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981'; // emerald-500
      case 'faulty': return '#f43f5e'; // rose-500
      case 'maintenance': return '#f59e0b'; // amber-500
      case 'offline':
      default: return '#64748b'; // slate-500
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'ใช้งานได้ปกติ (Online)';
      case 'faulty': return 'ชำรุด/ขัดข้อง (Faulty)';
      case 'maintenance': return 'อยู่ระหว่างซ่อมแซม (Maintenance)';
      case 'offline': return 'ขาดการเชื่อมต่อ (Offline)';
      default: return 'ไม่ทราบสถานะ';
    }
  };

  const handleCopyCoords = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Render Coverage Area Circle */}
      <CameraCoverageCircle
        center={{ lat, lng }}
        radius={radius}
        status={camera.status}
        visible={showCoverage}
      />

      <AdvancedMarker 
        ref={markerRef} 
        position={{ lat, lng }} 
        onClick={() => setOpen(true)}
        title={`${camera.id} - ${camera.name}`}
      >
        <Pin 
          background={getStatusColor(camera.status)} 
          glyphColor="#fff" 
          borderColor="rgba(0,0,0,0.25)"
          scale={1.1}
        />
      </AdvancedMarker>

      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 min-w-[260px] max-w-[300px] text-slate-800 font-sans">
            <div className="flex items-start justify-between gap-2 mb-1 border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                  {camera.id}
                </span>
                <div className="font-extrabold text-sm text-slate-900 mt-1 leading-snug">{camera.name}</div>
              </div>
            </div>
            
            <div className="text-xs space-y-1.5 text-slate-700 mt-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(camera.status) }}></span>
                <span>{getStatusLabel(camera.status)}</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
                <div>🏢 <strong>สถานที่:</strong> {camera.building} ({camera.floor})</div>
                <div>📍 <strong>โซน:</strong> {camera.zone}</div>
                <div>📷 <strong>ประเภท:</strong> {getCameraTypeLabel(camera.type)}</div>
                <div>📡 <strong>รัศมีครอบคลุม:</strong> ~{radius} เมตร</div>
                <div>🌐 <strong>IP:</strong> <span className="font-mono text-blue-900 font-semibold">{camera.ipAddress}</span></div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200">
                <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกพิกัด'}</span>
                </button>
              </div>

              {camera.notes && (
                <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>หมายเหตุ:</strong> {camera.notes}
                </div>
              )}
            </div>

            {/* Quick Request Filing Actions from Marker */}
            <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
              {onRequestCctvForCamera && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRequestCctvForCamera(camera);
                  }}
                  className="w-full text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="ยื่นคำร้องขอดูภาพหรือขอไฟล์สำเนา CCTV จากจุดติดตั้งนี้"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-100" />
                  <span>📹 ยื่นคำร้องขอดูภาพจากกล้องนี้</span>
                </button>
              )}

              <div className="flex items-center justify-between gap-1.5">
                {onReportRepairForCamera && (camera.status === 'faulty' || camera.status === 'offline') && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onReportRepairForCamera(camera);
                    }}
                    className="flex-1 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="แจ้งซ่อมกล้องนี้เนื่องจากพบการชำรุดหรือขัดข้อง"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>แจ้งซ่อม</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelectCamera(camera);
                  }}
                  className="flex-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-blue-300" />
                  <span>ดูสเปกเต็ม</span>
                </button>

                {onEditCamera && (
                  <button 
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onEditCamera(camera);
                    }}
                    className="text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="แก้ไขข้อมูลจุดติดตั้งกล้องนี้"
                  >
                    <Edit3 className="w-3 h-3 text-indigo-200" />
                    <span>แก้ไข</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface CctvGeoMapProps {
  cameras: CctvCamera[];
  onSelectCamera: (camera: CctvCamera) => void;
  onRequestCctvForCamera?: (camera: CctvCamera) => void;
  onReportRepairForCamera?: (camera: CctvCamera) => void;
  onEditCamera?: (camera: CctvCamera) => void;
  initialShowHeatmap?: boolean;
}

export const CctvGeoMap: React.FC<CctvGeoMapProps> = ({
  cameras,
  onSelectCamera,
  onRequestCctvForCamera,
  onReportRepairForCamera,
  onEditCamera,
  initialShowHeatmap = true
}) => {
  const [showCoverage, setShowCoverage] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Heatmap Overlay States
  const [showHeatmap, setShowHeatmap] = useState<boolean>(initialShowHeatmap);
  const [heatmapCategory, setHeatmapCategory] = useState<'all' | 'traffic_accident' | 'criminal_case' | 'lost_property' | 'urgent_only'>('all');
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<'all' | '30d' | '90d' | '1y'>('all');
  const [heatmapRadius, setHeatmapRadius] = useState<number>(48);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.78);
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState<boolean>(false);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Compute Heatmap Points and Summaries based on historical + live request data
  const heatmapPoints = useMemo(() => {
    return getFilteredHeatmapPoints({
      categoryFilter: heatmapCategory,
      timeframe: heatmapTimeframe
    });
  }, [heatmapCategory, heatmapTimeframe]);

  const highIncidentZones = useMemo(() => {
    return getDynamicHighIncidentZones();
  }, []);

  const summaryStats = useMemo(() => {
    return getHeatmapSummaryStats();
  }, []);

  if (!hasValidKey) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800/60 p-4 rounded-2xl text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>แผนที่ผังโซนเทศบาลเมืองชัยภูมิ (Municipal Interactive Vector Map)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  ระบบเวกเตอร์พร้อมใช้งาน 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ระบบแสดงผังจุดติดตั้งกล้อง CCTV, โซนพื้นที่เทศบาล, รัศมีมุมมอง และโครงข่ายไฟเบอร์ออปติก พร้อมใช้งานอย่างสมบูรณ์แบบ
              </p>
            </div>
          </div>
        </div>

        <CctvMunicipalZoneMap
          cameras={cameras}
          onSelectCamera={onSelectCamera}
          onRequestCctvForCamera={onRequestCctvForCamera}
          onReportRepairForCamera={onReportRepairForCamera}
          onEditCamera={onEditCamera}
        />
      </div>
    );
  }

  // Calculate center based on all cameras or default to a central location
  const validCameras = cameras.filter(c => c.latitude && c.longitude);
  
  const displayedCameras = validCameras.filter(c => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'needs_repair') return c.status === 'faulty' || c.status === 'offline';
    return c.status === statusFilter;
  });

  const onlineCount = displayedCameras.filter(c => c.status === 'online').length;
  const totalCoverageSqMeters = displayedCameras.reduce((acc, c) => {
    const r = getCoverageRadius(c.type);
    return acc + Math.PI * r * r;
  }, 0);

  const defaultCenter = validCameras.length > 0 
    ? { 
        lat: validCameras.reduce((sum, c) => sum + (c.latitude || 0), 0) / validCameras.length, 
        lng: validCameras.reduce((sum, c) => sum + (c.longitude || 0), 0) / validCameras.length 
      }
    : { lat: 15.80852, lng: 102.03105 };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-[660px] flex flex-col relative">
      {/* Map Header Overlay */}
      <div className="absolute top-0 inset-x-0 p-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-white flex flex-col gap-2.5 text-xs z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wide text-slate-100 text-sm">
                  แผนที่ภูมิศาสตร์ & Heatmap จุดเกิดเหตุบ่อย (Chaiyaphum CCTV Map)
                </span>
                {showHeatmap && (
                  <span className="text-[10px] bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                    Heatmap Active
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                กล้อง {displayedCameras.length} จุด | ข้อมูลสถิติคำร้อง {heatmapPoints.length} เหตุการณ์
              </span>
            </div>
          </div>

          {/* Map Controls & Heatmap Mode Toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Heatmap Overlay Main Toggle Button */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showHeatmap
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-400 shadow-md shadow-rose-950/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="เปิด/ปิด การแสดง Heatmap ความหนาแน่นของคำร้องขอดูภาพและจุดเกิดเหตุบ่อย"
            >
              <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-200 animate-pulse' : 'text-slate-400'}`} />
              <span>{showHeatmap ? '🔥 Heatmap คำร้อง: เปิด' : '🔥 Heatmap คำร้อง: ปิด'}</span>
            </button>

            {/* Coverage Area Toggle */}
            <button
              onClick={() => setShowCoverage(!showCoverage)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                showCoverage 
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-2xs' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="สลับแสดง/ซ่อนรัศมีพื้นที่เฝ้าระวังของกล้อง"
            >
              <Radio className={`w-3.5 h-3.5 ${showCoverage ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{showCoverage ? 'รัศมีกล้อง' : 'รัศมีกล้อง'}</span>
            </button>

            {/* Heatmap Settings & Sliders Button */}
            {showHeatmap && (
              <button
                onClick={() => setShowHeatmapSettings(!showHeatmapSettings)}
                className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                  showHeatmapSettings 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="ปรับแต่งรัศมีและความโปร่งใสของ Heatmap"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {/* Analytics Insights Drawer Button */}
            <button
              onClick={() => setShowAnalyticsDrawer(!showAnalyticsDrawer)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                showAnalyticsDrawer 
                  ? 'bg-indigo-600 text-white border-indigo-400' 
                  : 'bg-slate-800 text-indigo-300 border-slate-700 hover:text-white'
              }`}
              title="ดูรายงานวิเคราะห์พื้นที่เสี่ยงและสถิติเชิงลึก"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden md:inline">วิเคราะห์สถิติ</span>
            </button>

            <a
              href="https://earth.google.com/earth/d/16Z10iSFTtUgXwLv5ekTPRBarpH_eR5Bs?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl transition-colors font-semibold text-xs border border-slate-700"
              title="เปิดดูแผนที่ดาวเทียม 3D ใน Google Earth"
            >
              <span>🌐 3D</span>
            </a>
          </div>
        </div>

        {/* Heatmap Category Tabs & Timeframe Filters (When Heatmap Active) */}
        {showHeatmap && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-0.5">
              <span className="text-[10px] text-slate-400 font-bold mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-amber-400" />
                ประเภทเหตุ:
              </span>
              <button
                onClick={() => setHeatmapCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  heatmapCategory === 'all'
                    ? 'bg-slate-700 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ทั้งหมด ({summaryStats.totalIncidents})
              </button>
              <button
                onClick={() => setHeatmapCategory('traffic_accident')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  heatmapCategory === 'traffic_accident'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
                }`}
              >
                🚗 อุบัติเหตุ ({summaryStats.trafficAccidents})
              </button>
              <button
                onClick={() => setHeatmapCategory('criminal_case')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  heatmapCategory === 'criminal_case'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                🚨 คดี/ลักทรัพย์ ({summaryStats.criminalCases})
              </button>
              <button
                onClick={() => setHeatmapCategory('lost_property')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  heatmapCategory === 'lost_property'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800'
                }`}
              >
                📦 ของหาย ({summaryStats.lostProperty})
              </button>
              <button
                onClick={() => setHeatmapCategory('urgent_only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  heatmapCategory === 'urgent_only'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
                }`}
              >
                ⚡ วิกฤต/ด่วน ({summaryStats.urgentRequests})
              </button>
            </div>

            {/* Timeframe Select */}
            <div className="flex items-center gap-1.5 ml-auto text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={heatmapTimeframe}
                onChange={(e) => setHeatmapTimeframe(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
              >
                <option value="all">ช่วงเวลา: ตลอดประวัติ ({summaryStats.totalIncidents} เรื่อง)</option>
                <option value="30d">30 วันล่าสุด</option>
                <option value="90d">90 วันล่าสุด</option>
                <option value="1y">1 ปีล่าสุด</option>
              </select>
            </div>
          </div>
        )}

        {/* Top 5 Hotspot Chips Quick-Fly Bar (When Heatmap Active) */}
        {showHeatmap && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-700">
            <span className="text-[10px] text-amber-400 font-black shrink-0 flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3 text-rose-500" />
              จุดเสี่ยงสูงสุด (Top Hotspots):
            </span>
            {highIncidentZones.slice(0, 5).map((zone, idx) => (
              <button
                key={zone.id}
                onClick={() => {
                  setFlyToLocation({ lat: zone.latitude, lng: zone.longitude, zoom: 17 });
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  zone.riskLevel === 'critical'
                    ? 'bg-rose-950/70 hover:bg-rose-900 text-rose-200 border-rose-700/60 shadow-xs hover:border-rose-500'
                    : 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border-amber-700/60 shadow-xs hover:border-amber-500'
                }`}
                title={`คลิกเพื่อซูมและสำรวจจุดเสี่ยง: ${zone.zoneName} (${zone.totalIncidents} คำร้อง)`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${zone.riskLevel === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="font-bold">#{idx + 1} {zone.zoneName.split('(')[0]}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-200">
                  {zone.totalIncidents} เรื่อง
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Heatmap Settings Popover (Radius & Opacity Sliders) */}
        {showHeatmapSettings && showHeatmap && (
          <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl flex flex-wrap items-center gap-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">รัศมีความหนาแน่น (Radius):</span>
              <input
                type="range"
                min="24"
                max="80"
                value={heatmapRadius}
                onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                className="w-28 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono text-amber-300 text-[11px]">{heatmapRadius}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold">ความทึบแสง (Opacity):</span>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                className="w-28 accent-rose-500 cursor-pointer"
              />
              <span className="font-mono text-rose-300 text-[11px]">{Math.round(heatmapOpacity * 100)}%</span>
            </div>

            {/* Density Color Scale Indicator */}
            <div className="flex items-center gap-2 ml-auto text-[10px] text-slate-400">
              <span>ความหนาแน่น:</span>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-sky-400">ต่ำ</span>
                <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-rose-600 border border-white/20"></div>
                <span className="text-[9px] text-rose-400 font-bold">วิกฤต</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Google Map Container */}
      <div className="flex-1 w-full h-full min-h-[660px]">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={15}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%', minHeight: '660px' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapBoundsHandler cameras={displayedCameras} />
            <MapFlyToHandler target={flyToLocation} />

            {/* Visual Heatmap Overlay Component on Google Map */}
            <CctvHeatmapOverlay
              points={heatmapPoints}
              highIncidentZones={highIncidentZones}
              cameras={cameras}
              visible={showHeatmap}
              radius={heatmapRadius}
              opacity={heatmapOpacity}
              onSelectCamera={onSelectCamera}
              onRequestCctvForCamera={onRequestCctvForCamera}
            />

            {/* Standard Camera Markers with InfoWindows */}
            {displayedCameras.map(camera => (
              <MarkerWithInfoWindow 
                key={camera.id} 
                camera={camera} 
                onSelectCamera={onSelectCamera} 
                showCoverage={showCoverage}
                onRequestCctvForCamera={onRequestCctvForCamera}
                onReportRepairForCamera={onReportRepairForCamera}
                onEditCamera={onEditCamera}
              />
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Analytics Insights Drawer (Toggleable) */}
      {showAnalyticsDrawer && (
        <div className="absolute inset-x-0 bottom-12 max-h-72 overflow-y-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-4 text-white z-20 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">
                รายงานสรุปวิเคราะห์จุดเกิดเหตุ & คำร้องขอภาพ CCTV เทศบาลเมืองชัยภูมิ
              </h3>
            </div>
            <button
              onClick={() => setShowAnalyticsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              ปิดแถบสถิติ
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">คำร้องขอภาพในประวัติ</span>
              <strong className="text-lg font-extrabold text-blue-400">{summaryStats.totalIncidents} เรื่อง</strong>
              <span className="text-[9px] text-slate-500 block">อนุมัติแล้ว {summaryStats.footageReleaseRate}%</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">จุดเสี่ยงระดับวิกฤต (Critical)</span>
              <strong className="text-lg font-extrabold text-rose-400">{summaryStats.criticalHotspots} โซน</strong>
              <span className="text-[9px] text-rose-300/80 block">เฝ้าระวังจราจร 24 ชม.</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">จุดเกิดเหตุสูงสุด</span>
              <strong className="text-sm font-bold text-amber-300 block truncate" title={summaryStats.topZoneName}>
                {summaryStats.topZoneName.split('(')[0]}
              </strong>
              <span className="text-[9px] text-amber-400 block">{summaryStats.topZoneIncidentCount} คำร้องสะสม</span>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ระยะเวลาดำเนินการเฉลี่ย</span>
              <strong className="text-lg font-extrabold text-emerald-400">{summaryStats.averageResolutionDays} วัน</strong>
              <span className="text-[9px] text-emerald-300/80 block">ตามมาตรฐาน SLA เทศบาล</span>
            </div>
          </div>

          {/* Zones Ranking Mini Table */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-2">อันดับ & โซนพื้นที่เสี่ยง</th>
                  <th className="p-2">ประเภทพื้นที่</th>
                  <th className="p-2 text-center">คำร้อง</th>
                  <th className="p-2 text-center">อุบัติเหตุ</th>
                  <th className="p-2 text-center">คดีอาญา</th>
                  <th className="p-2">ช่วงเวลาเกิดเหตุบ่อย</th>
                  <th className="p-2 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[11px] text-slate-300">
                {highIncidentZones.map((zone, idx) => (
                  <tr key={zone.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-2 font-semibold text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${zone.riskLevel === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span>#{idx + 1} {zone.zoneName}</span>
                    </td>
                    <td className="p-2 text-slate-400">{zone.category}</td>
                    <td className="p-2 text-center font-bold text-blue-400">{zone.totalIncidents}</td>
                    <td className="p-2 text-center font-bold text-rose-400">{zone.trafficAccidents}</td>
                    <td className="p-2 text-center font-bold text-amber-400">{zone.criminalCases}</td>
                    <td className="p-2 text-slate-400 font-mono text-[10px]">{zone.mostFrequentHours}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => {
                          setFlyToLocation({ lat: zone.latitude, lng: zone.longitude, zoom: 17 });
                          setShowAnalyticsDrawer(false);
                        }}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        ซูมแผนที่
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Bottom Coverage & Heatmap Statistics Bar */}
      <div className="p-2.5 bg-slate-950/95 border-t border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 text-xs z-10 px-4">
        <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11px] font-medium">
          <span>📡 พื้นที่ครอบคลุม: <strong className="text-blue-400 font-extrabold">{Math.round(totalCoverageSqMeters / 1000)}k ตร.ม.</strong></span>
          <span>🟢 ความพร้อมใช้งานกล้อง: <strong className="text-emerald-400 font-extrabold">{displayedCameras.length > 0 ? Math.round((onlineCount / displayedCameras.length) * 100) : 0}%</strong></span>
          {showHeatmap && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-300">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>จุดวิเคราะห์ Heatmap: <strong className="text-white font-extrabold">{heatmapPoints.length} เหตุการณ์</strong></span>
            </span>
          )}
        </div>

        {/* Heatmap Legend */}
        {showHeatmap && (
          <div className="flex items-center gap-2 text-[10px] bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            <span className="text-slate-400 font-bold">ระดับความเสี่ยง Heatmap:</span>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> ต่ำ
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> ปานกลาง
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> สูง/วิกฤต
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


