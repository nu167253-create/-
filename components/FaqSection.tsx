import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Clock, 
  ShieldCheck, 
  PhoneCall, 
  Mail, 
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'การยื่นคำร้อง',
    question: 'สามารถยื่นคำร้องออนไลน์ได้ในช่วงเวลาใดบ้าง?',
    answer: 'ระบบบริการคำร้องออนไลน์เปิดให้บริการตลอด 24 ชั่วโมง 7 วันทำการ ทั้งนี้เจ้าหน้าที่งานสารบรรณจะเข้ารับเรื่องและประมวลผลในวันและเวลาทำการปกติ (จันทร์ - ศุกร์ เวลา 08.30 - 16.30 น.)'
  },
  {
    category: 'การยื่นคำร้อง',
    question: 'หากไม่มีเครื่องสแกน สามารถแนบรูปถ่ายเอกสารจากมือถือได้หรือไม่?',
    answer: 'สามารถใช้รูปถ่ายจากกล้องโทรศัพท์มือถือได้ โดยขอให้รูปภาพมีความชัดเจน ตัวอักษรอ่านง่าย ไม่เบลอ และไม่มีแสงสะท้อนบังข้อความสำคัญ'
  },
  {
    category: 'ติดตามสถานะ',
    question: 'จะทราบได้อย่างไรว่าคำร้องได้รับการอนุมัติแล้ว?',
    answer: 'ท่านสามารถนำรหัสติดตามคำร้อง (Tracking ID) มากรอกค้นหาได้ที่เมนู "ติดตามสถานะ" หรือตรวจสอบการแจ้งผลผ่านอีเมลที่ระบุไว้ในขั้นตอนยื่นเรื่อง'
  },
  {
    category: 'ติดตามสถานะ',
    question: 'หากสถานะขึ้นว่า "ต้องการข้อมูลเพิ่มเติม" ต้องทำอย่างไร?',
    answer: 'ขอให้ท่านอ่านบันทึกข้อความจากเจ้าหน้าที่ในหน้าติดตามสถานะ จากนั้นสามารถติดต่อเจ้าหน้าที่ผู้รับผิดชอบตามเบอร์ติดต่อที่ระบุ หรือเตรียมเอกสารเพิ่มเติมเพื่อนำส่งทางอีเมล/หน้างาน'
  },
  {
    category: 'หนังสือรับรอง',
    question: 'หนังสือรับรองการทำงาน/การเป็นนิสิต รูปแบบ PDF มีตราประทับดิจิทัลสามารถนำไปใช้อ้างอิงทางกฎหมายได้หรือไม่?',
    answer: 'ได้ เนื่องจากเอกสาร PDF จากระบบมีการประทับตราดิจิทัล (E-Stamp) และรหัสตรวจสอบ (Security Hash) ตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์'
  }
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <HelpCircle className="w-3.5 h-3.5" />
          ศูนย์ช่วยเหลือและคู่มือการใช้งาน
        </span>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          คำถามที่พบบ่อยและขั้นตอนการยื่นคำร้อง (FAQ & Process Guide)
        </h2>
        <p className="text-slate-600 text-xs max-w-xl mx-auto">
          รวมข้อสงสัยและคำแนะนำขั้นตอนการรับบริการคำร้องออนไลน์ E-Service Portal
        </p>
      </div>

      {/* Process Flow Infographic */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          ขั้นตอนการรับบริการ 4 ขั้นตอนง่ายๆ
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {[
            { num: '01', title: 'เลือกประเภทคำร้อง', desc: 'เลือกหมวดหมู่บริการที่ต้องการและอ่านเงื่อนไขเอกสารที่ต้องใช้' },
            { num: '02', title: 'กรอกข้อมูลและแนบไฟล์', desc: 'กรอกรายละเอียด เซ็นชื่อดิจิทัล และใช้ AI ช่วยปรับภาษาเป็นทางการ' },
            { num: '03', title: 'รับรหัสติดตามคำร้อง', desc: 'ระบบจะออกรหัส Tracking ID เช่น REQ-20260728-001 และพิมพ์ใบรับเรื่อง' },
            { num: '04', title: 'รับเอกสาร/ผลการพิจารณา', desc: 'ติดตามผลออนไลน์ ดาวน์โหลด PDF พร้อมตราประทับย่อยดิจิทัล' }
          ].map((s) => (
            <div key={s.num} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-blue-600 font-extrabold text-lg block">{s.num}</span>
              <h4 className="font-bold text-slate-800">{s.title}</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          คำถามที่พบบ่อย (FAQ)
        </h3>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-4 bg-slate-50/60 hover:bg-slate-100 flex items-center justify-between gap-3 text-xs font-bold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {faq.category}
                    </span>
                    {faq.question}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>

                {isOpen && (
                  <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Helpdesk Box */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 text-xs space-y-3">
        <h3 className="font-bold text-sm text-blue-200 flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-blue-400" />
          หากต้องการสอบถามข้อมูลเพิ่มเติม หรือแจ้งปัญหาการใช้งานระบบ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400 shrink-0" />
            <span>สายด่วนบริการ: 02-123-4567 (เวลาราชการ)</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
            <span>อีเมล: support@eservice-portal.go.th</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span>ศูนย์บริการสารบรรณ อาคาร 1 ชั้น 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
