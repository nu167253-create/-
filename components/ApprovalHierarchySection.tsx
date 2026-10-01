import React, { useState, useEffect } from 'react';
import { RequestItem, ApprovalStep } from '../types/request';
import { getApproverRoster, saveApproverRoster, ApproverPerson, dispatchRequestToNextLevel, getStoredRequests } from '../utils/storage';
import { AdminApproversManagementModal } from './AdminApproversManagementModal';
import { 
  GitMerge, 
  Layers, 
  UserCheck, 
  Plus, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  X, 
  Edit3, 
  Save, 
  UserPlus, 
  FileText, 
  ShieldAlert, 
  Mail, 
  MessageSquare,
  Building2,
  BadgeCheck,
  Users
} from 'lucide-react';

export interface HierarchyChain {
  id: string;
  categoryKey: string; // e.g. 'standard', 'police_legal', 'emergency', 'data_export'
  categoryNameTh: string;
  descriptionTh: string;
  badgeColor: string;
  steps: {
    level: number;
    roleTitle: string;
    approverName: string;
    approverPosition: string;
    department: string;
    approverEmail?: string;
    approverLineId?: string;
    isRequired: boolean;
  }[];
}

const STORAGE_KEY_HIERARCHIES = 'cctv_approval_hierarchies_v1';

