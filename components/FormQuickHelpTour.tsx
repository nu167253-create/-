import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Lightbulb, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Clock, 
  FileText, 
  Camera, 
  CheckCircle2, 
  Copy, 
  Check, 
  BookOpen, 
  ArrowRight,
  Info,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Search
} from 'lucide-react';
import { RequestCategory } from '../types/request';

// Structure for Tour Steps
export interface TourStep {
  targetId: string;
  formStepRequired: 1 | 2 | 3;
  titleTh: string;
  badge: string;
  descriptionTh: string;
  tips: string[];
  goodExample: string;
  badExample?: string;
  actionSnippet?: {
    fieldKey: string;
    sampleValue: any;
    label: string;
  };
}

// 4 Popular Incident Preset Templates for Quick Insertion
export interface IncidentTemplate {
  id: string;
  category: string;
  icon: string;
  title: string;
  subtitle: string;
  requestTitle: string;
  reason: string;
  dynamicFields: Record<string, any>;
}

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    id: 'traffic_collision',
    category: 'อุบัติเหตุจราจร / เฉี่ยวชน',
    icon: '🚗',
    title: 'อุบัติเหตุจราจร / เฉี่ยวชนแล้วหลบหนี',
    subtitle: 'สำหรับตรวจสอบภาพรถคู่กรณี ทะเบียนรถ และทิศทางการหลบหนี',
    requestTitle: 'ขอดูภาพกล้องวงจรปิด CCTV เหตุการณ์รถยนต์เฉี่ยวชน บริเวณสี่แยกหอนาฬิกา',
    reason: `มีความประสงค์ขอความอนุเคราะห์ดูภาพและขอสำเนาไฟล์วิดีโอจากกล้องวงจรปิด CCTV เนื่องจากเมื่อเวลาประมาณ 08:45 น. รถจักรยานยนต์ของข้าพเจ้า (ฮอนด้า เวฟ สีแดง ทะเบียน 1กข-9999 ชัยภูมิ) ได้ถูกรถกระบะสีบรอนซ์เงินเฉี่ยวชนแล้วเลี้ยวหลบหนีมุ่งหน้าไปทางถนนหฤทัย จึงจำเป็นต้องใช้ไฟล์ภาพเป็นหลักฐานสำคัญประกอบการแจ้งความดำเนินคดีที่ สภ.เมืองชัยภูมิ`,
    dynamicFields: {
      cctvLocation: 'สี่แยกหอนาฬิกาเมืองชัยภูมิ ฝั่งมุ่งหน้าถนนหฤทัย',
      copyLocation: 'กล้องบริเวณสี่แยกหอนาฬิกา (ทุกมุม)',
      timeRange: '08:30 น. ถึง 09:15 น.',
      cameraStatus: 'ปกติ',
      purpose: 'ใช้เป็นหลักฐานประกอบการแจ้งความดำเนินคดีอุบัติเหตุจราจรเฉี่ยวชน ที่ สภ.เมืองชัยภูมิ'
    }
  },
  {
    id: 'lost_property',
    category: 'ทรัพย์สินสูญหาย / ลืมของ',
    icon: '💼',
    title: 'ติดตามทรัพย์สินสูญหาย / ลืมสิ่งของ',
    subtitle: 'สำหรับตรวจหาบุคคลที่เก็บสิ่งของไป หรือจุดที่ทำตกหล่น',
    requestTitle: 'ขอดูภาพกล้องวงจรปิด CCTV ตรวจสอบกระเป๋าสะพายสูญหาย บริเวณหน้าสำนักงานเทศบาล',
    reason: `ข้าพเจ้าได้ลืมกระเป๋าสะพายข้างสีดำ ภายในมีเอกสารประจำตัว บัตรประชาชน และเงินสดจำนวนหนึ่ง บริเวณม้านั่งริมทางเท้าหน้าสำนักงานเทศบาลเมืองชัยภูมิ ในช่วงเวลา 11:30 - 12:30 น. จึงขอความอนุเคราะห์ตรวจสอบภาพจากกล้องวงจรปิดเพื่อติดตามหาผู้ที่เก็บไปหรือตรวจสอบทิศทางของทรัพย์สิน`,
    dynamicFields: {
      cctvLocation: 'ริมทางเท้าหน้าสำนักงานเทศบาลเมืองชัยภูมิ (ใกล้จุดจอดรถจักรยานยนต์)',
      copyLocation: 'กล้องหน้าสำนักงานเทศบาลเมืองชัยภูมิ',
      timeRange: '11:15 น. ถึง 12:45 น.',
      cameraStatus: 'ปกติ',
      purpose: 'เพื่อใช้ติดตามทรัพย์สินสูญหายและประสานงานนำส่งคืนเจ้าของ'
    }
  },
  {
    id: 'camera_fault_report',
    category: 'แจ้งซ่อมกล้อง / กล้องเสีย',
    icon: '📹',
    title: 'แจ้งซ่อมแซมกล้องวงจรปิดชำรุด / มุมกล้องเคลื่อน',
    subtitle: 'สำหรับเจ้าหน้าที่หรือประชาชนพบเห็นกล้องดับ มุมมืด หรือถูกกิ่งไม้บดบัง',
    requestTitle: 'แจ้งซ่อมแซมกล้องวงจรปิด CCTV บริเวณสามแยกโรงเรียนเทศบาล 1 ไม่แสดงภาพ',
    reason: `ขอแจ้งซ่อมแซมกล้องวงจรปิด CCTV จุดติดตั้งเสาไฟสามแยกโรงเรียนเทศบาล 1 เนื่องจากพบว่าสัญญาณภาพดับ ไม่สามารถส่งสัญญาณเข้าสู่ระบบควบคุมส่วนกลางได้ และมีกิ่งไม้พาดทับสายสัญญาณ เกรงว่าจะเกิดความเสียหายต่อระบบและความปลอดภัยในพื้นที่`,
    dynamicFields: {
      equipmentType: 'กล้องวงจรปิด CCTV ชนิดกระบอก (Bullet Camera)',
      location: 'เสาไฟสามแยกโรงเรียนเทศบาล 1 ถนนโนนไฮ-เมืองเก่า',
      cameraStatus: 'ชำรุด/ขัดข้อง',
      cctvLocation: 'สามแยกโรงเรียนเทศบาล 1 ถนนโนนไฮ-เมืองเก่า',
      copyLocation: 'เสาไฟสามแยกโรงเรียนเทศบาล 1',
      purpose: 'แจ้งให้ทีมช่างบำรุงรักษาเทศบาลเข้าซ่อมแซม ปรับมุมกล้อง และตัดแต่งกิ่งไม้เพื่อคืนสภาพการใช้งาน'
    }
  },
  {
    id: 'public_dispute',
    category: 'เหตุการณ์ความไม่สงบ / ข้อพิพาท',
    icon: '🛡️',
    title: 'เหตุการณ์ความเสียหาย / ข้อพิพาทในที่สาธารณะ',
    subtitle: 'สำหรับขอภาพเหตุการณ์ทะเลาะวิวาท ทุบทำลายทรัพย์สินสาธารณะ',
    requestTitle: 'ขอดูภาพกล้องวงจรปิด CCTV ตรวจสอบเหตุการณ์ความเสียหายต่อทรัพย์สิน สวนสาธารณะเทศบาล',
    reason: `เกิดเหตุการณ์บุคคลต้องสงสัยทำให้ทรัพย์สินสาธารณะและป้ายประชาสัมพันธ์เสียหาย บริเวณลานกิจกรรมสวนสาธารณะเทศบาลเมืองชัยภูมิ จึงขอความอนุเคราะห์ดูภาพและคัดลอกไฟล์วิดีโอเพื่อใช้ตรวจสอบข้อเท็จจริงและรายงานผู้บังคับบัญชาเพื่อดำเนินการตามระเบียบ`,
    dynamicFields: {
      cctvLocation: 'ลานกิจกรรม สวนสาธารณะเทศบาลเมืองชัยภูมิ',
      copyLocation: 'กล้องมุมกว้างลานกิจกรรม สวนสาธารณะ',
      timeRange: '19:00 น. ถึง 21:30 น.',
      cameraStatus: 'ปกติ',
      purpose: 'ตรวจสอบข้อเท็จจริงและใช้เป็นหลักฐานรายงานต่อผู้บริหารเทศบาลและเจ้าหน้าที่ตำรวจ'
    }
  }
];

