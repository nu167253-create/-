import { getAccessToken } from './googleAuth';
import { RequestItem } from '../types/request';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

export async function fetchTaskLists(): Promise<any[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch task lists');
  
  const data = await res.json();
  return data.items || [];
}

export async function createTask(taskListId: string, title: string, notes: string): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const res = await fetch(`${TASKS_API_BASE}/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      notes,
    })
  });
  
  if (!res.ok) throw new Error('Failed to create task');
  return await res.json();
}

export async function syncRequestToTasks(request: RequestItem, taskListId: string): Promise<any> {
  const title = `[${request.status.toUpperCase()}] ${request.title}`;
  const notes = `Request ID: ${request.id}\nApplicant: ${request.applicant.firstName} ${request.applicant.lastName}\nCategory: ${request.category}\n\nNotes: ${request.reason || ''}`;
  
  return await createTask(taskListId, title, notes);
}
