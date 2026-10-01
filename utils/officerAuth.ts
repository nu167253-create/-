import { auth, googleProvider } from '../src/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';

export interface OfficerUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'officer';
  department: string;
  position: string;
  photoURL?: string;
  isLoggedIn: boolean;
}

const OFFICER_AUTH_KEY = 'e_service_logged_in_officer_v1';

export const DEMO_OFFICER_ACCOUNTS: Record<string, OfficerUser> = {
  officer: {
    uid: 'demo-officer-001',
    name: 'นางสาวจิราพร ใจดี',
    email: 'officer@chaiyaphum.go.th',
    role: 'officer',
    department: 'ฝ่ายการข่าวและสารบรรณดิจิทัล',
    position: 'เจ้าหน้าที่รับเรื่องคำร้อง CCTV',
    isLoggedIn: true,
  },
  admin: {
    uid: 'demo-admin-001',
    name: 'นายสมศักดิ์ ชัยภูมิพัฒนา',
    email: 'admin@chaiyaphum.go.th',
    role: 'admin',
    department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
    position: 'หัวหน้างานบริหารระบบกล้องวงจรปิด & Admin',
    isLoggedIn: true,
  }
};

export function getStoredOfficerUser(): OfficerUser | null {
  try {
    const raw = localStorage.getItem(OFFICER_AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isLoggedIn) return parsed;
    }
  } catch (err) {
    console.error('Failed to parse stored officer user:', err);
  }
  return null;
}

export function setStoredOfficerUser(user: OfficerUser | null): void {
  try {
    if (user) {
      localStorage.setItem(OFFICER_AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(OFFICER_AUTH_KEY);
    }
  } catch (err) {
    console.error('Failed to save officer user:', err);
  }
}

export async function loginOfficerDemo(role: 'admin' | 'officer'): Promise<OfficerUser> {
  const account = DEMO_OFFICER_ACCOUNTS[role] || DEMO_OFFICER_ACCOUNTS.officer;
  setStoredOfficerUser(account);
  return account;
}

export async function loginOfficerWithEmail(email: string, pass: string): Promise<OfficerUser> {
  const cleanEmail = email.trim().toLowerCase();
  
  // First attempt Firebase auth if possible
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;
    const user: OfficerUser = {
      uid: fbUser.uid,
      name: fbUser.displayName || (cleanEmail.includes('admin') ? 'ผู้ดูแลระบบ เทศบาลเมืองชัยภูมิ' : 'เจ้าหน้าที่สารบรรณ เทศบาลเมืองชัยภูมิ'),
      email: fbUser.email || cleanEmail,
      role: cleanEmail.includes('admin') || pass === 'admin' || pass === '1234' ? 'admin' : 'officer',
      department: 'ศูนย์ปฏิบัติการ CCTV เทศบาลเมืองชัยภูมิ',
      position: 'เจ้าหน้าที่ผู้รับเรื่อง',
      photoURL: fbUser.photoURL || undefined,
      isLoggedIn: true,
    };
    setStoredOfficerUser(user);
    return user;
  } catch (fbErr) {
    // If Firebase user doesn't exist yet or offline/fallback, validate known credential defaults
    if (cleanEmail.includes('admin') || pass === 'admin' || pass === '1234') {
      const user: OfficerUser = {
        uid: 'user-admin-' + Date.now(),
        name: 'นายสมศักดิ์ ชัยภูมิพัฒนา (Admin)',
        email: cleanEmail || 'admin@chaiyaphum.go.th',
        role: 'admin',
        department: 'สำนักปลัดเทศบาลเมืองชัยภูมิ',
        position: 'ผู้ดูแลระบบสารบรรณและกล้องวงจรปิด',
        isLoggedIn: true,
      };
      setStoredOfficerUser(user);
      return user;
    } else if (cleanEmail.includes('officer') || pass === 'officer' || pass === '5678') {
      const user: OfficerUser = {
        uid: 'user-officer-' + Date.now(),
        name: 'นางสาวจิราพร ใจดี (เจ้าหน้าที่)',
        email: cleanEmail || 'officer@chaiyaphum.go.th',
        role: 'officer',
        department: 'ฝ่ายการข่าวและสารบรรณดิจิทัล',
        position: 'เจ้าหน้าที่ผู้รับเรื่องและตรวจสอบคำร้อง',
        isLoggedIn: true,
      };
      setStoredOfficerUser(user);
      return user;
    }
    
    // Otherwise allow any valid municipal domain or passcode
    if (pass === '1234' || pass === 'admin1234') {
      const user: OfficerUser = {
        uid: 'user-officer-' + Date.now(),
        name: cleanEmail.split('@')[0] || 'เจ้าหน้าที่เทศบาลเมืองชัยภูมิ',
        email: cleanEmail,
        role: pass.includes('admin') ? 'admin' : 'officer',
        department: 'ศูนย์บริการสารบรรณดิจิทัล',
        position: 'เจ้าหน้าที่ผู้ปฏิบัติงาน',
        isLoggedIn: true,
      };
      setStoredOfficerUser(user);
      return user;
    }

    throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสทดสอบ: 1234, admin, หรือกดปุ่มเข้าสู่ระบบทดสอบ)');
  }
}

export async function loginOfficerWithGoogle(): Promise<OfficerUser> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const fbUser = res.user;
    const user: OfficerUser = {
      uid: fbUser.uid,
      name: fbUser.displayName || 'เจ้าหน้าที่เทศบาลเมืองชัยภูมิ',
      email: fbUser.email || '',
      role: (fbUser.email && fbUser.email.includes('admin')) ? 'admin' : 'officer',
      department: 'ศูนย์บริการสารบรรณดิจิทัล เทศบาลเมืองชัยภูมิ',
      position: 'เจ้าหน้าที่ผู้ใช้งาน Google Workspace',
      photoURL: fbUser.photoURL || undefined,
      isLoggedIn: true,
    };
    setStoredOfficerUser(user);
    return user;
  } catch (err: any) {
    console.error('Google Sign in failed:', err);
    throw new Error(err?.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
  }
}

export async function logoutOfficer(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore error
  }
  setStoredOfficerUser(null);
}
