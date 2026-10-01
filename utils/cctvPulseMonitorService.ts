import { CctvCamera } from '../types/cctv';
import { getStoredCctvCameras, updateCctvStatus } from '../data/cctvData';

export interface CameraPulseState {
  cameraId: string;
  cameraName: string;
  ipAddress: string;
  building: string;
  zone: string;
  community?: string;
  cabinetNumber?: string;
  status: 'online' | 'faulty' | 'maintenance' | 'offline';
  latencyMs: number;       // e.g. 12ms (online), 180ms (degraded), 0 (offline)
  packetLossPercent: number; // 0% - 100%
  fps: number;             // e.g. 25, 30, 0
  bitrateKbps: number;     // e.g. 4096, 2048, 0
  lastHeartbeat: string;   // ISO timestamp
  consecutiveFailures: number;
  uptimeSeconds: number;
  isRecentDrop: boolean;   // Dropped in the current session
}

export interface ConnectivityDropEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  ipAddress: string;
  zone: string;
  building: string;
  community?: string;
  cabinetNumber?: string;
  droppedAt: string;       // ISO timestamp
  reason: string;          // e.g. 'Ping Timeout (>3000ms)', 'Fiber Optic Signal Loss'
  severity: 'critical' | 'warning';
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  restoredAt?: string;
}

export interface PulseCheckSummary {
  timestamp: string;
  totalCameras: number;
  onlineCount: number;
  offlineCount: number;
  faultyCount: number;
  maintenanceCount: number;
  uptimePercent: number;
  avgLatencyMs: number;
  newDropsDetected: ConnectivityDropEvent[];
  activeDropsCount: number;
}

const STORAGE_KEY_DROP_LOGS = 'epetition_cctv_pulse_drop_logs_v1';
const STORAGE_KEY_AUDIO_MUTED = 'epetition_cctv_pulse_audio_muted_v1';

// Seed initial drop events if storage empty so officers see realistic history
const SEED_DROP_EVENTS: ConnectivityDropEvent[] = [
  {
    id: 'drop-init-01',
    cameraId: 'IPCamera 03',
    cameraName: 'สามแยกโนนกอก (ศาลเจ้าพ่อพญาแล)',
    ipAddress: '192.168.1.64',
    zone: 'ตู้สามแยกโนนกอก',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    community: 'ชุมชนเมืองเก่า',
    cabinetNumber: 'ตู้ 3',
    droppedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    reason: 'สาย Fiber Optic ขาดจากเหตุไฟไหม้ใกล้สามแยกหนองปลาเฒ่า (ระยะ 3,585 ม.)',
    severity: 'critical',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    acknowledgedBy: 'ส.ต.ท. วิชัย สมบูรณ์ (ห้องปฏิบัติการ CCTV)'
  },
  {
    id: 'drop-init-02',
    cameraId: 'IPCamera 04',
    cameraName: 'สี่แยกหนองปลาเฒ่า (สนามแบดมินตัน)',
    ipAddress: '192.168.1.65',
    zone: 'ตู้สี่แยกหนองปลาเฒ่า',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    community: 'ชุมชนหนองปลาเฒ่า',
    cabinetNumber: 'ตู้ 4',
    droppedAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    reason: 'สาย Fiber Optic 12 core ขาด/สูญเสียสัญญาณแสง (RX Optical Power < -38 dBm)',
    severity: 'critical',
    acknowledged: false
  },
  {
    id: 'drop-init-03',
    cameraId: 'IPCamera 05',
    cameraName: 'สี่แยกหนองปลาเฒ่า (ทางไปโรงเรียนกวน)',
    ipAddress: '192.168.1.66',
    zone: 'ตู้สี่แยกหนองปลาเฒ่า',
    building: 'เขตเทศบาลเมืองชัยภูมิ',
    community: 'ชุมชนหนองปลาเฒ่า',
    cabinetNumber: 'ตู้ 4',
    droppedAt: new Date(Date.now() - 3600000 * 1.7).toISOString(),
    reason: 'Link Down / Switch Port 5 Link Loss',
    severity: 'critical',
    acknowledged: false
  }
];

export const getStoredDropLogs = (): ConnectivityDropEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DROP_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DROP_LOGS, JSON.stringify(SEED_DROP_EVENTS));
      return SEED_DROP_EVENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading drop logs from storage', err);
    return SEED_DROP_EVENTS;
  }
};

export const saveDropLogs = (logs: ConnectivityDropEvent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_DROP_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed saving drop logs to storage', err);
  }
};

