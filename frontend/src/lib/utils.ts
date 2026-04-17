import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/** Combina clases de Tailwind de forma segura */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Devuelve la URL de una foto lista para usar en <Image unoptimized>.
 * Extrae solo el pathname (/uploads/...) para que el rewrite de Next.js
 * lo proxee a través del servidor, funcionando en cualquier red/dispositivo.
 */
export function getPhotoSrc(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).pathname; // /uploads/filename_opt.jpg
  } catch {
    return url; // ya es relativa
  }
}

/** Formatea fecha a "dd/MM/yyyy HH:mm" en español */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '—';
    return format(date, "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return '—';
  }
}

/** Formatea fecha a "dd/MM/yyyy" en español */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '—';
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return '—';
  }
}

/** Formatea fecha relativa: "hace 3 horas" */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '—';
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return '—';
  }
}

/** Formatea bytes a KB/MB/GB */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

/** Formatea coordenadas GPS */
export function formatCoords(lat?: number | null, lng?: number | null): string {
  if (lat == null || lng == null) return 'Sin ubicación';
  return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
}

/** Descarga un Blob como archivo */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Extrae el mensaje de error de una respuesta de Axios */
export function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data
  ) {
    return String((error.response.data as { error: string }).error);
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
}
