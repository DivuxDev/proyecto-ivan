'use client';

import { useState, useCallback } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
  });

  const getCurrentPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const err = 'La geolocalización no está disponible en este dispositivo';
        setState(s => ({ ...s, error: err }));
        reject(new Error(err));
        return;
      }

      // Los navegadores móviles bloquean la geolocalización en HTTP (no HTTPS).
      // localhost está exento de esta restricción.
      const isHttp = typeof window !== 'undefined' &&
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost';

      if (isHttp) {
        const err = 'La geolocalización requiere HTTPS. El GPS del EXIF de la foto se usará automáticamente si tu cámara tiene la ubicación activada.';
        setState({ position: null, error: err, loading: false });
        reject(new Error(err));
        return;
      }

      setState(s => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        position => {
          const coords: GeoPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setState({ position: coords, error: null, loading: false });
          resolve(coords);
        },
        error => {
          const messages: Record<number, string> = {
            1: 'Acceso a ubicación denegado. Por favor, permite el acceso en tu navegador.',
            2: 'Posición no disponible. Intenta de nuevo.',
            3: 'Tiempo de espera agotado para obtener la ubicación.',
          };
          const msg = messages[error.code] || 'No se pudo obtener la ubicación';
          setState({ position: null, error: msg, loading: false });
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000, // Cache de 30s — en campo la posición no cambia tan rápido
        }
      );
    });
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return { ...state, getCurrentPosition, clearError };
}