export const acknowledgeDropAlert = (dropId: string, officerName: string): ConnectivityDropEvent[] => {
  const logs = getStoredDropLogs();
  const updated = logs.map((log) => {
    if (log.id === dropId) {
      return {
        ...log,
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: officerName
      };
    }
    return log;
  });
  saveDropLogs(updated);
  return updated;
};

export const acknowledgeAllDropAlerts = (officerName: string): ConnectivityDropEvent[] => {
  const logs = getStoredDropLogs();
  const now = new Date().toISOString();
  const updated = logs.map((log) => ({
    ...log,
    acknowledged: true,
    acknowledgedAt: log.acknowledgedAt || now,
    acknowledgedBy: log.acknowledgedBy || officerName
  }));
  saveDropLogs(updated);
  return updated;
};

export const clearDropLogs = (): void => {
  localStorage.setItem(STORAGE_KEY_DROP_LOGS, JSON.stringify([]));
};

export const getAudioMutedSetting = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_AUDIO_MUTED) === 'true';
  } catch {
    return false;
  }
};

export const setAudioMutedSetting = (muted: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY_AUDIO_MUTED, muted ? 'true' : 'false');
  } catch {
    // Ignore error
  }
};

// Web Audio API Chime Synthesizer - 100% reliable across browsers without external audio files
export const playDropAlertChime = (): void => {
  if (getAudioMutedSetting()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Tone 1: High alarm tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.15); // Drop to D5
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Second urgent warning beep (698.46 Hz - F5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(698.46, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.45);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.4, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio chime playback blocked or not supported', err);
  }
};

export const playHeartbeatChime = (): void => {
  if (getAudioMutedSetting()) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6 soft ping
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Ignore error
  }
};

/**
 * Execute a Pulse Check against the camera database:
 * 1. Read fresh cameras from storage
 * 2. Compare against previous known camera status map
 * 3. Identify newly dropped cameras
 * 4. Update metrics and generate alert events
 */
export const runDatabasePulseCheck = (
  previousStates: Map<string, CameraPulseState>
): {
  updatedStates: Map<string, CameraPulseState>;
  summary: PulseCheckSummary;
} => {
  const freshCameras = getStoredCctvCameras();
  const now = new Date();
  const nowIso = now.toISOString();

  let existingLogs = getStoredDropLogs();
  const newDrops: ConnectivityDropEvent[] = [];
  const updatedStates = new Map<string, CameraPulseState>();

  let onlineCount = 0;
  let offlineCount = 0;
  let faultyCount = 0;
  let maintenanceCount = 0;
  let totalLatency = 0;
  let latencySamples = 0;

  freshCameras.forEach((cam) => {
    const prevState = previousStates.get(cam.id);
    const prevStatus = prevState ? prevState.status : null;
    const currentStatus = cam.status;

    // Detect if this camera experienced a connectivity drop
    // Either it was online and became offline/faulty, or it was previously online and is now offline in DB
    const isNowOffline = currentStatus === 'offline' || currentStatus === 'faulty';
    const wasOnline = prevStatus === 'online';
    const isNewDrop = wasOnline && isNowOffline;

    // Realistic latency calculation based on camera location and status
    let latencyMs = 0;
    let packetLoss = 0;
    let fps = 0;
    let bitrateKbps = 0;

    if (currentStatus === 'online') {
      onlineCount++;
      // Normal jitter between 10ms and 26ms
      const baseJitter = (cam.id.charCodeAt(cam.id.length - 1) % 12);
      const randomWave = Math.floor(Math.sin(now.getTime() / 15000 + baseJitter) * 4);
      latencyMs = Math.max(8, 14 + baseJitter + randomWave);
      packetLoss = 0;
      fps = cam.resolution.includes('4K') ? 30 : 25;
      bitrateKbps = cam.resolution.includes('4K') ? 6144 : 2048;
      totalLatency += latencyMs;
      latencySamples++;
    } else if (currentStatus === 'faulty') {
      faultyCount++;
      latencyMs = 380 + (cam.id.charCodeAt(0) % 150);
      packetLoss = 45;
      fps = 6;
      bitrateKbps = 320;
    } else if (currentStatus === 'maintenance') {
      maintenanceCount++;
      latencyMs = 0;
      packetLoss = 100;
    } else {
      offlineCount++;
      latencyMs = 0;
      packetLoss = 100;
    }

    if (isNewDrop) {
      const dropEvent: ConnectivityDropEvent = {
        id: `drop-${Date.now()}-${cam.id.replace(/\s+/g, '_')}`,
        cameraId: cam.id,
        cameraName: cam.name,
        ipAddress: cam.ipAddress,
        zone: cam.zone,
        building: cam.building,
        community: cam.community,
        cabinetNumber: cam.cabinetNumber,
        droppedAt: nowIso,
        reason: cam.notes?.includes('ไฟไหม้')
          ? cam.notes
          : 'สัญญาณขาดหาย (Ping Timeout >3,000ms / Loss of Carrier Signal)',
        severity: 'critical',
        acknowledged: false
      };
      newDrops.push(dropEvent);
      existingLogs = [dropEvent, ...existingLogs];
    }

    updatedStates.set(cam.id, {
      cameraId: cam.id,
      cameraName: cam.name,
      ipAddress: cam.ipAddress,
      building: cam.building,
      zone: cam.zone,
      community: cam.community,
      cabinetNumber: cam.cabinetNumber,
      status: currentStatus,
      latencyMs,
      packetLossPercent: packetLoss,
      fps,
      bitrateKbps,
      lastHeartbeat: currentStatus === 'online' ? nowIso : (prevState?.lastHeartbeat || nowIso),
      consecutiveFailures: isNowOffline ? ((prevState?.consecutiveFailures || 0) + 1) : 0,
      uptimeSeconds: currentStatus === 'online' ? ((prevState?.uptimeSeconds || 36000) + 5) : 0,
      isRecentDrop: isNewDrop || (prevState?.isRecentDrop && isNowOffline) || false
    });
  });

  if (newDrops.length > 0) {
    saveDropLogs(existingLogs);
    playDropAlertChime();
  }

  const totalCameras = freshCameras.length;
  const uptimePercent = totalCameras > 0 ? Number(((onlineCount / totalCameras) * 100).toFixed(1)) : 0;
  const avgLatencyMs = latencySamples > 0 ? Math.round(totalLatency / latencySamples) : 0;
  const activeDropsCount = existingLogs.filter((l) => !l.acknowledged).length;

  return {
    updatedStates,
    summary: {
      timestamp: now.toLocaleTimeString('th-TH'),
      totalCameras,
      onlineCount,
      offlineCount,
      faultyCount,
      maintenanceCount,
      uptimePercent,
      avgLatencyMs,
      newDropsDetected: newDrops,
      activeDropsCount
    }
  };
};

