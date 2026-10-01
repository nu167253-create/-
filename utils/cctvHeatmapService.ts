import { RequestItem } from '../types/request';
import { CctvCamera } from '../types/cctv';
import { getStoredRequests } from './storage';
import { 
  HISTORICAL_CCTV_INCIDENTS, 
  HIGH_INCIDENT_ZONES, 
  CctvIncidentRecord, 
  HighIncidentZoneSummary, 
  IncidentCategory 
} from '../data/cctvHistoricalRequests';

export type { HighIncidentZoneSummary, CctvIncidentRecord, IncidentCategory };

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number; // 0.1 to 10
  incidentId: string;
  category: IncidentCategory;
  zone: string;
  title: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HeatmapFilterOptions {
  categoryFilter?: 'all' | 'traffic_accident' | 'criminal_case' | 'lost_property' | 'urgent_only';
  timeframe?: 'all' | '30d' | '90d' | '1y';
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface HeatmapSummaryStats {
  totalIncidents: number;
  criticalHotspots: number;
  trafficAccidents: number;
  criminalCases: number;
  lostProperty: number;
  urgentRequests: number;
  footageReleaseRate: number; // percentage
  topZoneName: string;
  topZoneIncidentCount: number;
  averageResolutionDays: number;
}

/**
 * Extract CCTV requests from stored user requests and harmonize into CctvIncidentRecord format
 */
export function getHarmonizedStoredIncidents(): CctvIncidentRecord[] {
  try {
    const storedRequests = getStoredRequests();
    const cctvRequests = storedRequests.filter((r: RequestItem) => 
      r.category === 'cctv' || 
      (r.title && (r.title.includes('CCTV') || r.title.includes('กล้อง') || r.title.includes('อุบัติเหตุ') || r.title.includes('เฉี่ยวชน'))) ||
      (r.reason && (r.reason.includes('CCTV') || r.reason.includes('กล้องวงจรปิด')))
    );

    const converted: CctvIncidentRecord[] = cctvRequests.map((r: RequestItem) => {
      // Determine category based on title & reason keywords
      let category: IncidentCategory = 'traffic_accident';
      const text = `${r.title} ${r.reason} ${JSON.stringify(r.details || {})}`.toLowerCase();
      
      if (text.includes('ลักทรัพย์') || text.includes('วิ่งราว') || text.includes('ขโมย') || text.includes('ทำร้าย') || text.includes('คดี')) {
        category = 'criminal_case';
      } else if (text.includes('สูญหาย') || text.includes('ลืม') || text.includes('หาไม่พบ')) {
        category = 'lost_property';
      } else if (text.includes('เสาไฟ') || text.includes('สายไฟ') || text.includes('ทรัพย์สินเสียหาย')) {
        category = 'infrastructure';
      } else if (text.includes('ฝ่าไฟแดง') || text.includes('ย้อนศร') || text.includes('กีดขวาง')) {
        category = 'traffic_violation';
      } else if (text.includes('เด็ก') || text.includes('คนหาย') || text.includes('สงบเรียบร้อย')) {
        category = 'public_safety';
      }

      // Determine coordinate based on location mention or fallback to central Chaiyaphum
      let lat = 15.80852;
      let lng = 102.03105;
      let zone = 'สี่แยกหอนาฬิกา';
      let locName = r.details?.cctvLocation || r.location || 'เขตเทศบาลเมืองชัยภูมิ';

      if (text.includes('โรบินสัน') || text.includes('robinson')) {
        lat = 15.80621;
        lng = 102.03150;
        zone = 'ตู้สี่แยกโรบินสัน';
      } else if (text.includes('พญาแล') || text.includes('โนนกอก') || text.includes('อนุสาวรีย์')) {
        lat = 15.81150;
        lng = 102.02950;
        zone = 'ตู้สามแยกโนนกอก';
      } else if (text.includes('สตรีชัยภูมิ') || text.includes('หนองบัว') || text.includes('โรงเรียน')) {
        lat = 15.80420;
        lng = 102.02800;
        zone = 'โซน 3';
      } else if (text.includes('บายพาส') || text.includes('ตาดโตน') || text.includes('ขี้เหล็ก')) {
        lat = 15.82850;
        lng = 102.04350;
        zone = 'ตู้ควบคุมที่ 1';
      } else if (text.includes('ตลาด') || text.includes('ตลาดสด')) {
        lat = 15.80710;
        lng = 102.02620;
        zone = 'ตู้ควบคุมที่ 6';
      } else if (text.includes('บขส') || text.includes('สถานีขนส่ง') || text.includes('รถบัส')) {
        lat = 15.81220;
        lng = 102.03610;
        zone = 'ตู้ควบคุมที่ 4';
      } else if (text.includes('เมืองเก่า') || text.includes('ชัยประสิทธิ์')) {
        lat = 15.80210;
        lng = 102.02420;
        zone = 'โซน 1';
      } else if (text.includes('โคกน้อย')) {
        lat = 15.81320;
        lng = 102.02210;
        zone = 'ตู้ควบคุมที่ 12';
      }

      // Add a slight jitter if exact overlap so points spread naturally
      const jitterLat = (Math.random() - 0.5) * 0.0003;
      const jitterLng = (Math.random() - 0.5) * 0.0003;

      const severity = r.priority === 'urgent' ? 'critical' : r.priority === 'high' ? 'high' : 'medium';
      const weight = severity === 'critical' ? 9.5 : severity === 'high' ? 7.5 : 5.0;

      return {
        id: `STORED-${r.id}`,
        requestId: r.id,
        title: r.title,
        category,
        categoryLabel: getCategoryThaiLabel(category),
        zone,
        locationName: locName,
        latitude: lat + jitterLat,
        longitude: lng + jitterLng,
        timestamp: r.createdAt,
        severity,
        weight,
        cameraIds: r.details?.copyLocation ? [r.details.copyLocation] : ['CAM-CYP-002'],
        applicantName: r.applicant?.fullName,
        description: r.reason || r.title,
        status: r.status === 'completed' || r.status === 'approved' ? 'completed' : 'in_progress',
        footageProvided: r.status === 'completed' || r.status === 'approved'
      };
    });

    return converted;
  } catch (err) {
    console.error('Error harmonizing stored incidents:', err);
    return [];
  }
}

/**
 * Returns Thai label for incident category
 */
export function getCategoryThaiLabel(cat: IncidentCategory): string {
  switch (cat) {
    case 'traffic_accident': return 'อุบัติเหตุจราจร & ชนแล้วหนี';
    case 'criminal_case': return 'คดีอาญา & ลักทรัพย์';
    case 'lost_property': return 'ทรัพย์สินสูญหาย';
    case 'traffic_violation': return 'ฝ่าฝืนกฎจราจร';
    case 'public_safety': return 'ความปลอดภัยสาธารณะ';
    case 'infrastructure': return 'ทรัพย์สินราชการเสียหาย';
    default: return 'เหตุการณ์อื่นๆ';
  }
}

/**
 * Get combined list of historical dataset + live stored requests
 */
export function getAllCctvIncidents(): CctvIncidentRecord[] {
  const stored = getHarmonizedStoredIncidents();
  // Filter out duplicates if any stored request is already represented
  const storedReqIds = new Set(stored.map(s => s.requestId).filter(Boolean));
  const filteredHistorical = HISTORICAL_CCTV_INCIDENTS.filter(h => !h.requestId || !storedReqIds.has(h.requestId));
  return [...filteredHistorical, ...stored];
}

/**
 * Filter and generate points for Heatmap overlay
 */
export function getFilteredHeatmapPoints(options: HeatmapFilterOptions = {}): HeatmapPoint[] {
  const all = getAllCctvIncidents();
  const now = new Date().getTime();

  return all.filter(item => {
    // 1. Category Filter
    if (options.categoryFilter && options.categoryFilter !== 'all') {
      if (options.categoryFilter === 'urgent_only') {
        if (item.severity !== 'critical' && item.severity !== 'high') return false;
      } else if (item.category !== options.categoryFilter) {
        return false;
      }
    }

    // 2. Timeframe Filter
    if (options.timeframe && options.timeframe !== 'all') {
      const itemTime = new Date(item.timestamp).getTime();
      const diffDays = (now - itemTime) / (1000 * 60 * 60 * 24);
      if (options.timeframe === '30d' && diffDays > 30) return false;
      if (options.timeframe === '90d' && diffDays > 90) return false;
      if (options.timeframe === '1y' && diffDays > 365) return false;
    }

    // 3. Min Severity Filter
    if (options.minSeverity) {
      const severityRank = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityRank[item.severity] < severityRank[options.minSeverity]) return false;
    }

    return true;
  }).map(item => ({
    lat: item.latitude,
    lng: item.longitude,
    weight: item.weight,
    incidentId: item.id,
    category: item.category,
    zone: item.zone,
    title: item.title,
    timestamp: item.timestamp,
    severity: item.severity
  }));
}

