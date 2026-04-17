export type Role = 'ADMIN' | 'WORKER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  active?: boolean;
  createdAt?: string;
  _count?: { photos: number };
}

export interface Photo {
  id: string;
  userId: string;
  user: { id: string; name: string };
  filename: string;
  url: string;
  mimetype: string;
  sizeBytes?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  notes?: string | null;
  takenAt?: string | null;
  createdAt: string;
}

export interface MapPhoto {
  id: string;
  url: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  takenAt?: string | null;
  notes?: string | null;
  user: { id: string; name: string };
}

export interface StatsOverview {
  totalPhotos: number;
  totalWorkers: number;
  photosToday: number;
  photosThisWeek: number;
  photosThisMonth: number;
  activeToday: number;
}

export interface DailyActivity {
  date: string;
  photos: number;
  workers: number;
}

export interface WorkerStats {
  userId: string;
  userName: string;
  totalPhotos: number;
  lastActivity: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedPhotos {
  success: boolean;
  data: Photo[];
  pagination: PaginationMeta;
}

export interface PhotoFilters {
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
