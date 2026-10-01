import React, { useState, useEffect } from 'react';
import { googleSignIn, initAuth } from '../utils/googleAuth';
import { fetchTaskLists, createTask } from '../utils/googleTasks';
import { CheckCircle2, ListTodo, LogIn, Loader2, RefreshCw, Plus } from 'lucide-react';
import { getAccessToken } from '../utils/googleAuth';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

export const MyTasksView: React.FC = () => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = async (listId: string) => {
    if (!listId) return;
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${TASKS_API_BASE}/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      async () => {
        setNeedsAuth(false);
        try {
          const lists = await fetchTaskLists();
          setTaskLists(lists);
          if (lists.length > 0) {
            setSelectedTaskList(lists[0].id);
            fetchTasks(lists[0].id);
          }
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
        if (lists.length > 0) {
          setSelectedTaskList(lists[0].id);
          fetchTasks(lists[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const toggleTaskStatus = async (task: any) => {
    try {
      const token = await getAccessToken();
      const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
      
      const payload: any = {
        id: task.id,
        status: newStatus
      };
      
      // If we are completing a task, we do not need to send completed date as Google API handles it or requires RFC 3339 format, we can just send status.
      
      const res = await fetch(`${TASKS_API_BASE}/lists/${selectedTaskList}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      if (res.ok) {
        fetchTasks(selectedTaskList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newTaskTitle || '').trim() || !selectedTaskList) return;
    setIsAdding(true);
    try {
      await createTask(selectedTaskList, (newTaskTitle || '').trim(), '');
      setNewTaskTitle('');
      fetchTasks(selectedTaskList);
    } catch (e) {
      console.error(e);
      alert('Failed to add task');
    } finally {
      setIsAdding(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
        <ListTodo className="w-12 h-12 text-blue-300 mx-auto" />
        <div>
          <h3 className="font-bold text-slate-800 text-base">การเชื่อมต่อ Google Tasks</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            เข้าสู่ระบบด้วยบัญชี Google ของคุณเพื่อจัดการรายการที่ต้องทำ (Tasks) ที่ซิงค์ไว้กับคำร้อง
          </p>
        </div>
        <button
          onClick={handleLogin}
          disabled={isAuthenticating}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm mx-auto"
        >
          {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          เข้าสู่ระบบ Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListTodo className="w-6 h-6 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-lg">My Google Tasks</h3>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTaskList}
            onChange={(e) => {
              setSelectedTaskList(e.target.value);
              fetchTasks(e.target.value);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            {taskLists.map(list => (
              <option key={list.id} value={list.id}>{list.title}</option>
            ))}
          </select>
          <button
            onClick={() => fetchTasks(selectedTaskList)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          type="text"
          placeholder="เพิ่มรายการที่ต้องทำใหม่..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={!(newTaskTitle || '').trim() || isAdding || !selectedTaskList}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span className="hidden sm:inline">เพิ่ม Task</span>
        </button>
      </form>

      <div className="space-y-2">
        {isLoading && tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-xs">กำลังโหลดรายการ Tasks...</p>
          </div>
        ) : tasks.length > 0 ? (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                task.status === 'completed' 
                  ? 'bg-slate-50 border-slate-100 opacity-60' 
                  : 'bg-white border-slate-200 shadow-sm hover:border-blue-200'
              }`}
            >
              <button 
                onClick={() => toggleTaskStatus(task)}
                className={`mt-0.5 shrink-0 ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {task.title || '(ไม่มีชื่อ)'}
                </h4>
                {task.notes && (
                  <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-3">
                    {task.notes}
                  </p>
                )}
                {task.due && (
                  <div className="text-[10px] text-rose-500 font-bold mt-1.5">
                    กำหนดเสร็จ: {new Date(task.due).toLocaleDateString('th-TH')}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400">
            <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">ไม่มีรายการ Tasks ในหน้านี้</p>
          </div>
        )}
      </div>
    </div>
  );
};
