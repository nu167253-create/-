import React, { useState, useEffect } from 'react';
import { 
  ApplicantRolePermission, 
  ApplicantRoleId 
} from '../types/permissions';
import { 
  getStoredApplicantPermissions, 
  saveApplicantPermissions, 
  resetApplicantPermissionsToDefault 
} from '../utils/permissionsStorage';
import { RequestCategory, PriorityLevel } from '../types/request';
import { REQUEST_CATEGORIES } from '../data/categories';
import { 
  ShieldCheck, 
  Users, 
  User, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  CheckCircle2, 
  X, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  FileCheck, 
  Calendar, 
  Wrench, 
  Receipt, 
  HelpCircle,
  FileText,
  Lock,
  Unlock,
  KeyRound,
  FileUp,
  PenTool,
  Slash,
  Eye,
  Sparkles
} from 'lucide-react';

interface ApplicantPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
}

export const ApplicantPermissionsModal: React.FC<ApplicantPermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated
}) => {
  const [permissions, setPermissions] = useState<ApplicantRolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<ApplicantRoleId>('general_public');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermissions(getStoredApplicantPermissions());
      setSaveSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRolePerm = permissions.find(p => p.roleId === selectedRoleId) || permissions[0];

  const getRoleIcon = (roleId: ApplicantRoleId) => {
    switch (roleId) {
      case 'general_public': return <User className="w-5 h-5 text-slate-600" />;
      case 'student': return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case 'staff': return <Briefcase className="w-5 h-5 text-emerald-600" />;
      case 'external_org': return <Building2 className="w-5 h-5 text-purple-600" />;
      default: return <Users className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleToggleCategory = (category: RequestCategory) => {
    setPermissions(prev => prev.map(p => {
      if (p.roleId === selectedRoleId) {
        const hasCat = p.allowedCategories.includes(category);
        const updatedCats = hasCat 
          ? p.allowedCategories.filter(c => c !== category)
          : [...p.allowedCategories, category];
        
        // Ensure at least 1 category remains allowed
        if (updatedCats.length === 0) return p;

        return { ...p, allowedCategories: updatedCats, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
  };

  const handleUpdateField = <K extends keyof ApplicantRolePermission>(
    field: K, 
    value: ApplicantRolePermission[K]
  ) => {
    setPermissions(prev => prev.map(p => {
      if (p.roleId === selectedRoleId) {
        return { ...p, [field]: value, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
  };

  const handleSaveAll = () => {
    saveApplicantPermissions(permissions);
    setSaveSuccessMsg('บันทึกการตั้งค่าสิทธิ์ผู้ยื่นคำร้องเรียบร้อยแล้ว');
    if (onPermissionsUpdated) onPermissionsUpdated();

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตการตั้งค่าสิทธิ์ผู้ยื่นคำร้องกลับเป็นค่าเริ่มต้นของระบบใช่หรือไม่?')) {
      const defaults = resetApplicantPermissionsToDefault();
      setPermissions(defaults);
      setSaveSuccessMsg('รีเซ็ตสิทธิ์การยื่นคำร้องเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
      if (onPermissionsUpdated) onPermissionsUpdated();
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileCheck': return <FileCheck className="w-4 h-4 text-blue-600" />;
      case 'CalendarLeave': return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'Wrench': return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'ReceiptTh': return <Receipt className="w-4 h-4 text-purple-600" />;
      default: return <HelpCircle className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-xl">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                กำหนดสิทธิ์สำหรับผู้ยื่นคำร้อง (Applicant Access Control)
                <span className="text-xs font-normal text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-700/50">
                  Admin System Rule
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                ตั้งค่าสิทธิ์การเข้าถึงแบบฟอร์ม ข้อจำกัดไฟล์แนบ และเงื่อนไขการอนุมัติจำแนกตามกลุ่มผู้ยื่นคำร้อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body: Role Tabs + Config Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {permissions.map((p) => {
              const isActive = p.roleId === selectedRoleId;
              return (
                <button
                  key={p.roleId}
                  onClick={() => setSelectedRoleId(p.roleId)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                    isActive
                      ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                      {getRoleIcon(p.roleId)}
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        {p.allowedCategories.length} หมวด
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold leading-tight ${isActive ? 'text-blue-950' : 'text-slate-800'}`}>
                      {p.roleTitleTh}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">{p.roleTitleEn}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Role Configuration Section */}
          {currentRolePerm && (
            <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 space-y-6">
              {/* Role Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    {getRoleIcon(currentRolePerm.roleId)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        {currentRolePerm.roleTitleTh}
                      </h4>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${currentRolePerm.badgeColor}`}>
                        {currentRolePerm.roleTitleEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentRolePerm.description}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Role ID: <span className="font-bold text-slate-600">{currentRolePerm.roleId}</span>
                </div>
              </div>

              {/* Category Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    หมวดหมู่คำร้องที่อนุญาตให้ยื่นเรื่องได้ (Allowed Request Categories)
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    คลิกเพื่อเปิด/ปิดสิทธิ์ในแต่ละหมวดหมู่
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {REQUEST_CATEGORIES.map((cat) => {
                    const isAllowed = currentRolePerm.allowedCategories.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isAllowed
                            ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/20 shadow-2xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isAllowed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {getCategoryIcon(cat.iconName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {cat.titleTh}
                            </span>
                            {isAllowed ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Unlock className="w-3 h-3" /> อนุญาต
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Lock className="w-3 h-3" /> ปิดสิทธิ์
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {cat.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* File & Submission Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                {/* File Upload Rules */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <FileUp className="w-4 h-4 text-purple-600" />
                    ข้อกำหนดเกี่ยวกับไฟล์แนบ (Attachment Controls)
                  </h5>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ขนาดไฟล์สูงสุดต่อไฟล์ (Max File Size):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={currentRolePerm.maxFileUploadSizeMB}
                          onChange={(e) => handleUpdateField('maxFileUploadSizeMB', Math.max(1, parseInt(e.target.value) || 10))}
                          className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-semibold text-slate-600">MB (เมกะไบต์)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        จำนวนไฟล์แนบสูงสุดต่อคำร้อง (Max Attachments):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={currentRolePerm.maxAttachmentsCount}
                          onChange={(e) => handleUpdateField('maxAttachmentsCount', Math.max(1, parseInt(e.target.value) || 5))}
                          className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-semibold text-slate-600">ไฟล์</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ระดับความเร่งด่วนสูงสุดที่เลือกได้ (Max Allowed Priority):
                      </label>
                      <select
                        value={currentRolePerm.maxPriorityLevel}
                        onChange={(e) => handleUpdateField('maxPriorityLevel', e.target.value as PriorityLevel)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="normal">ปกติ (Normal Only)</option>
                        <option value="urgent">ปกติ + ด่วน (Up to Urgent)</option>
                        <option value="very_urgent">ทุกระดับ (สูงสุด: ด่วนที่สุด / Very Urgent)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Specific Action Toggles */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <PenTool className="w-4 h-4 text-amber-600" />
                    เงื่อนไขและสิทธิ์พิเศษ (Special Privileges & Rules)
                  </h5>

                  <div className="space-y-2.5">
                    {/* Require Digital Signature */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          บังคับแนบลายเซ็นดิจิทัล (Require Signature)
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          ผู้ยื่นต้องจรดลายเซ็นอิเล็กทรอนิกส์ก่อนบันทึกยื่นเรื่อง
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentRolePerm.requireDigitalSignature}
                        onChange={(e) => handleUpdateField('requireDigitalSignature', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    {/* Self Cancellation */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          สิทธิ์ยกเลิกคำร้องด้วยตนเอง (Self Cancellation)
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          สามารถกดปุ่มยกเลิกคำร้องได้ขณะอยู่ในสถานะ "ยื่นคำร้องแล้ว"
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentRolePerm.allowSelfCancellation}
                        onChange={(e) => handleUpdateField('allowSelfCancellation', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    {/* CCTV Repair Access */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          สิทธิ์แจ้งซ่อมระบบกล้องวงจรปิด CCTV
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          เข้าถึงแบบฟอร์มส่งซ่อมกล้อง CCTV ประจำอาคาร
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentRolePerm.canAccessCctvRepair}
                        onChange={(e) => handleUpdateField('canAccessCctvRepair', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    {/* Budget Forms Access */}
                    <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          สิทธิ์ยื่นขออนุมัติงบประมาณ / โครงการ
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          เข้าถึงแบบฟอร์มขอรับการจัดสรรงบประมาณโครงการ
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentRolePerm.canAccessBudgetForms}
                        onChange={(e) => handleUpdateField('canAccessBudgetForms', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            รีเซ็ตเป็นค่าเริ่มต้นระบบ (Reset Defaults)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-semibold transition-colors"
            >
              ยกเลิก / ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              บันทึกการเปลี่ยนแปลงสิทธิ์ (Save Permissions)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
