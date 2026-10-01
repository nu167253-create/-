import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { getUserProfile, saveUserProfile } from './userProfileService';

export interface AuthUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerId: string;
  isAnonymous: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  role?: string;
  customData?: Record<string, any>;
}

const AUTH_USER_LOCAL_KEY = 'chaiyaphum_cctv_auth_user_v1';

/**
 * Format FirebaseUser object into clean AuthUserData
 */
export function formatAuthUserData(user: FirebaseUser): AuthUserData {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    providerId: user.providerData[0]?.providerId || 'google.com',
    isAnonymous: user.isAnonymous,
    lastLoginAt: new Date().toISOString()
  };
}

/**
 * Get current cached auth user from localStorage for instant UI rendering
 */
export function getStoredAuthUser(): AuthUserData | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached auth user:', e);
    return null;
  }
}

/**
 * Save or update user account record in Firestore persistent storage
 */
export async function syncUserAccountToFirestore(user: AuthUserData): Promise<void> {
  const userDocRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  let isExisting = false;
  let existingRole = user.role || 'citizen';
  let existingCreatedAt = now;

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      isExisting = true;
      const data = docSnap.data();
      if (data.role) existingRole = data.role;
      if (data.createdAt) existingCreatedAt = data.createdAt;
    }
  } catch (err: any) {
    // If offline or cache miss on initial connection, proceed gracefully with local merge write
    console.warn('Network offline or doc not in cache, continuing user sync:', err?.message || err);
  }

  const userPayload: Record<string, any> = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    providerId: user.providerId || 'google.com',
    isAnonymous: user.isAnonymous ?? false,
    role: existingRole,
    createdAt: existingCreatedAt,
    lastLoginAt: now,
    updatedAt: now
  };

  try {
    await setDoc(userDocRef, userPayload, { merge: true });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('client is offline') || errorMsg.includes('offline') || error?.code === 'unavailable') {
      console.warn('User account sync queued in Firestore offline cache.');
      return;
    }
    console.warn('Failed to sync user data to Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } catch {
      // Keep resilient so UI flow doesn't break
    }
  }
}

/**
 * Sign in using Google with Firebase Auth
 */
export async function signInWithGoogle(): Promise<AuthUserData> {
  try {
    // Configure prompt to select account smoothly
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, googleProvider);
    const formattedUser = formatAuthUserData(result.user);

    // Save to local storage for quick access
    try {
      localStorage.setItem(AUTH_USER_LOCAL_KEY, JSON.stringify(formattedUser));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Persist and synchronize to Firestore in the background
    await syncUserAccountToFirestore(formattedUser);

    // Auto-enrich user profile if applicant profile is default or missing name
    const currentProfile = getUserProfile();
    if (result.user.displayName && (!currentProfile.fullName || currentProfile.fullName === 'สมชาย ใจดี')) {
      const updatedProfile = {
        ...currentProfile,
        fullName: result.user.displayName,
        email: result.user.email || currentProfile.email
      };
      saveUserProfile(updatedProfile, true).catch(err => console.warn('Auto sync profile error:', err));
    }

    // Broadcast event
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: formattedUser }));

    return formattedUser;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('หน้าต่างลงชื่อเข้าใช้ถูกปิดก่อนดำเนินการเสร็จสิ้น');
    }
    if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error('มีการร้องขอลงชื่อเข้าใช้อื่นกำลังทำงานอยู่');
    }
    throw new Error(error?.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
  }
}

/**
 * Sign out user from Firebase Auth
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    localStorage.removeItem(AUTH_USER_LOCAL_KEY);
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: null }));
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Subscribe to Firebase Auth state changes
 */
export function subscribeToAuthState(
  callback: (user: AuthUserData | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const formatted = formatAuthUserData(firebaseUser);
      try {
        localStorage.setItem(AUTH_USER_LOCAL_KEY, JSON.stringify(formatted));
      } catch (e) {
        // ignore
      }
      callback(formatted);

      // Async sync to Firestore
      syncUserAccountToFirestore(formatted).catch(err => {
        console.warn('Async firestore sync on auth change:', err);
      });
    } else {
      localStorage.removeItem(AUTH_USER_LOCAL_KEY);
      callback(null);
    }
  });
}

/**
 * Get user record directly from Firestore
 */
export async function getUserFirestoreData(uid: string): Promise<Record<string, any> | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn('Failed to get user data from Firestore:', error);
    return null;
  }
}

/**
 * Update user record in Firestore
 */
export async function updateUserFirestoreData(uid: string, updates: Record<string, any>): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update user in Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}
