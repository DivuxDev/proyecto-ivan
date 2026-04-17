'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { photosApi } from '@/lib/api';
import { formatDate, formatDateShort, getPhotoSrc } from '@/lib/utils';
import { ChevronLeft, Calendar, MapPin, Filter, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Photo, PaginatedPhotos } from '@/types';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todo el historial' },
];

function getDateRange(period: string) {
  const today = new Date();
  const end = today.toISOString().split('T')[0];

  if (period === 'today') {
    return { startDate: end, endDate: end };
  }
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: start.toISOString().split('T')[0], endDate: end };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate: end };
  }
  return {};
}

export default function WorkerHistoryPage() {
  const [period, setPeriod] = useState('week');
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const dateRange = getDateRange(period);

  const { data, isLoading } = useQuery({
    queryKey: ['worker-history', period, page],
    queryFn: async () => {
      const res = await photosApi.list({ ...dateRange, page, limit: 18 });
      return res.data as PaginatedPhotos;
    },
  });

  const photos = data?.data ?? [];
  const pagination = data?.pagination;
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? 'Esta semana';

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    setPage(1);
    setShowPeriodMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3.5">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/worker" className="p-1.5 -ml-1.5 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-gray-900">Mi historial</h1>
        </div>

        {/* Filtro de periodo */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodMenu(v => !v)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{periodLabel}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPeriodMenu ? 'rotate-180' : ''}`} />
          </button>

          {showPeriodMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePeriodChange(opt.value)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    period === opt.value
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Contador */}
        {pagination && (
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-gray-800">{pagination.total}</span> fotos encontradas
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin fotos en este periodo</p>
            <p className="text-gray-400 text-sm mt-1">Prueba con otro rango de fechas</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo: Photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-square photo-item"
                >
                  <Image
                    src={getPhotoSrc(photo.url)}
                    alt="Foto de trabajo"
                    fill
                    unoptimized
                    className="object-cover rounded-xl"
                    sizes="33vw"
                  />
                  {photo.latitude && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/60 rounded-full p-1">
                      <MapPin className="w-2.5 h-2.5 text-brand-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-end"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100">
              <Image
                src={getPhotoSrc(selectedPhoto.url)}
                alt="Foto de trabajo"
                fill
                unoptimized
                className="object-contain"
                sizes="100vw"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span>{formatDate(selectedPhoto.createdAt)}</span>
              </div>
              {selectedPhoto.latitude && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>
                    {selectedPhoto.latitude.toFixed(5)}°, {selectedPhoto.longitude?.toFixed(5)}°
                  </span>
                </div>
              )}
              {selectedPhoto.notes && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mt-2">
                  {selectedPhoto.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
