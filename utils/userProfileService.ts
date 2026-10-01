import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { ApplicantInfo } from '../types/request';

export interface UserProfile {
  id: string; // Citizen ID or unique user key
  prefix: string; // นาย / นาง / นางสาว / ดร. / ฯลฯ
  fullName: string; // ชื่อ-นามสกุล
  citizenId: string; // เลขประจำตัวประชาชน 13 หลัก
  email: string; // อีเมล
  phone: string; // เบอร์โทรศัพท์ติดต่อ
  smsPhone?: string; // หมายเลขโทรศัพท์มือถือสำหรับรับ SMS แจ้งเตือนสถานะ
  smsUpdatesEnabled?: boolean; // ตัวเลือกรับการแจ้งเตือนความคืบหน้าสถานะคำร้องผ่าน SMS

  // Address Details
  houseNo?: string; // บ้านเลขที่
  village?: string; // หมู่บ้าน/อาคาร/ถนน
  subDistrict?: string; // ตำบล/แขวง
  district?: string; // อำเภอ/เขต
  province?: string; // จังหวัด
  postalCode?: string; // รหัสไปรษณีย์
  fullAddress?: string; // ที่อยู่ฉบับเต็ม

  // Work & Education / Organization
  department?: string; // หน่วยงาน/คณะ/กอง
  positionOrMajor?: string; // อาชีพ/ตำแหน่ง/สาขาวิชา
  applicantRole?: 'general_public' | 'student' | 'staff' | 'external_org'; // ประเภทผู้ยื่นคำร้อง

  // Emergency & Social Contacts
  emergencyContactName?: string; // ชื่อผู้ติดต่อฉุกเฉิน
  emergencyContactPhone?: string; // เบอร์โทรฉุกเฉิน
  emergencyRelation?: string; // ความสัมพันธ์
  lineId?: string; // LINE ID

  createdAt: string;
  updatedAt: string;
}

const PROFILE_STORAGE_KEY = 'chaiyaphum_applicant_user_profile_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '3360100234567',
  prefix: 'นาย',
  fullName: 'สมชาย ใจดี',
  citizenId: '3360100234567',
  email: 'somchai.j@gmail.com',
  phone: '081-234-5678',
  smsPhone: '081-234-5678',
  smsUpdatesEnabled: true,
  houseNo: '123/45',
  village: 'หมู่บ้านเมืองทอง ถนนกวางด่าน',
  subDistrict: 'ในเมือง',
  district: 'เมืองชัยภูมิ',
  province: 'ชัยภูมิ',
  postalCode: '36000',
  fullAddress: '123/45 หมู่บ้านเมืองทอง ถนนกวางด่าน ต.ในเมือง อ.เมืองชัยภูมิ จ.ชัยภูมิ 36000',
  department: 'ชุมชนกวางด่าน (ประชาชนเทศบาลเมืองชัยภูมิ)',
  positionOrMajor: 'ผู้ประกอบการ / ประชาชนทั่วไป',
  applicantRole: 'general_public',
  emergencyContactName: 'นางสมศรี ใจดี (คู่สมรส)',
  emergencyContactPhone: '089-876-5432',
  emergencyRelation: 'คู่สมรส',
  lineId: 'somchai_chaiyaphum',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Get current stored user profile from localStorage or default
 */
export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      saveUserProfile(DEFAULT_USER_PROFILE, false);
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PROFILE,
      ...parsed
    };
  } catch (err) {
    console.error('Failed to parse user profile:', err);
    return DEFAULT_USER_PROFILE;
  }
}

/**
 * Convert UserProfile to ApplicantInfo for RequestForm
 */
export function profileToApplicantInfo(profile: UserProfile): ApplicantInfo {
  return {
    prefix: profile.prefix || 'นาย',
    fullName: profile.fullName || '',
    citizenIdOrCode: profile.citizenId || profile.id || '',
    email: profile.email || '',
    phone: profile.phone || '',
    department: profile.department || '',
    positionOrMajor: profile.positionOrMajor || ''
  };
}

/**
 * Save user profile to localStorage and Firestore
 */
export async function saveUserProfile(profile: UserProfile, syncToFirestore: boolean = true): Promise<UserProfile> {
  const updatedProfile: UserProfile = {
    ...profile,
    id: profile.citizenId?.trim() || profile.id || 'profile_default',
    fullAddress: profile.fullAddress || [
      profile.houseNo,
      profile.village,
      profile.subDistrict ? `ต.${profile.subDistrict}` : '',
      profile.district ? `อ.${profile.district}` : '',
      profile.province ? `จ.${profile.province}` : '',
      profile.postalCode
    ].filter(Boolean).join(' '),
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    
    // Broadcast window event for reactive UI updates
    window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedProfile }));
  } catch (err) {
    console.error('Failed to save user profile to localStorage:', err);
  }

  if (syncToFirestore) {
    try {
      const docRef = doc(db, 'user_profiles', updatedProfile.id);
      await setDoc(docRef, JSON.parse(JSON.stringify(updatedProfile)), { merge: true });
    } catch (error) {
      console.warn('Failed to sync user profile to Firestore:', error);
      handleFirestoreError(error, OperationType.WRITE, `user_profiles/${updatedProfile.id}`);
    }
  }

  return updatedProfile;
}

/**
 * Subscribe to Firestore real-time updates for a user profile
 */
export function subscribeToFirestoreUserProfile(
  profileId: string,
  onUpdate: (profile: UserProfile) => void
) {
  const docRef = doc(db, 'user_profiles', profileId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        saveUserProfile(data, false);
        onUpdate(data);
      }
    },
    (error) => {
      console.error('Firestore user profile subscription error:', error);
    }
  );
}

/**
 * Calculate completion score & missing fields for user profile
 */
export function calculateProfileCompletion(profile: UserProfile): {
  score: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
} {
  const checkList: Array<{ field: keyof UserProfile; label: string }> = [
    { field: 'prefix', label: 'คำนำหน้าชื่อ' },
    { field: 'fullName', label: 'ชื่อ-นามสกุล' },
    { field: 'citizenId', label: 'เลขประจำตัวประชาชน (13 หลัก)' },
    { field: 'phone', label: 'เบอร์โทรศัพท์' },
    { field: 'email', label: 'อีเมล' },
    { field: 'houseNo', label: 'บ้านเลขที่' },
    { field: 'subDistrict', label: 'ตำบล/แขวง' },
    { field: 'district', label: 'อำเภอ/เขต' },
    { field: 'province', label: 'จังหวัด' },
    { field: 'postalCode', label: 'รหัสไปรษณีย์' },
    { field: 'department', label: 'สังกัด/หน่วยงาน/คณะ' },
    { field: 'emergencyContactName', label: 'ชื่อผู้ติดต่อฉุกเฉิน' },
    { field: 'emergencyContactPhone', label: 'เบอร์โทรฉุกเฉิน' },
    { field: 'lineId', label: 'LINE ID' }
  ];

  const totalFields = checkList.length;
  let completedFields = 0;
  const missingFields: string[] = [];

  for (const item of checkList) {
    const val = profile[item.field];
    if (val && String(val).trim().length > 0) {
      completedFields++;
    } else {
      missingFields.push(item.label);
    }
  }

  const score = Math.round((completedFields / totalFields) * 100);

  return {
    score,
    completedFields,
    totalFields,
    missingFields
  };
}

/**
 * Export User Profile as JSON File Download
 */
export function exportUserProfileAsJSON(profile: UserProfile): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `user_profile_${profile.fullName || 'citizen'}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
