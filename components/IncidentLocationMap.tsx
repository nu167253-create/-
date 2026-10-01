// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, MapMouseEvent, InfoWindow } from '@vis.gl/react-google-maps';
import { getStoredCctvCameras } from '../data/cctvData';
import { CctvCamera } from '../types/cctv';
import { 
  MapPin, 
  Camera, 
  Navigation, 
  X, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Compass, 
  LocateFixed,
  Info
} from 'lucide-react';

const API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

interface IncidentLocationMapProps {
  value: { lat: number; lng: number; address?: string } | null;
  onChange?: (loc: { lat: number; lng: number; address?: string }) => void;
  readOnly?: boolean;
  heightClass?: string;
  showCameraMarkers?: boolean;
  titleLabel?: string;
}

export const IncidentLocationMap: React.FC<IncidentLocationMapProps> = ({
  value,
  onChange,
  readOnly = false,
  heightClass = 'h-72',
  showCameraMarkers = true,
  titleLabel = 'ปักหมุดตำแหน่งจุดเกิดเหตุ / กล้องวงจรปิด CCTV'
}) => {
  // Chaiyaphum Town Hall / Clock Tower default center
  const defaultCenter = { lat: 15.8068, lng: 102.0317 };
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(value || defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(value ? 16 : 14);
  const [selectedCam, setSelectedCam] = useState<CctvCamera | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Load CCTV cameras for location suggestions
  const cameras: CctvCamera[] = useMemo(() => {
    try {
      return getStoredCctvCameras();
    } catch {
      return [];
    }
  }, []);

  // Sync center if value prop changes externally
  useEffect(() => {
    if (value && (value.lat !== mapCenter.lat || value.lng !== mapCenter.lng)) {
      setMapCenter({ lat: value.lat, lng: value.lng });
    }
  }, [value?.lat, value?.lng]);

  // Filter camera presets by query
  const filteredCameras = cameras.filter(cam => {
    if (!(searchQuery || '').trim()) return true;
    const q = (searchQuery || '').toLowerCase();
    return (
      (cam.name || '').toLowerCase().includes(q) ||
      (cam.id || '').toLowerCase().includes(q) ||
      (cam.floor || '').toLowerCase().includes(q) ||
      (cam.building || '').toLowerCase().includes(q)
    );
  });

  const handleMapClick = (e: MapMouseEvent) => {
    if (readOnly || !onChange) return;
    if (e.detail.latLng) {
      const newLoc = {
        lat: Number(e.detail.latLng.lat.toFixed(6)),
        lng: Number(e.detail.latLng.lng.toFixed(6)),
        address: `พิกัดละติจูด ${e.detail.latLng.lat.toFixed(5)}, ลองจิจูด ${e.detail.latLng.lng.toFixed(5)}`
      };
      setMapCenter({ lat: newLoc.lat, lng: newLoc.lng });
      onChange(newLoc);
      setSelectedCam(null);
    }
  };

  const handleSelectCameraPin = (cam: CctvCamera) => {
    if (cam.latitude && cam.longitude) {
      const newLoc = {
        lat: cam.latitude,
        lng: cam.longitude,
        address: `${cam.name} (${cam.id}) - ${cam.floor}`
      };
      setMapCenter({ lat: cam.latitude, lng: cam.longitude });
      setMapZoom(17);
      setSelectedCam(cam);
      if (onChange && !readOnly) {
        onChange(newLoc);
      }
    }
  };

  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          address: 'ตำแหน่งปัจจุบันของคุณ (GPS Device)'
        };
        setMapCenter({ lat: newLoc.lat, lng: newLoc.lng });
        setMapZoom(17);
        setGeoLocating(false);
        if (onChange && !readOnly) {
          onChange(newLoc);
        }
      },
      (err) => {
        setGeoLocating(false);
        setGeoError(`ไม่สามารถดึงตำแหน่ง GPS ได้ (${err.message})`);
        setTimeout(() => setGeoError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleClearPin = () => {
    if (onChange && !readOnly) {
      onChange({ lat: defaultCenter.lat, lng: defaultCenter.lng, address: '' });
      setSelectedCam(null);
    }
  };

  // Municipal Landmarks in Chaiyaphum for quick selection
  const CHAIYAPHUM_LANDMARKS = [
    { name: 'วงเวียนอนุสาวรีย์พระยาภักดีชุมพล (พญาแล)', lat: 15.8068, lng: 102.0317, zone: 'ใจกลางเมือง' },
    { name: 'หอนาฬิกาเทศบาลเมืองชัยภูมิ', lat: 15.8062, lng: 102.0309, zone: 'โซนพาณิชย์/ศูนย์กลาง' },
    { name: 'ศาลเจ้าพ่อพญาแล (หนองปลาเฒ่า)', lat: 15.8214, lng: 102.0152, zone: 'โซน 1 ตะวันตกเฉียงเหนือ' },
    { name: 'สี่แยกโนนกอก / ถ.หฤทัย', lat: 15.8142, lng: 102.0238, zone: 'โซน 1 หนองปลาเฒ่า' },
    { name: 'โรงพยาบาลชัยภูมิ (ถนนบรรณาการ)', lat: 15.8015, lng: 102.0289, zone: 'โซน 3 โรงพยาบาล' },
    { name: 'สถานีตำรวจภูธรเมืองชัยภูมิ (สภ.เมืองชัยภูมิ)', lat: 15.8082, lng: 102.0345, zone: 'โซนศูนย์ราชการ' },
    { name: 'ตลาดสดเทศบาลเมืองชัยภูมิ 1', lat: 15.8073, lng: 102.0301, zone: 'โซนตลาดสด' },
    { name: 'สถานีขนส่งผู้โดยสาร (บขส. ชัยภูมิ)', lat: 15.7986, lng: 102.0382, zone: 'โซน บขส./ประตูเมือง' },
    { name: 'สำนักงานเทศบาลเมืองชัยภูมิ', lat: 15.8091, lng: 102.0332, zone: 'ศูนย์ราชการเทศบาล' },
    { name: 'สวนสาธารณะหนองปลาเฒ่า', lat: 15.8245, lng: 102.0135, zone: 'โซนสันทนาการ' },
  ];

  // Fallback interactive municipal location selector when Google Maps is not enabled
  if (!API_KEY) {
    const isSelected = Boolean(value?.lat && value?.lng && (value.lat !== defaultCenter.lat || value.lng !== defaultCenter.lng || value.address));

    return (
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <MapPin className="w-4 h-4 text-rose-600" />
              </span>
              <span>{titleLabel}</span>
            </div>
            <p className="text-xs text-slate-500">
              {readOnly
                ? 'พิกัดและสถานที่จุดเกิดเหตุที่บันทึกไว้ในคำร้อง'
                : 'เลือกสถานที่สำคัญ, จุดติดตั้งกล้อง CCTV, หรือใช้ตำแหน่ง GPS ของคุณ'}
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetCurrentGPS}
                disabled={geoLocating}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                title="ดึงพิกัดจาก GPS อุปกรณ์ของคุณ"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-blue-600' : ''}`} />
                <span>{geoLocating ? 'กำลังดึง GPS...' : 'ใช้ตำแหน่งปัจจุบัน (GPS)'}</span>
              </button>

              {isSelected && (
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  title="ล้างตำแหน่งที่เลือก"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ล้าง</span>
                </button>
              )}
            </div>
          )}
        </div>

        {geoError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Selected Location Banner Card */}
        {isSelected ? (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-emerald-950 text-sm">
                  {value?.address || 'ระบุพิกัดตำแหน่งแล้ว'}
                </div>
                <div className="text-emerald-800 font-mono text-[11px]">
                  ละติจูด (Lat): {value?.lat.toFixed(6)}, ลองจิจูด (Lng): {value?.lng.toFixed(6)}
                </div>
              </div>
            </div>
            {!readOnly && (
              <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                ✓ บันทึกตำแหน่งแล้ว
              </span>
            )}
          </div>
        ) : (
          !readOnly && (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ยังไม่ได้เลือกตำแหน่ง — กรุณาคลิกเลือกจุดสำคัญหรือกล้อง CCTV ด้านล่าง</span>
            </div>
          )
        )}

        {!readOnly && (
          <div className="space-y-3 pt-1">
            {/* 1. Quick Landmark Buttons */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>สถานที่สำคัญ / สี่แยกหลักในเขตเทศบาลเมืองชัยภูมิ:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {CHAIYAPHUM_LANDMARKS.map((landmark) => {
                  const isMatch = value && Math.abs(value.lat - landmark.lat) < 0.0001 && Math.abs(value.lng - landmark.lng) < 0.0001;
                  return (
                    <button
                      key={landmark.name}
                      type="button"
                      onClick={() => {
                        if (onChange) {
                          onChange({
                            lat: landmark.lat,
                            lng: landmark.lng,
                            address: landmark.name
                          });
                        }
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                        isMatch
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <MapPin className={`w-3 h-3 shrink-0 ${isMatch ? 'text-white' : 'text-rose-500'}`} />
                      <span>{landmark.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. CCTV Camera Picker with Search */}
            {showCameraMarkers && cameras.length > 0 && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>หรือเลือกจากจุดติดตั้งกล้องวงจรปิด CCTV เทศบาล:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {cameras.length} จุด
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อกล้อง, รหัส, สี่แยก, โซน..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {filteredCameras.slice(0, 14).map((cam) => {
                    const isCamSelected = value && cam.latitude && cam.longitude && Math.abs(value.lat - cam.latitude) < 0.0001 && Math.abs(value.lng - cam.longitude) < 0.0001;
                    return (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => handleSelectCameraPin(cam)}
                        className={`text-left p-2 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isCamSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                            : 'bg-white hover:bg-blue-50/60 text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-bold truncate text-[11px]">
                            {cam.name}
                          </div>
                          <div className={`text-[10px] truncate ${isCamSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {cam.id} • {cam.floor || cam.building}
                          </div>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cam.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Manual Location & Coordinates Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  รายละเอียดสถานที่ / จุดสังเกต
                </label>
                <input
                  type="text"
                  placeholder="เช่น หน้าธนาคาร, หน้าร้านทอง"
                  value={value?.address || ''}
                  onChange={(e) => {
                    if (onChange) {
                      onChange({
                        lat: value?.lat || defaultCenter.lat,
                        lng: value?.lng || defaultCenter.lng,
                        address: e.target.value
                      });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ละติจูด (Lat)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={value?.lat || defaultCenter.lat}
                  onChange={(e) => {
                    const latNum = parseFloat(e.target.value);
                    if (!isNaN(latNum) && onChange) {
                      onChange({
                        lat: latNum,
                        lng: value?.lng || defaultCenter.lng,
                        address: value?.address || ''
                      });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  ลองจิจูด (Lng)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={value?.lng || defaultCenter.lng}
                  onChange={(e) => {
                    const lngNum = parseFloat(e.target.value);
                    if (!isNaN(lngNum) && onChange) {
                      onChange({
                        lat: value?.lat || defaultCenter.lat,
                        lng: lngNum,
                        address: value?.address || ''
                      });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/90 shadow-xs">
      {/* Title & Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="space-y-0.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-600 animate-bounce" />
            <span>{titleLabel}</span>
          </label>
          <p className="text-[11px] text-slate-500">
            {readOnly 
              ? 'พิกัดตำแหน่งจุดเกิดเหตุที่ระบุในคำร้อง' 
              : 'คลิกบนแผนที่เพื่อปักหมุด หรือกดเลือกจากตำแหน่งกล้อง CCTV เทศบาลด้านล่าง'}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGetCurrentGPS}
              disabled={geoLocating}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
              title="ดึงพิกัดจากตำแหน่งปัจจุบันของคุณ"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin text-blue-600' : ''}`} />
              <span>{geoLocating ? 'กำลังดึง GPS...' : 'ตำแหน่งปัจจุบัน (GPS)'}</span>
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClearPin}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition-colors"
                title="ลบหมุดพิกัด"
              >
                <X className="w-3.5 h-3.5" />
                ล้างหมุด
              </button>
            )}
          </div>
        )}
      </div>

      {geoError && (
        <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* CCTV Camera Quick Select Chips Bar */}
      {showCameraMarkers && cameras.length > 0 && !readOnly && (
        <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>เลือกจุดติดตั้งกล้อง CCTV เทศบาลเพื่อปักหมุดด่วน:</span>
            </span>
            <span className="text-slate-400 font-mono text-[10px]">{cameras.length} จุด</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300">
            {cameras.slice(0, 10).map((cam) => {
              const isSelected = value && value.lat === cam.latitude && value.lng === cam.longitude;
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => handleSelectCameraPin(cam)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                      : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MAP VIEW CONTAINER */}
      <div className={`w-full ${heightClass} rounded-xl overflow-hidden border border-slate-300 relative shadow-inner group`}>
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            center={mapCenter}
            zoom={mapZoom}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* User Pinned Location Marker */}
            {value && (
              <AdvancedMarker position={{ lat: value.lat, lng: value.lng }}>
                <Pin background="#ef4444" glyphColor="#ffffff" borderColor="#991b1b" />
              </AdvancedMarker>
            )}

            {/* Display CCTV Camera Markers */}
            {showCameraMarkers && cameras.map((cam) => {
              if (!cam.latitude || !cam.longitude) return null;
              const isPinned = value && value.lat === cam.latitude && value.lng === cam.longitude;
              if (isPinned) return null; // Don't duplicate if user pinned this exact cam

              return (
                <AdvancedMarker
                  key={cam.id}
                  position={{ lat: cam.latitude, lng: cam.longitude }}
                  onClick={() => handleSelectCameraPin(cam)}
                  title={`${cam.name} (${cam.status})`}
                >
                  <Pin 
                    background={cam.status === 'online' ? '#3b82f6' : '#f59e0b'} 
                    glyphColor="#ffffff" 
                    borderColor="#1e3a8a" 
                  />
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for selected camera */}
            {selectedCam && selectedCam.latitude && selectedCam.longitude && (
              <InfoWindow
                position={{ lat: selectedCam.latitude, lng: selectedCam.longitude }}
                onCloseClick={() => setSelectedCam(null)}
              >
                <div className="p-1 max-w-[200px] text-xs space-y-1 font-sans">
                  <span className="font-extrabold text-slate-900 block border-b pb-1">{selectedCam.name}</span>
                  <p className="text-[10px] text-slate-600">รหัส: {selectedCam.id}</p>
                  <p className="text-[10px] text-slate-600">ตำแหน่ง: {selectedCam.floor}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    selectedCam.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedCam.status === 'online' ? '🟢 ปกติ' : '🔴 ชำรุด/ขัดข้อง'}
                  </span>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Map Overlay Badge */}
        <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md border border-white/20 pointer-events-none flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>{readOnly ? 'หมุดสถานที่เกิดเหตุ' : 'คลิกบนแผนที่เพื่อเลือกตำแหน่งหมุด'}</span>
        </div>

        {/* Current Coordinates Bar at Bottom */}
        {value ? (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200/90 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="truncate space-y-0.5">
                <span className="font-extrabold text-slate-900 block text-[11px] truncate">
                  {value.address || 'จุดที่ปักหมุดไว้'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  Lat: {value.lat.toFixed(5)}, Lng: {value.lng.toFixed(5)}
                </span>
              </div>
            </div>

            {!readOnly && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                บันทึกพิกัดแล้ว
              </span>
            )}
          </div>
        ) : (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-slate-200 p-2 rounded-xl text-[11px] text-center border border-slate-700">
            💡 ยังไม่ได้เลือกพิกัด — กรุณาคลิกบนแผนที่เพื่อปักหมุดสถานที่เกิดเหตุ
          </div>
        )}
      </div>
    </div>
  );
};
