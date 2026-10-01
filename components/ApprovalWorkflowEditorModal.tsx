import React, { useState } from 'react';
import { RequestItem, ApprovalStep, ApprovalWorkflow } from '../types/request';
import { WORKFLOW_TEMPLATES, createDefaultWorkflowFromTemplate } from '../data/approvalTemplates';
import { updateApprovalWorkflow, getApproverRoster, saveApproverRoster, ApproverPerson } from '../utils/storage';
import { 
  X, 
  Plus, 
  Trash2, 
  Layers, 
  Check, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  FileText,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Mail,
  MessageSquare,
  User,
  Briefcase,
  CheckSquare,
  Send,
  Users,
  UserPlus
} from 'lucide-react';

interface ApprovalWorkflowEditorModalProps {
  request: RequestItem;
  officerName: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const ApprovalWorkflowEditorModal: React.FC<ApprovalWorkflowEditorModalProps> = ({
  request,
  officerName,
  onClose,
  onSaveSuccess,
}) => {
  const existingWf = request.approvalWorkflow;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(existingWf?.templateId || 'wf-enterprise-10');
  const [templateName, setTemplateName] = useState<string>(existingWf?.templateName || 'เส้นทางการอนุมัติกำหนดเอง');
  
  const [steps, setSteps] = useState<ApprovalStep[]>(
    existingWf?.steps && existingWf.steps.length > 0
      ? existingWf.steps
      : createDefaultWorkflowFromTemplate('wf-enterprise-10').steps
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Approver Roster state
  const [roster, setRoster] = useState<ApproverPerson[]>(getApproverRoster());
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPos, setNewPersonPos] = useState('');
  const [newPersonDept, setNewPersonDept] = useState('เทศบาลเมืองชัยภูมิ');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonLine, setNewPersonLine] = useState('');

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const generated = createDefaultWorkflowFromTemplate(tplId);
    setTemplateName(generated.templateName || 'แม่แบบการอนุมัติ');
    setSteps(generated.steps);
    setMsg(`โหลดแม่แบบการอนุมัติ ${generated.steps.length} ขั้นตอนเรียบร้อยแล้ว`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSelectFromRoster = (stepIndex: number, personId: string) => {
    if (!personId) return;
    const person = roster.find(p => p.id === personId);
    if (!person) return;

    const newSteps = [...steps];
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      approverName: person.name,
      approverPosition: person.position,
      approverEmail: person.email,
      approverLineId: person.lineId,
      roleTitle: newSteps[stepIndex].roleTitle || `${stepIndex + 1}. ${person.position}`
    };
    setSteps(newSteps);
    setMsg(`เลือก ${person.name} (${person.position}) เข้าในขั้นตอนที่ ${stepIndex + 1} แล้ว`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleAddNewPersonToRoster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุล ผู้อนุมัติ');
      return;
    }

    const newPerson: ApproverPerson = {
      id: `appr-custom-${Date.now()}`,
      name: newPersonName.trim(),
      position: newPersonPos.trim() || 'ผู้รับผิดชอบการอนุมัติ',
      department: newPersonDept.trim() || 'เทศบาลเมืองชัยภูมิ',
      email: newPersonEmail.trim(),
      lineId: newPersonLine.trim(),
      phone: '',
      level: roster.length + 1
    };

    const updatedRoster = [...roster, newPerson];
    setRoster(updatedRoster);
    saveApproverRoster(updatedRoster);

    setNewPersonName('');
    setNewPersonPos('');
    setNewPersonEmail('');
    setNewPersonLine('');
    setShowAddPersonForm(false);
    setMsg(`เพิ่มรายชื่อ ${newPerson.name} ลงในสมุดรายนามผู้อนุมัติเรียบร้อยแล้ว`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleAddStep = () => {
    const nextNumber = steps.length + 1;
    const newStep: ApprovalStep = {
      id: `step-${nextNumber}-${Date.now()}`,
      stepNumber: nextNumber,
      roleTitle: `${nextNumber}. ผู้พิจารณา/ผู้อนุมัติขั้นที่ ${nextNumber}`,
      approverName: '',
      approverPosition: 'ตำแหน่งผู้ปฏิบัติงาน',
      approverEmail: '',
      approverLineId: '',
      approvalAction: 'พิจารณาอนุมัติและเสนอขั้นถัดไป',
      status: 'pending'
    };
    setSteps([...steps, newStep]);
    setMsg(`เพิ่มขั้นตอนที่ ${nextNumber} เรียบร้อยแล้ว (ปัจจุบันมี ${nextNumber} ขั้นตอน)`);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('ผังการอนุมัติอย่างน้อยต้องมี 1 ขั้นตอน');
      return;
    }
    const updated = steps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));
    setSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Recalculate step numbers
    const reordered = newSteps.map((s, idx) => ({
      ...s,
      stepNumber: idx + 1
    }));
    setSteps(reordered);
  };

  const handleUpdateStepField = (index: number, field: keyof ApprovalStep, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value
    };
    setSteps(newSteps);
  };

  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (steps.length === 0) {
      alert('กรุณาเพิ่มอย่างน้อย 1 ขั้นตอนการอนุมัติ');
      return;
    }

    setSaving(true);

    const newWorkflow: ApprovalWorkflow = {
      templateId: selectedTemplateId,
      templateName: (templateName || '').trim() || `ผังการอนุมัติ (${steps.length} ขั้นตอน)`,
      steps,
      currentStepIndex: existingWf?.currentStepIndex || 0
    };

    setTimeout(() => {
      updateApprovalWorkflow(
        request.id,
        newWorkflow,
        officerName || 'เจ้าหน้าที่ผู้จัดการผังการอนุมัติ',
        `ปรับแต่งผังการอนุมัติเป็น ${steps.length} ขั้นตอน`
      );

      setSaving(false);
      onSaveSuccess();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                ตั้งค่าและจัดการขั้นตอนการอนุมัติ (Multi-Step Approval Editor)
              </h3>
              <p className="text-xs text-blue-200">
                รองรับกระบวนการอนุมัติมากกว่า 8 คน/ขั้นตอน เพิ่ม-ลด และปรับเปลี่ยนลำดับผู้มีอำนาจลงนามได้ยืดหยุ่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveWorkflow} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {msg && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {msg}
            </div>
          )}

          {/* Approver Roster Management Section for Admin */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  สมุดรายนามและตำแหน่งผู้อนุมัติประจำเทศบาล ({roster.length} รายชื่อ)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPersonForm(!showAddPersonForm)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มรายชื่อผู้อนุมัติคนใหม่</span>
              </button>
            </div>

            {/* Quick Roster Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {roster.map(p => (
                <div
                  key={p.id}
                  className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-2 text-slate-200"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <div>
                    <span className="font-bold text-white block text-[11px]">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{p.position}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Person Form Drawer */}
            {showAddPersonForm && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 mt-2 animate-fade-in text-xs">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  เพิ่มรายชื่อผู้อนุมัติเข้าสู่ระบบกลางเทศบาล
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      ชื่อ-นามสกุล ผู้อนุมัติ *
                    </label>
                    <input
                      type="text"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="เช่น ดร.สมเกียรติ สุขเจริญ"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      ตำแหน่งทางราชการ *
                    </label>
                    <input
                      type="text"
                      value={newPersonPos}
                      onChange={(e) => setNewPersonPos(e.target.value)}
                      placeholder="เช่น หัวหน้าฝ่ายป้องกันและบรรเทาสาธารณภัย"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      อีเมลสำหรับแจ้งขออนุมัติ
                    </label>
                    <input
                      type="email"
                      value={newPersonEmail}
                      onChange={(e) => setNewPersonEmail(e.target.value)}
                      placeholder="เช่น officer@chaiyaphum.go.th"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      ไอดีไลน์ (LINE ID)
                    </label>
                    <input
                      type="text"
                      value={newPersonLine}
                      onChange={(e) => setNewPersonLine(e.target.value)}
                      placeholder="เช่น @officer_line"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewPersonToRoster}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs shadow-md"
                  >
                    บันทึกรายชื่อผู้อนุมัติ
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preset Workflow Templates */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              เลือกแม่แบบขั้นตอนการอนุมัติ (Predefined Approval Templates)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {WORKFLOW_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 mb-1">
                    <span>{tpl.name}</span>
                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                      {tpl.stepCount} ขั้นตอน
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Name Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ชื่อเส้นทางการอนุมัติ
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="เช่น ผังการอนุมัติโครงการปรับปรุงอาคารสถานที่"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs text-slate-500 block">จำนวนขั้นตอนปัจจุบัน</span>
                <span className="text-lg font-extrabold text-blue-700">
                  {steps.length} ขั้นตอนอนุมัติ {steps.length > 8 && <span className="text-xs font-semibold text-emerald-600">(รองรับอนุมัติมากกว่า 8 คน)</span>}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                เพิ่มขั้นตอนผู้อนุมัติ (+1)
              </button>
            </div>
          </div>

          {/* Steps List Table / Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>รายการขั้นตอนและผู้อนุมัติในระบบ ({steps.length} คน)</span>
              <span className="text-slate-500 font-normal">เรียงตามลำดับจากบนลงล่าง</span>
            </div>

            <div className="space-y-3">
              {steps.map((st, index) => (
                <div
                  key={st.id || index}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center font-extrabold text-xs shadow-xs">
                        {st.stepNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        ขั้นตอนที่ {st.stepNumber} จาก {steps.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        title="ขยับขึ้น"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'down')}
                        disabled={index === steps.length - 1}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        title="ขยับลง"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                        title="ลบขั้นตอนนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Form Fields */}
                  <div className="space-y-3">
                    {/* Quick Roster Selector Dropdown */}
                    <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-extrabold text-blue-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        เลือกรายชื่อผู้อนุมัติจากสมุดรายนามเทศบาล:
                      </label>
                      <select
                        onChange={(e) => handleSelectFromRoster(index, e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 max-w-sm w-full sm:w-auto shadow-2xs"
                      >
                        <option value="">-- คลิกเพื่อเลือกผู้อนุมัติประจำขั้น --</option>
                        {roster.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} ({person.position} - {person.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Row 1: Role, Name, Position */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          หัวข้อ/ชื่อขั้นตอน
                        </label>
                        <input
                          type="text"
                          value={st.roleTitle}
                          onChange={(e) => handleUpdateStepField(index, 'roleTitle', e.target.value)}
                          placeholder="เช่น 1. หัวหน้าฝ่ายปกครองเห็นควรอนุมัติ"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          ชื่อ-นามสกุล ผู้อนุมัติ *
                        </label>
                        <input
                          type="text"
                          value={st.approverName}
                          onChange={(e) => handleUpdateStepField(index, 'approverName', e.target.value)}
                          placeholder="เช่น นายสรพงษ์ เทศกิจดี"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-blue-50/30"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          ตำแหน่งผู้อนุมัติ *
                        </label>
                        <input
                          type="text"
                          value={st.approverPosition}
                          onChange={(e) => handleUpdateStepField(index, 'approverPosition', e.target.value)}
                          placeholder="เช่น หัวหน้าฝ่ายปกครอง, นายกเทศมนตรี"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-blue-50/30"
                        />
                      </div>
                    </div>

                    {/* Row 2: Approval Action, Email, LINE ID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mb-1">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          การอนุมัติ สำหรับผู้อนุมัติ
                        </label>
                        <input
                          type="text"
                          value={st.approvalAction || ''}
                          onChange={(e) => handleUpdateStepField(index, 'approvalAction', e.target.value)}
                          placeholder="เช่น อนุมัติ / ไม่อนุมัติ / ส่งกลับแก้ไข"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mb-1">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          อีเมลสำหรับส่งขออนุมัติคำร้อง
                        </label>
                        <input
                          type="email"
                          value={st.approverEmail || ''}
                          onChange={(e) => handleUpdateStepField(index, 'approverEmail', e.target.value)}
                          placeholder="เช่น approver@chaiyaphum.go.th"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          ไอดีไลน์ส่งขออนุมัติคำร้อง
                        </label>
                        <input
                          type="text"
                          value={st.approverLineId || ''}
                          onChange={(e) => handleUpdateStepField(index, 'approverLineId', e.target.value)}
                          placeholder="เช่น @chaiyaphum_cctv หรือ line_id"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleApplyTemplate('wf-enterprise-10')}
              className="text-slate-600 hover:text-slate-800 text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              คืนค่าแม่แบบเริ่มต้น (10 ขั้นตอน)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : `บันทึกผังการอนุมัติ (${steps.length} ขั้นตอน)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
