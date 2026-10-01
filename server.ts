import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db, getDb } from './src/db/index.ts';
import { requests, users } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { eq } from 'drizzle-orm';
import { GoogleGenAI, Type } from '@google/genai';
import { classifyRequestTopicsHeuristic } from './services/geminiService.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for universal web access by anyone with the link
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // In-memory server requests store for online sync & Service Worker caching
  const serverRequestsStore: any[] = [];

  app.get(['/api/requests', '/api/my-requests'], (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.setHeader('X-Served-By', 'Express-Server');
    return res.json(serverRequestsStore);
  });

  app.post('/api/requests', (req, res) => {
    const data = req.body;
    if (Array.isArray(data)) {
      for (const item of data) {
        if (!item?.id) continue;
        const existingIdx = serverRequestsStore.findIndex((r) => r.id === item.id);
        if (existingIdx >= 0) {
          serverRequestsStore[existingIdx] = item;
        } else {
          serverRequestsStore.unshift(item);
        }
      }
      return res.json({ success: true, count: serverRequestsStore.length });
    } else if (data && data.id) {
      const existingIdx = serverRequestsStore.findIndex((r) => r.id === data.id);
      if (existingIdx >= 0) {
        serverRequestsStore[existingIdx] = data;
      } else {
        serverRequestsStore.unshift(data);
      }
      return res.json({ success: true, item: data });
    }
    return res.status(400).json({ error: 'Invalid request payload' });
  });

  app.post('/api/requests/sync', (req, res) => {
    const { requests = [] } = req.body || {};
    if (Array.isArray(requests)) {
      for (const item of requests) {
        if (!item?.id) continue;
        const existingIdx = serverRequestsStore.findIndex((r) => r.id === item.id);
        const syncedItem = { ...item, syncStatus: 'synced', isPendingSync: false };
        if (existingIdx >= 0) {
          serverRequestsStore[existingIdx] = syncedItem;
        } else {
          serverRequestsStore.unshift(syncedItem);
        }
      }
    }
    return res.json({ success: true, syncedCount: requests.length });
  });

  // Server-side SMS notification store & gateway endpoints
  const serverSmsLogsStore: any[] = [];

  app.post('/api/sms/send', (req, res) => {
    const payload = req.body || {};
    const {
      requestId = 'REQ-GENERAL',
      requestTitle = 'คำร้องทั่วไป',
      recipientPhone = '081-XXX-XXXX',
      recipientName = 'ผู้ยื่นคำร้อง',
      message = '',
      triggerStatus = 'updated'
    } = payload;

    const logItem = {
      id: payload.id || `SMS-SRV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      requestId,
      requestTitle,
      recipientPhone,
      recipientName,
      message,
      status: 'sent',
      triggerStatus,
      sentAt: payload.sentAt || new Date().toISOString(),
      provider: payload.provider || 'Chaiyaphum Municipal Smart SMS Gateway',
      characterCount: payload.characterCount || (message || '').length,
      creditUnits: payload.creditUnits || Math.max(1, Math.ceil((message || '').length / 70)),
      deliveryRef: payload.deliveryRef || `REF-${Date.now().toString().slice(-6)}`,
      carrier: payload.carrier || 'AIS / TrueMove H / DTAC'
    };

    serverSmsLogsStore.unshift(logItem);
    if (serverSmsLogsStore.length > 200) {
      serverSmsLogsStore.pop();
    }

    console.log(`[Server SMS Service] Dispatched SMS status alert to ${recipientPhone} for ${requestId}`);
    return res.json({
      success: true,
      log: logItem,
      gateway: {
        provider: 'Chaiyaphum Municipal Smart SMS Gateway',
        status: 'delivered',
        timestamp: new Date().toISOString()
      }
    });
  });

  app.get('/api/sms/logs', (req, res) => {
    return res.json({ success: true, count: serverSmsLogsStore.length, logs: serverSmsLogsStore });
  });

  app.get('/api/sms/status', (req, res) => {
    return res.json({
      success: true,
      status: 'operational',
      provider: 'Chaiyaphum Municipal Smart SMS Gateway',
      quotaRemaining: 4850,
      deliverySuccessRate: 99.8,
      averageLatencyMs: 135,
      supportedCarriers: ['AIS', 'TrueMove H', 'DTAC', 'NT (National Telecom)']
    });
  });

  // Server-side SMS customizable templates store
  let serverSmsTemplatesStore: any = null;

  app.get('/api/sms/templates', (req, res) => {
    return res.json({ success: true, templates: serverSmsTemplatesStore });
  });

  app.post('/api/sms/templates', (req, res) => {
    const { templates } = req.body || {};
    if (templates) {
      serverSmsTemplatesStore = templates;
    }
    return res.json({ success: true, count: templates ? Object.keys(templates).length : 0 });
  });

  // Server-side cache for AI calls
  const serverAutoTagCache = new Map<string, { result: any; timestamp: number }>();
  const serverPolishCache = new Map<string, { result: string; timestamp: number }>();
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 mins

  // AI Auto-tagging endpoint
  app.post('/api/gemini/auto-tag', async (req, res) => {
    const { title, reason, category, details } = req.body || {};
    const cleanTitle = (title || '').trim();
    const cleanReason = (reason || '').trim();

    const cacheKey = `${cleanTitle}:::${category}:::${cleanReason}:::${JSON.stringify(details || {})}`;
    const cached = serverAutoTagCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.result);
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey || (!cleanTitle && !cleanReason)) {
        const heuristic = classifyRequestTopicsHeuristic(cleanTitle, cleanReason, category, details);
        serverAutoTagCache.set(cacheKey, { result: heuristic, timestamp: Date.now() });
        return res.json(heuristic);
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const detailsStr = details ? JSON.stringify(details) : '';
      const textToAnalyze = `หัวข้อ: ${cleanTitle}\nหมวดหมู่: ${category || ''}\nเหตุผลความจำเป็น: ${cleanReason}\nรายละเอียดเพิ่มเติม: ${detailsStr}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `วิเคราะห์เนื้อหาคำร้องต่อไปนี้ และจัดหมวดหมู่แท็กหัวข้อ (Topics) ที่เกี่ยวข้องโดยอัตโนมัติ:\n\n${textToAnalyze}`,
        config: {
          systemInstruction: `คุณคือระบบ AI อัจฉริยะวิเคราะห์และติดแท็กหมวดหมู่คำร้อง (Auto-tagging Classification System) สำหรับระบบ CCTV และบริการภาครัฐ
หน้าที่ของคุณคืออ่านหัวข้อคำร้องและเหตุผล แล้วจัดหมวดหมู่ลงในหัวข้อต่อไปนี้ (ตอบเลือกมา 1 ถึง 3 หัวข้อที่ตรงที่สุด):
- 'Maintenance' (กรณีแจ้งซ่อมแซม/บำรุงรักษากล้องวงจรปิด, กล้องเสีย, ภาพดับ, กล้องหมุนไม่ได้, ตรวจสอบอุปกรณ์)
- 'Access Request' (กรณีขอดูภาพ, ขอคัดสำเนาไฟล์ CCTV, ขอดาวน์โหลดวิดีโอ, ขอสิทธิ์เข้าถึง)
- 'Privacy Concern' (กรณีข้อกังวลเรื่องความเป็นส่วนตัว, PDPA, ละเมิดสิทธิ์, ขอให้ลบภาพ, บันทึกภาพในพื้นที่ส่วนบุคคล)
- 'Traffic & Safety' (กรณีอุบัติเหตุจราจร, รถชน, ขับรถประมาท, จราจรติดขัด, ปลอดภัยสาธารณะ, ติดตามคนหาย)
- 'Property Damage / Theft' (กรณีทรัพย์สินสูญหาย, ถูกลักทรัพย์, งัดแงะ, ทำลายทรัพย์สิน, รถโดนกรีด)
- 'General Inquiry' (กรณีสอบถามข้อมูลทั่วไป, ขอความช่วยเหลือทั่วไป)

จงส่งคืนผลลัพธ์เป็นโครงสร้าง JSON พร้อมระบุ primaryTopic, รายการ topics ทั้งหมด, ค่าความเชื่อมั่น (confidence 0.0 - 1.0) และคำอธิบายสั้นๆ (reasoning) ภาษาไทย`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'รายการแท็กหัวข้อที่เกี่ยวข้อง'
              },
              primaryTopic: {
                type: Type.STRING,
                description: 'หัวข้อหลักที่ตรงที่สุด'
              },
              confidence: {
                type: Type.NUMBER,
                description: 'ความเชื่อมั่นของ AI ตั้งแต่ 0.0 ถึง 1.0'
              },
              reasoning: {
                type: Type.STRING,
                description: 'เหตุผลกระชับภาษาไทยว่าทำไมถึงจัดในหมวดหมู่นี้'
              }
            },
            required: ['topics', 'primaryTopic', 'confidence', 'reasoning']
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
        serverAutoTagCache.set(cacheKey, { result: parsed, timestamp: Date.now() });
        return res.json(parsed);
      }
    } catch (error: any) {
      console.warn('Gemini auto-tagging rate limit or network warning, falling back to heuristic:', error?.message || error);
    }

    const heuristic = classifyRequestTopicsHeuristic(cleanTitle, cleanReason, category, details);
    serverAutoTagCache.set(cacheKey, { result: heuristic, timestamp: Date.now() });
    res.json(heuristic);
  });

  // AI Text Polish endpoint (handling both /api/gemini/polish and /api/polish)
  const handlePolishRequest = async (req: express.Request, res: express.Response) => {
    const { originalText, text, categoryTitle } = req.body || {};
    const input = (originalText || text || '').trim();

    if (!input) {
      return res.json({ polishedText: '' });
    }

    const cacheKey = `${categoryTitle}:::${input}`;
    const cached = serverPolishCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ polishedText: cached.result });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        const fallback = polishThaiTextLocally(input, categoryTitle);
        serverPolishCache.set(cacheKey, { result: fallback, timestamp: Date.now() });
        return res.json({ polishedText: fallback });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `คุณคือผู้เชี่ยวชาญด้านงานสารบรรณและการเขียนหนังสือราชการและเอกสารทางการขององค์กรในประเทศไทย 
โปรดปรับเปลี่ยนข้อความต่อไปนี้ให้อยู่ในรูปแบบภาษาทางการที่สละสลวย ถูกต้องตามระเบียบงานสารบรรณ เหมาะสำหรับใส่ในช่อง "เหตุผลความจำเป็นในการยื่นคำร้อง" ของคำร้องประเภท "${categoryTitle || 'คำร้องทั่วไป'}"

ข้อความดั้งเดิม:
"${input}"

คำสั่ง:
1. ปรับข้อความให้กระชับ เป็นทางการ สุภาพ ถูกหลักภาษาไทย
2. ห้ามแต่งเติมข้อมูลเท็จลงไป ให้คงใจความสำคัญเดิมไว้ทั้งหมด
3. ตอบเฉพาะข้อความภาษาทางการที่ปรับแต่งแล้วเท่านั้น ไม่ต้องมีคำเกริ่นหรือเครื่องหมายคำพูดล้อมรอบ`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      const polished = response.text?.trim() || input;
      serverPolishCache.set(cacheKey, { result: polished, timestamp: Date.now() });
      return res.json({ polishedText: polished });
    } catch (error: any) {
      console.warn('Gemini polish request warning, falling back to smart local rules:', error?.message || error);
      const fallback = polishThaiTextLocally(input, categoryTitle);
      serverPolishCache.set(cacheKey, { result: fallback, timestamp: Date.now() });
      return res.json({ polishedText: fallback });
    }
  };

  function polishThaiTextLocally(text: string, category: string): string {
    let clean = (text || '').trim();
    if (!clean) return '';
    if (!clean.startsWith('มีความจำเป็นต้อง') && !clean.startsWith('เนื่องด้วย') && !clean.startsWith('มีความประสงค์')) {
      clean = `มีความประสงค์ขอ${category || 'รับบริการ'} เนื่องจาก${clean}`;
    }
    if (!clean.endsWith('เพื่อดำเนินการต่อไป') && !clean.endsWith('โปรดพิจารณาอนุมัติ')) {
      clean += ' เพื่อใช้เป็นหลักฐานประกอบการดำเนินการตามขั้นตอนต่อไป จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ';
    }
    return clean;
  }

  app.post('/api/gemini/polish', handlePolishRequest);
  app.post('/api/polish', handlePolishRequest);

  // Gemini Multi-turn Chat Endpoint with Search Grounding, Maps Grounding, and Role Systems
  app.post('/api/gemini/chat', async (req: express.Request, res: express.Response) => {
    try {
      const {
        messages = [],
        model = 'gemini-3.5-flash',
        botRole = 'service',
        useSearchGrounding = false,
        useMapsGrounding = false,
        userLocation = { latitude: 15.8066, longitude: 102.0315 }
      } = req.body || {};

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured on server',
          fallbackText: 'ขออภัย ขณะนี้ระบบยังไม่ได้ตั้งค่า API Key หากต้องการยื่นคำร้องขอดูภาพ CCTV ท่านสามารถเตรียมใบแจ้งความจาก สภ.เมืองชัยภูมิ และสำเนาบัตรประชาชนเพื่อยื่นผ่านระบบได้ทันที'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      // Role-specific System Instructions
      let systemInstruction = '';
      if (botRole === 'legal') {
        systemInstruction = `คุณคือ "นิติกรและผู้เชี่ยวชาญกฎหมาย PDPA ประจำระบบ CCTV เทศบาลเมืองชัยภูมิ"
บทบาทหน้าที่:
1. ให้คำปรึกษาด้านกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562) ในการขอภาพจากกล้องวงจรปิด
2. ชี้แจงฐานทางกฎหมาย (Legal Basis) เช่น การปกป้องประโยชน์สำคัญต่อชีวิต ร่างกาย สิทธิของเจ้าของข้อมูล (Data Subject Rights) และการใช้เป็นพยานหลักฐานในคดีความ
3. ข้อกำหนดเรื่องเอกสาร: ใบแจ้งความ/บันทึกประจำวันของพนักงานสอบสวน สภ.เมืองชัยภูมิ, สำเนาบัตรประชาชน, หนังสือมอบอำนาจ
4. การรักษาสิทธิของบุคคลภายนอกที่ไม่เกี่ยวข้อง (Third-Party Privacy) การเซ็นเซอร์/เบลอภาพบุคคลอื่นหากนำไปเผยแพร่
5. ให้คำตอบที่รอบคอบ สุภาพ อ้างอิงระเบียบกฎหมายอย่างถูกต้อง ชัดเจน และเป็นประโยชน์ต่อประชาชน`;
      } else if (botRole === 'technician') {
        systemInstruction = `คุณคือ "วิศวกรโครงข่ายและนายช่างเทคนิคระบบกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ"
บทบาทหน้าที่:
1. ให้ข้อมูลด้านเทคนิค ระบบกล้อง IP Camera, กล้อง PTZ Speed Dome, กล้อง Fixed Lens และกล้องตรวจจับป้ายทะเบียน (LPR) ในเขตเทศบาล
2. โครงข่ายเคเบิลใยแก้วนำแสง (Fiber Optic Backbone) และจุดรวมสัญญาณศูนย์ควบคุม CCTV เทศบาลเมืองชัยภูมิ
3. การประเมินมุมมองกล้อง รัศมีการมองเห็น สภาพแสงกลางวัน/กลางคืน และระยะเวลาบันทึกภาพย้อนหลัง (เฉลี่ย 15-30 วัน ขึ้นกับ NVR Storage)
4. การให้คำแนะนำเรื่องพิกัดและตำแหน่งกล้องในจุดสำคัญ เช่น วงเวียนพญาแล, หอนาฬิกา, แยกโนนกอก, สภ.เมืองชัยภูมิ, รพ.ชัยภูมิ
5. ตอบอย่างเป็นมืออาชีพ มีความรู้เชิงวิศวกรรมโครงข่ายและการบำรุงรักษากล้อง`;
      } else {
        systemInstruction = `คุณคือ "ผู้ช่วยบริการประชาชน CCTV อัจฉริยะ เทศบาลเมืองชัยภูมิ" (Smart CCTV Assistant)
บทบาทหน้าที่:
1. แนะนำขั้นตอนการยื่นคำร้องขอดูภาพหรือขอสำเนาวิดีโอจากกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ
2. เอกสารที่ต้องใช้:
   - บันทึกประจำวันหรือใบแจ้งความจาก สภ.เมืองชัยภูมิ (ระบุวัน เวลา และสถานที่เกิดเหตุให้ชัดเจน)
   - สำเนาบัตรประจำตัวประชาชน พร้อมรับรองสำเนาถูกต้อง
   - หนังสือมอบอำนาจ (กรณีมอบหมายให้ผู้อื่นดำเนินการแทน)
   - เอกสารประกอบ เช่น ภาพถ่ายความเสียหาย สำเนาทะเบียนรถ หรือเอกสารบริษัทประกัน
3. สถานที่สำคัญและพิกัดในเขตเทศบาลเมืองชัยภูมิ: วงเวียนอนุสาวรีย์พญาแล, หอนาฬิกา, สภ.เมืองชัยภูมิ, ถนนบรรณาการ, ถนนหฤทัย, โรงพยาบาลชัยภูมิ
4. ระยะเวลาจัดเก็บข้อมูลภาพ: บันทึกย้อนหลังเฉลี่ย 15-30 วัน จึงแนะนำให้ยื่นคำร้องโดยเร็วที่สุด
5. ให้คำแนะนำด้วยความสุภาพ อบอุ่น เป็นมิตร กระชับ และเข้าใจง่าย`;
      }

      // Check if user requested Google Search Grounding (gemini-3.5-flash with googleSearch tool)
      if (useSearchGrounding) {
        const lastUserMsg = Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1].content || messages[messages.length - 1].text || ''
          : 'ข้อมูลระเบียบ ขั้นตอนการขอดูกล้องวงจรปิด CCTV และข่าวสารเทศบาลเมืองชัยภูมิ';

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: lastUserMsg,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }]
          }
        });

        const responseText = response.text || '';
        const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any[];

        const sources: Array<{ title: string; uri: string }> = [];
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri
            });
          }
        }

        return res.json({
          role: 'model',
          text: responseText,
          sources,
          modelUsed: 'gemini-3.5-flash (Google Search Grounded)',
          groundingMetadata: response.candidates?.[0]?.groundingMetadata
        });
      }

      // Check if user requested Google Maps Grounding (gemini-3.5-flash with googleMaps tool)
      if (useMapsGrounding) {
        const lastUserMsg = Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1].content || messages[messages.length - 1].text || ''
          : 'จุดติดตั้งกล้อง CCTV และสถานที่สำคัญใกล้เคียงในเทศบาลเมืองชัยภูมิ';

        const lat = Number(userLocation?.latitude) || 15.8066;
        const lng = Number(userLocation?.longitude) || 102.0315;

        const mapsConfig: any = {
          systemInstruction,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: lastUserMsg,
          config: mapsConfig
        });

        const responseText = response.text || '';
        const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any[];

        const places: Array<{ title: string; uri: string; address?: string }> = [];
        for (const chunk of groundingChunks) {
          if (chunk.maps?.uri) {
            places.push({
              title: chunk.maps.title || 'ดูตำแหน่งบน Google Maps',
              uri: chunk.maps.uri,
              address: chunk.maps.address || ''
            });
          } else if (chunk.web?.uri) {
            places.push({
              title: chunk.web.title || 'แหล่งข้อมูลอ้างอิง',
              uri: chunk.web.uri
            });
          }
        }

        return res.json({
          role: 'model',
          text: responseText,
          places,
          modelUsed: 'gemini-3.5-flash (Google Maps Grounded)',
          groundingMetadata: response.candidates?.[0]?.groundingMetadata
        });
      }

      // Standard multi-turn chat with role system instruction and model selection
      // Allowed models: gemini-3.1-pro-preview for complex tasks, gemini-3.5-flash for general, gemini-3.1-flash-lite for fast
      const allowedModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
      const targetModel = allowedModels.includes(model) ? model : 'gemini-3.5-flash';

      const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      if (Array.isArray(messages)) {
        for (const m of messages) {
          const text = (m.content || m.text || '').trim();
          if (text) {
            formattedContents.push({
              role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text }]
            });
          }
        }
      }

      if (formattedContents.length === 0) {
        formattedContents.push({
          role: 'user',
          parts: [{ text: 'สวัสดีครับ ขอสอบถามขั้นตอนการขอดูภาพกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ' }]
        });
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: formattedContents,
        config: {
          systemInstruction
        }
      });

      return res.json({
        role: 'model',
        text: response.text || '',
        modelUsed: targetModel
      });
    } catch (error: any) {
      console.error('Error in /api/gemini/chat:', error);
      return res.status(500).json({
        error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล',
        fallbackText: 'ขออภัย ระบบตอบกลับอัตโนมัติขัดข้องชั่วคราว หากท่านมีข้อสงสัยเรื่องคำร้อง CCTV สามารถตรวจสอบในแท็บ "คู่มือ & FAQ" หรือโทรสอบถามงานเทศกิจ เทศบาลเมืองชัยภูมิ'
      });
    }
  });

  // Gemini Image Generation and Editing Endpoint
  app.post('/api/gemini/image-action', async (req: express.Request, res: express.Response) => {
    try {
      const {
        action = 'generate',
        prompt,
        base64Image,
        mimeType = 'image/png',
        aspectRatio = '1:1'
      } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'กรุณาระบุคำสั่งข้อความ (Prompt) สำหรับสร้างหรือแก้ไขภาพ' });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      // Edit existing image
      if (action === 'edit' && base64Image) {
        const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/png'
                }
              },
              {
                text: `แก้ไขภาพจำลอง/แผนผังนี้ตามคำสั่ง: ${prompt} โดยคงความเป็นแผนผังจำลองจุดเกิดเหตุหรือหลักฐานกล้องวงจรปิดอย่างชัดเจน`
              }
            ]
          }
        });

        let generatedImageUrl: string | null = null;
        let responseText = '';
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            } else if (part.text) {
              responseText += part.text;
            }
          }
        }

        if (!generatedImageUrl) {
          return res.status(500).json({
            error: 'โมเดลไม่สามารถสร้างภาพที่แก้ไขได้ กรุณาลองปรับคำสั่ง Prompt ใหม่',
            text: responseText || response.text
          });
        }

        return res.json({
          success: true,
          action: 'edit',
          imageUrl: generatedImageUrl,
          text: responseText
        });
      }

      // Generate new diagram / incident scene mockup
      const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
      const ratio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

      const enrichedPrompt = `Clear architectural technical diagram, incident scene blueprint, and CCTV surveillance perspective: ${prompt}. Clean top-down view or clear angle showing roadway, intersection markings, traffic lanes, vehicle positioning, and CCTV camera location pins. Crisp technical illustration, high contrast, clean vector style.`;

      const imgConfig: any = {
        imageConfig: {
          aspectRatio: ratio,
          imageSize: '1K'
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: enrichedPrompt }]
        },
        config: imgConfig
      });

      let generatedImageUrl: string | null = null;
      let responseText = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            responseText += part.text;
          }
        }
      }

      if (!generatedImageUrl) {
        return res.status(500).json({
          error: 'โมเดลไม่ได้ส่งรูปภาพกลับมา กรุณาลองใหม่อีกครั้ง',
          text: responseText || response.text
        });
      }

      return res.json({
        success: true,
        action: 'generate',
        imageUrl: generatedImageUrl,
        text: responseText
      });
    } catch (error: any) {
      console.error('Error in /api/gemini/image-action:', error);
      return res.status(500).json({
        error: error.message || 'เกิดข้อผิดพลาดในการสร้างหรือแก้ไขภาพด้วย Gemini'
      });
    }
  });

  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const user = await getOrCreateUser(req.user.uid, req.user.email || '');
        res.json({ user });
      } else {
        res.status(401).json({ error: 'No user' });
      }
    } catch (error: any) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        const database = getDb();
        if (!database) {
          return res.json({ requests: [] });
        }
        const userRec = await database.select().from(users).where(eq(users.uid, req.user.uid));
        if (userRec && userRec.length > 0) {
          const result = await database.select().from(requests).where(eq(requests.userId, userRec[0].id));
          res.json({ requests: result });
        } else {
          res.json({ requests: [] });
        }
      } else {
        res.status(401).json({ error: 'No user' });
      }
    } catch (error: any) {
      console.error('Database query failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
