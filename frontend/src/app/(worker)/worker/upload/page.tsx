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

        {/* ── Zona de selección o grid de fotos ── */}
        {items.length === 0 ? (
          <div className="space-y-3">
            {/* Botón cámara */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-brand-500 text-white rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform shadow-amber-glow"
            >
              <Camera className="w-8 h-8" />
              <span className="font-semibold text-base">Usar cámara</span>
              <span className="text-brand-100 text-xs">Captura una foto ahora</span>
            </button>

            {/* Botón galería */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-600 rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <FileImage className="w-7 h-7 text-gray-400" />
              <span className="font-medium text-sm">Seleccionar de galería</span>
              <span className="text-gray-400 text-xs">Puedes elegir varias fotos a la vez</span>
            </button>
          </div>
        ) : (
          /* ── Grid de previews ── */
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
                  {/* Eliminar (solo si no está subiendo ni exitoso) */}
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

              {/* Añadir más (solo si no está subiendo) */}
              {!isUploading && !allDone && (
                <>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:scale-[0.97] transition-transform"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Cámara</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:scale-[0.97] transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Añadir</span>
                  </button>
                </>
              )}
            </div>

            {errorCount > 0 && !isUploading && (
              <p className="text-xs text-red-500 mt-2">
                {errorCount} foto{errorCount !== 1 ? 's' : ''} con error — se reintentarán al pulsar Subir.
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

        {/* Estado de geolocalización */}
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
                  ? 'Ubicación capturada'
                  : geoLoading
                  ? 'Obteniendo ubicación...'
                  : geoError
                  ? 'Ubicación no disponible'
                  : 'Sin ubicación GPS'}
              </p>
              {position && (
                <p className="text-xs text-green-600 mt-0.5">
                  {position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°
                  {' '}(±{Math.round(position.accuracy)}m)
                </p>
              )}
              {geoError && (
                <p className="text-xs text-red-500 mt-0.5">
                  {geoError.includes('EXIF') ? geoError : `${geoError} Las coordenadas del EXIF de la foto se usarán si están disponibles.`}
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
              Notas (opcional{items.length > 1 ? ' — se aplican a todas las fotos' : ''})
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

        {/* Mensaje de éxito total */}
        {allDone && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-3.5 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              ¡Todas las fotos subidas correctamente!
            </p>
          </div>
        )}

        {/* Botón de subida */}
        {items.length > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={uploadableCount === 0 || isUploading || allDone}
            className="w-full bg-navy-800 hover:bg-navy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            {allDone ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>¡Completado!</span>
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


type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadPage() {
  const queryClient = useQueryClient();
  const { position, loading: geoLoading, error: geoError, getCurrentPosition } = useGeolocation();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Capturar ubicación automáticamente al montar
  const handleGetLocation = useCallback(async () => {
    try {
      await getCurrentPosition();
    } catch {
      // Error manejado en el hook
    }
  }, [getCurrentPosition]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona una imagen');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('El archivo no puede superar 10MB');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    setUploadState('idle');

    const url = URL.createObjectURL(selectedFile);
    setPreview(url);

    // Si no hay ubicación todavía, capturarla automáticamente
    if (!position) {
      handleGetLocation();
    }
  }, [position, handleGetLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No hay archivo seleccionado');

      const formData = new FormData();
      formData.append('photo', file);

      if (position) {
        formData.append('latitude', String(position.latitude));
        formData.append('longitude', String(position.longitude));
      }

      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      return photosApi.upload(formData);
    },
    onMutate: () => {
      setUploadState('uploading');
      setUploadProgress(0);
      // Simular progreso de upload
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) { clearInterval(interval); return prev; }
          return prev + 10;
        });
      }, 200);
    },
    onSuccess: () => {
      setUploadProgress(100);
      setUploadState('success');
      queryClient.invalidateQueries({ queryKey: ['worker-recent-photos'] });
      queryClient.invalidateQueries({ queryKey: ['worker-today-photos'] });
      // Limpiar formulario tras 2s
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setNotes('');
        setUploadState('idle');
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }, 2500);
    },
    onError: (err) => {
      setUploadState('error');
      setErrorMessage(getErrorMessage(err));
    },
  });

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setUploadState('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <Link href="/worker" className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-gray-900">Subir foto de trabajo</h1>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Preview / Selector de foto */}
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3]">
            <Image src={preview} alt="Preview" fill className="object-contain" sizes="100vw" />
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {file && (
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-3 py-1">
                <p className="text-white text-xs truncate max-w-[200px]">{file.name}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Botón cámara */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-brand-500 text-white rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform shadow-amber-glow"
            >
              <Camera className="w-8 h-8" />
              <span className="font-semibold text-base">Usar cámara</span>
              <span className="text-brand-100 text-xs">Captura una foto ahora</span>
            </button>

            {/* Botón galería */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-600 rounded-2xl py-5 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <FileImage className="w-7 h-7 text-gray-400" />
              <span className="font-medium text-sm">Seleccionar de galería</span>
            </button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        {/* Estado de geolocalización */}
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
                  ? 'Ubicación capturada'
                  : geoLoading
                  ? 'Obteniendo ubicación...'
                  : geoError
                  ? 'Ubicación no disponible'
                  : 'Sin ubicación GPS'}
              </p>
              {position && (
                <p className="text-xs text-green-600 mt-0.5">
                  {position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°
                  {' '}(±{Math.round(position.accuracy)}m)
                </p>
              )}
              {geoError && (
                <p className="text-xs text-red-500 mt-0.5">
                  {geoError.includes('EXIF') ? geoError : `${geoError} Las coordenadas del EXIF de la foto se usarán si están disponibles.`}
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

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notas (opcional)
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

        {/* Mensajes de estado */}
        {uploadState === 'success' && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-3.5 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-green-800 text-sm font-medium">¡Foto subida correctamente!</p>
          </div>
        )}

        {(uploadState === 'error' || errorMessage) && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Progreso de upload */}
        {uploadState === 'uploading' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subiendo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Botón de subida */}
        <button
          onClick={() => mutation.mutate()}
          disabled={!file || uploadState === 'uploading' || uploadState === 'success'}
          className="w-full bg-navy-800 hover:bg-navy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
        >
          {uploadState === 'uploading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Subiendo foto...</span>
            </>
          ) : uploadState === 'success' ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>¡Completado!</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>{file ? 'Subir foto' : 'Selecciona una foto'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