/**
 * Get High Incident Zones dynamically enriched with stored request counts
 */
export function getDynamicHighIncidentZones(): HighIncidentZoneSummary[] {
  const allIncidents = getAllCctvIncidents();
  
  return HIGH_INCIDENT_ZONES.map(zone => {
    // Find incidents near this zone center (within ~500m radius, approx 0.005 deg)
    const matching = allIncidents.filter(inc => {
      const dLat = Math.abs(inc.latitude - zone.latitude);
      const dLng = Math.abs(inc.longitude - zone.longitude);
      return dLat < 0.005 && dLng < 0.005;
    });

    const accidents = matching.filter(m => m.category === 'traffic_accident').length;
    const crimes = matching.filter(m => m.category === 'criminal_case').length;
    const lost = matching.filter(m => m.category === 'lost_property').length;
    const others = matching.length - accidents - crimes - lost;

    const baseCount = Math.max(zone.totalIncidents, matching.length);

    return {
      ...zone,
      totalIncidents: baseCount,
      trafficAccidents: Math.max(zone.trafficAccidents, accidents),
      criminalCases: Math.max(zone.criminalCases, crimes),
      lostProperty: Math.max(zone.lostProperty, lost),
      otherCases: Math.max(zone.otherCases, others)
    };
  }).sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Get summary stats for the dashboard header
 */
export function getHeatmapSummaryStats(): HeatmapSummaryStats {
  const incidents = getAllCctvIncidents();
  const highZones = getDynamicHighIncidentZones();

  const total = incidents.length;
  const traffic = incidents.filter(i => i.category === 'traffic_accident').length;
  const crime = incidents.filter(i => i.category === 'criminal_case').length;
  const lost = incidents.filter(i => i.category === 'lost_property').length;
  const urgent = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const footageProvided = incidents.filter(i => i.footageProvided).length;
  const releaseRate = total > 0 ? Math.round((footageProvided / total) * 1000) / 10 : 96.5;

  const topZone = highZones[0] || { zoneName: 'สี่แยกหอนาฬิกา', totalIncidents: 18 };

  return {
    totalIncidents: total,
    criticalHotspots: highZones.filter(z => z.riskLevel === 'critical').length,
    trafficAccidents: traffic,
    criminalCases: crime,
    lostProperty: lost,
    urgentRequests: urgent,
    footageReleaseRate: releaseRate,
    topZoneName: topZone.zoneName,
    topZoneIncidentCount: topZone.totalIncidents,
    averageResolutionDays: 1.2
  };
}

/**
 * Find nearby CCTV cameras for a given coordinate
 */
export function findNearbyCameras(
  lat: number, 
  lng: number, 
  cameras: CctvCamera[], 
  maxDistanceMeters = 400
): CctvCamera[] {
  return cameras.filter(cam => {
    if (!cam.latitude || !cam.longitude) return false;
    const dLat = (cam.latitude - lat) * 111000;
    const dLng = (cam.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    return dist <= maxDistanceMeters;
  });
}
