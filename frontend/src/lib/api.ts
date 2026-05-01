import axios from 'axios';
import type { PhotoFilters } from '@/types';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar token JWT a todas las peticiones
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Manejar 401 globalmente — redirigir a login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Sólo redirigir si no estamos ya en /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
};

// ─── Fotos ───────────────────────────────────────────────────────────────────

export const photosApi = {
  upload: (formData: FormData) =>
    api.post('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (filters?: PhotoFilters) =>
    api.get('/photos', { params: filters }),
  getById: (id: string) => api.get(`/photos/${id}`),
  delete: (id: string) => api.delete(`/photos/${id}`),
  getMapPhotos: (filters?: { userId?: string; startDate?: string; endDate?: string }) =>
    api.get('/photos/map', { params: filters }),
};

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get('/users'),
  create: (data: {
    name: string;
    email: string;
    password: string;
    role?: 'ADMIN' | 'WORKER';
    phone?: string;
  }) => api.post('/users', data),
  update: (
    id: string,
    data: { name?: string; email?: string; role?: 'ADMIN' | 'WORKER'; phone?: string; active?: boolean }
  ) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  changePassword: (id: string, newPassword: string) =>
    api.put(`/users/${id}/password`, { newPassword }),
};

// ─── Estadísticas ────────────────────────────────────────────────────────────

export const statsApi = {
  overview: () => api.get('/stats/overview'),
  activity: (period: 'day' | 'week' | 'month' | 'year' = 'week') =>
    api.get('/stats/activity', { params: { period } }),
  workers: () => api.get('/stats/workers'),
  export: (
    format: 'csv' | 'xlsx',
    params?: { userId?: string; startDate?: string; endDate?: string }
  ) =>
    api.get('/stats/export', {
      params: { format, ...params },
      responseType: 'blob',
    }),
};

// ─── Folder Watcher ──────────────────────────────────────────────────────────

export const folderWatcherApi = {
  getStatus: () => api.get('/folder-watcher/status'),
  triggerSync: () => api.post('/folder-watcher/trigger'),
};
