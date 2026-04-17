'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { WorkerStats } from '@/types';

interface Props {
  data: WorkerStats[];
}

const COLORS = [
  '#F59E0B', '#FBBF24', '#FCD34D',
  '#3B82F6', '#60A5FA', '#93C5FD',
  '#10B981', '#34D399',
];

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: WorkerStats }>;
}) => {
  if (!active || !payload?.length) return null;
  const w = payload[0].payload;
  return (
    <div className="bg-navy-700 border border-navy-500 rounded-xl px-3.5 py-2.5 shadow-card-dark">
      <p className="text-white font-medium text-xs mb-1">{w.userName}</p>
      <p className="text-brand-400 font-bold text-sm">{w.totalPhotos} fotos</p>
    </div>
  );
};

export default function WorkerChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-52 flex items-center justify-center text-navy-400 text-sm">
        Sin datos de trabajadores
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.totalPhotos - a.totalPhotos);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#7590B0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="userName"
            width={90}
            tick={{ fill: '#9EB0C8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.split(' ')[0]} // Sólo primer nombre
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1E3A5F' }} />
          <Bar dataKey="totalPhotos" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
