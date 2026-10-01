import { CctvCamera, CctvStatus, CctvType } from '../types/cctv';

export interface ParsedSearchIntent {
  status?: CctvStatus;
  statusLabel?: string;
  zone?: string;
  district?: string;
  cameraType?: CctvType;
  cameraTypeLabel?: string;
  keywords: string[];
  rawQuery: string;
  confidence: number;
  explanation: string;
}

export interface SmartSearchResult {
  cameras: CctvCamera[];
  totalMatches: number;
  intent: ParsedSearchIntent;
  appliedFilters: {
    status?: CctvStatus;
    zone?: string;
    district?: string;
    cameraType?: CctvType;
  };
  queryTimeMs: number;
  suggestions: string[];
}

// Synonym mappings for natural language parsing
const STATUS_SYNONYMS: Record<CctvStatus, string[]> = {
  online: [
    'online', 'ออนไลน์', 'ปกติ', 'ใช้งานได้', 'ใช้งานปกติ', 'ใช้ได้', 'ทำงานปกติ',
    'เชื่อมต่ออยู่', 'เปิดอยู่', 'ปกติสุข', 'สถานะดี', 'ดี', 'live', 'active', 'ok',
    'ปกติทั้งหมด', 'กล้องปกติ'
  ],
  faulty: [
    'faulty', 'ชำรุด', 'เสีย', 'พัง', 'มีปัญหา', 'ใช้งานไม่ได้', 'ภาพดับ', 'ภาพมืด',
    'ภาพเบลอ', 'ไฟไม่เข้า', 'ไฟดับ', 'กล้องเสีย', 'กล้องพัง', 'กล้องชำรุด', 'สัญญาณขาด',
    'กระจกมัว', 'broken', 'damaged', 'error', 'defect', 'bad'
  ],
  maintenance: [
    'maintenance', 'ซ่อม', 'กำลังซ่อม', 'อยู่ระหว่างซ่อม', 'ซ่อมแซม', 'ซ่อมบำรุง',
    'ตรวจเช็ค', 'บำรุงรักษา', 'ช่างกำลัง', 'รอซ่อม', 'ระหว่างซ่อม', 'รออะไหล่',
    'fixing', 'repair', 'servicing', 'check'
  ],
  offline: [
    'offline', 'ออฟไลน์', 'ขาดการเชื่อมต่อ', 'สายหลุด', 'ไฟไหม้สาย', 'สัญญาณขาดหาย',
    'ดับ', 'เน็ตหลุด', 'ออฟไลน', 'no signal', 'disconnected', 'down', 'dead', 'loss'
  ]
};

const CAMERA_TYPE_SYNONYMS: Record<CctvType, string[]> = {
  dome: ['dome', 'โดม', 'กล้องโดม', 'ติดเพดาน'],
  bullet: ['bullet', 'กระบอก', 'กล้องกระบอก', 'ทรงกระบอก'],
  ptz: ['ptz', 'speed dome', 'หมุนได้', 'ซูมได้', 'สปีดโดม', 'กล้องหมุน'],
  '360_degree': ['360', '360 degree', 'fisheye', 'ตาปลา', 'พาโนรามา', 'รอบทิศ']
};

/**
 * Tokenize a string into cleaned, lowercased words supporting both Thai & English
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  // Split on spaces, punctuation, underscores, slashes, dashes, brackets
  const rawParts = text
    .toLowerCase()
    .replace(/[()[\]{}:;,."'+*?!/\\#~=]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const tokens = new Set<string>();

  rawParts.forEach(part => {
    tokens.add(part);

    // If English + numbers (e.g. cctv1, ch1, ip01), also split
    const alphanumericSplit = part.match(/[a-z]+|[0-9]+/gi);
    if (alphanumericSplit && alphanumericSplit.length > 1) {
      alphanumericSplit.forEach(sub => tokens.add(sub.toLowerCase()));
    }

    // Common Thai prefixes to break down for better indexing (e.g. ชุมชนเมืองเก่า -> เมืองเก่า)
    const prefixes = ['ชุมชน', 'โซน', 'ตู้ควบคุมที่', 'ตู้ควบคุม', 'ตู้', 'สี่แยก', 'สามแยก', 'กล้อง', 'เขต', 'ถนน'];
    for (const prefix of prefixes) {
      if (part.startsWith(prefix) && part.length > prefix.length) {
        tokens.add(part.slice(prefix.length).trim());
        tokens.add(prefix);
      }
    }
  });

  return Array.from(tokens).filter(t => t.length > 0);
}

/**
 * High-performance Inverted Search Index for CCTV cameras
 */