export const DEFAULT_HIERARCHIES: HierarchyChain[] = [
  {
    id: 'chain-std',
    categoryKey: 'standard',
    categoryNameTh: 'คำร้องขอตรวจสอบภาพทั่วไป (บุคคลทั่วไป / ประชาชน)',
    descriptionTh: 'ลำดับขั้นตอนการพิจารณาอนุมัติคำร้องขอดูภาพกล้อง CCTV จากประชาชนทั่วไป',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    steps: [
      {
        level: 1,
        roleTitle: '1. เจ้าหน้าที่ลงรับเรื่องสารบรรณ',
        approverName: 'นายสรพงษ์ เทศกิจดี',
        approverPosition: 'เจ้าหน้าที่งานสารบรรณ / งานกล้องวงจรปิด',
        department: 'ศูนย์ควบคุมกล้อง CCTV เทศบาลเมืองชัยภูมิ',
        approverEmail: 'sarapong.cctv@chaiyaphum.go.th',
        approverLineId: '@cctv_chaiyaphum',
        isRequired: true
      },
      {
        level: 2,
        roleTitle: '2. หัวหน้าศูนย์ควบคุมกล้อง CCTV',
        approverName: 'นายวิเชียร ชัยภูมิพัฒนา',
        approverPosition: 'หัวหน้าศูนย์ควบคุมกล้องวงจรปิด CCTV',
        department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
        approverEmail: 'wichean.cctv@chaiyaphum.go.th',
        approverLineId: '@wichean_cctv',
        isRequired: true
      },
      {
        level: 3,
        roleTitle: '3. นิติกร / หัวหน้าฝ่ายปกครอง',
        approverName: 'นางสาวนภา แจ่มใส',
        approverPosition: 'หัวหน้าฝ่ายปกครองและงานนิติการ',
        department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
        approverEmail: 'napa.legal@chaiyaphum.go.th',
        approverLineId: '@napa_legal',
        isRequired: true
      },
      {
        level: 4,
        roleTitle: '4. ผู้อำนวยการกองช่าง',
        approverName: 'ดร.สมชาย ทรัพย์มั่นคง',
        approverPosition: 'ผู้อำนวยการกองช่าง',
        department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
        approverEmail: 'somchai.director@chaiyaphum.go.th',
        approverLineId: '@somchai_cctv',
        isRequired: true
      },
      {
        level: 5,
        roleTitle: '5. ปลัดเทศบาลเมืองชัยภูมิ',
        approverName: 'นายกิตติศักดิ์ บริหารเมือง',
        approverPosition: 'ปลัดเทศบาลเมืองชัยภูมิ',
        department: 'สำนักงานปลัดเทศบาล',
        approverEmail: 'kittisak.deputy@chaiyaphum.go.th',
        approverLineId: '@kittisak_city',
        isRequired: true
      },
      {
        level: 6,
        roleTitle: '6. นายกเทศมนตรีเมืองชัยภูมิ',
        approverName: 'นายสมพร พัฒนาเมืองชัย',
        approverPosition: 'นายกเทศมนตรีเมืองชัยภูมิ',
        department: 'เทศบาลเมืองชัยภูมิ',
        approverEmail: 'mayor@chaiyaphum.go.th',
        approverLineId: '@mayor_chaiyaphum',
        isRequired: false
      }
    ]
  },
  {
    id: 'chain-police',
    categoryKey: 'police_legal',
    categoryNameTh: 'คำร้องเพื่อประกอบคดีอาญา / หน่วยงานราชการ / ตำรวจ',
    descriptionTh: 'ลำดับขั้นตอนเร่งด่วนสำหรับการประสานงานเจ้าหน้าที่ตำรวจและพนักงานสอบสวน',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    steps: [
      {
        level: 1,
        roleTitle: '1. เจ้าหน้าที่ลงรับเรื่องสารบรรณ',
        approverName: 'นายสรพงษ์ เทศกิจดี',
        approverPosition: 'เจ้าหน้าที่งานสารบรรณ / งานกล้องวงจรปิด',
        department: 'ศูนย์ควบคุมกล้อง CCTV เทศบาลเมืองชัยภูมิ',
        approverEmail: 'sarapong.cctv@chaiyaphum.go.th',
        approverLineId: '@cctv_chaiyaphum',
        isRequired: true
      },
      {
        level: 2,
        roleTitle: '2. นิติกรตรวจสอบความถูกต้องทางกฎหมาย',
        approverName: 'นางสาวนภา แจ่มใส',
        approverPosition: 'หัวหน้าฝ่ายปกครองและงานนิติการ',
        department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
        approverEmail: 'napa.legal@chaiyaphum.go.th',
        approverLineId: '@napa_legal',
        isRequired: true
      },
      {
        level: 3,
        roleTitle: '3. ผู้อำนวยการกองช่าง (อนุมัติส่งมอบข้อมูล)',
        approverName: 'ดร.สมชาย ทรัพย์มั่นคง',
        approverPosition: 'ผู้อำนวยการกองช่าง',
        department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
        approverEmail: 'somchai.director@chaiyaphum.go.th',
        approverLineId: '@somchai_cctv',
        isRequired: true
      },
      {
        level: 4,
        roleTitle: '4. ปลัดเทศบาลปฏิบัติราชการแทน',
        approverName: 'นายกิตติศักดิ์ บริหารเมือง',
        approverPosition: 'ปลัดเทศบาลเมืองชัยภูมิ',
        department: 'สำนักงานปลัดเทศบาล',
        approverEmail: 'kittisak.deputy@chaiyaphum.go.th',
        approverLineId: '@kittisak_city',
        isRequired: true
      }
    ]
  },
  {
    id: 'chain-emergency',
    categoryKey: 'emergency',
    categoryNameTh: 'กรณีฉุกเฉิน / อุบัติภัยร้ายแรง / พิเศษ',
    descriptionTh: 'ลำดับอนุมัติแบบทางด่วน (Fast-track) สำหรับสถานการณ์วิกฤต',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    steps: [
      {
        level: 1,
        roleTitle: '1. เจ้าหน้าที่ศูนย์ควบคุม CCTV',
        approverName: 'นายสรพงษ์ เทศกิจดี',
        approverPosition: 'เจ้าหน้าที่งานสารบรรณ / งานกล้องวงจรปิด',
        department: 'ศูนย์ควบคุมกล้อง CCTV เทศบาลเมืองชัยภูมิ',
        approverEmail: 'sarapong.cctv@chaiyaphum.go.th',
        approverLineId: '@cctv_chaiyaphum',
        isRequired: true
      },
      {
        level: 2,
        roleTitle: '2. หัวหน้าศูนย์ควบคุมกล้อง CCTV',
        approverName: 'นายวิเชียร ชัยภูมิพัฒนา',
        approverPosition: 'หัวหน้าศูนย์ควบคุมกล้องวงจรปิด CCTV',
        department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
        approverEmail: 'wichean.cctv@chaiyaphum.go.th',
        approverLineId: '@wichean_cctv',
        isRequired: true
      },
      {
        level: 3,
        roleTitle: '3. ผู้อำนวยการกองช่าง (อนุมัติทันที)',
        approverName: 'ดร.สมชาย ทรัพย์มั่นคง',
        approverPosition: 'ผู้อำนวยการกองช่าง',
        department: 'กองช่าง เทศบาลเมืองชัยภูมิ',
        approverEmail: 'somchai.director@chaiyaphum.go.th',
        approverLineId: '@somchai_cctv',
        isRequired: true
      }
    ]
  }
];

