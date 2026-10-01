import { DocumentCategoryType, DocumentCategoryDef } from '../types/request';

export const DOCUMENT_CATEGORIES: DocumentCategoryDef[] = [
  {
    id: 'id_card',
    labelTh: 'สำเนาบัตรประชาชน / บัตรยืนยันตัวตน',
    labelEn: 'ID Card / Identity Proof',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    iconName: 'UserCheck',
    description: 'สำเนาบัตรประชาชน, บัตรข้าราชการ, บัตรพนักงาน/นิสิต หรือหนังสือเดินทาง'
  },
  {
    id: 'police_report',
    labelTh: 'บันทึกประจำวัน / ใบแจ้งความ',
    labelEn: 'Police Report / Daily Log',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    iconName: 'ShieldAlert',
    description: 'บันทึกประจำวันจากสถานีตำรวจ ใบแจ้งความร้องทุกข์ หรือเอกสารทางคดี'
  },
  {
    id: 'evidence_photo',
    labelTh: 'ภาพถ่ายหลักฐาน / ภาพ CCTV / วิดีโอ',
    labelEn: 'Evidence Photo & Footage',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    iconName: 'Image',
    description: 'รูปถ่ายจุดเกิดเหตุ, ภาพถ่ายกล้องวงจรปิด, แผนที่ หรือไฟล์มัลติมีเดีย'
  },
  {
    id: 'application_form',
    labelTh: 'แบบคำร้อง / หนังสือขอความอนุเคราะห์',
    labelEn: 'Application Form / Request Letter',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    iconName: 'FileText',
    description: 'แบบฟอร์มคำร้องลงลายมือชื่อ หนังสือขอความอนุเคราะห์ หรือแบบอนุมัติ'
  },
  {
    id: 'official_letter',
    labelTh: 'หนังสือราชการ / คำสั่ง / ใบอนุญาต',
    labelEn: 'Official Command / License',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    iconName: 'Building',
    description: 'หนังสือสั่งการราชการ, ประกาศ, ใบอนุญาตปฏิบัติงาน หรือหนังสือแต่งตั้ง'
  },
  {
    id: 'financial_doc',
    labelTh: 'ใบเสนอราคา / ใบเสร็จ / เอกสารการเงิน',
    labelEn: 'Financial Invoice / Receipt',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    iconName: 'Receipt',
    description: 'ใบเสร็จรับเงิน, ใบเสนอราคา, ใบกำกับภาษี หรือตารางคำนวณงบประมาณ'
  },
  {
    id: 'medical_cert',
    labelTh: 'ใบรับรองแพทย์ / เอกสารการรักษา',
    labelEn: 'Medical Certificate',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-200',
    iconName: 'Activity',
    description: 'ใบรับรองแพทย์, เอกสารการเข้ารับบริการสถานพยาบาล หรือใบรับรองสุขภาพ'
  },
  {
    id: 'other',
    labelTh: 'เอกสารแนบอื่นๆ',
    labelEn: 'Other Document',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    iconName: 'File',
    description: 'เอกสารประกอบทั่วไปที่ไม่ได้อยู่ในหมวดหมู่ข้างต้น'
  }
];

export const getDocumentCategoryDef = (catId?: DocumentCategoryType): DocumentCategoryDef => {
  if (!catId) return DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1]; // Default to 'other'
  return DOCUMENT_CATEGORIES.find((c) => c.id === catId) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
};