interface QuickHelpTourProps {
  category: RequestCategory;
  currentStep: 1 | 2 | 3;
  onSetFormStep: (step: 1 | 2 | 3) => void;
  onApplyTemplate: (template: IncidentTemplate) => void;
  onApplyFieldValue?: (fieldKey: string, value: any) => void;
}

export const FormQuickHelpTour: React.FC<QuickHelpTourProps> = ({
  category,
  currentStep,
  onSetFormStep,
  onApplyTemplate,
  onApplyFieldValue
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tour' | 'templates' | 'tips'>('tour');
  const [currentTourIndex, setCurrentTourIndex] = useState(0);
  const [isSpotlightActive, setIsSpotlightActive] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Tour steps definition tailored to municipal CCTV & online forms
  const tourSteps: TourStep[] = [
    {
      targetId: 'step-applicant-section',
      formStepRequired: 1,
      titleTh: '1. ข้อมูลผู้ยื่น & ติดต่อกลับ (Applicant Info)',
      badge: 'ขั้นตอนที่ 1',
      descriptionTh: 'ระบุชื่อ-นามสกุล เบอร์โทรศัพท์ และสังกัดให้ถูกต้อง เพื่อให้เจ้าหน้าที่สามารถติดต่อกลับและยืนยันตัวตนได้รวดเร็ว',
      tips: [
        'คลิกปุ่ม "ดึงข้อมูลจากโปรไฟล์ของฉัน" เพื่อกรอกข้อมูลอัตโนมัติใน 1 วินาที',
        'ระบุเบอร์โทรศัพท์ที่ติดต่อได้จริง เจ้าหน้าที่จะโทรแจ้งเมื่อไฟล์ภาพพร้อมรับ',
        'กรอกอีเมลเพื่อรับรหัสติดตามและแจ้งเตือนสถานะทันทีเมื่อมีความคืบหน้า'
      ],
      goodExample: 'นายสมชาย ใจดี | โทร: 081-234-5678 | สังกัด: ประชาชนผู้เสียหาย ต.ในเมือง',
      badExample: 'ไม่ระบุเบอร์โทรศัพท์ หรือระบุสังกัดไม่ชัดเจน'
    },
    {
      targetId: 'step-cctv-location-section',
      formStepRequired: 2,
      titleTh: '2. การระบุตำแหน่งกล้อง & จุดติดตั้ง (Camera Location)',
      badge: 'สำคัญมาก ⭐⭐⭐',
      descriptionTh: 'เจ้าหน้าที่จะค้นหากล้องได้เร็วที่สุดเมื่อระบุ "ชื่อแยก/ถนน + จุดสังเกตเด่น + ทิศทางมุ่งหน้า"',
      tips: [
        'ใช้เมนูดรอปดาวน์ "เลือกจากจุดติดตั้งกล้อง CCTV เทศบาล" เพื่อเลือกกล้องที่ระบบมีอยู่แล้ว',
        'ระบุจุดสังเกต เช่น "หน้าร้านทอง...", "ฝั่งตรงข้ามธนาคาร...", "เสาไฟต้นที่ 2"',
        'ระบุทิศทางการมองเห็น เช่น "มุมกล้องส่องมุ่งหน้าไปทางวงเวียนหอนาฬิกา"'
      ],
      goodExample: 'สี่แยกหอนาฬิกาเมืองชัยภูมิ หน้าธนาคารกรุงไทย ฝั่งมุ่งหน้าไปถนนบรรณาการ (กล้องรหัส CCTV-CYP-014)',
      badExample: 'แถวตลาด, กล้องในเมือง (กว้างเกินไป เจ้าหน้าที่ไม่สามารถระบุตำแหน่งกล้องได้)',
      actionSnippet: {
        fieldKey: 'cctvLocation',
        sampleValue: 'สี่แยกหอนาฬิกาเมืองชัยภูมิ ฝั่งมุ่งหน้าถนนหฤทัย',
        label: 'ใส่ตัวอย่างพิกัดกล้องหอนาฬิกา'
      }
    },
    {
      targetId: 'step-incident-time-section',
      formStepRequired: 2,
      titleTh: '3. การระบุวันและช่วงเวลาเกิดเหตุ (Incident Time Window)',
      badge: 'เทคนิคค้นหาเร็ว ⏱️',
      descriptionTh: 'ระบุช่วงเวลาให้แคบที่สุด โดยเผื่อเวลาก่อน-หลังเหตุการณ์ประมาณ 15-30 นาที',
      tips: [
        'ระบบกล้องวงจรปิดบันทึกต่อเนื่อง หากระบุช่วงเวลาแคบ เจ้าหน้าที่จะเปิดดูและตัดคลิปได้ทันที',
        'ไม่ควรระบุทั้งวัน (เช่น 08:00 - 18:00 น.) เพราะจะใช้เวลาเปิดค้นหานานหลายชั่วโมง',
        'หากไม่แน่ใจเวลาแน่นอน ให้ระบุช่วงเวลาประมาณการ เช่น "ช่วงเวลา 10:15 น. ถึง 10:45 น."'
      ],
      goodExample: 'วันที่ 24/08/2569 เวลา 14:15 น. ถึง 14:45 น. (เกิดเหตุประมาณ 14:25 น.)',
      badExample: 'ช่วงเช้าถึงค่ำ, วันเสาร์ที่แล้ว',
      actionSnippet: {
        fieldKey: 'timeRange',
        sampleValue: '08:30 น. ถึง 09:15 น.',
        label: 'ใส่ตัวอย่างช่วงเวลา (45 นาที)'
      }
    },
    {
      targetId: 'step-reason-section',
      formStepRequired: 2,
      titleTh: '4. อธิบายเหตุการณ์ & ใช้ AI ขัดเกลาภาษา (Incident Details & AI)',
      badge: 'AI Powered ✨',
      descriptionTh: 'อธิบายว่าเกิดอะไรขึ้น (ใคร ทำอะไร รถทะเบียนอะไร สีอะไร มุ่งหน้าไปทางไหน) เพื่อให้เจ้าหน้าที่ค้นหาเป้าหมายได้ตรงจุด',
      tips: [
        'ระบุรายละเอียดพาหนะ: ยี่ห้อ, รุ่น, สี, เลขทะเบียน, จุดเด่นของบุคคล/รถ',
        'คลิกปุ่ม "✨ ให้ AI ขัดเกลาข้อความให้เป็นทางการ" เพื่อปรับสำนวนภาษาให้ถูกต้องตามระเบียบราชการ',
        'ระบบจะติดแท็กวิเคราะห์หัวข้อด้วย Gemini AI ให้อัตโนมัติเพื่อส่งต่องานเร็วขึ้น'
      ],
      goodExample: 'ขอภาพรถกระบะ Isuzu สีบรอนซ์เงิน ทะเบียน 1กข-xxxx เฉี่ยวชนรถจักรยานยนต์แล้วเลี้ยวซ้ายเข้าซอยสุขสวัสดิ์',
      badExample: 'รถชนกันขอดูกล้องหน่อย',
      actionSnippet: {
        fieldKey: 'reason',
        sampleValue: 'มีความประสงค์ขอดูภาพจากกล้องวงจรปิดเพื่อตรวจสอบเหตุการณ์รถเฉี่ยวชนและนำไปเป็นหลักฐานประกอบคดีที่ สภ.เมืองชัยภูมิ',
        label: 'ใส่ตัวอย่างเหตุผลเป็นทางการ'
      }
    },
    {
      targetId: 'step-evidence-camera-section',
      formStepRequired: 2,
      titleTh: '5. ถ่ายภาพจุดเกิดเหตุ / แนบหลักฐาน (Evidence & Photo Capture)',
      badge: 'กล้องสด & แผนที่ 📸',
      descriptionTh: 'สามารถถ่ายภาพจุดเกิดเหตุ กล้องที่ชำรุด หรือปักหมุดบนแผนที่ GPS เพื่อให้เจ้าหน้าที่ตรวจสอบพื้นที่จริงได้อย่างแม่นยำ',
      tips: [
        'ใช้ปุ่ม "ถ่ายภาพจุดเกิดเหตุ" หรือ "กล้องมือถือด่วน" เพื่อถ่ายภาพสถานที่จริงแนบได้ทันที',
        'หากทราบตำแหน่งที่แน่นอน ให้คลิกปักหมุดบน "แผนที่ระบุพิกัด"',
        'ในขั้นตอนที่ 3 อย่าลืมแนบสำเนาบัตรประชาชน หรือใบบันทึกประจำวัน (ถ้ามี) เพื่อการอนุมัติที่รวดเร็ว'
      ],
      goodExample: 'แนบภาพถ่ายมุมกว้างของทางแยก + ภาพรอยเฉี่ยวชน + ใบบันทึกประจำวันตำรวจ',
      badExample: 'ไม่มีหลักฐานยืนยันตัวตนหรือไม่ระบุพิกัด'
    }
  ];

  const activeTourStep = tourSteps[currentTourIndex];

  // Auto-switch form step if the tour step requires a different step
  useEffect(() => {
    if (isSpotlightActive && activeTourStep) {
      if (currentStep !== activeTourStep.formStepRequired) {
        onSetFormStep(activeTourStep.formStepRequired);
      }

      // Smooth scroll target element into view
      setTimeout(() => {
        const el = document.getElementById(activeTourStep.targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
    }
  }, [currentTourIndex, isSpotlightActive]);

  const handleNextTour = () => {
    if (currentTourIndex < tourSteps.length - 1) {
      setCurrentTourIndex(prev => prev + 1);
    } else {
      setIsSpotlightActive(false);
      setIsOpen(false);
    }
  };

  const handlePrevTour = () => {
    if (currentTourIndex > 0) {
      setCurrentTourIndex(prev => prev - 1);
    }
  };

  const handleStartTour = () => {
    setCurrentTourIndex(0);
    setIsSpotlightActive(true);
    setIsOpen(false);
  };

  const handleSelectTemplate = (template: IncidentTemplate) => {
    onApplyTemplate(template);
    setCopiedTemplateId(template.id);
    setTimeout(() => setCopiedTemplateId(null), 2500);
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. Header Help Launcher Button (Placed inside form headers) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('tour');
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer group"
          title="เปิดคู่มือแนะนำการกรอกคำร้องและระบุตำแหน่งกล้องให้ถูกต้อง"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-100 group-hover:scale-110 transition-transform animate-pulse" />
          <span>💡 คำแนะนำช่วยกรอก (Quick Help)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('templates');
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
          title="เลือกเทมเพลตเหตุการณ์สำเร็จรูป เช่น อุบัติเหตุจราจร, ของหาย, แจ้งซ่อมกล้อง"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>เทมเพลตเหตุการณ์</span>
        </button>
      </div>

      {/* 2. Floating Spotlight Tour Overlay (when Tour mode is running) */}
      {isSpotlightActive && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto flex flex-col justify-end sm:justify-center items-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Spotlight Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-300/40 text-amber-300 flex items-center justify-center font-bold text-sm">
                  💡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {activeTourStep.badge}
                    </span>
                    <span className="text-xs text-blue-200 font-medium">
                      ขั้นตอนที่ {currentTourIndex + 1} จาก {tourSteps.length}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug mt-0.5">
                    {activeTourStep.titleTh}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSpotlightActive(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="ปิดทัวร์แนะนำ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotlight Content */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {activeTourStep.descriptionTh}
              </p>

              {/* Actionable Tips */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>ข้อแนะนำเพื่อการตรวจสอบที่รวดเร็ว:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {activeTourStep.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Good vs Bad Examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ตัวอย่างที่แนะนำ (ดีมาก):</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed italic">
                    "{activeTourStep.goodExample}"
                  </p>
                </div>

                {activeTourStep.badExample && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-1 text-rose-800 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>ตัวอย่างที่ควรหลีกเลี่ยง:</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed italic">
                      "{activeTourStep.badExample}"
                    </p>
                  </div>
                )}
              </div>

              {/* Interactive Quick Apply Sample */}
              {activeTourStep.actionSnippet && onApplyFieldValue && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ลองใส่ข้อความตัวอย่างนี้ลงในฟอร์มทันที:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTourStep.actionSnippet) {
                        onApplyFieldValue(
                          activeTourStep.actionSnippet.fieldKey,
                          activeTourStep.actionSnippet.sampleValue
                        );
                      }
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{activeTourStep.actionSnippet.label}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Spotlight Footer Stepper Controls */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentTourIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentTourIndex
                        ? 'w-6 bg-blue-600'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`ไปยังขั้นตอนที่ ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevTour}
                  disabled={currentTourIndex === 0}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextTour}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors flex items-center gap-1"
                >
                  <span>{currentTourIndex === tourSteps.length - 1 ? 'เข้าใจแล้ว / เสร็จสิ้น' : 'ขั้นตอนถัดไป'}</span>
                  {currentTourIndex < tourSteps.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Quick Help Modal & Preset Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shadow-inner font-bold text-xl">
                  💡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-md uppercase">
                      Quick Help Center
                    </span>
                    <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      คู่มือยื่นคำร้อง CCTV เทศบาล
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-tight mt-0.5">
                    ศูนย์ช่วยเหลือและเทคนิคการกรอกคำร้อง
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tour')}
                className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'tour'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>ทัวร์แนะนำ 5 ขั้นตอน</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'templates'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>เทมเพลตเหตุการณ์ด่วน</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-bold">
                  4 รูปแบบ
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tips')}
                className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'tips'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>กฎเหล็กการระบุตำแหน่งกล้อง</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: Guided Tour Overview */}
              {activeTab === 'tour' && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-lg">
                      <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                        <span>🌟 เริ่มต้นทัวร์สำรวจทีละขั้นตอน (Interactive Tour)</span>
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        ระบบจะไฮไลต์ช่องกรอกข้อมูลสำคัญบนหน้าจอ พร้อมยกตัวอย่างและเคล็ดลับเพื่อไม่ให้เกิดข้อผิดพลาดในการยื่นคำร้อง
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartTour}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-300" />
                      <span>เริ่มทัวร์แนะนำทันที</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      สรุป 5 ขั้นตอนหลักในการกรอกคำร้อง CCTV
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tourSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-3.5 space-y-2 shadow-xs transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                              {step.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ขั้นตอนฟอร์ม #{step.formStepRequired}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 leading-tight">
                            {step.titleTh}
                          </h5>
                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                            {step.descriptionTh}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Ready-to-Use Incident Templates */}
              {activeTab === 'templates' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-950">
                    <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-indigo-900">เลือกเทมเพลตเหตุการณ์เพื่อกรอกข้อมูลอัตโนมัติ</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        คลิกปุ่ม <span className="font-semibold text-indigo-800">"นำไปใส่ในฟอร์ม"</span> เพื่อโหลดหัวข้อคำร้อง, เหตุผลความจำเป็น, และฟิลด์เฉพาะทางลงในแบบฟอร์มของคุณทันที แล้วแก้ไขเฉพาะรายละเอียดตัวบุคคลหรือทะเบียนรถ
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {INCIDENT_TEMPLATES.map((tmpl) => {
                      const isJustCopied = copiedTemplateId === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{tmpl.icon}</span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {tmpl.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 leading-tight">
                              {tmpl.title}
                            </h4>
                            <p className="text-xs text-slate-500 leading-snug">
                              {tmpl.subtitle}
                            </p>

                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-left">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">ตัวอย่างข้อความ:</span>
                              <p className="text-[11px] text-slate-700 italic line-clamp-3 leading-relaxed">
                                "{tmpl.reason}"
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectTemplate(tmpl)}
                            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isJustCopied
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                            }`}
                          >
                            {isJustCopied ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>ใส่ข้อมูลลงในฟอร์มสำเร็จแล้ว!</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>นำเทมเพลตนี้ไปใส่ในฟอร์ม</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Golden Rules & Accurate Location Guidelines */}
              {activeTab === 'tips' && (
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/60 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>3 กฎเหล็กในการระบุจุดกล้อง & เวลาเกิดเหตุให้ได้ภาพแน่นอน</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      กล้องวงจรปิดของเทศบาลเมืองชัยภูมิมีหลายร้อยจุดทั่วทั้งเขตเทศบาล การระบุข้อมูลชัดเจนจะช่วยให้เจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศค้นหาไฟล์วิดีโอได้อย่างรวดเร็วและไม่พลาดช่วงเวลาสำคัญ
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        📍 1
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">ระบุจุดสังเกต 3 ชั้น</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        1. ชื่อถนน/สี่แยกหลัก <br />
                        2. อาคารหรือร้านค้าใกล้เคียง <br />
                        3. ทิศทางการมุ่งหน้า (เช่น มุ่งหน้าไปสี่แยกโรงเรียน...)
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        ⏱️ 2
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">ช่วงเวลาบวก-ลบ 30 นาที</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        หลีกเลี่ยงการระบุเวลากว้างทั้งวัน ให้ระบุกรอบเวลาที่มั่นใจ เช่น เกิดเหตุเวลา 09:10 น. ให้ระบุช่วงเวลา 08:50 น. ถึง 09:30 น.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                        📄 3
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs">เอกสารทางคดี (ถ้ามี)</h4>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        กรณีอุบัติเหตุหรือของหาย การแนบใบบันทึกประจำวันจากสถานีตำรวจภูธรจะช่วยให้เจ้าหน้าที่อนุมัติและปล่อยไฟล์วิดีโอความละเอียดสูงได้เร็วขึ้น
                      </p>
                    </div>
                  </div>

                  {/* FAQ Accordion / Quick Summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>คำถามที่พบบ่อย (CCTV Quick FAQ):</span>
                    </h4>
                    
                    <div className="space-y-2 text-[11px] text-slate-600">
                      <div className="border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800">Q: ข้อมูลภาพย้อนหลังบันทึกได้กี่วัน?</span>
                        <p className="mt-0.5">A: ระบบกล้อง CCTV เทศบาลจัดเก็บบันทึกภาพย้อนหลังเฉลี่ย 15 - 30 วัน แนะนำให้ยื่นคำร้องทันทีหลังเกิดเหตุ</p>
                      </div>
                      <div className="border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800">Q: หากไม่ทราบรหัสกล้องวงจรปิด ต้องทำอย่างไร?</span>
                        <p className="mt-0.5">A: ให้ใช้ระบบปักหมุดบนแผนที่ GPS หรือเลือกชื่อแยกจากดรอปดาวน์ เจ้าหน้าที่จะตรวจสอบหมายเลขกล้องที่ครอบคลุมให้เอง</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Q: หลังจากยื่นคำร้องแล้ว จะได้รับไฟล์อย่างไร?</span>
                        <p className="mt-0.5">A: เจ้าหน้าที่จะติดต่อกลับตามเบอร์โทรศัพท์ที่ระบุ เพื่อให้นำ Flash Drive มารับไฟล์ที่เทศบาล หรือดาวน์โหลดผ่านลิงก์ปลอดภัยในระบบ</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                ต้องการความช่วยเหลือเพิ่มเติม โทร: 044-811654 ต่อ ศูนย์ CCTV
              </span>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --------------------------------------------------------------------------------------
// Reusable Inline Field Helper Tooltip with Popover & Quick Template Insertion
// --------------------------------------------------------------------------------------
interface FieldQuickTooltipProps {
  label?: string;
  fieldId?: string;
  guideTitle: string;
  guideDescription: string;
  goodExample: string;
  badExample?: string;
  sampleTemplateValue?: string;
  onApplySample?: (val: string) => void;
}

export const FieldQuickTooltip: React.FC<FieldQuickTooltipProps> = ({
  label,
  guideTitle,
  guideDescription,
  goodExample,
  badExample,
  sampleTemplateValue,
  onApplySample
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 font-semibold px-2 py-0.5 rounded-md border border-blue-200 transition-all cursor-pointer group"
        title="คลิกเพื่อดูคำแนะนำและตัวอย่างการกรอกช่องนี้"
      >
        <Lightbulb className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">วิธีระบุข้อมูล</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 text-xs space-y-2 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>{guideTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {guideDescription}
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>ตัวอย่างที่ดี:</span>
              </span>
              <p className="text-[11px] text-slate-700 italic">
                "{goodExample}"
              </p>
            </div>

            {badExample && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-1">
                <span className="text-[10px] font-bold text-rose-800 flex items-center gap-1">
                  <X className="w-3 h-3 text-rose-600" />
                  <span>ตัวอย่างที่ไม่แนะนำ:</span>
                </span>
                <p className="text-[11px] text-rose-700 italic">
                  "{badExample}"
                </p>
              </div>
            )}

            {sampleTemplateValue && onApplySample && (
              <button
                type="button"
                onClick={() => {
                  onApplySample(sampleTemplateValue);
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>ใช้ข้อความตัวอย่างนี้ทันที</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
