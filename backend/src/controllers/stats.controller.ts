import { Response } from 'express';
import { prisma } from '../config/database';
import { generateExcel, generateCsv } from '../utils/export.utils';
import { AuthRequest } from '../types';

export async function getOverview(_req: AuthRequest, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalPhotos,
    totalWorkers,
    photosToday,
    photosWeek,
    photosMonth,
    activeTodayGroups,
  ] = await Promise.all([
    prisma.photo.count(),
    prisma.user.count({ where: { role: 'WORKER', active: true } }),
    prisma.photo.count({ where: { createdAt: { gte: today } } }),
    prisma.photo.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.photo.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.photo.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalPhotos,
      totalWorkers,
      photosToday,
      photosThisWeek: photosWeek,
      photosThisMonth: photosMonth,
      activeToday: activeTodayGroups.length,
    },
  });
}

export async function getActivity(req: AuthRequest, res: Response): Promise<void> {
  const period = (req.query.period as string) || 'week';

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  }

  const photos = await prisma.photo.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });

  // Agrupar por fecha
  const byDate = new Map<string, { photos: number; workers: Set<string> }>();

  photos.forEach(photo => {
    const dateKey = photo.createdAt.toISOString().split('T')[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { photos: 0, workers: new Set() });
    }
    const entry = byDate.get(dateKey)!;
    entry.photos++;
    entry.workers.add(photo.userId);
  });

  const activity = Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    photos: data.photos,
    workers: data.workers.size,
  }));

  res.json({ success: true, data: activity });
}

export async function getWorkerStats(_req: AuthRequest, res: Response): Promise<void> {
  const workers = await prisma.user.findMany({
    where: { role: 'WORKER', active: true },
    select: {
      id: true,
      name: true,
      _count: { select: { photos: true } },
      photos: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  const stats = workers.map(worker => ({
    userId: worker.id,
    userName: worker.name,
    totalPhotos: worker._count.photos,
    lastActivity: worker.photos[0]?.createdAt ?? null,
  }));

  res.json({ success: true, data: stats });
}

export async function exportData(req: AuthRequest, res: Response): Promise<void> {
  const format = (req.query.format as string) || 'xlsx';
  const { userId, startDate, endDate } = req.query as {
    userId?: string;
    startDate?: string;
    endDate?: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
    };
  }

  const photos = await prisma.photo.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = photos.map(photo => ({
    ID: photo.id,
    Trabajador: photo.user.name,
    Email: photo.user.email,
    'Fecha subida': photo.createdAt.toLocaleString('es-ES'),
    'Fecha captura': photo.takenAt?.toLocaleString('es-ES') ?? '',
    Latitud: photo.latitude ?? '',
    Longitud: photo.longitude ?? '',
    Altitud: photo.altitude ?? '',
    Notas: photo.notes ?? '',
    'URL Foto': photo.url,
    'Tamaño (bytes)': photo.sizeBytes ?? '',
  }));

  if (format === 'csv') {
    const csv = generateCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fotos_campo.csv"');
    // BOM para compatibilidad con Excel
    res.send('\uFEFF' + csv);
    return;
  }

  const buffer = generateExcel(rows, 'Fotos de Campo');
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="fotos_campo.xlsx"');
  res.send(buffer);
}
