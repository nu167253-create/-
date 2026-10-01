import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  Sparkles,
  Send,
  MapPin,
  ExternalLink,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  Trash2,
  Download,
  Copy,
  Check,
  Compass,
  AlertCircle,
  Paperclip,
  ArrowRight,
  Upload,
  Cpu,
  Layers,
  FileCheck,
  ShieldCheck,
  Navigation,
  CornerDownLeft,
  X,
  Globe,
  FileText
} from 'lucide-react';
import {
  ChatMessage,
  sendChatMessage,
  generateOrEditIncidentImage,
  getLocalChatMessages,
  persistChatMessages,
  clearStoredChat,
  getDeviceGeolocation
} from '../utils/aiAssistantService';
import { AuthUserData } from '../utils/firebaseAuthService';

interface GeminiAssistantViewProps {
  authUser: AuthUserData | null;
  onAttachImageToForm?: (dataUrl: string, fileName: string) => void;
  onNavigateToTab?: (tab: any) => void;
  isModal?: boolean;
  onClose?: () => void;
}

type BotRoleId = 'service' | 'legal' | 'technician';

interface BotRoleConfig {
  id: BotRoleId;
  name: string;
  badge: string;
  desc: string;
  avatarIcon: string;
  recommendedModel: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
  quickQuestions: Array<{ label: string; query: string }>;
}

const BOT_ROLES: BotRoleConfig[] = [
  {
    id: 'service',
    name: 'เจ้าหน้าที่บริการประชาชน CCTV',
    badge: 'งานบริการและสารบรรณ',
    desc: 'แนะนำขั้นตอน เอกสารที่ใช้ การติดตามคำร้อง และระยะเวลารับภาพ',
    avatarIcon: '🏛️',
    recommendedModel: 'gemini-3.5-flash',
    quickQuestions: [
      { label: 'เอกสารที่ต้องใช้ (บันทึกประจำวัน)', query: 'ขอทราบรายการเอกสารที่จำเป็นต้องใช้ในการยื่นคำร้องขอดูภาพกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ' },
      { label: 'ระยะเวลาเก็บภาพย้อนหลัง', query: 'กล้องวงจรปิด CCTV ของเทศบาลเมืองชัยภูมิ เก็บข้อมูลภาพย้อนหลังได้กี่วัน และควรยื่นคำร้องภายในระยะเวลากี่วัน?' },
      { label: 'ขั้นตอนยื่นเรื่องกรณีมอบอำนาจ', query: 'หากเจ้าของรถหรือผู้เสียหายไม่สะดวกมายื่นเอง จะมอบอำนาจให้บุคคลอื่นดำเนินการแทนได้อย่างไร ใช้เอกสารอะไรบ้าง?' },
      { label: 'ขั้นตอนรับไฟล์วิดีโอ', query: 'หลังจากคำร้องได้รับการอนุมัติแล้ว มีขั้นตอนและช่องทางในการรับไฟล์ภาพวิดีโอ CCTV อย่างไรบ้าง?' }
    ]
  },
  {
    id: 'legal',
    name: 'นิติกร & ผู้เชี่ยวชาญ PDPA',
    badge: 'กฎหมาย & PDPA',
    desc: 'ให้คำปรึกษา พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล และการใช้ภาพเป็นพยานหลักฐาน',
    avatarIcon: '⚖️',
    recommendedModel: 'gemini-3.1-pro-preview',
    quickQuestions: [
      { label: 'ข้อกำหนดตาม พ.ร.บ. PDPA', query: 'การขอดูและขอสำเนาไฟล์ภาพกล้องวงจรปิด CCTV มีข้อกำหนดตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างไรบ้าง?' },
      { label: 'การเบลอหน้าบุคคลภายนอก', query: 'หากในคลิปวิดีโอ CCTV มีบุคคลภายนอกที่ไม่เกี่ยวข้องติดเข้ามา เทศบาลหรือผู้ขอต้องปฏิบัติตามระเบียบ PDPA อย่างไร?' },
      { label: 'การใช้เป็นหลักฐานชั้นศาล', query: 'การนำภาพกล้องวงจรปิดไปใช้เป็นพยานหลักฐานทางคดีต่อพนักงานสอบสวนหรือศาล ต้องมีหนังสือรับรองสำเนาถูกต้องอย่างไร?' },
      { label: 'สิทธิของเจ้าของข้อมูล (DSAR)', query: 'ในฐานะประชาชนผู้สัญจรไปมา มีสิทธิในการขอเข้าถึงหรือขอดูข้อมูลภาพของตนเอง (Data Subject Access Request) ได้หรือไม่?' }
    ]
  },
  {
    id: 'technician',
    name: 'วิศวกร & ช่างเทคนิค CCTV',
    badge: 'วิศวกรรม & โครงข่าย',
    desc: 'สเปกกล้อง PTZ/Fixed เครือข่าย Fiber Optic และรัศมีครอบคลุมจุดสำคัญ',
    avatarIcon: '🛠️',
    recommendedModel: 'gemini-3.5-flash',
    quickQuestions: [
      { label: 'กล้องใกล้ สภ.เมืองชัยภูมิ', query: 'จุดติดตั้งกล้องวงจรปิด CCTV เทศบาลที่อยู่ใกล้สถานีตำรวจภูธรเมืองชัยภูมิ มีจุดใดบ้างและเป็นกล้องประเภทใด?' },
      { label: 'กล้องรอบวงเวียนพญาแล', query: 'บริเวณวงเวียนอนุสาวรีย์เจ้าพ่อพญาแล มีกล้องกี่ตัว ครอบคลุมทิศทางใดบ้าง และตรวจจับป้ายทะเบียนได้หรือไม่?' },
      { label: 'ความคมชัดและระยะบันทึก', query: 'กล้อง CCTV ของเทศบาลเมืองชัยภูมิ บันทึกภาพที่ความละเอียดเท่าใด และมีระบบอินฟราเรดสำหรับกลางคืนหรือไม่?' },
      { label: 'ศูนย์ควบคุม CCTV (NOC)', query: 'ศูนย์ควบคุมกล้องวงจรปิดเทศบาลเมืองชัยภูมิตั้งอยู่ที่ใด และเชื่อมโยงสัญญาณด้วยระบบใด?' }
    ]
  }
];

