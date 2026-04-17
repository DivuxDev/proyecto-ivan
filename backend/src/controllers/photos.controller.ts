import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { prisma } from '../config/database';
import { extractExifData } from '../utils/exif.utils';
import { getFileUrl, UPLOAD_DIR } from '../config/storage';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest, PhotoQueryParams } from '../types';

export async function uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError(400, 'No se ha subido ningún archivo');
  }

  const userId = req.user!.userId;
  const { latitude, longitude, notes } = req.body as {
    latitude?: string;
    longitude?: string;
    notes?: string;
  };

  const originalPath = path.join(UPLOAD_DIR, req.file.filename);

  // Extraer metadatos EXIF (GPS + fecha)
  const exifData = await extractExifData(originalPath);

  // GPS: prioridad EXIF → coords enviadas por el cliente
  const lat = exifData.latitude ?? (latitude ? parseFloat(latitude) : undefined);
  const lng = exifData.longitude ?? (longitude ? parseFloat(longitude) : undefined);
  const takenAt = exifData.takenAt ?? new Date();

  // Validar coords si se proporcionaron
  if ((lat !== undefined && (lat < -90 || lat > 90)) ||
      (lng !== undefined && (lng < -180 || lng > 180))) {
    fs.unlinkSync(originalPath);
    throw new AppError(400, 'Coordenadas GPS inválidas');
  }

  // Optimizar imagen: redimensionar si es muy grande, convertir a JPEG progresivo
  const optimizedFilename = req.file.filename.replace(/\.[^.]+$/, '') + '_opt.jpg';
  const optimizedPath = path.join(UPLOAD_DIR, optimizedFilename);

  await sharp(originalPath)
    .rotate() // Aplicar orientación EXIF automáticamente
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toFile(optimizedPath);

  // Eliminar original, mantener optimizado
  fs.unlinkSync(originalPath);

  const stats = fs.statSync(optimizedPath);

  const photo = await prisma.photo.create({
    data: {
      userId,
      filename: optimizedFilename,
      url: getFileUrl(optimizedFilename),
      mimetype: 'image/jpeg',
      sizeBytes: stats.size,
      latitude: lat,
      longitude: lng,
      altitude: exifData.altitude,
      notes: notes?.trim() || null,
      takenAt,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ success: true, data: photo });
}

export async function listPhotos(req: AuthRequest, res: Response): Promise<void> {
  const { userId, startDate, endDate, page = '1', limit = '20' } = req.query as PhotoQueryParams;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Trabajador sólo ve sus propias fotos
  if (req.user?.role === 'WORKER') {
    where.userId = req.user.userId;
  } else if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
    };
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.photo.count({ where }),
  ]);

  res.json({
    success: true,
    data: photos,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getPhoto(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  // Trabajador sólo puede ver sus propias fotos
  if (req.user?.role === 'WORKER' && photo.userId !== req.user.userId) {
    throw new AppError(403, 'Acceso denegado');
  }

  res.json({ success: true, data: photo });
}

export async function deletePhoto(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    throw new AppError(404, 'Foto no encontrada');
  }

  // Eliminar archivo físico
  const filePath = path.join(UPLOAD_DIR, photo.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.photo.delete({ where: { id } });

  res.json({ success: true, message: 'Foto eliminada' });
}

export async function getPhotosForMap(req: AuthRequest, res: Response): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    latitude: { not: null },
    longitude: { not: null },
  };

  if (req.user?.role === 'WORKER') {
    where.userId = req.user.userId;
  } else if (req.query.userId) {
    where.userId = req.query.userId;
  }

  const photos = await prisma.photo.findMany({
    where,
    select: {
      id: true,
      url: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      takenAt: true,
      notes: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000, // Límite para performance del mapa
  });

  res.json({ success: true, data: photos });
}