/**
 * Simulate an immediate connectivity drop for testing / drill purposes
 */
export const simulateCameraConnectivityDrop = (targetCameraId?: string): { droppedCameraId: string; cameraName: string } | null => {
  const cameras = getStoredCctvCameras();
  if (cameras.length === 0) return null;

  let target = targetCameraId ? cameras.find(c => c.id === targetCameraId) : undefined;
  if (!target) {
    // Pick first online camera
    target = cameras.find(c => c.status === 'online');
  }

  if (!target) return null;

  const failureReasons = [
    'ตรวจพบสัญญาณขาดหายฉับพลัน (ICMP Request Timeout 3,200ms)',
    'ลิงก์ใยแก้วนำแสงสูญเสียสัญญาณ (Optical Loss of Signal - Fiber Cut)',
    'ตู้ควบคุมไฟตกชั่วขณะ (Power Drop at Cabinet Breaker)',
    'Switch Port Auto-Negotiation Failed (Link Down)'
  ];
  const chosenReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

  // Update in database
  updateCctvStatus(target.id, 'offline', `[${new Date().toLocaleTimeString('th-TH')}] จำลองเหตุสัญญาณขาดหาย: ${chosenReason}`);

  // Create drop event record immediately
  const dropEvent: ConnectivityDropEvent = {
    id: `drop-sim-${Date.now()}-${target.id.replace(/\s+/g, '_')}`,
    cameraId: target.id,
    cameraName: target.name,
    ipAddress: target.ipAddress,
    zone: target.zone,
    building: target.building,
    community: target.community,
    cabinetNumber: target.cabinetNumber,
    droppedAt: new Date().toISOString(),
    reason: `[จำลองสัญญาณหลุด] ${chosenReason}`,
    severity: 'critical',
    acknowledged: false
  };

  const currentLogs = getStoredDropLogs();
  saveDropLogs([dropEvent, ...currentLogs]);
  playDropAlertChime();

  return {
    droppedCameraId: target.id,
    cameraName: target.name
  };
};

/**
 * Restore all cameras back to 'online' status for testing and operational resets
 */
export const restoreAllCamerasToOnline = (): number => {
  const cameras = getStoredCctvCameras();
  let restoredCount = 0;
  cameras.forEach((cam) => {
    if (cam.status !== 'online') {
      updateCctvStatus(cam.id, 'online', `[${new Date().toLocaleTimeString('th-TH')}] กู้คืนและเชื่อมต่อสัญญาณ CCTV สำเร็จ`);
      restoredCount++;
    }
  });
  return restoredCount;
};