export const GeminiAssistantView: React.FC<GeminiAssistantViewProps> = ({
  authUser,
  onAttachImageToForm,
  onNavigateToTab,
  isModal = false,
  onClose
}) => {
  // Main Navigation within AI View
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'images' | 'maps'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = getLocalChatMessages();
    if (stored.length > 0) return stored;
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        content: `สวัสดีครับ! ผมคือ **ผู้ช่วยอัจฉริยะ CCTV เทศบาลเมืองชัยภูมิ (Gemini AI)** ยินดีให้บริการครับ 

ท่านสามารถเลือกบทบาทผู้ช่วยและสอบถามข้อมูลได้ทุกมิติ:
- 🏛️ **เจ้าหน้าที่บริการประชาชน**: แนะนำขั้นตอน เอกสารที่ต้องใช้ และการติดตามผล
- ⚖️ **นิติกร & ผู้เชี่ยวชาญ PDPA**: ตรวจสอบข้อกฎหมายคุ้มครองข้อมูลส่วนบุคคลและการใช้เป็นพยานหลักฐาน
- 🛠️ **วิศวกร & ช่างเทคนิค CCTV**: สเปกกล้อง รัศมีมุมมอง โครงข่ายใยแก้วนำแสง และพิกัดจุดสำคัญ

🌐 **รองรับ Google Search Grounding** (ดึงข้อมูลล่าสุด) และ 📍 **Google Maps Grounding** (พิกัดจุดติดตั้งจริง)`,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash',
        botRole: 'service'
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [botRole, setBotRole] = useState<BotRoleId>('service');
  const [chatModel, setChatModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Active role config
  const currentRoleConfig = BOT_ROLES.find((r) => r.id === botRole) || BOT_ROLES[0];

  // Image Generation / Editing State
  const [imageAction, setImageAction] = useState<'generate' | 'edit'>('generate');
  const [imagePrompt, setImagePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3'>('1:1');
  const [sourceImageBase64, setSourceImageBase64] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<{ url: string; prompt: string; text?: string } | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageCopied, setImageCopied] = useState(false);
  const [imageAttachedNotice, setImageAttachedNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Maps Quick Search State
  const [mapsQuery, setMapsQuery] = useState('');
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);
  const [mapsResults, setMapsResults] = useState<Array<{ title: string; uri: string; address?: string }>>([]);
  const [mapsAnswerText, setMapsAnswerText] = useState<string | null>(null);

  // Save chat on updates
  useEffect(() => {
    persistChatMessages(messages);
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingChat]);

  const handleRoleChange = (roleId: BotRoleId) => {
    setBotRole(roleId);
    const target = BOT_ROLES.find((r) => r.id === roleId);
    if (target && target.recommendedModel) {
      setChatModel(target.recommendedModel);
    }
  };

  const handleToggleSearchGrounding = () => {
    if (!useSearchGrounding) {
      setUseSearchGrounding(true);
      setUseMapsGrounding(false); // Gemini API doesn't support Search + Maps grounding simultaneously
      setChatModel('gemini-3.5-flash'); // Recommended for search grounding
    } else {
      setUseSearchGrounding(false);
    }
  };

  const handleToggleMapsGrounding = () => {
    if (!useMapsGrounding) {
      setUseMapsGrounding(true);
      setUseSearchGrounding(false); // Gemini API doesn't support Search + Maps grounding simultaneously
      setChatModel('gemini-3.5-flash'); // Required for maps grounding
    } else {
      setUseMapsGrounding(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoadingChat) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputQuery('');
    setIsLoadingChat(true);

    try {
      const historyPayload = newHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendChatMessage({
        messages: historyPayload,
        model: chatModel,
        botRole,
        useSearchGrounding,
        useMapsGrounding
      });

      const modelMessage: ChatMessage = {
        id: `mdl-${Date.now()}`,
        role: 'model',
        content: res.text,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed || chatModel,
        botRole,
        sources: res.sources,
        places: res.places
      };

      setMessages([...newHistory, modelMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ ขออภัยครับ: ${err.message || 'ไม่สามารถรับข้อมูลจาก Gemini ได้ในขณะนี้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'ระบบตอบกลับฉุกเฉิน'
      };
      setMessages([...newHistory, errorMessage]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const lines = messages.map(m => {
      const author = m.role === 'user' ? 'ผู้ใช้' : `ผู้ช่วย AI (${m.botRole || 'CCTV Assistant'})`;
      return `[${m.timestamp}] ${author}:\n${m.content}\n`;
    });
    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cctv-ai-consultation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearChat = () => {
    if (confirm('คุณต้องการล้างประวัติการสนทนาทั้งหมดใช่หรือไม่?')) {
      clearStoredChat();
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          content: 'ล้างประวัติการสนทนาเรียบร้อยครับ มีข้อสงสัยเกี่ยวกับการขอดูภาพกล้องวงจรปิด CCTV สามารถพิมพ์สอบถามได้เลยครับ!',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'gemini-3.5-flash',
          botRole
        }
      ]);
    }
  };

  // Image Generation / Editing Handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setImageAttachedNotice(false);

    try {
      const res = await generateOrEditIncidentImage({
        action: imageAction,
        prompt: imagePrompt.trim(),
        base64Image: imageAction === 'edit' ? (sourceImageBase64 || undefined) : undefined,
        aspectRatio
      });

      if (res.success && res.imageUrl) {
        setGeneratedImage({
          url: res.imageUrl,
          prompt: imagePrompt.trim(),
          text: res.text
        });
      } else {
        throw new Error('ไม่พบข้อมูลรูปภาพที่สร้างกลับมา');
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setImageError(err.message || 'เกิดข้อผิดพลาดในการสร้างภาพ กรุณาลองปรับคำสั่ง Prompt ใหม่อีกครั้ง');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // File Upload for Image Edit
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSourceImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage.url;
    a.download = `cctv-diagram-${Date.now()}.png`;
    a.click();
  };

  const handleAttachToForm = () => {
    if (!generatedImage || !onAttachImageToForm) return;
    const filename = `ภาพจำลองเหตุการณ์-AI-${Date.now()}.png`;
    onAttachImageToForm(generatedImage.url, filename);
    setImageAttachedNotice(true);
    setTimeout(() => setImageAttachedNotice(false), 4000);
  };

  // Maps Direct Search Handler
  const handleSearchMaps = async (queryText?: string) => {
    const q = (queryText || mapsQuery).trim();
    if (!q || isSearchingMaps) return;

    setIsSearchingMaps(true);
    setMapsResults([]);
    setMapsAnswerText(null);

    try {
      const res = await sendChatMessage({
        messages: [{ role: 'user', content: `ค้นหาพิกัดและสถานที่บนแผนที่ Google Maps ในเทศบาลเมืองชัยภูมิ: ${q}` }],
        model: 'gemini-3.5-flash',
        useMapsGrounding: true
      });

      setMapsAnswerText(res.text);
      if (res.places && res.places.length > 0) {
        setMapsResults(res.places);
      }
    } catch (err: any) {
      setMapsAnswerText(`เกิดข้อผิดพลาดในการค้นหาแผนที่: ${err.message}`);
    } finally {
      setIsSearchingMaps(false);
    }
  };

  const QUICK_QUESTIONS = [
    { label: 'เอกสารที่ต้องใช้ (บันทึกประจำวัน สภ.)', query: 'ขอทราบรายการเอกสารที่จำเป็นต้องใช้ในการยื่นคำร้องขอดูภาพกล้องวงจรปิด CCTV ของเทศบาลเมืองชัยภูมิ' },
    { label: 'กล้องใกล้ สภ.เมืองชัยภูมิ', query: 'จุดติดตั้งกล้องวงจรปิดที่อยู่ใกล้สถานีตำรวจภูธรเมืองชัยภูมิ มีจุดใดบ้าง?' },
    { label: 'ระยะเวลาเก็บข้อมูลภาพย้อนหลัง', query: 'กล้องวงจรปิด CCTV ของเทศบาลเก็บข้อมูลบันทึกภาพย้อนหลังได้กี่วัน และควรยื่นคำร้องภายในเวลากี่วัน?' },
    { label: 'พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)', query: 'การขอดูและขอคัดลอกไฟล์ภาพกล้องวงจรปิด มีข้อกำหนดทางกฎหมาย PDPA อย่างไรบ้าง?' },
    { label: 'ขั้นตอนยื่นเรื่องกรณีมอบอำนาจ', query: 'หากเจ้าของรถหรือผู้เสียหายไม่สะดวกมายื่นเอง จะมอบอำนาจให้บุคคลอื่นดำเนินการแทนได้อย่างไร ใช้เอกสารอะไรบ้าง?' }
  ];

  const IMAGE_PRESETS = [
    { title: 'แผนผังสี่แยกไฟแดง', prompt: 'แผนผังจำลองทางแยก 4 ทิศทาง พร้อมตำแหน่งติดตั้งกล้อง CCTV มุมกว้าง มีสัญญาณไฟจราจร และช่องจราจรชัดเจน' },
    { title: 'อุบัติเหตุรถชนท้าย', prompt: 'แผนผังจำลองอุบัติเหตุรถเก๋งชนท้ายรถกระบะบนถนน 4 เลน มีลูกศรแสดงทิศทางวิ่งและตำแหน่งเสากล้องวงจรปิดบนเกาะกลาง' },
    { title: 'วงเวียนพญาแล', prompt: 'แผนผังมุมมองจากบนลงล่างของวงเวียนอนุสาวรีย์เจ้าพ่อพญาแล แสดงเส้นทางรถวนรอบวงเวียนและตำแหน่งกล้องตรวจจับป้ายทะเบียน' },
    { title: 'จุดกลับรถและเส้นทางหลบหนี', prompt: 'แผนผังจุดกลับรถหน้าโรงเรียน มีรถจักรยานยนต์เลี้ยวตัดหน้า และระบุรัศมีมุมมองของกล้อง CCTV เทศบาล' }
  ];

  return (
    <div className={`flex flex-col bg-slate-900 text-slate-100 ${isModal ? 'h-[90vh] max-h-[850px] rounded-2xl shadow-2xl overflow-hidden border border-slate-700' : 'min-h-[80vh] rounded-xl border border-slate-800'}`}>
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                ผู้ช่วยอัจฉริยะ CCTV (Gemini AI Assistant)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Gemini 3 Series
              </span>
            </div>
            <p className="text-xs text-slate-400">
              เทศบาลเมืองชัยภูมิ • ระบบตอบคำถาม แผนที่ Google Maps และสร้างภาพจำลองแผนผัง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Navigation Tabs */}
          <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeSubTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>แชทสอบถาม</span>
            </button>

            <button
              onClick={() => setActiveSubTab('images')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeSubTab === 'images'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-300" />
              <span>สตูดิโอภาพจำลอง</span>
            </button>

            <button
              onClick={() => setActiveSubTab('maps')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeSubTab === 'maps'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>ค้นหาพิกัด Maps</span>
            </button>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60">
        {/* ===================== TAB 1: CHATBOT ===================== */}
        {activeSubTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Role Selector Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span>เลือกบทบาทผู้ช่วย AI (AI Chatbot Role):</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {currentRoleConfig.desc}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BOT_ROLES.map((role) => {
                  const isActive = botRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleChange(role.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-blue-950/80 border-blue-500/80 shadow-md ring-1 ring-blue-500/40 text-white'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                      }`}
                    >
                      <span className="text-xl shrink-0">{role.avatarIcon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{role.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{role.badge}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control Bar: Model Switcher & Search / Maps Grounding Toggles */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Model Selector */}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">โมเดล AI:</span>
                  <select
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">⚡ Gemini 3.5 Flash (งานทั่วไป / Grounding แนะนำ)</option>
                    <option value="gemini-3.1-pro-preview">🧠 Gemini 3.1 Pro (วิเคราะห์เชิงลึก / กฎหมาย)</option>
                    <option value="gemini-3.1-flash-lite">🚀 Gemini 3.1 Flash Lite (ตอบกลับฉับไว)</option>
                  </select>
                </div>

                {/* Google Search Grounding Toggle */}
                <button
                  type="button"
                  onClick={handleToggleSearchGrounding}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                    useSearchGrounding
                      ? 'bg-sky-950/90 text-sky-200 border-sky-500/80 shadow-xs ring-1 ring-sky-500/30'
                      : 'bg-slate-800 hover:bg-slate-700/80 text-slate-400 border-slate-700'
                  }`}
                  title="ดึงข้อมูลข่าวสาร กฎหมาย และข้อมูลล่าสุดผ่าน Google Search Grounding"
                >
                  <Globe className={`w-3.5 h-3.5 ${useSearchGrounding ? 'text-sky-400 animate-spin' : 'text-slate-400'}`} />
                  <span>Google Search Data</span>
                  {useSearchGrounding && (
                    <span className="bg-sky-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      เปิดใช้งาน
                    </span>
                  )}
                </button>

                {/* Google Maps Grounding Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMapsGrounding}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                    useMapsGrounding
                      ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700/80 text-slate-400 border-slate-700'
                  }`}
                  title="ค้นหาพิกัดและสถานที่สำคัญในเทศบาลผ่าน Google Maps Grounding"
                >
                  <Compass className={`w-3.5 h-3.5 ${useMapsGrounding ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Google Maps Data</span>
                  {useMapsGrounding && (
                    <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                      เปิดใช้งาน
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportChat}
                  className="flex items-center gap-1 text-slate-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ดาวน์โหลดประวัติการสนทนาเป็นไฟล์ .txt"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ส่งออกบทสนทนา</span>
                </button>

                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ล้างประวัติการสนทนาทั้งหมด"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างประวัติ</span>
                </button>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      authUser?.photoURL ? (
                        <img
                          src={authUser.photoURL}
                          alt="User"
                          className="w-8 h-8 rounded-full border border-blue-500/50 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {authUser?.displayName?.[0] || 'U'}
                        </div>
                      )
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-indigo-800 border border-blue-400/40 flex items-center justify-center text-white shrink-0 shadow-sm text-sm">
                        {msg.botRole === 'legal' ? '⚖️' : msg.botRole === 'technician' ? '🛠️' : '🏛️'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none'
                      }`}
                    >
                      {/* Role Header & Timestamp */}
                      <div className="flex items-center justify-between gap-3 text-[11px] mb-1.5 opacity-80">
                        <span className="font-semibold flex items-center gap-1.5">
                          {isUser ? (
                            <span>{authUser?.displayName || 'คุณ (ผู้ใช้บริการ)'}</span>
                          ) : (
                            <>
                              <span>
                                {msg.botRole === 'legal'
                                  ? 'นิติกร & ผู้เชี่ยวชาญ PDPA'
                                  : msg.botRole === 'technician'
                                  ? 'วิศวกร & ช่างเทคนิค CCTV'
                                  : 'ผู้ช่วยบริการประชาชน CCTV'}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-900/60 text-blue-300 border border-blue-700/40">
                                Gemini AI
                              </span>
                            </>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {msg.modelUsed && (
                            <span className="px-1.5 py-0.2 rounded-sm bg-slate-900/70 text-[10px] text-blue-300 border border-slate-700">
                              {msg.modelUsed}
                            </span>
                          )}
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>

                      {/* Content (Render Markdown) */}
                      <div className="markdown-body prose prose-invert prose-sm max-w-none text-slate-200 break-words">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Grounded Google Search Sources Cards */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                            <Globe className="w-3.5 h-3.5" />
                            <span>แหล่งข้อมูลอ้างอิงจาก Google Search ({msg.sources.length} แหล่ง)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-900 border border-sky-500/30 hover:border-sky-400 text-xs text-sky-200 hover:text-white transition-all group"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                <span className="truncate max-w-[240px] font-medium">
                                  {src.title || src.uri}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grounded Google Maps Places Cards */}
                      {msg.places && msg.places.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>พิกัดสถานที่จาก Google Maps ({msg.places.length} แห่ง)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.places.map((place, pIdx) => (
                              <a
                                key={pIdx}
                                href={place.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/30 hover:border-emerald-400 transition-all text-left group"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-xs text-white group-hover:text-emerald-300 truncate">
                                    {place.title}
                                  </div>
                                  {place.address && (
                                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                      {place.address}
                                    </div>
                                  )}
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons inside bubble */}
                      <div className="mt-2 flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                          title="คัดลอกข้อความ"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>คัดลอก</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoadingChat && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-700/60 flex items-center justify-center text-white shrink-0 animate-pulse text-sm">
                    {currentRoleConfig.avatarIcon}
                  </div>
                  <div className="bg-slate-800/90 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>
                      {useSearchGrounding
                        ? 'กำลังค้นหาข้อมูลจาก Google Search และสังเคราะห์คำตอบ...'
                        : useMapsGrounding
                        ? 'กำลังค้นหาพิกัดและสถานที่จาก Google Maps...'
                        : `${currentRoleConfig.name} กำลังประมวลผลคำตอบด้วย Gemini...`}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Question Chips (Adapted to Current Role) */}
            <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex items-center gap-2 text-xs no-scrollbar">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0 flex items-center gap-1">
                <span>{currentRoleConfig.avatarIcon}</span>
                <span>คำถามแนะนำ:</span>
              </span>
              {currentRoleConfig.quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.query)}
                  disabled={isLoadingChat}
                  className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50 text-[11px]"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <div className="p-3 bg-slate-900 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={`พิมพ์คำถามปรึกษา ${currentRoleConfig.name} (เช่น ขั้นตอน, เอกสาร, กฎหมาย PDPA, จุดติดตั้งกล้อง)...`}
                    disabled={isLoadingChat}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoadingChat}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">ส่งคำถาม</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: AI DIAGRAM & IMAGE STUDIO ===================== */}
        {activeSubTab === 'images' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 p-4 rounded-xl border border-blue-900/60 flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-sm">
                  สตูดิโอสร้างและแก้ไขภาพจำลองแผนผังจุดเกิดเหตุ (Gemini 3.1 Flash Image)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  ใช้คำสั่งข้อความ (Text Prompt) เพื่อสร้างภาพจำลองแผนผังทางแยก ถนน หรือจำลองมุมมองจากเสากล้อง CCTV
                  หรืออัปโหลดรูปภาพเดิมเพื่อส่งคำสั่งแก้ไขเพิ่มเติม และสามารถนำภาพที่ได้แนบเข้าคำร้องขอดูภาพ CCTV ได้ทันที
                </p>
              </div>
            </div>

            {/* Action Mode Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setImageAction('generate')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  imageAction === 'generate'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>1. สร้างภาพจำลองใหม่ (Text to Image)</span>
              </button>

              <button
                onClick={() => setImageAction('edit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  imageAction === 'edit'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-emerald-300" />
                <span>2. แก้ไขภาพจำลองเดิม (Edit with Prompt)</span>
              </button>
            </div>

            {/* Preset Suggestions for Generating */}
            {imageAction === 'generate' && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">ตัวอย่างคำสั่งยอดนิยม:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IMAGE_PRESETS.map((pre, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => setImagePrompt(pre.prompt)}
                      className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-blue-300 group-hover:text-blue-200">
                        {pre.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {pre.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area for Edit Mode */}
            {imageAction === 'edit' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  อัปโหลดภาพต้นฉบับที่ต้องการให้ AI แก้ไข:
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {sourceImageBase64 ? (
                  <div className="relative inline-block border border-slate-700 rounded-xl overflow-hidden bg-black/40">
                    <img
                      src={sourceImageBase64}
                      alt="Source for editing"
                      className="max-h-48 rounded-lg object-contain"
                    />
                    <button
                      onClick={() => setSourceImageBase64(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-500 text-xs"
                      title="ลบภาพต้นฉบับ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all"
                  >
                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-xs font-bold text-white">คลิกเพื่อเลือกไฟล์รูปภาพที่ต้องการแก้ไข</div>
                    <div className="text-[11px] text-slate-400 mt-1">รองรับไฟล์ PNG, JPG หรือ WebP</div>
                  </div>
                )}
              </div>
            )}

            {/* Prompt & Config Inputs */}
            <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  {imageAction === 'generate'
                    ? 'ระบุรายละเอียดภาพจำลองที่ต้องการ (Prompt):'
                    : 'ระบุการแก้ไขที่ต้องการทำกับรูปภาพ:'}
                </label>
                {imageAction === 'generate' && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>สัดส่วน:</span>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-0.5 outline-hidden"
                    >
                      <option value="1:1">1:1 (จัตุรัส)</option>
                      <option value="16:9">16:9 (แนวนอน)</option>
                      <option value="4:3">4:3 (มาตรฐาน)</option>
                    </select>
                  </div>
                )}
              </div>

              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder={
                  imageAction === 'generate'
                    ? 'เช่น แผนผังจำลองทางแยก 4 ทิศทาง มีรถยนต์สีขาวและสีดำชนกันตรงกลาง และตำแหน่งเสากล้อง CCTV...'
                    : 'เช่น ใส่ลูกศรสีแดงชี้เส้นทางที่รถจักรยานยนต์วิ่งมา และใส่วงกลมสีเหลืองตรงจุดชน...'
                }
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />

              {imageError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              <button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || isGeneratingImage || (imageAction === 'edit' && !sourceImageBase64)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini กำลังสร้างภาพจำลองความละเอียดสูง (1K)...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>{imageAction === 'generate' ? 'สร้างภาพจำลองด้วย Gemini' : 'ส่งคำสั่งแก้ไขรูปภาพ'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Generated Image Result Preview */}
            {generatedImage && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <FileCheck className="w-4 h-4" />
                    <span>ภาพจำลองที่สร้างเสร็จเรียบร้อย</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Gemini 3.1 Flash Image</span>
                </div>

                <div className="bg-black/60 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-800">
                  <img
                    src={generatedImage.url}
                    alt="Generated Diagram"
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-lg"
                  />
                </div>

                <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold">Prompt: </span>
                  <span>{generatedImage.prompt}</span>
                </div>

                {imageAttachedNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>แนบภาพจำลองเข้าฟอร์มคำร้อง CCTV เรียบร้อยแล้ว! (อยู่ในส่วนเอกสารประกอบ)</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onAttachImageToForm && (
                    <button
                      onClick={handleAttachToForm}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>แนบภาพนี้เข้าคำร้อง CCTV</span>
                    </button>
                  )}

                  <button
                    onClick={handleDownloadImage}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด PNG</span>
                  </button>

                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('submit')}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 font-semibold text-xs border border-blue-700/60 transition-colors cursor-pointer"
                    >
                      <span>ไปยังหน้ายื่นคำร้อง</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: MAPS SEARCH ===================== */}
        {activeSubTab === 'maps' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 p-4 rounded-xl border border-emerald-900/60 flex items-start gap-3">
              <Compass className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-sm">
                  ค้นหาพิกัดและสถานที่จริงด้วย Google Maps Grounding
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  ระบบจะใช้ Gemini 3.5 Flash ร่วมกับเครื่องมือ Google Maps เพื่อค้นหาจุดติดตั้งกล้องวงจรปิด สถานีตำรวจ สภ.เมืองชัยภูมิ โรงพยาบาล และแยกจราจรสำคัญ พร้อมส่งลิงก์ดูตำแหน่งบนแผนที่ Google Maps โดยตรง
                </p>
              </div>
            </div>

            {/* Quick Map Location Buttons */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">ค้นหาสถานที่สำคัญทันที:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  'สถานีตำรวจภูธรเมืองชัยภูมิ (สภ.เมืองชัยภูมิ)',
                  'สำนักงานเทศบาลเมืองชัยภูมิ',
                  'โรงพยาบาลชัยภูมิ',
                  'วงเวียนอนุสาวรีย์เจ้าพ่อพญาแล ชัยภูมิ',
                  'ห้าแยกโนนไฮ ชัยภูมิ',
                  'สี่แยกหนองบัว ชัยภูมิ'
                ].map((loc, lIdx) => (
                  <button
                    key={lIdx}
                    onClick={() => {
                      setMapsQuery(loc);
                      handleSearchMaps(loc);
                    }}
                    disabled={isSearchingMaps}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{loc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchMaps()}
                placeholder="ระบุชื่อสถานที่ แยกไฟแดง หรือจุดสังเกตในชัยภูมิ เช่น สภ.เมืองชัยภูมิ..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={() => handleSearchMaps()}
                disabled={!mapsQuery.trim() || isSearchingMaps}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSearchingMaps ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>ค้นหาบนแผนที่</span>
              </button>
            </div>

            {/* Maps Results Output */}
            {mapsAnswerText && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="markdown-body prose prose-invert prose-sm max-w-none text-slate-200 text-xs leading-relaxed">
                  <ReactMarkdown>{mapsAnswerText}</ReactMarkdown>
                </div>

                {mapsResults.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>จุดพิกัด Google Maps ({mapsResults.length} แห่ง)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {mapsResults.map((place, idx) => (
                        <a
                          key={idx}
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500 transition-all flex items-start justify-between gap-2 group"
                        >
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                              {place.title}
                            </div>
                            {place.address && (
                              <div className="text-[11px] text-slate-400 mt-1">
                                {place.address}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
