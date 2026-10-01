import { ApprovalStep, ApprovalWorkflow } from '../types/request';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  steps: Omit<ApprovalStep, 'id' | 'status' | 'actionDate' | 'comment' | 'signatureUrl'>[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf-chaiyaphum-cctv-4',
    name: 'เส้นทางการอนุมัติขอดู/ขอสำเนา CCTV เทศบาลเมืองชัยภูมิ (4 ขั้นตอน)',
    description: 'กระบวนการพิจารณาอนุญาตตามระเบียบเทศบาลเมืองชัยภูมิ (เจ้าพนักงานเทศกิจ -> หัวหน้าฝ่ายปกครอง -> หัวหน้าสำนักปลัดเทศบาล -> ปลัดเทศบาล -> นายกเทศมนตรีเมืองชัยภูมิ)',
    stepCount: 4,
    steps: [
      { stepNumber: 1, roleTitle: '1. เสนอ หัวหน้าฝ่ายปกครอง (เห็นควรอนุญาต/ไม่อนุญาต)', approverName: 'นายสรพงษ์ เทศกิจดี', approverPosition: 'เจ้าพนักงานเทศกิจชำนาญงาน' },
      { stepNumber: 2, roleTitle: '2. เสนอ หัวหน้าสำนักปลัดเทศบาล (เห็นควรอนุญาต/ไม่อนุญาต)', approverName: 'นายเกรียงศักดิ์ ปกครองไทย', approverPosition: 'หัวหน้าฝ่ายปกครอง' },
      { stepNumber: 3, roleTitle: '3. เสนอ ปลัดเทศบาลเมืองชัยภูมิ (เห็นควรอนุญาต/ไม่อนุญาต)', approverName: 'นางสาวจินตนา มั่นคง', approverPosition: 'หัวหน้าสำนักปลัดเทศบาล' },
      { stepNumber: 4, roleTitle: '4. เสนอ นายกเทศมนตรีเมืองชัยภูมิ (อนุมัติขั้นสูงสุด)', approverName: 'นายบรรยงค์ เกียรติก้องชูชัย', approverPosition: 'นายกเทศมนตรีเมืองชัยภูมิ' }
    ]
  },
  {
    id: 'wf-standard-5',
    name: 'เส้นทางการอนุมัติทั่วไป (5 ขั้นตอน)',
    description: 'เหมาะสำหรับคำร้องทั่วไป เช่น ขอหนังสือรับรอง ยื่นใบลากิจ/ลาป่วย',
    stepCount: 5,
    steps: [
      { stepNumber: 1, roleTitle: 'เจ้าหน้าที่งานสารบรรณรับเรื่อง', approverName: 'นางสาวจิราพร ใจดี', approverPosition: 'นักจัดการงานทั่วไปชำนาญการ' },
      { stepNumber: 2, roleTitle: 'หัวหน้างานสารบรรณ/การเจ้าหน้าที่', approverName: 'นายสมศักดิ์ สุขใจ', approverPosition: 'หัวหน้างานบริหารทรัพยากรบุคคล' },
      { stepNumber: 3, roleTitle: 'หัวหน้าฝ่ายบริหารงานทั่วไป', approverName: 'นางสาววิภาวรรณ ศรีสุข', approverPosition: 'หัวหน้าฝ่ายบริหารงานทั่วไป' },
      { stepNumber: 4, roleTitle: 'รองผู้อำนวยการ/รองคณบดี', approverName: 'ดร.กิตติพงษ์ วงศ์สว่าง', approverPosition: 'รองผู้อำนวยการฝ่ายบริหาร' },
      { stepNumber: 5, roleTitle: 'ผู้อำนวยการ/คณบดีอนุมัติปิดเรื่อง', approverName: 'รศ.ดร.ปราโมทย์ พัฒนกิจ', approverPosition: 'ผู้อำนวยการสำนักบริหาร' }
    ]
  },
  {
    id: 'wf-enterprise-10',
    name: 'เส้นทางการอนุมัติระดับองค์กร (10 ขั้นตอน)',
    description: 'ขั้นตอนการอนุมัติระดับบริหารและโครงการพิเศษแบบเต็มรูปแบบ (10 ขั้นตอนอนุมัติ)',
    stepCount: 10,
    steps: [
      { stepNumber: 1, roleTitle: 'เจ้าหน้าที่งานสารบรรณรับเรื่องและลงทะเบียน', approverName: 'นางสาวจิราพร ใจดี', approverPosition: 'เจ้าหน้าที่งานสารบรรณปฏิบัติการ' },
      { stepNumber: 2, roleTitle: 'หัวหน้างานตรวจสอบความถูกต้องเอกสาร', approverName: 'นายสมศักดิ์ สุขใจ', approverPosition: 'หัวหน้างานสารบรรณดิจิทัล' },
      { stepNumber: 3, roleTitle: 'เจ้าหน้าที่งบประมาณและพัสดุตรวจสอบวงเงิน', approverName: 'นางสาวนภา รัตนไพศาล', approverPosition: 'นักวิชาการพัสดุชำนาญการ' },
      { stepNumber: 4, roleTitle: 'หัวหน้าฝ่ายการเงินและบัญชี', approverName: 'นายพิชัย บัญชีมั่นคง', approverPosition: 'หัวหน้าฝ่ายการเงินและคลัง' },
      { stepNumber: 5, roleTitle: 'ผู้เชี่ยวชาญ/นิติกรตรวจสอบข้อกฎหมาย', approverName: 'นายธนกร กฎหมายไทย', approverPosition: 'นิติกรชำนาญการพิเศษ' },
      { stepNumber: 6, roleTitle: 'หัวหน้าฝ่ายประกันคุณภาพและมาตรฐาน', approverName: 'ดร.ศิริพร มาตรฐานดี', approverPosition: 'หัวหน้างานประกันคุณภาพ' },
      { stepNumber: 7, roleTitle: 'รองผู้อำนวยการ/รองคณบดีฝ่ายบริหาร', approverName: 'ดร.กิตติพงษ์ วงศ์สว่าง', approverPosition: 'รองผู้อำนวยการฝ่ายบริหาร' },
      { stepNumber: 8, roleTitle: 'ผู้ตรวจสอบภายในองค์กร (Internal Auditor)', approverName: 'นายวินัย ตรวจสอบ', approverPosition: 'หัวหน้าหน่วยตรวจสอบภายใน' },
      { stepNumber: 9, roleTitle: 'รองอธิการบดี/ผู้ช่วยอธิการบดีกำกับดูแล', approverName: 'ผศ.ดร.ธีรพงษ์ นวัตกรรม', approverPosition: 'รองอธิการบดีฝ่ายดิจิทัลและเทคโนโลยี' },
      { stepNumber: 10, roleTitle: 'อธิการบดี/ผู้อนุมัติขั้นสูงสุด (Executive Signer)', approverName: 'ศ.ดร.สมเกียรติ ยิ่งใหญ่', approverPosition: 'อธิการบดี/ผู้อำนวยการใหญ่' }
    ]
  },
  {
    id: 'wf-full-chain-12',
    name: 'เส้นทางการอนุมัติโครงการใหญ่และงบประมาณ (12 ขั้นตอน)',
    description: 'กระบวนการอนุมัติระดับกระทรวง/สถาบัน ครอบคลุม 12 ลำดับขั้นการอนุมัติ',
    stepCount: 12,
    steps: [
      { stepNumber: 1, roleTitle: 'เจ้าหน้าที่งานสารบรรณส่วนกลางรับเรื่อง', approverName: 'นางสาวจิราพร ใจดี', approverPosition: 'เจ้าหน้าที่สารบรรณ' },
      { stepNumber: 2, roleTitle: 'หัวหน้ากลุ่มงานธุรการและสารบรรณ', approverName: 'นายสมศักดิ์ สุขใจ', approverPosition: 'หัวหน้างานธุรการ' },
      { stepNumber: 3, roleTitle: 'เจ้าหน้าที่วิเคราะห์นโยบายและแผน', approverName: 'นายปรีชา ยุทธศาสตร์', approverPosition: 'นักวิเคราะห์นโยบายและแผน' },
      { stepNumber: 4, roleTitle: 'หัวหน้างานแผนและงบประมาณ', approverName: 'นางสาวสุชาดา งบประมาณ', approverPosition: 'หัวหน้างานแผนงาน' },
      { stepNumber: 5, roleTitle: 'เจ้าหน้าที่พัสดุและจัดซื้อจัดจ้าง', approverName: 'นางสาวนภา รัตนไพศาล', approverPosition: 'นักวิชาการพัสดุ' },
      { stepNumber: 6, roleTitle: 'หัวหน้าฝ่ายการเงินและคลัง', approverName: 'นายพิชัย บัญชีมั่นคง', approverPosition: 'หัวหน้าฝ่ายการเงิน' },
      { stepNumber: 7, roleTitle: 'นิติกรตรวจสอบร่างสัญญาและข้อตกลง', approverName: 'นายธนกร กฎหมายไทย', approverPosition: 'นิติกรชำนาญการ' },
      { stepNumber: 8, roleTitle: 'คณะกรรมการกลั่นกรองโครงการ', approverName: 'ดร.ศิริพร มาตรฐานดี', approverPosition: 'ประธานกรรมการกลั่นกรอง' },
      { stepNumber: 9, roleTitle: 'ผู้ตรวจสอบภายในองค์กร', approverName: 'นายวินัย ตรวจสอบ', approverPosition: 'หัวหน้าหน่วยตรวจสอบภายใน' },
      { stepNumber: 10, roleTitle: 'รองอธิการบดีฝ่ายบริหารและกายภาพ', approverName: 'ดร.กิตติพงษ์ วงศ์สว่าง', approverPosition: 'รองอธิการบดีฝ่ายบริหาร' },
      { stepNumber: 11, roleTitle: 'รองอธิการบดีฝ่ายวิจัยและนวัตกรรม', approverName: 'ผศ.ดร.ธีรพงษ์ นวัตกรรม', approverPosition: 'รองอธิการบดีฝ่ายวิจัย' },
      { stepNumber: 12, roleTitle: 'อธิการบดี/ผู้อนุมัติขั้นสูงสุด', approverName: 'ศ.ดร.สมเกียรติ ยิ่งใหญ่', approverPosition: 'อธิการบดี' }
    ]
  }
];

export function createDefaultWorkflowFromTemplate(templateId: string): ApprovalWorkflow {
  const tpl = WORKFLOW_TEMPLATES.find(t => t.id === templateId) || WORKFLOW_TEMPLATES[1]; // default 10 steps
  return {
    templateId: tpl.id,
    templateName: tpl.name,
    currentStepIndex: 0,
    steps: tpl.steps.map((s, idx) => ({
      id: `step-${s.stepNumber}-${Date.now()}-${idx}`,
      stepNumber: s.stepNumber,
      roleTitle: s.roleTitle,
      approverName: s.approverName,
      approverPosition: s.approverPosition,
      approverEmail: s.approverEmail || `approver${s.stepNumber}@chaiyaphum.go.th`,
      approverLineId: s.approverLineId || `@approver_${s.stepNumber}`,
      approvalAction: s.approvalAction || (idx === tpl.steps.length - 1 ? 'อนุมัติขั้นสูงสุดและลงนามปิดเรื่อง' : 'พิจารณาอนุมัติและเสนอขั้นถัดไป'),
      status: idx === 0 ? 'in_progress' : 'pending'
    }))
  };
}
