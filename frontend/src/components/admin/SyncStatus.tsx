'use client';

import { useQuery } from '@tanstack/react-query';
import { folderWatcherApi } from '@/lib/api';
import { RefreshCw, FolderSync, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface WatcherStatus {
  enabled: boolean;
  watchDir: string;
  scanIntervalSeconds: number;
  lastScanDate: string | null;
  lastScanResult: {
    success: number;
    skipped: number;
    errors: number;
  };
  isScanning: boolean;
  nextScanIn: number | null;
}

export default function SyncStatus() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['folder-watcher-status'],
    queryFn: async () => {
      const res = await folderWatcherApi.getStatus();
      return res.data.data as WatcherStatus;
    },
    refetchInterval: 10 * 1000, // Refrescar cada 10 segundos
  });

  if (isLoading) {
    return (
      <div className="admin-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-700 rounded-xl flex items-center justify-center animate-pulse">
            <FolderSync className="w-5 h-5 text-navy-400" />
          </div>
          <div>
            <p className="text-navy-300 text-sm">Cargando estado...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.enabled) {
    return (
      <div className="admin-card border border-navy-700/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-navy-700/50 rounded-xl flex items-center justify-center">
            <FolderSync className="w-5 h-5 text-navy-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-0.5">Folder Watcher</h3>
            <p className="text-navy-400 text-sm">Sincronización automática deshabilitada</p>
            <p className="text-navy-500 text-xs mt-1">
              Habilita ENABLE_FOLDER_WATCHER=true en las variables de entorno
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lastScan = data.lastScanDate ? new Date(data.lastScanDate) : null;
  const hasErrors = data.lastScanResult.errors > 0;
  const hasSuccess = data.lastScanResult.success > 0;

  return (
    <div className={`admin-card ${hasErrors ? 'border border-red-500/30' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${data.isScanning ? 'bg-brand-500/20' : 'bg-emerald-500/20'} rounded-xl flex items-center justify-center`}>
            <FolderSync className={`w-5 h-5 ${data.isScanning ? 'text-brand-400 animate-spin' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-0.5">Folder Watcher</h3>
            <p className="text-navy-300 text-xs">
              {data.isScanning ? 'Escaneando...' : 'Sincronización automática activa'}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-navy-700/50 rounded-lg transition-colors group"
          title="Actualizar estado"
        >
          <RefreshCw className="w-4 h-4 text-navy-400 group-hover:text-brand-400 transition-colors" />
        </button>
      </div>

      {/* Última sincronización */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-navy-400" />
          <span className="text-navy-300">Última sincronización:</span>
          <span className="text-white font-medium">
            {lastScan ? timeAgo(lastScan) : 'Nunca'}
          </span>
        </div>

        {lastScan && (
          <div className="text-xs text-navy-400">
            {lastScan.toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Resultado del último scan */}
        {lastScan && (
          <div className="flex items-center gap-4 pt-3 border-t border-navy-700/50">
            {hasSuccess && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">
                  {data.lastScanResult.success} importadas
                </span>
              </div>
            )}
            {hasErrors && (
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">
                  {data.lastScanResult.errors} errores
                </span>
              </div>
            )}
            {!hasSuccess && !hasErrors && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-navy-400" />
                <span className="text-navy-400 text-sm">Sin fotos nuevas</span>
              </div>
            )}
          </div>
        )}

        {/* Próximo scan */}
        {data.nextScanIn !== null && (
          <div className="text-xs text-navy-400 pt-2">
            Próximo escaneo en ~{Math.ceil(data.nextScanIn)}s
          </div>
        )}

        {/* Carpeta monitoreada */}
        <div className="text-xs text-navy-500 pt-2 border-t border-navy-700/50">
          📁 {data.watchDir}
        </div>
      </div>
    </div>
  );
}
