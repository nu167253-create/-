import { getAccessToken } from './googleAuth';
import { AttachmentFile } from '../types/request';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface GooglePickerPickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  iconUrl?: string;
  sizeBytes?: number;
  description?: string;
  lastEditedUtc?: number;
  serviceId?: string;
  thumbnailUrl?: string;
}

export type PickerViewMode = 'all' | 'images' | 'videos' | 'pdfs' | 'folders' | 'upload';

export interface OpenPickerOptions {
  viewMode?: PickerViewMode;
  multiSelect?: boolean;
  title?: string;
  onPick: (files: GooglePickerPickedFile[]) => void;
  onCancel?: () => void;
  onError?: (err: Error) => void;
}

let isGapiPickerLoaded = false;
let gapiLoadPromise: Promise<void> | null = null;

/**
 * Loads the Google API client library and the 'picker' module
 */
export function loadGooglePickerApi(): Promise<void> {
  if (isGapiPickerLoaded && window.google?.picker) {
    return Promise.resolve();
  }

  if (gapiLoadPromise) {
    return gapiLoadPromise;
  }

  gapiLoadPromise = new Promise<void>((resolve, reject) => {
    const checkGapiAndLoadPicker = () => {
      if (typeof window.gapi !== 'undefined') {
        window.gapi.load('picker', {
          callback: () => {
            isGapiPickerLoaded = true;
            resolve();
          },
          onerror: () => {
            reject(new Error('ไม่สามารถโหลดโมดูล Google Picker API ได้'));
          }
        });
      } else {
        // Dynamically inject script if not present
        const existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            window.gapi.load('picker', {
              callback: () => {
                isGapiPickerLoaded = true;
                resolve();
              },
              onerror: () => {
                reject(new Error('ไม่สามารถโหลด Google Picker API ได้'));
              }
            });
          };
          script.onerror = () => reject(new Error('ไม่สามารถโหลดสคริปต์ Google API ได้'));
          document.head.appendChild(script);
        } else {
          // Wait for existing script to load
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (typeof window.gapi !== 'undefined') {
              clearInterval(interval);
              window.gapi.load('picker', {
                callback: () => {
                  isGapiPickerLoaded = true;
                  resolve();
                },
                onerror: () => reject(new Error('ไม่สามารถโหลด Google Picker API ได้'))
              });
            } else if (attempts > 30) {
              clearInterval(interval);
              reject(new Error('หมดเวลาในการรอโหลด Google API'));
            }
          }, 200);
        }
      }
    };

    checkGapiAndLoadPicker();
  });

  return gapiLoadPromise;
}

/**
 * Opens Google Picker dialog using current OAuth access token
 */
export async function openGooglePicker(options: OpenPickerOptions): Promise<void> {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('กรุณาลงชื่อเข้าใช้ Google ก่อนใช้งาน Google Picker');
    }

    await loadGooglePickerApi();

    if (!window.google?.picker) {
      throw new Error('Google Picker API ยังไม่พร้อมใช้งาน');
    }

    const {
      viewMode = 'all',
      multiSelect = true,
      title = 'เลือกไฟล์จาก Google Drive',
      onPick,
      onCancel,
      onError
    } = options;

    const pickerOrigin =
      window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[
            window.location.ancestorOrigins.length - 1
          ]
        : window.location.origin;

    const builder = new window.google.picker.PickerBuilder()
      .setOAuthToken(token)
      .setOrigin(pickerOrigin)
      .setTitle(title)
      .setLocale('th');

    if (multiSelect) {
      builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
    }
    builder.enableFeature(window.google.picker.Feature.SUPPORT_DRIVES);

    // Configure Views based on viewMode
    switch (viewMode) {
      case 'images':
        builder.addView(window.google.picker.ViewId.DOCS_IMAGES);
        break;
      case 'videos':
        builder.addView(window.google.picker.ViewId.DOCS_VIDEOS);
        break;
      case 'pdfs':
        builder.addView(window.google.picker.ViewId.PDFS);
        break;
      case 'folders':
        builder.addView(window.google.picker.ViewId.FOLDERS);
        break;
      case 'upload': {
        const uploadView = new window.google.picker.DocsUploadView();
        builder.addView(uploadView);
        builder.addView(window.google.picker.ViewId.DOCS);
        break;
      }
      case 'all':
      default: {
        const allDocsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
        allDocsView.setIncludeFolders(true);
        builder.addView(allDocsView);
        builder.addView(window.google.picker.ViewId.DOCS_IMAGES);
        builder.addView(window.google.picker.ViewId.PDFS);
        break;
      }
    }

    builder.setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const rawDocs = data[window.google.picker.Response.DOCUMENTS] || data.docs || [];
        const pickedFiles: GooglePickerPickedFile[] = rawDocs.map((doc: any) => ({
          id: doc.id,
          name: doc.name || 'ไฟล์จาก Google Drive',
          mimeType: doc.mimeType || 'application/octet-stream',
          url: doc.url || `https://drive.google.com/file/d/${doc.id}/view`,
          iconUrl: doc.iconUrl,
          sizeBytes: doc.sizeBytes ? Number(doc.sizeBytes) : undefined,
          description: doc.description,
          lastEditedUtc: doc.lastEditedUtc,
          serviceId: doc.serviceId,
          thumbnailUrl: doc.thumbnails?.[0]?.url || doc.iconUrl
        }));

        onPick(pickedFiles);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    });

    const picker = builder.build();
    picker.setVisible(true);
  } catch (err: any) {
    console.error('Failed to open Google Picker:', err);
    if (options.onError) {
      options.onError(err);
    } else {
      throw err;
    }
  }
}

/**
 * Converts a Google Picker picked file into the app's AttachmentFile format
 */
export function convertPickerDocToAttachment(
  file: GooglePickerPickedFile,
  categoryLabel: string = 'เอกสารจาก Google Drive'
): AttachmentFile {
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isVideo = file.mimeType.startsWith('video/');

  let documentCategory: any = 'other';
  if (isPdf) documentCategory = 'police_report';
  else if (isImage) documentCategory = 'incident_photo';
  else if (isVideo) documentCategory = 'evidence_video';

  return {
    id: `gdrive-${file.id}-${Date.now()}`,
    name: file.name,
    size: file.sizeBytes || 1024 * 1024,
    type: file.mimeType,
    url: file.url,
    uploadedAt: new Date().toISOString(),
    description: `${categoryLabel} (Google Drive Picker)`,
    documentCategory,
    // Store drive metadata for quick access
    driveFileId: file.id,
    driveViewUrl: file.url
  };
}
