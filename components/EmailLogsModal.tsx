import React, { useState, useEffect } from 'react';
import { getEmailLogs, EmailLogItem, sendStatusEmailNotification } from '../utils/emailService';
import { getSmsLogs, SmsLogItem, sendStatusSmsNotification, getSmsGatewayStatus, formatThaiPhoneNumber } from '../utils/smsService';
import { getStoredRequests } from '../utils/storage';
import { OfficerTestSmsModal } from './OfficerTestSmsModal';
import { OfficerSmsTemplateModal } from './OfficerSmsTemplateModal';
import { 
  Mail, 
  X, 
  Send, 
  CheckCircle2, 
  Clock, 
  Search, 
  Eye, 
  Copy, 
  Check, 
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  User,
  Smartphone,
  MessageSquare,
  MessageSquareCheck,
  SlidersHorizontal
} from 'lucide-react';

interface EmailLogsModalProps {
  onClose: () => void;
}

export const EmailLogsModal: React.FC<EmailLogsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);
  const [selectedSmsLog, setSelectedSmsLog] = useState<SmsLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);
  const [showTestSmsModal, setShowTestSmsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    reloadLogs();
  }, []);

  const reloadLogs = () => {
    const list = getEmailLogs();
    setLogs(list);
    if (list.length > 0 && !selectedLog) {
      setSelectedLog(list[0]);
    }

    const sList = getSmsLogs();
    setSmsLogs(sList);
    if (sList.length > 0 && !selectedSmsLog) {
      setSelectedSmsLog(sList[0]);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResendTestEmail = (log: EmailLogItem) => {
    const requests = getStoredRequests();
    const targetReq = requests.find((r) => r.id === log.requestId);

    if (targetReq) {
      const newLog = sendStatusEmailNotification(
        targetReq,
        log.triggerStatus,
        'ส่งอีเมลแจ้งเตือนซ้ำโดยเจ้าหน้าที่ (Resent by Officer)'
      );
      reloadLogs();
      if (newLog) setSelectedLog(newLog);
      setTestSuccessMsg(`ส่งอีเมลแจ้งเตือนซ้ำไปยัง ${log.recipientEmail} สำเร็จ!`);
      setTimeout(() => setTestSuccessMsg(null), 3000);
    }
  };

  const handleResendTestSms = (log: SmsLogItem) => {
    const requests = getStoredRequests();
    const targetReq = requests.find((r) => r.id === log.requestId);

    if (targetReq) {
      const newLog = sendStatusSmsNotification(
        targetReq,
        log.triggerStatus,
        'ส่ง SMS แจ้งเตือนซ้ำโดยเจ้าหน้าที่'
      );
      reloadLogs();
      if (newLog) setSelectedSmsLog(newLog);
      setTestSuccessMsg(`ส่งข้อความ SMS แจ้งเตือนซ้ำไปยัง ${log.recipientPhone} สำเร็จ!`);
      setTimeout(() => setTestSuccessMsg(null), 3000);
    }
  };

  const handleSendSampleTest = () => {
    const requests = getStoredRequests();
    if (requests.length === 0) return;

    const sample = requests[0];
    const sampleStatus = sample.status === 'completed' ? 'completed' : 'approved';
    
    if (activeTab === 'email') {
      const newLog = sendStatusEmailNotification(
        sample,
        sampleStatus,
        'ทดสอบส่งอีเมลแจ้งเตือนระบบสารบรรณและศูนย์บริการประชาชน'
      );
      reloadLogs();
      if (newLog) setSelectedLog(newLog);
      setTestSuccessMsg(`ส่งอีเมลทดสอบสำหรับคำร้อง ${sample.id} ไปยัง ${sample.applicant?.email || 'อีเมลผู้ยื่นคำร้อง'} สำเร็จ!`);
    } else {
      const newSms = sendStatusSmsNotification(
        sample,
        sampleStatus,
        'ทดสอบระบบ SMS แจ้งเตือนเทศบาล'
      );
      reloadLogs();
      if (newSms) setSelectedSmsLog(newSms);
      setTestSuccessMsg(`ส่งข้อความ SMS ทดสอบสำหรับคำร้อง ${sample.id} ไปยัง ${sample.applicant.phone || 'เบอร์ผู้ยื่นคำร้อง'} สำเร็จ!`);
    }

    setTimeout(() => setTestSuccessMsg(null), 3500);
  };

  const filteredLogs = logs.filter(
    (l) =>
      (l.requestId || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (l.recipientEmail || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (l.recipientName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (l.subject || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const filteredSmsLogs = smsLogs.filter(
    (s) =>
      (s.requestId || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s.recipientPhone || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s.recipientName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
      (s.message || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              {activeTab === 'email' ? <Mail className="w-5 h-5" /> : <Smartphone className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                ประวัติการส่ง SMS & Email แจ้งเตือนประชาชน (Notification Logs)
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-normal">
                  Automated Triggers
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ระบบส่งการแจ้งเตือนอัตโนมัติทันทีเมื่อเปลี่ยนสถานะเป็น "อนุมัติแล้ว" หรือ "ดำเนินการเสร็จสิ้น"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="email-logs-sms-templates-btn"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md transition-all cursor-pointer"
              title="เปิดหน้าต่างแก้ไขและปรับแต่งเทมเพลตข้อความ SMS พร้อมตัวแปร Placeholders"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-200" />
              <span>เทมเพลต SMS (Templates)</span>
            </button>
            <button
              id="email-logs-test-sms-btn"
              onClick={() => setShowTestSmsModal(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md transition-all cursor-pointer"
              title="เปิดหน้าต่างทดสอบส่ง SMS แจ้งเตือนสถานะไปยังเบอร์มือถือที่กำหนดเอง"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>ทดสอบส่ง SMS (Test SMS)</span>
            </button>
            <button
              onClick={handleSendSampleTest}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3.5 py-2 rounded-xl font-semibold shadow transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {activeTab === 'email' ? 'ทดสอบด่วน (Email)' : 'ทดสอบด่วน (SMS)'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex items-center gap-3 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>ประวัติส่งอีเมล (Email Logs)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'email' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>ประวัติส่ง SMS มือถือ (SMS Logs)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'sms' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {smsLogs.length}
            </span>
          </button>
        </div>

        {/* SMS Gateway Status Banner */}
        {activeTab === 'sms' && (
          <div className="bg-emerald-950 text-emerald-200 px-6 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white">Smart SMS Gateway: ออนไลน์ (อัตราส่งสำเร็จ 99.8%)</span>
              <span className="text-emerald-400/80">• รองรับ AIS, True, DTAC, NT</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span>โควต้า SMS: 4,850 ข้อความ</span>
              <span className="bg-emerald-800/80 text-emerald-100 px-2 py-0.5 rounded-sm">ส่งแจ้งเตือนคู่กับอีเมลอัตโนมัติ</span>
            </div>
          </div>
        )}

        {/* Alert Success Banner */}
        {testSuccessMsg && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-6 py-2.5 flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{testSuccessMsg}</span>
            </div>
            <span className="text-[10px] opacity-80">การแจ้งเตือนลงบันทึกในระบบเรียบร้อย</span>
          </div>
        )}

        {/* Modal Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* Left Column: Log List */}
          <div className="md:col-span-5 p-4 flex flex-col space-y-3 bg-slate-50/70 overflow-hidden">
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder={activeTab === 'email' ? "ค้นหาตามรหัสคำร้อง อีเมล ชื่อ..." : "ค้นหาตามรหัสคำร้อง เบอร์โทร ข้อความ..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {activeTab === 'email' ? (
                filteredLogs.length === 0 ? (
                  <div className="text-center py-10 space-y-2 text-slate-500 text-xs">
                    <Mail className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>ยังไม่มีประวัติการส่งอีเมลแจ้งเตือน</p>
                    <p className="text-[10px] text-slate-400">
                      ลองอัปเดตสถานะคำร้องเป็น 'อนุมัติแล้ว' หรือ 'ดำเนินการเสร็จสิ้น'
                    </p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    const isCompleted = log.triggerStatus === 'completed' || log.triggerStatus === 'approved';

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-mono font-bold ${isSelected ? 'text-white' : 'text-blue-700'}`}>
                            {log.requestId}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isCompleted
                              ? isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                              : isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.triggerStatus === 'completed' ? 'เสร็จสิ้น' : log.triggerStatus === 'approved' ? 'อนุมัติแล้ว' : 'อัปเดตสถานะ'}
                          </span>
                        </div>

                        <p className={`font-semibold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {log.subject}
                        </p>

                        <div className={`flex items-center justify-between text-[11px] ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          <span className="truncate max-w-[170px]">{log.recipientEmail}</span>
                          <span className="font-mono text-[10px]">
                            {new Date(log.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                filteredSmsLogs.length === 0 ? (
                  <div className="text-center py-10 space-y-2 text-slate-500 text-xs">
                    <Smartphone className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>ยังไม่มีประวัติการส่ง SMS แจ้งเตือน</p>
                    <p className="text-[10px] text-slate-400">
                      เปิดใช้งานตัวเลือก 'ส่ง SMS' เมื่ออนุมัติหรือปรับสถานะคำร้องเสร็จสิ้น
                    </p>
                  </div>
                ) : (
                  filteredSmsLogs.map((sLog) => {
                    const isSelected = selectedSmsLog?.id === sLog.id;
                    const isCompleted = sLog.triggerStatus === 'completed' || sLog.triggerStatus === 'approved';

                    return (
                      <div
                        key={sLog.id}
                        onClick={() => setSelectedSmsLog(sLog)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 text-xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-mono font-bold ${isSelected ? 'text-white' : 'text-emerald-700'}`}>
                            {sLog.requestId}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isCompleted
                              ? isSelected ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                              : isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                          }`}>
                            📱 {sLog.triggerStatus === 'completed' ? 'เสร็จสิ้น' : sLog.triggerStatus === 'approved' ? 'อนุมัติแล้ว' : 'อัปเดต'}
                          </span>
                        </div>

                        <p className={`font-semibold line-clamp-2 text-[11px] leading-snug ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {sLog.message}
                        </p>

                        <div className={`flex items-center justify-between text-[11px] ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}>
                          <span className="font-mono font-bold">{sLog.recipientPhone} ({sLog.recipientName})</span>
                          <span className="font-mono text-[10px]">
                            {new Date(sLog.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Right Column: Content Preview */}
          <div className="md:col-span-7 p-5 flex flex-col overflow-y-auto space-y-4 bg-white">
            {activeTab === 'email' ? (
              selectedLog ? (
                <div className="space-y-4">
                  {/* Email Meta Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">รายละเอียดอีเมลที่ส่งออก</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ส่งสำเร็จ (Sent)
                        </span>
                      </div>

                      <button
                        onClick={() => handleResendTestEmail(selectedLog)}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        ส่งอีเมลอีกครั้ง
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <strong className="text-slate-900">ผู้รับ (To):</strong> {selectedLog.recipientName} &lt;{selectedLog.recipientEmail}&gt;
                      </div>
                      <div>
                        <strong className="text-slate-900">คำร้องเกี่ยวข้อง:</strong> <span className="font-mono font-bold text-blue-700">{selectedLog.requestId}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <strong className="text-slate-900">หัวข้ออีเมล (Subject):</strong> {selectedLog.subject}
                      </div>
                      <div className="sm:col-span-2 text-[11px] text-slate-500 font-mono">
                        <strong>เวลาที่ส่ง:</strong> {new Date(selectedLog.sentAt).toLocaleString('th-TH')} น.
                      </div>
                    </div>
                  </div>

                  {/* HTML Rendered Email Body Container */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-blue-600" />
                        ตัวอย่างหน้าตาอีเมลจริง (Rendered HTML Email View)
                      </span>

                      <button
                        onClick={() => handleCopyText(selectedLog.fullBodyHtml, selectedLog.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                      >
                        {copiedId === selectedLog.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            คัดลอก HTML แล้ว
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            คัดลอก HTML โค้ด
                          </>
                        )}
                      </button>
                    </div>

                    <div className="border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100 p-3 sm:p-6 max-h-[450px] overflow-y-auto">
                      <div 
                        className="bg-white rounded-xl shadow p-4 sm:p-6 border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: selectedLog.fullBodyHtml }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 text-slate-400">
                  <Mail className="w-12 h-12 text-slate-200" />
                  <p className="text-xs">เลือกรายการอีเมลจากฝั่งซ้ายมือเพื่อดูตัวอย่างเนื้อหา</p>
                </div>
              )
            ) : (
              selectedSmsLog ? (
                <div className="space-y-4">
                  {/* SMS Meta Card */}
                  <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          รายละเอียดข้อความ SMS ทางมือถือ
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          ส่งไปยังเครือข่ายมือถือแล้ว
                        </span>
                      </div>

                      <button
                        onClick={() => handleResendTestSms(selectedSmsLog)}
                        className="inline-flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg transition-colors font-semibold shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        ส่ง SMS อีกครั้ง
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                      <div>
                        <strong className="text-emerald-900">ผู้รับ (Mobile No.):</strong> <span className="font-mono font-bold">{formatThaiPhoneNumber(selectedSmsLog.recipientPhone)}</span> ({selectedSmsLog.recipientName})
                      </div>
                      <div>
                        <strong className="text-emerald-900">คำร้องเกี่ยวข้อง:</strong> <span className="font-mono font-bold text-emerald-700">{selectedSmsLog.requestId}</span>
                      </div>
                      {selectedSmsLog.carrier && (
                        <div>
                          <strong className="text-emerald-900">เครือข่ายมือถือ:</strong> <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">{selectedSmsLog.carrier}</span>
                        </div>
                      )}
                      {selectedSmsLog.deliveryRef && (
                        <div>
                          <strong className="text-emerald-900">รหัสอ้างอิง Gateway:</strong> <span className="font-mono text-[11px] text-slate-700">{selectedSmsLog.deliveryRef}</span>
                        </div>
                      )}
                      {selectedSmsLog.characterCount !== undefined && (
                        <div>
                          <strong className="text-emerald-900">ความยาวข้อความ:</strong> <span className="text-slate-700">{selectedSmsLog.characterCount} ตัวอักษร ({selectedSmsLog.creditUnits || 1} ข้อความ SMS)</span>
                        </div>
                      )}
                      <div>
                        <strong className="text-emerald-900">ผู้ให้บริการ (Gateway):</strong> <span className="text-slate-700">{selectedSmsLog.provider || 'Chaiyaphum Municipal Smart SMS Gateway'}</span>
                      </div>
                      <div className="sm:col-span-2 text-[11px] text-slate-600 font-mono">
                        <strong>วันเวลาที่ส่ง SMS:</strong> {new Date(selectedSmsLog.sentAt).toLocaleString('th-TH')} น.
                      </div>
                    </div>
                  </div>

                  {/* Phone Mockup Screen View */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <MessageSquareCheck className="w-4 h-4 text-emerald-600" />
                        จำลองหน้าจอข้อความบนสมาร์ทโฟนของผู้รับ (Recipient SMS View)
                      </span>

                      <button
                        onClick={() => handleCopyText(selectedSmsLog.message, selectedSmsLog.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
                      >
                        {copiedId === selectedSmsLog.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            คัดลอกข้อความแล้ว
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            คัดลอกข้อความ SMS
                          </>
                        )}
                      </button>
                    </div>

                    <div className="max-w-sm mx-auto bg-slate-900 p-4 rounded-3xl shadow-2xl border-4 border-slate-800 space-y-3">
                      {/* Phone Screen Header */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-200">เทศบาลเมืองชัยภูมิ (SMS Service)</span>
                        <span className="font-mono text-[10px] text-emerald-400">ONLINE</span>
                      </div>

                      {/* SMS Bubble */}
                      <div className="bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tl-xs shadow-md text-xs leading-relaxed space-y-2">
                        <p>{selectedSmsLog.message}</p>
                        <div className="text-[9px] text-emerald-200 font-mono text-right">
                          {new Date(selectedSmsLog.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. • SMS Delivered
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 text-slate-400">
                  <Smartphone className="w-12 h-12 text-slate-200" />
                  <p className="text-xs">เลือกรายการ SMS จากฝั่งซ้ายมือเพื่อดูจำลองข้อความบนมือถือ</p>
                </div>
              )
            )}
          </div>

        </div>

      </div>

      {/* Direct Test SMS Modal */}
      {showTestSmsModal && (
        <OfficerTestSmsModal
          isOpen={showTestSmsModal}
          onClose={() => {
            setShowTestSmsModal(false);
            reloadLogs();
          }}
          onOpenTemplateEditor={() => setShowTemplateModal(true)}
          requests={getStoredRequests()}
        />
      )}

      {/* SMS Template Settings Modal */}
      {showTemplateModal && (
        <OfficerSmsTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onOpenTestSms={() => {
            setShowTemplateModal(false);
            setShowTestSmsModal(true);
          }}
          requests={getStoredRequests()}
        />
      )}
    </div>
  );
};