export class CctvSearchIndex {
  private cameras: CctvCamera[] = [];
  
  // Inverted index: token -> Map of cameraId -> score weight
  private invertedIndex: Map<string, Map<string, number>> = new Map();
  
  // Faceted lookup maps
  private statusMap: Map<CctvStatus, Set<string>> = new Map();
  private zoneMap: Map<string, Set<string>> = new Map();
  private districtMap: Map<string, Set<string>> = new Map();
  private typeMap: Map<CctvType, Set<string>> = new Map();
  
  // Known values for fuzzy / semantic matching
  private knownDistricts: string[] = [];
  private knownZones: string[] = [];
  private knownBuildings: string[] = [];

  constructor(cameras: CctvCamera[] = []) {
    this.buildIndex(cameras);
  }

  /**
   * Rebuild the entire index with new camera list
   */
  public buildIndex(cameras: CctvCamera[]): void {
    this.cameras = cameras;
    this.invertedIndex.clear();
    this.statusMap.clear();
    this.zoneMap.clear();
    this.districtMap.clear();
    this.typeMap.clear();

    const districtsSet = new Set<string>();
    const zonesSet = new Set<string>();
    const buildingsSet = new Set<string>();

    cameras.forEach(camera => {
      const camId = camera.id;

      // 1. Faceted indexes
      if (camera.status) {
        if (!this.statusMap.has(camera.status)) this.statusMap.set(camera.status, new Set());
        this.statusMap.get(camera.status)!.add(camId);
      }

      if (camera.zone) {
        const normZone = camera.zone.trim();
        zonesSet.add(normZone);
        if (!this.zoneMap.has(normZone)) this.zoneMap.set(normZone, new Set());
        this.zoneMap.get(normZone)!.add(camId);
      }

      if (camera.community || camera.building) {
        const district = (camera.community || camera.building || '').trim();
        if (district) {
          districtsSet.add(district);
          if (!this.districtMap.has(district)) this.districtMap.set(district, new Set());
          this.districtMap.get(district)!.add(camId);
        }
      }

      if (camera.building) {
        buildingsSet.add(camera.building.trim());
      }

      if (camera.type) {
        if (!this.typeMap.has(camera.type)) this.typeMap.set(camera.type, new Set());
        this.typeMap.get(camera.type)!.add(camId);
      }

      // 2. Inverted index indexing with field weights
      this.indexField(camId, camera.id, 12);               // Camera ID (highest priority)
      this.indexField(camId, camera.name, 9);               // Name / Location
      this.indexField(camId, camera.zone, 8);               // Zone
      this.indexField(camId, camera.community, 8);          // Community / District
      this.indexField(camId, camera.building, 7);           // Building / Area
      this.indexField(camId, camera.floor, 6);              // Floor / Sub-location
      this.indexField(camId, camera.cabinetNumber, 8);      // Cabinet Number
      this.indexField(camId, camera.channel, 7);            // Channel (e.g. CH1)
      this.indexField(camId, camera.ipAddress, 8);          // IP Address
      this.indexField(camId, camera.assetCode, 7);          // Asset Code
      this.indexField(camId, camera.systemAssetCode, 6);    // System Asset Code
      this.indexField(camId, camera.nvrGroup, 6);           // NVR Group
      this.indexField(camId, camera.notes, 4);              // Failure / Maintenance notes
      this.indexField(camId, camera.inspector, 3);          // Inspector
      this.indexField(camId, camera.resolution, 4);         // 4K, 1080p
      this.indexField(camId, camera.type, 5);               // dome, bullet, ptz
    });

    this.knownDistricts = Array.from(districtsSet);
    this.knownZones = Array.from(zonesSet);
    this.knownBuildings = Array.from(buildingsSet);
  }

