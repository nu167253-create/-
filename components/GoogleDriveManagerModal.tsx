import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth, logout } from '../utils/googleAuth';
import { listDriveFiles, uploadToDrive, deleteDriveFile, createDriveFolder, DriveFile } from '../utils/googleDrive';
import { openGooglePicker, GooglePickerPickedFile } from '../utils/googlePicker';
import { GooglePickerLauncher } from './GooglePickerLauncher';
import { RequestItem } from '../types/request';
import { 
  HardDrive, 
  X, 
  Upload, 
  FolderPlus, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  LogIn, 
  LogOut, 
  Search, 
  Loader2,
  FileCheck,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Home,
  FileVideo,
  FileImage,
  FileCode,
  File
} from 'lucide-react';

interface GoogleDriveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRequest?: RequestItem | null;
}

interface BreadcrumbItem {
  id: string | null; // null for root
  name: string;
}

export const GoogleDriveManagerModal: React.FC<GoogleDriveManagerModalProps> = ({
  isOpen,
  onClose,
  currentRequest
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [folderSubFiles, setFolderSubFiles] = useState<Record<string, DriveFile[]>>({});
  const [currentFolder, setCurrentFolder] = useState<{ id: string | null; name: string }>({ id: null, name: 'My Drive (ไดรฟ์ของฉัน)' });
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'My Drive' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<DriveFile | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Auto-init auth check when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      async () => {
        setNeedsAuth(false);
        await loadFiles(null);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const loadFiles = async (folderId: string | null = currentFolder.id) => {
    setIsLoading(true);
    try {
      const driveFiles = await listDriveFiles(50, folderId || undefined);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error listing Drive files:', err);
      setMessage({ text: err.message || 'ไม่สามารถดึงข้อมูลจาก Google Drive ได้', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolder({ id: folderId, name: folderName });
    
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
    } else {
      // Find if folder is already in breadcrumb
      const index = breadcrumbs.findIndex(b => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }

    loadFiles(folderId);
  };

  // Toggle tree node expansion
  const toggleFolderExpand = async (folder: DriveFile) => {
    const isExpanded = expandedFolderIds[folder.id];
    const newExpanded = { ...expandedFolderIds, [folder.id]: !isExpanded };
    setExpandedFolderIds(newExpanded);

    if (!isExpanded && !folderSubFiles[folder.id]) {
      try {
        const subFiles = await listDriveFiles(30, folder.id);
        setFolderSubFiles(prev => ({ ...prev, [folder.id]: subFiles }));
      } catch (e) {
        console.error('Failed to load subfolder content', e);
      }
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        setMessage({ text: 'เชื่อมต่อกับ Google Drive สำเร็จ!', type: 'success' });
        await loadFiles(null);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setMessage({ text: err.message || 'เข้าสู่ระบบไม่สำเร็จ', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
    setFiles([]);
    setFolderSubFiles({});
    setExpandedFolderIds({});
    setMessage({ text: 'ออกจากระบบ Google เรียบร้อยแล้ว', type: 'success' });
  };

  // Upload Request Summary as Text/JSON to Google Drive in current folder
  const handleBackupRequestToDrive = async () => {
    if (!currentRequest) return;
    setIsUploading(true);
    try {
      const content = JSON.stringify(currentRequest, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const filename = `CCTV_Request_${currentRequest.id}_Backup.json`;

      await uploadToDrive(blob, filename, 'application/json', currentFolder.id || undefined);
      setMessage({ text: `สำรองข้อมูลคำร้อง ${currentRequest.id} ไปยัง Google Drive (${currentFolder.name}) เรียบร้อยแล้ว!`, type: 'success' });
      await loadFiles(currentFolder.id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setMessage({ text: err.message || 'อัปโหลดไปยัง Google Drive ไม่สำเร็จ', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Create new folder
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newFolderName || '').trim()) return;

    setIsLoading(true);
    try {
      const folderName = (newFolderName || '').trim();
      await createDriveFolder(folderName, currentFolder.id || undefined);
      setMessage({ text: `สร้างโฟลเดอร์ "${folderName}" ใน ${currentFolder.name} สำเร็จ!`, type: 'success' });
      setNewFolderName('');
      setShowNewFolderInput(false);
      await loadFiles(currentFolder.id);
    } catch (err: any) {
      console.error('Create folder error:', err);
      setMessage({ text: err.message || 'ไม่สามารถสร้างโฟลเดอร์ได้', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Manual File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadToDrive(file, file.name, file.type || 'application/octet-stream', currentFolder.id || undefined);
      setMessage({ text: `อัปโหลดไฟล์ "${file.name}" ไปยัง ${currentFolder.name} สำเร็จ!`, type: 'success' });
      await loadFiles(currentFolder.id);
    } catch (err: any) {
      console.error('Upload file error:', err);
      setMessage({ text: err.message || 'ล้มเหลวในการอัปโหลดไฟล์', type: 'error' });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Explicit confirmation requirement before deletion
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmFile) return;
    const fileId = deleteConfirmFile.id;
    const fileName = deleteConfirmFile.name;

    setDeleteConfirmFile(null);
    setIsDeleting(fileId);

    try {
      await deleteDriveFile(fileId);
      setMessage({ text: `ลบไฟล์ "${fileName}" จาก Google Drive เรียบร้อยแล้ว`, type: 'success' });
      await loadFiles(currentFolder.id);
    } catch (err: any) {
      console.error('Delete error:', err);
      setMessage({ text: err.message || 'ลบไฟล์ไม่สำเร็จ', type: 'error' });
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isOpen) return null;

  const foldersList = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const filesList = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  const filteredFolders = foldersList.filter(f => (f.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));
  const filteredFiles = filesList.filter(f => (f.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />;
    }
    if (mimeType.includes('video') || filename.endsWith('.mp4') || filename.endsWith('.mkv') || filename.endsWith('.avi')) {
      return <FileVideo className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (mimeType.includes('image') || filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.jpeg')) {
      return <FileImage className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes('json') || filename.endsWith('.json')) {
      return <FileCode className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    return <File className="w-4 h-4 text-blue-600 shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shadow-inner">
              <HardDrive className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Google Drive Workspace Integration</h2>
              <p className="text-xs text-blue-200">เบราว์เซอร์จัดการไฟล์ CCTV Evidence & Folders Tree View</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Alert Banner */}
        {message && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between shrink-0 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200' : 'bg-rose-50 text-rose-900 border-b border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          
          {/* Auth State Box */}
          {needsAuth ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4 my-4 shadow-sm">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">เชื่อมต่อกับ Google Drive ของคุณ</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  เข้าสู่ระบบด้วยบัญชี Google เพื่อเปิดใช้งานการเรียกดูโครงสร้างโฟลเดอร์ (Folder Tree View) การเก็บเอกสารคำร้อง ไฟล์ภาพ และวิดีโอหลักฐาน CCTV
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="gsi-material-button inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <LogIn className="w-4 h-4" />}
                <span>ลงชื่อเข้าใช้งานด้วย Google (Sign in with Google)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Connected User Toolbar & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>เชื่อมต่อ Google Drive สำเร็จแล้ว</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadFiles(currentFolder.id)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                  </button>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>

              {/* Action Bar & Folder Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {currentRequest && (
                    <button
                      onClick={handleBackupRequestToDrive}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                      <span>สำรองคำร้องนี้ #{currentRequest.id}</span>
                    </button>
                  )}

                  <label className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-blue-300" />
                    <span>{isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์ในโฟลเดอร์นี้'}</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                  </label>

                  <GooglePickerLauncher
                    variant="compact"
                    buttonLabel="⚡ เปิด Google Picker (Native Dialog)"
                    onFilesPicked={(picked) => {
                      setMessage({
                        text: `เลือก ${picked.length} ไฟล์จาก Google Drive (${picked.map(p => p.name).join(', ')}) เรียบร้อยแล้ว`,
                        type: 'success'
                      });
                      loadFiles(currentFolder.id);
                    }}
                  />

                  <button
                    onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ สร้างโฟลเดอร์ใหม่</span>
                  </button>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาไฟล์/โฟลเดอร์..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Create Folder Popover Form */}
              {showNewFolderInput && (
                <form onSubmit={handleCreateFolderSubmit} className="bg-amber-50 p-3.5 border border-amber-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <Folder className="w-5 h-5 text-amber-600 shrink-0" />
                  <input
                    type="text"
                    placeholder="ตั้งชื่อโฟลเดอร์ใหม่ (เช่น CCTV_หลักฐาน_2569)..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !(newFolderName || '').trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    ตกลงสร้าง
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewFolderInput(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </form>
              )}

              {/* Breadcrumbs Path */}
              <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs text-xs overflow-x-auto">
                <span className="text-slate-400 font-medium shrink-0">ตำแหน่งปัจจุบัน:</span>
                {breadcrumbs.map((b, idx) => (
                  <React.Fragment key={b.id || 'root'}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <button
                      onClick={() => handleNavigateToFolder(b.id, b.name)}
                      className={`inline-flex items-center gap-1 hover:underline cursor-pointer font-bold shrink-0 ${
                        idx === breadcrumbs.length - 1 ? 'text-blue-700 font-extrabold' : 'text-slate-600'
                      }`}
                    >
                      {idx === 0 ? <Home className="w-3.5 h-3.5 text-blue-600" /> : <FolderOpen className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{b.name}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Main Content Area: Sidebar Folder Tree + Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[340px]">
                
                {/* Left Sidebar: Folder Tree View */}
                <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2 overflow-y-auto max-h-[380px]">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                    <span>โครงสร้างโฟลเดอร์ (Folder Tree)</span>
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Root Node */}
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => handleNavigateToFolder(null, 'My Drive')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold text-left transition-colors cursor-pointer ${
                        currentFolder.id === null ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Home className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">My Drive (ไดรฟ์หลัก)</span>
                    </button>

                    {/* Folder Nodes in Current View */}
                    {foldersList.map((folder) => {
                      const isSelected = currentFolder.id === folder.id;
                      const isExpanded = !!expandedFolderIds[folder.id];
                      const subItems = folderSubFiles[folder.id] || [];

                      return (
                        <div key={folder.id} className="pl-2 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFolderExpand(folder)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-xs cursor-pointer"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleNavigateToFolder(folder.id, folder.name)}
                              className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer truncate ${
                                isSelected ? 'bg-amber-100 text-amber-950 font-bold border border-amber-200' : 'text-slate-700 hover:bg-slate-100 font-medium'
                              }`}
                            >
                              {isSelected ? (
                                <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <span className="truncate">{folder.name}</span>
                            </button>
                          </div>

                          {/* Expanded Sub-items tree level */}
                          {isExpanded && (
                            <div className="pl-6 space-y-0.5 border-l-2 border-slate-100 my-1">
                              {subItems.length === 0 ? (
                                <div className="text-[10px] text-slate-400 py-0.5 pl-2 italic">ไม่มีรายการย่อย</div>
                              ) : (
                                subItems.map(sub => (
                                  <div
                                    key={sub.id}
                                    onClick={() => {
                                      if (sub.mimeType === 'application/vnd.google-apps.folder') {
                                        handleNavigateToFolder(sub.id, sub.name);
                                      }
                                    }}
                                    className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-blue-700 py-0.5 px-1.5 rounded-sm hover:bg-slate-50 cursor-pointer truncate"
                                  >
                                    {getFileIcon(sub.mimeType, sub.name)}
                                    <span className="truncate">{sub.name}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Pane: Files & Subfolders Table List */}
                <div className="md:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      เนื้อหาใน "{currentFolder.name}" ({filteredFolders.length + filteredFiles.length} รายการ)
                    </span>
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100 text-xs">
                    
                    {/* Folders in current folder view */}
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="p-3 hover:bg-amber-50/60 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                        onClick={() => handleNavigateToFolder(folder.id, folder.name)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-amber-100/80 text-amber-700 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                            <Folder className="w-4 h-4 fill-amber-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              {folder.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">โฟลเดอร์ (Folder)</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-slate-400 group-hover:text-blue-600 text-[11px] font-semibold">
                          <span>ดับเบิ้ลคลิก/คลิกเพื่อเปิด</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}

                    {/* Files in current folder view */}
                    {filteredFiles.map((f) => (
                      <div key={f.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                            {getFileIcon(f.mimeType, f.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {f.createdTime ? new Date(f.createdTime).toLocaleDateString('th-TH') : '-'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {f.webViewLink && (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="เปิดใน Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => setDeleteConfirmFile(f)}
                            disabled={isDeleting === f.id}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบไฟล์"
                          >
                            {isDeleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                      <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                        <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-medium">
                          {searchQuery ? 'ไม่พบไฟล์หรือโฟลเดอร์ที่ตรงกับคำค้นหา' : 'โฟลเดอร์นี้ยังไม่มีไฟล์หรือโฟลเดอร์ย่อย'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            ตำแหน่งโฟลเดอร์: <strong className="text-slate-800">{currentFolder.name}</strong>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Delete Explicit Confirmation Modal Dialog */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 p-6 max-w-md w-full space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-slate-900 text-base">ยืนยันการลบไฟล์จาก Google Drive</h3>
              <p className="text-xs text-slate-600">
                คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ <strong className="font-bold text-slate-900">"{deleteConfirmFile.name}"</strong>? การดำเนินการนี้ไม่สามารถยกเลิกได้
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                ยืนยันลบไฟล์
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

