// Source: Google Maps Platform Code Assist
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { HeatmapPoint, HighIncidentZoneSummary, findNearbyCameras } from '../utils/cctvHeatmapService';
import { CctvCamera } from '../types/cctv';
import { 
  Flame, 
  AlertTriangle, 
  Car, 
  ShieldAlert, 
  PackageX, 
  Eye, 
  ExternalLink, 
  Clock, 
  Camera, 
  CheckCircle2, 
  X,
  TrendingUp,
  MapPin
} from 'lucide-react';

declare const google: any;

interface CctvHeatmapOverlayProps {
  points: HeatmapPoint[];
  highIncidentZones: HighIncidentZoneSummary[];
  cameras: CctvCamera[];
  visible: boolean;
  radius?: number; // 20 - 90 px
  opacity?: number; // 0.1 - 1.0
  onSelectZone?: (zone: HighIncidentZoneSummary) => void;
  onSelectCamera?: (camera: CctvCamera) => void;
  onRequestCctvForCamera?: (camera: CctvCamera) => void;
}

export const CctvHeatmapOverlay: React.FC<CctvHeatmapOverlayProps> = ({
  points,
  highIncidentZones,
  cameras,
  visible,
  radius = 48,
  opacity = 0.75,
  onSelectZone,
  onSelectCamera,
  onRequestCctvForCamera
}) => {
  const map = useMap();
  const overlayRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  // Selected zone for interactive breakdown modal
  const [activeZone, setActiveZone] = useState<HighIncidentZoneSummary | null>(null);

  // Repaint canvas with high-resolution density heatmap
  const renderHeatmap = useCallback(() => {
    if (!overlayRef.current || !canvasRef.current || !map || !visible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const projection = overlayRef.current.getProjection();
    if (!projection) return;

    const mapDiv = map.getDiv();
    const width = mapDiv.clientWidth;
    const height = mapDiv.clientHeight;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (points.length === 0) {
      ctx.restore();
      return;
    }

    // Set overall opacity
    ctx.globalAlpha = opacity;

    // 1. Draw Density Heat Spheres for each point
    points.forEach(pt => {
      const latLng = new google.maps.LatLng(pt.lat, pt.lng);
      const pixel = projection.fromLatLngToContainerPixel(latLng);
      if (!pixel) return;

      const px = pixel.x;
      const py = pixel.y;

      // Skip points outside viewport
      if (px < -100 || px > width + 100 || py < -100 || py > height + 100) return;

      // Radius scales slightly with point weight and user slider
      const ptRadius = radius * (0.8 + (pt.weight / 10) * 0.4);

      // Create radial gradient for density accumulation
      const grad = ctx.createRadialGradient(px, py, 0, px, py, ptRadius);

      // Color mapping based on severity / category
      if (pt.severity === 'critical') {
        grad.addColorStop(0.0, 'rgba(255, 0, 50, 0.95)');
        grad.addColorStop(0.2, 'rgba(255, 80, 0, 0.85)');
        grad.addColorStop(0.5, 'rgba(255, 200, 0, 0.65)');
        grad.addColorStop(0.8, 'rgba(0, 240, 255, 0.25)');
        grad.addColorStop(1.0, 'rgba(0, 200, 255, 0)');
      } else if (pt.severity === 'high') {
        grad.addColorStop(0.0, 'rgba(255, 100, 0, 0.90)');
        grad.addColorStop(0.3, 'rgba(255, 190, 0, 0.75)');
        grad.addColorStop(0.6, 'rgba(50, 230, 100, 0.45)');
        grad.addColorStop(0.85, 'rgba(0, 210, 255, 0.15)');
        grad.addColorStop(1.0, 'rgba(0, 210, 255, 0)');
      } else {
        grad.addColorStop(0.0, 'rgba(255, 215, 0, 0.80)');
        grad.addColorStop(0.35, 'rgba(0, 235, 150, 0.55)');
        grad.addColorStop(0.7, 'rgba(0, 180, 255, 0.25)');
        grad.addColorStop(1.0, 'rgba(0, 180, 255, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, ptRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw Pulsing Radar Epicenters for Top High-Incident Zones
    pulsePhaseRef.current = (pulsePhaseRef.current + 0.03) % (Math.PI * 2);
    const pulseScale = 1 + Math.sin(pulsePhaseRef.current) * 0.25;
    const pulseAlpha = 0.5 + Math.sin(pulsePhaseRef.current) * 0.3;

    highIncidentZones.slice(0, 6).forEach((zone, idx) => {
      const latLng = new google.maps.LatLng(zone.latitude, zone.longitude);
      const pixel = projection.fromLatLngToContainerPixel(latLng);
      if (!pixel) return;

      const px = pixel.x;
      const py = pixel.y;

      if (px < -50 || px > width + 50 || py < -50 || py > height + 50) return;

      const isCritical = zone.riskLevel === 'critical';
      const baseRadius = isCritical ? 24 : 18;
      const ringRadius = baseRadius * pulseScale;

      ctx.save();

      // Outer animated ripple ring
      ctx.strokeStyle = isCritical 
        ? `rgba(239, 68, 68, ${pulseAlpha * 0.8})` 
        : `rgba(249, 115, 22, ${pulseAlpha * 0.7})`;
      ctx.lineWidth = isCritical ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing core
      const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
      coreGrad.addColorStop(0.0, '#ffffff');
      coreGrad.addColorStop(0.4, isCritical ? '#ef4444' : '#f97316');
      coreGrad.addColorStop(1.0, isCritical ? 'rgba(185, 28, 28, 0.8)' : 'rgba(194, 65, 12, 0.8)');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = isCritical ? '#ef4444' : '#f97316';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();

      // Number badge in core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${idx + 1}`, px, py);

      // Label above hotspot
      const labelText = `${zone.totalIncidents} คำร้อง`;
      ctx.font = 'bold 10px sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const pillWidth = textMetrics.width + 14;
      const pillHeight = 18;
      const pillX = px - pillWidth / 2;
      const pillY = py - baseRadius - 16;

      // Pill background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isCritical ? '#ef4444' : '#f97316';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 9);
      ctx.fill();
      ctx.stroke();

      // Pill text
      ctx.fillStyle = isCritical ? '#fca5a5' : '#fed7aa';
      ctx.fillText(labelText, px, pillY + pillHeight / 2);

      ctx.restore();
    });

    ctx.restore();
  }, [map, visible, points, highIncidentZones, radius, opacity]);

  // Setup Google Maps OverlayView
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    class HeatmapCanvasOverlayView extends google.maps.OverlayView {
      div: HTMLDivElement | null = null;
      canvas: HTMLCanvasElement | null = null;

      onAdd() {
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.top = '0';
        this.div.style.left = '0';
        this.div.style.width = '100%';
        this.div.style.height = '100%';
        this.div.style.pointerEvents = 'none';
        this.div.style.zIndex = '4'; // Below markers (which are at 5+)

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';

        this.div.appendChild(this.canvas);
        canvasRef.current = this.canvas;

        const panes = this.getPanes();
        if (panes && panes.overlayLayer) {
          panes.overlayLayer.appendChild(this.div);
        }
      }

      draw() {
        renderHeatmap();
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
        canvasRef.current = null;
      }
    }

    const overlay = new HeatmapCanvasOverlayView();
    overlay.setMap(visible ? map : null);
    overlayRef.current = overlay;

    // Repaint on map changes
    const idleListener = map.addListener('idle', renderHeatmap);
    const boundsListener = map.addListener('bounds_changed', renderHeatmap);
    const zoomListener = map.addListener('zoom_changed', renderHeatmap);

    // Animation loop for pulsating radar rings
    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      if (visible) {
        renderHeatmap();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (idleListener) google.maps.event.removeListener(idleListener);
      if (boundsListener) google.maps.event.removeListener(boundsListener);
      if (zoomListener) google.maps.event.removeListener(zoomListener);
      overlay.setMap(null);
    };
  }, [map, visible, renderHeatmap]);

  // Click on map to inspect hotspot if near any zone
  useEffect(() => {
    if (!map || !visible) return;

    const clickListener = map.addListener('click', (e: any) => {
      if (!e.latLng) return;
      const clickedLat = e.latLng.lat();
      const clickedLng = e.latLng.lng();

      // Find nearest zone within ~300 meters
      let closestZone: HighIncidentZoneSummary | null = null;
      let minDistance = 999999;

      highIncidentZones.forEach(z => {
        const dLat = (z.latitude - clickedLat) * 111000;
        const dLng = (z.longitude - clickedLng) * 111000 * Math.cos((clickedLat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < 300 && dist < minDistance) {
          minDistance = dist;
          closestZone = z;
        }
      });

      if (closestZone) {
        setActiveZone(closestZone);
        if (onSelectZone) onSelectZone(closestZone);
      }
    });

    return () => {
      if (clickListener) google.maps.event.removeListener(clickListener);
    };
  }, [map, visible, highIncidentZones, onSelectZone]);

  if (!visible) return null;

  // Render Zone Details Modal / Popover if a hotspot is clicked
  return (
    <>
      {activeZone && (
        <div className="absolute bottom-16 left-4 right-4 md:left-6 md:right-auto md:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-20 text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border shrink-0 ${
                activeZone.riskLevel === 'critical' 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeZone.riskLevel === 'critical' 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {activeZone.riskLevel === 'critical' ? '🔴 ความเสี่ยงวิกฤต (Critical)' : '🟠 ความเสี่ยงสูง (High Risk)'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ดัชนี {activeZone.urgencyScore}/100
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 mt-1 leading-snug">
                  {activeZone.zoneName}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveZone(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Breakdown Statistics */}
          <div className="grid grid-cols-3 gap-2 my-3">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block">คำร้องทั้งหมด</span>
              <strong className="text-lg font-extrabold text-blue-400">{activeZone.totalIncidents}</strong>
              <span className="text-[9px] text-slate-500 block">เรื่อง</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block">อุบัติเหตุ</span>
              <strong className="text-lg font-extrabold text-rose-400">{activeZone.trafficAccidents}</strong>
              <span className="text-[9px] text-slate-500 block">ครั้ง</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block">คดีอาญา/ลักทรัพย์</span>
              <strong className="text-lg font-extrabold text-amber-400">{activeZone.criminalCases}</strong>
              <span className="text-[9px] text-slate-500 block">คดี</span>
            </div>
          </div>

          <div className="text-xs space-y-2 text-slate-300">
            <p className="text-[11px] leading-relaxed text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              {activeZone.description}
            </p>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>ช่วงเวลาเกิดเหตุบ่อย: <strong>{activeZone.mostFrequentHours}</strong></span>
            </div>

            {/* Nearby Cameras in this zone */}
            {cameras.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">
                  กล้อง CCTV ประจำจุดนี้ ({findNearbyCameras(activeZone.latitude, activeZone.longitude, cameras).length} ตัว):
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {findNearbyCameras(activeZone.latitude, activeZone.longitude, cameras).slice(0, 5).map(cam => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => {
                        if (onSelectCamera) onSelectCamera(cam);
                        setActiveZone(null);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-blue-900/60 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{cam.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                map?.panTo({ lat: activeZone.latitude, lng: activeZone.longitude });
                map?.setZoom(17);
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>ซูมเข้าจุดเสี่ยง</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveZone(null)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
};
