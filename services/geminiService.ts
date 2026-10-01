import { GoogleGenAI, Type } from '@google/genai';
import { AiAutoTagResult, AutoTagTopic } from '../types/request';

// In-memory cache for AI analysis to avoid duplicate API calls and preserve rate limits
const autoTagCache = new Map<string, { result: AiAutoTagResult; timestamp: number }>();
const polishCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function polishTextWithGemini(originalText: string, categoryTitle: string): Promise<string> {
  const cleanText = (originalText || '').trim();
  if (!cleanText) return '';

  const cacheKey = `${categoryTitle}:::${cleanText}`;
  const cached = polishCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // If running in browser, try calling backend route first
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/gemini/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: cleanText, text: cleanText, categoryTitle })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.polishedText) {
          polishCache.set(cacheKey, { result: data.polishedText, timestamp: Date.now() });
          return data.polishedText;
        }
      }
    } catch (e) {
      console.warn('Backend polish API call failed, falling back to smart local rules:', e);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    const fallback = polishThaiTextLocally(cleanText, categoryTitle);
    polishCache.set(cacheKey, { result: fallback, timestamp: Date.now() });
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `คุณคือผู้เชี่ยวชาญด้านงานสารบรรณและการเขียนหนังสือราชการและเอกสารทางการขององค์กรในประเทศไทย 
โปรดปรับเปลี่ยนข้อความต่อไปนี้ให้อยู่ในรูปแบบภาษาทางการที่สละสลวย ถูกต้องตามระเบียบงานสารบรรณ เหมาะสำหรับใส่ในช่อง "เหตุผลความจำเป็นในการยื่นคำร้อง" ของคำร้องประเภท "${categoryTitle}"

ข้อความดั้งเดิม:
"${cleanText}"

คำสั่ง:
1. ปรับข้อความให้กระชับ เป็นทางการ สุภาพ ถูกหลักภาษาไทย
2. ห้ามแต่งเติมข้อมูลเท็จลงไป ให้คงใจความสำคัญเดิมไว้ทั้งหมด
3. ตอบเฉพาะข้อความภาษาทางการที่ปรับแต่งแล้วเท่านั้น ไม่ต้องมีคำเกริ่นหรือเครื่องหมายคำพูดล้อมรอบ`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    const polished = response.text?.trim() || cleanText;
    polishCache.set(cacheKey, { result: polished, timestamp: Date.now() });
    return polished;
  } catch (err: any) {
    console.warn('Gemini polish request quota reached or unavailable, using smart local rules:', err?.message || err);
    const fallback = polishThaiTextLocally(cleanText, categoryTitle);
    polishCache.set(cacheKey, { result: fallback, timestamp: Date.now() });
    return fallback;
  }
}