  private indexField(camId: string, text: string | undefined, weight: number): void {
    if (!text) return;
    const tokens = tokenizeText(text);
    tokens.forEach(token => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Map());
      }
      const postMap = this.invertedIndex.get(token)!;
      postMap.set(camId, (postMap.get(camId) || 0) + weight);
    });
  }

  /**
   * Parse a natural language search query into structured intents (district, zone, status, etc.)
   */
  public parseNaturalLanguageQuery(query: string): ParsedSearchIntent {
    const rawQuery = query.trim();
    const lowerQuery = rawQuery.toLowerCase();
    
    let detectedStatus: CctvStatus | undefined;
    let detectedStatusLabel: string | undefined;
    let detectedZone: string | undefined;
    let detectedDistrict: string | undefined;
    let detectedType: CctvType | undefined;
    let detectedTypeLabel: string | undefined;

    // Remaining tokens for free-text scoring
    let workingQuery = lowerQuery;

    // 1. Detect Status via Synonym Dictionary
    for (const [statusKey, synonyms] of Object.entries(STATUS_SYNONYMS)) {
      const typedStatus = statusKey as CctvStatus;
      for (const synonym of synonyms) {
        const regex = new RegExp(`(^|\\s|[.,\\-_])${synonym.toLowerCase()}(\\s|[.,\\-_]|$)`, 'i');
        if (regex.test(workingQuery)) {
          detectedStatus = typedStatus;
          detectedStatusLabel = typedStatus === 'online' ? 'ใช้งานได้ปกติ (Online)'
            : typedStatus === 'faulty' ? 'ชำรุด/ขัดข้อง (Faulty)'
            : typedStatus === 'maintenance' ? 'อยู่ระหว่างซ่อม (Maintenance)'
            : 'ขาดการเชื่อมต่อ (Offline)';
          workingQuery = workingQuery.replace(regex, ' ').trim();
          break;
        }
      }
      if (detectedStatus) break;
    }

    // 2. Detect Camera Type
    for (const [typeKey, synonyms] of Object.entries(CAMERA_TYPE_SYNONYMS)) {
      const typedType = typeKey as CctvType;
      for (const synonym of synonyms) {
        const regex = new RegExp(`(^|\\s|[.,\\-_])${synonym.toLowerCase()}(\\s|[.,\\-_]|$)`, 'i');
        if (regex.test(workingQuery)) {
          detectedType = typedType;
          detectedTypeLabel = typedType === 'ptz' ? 'PTZ Speed Dome'
            : typedType === 'bullet' ? 'Bullet Camera'
            : typedType === 'dome' ? 'Dome Camera'
            : 'Fisheye 360°';
          workingQuery = workingQuery.replace(regex, ' ').trim();
          break;
        }
      }
      if (detectedType) break;
    }

    // 3. Detect Zone (e.g. โซน 1, zone 2, ตู้ 1, ตู้ควบคุมที่ 3, ตู้สี่แยกโรบินสัน)
    // Check known zones first
    for (const zone of this.knownZones) {
      if (zone && lowerQuery.includes(zone.toLowerCase())) {
        detectedZone = zone;
        workingQuery = workingQuery.replace(zone.toLowerCase(), ' ').trim();
        break;
      }
    }

    // If not found in known zones, check regex for "โซน X", "zone X", "ตู้ X", "cabinet X"
    if (!detectedZone) {
      const zoneRegex = /(?:โซน|zone|เขต|ตู้ควบคุมที่|ตู้ควบคุม|ตู้|cabinet)\s*([0-9a-zA-Zก-๙]+)/i;
      const zoneMatch = workingQuery.match(zoneRegex);
      if (zoneMatch) {
        const captured = zoneMatch[1];
        // Match against known zones that contain this number or name
        const matchedKnown = this.knownZones.find(z => 
          z.toLowerCase().includes(captured.toLowerCase()) || 
          z.replace(/[^0-9]/g, '') === captured
        );
        detectedZone = matchedKnown || `โซน ${captured}`;
        workingQuery = workingQuery.replace(zoneMatch[0], ' ').trim();
      }
    }

    // 4. Detect District / Community / Building
    // Check known communities or buildings
    for (const district of [...this.knownDistricts, ...this.knownBuildings]) {
      if (!district) continue;
      const cleanDist = district.toLowerCase();
      if (workingQuery.includes(cleanDist)) {
        detectedDistrict = district;
        workingQuery = workingQuery.replace(cleanDist, ' ').trim();
        break;
      }
      // Also match without prefix (e.g. "ชุมชนโคกน้อย" -> query has "โคกน้อย")
      const stripped = cleanDist.replace(/^(ชุมชน|เขต|อาคาร|เทศบาล)/, '').trim();
      if (stripped.length >= 3 && workingQuery.includes(stripped)) {
        detectedDistrict = district;
        workingQuery = workingQuery.replace(stripped, ' ').trim();
        break;
      }
    }

    // If not matched, check pattern "ชุมชน X"
    if (!detectedDistrict) {
      const commRegex = /(?:ชุมชน|หมู่บ้าน|ย่าน|แถว|บริเวณ)\s*([ก-๙a-zA-Z0-9]+)/i;
      const commMatch = workingQuery.match(commRegex);
      if (commMatch) {
        const captured = commMatch[1];
        const matchedKnown = this.knownDistricts.find(d => d.toLowerCase().includes(captured.toLowerCase()));
        detectedDistrict = matchedKnown || `ชุมชน${captured}`;
        workingQuery = workingQuery.replace(commMatch[0], ' ').trim();
      }
    }

    // 5. Remaining free-text tokens
    const freeTextTokens = tokenizeText(workingQuery).filter(t => {
      // Filter out stop words / noise words
      const stopWords = ['ใน', 'ที่', 'ของ', 'และ', 'กับ', 'มี', 'หา', 'ดูกล้อง', 'กล้อง', 'จุด', 'ตัว', 'เครื่อง', 'ทั้งหมด', 'in', 'at', 'the', 'camera', 'cameras'];
      return !stopWords.includes(t);
    });

    // Build human-friendly explanation of how the query was parsed
    const parts: string[] = [];
    if (detectedStatusLabel) parts.push(`สถานะ: "${detectedStatusLabel}"`);
    if (detectedZone) parts.push(`โซน/ตู้: "${detectedZone}"`);
    if (detectedDistrict) parts.push(`เขต/ชุมชน: "${detectedDistrict}"`);
    if (detectedTypeLabel) parts.push(`ชนิดกล้อง: "${detectedTypeLabel}"`);
    if (freeTextTokens.length > 0) parts.push(`คำค้นหา: "${freeTextTokens.join(', ')}"`);

    const confidence = (detectedStatus ? 0.35 : 0) +
                       (detectedZone ? 0.3 : 0) +
                       (detectedDistrict ? 0.25 : 0) +
                       (detectedType ? 0.15 : 0) +
                       (freeTextTokens.length > 0 ? 0.2 : 0);

    const explanation = parts.length > 0
      ? `กรองด้วยดัชนีอัจฉริยะ (${parts.join(' • ')})`
      : 'ค้นหาด้วยคำค้นหาทั่วไปในดัชนี';

    return {
      status: detectedStatus,
      statusLabel: detectedStatusLabel,
      zone: detectedZone,
      district: detectedDistrict,
      cameraType: detectedType,
      cameraTypeLabel: detectedTypeLabel,
      keywords: freeTextTokens,
      rawQuery,
      confidence: Math.min(1.0, confidence),
      explanation
    };
  }

  /**
   * Search cameras using the internal search index and parsed natural language intents
   */
  public search(query: string): SmartSearchResult {
    const startTime = performance.now();
    const trimmed = (query || '').trim();

    // If query is empty, return all cameras
    if (!trimmed) {
      return {
        cameras: [...this.cameras],
        totalMatches: this.cameras.length,
        intent: {
          keywords: [],
          rawQuery: '',
          confidence: 1.0,
          explanation: 'แสดงกล้องทั้งหมดในระบบ'
        },
        appliedFilters: {},
        queryTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        suggestions: this.getDefaultSuggestions()
      };
    }

    const intent = this.parseNaturalLanguageQuery(trimmed);

    // 1. Initial Candidate Set
    // Start with all cameras, then narrow down using faceted filters if detected
    let candidateIds = new Set<string>(this.cameras.map(c => c.id));

    // Facet: Status
    if (intent.status) {
      const statusSet = this.statusMap.get(intent.status) || new Set();
      candidateIds = new Set([...candidateIds].filter(id => statusSet.has(id)));
    }

    // Facet: Zone
    if (intent.zone) {
      const zoneQueryLower = intent.zone.toLowerCase();
      const zoneMatches = new Set<string>();
      
      // Look through all zone sets
      for (const [zoneName, set] of this.zoneMap.entries()) {
        if (
          zoneName.toLowerCase().includes(zoneQueryLower) ||
          zoneQueryLower.includes(zoneName.toLowerCase()) ||
          zoneName.replace(/[^0-9]/g, '') === zoneQueryLower.replace(/[^0-9]/g, '')
        ) {
          set.forEach(id => zoneMatches.add(id));
        }
      }
      
      // If we found matching zone items, intersect
      if (zoneMatches.size > 0) {
        candidateIds = new Set([...candidateIds].filter(id => zoneMatches.has(id)));
      }
    }

    // Facet: District / Community
    if (intent.district) {
      const distLower = intent.district.toLowerCase();
      const districtMatches = new Set<string>();

      for (const [distName, set] of this.districtMap.entries()) {
        if (
          distName.toLowerCase().includes(distLower) ||
          distLower.includes(distName.toLowerCase()) ||
          distName.replace(/^(ชุมชน|เขต|อาคาร|เทศบาล)/, '').includes(distLower.replace(/^(ชุมชน|เขต|อาคาร|เทศบาล)/, ''))
        ) {
          set.forEach(id => districtMatches.add(id));
        }
      }

      if (districtMatches.size > 0) {
        candidateIds = new Set([...candidateIds].filter(id => districtMatches.has(id)));
      }
    }

    // Facet: Camera Type
    if (intent.cameraType) {
      const typeSet = this.typeMap.get(intent.cameraType) || new Set();
      candidateIds = new Set([...candidateIds].filter(id => typeSet.has(id)));
    }

    // 2. Score Candidates using Inverted Index for remaining free-text keywords
    const scores = new Map<string, number>();

    // Give base score to candidates that passed faceted filters
    candidateIds.forEach(id => {
      scores.set(id, 10.0);
    });

    if (intent.keywords.length > 0) {
      intent.keywords.forEach(keyword => {
        const lowerKw = keyword.toLowerCase();

        // Exact token lookup in inverted index
        const postings = this.invertedIndex.get(lowerKw);
        if (postings) {
          postings.forEach((weight, camId) => {
            if (scores.has(camId)) {
              scores.set(camId, scores.get(camId)! + weight * 2);
            }
          });
        }

        // Substring & Prefix matches across inverted index tokens
        for (const [token, postMap] of this.invertedIndex.entries()) {
          if (token !== lowerKw && (token.includes(lowerKw) || lowerKw.includes(token))) {
            const factor = token.startsWith(lowerKw) ? 0.8 : 0.5;
            postMap.forEach((weight, camId) => {
              if (scores.has(camId)) {
                scores.set(camId, scores.get(camId)! + weight * factor);
              }
            });
          }
        }
      });
    }

    // 3. Fallback: If candidateIds is empty or user typed a very specific text that didn't match faceted rules,
    // perform direct full-text scoring on all cameras
    if (candidateIds.size === 0 || (intent.keywords.length > 0 && candidateIds.size === this.cameras.length)) {
      const fallbackQueryLower = trimmed.toLowerCase();
      this.cameras.forEach(cam => {
        let score = 0;
        const textToSearch = [
          cam.id,
          cam.name,
          cam.zone,
          cam.building,
          cam.community,
          cam.cabinetNumber,
          cam.channel,
          cam.ipAddress,
          cam.assetCode,
          cam.notes
        ].filter(Boolean).join(' ').toLowerCase();

        if (textToSearch.includes(fallbackQueryLower)) {
          score += 20;
        } else {
          // Token matches
          intent.keywords.forEach(kw => {
            if (textToSearch.includes(kw.toLowerCase())) score += 5;
          });
        }

        if (score > 0) {
          scores.set(cam.id, score);
        }
      });
    }

    // 4. Sort results by relevance score
    const matchedCameras = this.cameras
      .filter(c => (scores.get(c.id) || 0) > 0)
      .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));

    const queryTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      cameras: matchedCameras,
      totalMatches: matchedCameras.length,
      intent,
      appliedFilters: {
        status: intent.status,
        zone: intent.zone,
        district: intent.district,
        cameraType: intent.cameraType
      },
      queryTimeMs,
      suggestions: this.generateContextualSuggestions(intent)
    };
  }

  private getDefaultSuggestions(): string[] {
    return [
      '🔴 กล้องชำรุดทั้งหมด',
      '🟡 อยู่ระหว่างซ่อมบำรุง',
      '🟢 กล้องที่ใช้งานได้ปกติ',
      '⚪ กล้องออฟไลน์ ขาดการเชื่อมต่อ',
      '🏙️ ชุมชนเมืองเก่า',
      '🏢 ตู้ควบคุมที่ 1',
      '📹 กล้อง PTZ หมุนได้',
      '⚡ ตู้สี่แยกโรบินสัน'
    ];
  }

  private generateContextualSuggestions(intent: ParsedSearchIntent): string[] {
    const list: string[] = [];

    if (!intent.status) {
      list.push('🔴 กล้องชำรุดในพื้นที่นี้', '🟢 กล้องที่ใช้งานได้');
    }
    if (!intent.zone && this.knownZones.length > 0) {
      list.push(`📍 ${this.knownZones[0]}`);
    }
    if (!intent.district && this.knownDistricts.length > 0) {
      list.push(`🏙️ ${this.knownDistricts[0]}`);
    }
    if (!intent.cameraType) {
      list.push('📹 กล้อง PTZ', '🔍 กล้อง Dome');
    }

    return list.slice(0, 5);
  }
}
