import React, { useState } from 'react';
import { REQUEST_CATEGORIES } from '../data/categories';
import { createNewRequest } from '../utils/storage';
import { sendSubmissionConfirmationEmail, sendSubmissionConfirmationSms } from '../utils/emailService';
import { RequestItem, RequestPriority, RequestStatus } from '../types/request';
import { AiTextPolisher } from './AiTextPolisher';
import { DocumentScannerModal } from './DocumentScannerModal';
import { 
  X, 
  PlusCircle, 
  User, 
  FileText, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Paperclip, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  ShieldCheck,
  Sparkles,
  Inbox,
  UserCheck,
  Camera
} from 'lucide-react';

interface OfficerNewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: RequestItem) => void;
  currentOfficerName?: string;
}

export const OfficerNewRequestModal: React.FC<OfficerNewRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentOfficerName = 'เจ้าหน้าที่ผู้รับเรื่องสารบรรณ',
}) => {
  // Form State
  const [prefix, setPrefix] = useState('นาย');
  const [fullName, setFullName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [address, setAddress] = useState('');

  const [category, setCategory] = useState<string>(REQUEST_CATEGORIES[0].id);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [initialStatus, setInitialStatus] = useState<RequestStatus>('under_review');
  const [intakeChannel, setIntakeChannel] = useState<'walk_in' | 'phone' | 'paper_mail' | 'officer_survey'>('walk_in');
  const [officialLedgerNo, setOfficialLedgerNo] = useState(`รับ-${new Date().getFullYear() + 543}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [assignedOfficer, setAssignedOfficer] = useState(currentOfficerName);

  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size?: string; type?: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: event.target?.result as string || '',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            type: file.type.includes('image') ? 'image' : 'document',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!(fullName || '').trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุล ผู้ยื่นคำร้อง');
      return;
    }
    if (!(phone || '').trim()) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
      return;
    }
    if (!(title || '').trim()) {
      setErrorMsg('กรุณากรอกหัวข้อเรื่องร้องเรียน/คำร้อง');
      return;
    }
    if (!(details || '').trim()) {
      setErrorMsg('กรุณากรอกรายละเอียดคำร้อง');
      return;
    }

    setIsSubmitting(true);

    try {
      const channelLabel = {
        walk_in: 'ยื่นด้วยตนเอง (Walk-in)',
        phone: 'รับเรื่องทางโทรศัพท์ / สายด่วน',
        paper_mail: 'หนังสือสารบรรณ / ไปรษณีย์',
        officer_survey: 'เจ้าหน้าที่สำรวจและบันทึกเอง',
      }[intakeChannel];

      const createdReq = createNewRequest({
        title: (title || '').trim(),
        category: category as any,
        details: {
          description: (details || '').trim(),
          ledgerNo: officialLedgerNo,
          channel: channelLabel,
          organization: organization || 'ประชาชนทั่วไป'
        },
        reason: `${(details || '').trim()}\n\n[บันทึกโดยเจ้าหน้าที่] ช่องทาง: ${channelLabel} | เลขรับสารบรรณ: ${officialLedgerNo}${organization ? ` | สังกัด/หน่วยงาน: ${organization}` : ''}`,
        location: (location || '').trim() || 'ไม่ระบุสถานที่เฉพาะเจาะจง',
        priority,
        status: initialStatus,
        assignedOfficer: (assignedOfficer || '').trim() || currentOfficerName,
        applicant: {
          prefix,
          fullName: (fullName || '').trim(),
          citizenIdOrCode: (idCard || '').trim() || '1309900000000',
          idCard: (idCard || '').trim() || '1309900000000',
          phone: (phone || '').trim(),
          email: (email || '').trim() || 'contact@citizen.mail',
          department: organization || 'ประชาชนทั่วไป',
          positionOrMajor: 'ประชาชน',
          address: (address || '').trim() || 'ไม่ระบุที่อยู่ละเอียด',
          province: 'กรุงเทพมหานคร',
          district: 'เขตพระนคร',
          subdistrict: 'ศาลเจ้าพ่อเสือ',
          postalCode: '10200',
        },
        attachments: attachments.map((att, idx) => ({
          id: `att-off-${Date.now()}-${idx}`,
          name: att.name,
          url: att.url,
          uploadedAt: new Date().toISOString(),
          size: att.size || '100 KB',
          type: att.type as any || 'document',
        })),
      });

      // Send SMS & email alerts to the citizen
      if (createdReq.applicant?.phone) {
        sendSubmissionConfirmationSms(createdReq);
      }
      if (createdReq.applicant?.email && !createdReq.applicant.email.includes('example') && createdReq.applicant.email !== 'contact@citizen.mail') {
        sendSubmissionConfirmationEmail(createdReq);
      }

      setIsSubmitting(false);
      onSuccess(createdReq);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('เกิดข้อผิดพลาดในการสร้างคำร้องใหม่ กรุณาลองใหม่อีกครั้ง');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-emerald-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                ลงรับคำร้องใหม่ / เพิ่มข้อมูลโดยเจ้าหน้าที่
              </h3>
              <p className="text-xs text-emerald-200">
                สำหรับบันทึกคำร้อง Walk-in, สายด่วนรับเรื่อง, หรือบันทึกหนังสือสารบรรณเข้าระบบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: ช่องทางการรับเรื่อง & ข้อมูลสารบรรณเจ้าหน้าที่ */}
          <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 border-b border-emerald-200/80 pb-2">
              <Inbox className="w-4 h-4 text-emerald-700" />
              <span>1. ข้อมูลการลงรับเรื่องและสารบรรณ (Officer Intake Metadata)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ช่องทางการรับเรื่อง *</label>
                <select
                  value={intakeChannel}
                  onChange={(e: any) => setIntakeChannel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="walk_in">🏢 ยื่นด้วยตนเองที่สำนักงาน (Walk-in)</option>
                  <option value="phone">📞 โทรศัพท์ / รับเรื่องผ่านสายด่วน</option>
                  <option value="paper_mail">✉️ หนังสือราชการ / ไปรษณีย์</option>
                  <option value="officer_survey">🔍 เจ้าหน้าที่ออกตรวจและบันทึกเอง</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เลขที่ลงรับสารบรรณ / เลขอ้างอิง</label>
                <input
                  type="text"
                  value={officialLedgerNo}
                  onChange={(e) => setOfficialLedgerNo(e.target.value)}
                  placeholder="เช่น รับ-2569/1042"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เจ้าหน้าที่ผู้รับเรื่องประจำเคาน์เตอร์</label>
                <input
                  type="text"
                  value={assignedOfficer}
                  onChange={(e) => setAssignedOfficer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">กำหนดสถานะเริ่มต้น *</label>
                <select
                  value={initialStatus}
                  onChange={(e: any) => setInitialStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="submitted">📥 ยื่นคำร้องแล้ว (Submitted)</option>
                  <option value="under_review">⏳ อยู่ระหว่างตรวจสอบ (Under Review)</option>
                  <option value="approved">✅ อนุมัติทันที (Approved - Walk-in complete)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ระดับความเร่งด่วน *</label>
                <div className="flex gap-2 pt-1">
                  {[
                    { id: 'normal', label: 'ปกติ', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                    { id: 'urgent', label: 'ด่วน (Urgent)', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                    { id: 'immediate', label: 'ด่วนที่สุด', color: 'bg-rose-100 text-rose-800 border-rose-300' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                        priority === p.id ? 'ring-2 ring-emerald-600 shadow-xs scale-102 ' + p.color : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ข้อมูลผู้ยื่นคำร้อง */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>2. ข้อมูลประชาชน/ผู้ยื่นคำร้อง (Applicant Information)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ผศ.ดร.">ผศ.ดร.</option>
                  <option value="บริษัท/ห้างหุ้นส่วน">บริษัท/ห้างหุ้นส่วน</option>
                </select>
              </div>

              <div className="md:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล หรือชื่อหน่วยงาน *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี หรือ บริษัท เอ บี ซี จำกัด"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">เลขประจำตัวประชาชน / นิติบุคคล</label>
                <input
                  type="text"
                  maxLength={13}
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="13 หลัก (เช่น 1100200300405)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081-234-5678"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมล (ถ้ามี)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สังกัด / หน่วยงาน (ถ้ามี)</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="เช่น สมาคมพ่อค้าไทย"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: รายละเอียดเรื่องร้องเรียน / คำร้อง */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>3. รายละเอียดเรื่องร้องเรียน / คำร้องขอรับบริการ (Request Details)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่บริการ/คำร้อง *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {REQUEST_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.titleTh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สถานที่ / บริเวณที่เกี่ยวข้อง</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น ซอยสุขุมวิท 55 เขตวัฒนา"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="text-xs space-y-1">
              <label className="block font-semibold text-slate-700">หัวข้อเรื่อง *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ขออนุญาตจัดตั้งป้ายโฆษณาชั่วคราว หรือ ขอซ่อมแซมไฟถนน"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-sm"
              />
            </div>

            <div className="text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700">รายละเอียดคำร้องและเหตุผลความจำเป็น *</label>
                <AiTextPolisher text={details} onPolished={(polished) => setDetails(polished)} />
              </div>
              <textarea
                rows={4}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="ระบุข้อเท็จจริง ความประสงค์ หรือรายละเอียดเพิ่มเติมในการขอรับบริการ..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs leading-relaxed font-normal text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Document Attachments */}
            <div className="text-xs space-y-2 pt-1 border-t border-slate-200">
              <label className="block font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  แนบไฟล์เอกสาร/ภาพถ่ายเพิ่มเติม (Officer Attachments)
                </span>
                <span className="text-[11px] font-normal text-slate-500">รองรับ PDF, JPG, PNG</span>
              </label>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm border border-blue-400/30 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-300" />
                  <span>📷 สแกนเอกสารแนบด้วยกล้อง</span>
                </button>

                <label className="cursor-pointer bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-2 shadow-2xs">
                  <Paperclip className="w-4 h-4 text-emerald-600" />
                  <span>เลือกไฟล์จากเครื่อง...</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {attachments.length > 0 ? `แนบแล้ว ${attachments.length} ไฟล์` : 'ยังไม่มีไฟล์แนบ'}
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2 font-medium text-slate-700">
                        📄 {att.name} <span className="text-[10px] text-slate-400">({att.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Action Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกคำร้องเข้าระบบสารบรรณ'}
            </button>
          </div>

        </form>

      </div>

      {/* Camera Document Scanner Modal */}
      <DocumentScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onAttachScannedFiles={(scannedFiles) => {
          setAttachments(prev => [
            ...prev,
            ...scannedFiles.map(sf => ({
              name: sf.name,
              url: sf.dataUrl || '',
              size: typeof sf.size === 'number' ? `${(sf.size / 1024).toFixed(1)} KB` : (sf.size || '100 KB'),
              type: 'image'
            }))
          ]);
        }}
        defaultDocCategory="id_card"
      />
    </div>
  );
};
