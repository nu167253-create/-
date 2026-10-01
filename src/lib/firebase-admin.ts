import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;
let authInstance: Auth | null = null;

export function getAdminAuth(): Auth | null {
  if (!authInstance) {
    try {
      if (!getApps().length) {
        adminApp = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } else {
        adminApp = getApps()[0];
      }
      authInstance = getAuth(adminApp);
    } catch (err) {
      console.warn('Firebase Admin SDK could not be initialized:', err);
      return null;
    }
  }
  return authInstance;
}

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    if (!auth) {
      if (prop === 'verifyIdToken') {
        return async () => {
          throw new Error('Firebase Admin Auth is not configured on this server instance.');
        };
      }
      return undefined;
    }
    return (auth as any)[prop];
  }
});

