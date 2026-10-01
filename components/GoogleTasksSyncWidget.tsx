import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth } from '../utils/googleAuth';
import { fetchTaskLists, syncRequestToTasks } from '../utils/googleTasks';
import { RequestItem } from '../types/request';
import { CheckCircle2, ListTodo, LogIn, Loader2 } from 'lucide-react';

interface GoogleTasksSyncWidgetProps {
  request: RequestItem;
}

export const GoogleTasksSyncWidget: React.FC<GoogleTasksSyncWidgetProps> = ({ request }) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async () => {
        setNeedsAuth(false);
        try {
          const lists = await fetchTaskLists();
          setTaskLists(lists);
          if (lists.length > 0) setSelectedTaskList(lists[0].id);
        } catch (e) {
          console.error('Error fetching task lists', e);
        }
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setNeedsAuth(false);
        const lists = await fetchTaskLists();
        setTaskLists(lists);
        if (lists.length > 0) setSelectedTaskList(lists[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSync = async () => {
    if (!selectedTaskList) return;
    
    const confirmSync = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการสร้าง Task ในบัญชี Google ของคุณสำหรับคำร้องนี้?`);
    if (!confirmSync) return;
    
    setIsSyncing(true);
    try {
      await syncRequestToTasks(request, selectedTaskList);
      setMessage('ซิงค์กับ Google Tasks สำเร็จแล้ว!');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setMessage('ล้มเหลวในการซิงค์ข้อมูล');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <ListTodo className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">เชื่อมต่อกับ Google Tasks (Optional)</span>
        </div>
        <button
          onClick={handleLogin}
          disabled={isAuthenticating}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
        >
          {isAuthenticating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
          เข้าสู่ระบบ Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-blue-900 w-full sm:w-auto">
        <ListTodo className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="font-semibold whitespace-nowrap">ซิงค์ไปยัง Task:</span>
        <select
          value={selectedTaskList}
          onChange={(e) => setSelectedTaskList(e.target.value)}
          className="flex-1 sm:w-40 px-2 py-1 bg-white border border-blue-200 rounded text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-500 truncate"
        >
          {taskLists.length === 0 ? (
            <option value="">(ไม่พบรายการ Task)</option>
          ) : (
            taskLists.map(list => (
              <option key={list.id} value={list.id}>{list.title}</option>
            ))
          )}
        </select>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {message && (
          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            {message}
          </span>
        )}
        <button
          onClick={handleSync}
          disabled={isSyncing || !selectedTaskList}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              กำลังซิงค์...
            </>
          ) : (
            <>
              <ListTodo className="w-3.5 h-3.5" />
              เพิ่มลง Google Tasks
            </>
          )}
        </button>
      </div>
    </div>
  );
};
