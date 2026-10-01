import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { REQUEST_CATEGORIES } from '../data/categories';
import { RequestCategory } from '../types/request';
import { ApplicantRoleId } from '../types/permissions';
import { 
  getActiveApplicantRole, 
  setActiveApplicantRole,
  getPermissionForRole 
} from '../utils/permissionsStorage';
import { 
  Camera,
  FileCheck, 
  Calendar, 
  Wrench, 
  Receipt, 
  HelpCircle, 
  ArrowRight,
  Clock,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  Building2,
  Lock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface CategorySelectorProps {
  onSelectCategory: (category: RequestCategory) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelectCategory
}) => {
  const [activeRole, setActiveRoleState] = useState<ApplicantRoleId>('general_public');

  useEffect(() => {
    setActiveRoleState(getActiveApplicantRole());
  }, []);

  const handleRoleChange = (role: ApplicantRoleId) => {
    setActiveRoleState(role);
    setActiveApplicantRole(role);
  };

  const activeRolePerm = getPermissionForRole(activeRole);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Camera': return <Camera className="w-6 h-6 text-indigo-600" />;
      case 'FileCheck': return <FileCheck className="w-6 h-6 text-blue-600" />;
      case 'CalendarLeave': return <Calendar className="w-6 h-6 text-emerald-600" />;
      case 'Wrench': return <Wrench className="w-6 h-6 text-amber-600" />;
      case 'ReceiptTh': return <Receipt className="w-6 h-6 text-purple-600" />;
      default: return <HelpCircle className="w-6 h-6 text-teal-600" />;
    }
  };

  const getBorderBadge = (id: RequestCategory, isAllowed: boolean) => {
    if (!isAllowed) return 'border-slate-200 bg-slate-50/70 opacity-75';
    switch (id) {
      case 'cctv': return 'group-hover:border-indigo-500 bg-indigo-50/50';
      case 'certificate': return 'group-hover:border-blue-500 bg-blue-50/50';
      case 'leave': return 'group-hover:border-emerald-500 bg-emerald-50/50';
      case 'maintenance': return 'group-hover:border-amber-500 bg-amber-50/50';
      case 'budget': return 'group-hover:border-purple-500 bg-purple-50/50';
      default: return 'group-hover:border-teal-500 bg-teal-50/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <FileText className="w-3.5 h-3.5" />
          เลือกหมวดหมู่เพื่อยื่นคำร้อง
        </span>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          บริการยื่นคำร้องออนไลน์ 24 ชั่วโมง
        </h2>
        <p className="text-slate-600 text-sm">
          กรุณาเลือกประเภทบริการที่ต้องการยื่นเรื่องเพื่อเข้าสู่แบบฟอร์มบันทึกข้อมูลและแนบเอกสาร
        </p>
      </div>

      {/* Applicant Role Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              สถานะสิทธิ์ผู้ยื่นคำร้อง (Applicant Role & Access Rights)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            กลุ่มสิทธิ์ปัจจุบัน: <strong className="text-blue-700 font-bold">{activeRolePerm.roleTitleTh}</strong> (ได้รับอนุญาต {activeRolePerm.allowedCategories.length} หมวดหมู่)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'general_public', label: 'บุคคลทั่วไป / ประชาชน', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'student', label: 'นักศึกษา / ผู้เรียน', icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { id: 'staff', label: 'บุคลากร / เจ้าหน้าที่', icon: <Briefcase className="w-3.5 h-3.5" /> },
            { id: 'external_org', label: 'หน่วยงานภายนอก', icon: <Building2 className="w-3.5 h-3.5" /> },
          ].map((role) => {
            const isSelected = activeRole === role.id;
            return (
              <motion.button
                key={role.id}
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.975 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleRoleChange(role.id as ApplicantRoleId)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {role.icon}
                <span className="truncate">{role.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REQUEST_CATEGORIES.map((cat, idx) => {
          const isAllowed = activeRolePerm.allowedCategories.includes(cat.id);

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.36, 
                delay: idx * 0.06, 
                ease: [0.22, 1, 0.36, 1] 
              }}
              whileHover={
                isAllowed 
                  ? { 
                      y: -5, 
                      scale: 1.012, 
                      boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.04)',
                      transition: { duration: 0.2, ease: 'easeOut' }
                    } 
                  : undefined
              }
              whileTap={isAllowed ? { scale: 0.985, transition: { duration: 0.1 } } : undefined}
              onClick={() => {
                if (isAllowed) {
                  onSelectCategory(cat.id);
                }
              }}
              className={`group bg-white rounded-2xl p-6 border shadow-xs transition-colors flex flex-col justify-between select-none ${
                isAllowed 
                  ? 'cursor-pointer' 
                  : 'cursor-not-allowed opacity-80 border-slate-200 bg-slate-50/60'
              } ${getBorderBadge(cat.id, isAllowed)}`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center transition-transform ${isAllowed ? 'group-hover:scale-110' : ''}`}>
                    {getIcon(cat.iconName)}
                  </div>

                  {isAllowed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-400" />
                      พิจารณา {cat.slaDays} วันทำการ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-700" />
                      จำกัดสิทธิ์เฉพาะกลุ่ม
                    </span>
                  )}
                </div>

                <div>
                  <h3 className={`text-base font-bold transition-colors ${isAllowed ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-600'}`}>
                    {cat.titleTh}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mb-2">
                    {cat.titleEn}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                </div>

                {!isAllowed ? (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ไม่มีสิทธิ์ยื่นหมวดนี้ในกลุ่ม "{activeRolePerm.roleTitleTh}"
                    </span>
                    <p className="text-[10px] text-amber-700">
                      กรุณาสลับกลุ่มสิทธิ์ผู้ยื่น หรือติดต่อเจ้าหน้าที่สารบรรณหากมีข้อสงสัย
                    </p>
                  </div>
                ) : (
                  cat.requiredDocuments.length > 0 && (
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                      <span className="font-semibold text-slate-700 block">เอกสารที่ควรเตรียม:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        {cat.requiredDocuments.map((doc, idx) => (
                          <li key={idx} className="truncate">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold">
                {isAllowed ? (
                  <>
                    <span className="text-blue-600 group-hover:text-blue-700">เริ่มกรอกแบบฟอร์ม</span>
                    <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <span className="text-slate-400 font-normal italic">ไม่อนุญาตสำหรับกลุ่มสิทธิ์นี้</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