export function polishThaiTextLocally(text: string, category: string): string {
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

/**
 * Fast client-side rule-based classifier (Instant Heuristics Fallback)
 */
export function classifyRequestTopicsHeuristic(
  title: string = '',
  reason: string = '',
  category: string = '',
  details: Record<string, any> = {}
): AiAutoTagResult {
  const combinedText = `${title} ${reason} ${category} ${JSON.stringify(details)}`.toLowerCase();
  const topicsSet = new Set<AutoTagTopic>();

  // Rule 1: Maintenance
  if (
    combinedText.includes('ซ่อม') ||
    combinedText.includes('เสีย') ||
    combinedText.includes('ชำรุด') ||
    combinedText.includes('ขัดข้อง') ||
    combinedText.includes('ภาพไม่ชัด') ||
    combinedText.includes('ดับ') ||
    combinedText.includes('บำรุงรักษา') ||
    combinedText.includes('ปรับมุม') ||
    combinedText.includes('maintenance') ||
    combinedText.includes('repair') ||
    category === 'maintenance'
  ) {
    topicsSet.add('Maintenance');
  }

  // Rule 2: Privacy Concern
  if (
    combinedText.includes('ความเป็นส่วนตัว') ||
    combinedText.includes('pdpa') ||
    combinedText.includes('ละเมิด') ||
    combinedText.includes('ส่วนตัว') ||
    combinedText.includes('คุ้มครองข้อมูล') ||
    combinedText.includes('สิทธิส่วนบุคคล') ||
    combinedText.includes('ขอให้ลบ') ||
    combinedText.includes('privacy')
  ) {
    topicsSet.add('Privacy Concern');
  }

  // Rule 3: Traffic & Safety
  if (
    combinedText.includes('จราจร') ||
    combinedText.includes('อุบัติเหตุ') ||
    combinedText.includes('รถชน') ||
    combinedText.includes('เฉี่ยวชน') ||
    combinedText.includes('ชนแล้วหนี') ||
    combinedText.includes('สี่แยก') ||
    combinedText.includes('ถนน') ||
    combinedText.includes('ทางข้าม') ||
    combinedText.includes('รถจักรยานยนต์') ||
    combinedText.includes('traffic') ||
    combinedText.includes('accident')
  ) {
    topicsSet.add('Traffic & Safety');
  }

  // Rule 4: Property Damage / Theft
  if (
    combinedText.includes('หาย') ||
    combinedText.includes('ลักทรัพย์') ||
    combinedText.includes('ขโมย') ||
    combinedText.includes('งัด') ||
    combinedText.includes('ทำลาย') ||
    combinedText.includes('สูญหาย') ||
    combinedText.includes('กรีด') ||
    combinedText.includes('theft') ||
    combinedText.includes('stolen')
  ) {
    topicsSet.add('Property Damage / Theft');
  }

  // Rule 5: Access Request
  if (
    combinedText.includes('ขอดู') ||
    combinedText.includes('ขอสำเนา') ||
    combinedText.includes('คัดสำเนา') ||
    combinedText.includes('ดาวน์โหลด') ||
    combinedText.includes('ขอไฟล์') ||
    combinedText.includes('ขอภาพ') ||
    combinedText.includes('ภาพวิดีโอ') ||
    combinedText.includes('access') ||
    combinedText.includes('footage') ||
    category === 'cctv'
  ) {
    topicsSet.add('Access Request');
  }

  // Fallback
  if (topicsSet.size === 0) {
    topicsSet.add('General Inquiry');
  }

  const topicsArray = Array.from(topicsSet);
  const primary = topicsArray[0];

  let reasoning = `จัดหมวดหมู่อัตโนมัติ: ${topicsArray.join(', ')}`;
  if (primary === 'Maintenance') reasoning = 'พบเนื้อหาเกี่ยวกับการแจ้งซ่อมแซม อุปกรณ์ขัดข้อง หรือสภาพกล้องชำรุด';
  else if (primary === 'Access Request') reasoning = 'พบเนื้อหาขอเข้าถึง ขอดูภาพ หรือขอคัดสำเนาข้อมูลภาพวิดีโอ CCTV';
  else if (primary === 'Privacy Concern') reasoning = 'พบเนื้อหาอ้างอิงถึงข้อกังวลเรื่องสิทธิส่วนบุคคล กฎหมาย PDPA หรือการขอคุ้มครองข้อมูล';
  else if (primary === 'Traffic & Safety') reasoning = 'พบเนื้อหาเกี่ยวกับอุบัติเหตุจราจร เหตุเฉี่ยวชน หรือความปลอดภัยบนท้องถนน';
  else if (primary === 'Property Damage / Theft') reasoning = 'พบเนื้อหาเกี่ยวกับทรัพย์สินสูญหาย การลักทรัพย์ หรือเหตุการณ์ทำลายทรัพย์สิน';

  return {
    topics: topicsArray,
    primaryTopic: primary,
    confidence: 0.90,
    reasoning,
    autoTaggedAt: new Date().toISOString()
  };
}

/**
 * AI-Based Auto-Tagging System using Gemini API with intelligent caching & fallback
 */
export async function autoTagRequestWithGemini(
  title: string,
  reason: string,
  category: string,
  details: Record<string, any> = {}
): Promise<AiAutoTagResult> {
  const cleanTitle = (title || '').trim();
  const cleanReason = (reason || '').trim();

  // If both empty, return default
  if (!cleanTitle && !cleanReason) {
    return classifyRequestTopicsHeuristic(title, reason, category, details);
  }

  // Check cache first to save quota
  const cacheKey = `${cleanTitle}:::${category}:::${cleanReason}:::${JSON.stringify(details || {})}`;
  const cached = autoTagCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // If running in browser, call server route
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/gemini/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle, reason: cleanReason, category, details })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
          const result: AiAutoTagResult = {
            topics: data.topics as AutoTagTopic[],
            primaryTopic: data.primaryTopic || data.topics[0],
            confidence: data.confidence || 0.95,
            reasoning: data.reasoning || 'วิเคราะห์ด้วยระบบ Gemini AI',
            autoTaggedAt: new Date().toISOString()
          };
          autoTagCache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (e) {
      console.warn('Auto-tag API endpoint unreachable, fallback to heuristic rule engine:', e);
    }
  }

  // Server-side direct execution or fallback
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    const heuristic = classifyRequestTopicsHeuristic(cleanTitle, cleanReason, category, details);
    autoTagCache.set(cacheKey, { result: heuristic, timestamp: Date.now() });
    return heuristic;
  }

  try {
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
หน้าที่ของคุณคืออ่านหัวข้อคำร้องและเหตุผล แล้วจัดหมวดหมู่ลงในหัวข้อต่อไปนี้ (เลือกตอบเฉพาะที่มีในรายการ 1 ถึง 3 หัวข้อที่ตรงที่สุด):
- 'Maintenance'
- 'Access Request'
- 'Privacy Concern'
- 'Traffic & Safety'
- 'Property Damage / Theft'
- 'General Inquiry'

ตอบกลับเป็นโครงสร้าง JSON:
{
  "topics": ["Access Request", "Traffic & Safety"],
  "primaryTopic": "Access Request",
  "confidence": 0.95,
  "reasoning": "อธิบายเหตุผลภาษาไทยสั้นๆ สรุปการจัดหมวดหมู่"
}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            primaryTopic: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ['topics', 'primaryTopic', 'confidence', 'reasoning']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
      const result: AiAutoTagResult = {
        topics: parsed.topics as AutoTagTopic[],
        primaryTopic: parsed.primaryTopic || parsed.topics[0],
        confidence: parsed.confidence || 0.95,
        reasoning: parsed.reasoning || 'วิเคราะห์และแยกแยะหมวดหมู่ด้วย Gemini AI',
        autoTaggedAt: new Date().toISOString()
      };
      autoTagCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  } catch (err: any) {
    console.warn('Gemini auto-tagging rate limit or network issue, gracefully using heuristic classification:', err?.message || err);
  }

  const heuristic = classifyRequestTopicsHeuristic(cleanTitle, cleanReason, category, details);
  autoTagCache.set(cacheKey, { result: heuristic, timestamp: Date.now() });
  return heuristic;
}

