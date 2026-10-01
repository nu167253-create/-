import { getAccessToken } from './googleAuth';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * List files from user's Google Drive
 */
export async function listDriveFiles(pageSize = 20, folderId?: string): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('ไม่พบ Access Token กรุณาเข้าสู่ระบบด้วย Google');
  }

  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,iconLink,thumbnailLink,createdTime,size)&q=${encodeURIComponent(query)}&orderBy=createdTime%20desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Drive files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(folderName: string, parentFolderId?: string): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('ไม่พบ Access Token กรุณาเข้าสู่ระบบด้วย Google');
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create folder in Google Drive`);
  }

  return await response.json();
}

/**
 * Upload a Blob or File to Google Drive
 */
export async function uploadToDrive(
  fileData: Blob | File,
  filename: string,
  mimeType: string = 'application/pdf',
  folderId?: string
): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('ไม่พบ Access Token กรุณาเข้าสู่ระบบด้วย Google');
  }

  const metadata: any = {
    name: filename,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', fileData);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive`);
  }

  return await response.json();
}

/**
 * Delete a file from Google Drive (Requires explicit user confirmation before calling)
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('ไม่พบ Access Token กรุณาเข้าสู่ระบบด้วย Google');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive`);
  }

  return true;
}
