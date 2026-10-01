import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  X, 
  Zap, 
  LogIn, 
  ShieldAlert,
  HelpCircle,
  Globe
} from 'lucide-react';
import { 
  OfficerUser, 
  loginOfficerDemo, 
  loginOfficerWithEmail, 
  loginOfficerWithGoogle 
} from '../utils/officerAuth';

interface OfficerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: OfficerUser) => void;
}

export const OfficerLoginModal: React.FC<OfficerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'quick' | 'passcode'>('login');
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const user = await loginOfficerWithEmail(email, password);
      setIsSubmitting(false);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'officer') => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const user = await loginOfficerDemo(role);
      setIsSubmitting(false);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg('เกิดข้อผิดพลาดในการเข้าสู่ระบบทดสอบ');
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const user = await loginOfficerWithGoogle();
      setIsSubmitting(false);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google Account ได้');
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    if (clean === '1234' || clean === 'admin' || clean === 'admin1234' || clean === 'admin888') {
      handleDemoLogin('admin');
    } else if (clean === '5678' || clean === 'officer') {
      handleDemoLogin('officer');
    } else {
      setErrorMsg('รหัสผ่าน PIN ไม่ถูกต้อง (รหัสทดสอบ Admin: 1234 หรือ admin / Officer: 5678)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg font-black shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Official Officer Portal Access
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                เข้าสู่ระบบเจ้าหน้าที่
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 pl-1">
            ระบบสารบรรณและบริหารจัดการคำร้องขอดูภาพกล้องวงจรปิด เทศบาลเมืองชัยภูมิ
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            อีเมล / รหัสผ่าน
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'quick'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            เข้าสู่ระบบทดสอบ
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('passcode'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'passcode'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
            รหัส PIN
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">แจ้งเตือนการเข้าสู่ระบบ:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* TAB 1: Standard Email & Password */}
          {activeTab === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  อีเมลเจ้าหน้าที่ / บัญชีปฏิบัติงาน (Officer Email)
                </label>
                <input
                  type="email"
                  required
                  placeholder="เช่น officer@chaiyaphum.go.th หรือ admin@chaiyaphum.go.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่าน (ทดสอบใช้: 1234 หรือ admin)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? 'กำลังตรวจสอบสิทธิ์...' : 'ยืนยันเข้าสู่ระบบสารบรรณ'}
              </button>

              {/* Divider for Google Sign In */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">หรือเข้าสู่ระบบด้วย</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google Account (Google Workspace)
              </button>
            </form>
          )}

          {/* TAB 2: Quick Demo Buttons */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  เลือกเข้าสู่ระบบด่วนในฐานะสิทธิ์เจ้าหน้าที่หรือผู้ดูแลระบบเพื่อทดสอบฟังก์ชันงานสารบรรณได้ทันที
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDemoLogin('officer')}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-900 to-slate-900 hover:from-blue-800 hover:to-slate-800 text-white p-4 rounded-2xl border border-blue-800/80 shadow-md text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <span className="font-extrabold text-xs text-white">
                      เข้าสู่ระบบ: เจ้าหน้าที่สารบรรณ (Officer)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    นางสาวจิราพร ใจดี (ฝ่ายการข่าวและสารบรรณดิจิทัล)
                  </p>
                </div>
                <LogIn className="w-5 h-5 text-blue-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-900 via-slate-900 to-amber-950 hover:from-amber-800 hover:to-slate-800 text-white p-4 rounded-2xl border border-amber-600/60 shadow-md text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-xs text-amber-200">
                      เข้าสู่ระบบ: ผู้ดูแลระบบ (Admin Superuser)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    นายสมศักดิ์ ชัยภูมิพัฒนา (สำนักปลัดเทศบาลเมืองชัยภูมิ)
                  </p>
                </div>
                <LogIn className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* TAB 3: Quick Passcode / PIN */}
          {activeTab === 'passcode' && (
            <form onSubmit={handlePasscodeLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  รหัสผ่าน PIN ประจำตัวเจ้าหน้าที่ (Passcode)
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัส PIN (ทดสอบ: 1234 หรือ admin)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-3.5 py-3 text-center text-lg font-mono font-extrabold tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>รหัสผ่านทดสอบผู้ดูแลระบบ: <strong className="font-mono text-indigo-900">1234</strong> หรือ <strong className="font-mono text-indigo-900">admin</strong></span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                ปลดล็อคเข้าสู่ระบบด้วย PIN
              </button>
            </form>
          )}

          {/* Info Footer */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-[11px] text-slate-600">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span>ศูนย์บริการประชาชนและบุคลากรดิจิทัล เทศบาลเมืองชัยภูมิ</span>
          </div>

        </div>
      </div>
    </div>
  );
};
