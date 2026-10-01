import { CategoryDefinition } from '../types/request';

export const REQUEST_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'cctv',
    titleTh: 'แบบคำร้องขอดูหรือขอสำเนาข้อมูลภาพจากกล้องวงจรปิด CCTV เทศบาลเมืองชัยภูมิ',
    titleEn: 'Chaiyaphum CCTV Footage Request Form',
    description: 'ยื่นคำร้องขอดูภาพหรือขอสำเนาบันทึกภาพจากกล้องวงจรปิด (CCTV) สำหรับประชาชน เจ้าหน้าที่ และหน่วยงานภายนอก',
    iconName: 'Camera',
    slaDays: 1,
    requiredDocuments: [
      'หนังสือจากหน่วยงาน (ถ้ามี)',
      'สำเนาบัตรประจำตัวเจ้าหน้าที่ / บัตรประชาชน'
    ],
    fields: [
      {
        id: 'position',
        label: 'ตำแหน่ง',
        type: 'text',
        required: true,
        placeholder: 'เช่น เจ้าพนักงานเทศกิจ, ประชาชนผู้เสียหาย, ร้อยตำรวจเอก'
      },
      {
        id: 'division',
        label: 'สังกัด',
        type: 'text',
        required: true,
        placeholder: 'เช่น ฝ่ายปกครอง, สำนักปลัดเทศบาล, สถานีตำรวจภูธรเมืองชัยภูมิ'
      },
      {
        id: 'agency',
        label: 'หน่วยงาน',
        type: 'text',
        required: true,
        placeholder: 'เช่น เทศบาลเมืองชัยภูมิ, สถานีตำรวจภูธรเมืองชัยภูมิ'
      },
      {
        id: 'cctvLocation',
        label: 'มีความประสงค์ขอดูข้อมูลภาพจากกล้องวงจรปิดบริเวณ',
        type: 'text',
        required: true,
        placeholder: 'เช่น สี่แยกหอนาฬิกาเมืองชัยภูมิ, ถนนนนทการ หน้าสำนักงานเทศบาล'
      },
      {
        id: 'footageDate',
        label: 'วันที่เกิดเหตุ / วันที่ต้องการดูภาพ',
        type: 'date',
        required: true
      },
      {
        id: 'timeRange',
        label: 'เวลาเกิดเหตุ (จากเวลา - ถึงเวลา)',
        type: 'text',
        required: true,
        placeholder: 'เช่น 08:30 น. ถึง 10:15 น.'
      },
      {
        id: 'cameraStatus',
        label: 'สถานะกล้องวงจรปิด',
        type: 'select',
        required: true,
        options: [
          { label: 'ปกติ (เปิดใช้งานได้)', value: 'ปกติ' },
          { label: 'ชำรุด/ขัดข้อง (แจ้งซ่อม)', value: 'ชำรุด/ขัดข้อง' },
          { label: 'รอการตรวจสอบจากเจ้าหน้าที่', value: 'รอการตรวจสอบ' }
        ]
      },
      {
        id: 'copyLocation',
        label: 'ขอบันทึกสำเนาข้อมูลภาพจากกล้องวงจรปิด บริเวณ',
        type: 'text',
        required: true,
        placeholder: 'ระบุจุด/กล้องที่ต้องการบันทึกไฟล์สำเนาลง Flash drive/CD'
      },
      {
        id: 'purpose',
        label: 'เพื่อ (ระบุวัตถุประสงค์ในการขอข้อมูล)',
        type: 'textarea',
        required: true,
        placeholder: 'เช่น เพื่อใช้เป็นหลักฐานประกอบคดีจราจร / ติดตามทรัพย์สินสูญหาย / รายงานผู้บังคับบัญชา'
      },
      {
        id: 'incidentLocationMap',
        label: 'ปักหมุดจุดเกิดเหตุบนแผนที่ (ถ้าทราบ)',
        type: 'map',
        required: false,
      }
    ]
  },
  {
    id: 'certificate',
    titleTh: 'คำร้องขอหนังสือรับรอง / เอกสารทางการ',
    titleEn: 'Official Certificate & Document Request',
    description: 'ขอหนังสือรับรองการเป็นพนักงาน/นิสิต ใบแสดงผลการเรียน (Transcript) หรือหนังสือรับรองเงินเดือน',
    iconName: 'FileCheck',
    slaDays: 3,
    requiredDocuments: [
      'สำเนาบัตรประชาชน / บัตรพนักงาน / บัตรนิสิต',
      'รูปถ่ายชุดสุภาพ (กรณีขอใบแสดงผลแบบมีรูป)'
    ],
    fields: [
      {
        id: 'certType',
        label: 'ประเภทหนังสือรับรองที่ต้องการ',
        type: 'select',
        required: true,
        options: [
          { label: 'หนังสือรับรองการทำงาน / การเป็นพนักงาน', value: 'work_cert' },
          { label: 'หนังสือรับรองเงินเดือน (Salary Certificate)', value: 'salary_cert' },
          { label: 'หนังสือรับรองสภาพการเป็นนิสิต/นักเรียน', value: 'student_cert' },
          { label: 'ใบแสดงผลการเรียน (Transcript)', value: 'transcript' },
          { label: 'หนังสือรับรองผ่านสิทธิ์ / การเป็นสมาชิก', value: 'membership_cert' },
          { label: 'หนังสืออนุญาตการเดินทาง/ขอวีซ่า', value: 'visa_cert' }
        ]
      },
      {
        id: 'language',
        label: 'ภาษาที่ต้องการ',
        type: 'select',
        required: true,
        options: [
          { label: 'ภาษาไทย (Thai)', value: 'th' },
          { label: 'ภาษาอังกฤษ (English)', value: 'en' },
          { label: 'ทั้งภาษาไทยและอังกฤษ (Both)', value: 'both' }
        ]
      },
      {
        id: 'copies',
        label: 'จำนวนชุดที่ต้องการ (ฉบับ)',
        type: 'number',
        required: true,
        placeholder: '1'
      },
      {
        id: 'deliveryMethod',
        label: 'วิธีการรับเอกสาร',
        type: 'select',
        required: true,
        options: [
          { label: 'ดาวน์โหลดไฟล์อิเล็กทรอนิกส์ (PDF พร้อมตราประทับดิจิทัล)', value: 'digital' },
          { label: 'รับด้วยตนเอง ณ ช่องบริการหมายเลข 1', value: 'pickup' },
          { label: 'จัดส่งทางไปรษณีย์ด่วนพิเศษ (EMS) ตามที่อยู่', value: 'ems' }
        ]
      },
      {
        id: 'postalAddress',
        label: 'ที่อยู่จัดส่ง (กรณีเลือกจัดส่งไปรษณีย์)',
        type: 'textarea',
        required: false,
        placeholder: 'บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์'
      }
    ]
  },
  {
    id: 'leave',
    titleTh: 'คำร้องขออนุมัติการลา / เปลี่ยนแปลงเวลาทำงาน',
    titleEn: 'Leave & Schedule Adjustment Request',
    description: 'ยื่นใบลาป่วย ลากิจ ลาพักผ่อน หรือขอสลับเวร/เปลี่ยนเวลาปฏิบัติงาน',
    iconName: 'CalendarLeave',
    slaDays: 1,
    requiredDocuments: [
      'ใบรับรองแพทย์ (กรณีลาป่วยเกิน 2 วัน)',
      'เอกสารอ้างอิงการลากิจ / ใบนัดหมาย'
    ],
    fields: [
      {
        id: 'leaveType',
        label: 'ประเภทการลา',
        type: 'select',
        required: true,
        options: [
          { label: 'ลากิจส่วนตัว (Personal Leave)', value: 'personal' },
          { label: 'ลาป่วย (Sick Leave)', value: 'sick' },
          { label: 'ลาพักผ่อนประจำปี (Vacation Leave)', value: 'vacation' },
          { label: 'ลาเพื่อฝึกอบรม / สัมมนา (Training Leave)', value: 'training' },
          { label: 'ลาบวช / ลาประกอบพิธีฮัจญ์', value: 'religious' },
          { label: 'ขอเปลี่ยนแปลงเวลาทำงาน / สลับเวร', value: 'shift_change' }
        ]
      },
      {
        id: 'startDate',
        label: 'วันที่เริ่มลา',
        type: 'date',
        required: true
      },
      {
        id: 'endDate',
        label: 'วันที่สิ้นสุดการลา',
        type: 'date',
        required: true
      },
      {
        id: 'totalDays',
        label: 'จำนวนวันลาทั้งหมด (วัน)',
        type: 'number',
        required: true,
        placeholder: '1'
      },
      {
        id: 'contactDuringLeave',
        label: 'ผู้ปฏิบัติงานแทน / ผู้รับมอบหมายงานช่วงที่ลา',
        type: 'text',
        required: true,
        placeholder: 'ระบุชื่อ-นามสกุล และเบอร์ติดต่อผู้รับมอบงานแทน'
      }
    ]
  },
  {
    id: 'maintenance',
    titleTh: 'คำร้องแจ้งซ่อม / สนับสนุน IT & อาคารสถานที่',
    titleEn: 'Maintenance, IT & Facility Request',
    description: 'แจ้งซ่อมอุปกรณ์คอมพิวเตอร์ ระบบเครือข่าย ปรับปรุงอาคาร ปรับอากาศ ไฟฟ้า ประปา',
    iconName: 'Wrench',
    slaDays: 2,
    requiredDocuments: [
      'รูปถ่ายอุปกรณ์หรือบริเวณที่ชำรุดเสียหาย'
    ],
    fields: [
      {
        id: 'maintenanceCategory',
        label: 'ประเภทการแจ้งซ่อม/บริการ',
        type: 'select',
        required: true,
        options: [
          { label: 'อุปกรณ์คอมพิวเตอร์ / พริ้นเตอร์ / ซอฟต์แวร์', value: 'it_hardware' },
          { label: 'ระบบอินเทอร์เน็ต / Wi-Fi / เครือข่าย', value: 'it_network' },
          { label: 'ระบบไฟฟ้า / ประปา / เครื่องปรับอากาศ', value: 'utility' },
          { label: 'ซ่อมแซมอาคารสถานที่ / โต๊ะเก้าอี้ / ประตูหน้าต่าง', value: 'building' },
          { label: 'ขอใช้ห้องประชุม / เครื่องเสียง / โพรเจกเตอร์', value: 'room_audio' }
        ]
      },
      {
        id: 'location',
        label: 'สถานที่ / อาคาร / ชั้น / เลขที่ห้องที่เกิดปัญหา',
        type: 'text',
        required: true,
        placeholder: 'เช่น อาคาร 1 ชั้น 3 ห้อง 305'
      },
      {
        id: 'assetCode',
        label: 'รหัสครุภัณฑ์ / SERIAL NUMBER (ถ้ามี)',
        type: 'text',
        required: false,
        placeholder: 'เช่น EQ-2568-0041'
      },
      {
        id: 'impactLevel',
        label: 'ระดับผลกระทบต่อการทำงาน',
        type: 'select',
        required: true,
        options: [
          { label: 'ต่ำ - งานทั่วไปยังดำเนินการได้ปกติ', value: 'low' },
          { label: 'ปานกลาง - กระทบการทำงานบางส่วน', value: 'medium' },
          { label: 'สูง - ไม่สามารถปฏิบัติงานได้ / ส่งผลกระทบวงกว้าง', value: 'high' }
        ]
      }
    ]
  },
  {
    id: 'budget',
    titleTh: 'คำร้องขออนุมัติเบิกจ่าย / จัดซื้อ / งบประมาณ',
    titleEn: 'Reimbursement & Budget Approval Request',
    description: 'ขออนุมัติจัดซื้อจัดจ้าง เบิกจ่ายค่าเดินทาง ค่าอุปกรณ์ หรืออนุมัติจัดโครงการ',
    iconName: 'ReceiptTh',
    slaDays: 5,
    requiredDocuments: [
      'ใบเสร็จรับเงิน / ใบกำกับภาษี / ใบเสนอราคา',
      'โครงการ / กำหนดการ (กรณีจัดอบรมหรือจัดโครงการ)'
    ],
    fields: [
      {
        id: 'budgetType',
        label: 'หมวดรายการเบิกจ่าย',
        type: 'select',
        required: true,
        options: [
          { label: 'ค่าเดินทาง / ค่าพาหนะ / ค่าเบี้ยเลี้ยง', value: 'travel' },
          { label: 'ค่าวัสดุสำนักงาน / อุปกรณ์การทำงาน', value: 'supplies' },
          { label: 'ขออนุมัติจัดโครงการ / สัมมนา / กิจกรรม', value: 'project' },
          { label: 'ค่าตอบแทนวิทยากร / ค่าธรรมเนียม', value: 'speaker' },
          { label: 'ขออนุมัติจัดซื้อจัดจ้างพัสดุ', value: 'procurement' }
        ]
      },
      {
        id: 'amount',
        label: 'จำนวนเงินที่ขออนุมัติเบิกจ่าย (บาท)',
        type: 'number',
        required: true,
        placeholder: '0.00'
      },
      {
        id: 'budgetSource',
        label: 'แหล่งงบประมาณ / รหัสโครงการ',
        type: 'text',
        required: true,
        placeholder: 'เช่น งบดำเนินงานประจำปี 2569 / โครงการวิจัย X'
      },
      {
        id: 'bankAccount',
        label: 'เลขที่บัญชีธนาคารสำหรับรับโอนเงินคืน',
        type: 'text',
        required: true,
        placeholder: 'ธนาคารกรุงไทย เลขที่ 123-x-xxxxx-x'
      }
    ]
  },
  {
    id: 'general',
    titleTh: 'คำร้องทั่วไป / ข้อเสนอแนะ / แจ้งเรื่องร้องเรียน',
    titleEn: 'General Petition & Inquiry Form',
    description: 'ยื่นคำร้องเรื่องอื่นๆ ที่ไม่จัดอยู่ในหมวดหมู่ สอบถามข้อมูล ขอความอนุเคราะห์ หรือข้อเสนอแนะ',
    iconName: 'HelpCircle',
    slaDays: 3,
    requiredDocuments: [
      'เอกสารอ้างอิงที่เกี่ยวข้อง (ถ้ามี)'
    ],
    fields: [
      {
        id: 'generalCategory',
        label: 'ประเภทเรื่องที่ติดต่อ',
        type: 'select',
        required: true,
        options: [
          { label: 'คำร้องขอความอนุเคราะห์ทั่วไป', value: 'favor' },
          { label: 'สอบถามข้อมูล / ขั้นตอนการรับบริการ', value: 'inquiry' },
          { label: 'ข้อเสนอแนะเพื่อพัฒนาปรับปรุงบริการ', value: 'suggestion' },
          { label: 'แจ้งเรื่องร้องเรียน / ร้องทุกข์', value: 'complaint' }
        ]
      },
      {
        id: 'targetDepartment',
        label: 'หน่วยงานปลายทางที่ต้องการเสนอเรื่อง',
        type: 'select',
        required: true,
        options: [
          { label: 'ฝ่ายบริหารงานทั่วไปและสารบรรณ', value: 'admin' },
          { label: 'ฝ่ายทรัพยากรบุคคล (HR)', value: 'hr' },
          { label: 'ฝ่ายเทคโนโลยีสารสนเทศ (IT)', value: 'it' },
          { label: 'ฝ่ายการเงินและบัญชี', value: 'finance' },
          { label: 'ฝ่ายวิชาการและทะเบียน', value: 'academic' },
          { label: 'ฝ่ายอาคารสถานที่และยานพาหนะ', value: 'facility' }
        ]
      }
    ]
  }
];
