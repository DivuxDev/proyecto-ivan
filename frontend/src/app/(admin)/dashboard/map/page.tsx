'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { photosApi, usersApi } from '@/lib/api';
import dynamic from 'next/dynamic';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import type { MapPhoto, User } from '@/types';

// Importación dinámica — Leaflet no funciona con SSR
const PhotoMap = dynamic(() => import('@/components/map/PhotoMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-navy-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-navy-300 text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['admin-users-filter'],
    queryFn: async () => {
      const res = await usersApi.list();
      return (res.data.data as User[]).filter(u => u.role === 'WORKER' && u.active);
    },
  });

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['map-photos', userId, startDate, endDate],
    queryFn: async () => {
      const res = await photosApi.getMapPhotos({
        userId: userId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res.data.data as MapPhoto[];
    },
  });

  const hasFilters = userId || startDate || endDate;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="bg-navy-800 border-b border-navy-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 shrink-0" />
          <div>
            <h1 className="font-display text-base sm:text-xl font-bold text-white">Mapa de actividad</h1>
            <p className="text-navy-300 text-xs">
              {photosData?.length ?? 0} ubicaciones geolocalizadas
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            showFilters || hasFilters
              ? 'bg-brand-500 text-white'
              : 'border border-navy-500 text-navy-200 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filtrar</span> {hasFilters && '•'}
        </button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-navy-700 border-b border-navy-600 px-6 py-4 shrink-0 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-navy-300 mb-1">Trabajador</label>
              <select
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="input-dark w-full"
              >
                <option value="">Todos</option>
                {(users ?? []).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-navy-300 mb-1">Fecha desde</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-navy-300 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="input-dark w-full"
              />
            </div>
            {hasFilters && (
              <div className="flex items-end">
                <button
                  onClick={() => { setUserId(''); setStartDate(''); setEndDate(''); }}
                  className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-2.5 rounded-xl transition-colors w-full justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mapa - ocupa el espacio restante */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-navy-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-navy-300 text-sm">Cargando ubicaciones...</p>
            </div>
          </div>
        ) : (
          <PhotoMap photos={photosData ?? []} />
        )}
      </div>
    </div>
  );
}
