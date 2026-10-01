import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { getStoredAuthUser } from './firebaseAuthService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  botRole?: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
  places?: Array<{
    title: string;
    uri: string;
    address?: string;
  }>;
  attachedImage?: string; // If user or model shared an image
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  model: string;
}

const LOCAL_CHAT_STORAGE_KEY = 'chaiyaphum_cctv_gemini_chat_v1';

/**
 * Get current browser geolocation if allowed, with fallback to Chaiyaphum center
 */
export async function getDeviceGeolocation(): Promise<{ latitude: number; longitude: number }> {
  const CHAIYAPHUM_CENTER = { latitude: 15.8066, longitude: 102.0315 };
  
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return CHAIYAPHUM_CENTER;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      () => {
        // Fallback gracefully on permission denial or error
        resolve(CHAIYAPHUM_CENTER);
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}

/**
 * Call server-side /api/gemini/chat with multi-turn history, model selection, role systems, and Google Search / Maps Grounding
 */
export async function sendChatMessage(params: {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  model?: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite' | 'gemini-3.8-flash';
  botRole?: 'service' | 'legal' | 'technician';
  useSearchGrounding?: boolean;
  useMapsGrounding?: boolean;
}): Promise<{
  text: string;
  sources?: Array<{ title: string; uri: string }>;
  places?: Array<{ title: string; uri: string; address?: string }>;
  modelUsed?: string;
}> {
  const { 
    messages, 
    model = 'gemini-3.5-flash', 
    botRole = 'service',
    useSearchGrounding = false, 
    useMapsGrounding = false 
  } = params;

  let userLocation = { latitude: 15.8066, longitude: 102.0315 };
  if (useMapsGrounding) {
    try {
      userLocation = await getDeviceGeolocation();
    } catch {
      // ignore
    }
  }

  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages,
      model,
      botRole,
      useSearchGrounding,
      useMapsGrounding,
      userLocation
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || errorJson.fallbackText || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.text || '',
    sources: data.sources || [],
    places: data.places || [],
    modelUsed: data.modelUsed
  };
}

/**
 * Call server-side /api/gemini/image-action to create or edit incident diagrams
 */
export async function generateOrEditIncidentImage(params: {
  action: 'generate' | 'edit';
  prompt: string;
  base64Image?: string;
  mimeType?: string;
  aspectRatio?: '1:1' | '16:9' | '4:3';
}): Promise<{
  success: boolean;
  imageUrl: string;
  text?: string;
}> {
  const response = await fetch('/api/gemini/image-action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Image generation failed with status ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Load stored chat messages from localStorage or Firestore
 */
export function getLocalChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local chat messages:', e);
    return [];
  }
}

/**
 * Save chat messages to localStorage and Firestore if user is authenticated
 */
export async function persistChatMessages(messages: ChatMessage[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to persist to localStorage:', e);
  }

  // Also sync to Firestore if user is authenticated with Google
  const authUser = getStoredAuthUser();
  if (authUser?.uid) {
    try {
      const userChatRef = doc(db, 'users', authUser.uid, 'settings', 'ai_chat');
      await setDoc(userChatRef, {
        updatedAt: new Date().toISOString(),
        messages: messages.slice(-50), // keep latest 50 for quick restore
        userEmail: authUser.email
      }, { merge: true });
    } catch (err) {
      console.warn('Could not sync chat to Firestore:', err);
    }
  }
}

/**
 * Clear chat history
 */
export function clearStoredChat(): void {
  try {
    localStorage.removeItem(LOCAL_CHAT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
