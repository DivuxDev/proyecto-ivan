'use client';

import { useQuery } from '@tanstack/react-query';
import { photosApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, timeAgo, getPhotoSrc } from '@/lib/utils';
import { Camera, Images, Clock, MapPin, LogOut, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Photo, PaginatedPhotos } from '@/types';

export default function WorkerHomePage() {
  const { user, logout } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Fotos recientes del trabajador
  const { data: recentData, isLoading } = useQuery({
    queryKey: ['worker-recent-photos'],
    queryFn: async () => {
      const res = await photosApi.list({ limit: 6 });
      return res.data as PaginatedPhotos;
    },
  });

  // Fotos de hoy
  const { data: todayData } = useQuery({
    queryKey: ['worker-today-photos'],
    queryFn: async () => {
      const res = await photosApi.list({ startDate: today, endDate: today, limit: 100 });
      return res.data as PaginatedPhotos;
    },
  });

  const recentPhotos = recentData?.data ?? [];
  const todayCount = todayData?.pagination.total ?? 0;
  const totalCount = recentData?.pagination.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-800 pt-safe px-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/logo.jpg" alt="TagMap" width={32} height={32} className="object-cover" />
            </div>
            <span className="font-display text-base font-bold text-white tracking-wide">
              TAG<span className="text-brand-500">MAP</span>
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 text-navy-300 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-navy-300 text-sm">Bienvenido,</p>
          <h1 className="text-white font-bold text-xl">{user?.name}</h1>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Stats del día */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-brand-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hoy</span>
            </div>
            <p className="font-display text-3xl font-bold text-gray-900">{todayCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">fotos subidas</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-navy-100 rounded-lg flex items-center justify-center">
                <Images className="w-4 h-4 text-navy-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</span>
            </div>
            <p className="font-display text-3xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">fotos historial</p>
          </div>
        </div>

        {/* Botón de captura rápida */}
        <Link href="/worker/upload">
          <div className="bg-brand-500 rounded-2xl p-5 shadow-brand-glow flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">Subir foto de trabajo</p>
              <p className="text-brand-100 text-sm">Con ubicación GPS automática</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
        </Link>

        {/* Fotos recientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Fotos recientes</h2>
            <Link href="/worker/history" className="text-brand-600 text-sm font-medium">
              Ver todas
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentPhotos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Sin fotos todavía</p>
              <p className="text-gray-400 text-xs mt-1">Sube tu primera foto de trabajo</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentPhotos.map((photo: Photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <Image
                    src={getPhotoSrc(photo.url)}
                    alt="Foto de trabajo"
                    fill
                    unoptimized
                    className="object-cover rounded-xl"
                    sizes="(max-width: 768px) 33vw"
                  />
                  {photo.latitude && (
                    <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1">
                      <MapPin className="w-2.5 h-2.5 text-brand-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        {recentPhotos.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Última actividad</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {recentPhotos.slice(0, 3).map((photo: Photo) => (
                <div key={photo.id} className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 relative rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={getPhotoSrc(photo.url)}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {formatDate(photo.createdAt)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {photo.latitude ? (
                        <>
                          <MapPin className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-gray-400">Con ubicación</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-400">Sin ubicación</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{timeAgo(photo.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
