import React from 'react';
import { RequestItem } from '../types/request';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SimpleStatusWidgetProps {
  requests: RequestItem[];
}

export const SimpleStatusWidget: React.FC<SimpleStatusWidgetProps> = ({ requests }) => {
  const pendingCount = requests.filter(r => r.status === 'submitted').length;
  const underReviewCount = requests.filter(r => r.status === 'under_review').length;
  const completedCount = requests.filter(r => r.status === 'completed' || r.status === 'approved').length;

  const data = [
    { name: 'Pending', count: pendingCount, color: '#f59e0b' },
    { name: 'Under Review', count: underReviewCount, color: '#3b82f6' },
    { name: 'Completed', count: completedCount, color: '#10b981' }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Requests Summary</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
