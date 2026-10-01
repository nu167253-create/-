import { RequestItem } from '../types/request';

export const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'REQ-CCTV-2569-001',
    category: 'cctv',
    title: 'ขอดูและขอสำเนาข้อมูลภาพกล้องวงจรปิด CCTV บริเวณสี่แยกหอนาฬิกา เทศบาลเมืองชัยภูมิ',
    applicant: {
      prefix: 'ร.ต.อ.',
      fullName: 'วิเชียร ชัยภูมิเดช',
      citizenIdOrCode: '3360100234567',
      email: 'wichien.p@chaiyaphum.police.go.th',
      phone: '081-998-8776',
      department: 'สถานีตำรวจภูธรเมืองชัยภูมิ',
      positionOrMajor: 'รองสารวัตรสอบสวน'
    },
    details: {
      position: 'รองสารวัตรสอบสวน',
      division: 'กลุ่มงานสอบสวน',
      agency: 'สถานีตำรวจภูธรเมืองชัยภูมิ',
      cctvLocation: 'สี่แยกหอนาฬิกาเมืองชัยภูมิ ถนนนนทการ',
      footageDate: '2026-08-01',
      timeRange: '08:30 น. ถึง 10:15 น.',
      cameraStatus: 'ปกติ',
      copyLocation: 'กล้องจุดที่ CAM-CYP-002 (สี่แยกหอนาฬิกา มุมมองฝั่งทิศตะวันออก)',
      purpose: 'เพื่อใช้เป็นพยานหลักฐานประกอบคดีจราจร กรณีเหตุเฉี่ยวชนบริเวณสี่แยกหอนาฬิกา และติดตามผู้กระทำความผิดตามกฎหมาย',
      hasOfficialLetter: true,
      hasOfficerCard: true,
      pdpaAccepted: true
    },
    reason: 'เนื่องจากเมื่อวันที่ 1 สิงหาคม 2569 เวลาประมาณ 09:15 น. เกิดเหตุรถยนต์เฉี่ยวชนรถจักรยานยนต์แล้วหลบหนี บริเวณสี่แยกหอนาฬิกาเมืองชัยภูมิ จึงมีความจำเป็นต้องขอคัดสำเนาภาพวิดีโอจากกล้องวงจรปิดเพื่อนำไปดำเนินคดีตามกฎหมาย',
    priority: 'urgent',
    attachments: [
      {
        id: 'att-cctv-01',
        name: 'หนังสือขอความอนุเคราะห์คัดสำเนาCCTV_สภ_เมืองชัยภูมิ.pdf',
        size: 1572864,
        type: 'application/pdf',
        uploadedAt: '2026-08-01T10:30:00Z',
        documentCategory: 'official_letter',
        description: 'หนังสือตราครุฑจาก สภ.เมืองชัยภูมิ ที่ ตช 0018.21/1420'
      },
      {
        id: 'att-cctv-02',
        name: 'สำเนาบัตรประจำตัวข้าราชการตำรวจ_รตอ_วิเชียร.pdf',
        size: 819200,
        type: 'application/pdf',
        uploadedAt: '2026-08-01T10:32:00Z',
        documentCategory: 'id_card',
        description: 'สำเนาบัตรประจำตัวข้าราชการตำรวจพร้อมลงนามรับรองสำเนาถูกต้อง'
      }
    ],
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 15 35 Q 40 5 70 35 T 120 25 T 160 40" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    status: 'under_review',
    assignedOfficer: 'นายสรพงษ์ เทศกิจดี (เจ้าพนักงานเทศกิจชำนาญงาน)',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: '2026-08-01T10:35:00Z',
        actor: 'ร.ต.อ.วิเชียร ชัยภูมิเดช (ผู้ขอข้อมูล)',
        note: 'ยื่นแบบคำร้องขอดูหรือขอสำเนาข้อมูลภาพจากกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ'
      },
      {
        status: 'under_review',
        timestamp: '2026-08-01T11:00:00Z',
        actor: 'นายสรพงษ์ เทศกิจดี (เจ้าพนักงานเทศกิจชำนาญงาน)',
        note: 'ตรวจสอบกล้องวงจรปิดจุด CAM-CYP-002 พบว่ากล้องทำงานปกติ ภาพชัดเจน เสนอหัวหน้าฝ่ายปกครองพิจารณา'
      }
    ],
    officerNotes: 'ตรวจสอบไฟล์ภาพช่วงเวลา 08:30 - 10:15 น. วันที่ 1 ส.ค. 2569 ภาพบันทึกสมบูรณ์ ได้เตรียมไฟล์ MP4 ขนาด 450MB ลงใน Flash Drive ไว้รองรับการอนุมัติปล่อยไฟล์',
    approvalWorkflow: {
      templateId: 'wf-chaiyaphum-cctv-4',
      templateName: 'เส้นทางการอนุมัติขอดู/ขอสำเนา CCTV เทศบาลเมืองชัยภูมิ (4 ขั้นตอน)',
      currentStepIndex: 1,
      steps: [
        {
          id: 'step-cctv-1',
          stepNumber: 1,
          roleTitle: '1. เสนอ หัวหน้าฝ่ายปกครอง (เห็นควรอนุญาต/ไม่อนุญาต)',
          approverName: 'นายสรพงษ์ เทศกิจดี',
          approverPosition: 'เจ้าพนักงานเทศกิจชำนาญงาน',
          status: 'approved',
          actionDate: '2026-08-01T11:15:00Z',
          comment: 'ตรวจสอบสถานที่ วันเวลา และกล้องแล้ว พบไฟล์ภาพสมบูรณ์ เห็นควรอนุญาต'
        },
        {
          id: 'step-cctv-2',
          stepNumber: 2,
          roleTitle: '2. เสนอ หัวหน้าสำนักปลัดเทศบาล (เห็นควรอนุญาต/ไม่อนุญาต)',
          approverName: 'นายเกรียงศักดิ์ ปกครองไทย',
          approverPosition: 'หัวหน้าฝ่ายปกครอง',
          status: 'in_progress'
        },
        {
          id: 'step-cctv-3',
          stepNumber: 3,
          roleTitle: '3. เสนอ ปลัดเทศบาลเมืองชัยภูมิ (เห็นควรอนุญาต/ไม่อนุญาต)',
          approverName: 'นางสาวจินตนา มั่นคง',
          approverPosition: 'หัวหน้าสำนักปลัดเทศบาล',
          status: 'pending'
        },
        {
          id: 'step-cctv-4',
          stepNumber: 4,
          roleTitle: '4. เสนอ นายกเทศมนตรีเมืองชัยภูมิ (อนุมัติขั้นสูงสุด)',
          approverName: 'นายบรรยงค์ เกียรติก้องชูชัย',
          approverPosition: 'นายกเทศมนตรีเมืองชัยภูมิ',
          status: 'pending'
        }
      ]
    },
    createdAt: '2026-08-01T10:35:00Z',
    updatedAt: '2026-08-01T11:15:00Z',
    expectedDate: '2026-08-02'
  },
  {
    id: 'REQ-20260728-001',
    category: 'certificate',
    title: 'ขอหนังสือรับรองการทำงานและใบแสดงเงินเดือน (ภาษาไทย-อังกฤษ)',
    applicant: {
      prefix: 'นาย',
      fullName: 'สมชาย วิทยาการ',
      citizenIdOrCode: '1100200345671',
      email: 'somchai.v@example.com',
      phone: '081-234-5678',
      department: 'ฝ่ายพัฒนาซอฟต์แวร์',
      positionOrMajor: 'นักวิเคราะห์ระบบชำนาญการ'
    },
    details: {
      certType: 'work_cert',
      language: 'both',
      copies: 2,
      deliveryMethod: 'digital'
    },
    reason: 'นำไปประกอบการยื่นขออนุมัติสินเชื่อที่อยู่อาศัยกับธนาคารและยื่นขอทำวีซ่าท่องเที่ยวต่างประเทศ',
    priority: 'urgent',
    attachments: [
      {
        id: 'att-101',
        name: 'สำเนาบัตรประชาชน_สมชาย.pdf',
        size: 1048576,
        type: 'application/pdf',
        uploadedAt: '2026-07-28T08:30:00Z',
        documentCategory: 'id_card',
        description: 'สำเนาบัตรประชาชนพร้อมลงนามสำเนาถูกต้อง'
      }
    ],
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 10 30 Q 30 10 50 30 T 90 30 T 130 20 T 170 35" stroke="%231e3a8a" stroke-width="2" fill="none"/></svg>',
    status: 'under_review',
    assignedOfficer: 'นางสาวจิราพร ใจดี (เจ้าหน้าที่ฝ่าย HR)',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: '2026-07-28T08:30:00Z',
        actor: 'นายสมชาย วิทยาการ (ผู้ยื่นคำร้อง)',
        note: 'ยื่นคำร้องผ่านระบบออนไลน์เรียบร้อยแล้ว'
      },
      {
        status: 'under_review',
        timestamp: '2026-07-28T09:15:00Z',
        actor: 'นางสาวจิราพร ใจดี (งานสารบรรณ/HR)',
        note: 'รับเรื่องแล้ว อยู่ระหว่างตรวจสอบประวัติการทำงานและออกหนังสือรับรองภาษาอังกฤษ'
      }
    ],
    officerNotes: 'ตรวจสอบข้อมูลในระบบ HR พบว่ามีอายุงาน 4 ปี 2 เดือน ข้อมูลถูกต้องครบถ้วน กำลังจัดทำตราประทับประทับย่อย',
    approvalWorkflow: {
      templateId: 'wf-enterprise-10',
      templateName: 'เส้นทางการอนุมัติระดับองค์กร (10 ขั้นตอน)',
      currentStepIndex: 2,
      steps: [
        { id: 'st-1', stepNumber: 1, roleTitle: '1. เจ้าหน้าที่งานสารบรรณรับเรื่องและลงทะเบียน', approverName: 'นางสาวจิราพร ใจดี', approverPosition: 'เจ้าหน้าที่งานสารบรรณปฏิบัติการ', status: 'approved', actionDate: '2026-07-28T08:45:00Z', comment: 'ตรวจสอบเอกสารครบถ้วนสมบูรณ์ รับเรื่องเข้าสารบรรณรับที่ 2026/0412' },
        { id: 'st-2', stepNumber: 2, roleTitle: '2. หัวหน้างานตรวจสอบความถูกต้องเอกสาร', approverName: 'นายสมศักดิ์ สุขใจ', approverPosition: 'หัวหน้างานสารบรรณดิจิทัล', status: 'approved', actionDate: '2026-07-28T09:15:00Z', comment: 'ตรวจสอบสิทธิ์ประวัติการทำงานเรียบร้อยแล้ว ส่งต่อฝ่ายงบประมาณ' },
        { id: 'st-3', stepNumber: 3, roleTitle: '3. เจ้าหน้าที่งบประมาณและพัสดุตรวจสอบวงเงิน', approverName: 'นางสาวนภา รัตนไพศาล', approverPosition: 'นักวิชาการพัสดุชำนาญการ', status: 'in_progress' },
        { id: 'st-4', stepNumber: 4, roleTitle: '4. หัวหน้าฝ่ายการเงินและบัญชี', approverName: 'นายพิชัย บัญชีมั่นคง', approverPosition: 'หัวหน้าฝ่ายการเงินและคลัง', status: 'pending' },
        { id: 'st-5', stepNumber: 5, roleTitle: '5. ผู้เชี่ยวชาญ/นิติกรตรวจสอบข้อกฎหมาย', approverName: 'นายธนกร กฎหมายไทย', approverPosition: 'นิติกรชำนาญการพิเศษ', status: 'pending' },
        { id: 'st-6', stepNumber: 6, roleTitle: '6. หัวหน้าฝ่ายประกันคุณภาพและมาตรฐาน', approverName: 'ดร.ศิริพร มาตรฐานดี', approverPosition: 'หัวหน้างานประกันคุณภาพ', status: 'pending' },
        { id: 'st-7', stepNumber: 7, roleTitle: '7. รองผู้อำนวยการ/รองคณบดีฝ่ายบริหาร', approverName: 'ดร.กิตติพงษ์ วงศ์สว่าง', approverPosition: 'รองผู้อำนวยการฝ่ายบริหาร', status: 'pending' },
        { id: 'st-8', stepNumber: 8, roleTitle: '8. ผู้ตรวจสอบภายในองค์กร (Internal Auditor)', approverName: 'นายวินัย ตรวจสอบ', approverPosition: 'หัวหน้าหน่วยตรวจสอบภายใน', status: 'pending' },
        { id: 'st-9', stepNumber: 9, roleTitle: '9. รองอธิการบดี/ผู้ช่วยอธิการบดีกำกับดูแล', approverName: 'ผศ.ดร.ธีรพงษ์ นวัตกรรม', approverPosition: 'รองอธิการบดีฝ่ายดิจิทัลและเทคโนโลยี', status: 'pending' },
        { id: 'st-10', stepNumber: 10, roleTitle: '10. อธิการบดี/ผู้อนุมัติขั้นสูงสุด (Executive Signer)', approverName: 'ศ.ดร.สมเกียรติ ยิ่งใหญ่', approverPosition: 'อธิการบดี/ผู้อำนวยการใหญ่', status: 'pending' }
      ]
    },
    createdAt: '2026-07-28T08:30:00Z',
    updatedAt: '2026-07-28T09:15:00Z',
    expectedDate: '2026-07-30'
  },
  {
    id: 'REQ-20260727-004',
    category: 'maintenance',
    title: 'แจ้งซ่อมเครื่องปรับอากาศและเปลี่ยนหลอดไฟห้องประชุม 302',
    applicant: {
      prefix: 'ดร.',
      fullName: 'นพดล สุวรรณภูมิ',
      citizenIdOrCode: '3500900123881',
      email: 'nopadol.s@example.com',
      phone: '089-987-6543',
      department: 'คณะเทคโนโลยีสารสนเทศ',
      positionOrMajor: 'หัวหน้าสาขาวิชาเทคโนโลยีสารสนเทศ'
    },
    details: {
      maintenanceCategory: 'utility',
      location: 'อาคารวิทยบริการ ชั้น 3 ห้องประชุม 302',
      assetCode: 'AC-302-2565',
      impactLevel: 'medium'
    },
    reason: 'เครื่องปรับอากาศมีเสียงดังและมีน้ำหยดลงบนโต๊ะประชุม ส่วนหลอดไฟด้านหน้าห้องกะพริบ ทำให้ไม่สามารถใช้ประชุมวิชาการสัปดาห์หน้าได้',
    priority: 'normal',
    attachments: [
      {
        id: 'att-102',
        name: 'รูปถ่ายแอร์น้ำหยด_ห้อง302.jpg',
        size: 2048000,
        type: 'image/jpeg',
        uploadedAt: '2026-07-27T14:10:00Z',
        documentCategory: 'evidence_photo',
        description: 'รูปถ่ายแสดงจุดน้ำหยดจากเครื่องปรับอากาศ'
      }
    ],
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M 10 40 C 40 10, 60 50, 90 20 S 140 40, 180 25" stroke="%231e3a8a" stroke-width="2" fill="none"/></svg>',
    status: 'approved',
    assignedOfficer: 'นายช่างสมศักดิ์ บริการดี (ฝ่ายอาคารสถานที่)',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: '2026-07-27T14:10:00Z',
        actor: 'ดร.นพดล สุวรรณภูมิ',
        note: 'ส่งคำร้องแจ้งซ่อม'
      },
      {
        status: 'under_review',
        timestamp: '2026-07-27T15:00:00Z',
        actor: 'ฝ่ายอาคารสถานที่',
        note: 'ตรวจสอบรายการครุภัณฑ์แอร์ AC-302-2565'
      },
      {
        status: 'approved',
        timestamp: '2026-07-27T16:30:00Z',
        actor: 'หัวหน้างานอาคารสถานที่',
        note: 'อนุมัติจ่ายงานให้ทีมช่างไฟฟ้าและช่างแอร์เข้าดำเนินการในวันที่ 29 ก.ค. 2026 เวลา 09.00 น.'
      }
    ],
    officerNotes: 'มอบหมายนายช่างสมศักดิ์เข้าดำเนินการเปลี่ยนท่อน้ำทิ้งแอร์และเปลี่ยนหลอดไฟ LED ใหม่ 4 หลอด',
    createdAt: '2026-07-27T14:10:00Z',
    updatedAt: '2026-07-27T16:30:00Z',
    expectedDate: '2026-07-29'
  },
  {
    id: 'REQ-20260725-012',
    category: 'leave',
    title: 'ขออนุมัติลากิจเพื่อเข้าร่วมการสัมมนาวิชาการ AI Thailand 2026',
    applicant: {
      prefix: 'นางสาว',
      fullName: 'ณิชากานต์ พรหมมณี',
      citizenIdOrCode: '1209900887123',
      email: 'nichakan.p@example.com',
      phone: '082-111-2233',
      department: 'ฝ่ายนวัตกรรมดิจิทัล',
      positionOrMajor: 'นักวิจัยนวัตกรรม'
    },
    details: {
      leaveType: 'training',
      startDate: '2026-08-05',
      endDate: '2026-08-07',
      totalDays: 3,
      contactDuringLeave: 'นายธีรภัทร ชัยชนะ (โทร. 083-444-5566)'
    },
    reason: 'เข้าร่วมการประชุมสัมมนาวิชาการเพื่อนำความรู้ด้านปัญญาประดิษฐ์มาพัฒนาระบบคำร้องออนไลน์ของหน่วยงาน',
    priority: 'normal',
    attachments: [
      {
        id: 'att-103',
        name: 'หนังสือเชิญเข้าร่วมสัมมนา_AI_Thailand.pdf',
        size: 512000,
        type: 'application/pdf',
        uploadedAt: '2026-07-25T11:00:00Z',
        documentCategory: 'official_letter',
        description: 'หนังสือเชิญทางการพร้อมกำหนดการสัมมนา'
      }
    ],
    status: 'completed',
    assignedOfficer: 'นายอำนาจ ผู้จัดการฝ่าย',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: '2026-07-25T11:00:00Z',
        actor: 'นางสาวณิชากานต์ พรหมมณี',
        note: 'ยื่นใบขออนุมัติลาอบรม'
      },
      {
        status: 'approved',
        timestamp: '2026-07-26T09:00:00Z',
        actor: 'ผู้จัดการฝ่ายนวัตกรรม',
        note: 'อนุมัติการลาอบรม เนื่องจากสอดคล้องกับแผนพัฒนาศักยภาพบุคลากร'
      },
      {
        status: 'completed',
        timestamp: '2026-07-26T09:05:00Z',
        actor: 'ระบบอัตโนมัติ',
        note: 'บันทึกวันลาเข้าสู่ฐานข้อมูลวันลาพักผ่อน/ฝึกอบรมเรียบร้อยแล้ว'
      }
    ],
    officerNotes: 'อนุมัติเรียบร้อยแล้ว กรุณาจัดทำรายงานสรุปการเข้าร่วมสัมมนาส่งภายใน 7 วันหลังกลับเข้าปฏิบัติงาน',
    createdAt: '2026-07-25T11:00:00Z',
    updatedAt: '2026-07-26T09:05:00Z',
    expectedDate: '2026-07-26'
  },
  {
    id: 'REQ-20260722-008',
    category: 'budget',
    title: 'ขออนุมัติเบิกจ่ายค่าเดินทางและค่าธรรมเนียมการลงทะเบียนวิทยากร',
    applicant: {
      prefix: 'นาย',
      fullName: 'กิตติศักดิ์ มั่นคง',
      citizenIdOrCode: '3101500441290',
      email: 'kittisak.m@example.com',
      phone: '086-555-7788',
      department: 'ฝ่ายการเงินและแผนงาน',
      positionOrMajor: 'นักวิชาการเงินและบัญชี'
    },
    details: {
      budgetType: 'travel',
      amount: 4500,
      budgetSource: 'งบพัฒนาบุคลากร ประจำปี 2569',
      bankAccount: 'ธนาคารกรุงไทย เลขที่ 012-3-45678-9'
    },
    reason: 'ขอเบิกจ่ายค่าพาหนะเดินทางและค่าเบี้ยเลี้ยงการเดินทางไปปฏิบัติราชการ ณ จังหวัดเชียงใหม่',
    priority: 'very_urgent',
    attachments: [
      {
        id: 'att-104',
        name: 'ใบเสร็จค่าน้ำมันและตั๋วรถโดยสาร.pdf',
        size: 3145728,
        type: 'application/pdf',
        uploadedAt: '2026-07-22T16:20:00Z',
        documentCategory: 'financial_doc',
        description: 'ใบเสร็จรับเงินค่าน้ำมันพร้อมตั๋วรถโดยสารประจำทาง'
      }
    ],
    status: 'action_required',
    assignedOfficer: 'นางสาววิไลวรรณ (งานตรวจสอบเอกสารการเงิน)',
    statusHistory: [
      {
        status: 'submitted',
        timestamp: '2026-07-22T16:20:00Z',
        actor: 'นายกิตติศักดิ์ มั่นคง',
        note: 'ส่งเอกสารขอเบิกจ่าย'
      },
      {
        status: 'action_required',
        timestamp: '2026-07-24T10:30:00Z',
        actor: 'นางสาววิไลวรรณ (เจ้าหน้าที่การเงิน)',
        note: 'ต้องการเอกสารเพิ่มเติม: ใบลงทะเบียนเข้าร่วมงานที่มีตราประทับรับรองจากผู้จัดงาน'
      }
    ],
    officerNotes: 'กรุณาแนบใบลงทะเบียนพร้อมลายเซ็นรับรองจากผู้จัดงานเพิ่มเติม แล้วกดแนบไฟล์ปรับปรุงข้อมูล',
    createdAt: '2026-07-22T16:20:00Z',
    updatedAt: '2026-07-24T10:30:00Z',
    expectedDate: '2026-07-31'
  }
];