export function getStoredHierarchies(): HierarchyChain[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HIERARCHIES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Failed to load approval hierarchies:', err);
  }
  return DEFAULT_HIERARCHIES;
}

export function saveStoredHierarchies(chains: HierarchyChain[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HIERARCHIES, JSON.stringify(chains));
  } catch (err) {
    console.error('Failed to save approval hierarchies:', err);
  }
}

interface ApprovalHierarchySectionProps {
  adminName: string;
  onRequestUpdated?: () => void;
}

export const ApprovalHierarchySection: React.FC<ApprovalHierarchySectionProps> = ({
  adminName,
  onRequestUpdated
}) => {
  const [hierarchies, setHierarchies] = useState<HierarchyChain[]>(getStoredHierarchies());
  const [activeChainId, setActiveChainId] = useState<string>(hierarchies[0]?.id || 'chain-std');
  const [roster, setRoster] = useState<ApproverPerson[]>(getApproverRoster());

  // Pending requests state
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing chain step state
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showApproversModal, setShowApproversModal] = useState(false);

  // Dispatch popup state
  const [dispatchNote, setDispatchNote] = useState('');
  const [targetStepIndex, setTargetStepIndex] = useState<number>(0);
  const [isDispatching, setIsDispatching] = useState(false);

  useEffect(() => {
    reloadRequestsList();
  }, []);

  const reloadRequestsList = () => {
    const all = getStoredRequests();
    setRequests(all);
    if (!selectedReqId && all.length > 0) {
      const pending = all.find(r => r.status === 'submitted' || r.status === 'under_review');
      setSelectedReqId(pending ? pending.id : all[0].id);
    }
  };

  const activeChain = hierarchies.find(h => h.id === activeChainId) || hierarchies[0];
  const selectedReq = requests.find(r => r.id === selectedReqId);

  // Handle step modification in active hierarchy chain
  const handleUpdateStepPerson = (chainIndex: number, stepIndex: number, personId: string) => {
    const person = roster.find(p => p.id === personId);
    if (!person) return;

    const updated = [...hierarchies];
    const steps = [...updated[chainIndex].steps];
    steps[stepIndex] = {
      ...steps[stepIndex],
      approverName: person.name,
      approverPosition: person.position,
      department: person.department,
      approverEmail: person.email,
      approverLineId: person.lineId
    };
    updated[chainIndex].steps = steps;
    setHierarchies(updated);
    saveStoredHierarchies(updated);

    setMsg(`อัปเดตผู้อนุมัติขั้นที่ ${stepIndex + 1} เป็น ${person.name} เรียบร้อยแล้ว`);
    setTimeout(() => setMsg(null), 3500);
  };

  const handleAddStepToChain = (chainIndex: number) => {
    const updated = [...hierarchies];
    const steps = [...updated[chainIndex].steps];
    const nextLevel = steps.length + 1;

    const defaultPerson = roster[Math.min(nextLevel - 1, roster.length - 1)] || roster[0];

    steps.push({
      level: nextLevel,
      roleTitle: `${nextLevel}. ${defaultPerson?.position || 'ตำแหน่งผู้อนุมัติประจำขั้น'}`,
      approverName: defaultPerson?.name || 'ระบุชื่อผู้อนุมัติ',
      approverPosition: defaultPerson?.position || 'ตำแหน่งทางราชการ',
      department: defaultPerson?.department || 'เทศบาลเมืองชัยภูมิ',
      approverEmail: defaultPerson?.email,
      approverLineId: defaultPerson?.lineId,
      isRequired: true
    });

    updated[chainIndex].steps = steps;
    setHierarchies(updated);
    saveStoredHierarchies(updated);

    setMsg(`เพิ่มขั้นตอนการอนุมัติลำดับที่ ${nextLevel} สำเร็จ`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleRemoveStepFromChain = (chainIndex: number, stepIndex: number) => {
    const updated = [...hierarchies];
    const steps = updated[chainIndex].steps.filter((_, idx) => idx !== stepIndex);

    // re-index levels
    const reindexed = steps.map((st, idx) => ({
      ...st,
      level: idx + 1,
      roleTitle: st.roleTitle.replace(/^\d+\./, `${idx + 1}.`)
    }));

    updated[chainIndex].steps = reindexed;
    setHierarchies(updated);
    saveStoredHierarchies(updated);

    setMsg(`ลบขั้นตอนลำดับที่ ${stepIndex + 1} เรียบร้อยแล้ว`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDispatchCurrentSelectedReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsDispatching(true);

    setTimeout(() => {
      const updated = dispatchRequestToNextLevel(
        selectedReq.id,
        adminName || 'Admin ผู้จัดการคำร้อง',
        dispatchNote.trim(),
        targetStepIndex
      );

      setIsDispatching(false);

      if (updated) {
        setMsg(`ส่งคำร้อง ${selectedReq.trackingCode} ไปยังขั้นตอนลำดับที่ ${targetStepIndex + 1} เรียบร้อยแล้ว`);
        setTimeout(() => setMsg(null), 4000);
        setDispatchNote('');
        reloadRequestsList();
        if (onRequestUpdated) onRequestUpdated();
      }
    }, 400);
  };

  const filteredRequests = requests.filter(r => {
    const query = (searchTerm || '').toLowerCase();
    return (
      (r.trackingCode || '').toLowerCase().includes(query) ||
      (r.subject || '').toLowerCase().includes(query) ||
      (r.applicant?.firstName || '').toLowerCase().includes(query) ||
      (r.applicant?.lastName || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/30 text-blue-300 rounded-xl border border-blue-400/30 shrink-0">
              <GitMerge className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-lg text-white">
              ระบบกำหนดลำดับชั้นการอนุมัติคำร้อง (Approval Hierarchy Routing)
            </h2>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
               Admin Configured
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            กำหนดสายงานการบังคับบัญชาและลำดับการพิจารณาอนุมัติคำร้องแบบลำดับขั้น (Sequential Routing Chain) จำแนกตามประเภทคำร้อง พร้อมการติดตาม Visual Routing Path สำหรับคำร้องคงค้าง
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowApproversModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg transition-all cursor-pointer border border-purple-400/40 active:scale-95"
          >
            <Users className="w-4 h-4 text-purple-200" />
            <span>👥 จัดการผู้มีสิทธิ์อนุมัติ & กำหนดสิทธิ์</span>
          </button>

          <div className="flex items-center gap-2 text-xs bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">ผู้จัดการสายงานอนุมัติ:</span>
              <span className="font-bold text-white">{adminName || 'Admin เทศบาลเมืองชัยภูมิ'}</span>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Grid Layout: Left Column = Hierarchy Chains Config, Right Column = Visual Routing Path Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: Hierarchy Chain Selector & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  ตั้งค่าผังลำดับชั้นอนุมัติประจำหมวดหมู่คำร้อง
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {hierarchies.length} รูปแบบสายการพิจารณา
              </span>
            </div>

            {/* Category Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {hierarchies.map((chain, idx) => {
                const isActive = chain.id === activeChainId;
                return (
                  <button
                    key={chain.id}
                    onClick={() => setActiveChainId(chain.id)}
                    className={`px-3.5 py-2 rounded-2xl font-extrabold text-xs transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{chain.categoryNameTh.split('(')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Chain Overview Card */}
            {activeChain && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border mb-1 ${activeChain.badgeColor}`}>
                      ผังอนุมัติแบบลำดับขั้น
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {activeChain.categoryNameTh}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeChain.descriptionTh}
                    </p>
                  </div>

                  <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-xl shrink-0">
                    {activeChain.steps.length} ขั้นตอน
                  </span>
                </div>

                {/* Sequential Step Nodes List */}
                <div className="space-y-3 pt-2">
                  {activeChain.steps.map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-blue-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {st.level}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">
                              {st.roleTitle}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {st.department}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveStepFromChain(
                              hierarchies.findIndex(h => h.id === activeChain.id),
                              sIdx
                            )}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="ลบขั้นตอนนี้ออกจากสายการอนุมัติ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Assigned Person Select Box */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-extrabold text-slate-900 block text-[11px]">
                              {st.approverName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ตำแหน่ง: {st.approverPosition}
                            </span>
                          </div>
                        </div>

                        {/* Roster Picker Dropdown */}
                        <select
                          onChange={(e) => handleUpdateStepPerson(
                            hierarchies.findIndex(h => h.id === activeChain.id),
                            sIdx,
                            e.target.value
                          )}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- เปลี่ยนผู้อนุมัติจากสมุดรายนาม --</option>
                          {roster.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.position})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Contact Channels */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-0.5">
                        {st.approverEmail && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3 text-blue-500" /> {st.approverEmail}
                          </span>
                        )}
                        {st.approverLineId && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <MessageSquare className="w-3 h-3 text-emerald-500" /> {st.approverLineId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Step Button */}
                <button
                  type="button"
                  onClick={() => handleAddStepToChain(
                    hierarchies.findIndex(h => h.id === activeChain.id)
                  )}
                  className="w-full py-2.5 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-700 font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-blue-50/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มขั้นการอนุมัติในสายนี้</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT PANEL: Live Routing Path Monitor for Pending Applications (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  ติดตามเส้นทางคำร้องตามลำดับขั้น (Live Routing Monitor)
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length} คำร้องรอดำเนินการ
              </span>
            </div>

            {/* Search Box for Requests */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาตามรหัสคำร้อง, ชื่อผู้ยื่น หรือเรื่อง..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select Request Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">
                เลือกคำร้องเพื่อดู Visual Routing Path:
              </label>
              <select
                value={selectedReqId || ''}
                onChange={(e) => {
                  setSelectedReqId(e.target.value);
                  setTargetStepIndex(0);
                }}
                className="w-full p-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {filteredRequests.map(r => (
                  <option key={r.id} value={r.id}>
                    [{r.trackingCode}] {r.subject} - {r.applicant?.firstName} ({r.status === 'submitted' ? 'ยื่นใหม่' : r.status === 'under_review' ? 'กำลังพิจารณา' : r.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Routing Path Stepper */}
            {selectedReq ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                
                {/* Selected Request Brief Badge */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-700">
                      รหัส: {selectedReq.trackingCode}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                      {selectedReq.createdAt?.split('T')[0]}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                    {selectedReq.subject}
                  </h4>
                  <div className="text-[11px] text-slate-500">
                    ผู้ยื่น: <span className="font-semibold text-slate-800">{selectedReq.applicant?.prefix}{selectedReq.applicant?.firstName} {selectedReq.applicant?.lastName}</span>
                  </div>
                </div>

                {/* Routing Stepper Nodes */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <GitMerge className="w-3.5 h-3.5 text-blue-600" />
                    ผังแสดงเส้นทางการวิ่งของคำร้อง (Routing Stepper):
                  </span>

                  {selectedReq.approvalWorkflow?.steps && selectedReq.approvalWorkflow.steps.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300">
                      {selectedReq.approvalWorkflow.steps.map((step, idx) => {
                        const currentIdx = selectedReq.approvalWorkflow?.currentStepIndex ?? 0;
                        const isCompleted = step.status === 'approved';
                        const isCurrent = currentIdx === idx;

                        return (
                          <div key={step.id || idx} className="relative">
                            {/* Step Node Dot */}
                            <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                : isCurrent
                                ? 'bg-amber-400 border-amber-600 text-slate-900 animate-pulse ring-4 ring-amber-100'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}>
                              {isCompleted ? '✓' : idx + 1}
                            </div>

                            <div className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                              isCurrent
                                ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                                : isCompleted
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 text-xs">
                                  {step.roleTitle}
                                </span>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isCurrent
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isCompleted ? 'อนุมัติแล้ว' : isCurrent ? 'กำลังอยู่ ณ ขั้นนี้' : 'รอส่งถึง'}
                                </span>
                              </div>

                              <div className="text-[11px] font-bold text-slate-700">
                                ผู้อนุมัติประจำขั้น: {step.approverName || 'เจ้าหน้าที่ประจำขั้น'} ({step.approverPosition || '-'})
                              </div>

                              {step.actionDate && (
                                <div className="text-[10px] text-emerald-700 font-mono">
                                  อนุมัติเมื่อ: {new Date(step.actionDate).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                      ยังไม่ได้ผูกผังการอนุมัติกับคำร้องนี้ สามารถเลือกผูกผังจากเมนูด้านซ้ายได้
                    </div>
                  )}
                </div>

                {/* Dispatch Form Box */}
                <form onSubmit={handleDispatchCurrentSelectedReq} className="p-3.5 bg-blue-900 text-white rounded-2xl space-y-3">
                  <div className="font-bold text-xs text-blue-200 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-emerald-400" />
                    ส่งเสนอคำร้องไปยังผู้อนุมัติตามลำดับขั้น (Forward Step)
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      ระบุระดับขั้นปลายทางที่จะเสนอคำร้องไป:
                    </label>
                    <select
                      value={targetStepIndex}
                      onChange={(e) => setTargetStepIndex(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-400 font-semibold"
                    >
                      {selectedReq.approvalWorkflow?.steps?.map((s, idx) => (
                        <option key={s.id || idx} value={idx}>
                          ส่งไป ขั้นที่ {idx + 1}: {s.roleTitle} ({s.approverName || 'ผู้อนุมัติประจำขั้น'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      บันทึกเสนอเรื่อง / คำสั่งการ:
                    </label>
                    <input
                      type="text"
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      placeholder="เช่น เสนอเพื่อโปรดพิจารณาอนุมัติคำร้องขอเปิดกล้องวงจรปิด"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isDispatching}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isDispatching ? 'กำลังส่งคำร้อง...' : 'ส่งเสนอคำร้องตามลำดับขั้น'}</span>
                  </button>
                </form>

              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                ไม่พบคำร้องที่เลือก
              </div>
            )}

          </div>
        </div>

      </div>

      {showApproversModal && (
        <AdminApproversManagementModal
          isOpen={showApproversModal}
          onClose={() => setShowApproversModal(false)}
          adminName={adminName || 'Admin เทศบาลเมืองชัยภูมิ'}
          onApproversUpdated={() => {
            setRoster(getApproverRoster());
            reloadRequestsList();
            if (onRequestUpdated) {
              onRequestUpdated();
            }
            setMsg('อัปเดตข้อมูลผู้มีสิทธิ์อนุมัติและสิทธิ์การพิจารณาเรียบร้อยแล้ว');
            setTimeout(() => setMsg(null), 4000);
          }}
        />
      )}

    </div>
  );
};
