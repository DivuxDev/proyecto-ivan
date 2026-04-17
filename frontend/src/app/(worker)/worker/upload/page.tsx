'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
