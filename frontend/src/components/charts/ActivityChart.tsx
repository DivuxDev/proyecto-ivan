'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyActivity } from '@/types';

interface Props {
  data: DailyActivity[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-700 border border-navy-500 rounded-xl px-3.5 py-2.5 shadow-card-dark">
      <p className="text-navy-200 text-xs mb-2">
        {label ? (() => { try { const p = parseISO(label); return isValid(p) ? format(p, "d 'de' MMMM", { locale: es }) : label; } catch { return label; } })() : ''}
      </p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-navy-300 capitalize">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ActivityChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-52 flex items-center justify-center text-navy-400 text-sm">
        Sin datos para el periodo seleccionado
      </div>
    );
  }

  // Formatear fechas para el eje X
  const formatted = data.map(d => {
    try {
      const parsed = parseISO(d.date);
      return { ...d, label: isValid(parsed) ? format(parsed, 'dd/MM', { locale: es }) : d.date };
    } catch {
      return { ...d, label: d.date };
    }
  });

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="photosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="workersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#7590B0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#7590B0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#7590B0', paddingTop: 8 }}
          />
          <Area
            type="monotone"
            dataKey="photos"
            name="Fotos"
            stroke="#F59E0B"
            strokeWidth={2}
            fill="url(#photosGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#F59E0B' }}
          />
          <Area
            type="monotone"
            dataKey="workers"
            name="Trabajadores"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#workersGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3B82F6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
