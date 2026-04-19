'use client';

import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { photosApi } from '@/lib/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getErrorMessage } from '@/lib/utils';
import {
  Camera,
  Upload,
  MapPin,
  MapPinOff,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  FileImage,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface FileItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
  const queryClient = useQueryClient();
  const { position, loading: geoLoading, error: geoError, getCurrentPosition } = useGeolocation();
  const [items, setItems] = useState<FileItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleGetLocation = useCallback(async () => {
    try { await getCurrentPosition(); } catch { /* manejado en el hook */ }
  }, [getCurrentPosition]);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newItems: FileItem[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue; // >10MB ignorado
      newItems.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
      setAllDone(false);
      if (!position) handleGetLocation();
    }
  }, [position, handleGetLocation]);

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleUploadAll = async () => {
    const pending = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pending.length === 0 || isUploading) return;

    setIsUploading(true);
    setAllDone(false);

    for (const item of pending) {
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'uploading', error: undefined } : i
      ));

      try {
        const formData = new FormData();
        formData.append('photo', item.file);
        if (position) {
          formData.append('latitude', String(position.latitude));
          formData.append('longitude', String(position.longitude));
        }
        if (notes.trim()) {
          formData.append('notes', notes.trim());
        }
        await photosApi.upload(formData);
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'success' } : i
        ));
      } catch (err) {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'error', error: getErrorMessage(err) } : i
        ));
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['worker-recent-photos'] });
    queryClient.invalidateQueries({ queryKey: ['worker-today-photos'] });

    // Si no hay errores, limpiar todo tras 2.5s
    setItems(current => {
      const anyError = current.some(i => i.status === 'error');
      if (!anyError) {
        setAllDone(true);
        setTimeout(() => {
          current.forEach(i => URL.revokeObjectURL(i.preview));
          setItems([]);
          setNotes('');
          setAllDone(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (cameraInputRef.current) cameraInputRef.current.value = '';
        }, 2500);
      }
      return current;
    });
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const uploadableCount = pendingCount + errorCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <Link href="/worker" className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-gray-900">Subir fotos de trabajo</h1>
        {items.length > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {items.length} seleccionada{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* â”€â”€ Zona de selecciÃ³n o grid de fotos â”€â”€ */}
        {items.length === 0 ? (
          <div className="space-y-3">
            {/* BotÃ³n cÃ¡mara */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-brand-500 text-white rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform shadow-amber-glow"
            >
              <Camera className="w-8 h-8" />
              <span className="font-semibold text-base">Usar cÃ¡mara</span>
              <span className="text-brand-100 text-xs">Captura una foto ahora</span>
            </button>

            {/* BotÃ³n galerÃ­a */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-600 rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <FileImage className="w-7 h-7 text-gray-400" />
              <span className="font-medium text-sm">Seleccionar de galerÃ­a</span>
              <span className="text-gray-400 text-xs">Puedes elegir varias fotos a la vez</span>
            </button>
          </div>
        ) : (
          /* â”€â”€ Grid de previews â”€â”€ */
          <div>
            <div className="grid grid-cols-3 gap-2">
              {items.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200">
                  <Image
                    src={item.preview}
                    alt={item.file.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 30vw, 160px"
                  />
                  {/* Overlay de estado */}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  {item.status === 'success' && (
                    <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/70 flex flex-col items-center justify-center gap-1 px-1">
                      <AlertCircle className="w-6 h-6 text-white" />
                      {item.error && (
                        <p className="text-white text-[9px] text-center leading-tight line-clamp-2">{item.error}</p>
                      )}
                    </div>
                  )}
                  {/* Eliminar (solo si no estÃ¡ subiendo ni exitoso) */}
                  {item.status !== 'uploading' && item.status !== 'success' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}

              {/* AÃ±adir mÃ¡s (solo si no estÃ¡ subiendo) */}
              {!isUploading && !allDone && (
                <>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:scale-[0.97] transition-transform"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-medium">CÃ¡mara</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:scale-[0.97] transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">AÃ±adir</span>
                  </button>
                </>
              )}
            </div>

            {errorCount > 0 && !isUploading && (
              <p className="text-xs text-red-500 mt-2">
                {errorCount} foto{errorCount !== 1 ? 's' : ''} con error â€” se reintentarÃ¡n al pulsar Subir.
              </p>
            )}
          </div>
        )}

        {/* Inputs ocultos */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />

        {/* Estado de geolocalizaciÃ³n */}
        <div
          className={`rounded-xl p-3.5 flex items-center justify-between ${
            position
              ? 'bg-green-50 border border-green-200'
              : geoError
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-100 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {position ? (
              <MapPin className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <MapPinOff className="w-5 h-5 text-gray-400 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${position ? 'text-green-800' : 'text-gray-700'}`}>
                {position
                  ? 'UbicaciÃ³n capturada'
                  : geoLoading
                  ? 'Obteniendo ubicaciÃ³n...'
                  : geoError
                  ? 'UbicaciÃ³n no disponible'
                  : 'Sin ubicaciÃ³n GPS'}
              </p>
              {position && (
                <p className="text-xs text-green-600 mt-0.5">
                  {position.latitude.toFixed(4)}Â°, {position.longitude.toFixed(4)}Â°
                  {' '}(Â±{Math.round(position.accuracy)}m)
                </p>
              )}
              {geoError && (
                <p className="text-xs text-red-500 mt-0.5">
                  {geoError.includes('EXIF') ? geoError : `${geoError} Las coordenadas del EXIF de la foto se usarÃ¡n si estÃ¡n disponibles.`}
                </p>
              )}
            </div>
          </div>

          {!position && !geoLoading && (
            <button
              onClick={handleGetLocation}
              className="text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 shrink-0"
            >
              Obtener
            </button>
          )}
          {geoLoading && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
          )}
        </div>

        {/* Notas (solo si hay fotos) */}
        {items.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (opcional{items.length > 1 ? ' â€” se aplican a todas las fotos' : ''})
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe brevemente el trabajo realizado..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notes.length}/500</p>
          </div>
        )}

        {/* Mensaje de Ã©xito total */}
        {allDone && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-3.5 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              Â¡Todas las fotos subidas correctamente!
            </p>
          </div>
        )}

        {/* BotÃ³n de subida */}
        {items.length > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={uploadableCount === 0 || isUploading || allDone}
            className="w-full bg-navy-800 hover:bg-navy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            {allDone ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>Â¡Completado!</span>
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Subiendo fotos...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>
                  {uploadableCount > 0
                    ? `Subir ${uploadableCount} foto${uploadableCount !== 1 ? 's' : ''}`
                    : 'Selecciona una foto'}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

