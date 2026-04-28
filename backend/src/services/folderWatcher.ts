import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { prisma } from '../config/database';
import { extractExifData } from '../utils/exif.utils';
import { getFileUrl, UPLOAD_DIR } from '../config/storage';

const WATCH_DIR = process.env.WATCH_FOLDERS_DIR || '/share/TagMapFotos';
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_SECONDS || '60') * 1000;

interface ImportResult {
  success: number;
  skipped: number;
  errors: number;
}

// Estado global del folder watcher
let lastScanDate: Date | null = null;
let lastScanResult: ImportResult = { success: 0, skipped: 0, errors: 0 };
let isScanning = false;

/**
 * Obtiene el estado actual del folder watcher
 */
export function getWatcherStatus() {
  return {
    enabled: process.env.ENABLE_FOLDER_WATCHER === 'true',
    watchDir: WATCH_DIR,
    scanIntervalSeconds: SCAN_INTERVAL / 1000,
    lastScanDate,
    lastScanResult,
    isScanning,
    nextScanIn: lastScanDate ? 
      Math.max(0, SCAN_INTERVAL - (Date.now() - lastScanDate.getTime())) / 1000 : 
      null,
  };
}

/**
 * Calcula el hash MD5 de un archivo para detectar duplicados
 */
function getFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Importa una foto desde el sistema de archivos a la base de datos
 */
async function importPhoto(
  filePath: string,
  userId: number,
  teamName: string
): Promise<void> {
  const originalFilename = path.basename(filePath);
  
  // Calcular hash para detectar duplicados
  const fileHash = getFileHash(filePath);
  
  // Verificar si ya existe por hash
  const existingByHash = await prisma.photo.findFirst({
    where: { 
      OR: [
        { filename: { contains: fileHash } },
        { notes: { contains: fileHash } }
      ]
    }
  });
  
  if (existingByHash) {
    console.log(`   ⏭️  ${originalFilename} (duplicado por hash)`);
    return;
  }

  // Extraer EXIF
  const exifData = await extractExifData(filePath);

  const lat = exifData.latitude;
  const lng = exifData.longitude;
  const takenAt = exifData.takenAt ?? new Date(fs.statSync(filePath).mtime);

  // Validar coords
  if ((lat !== undefined && (lat < -90 || lat > 90)) ||
      (lng !== undefined && (lng < -180 || lng > 180))) {
    throw new Error('Coordenadas GPS inválidas');
  }

  // Generar nombre único para el archivo optimizado
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const optimizedFilename = `${teamName}_${timestamp}_${randomSuffix}_opt.jpg`;
  const optimizedPath = path.join(UPLOAD_DIR, optimizedFilename);

  // Optimizar imagen
  await sharp(filePath)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toFile(optimizedPath);

  const stats = fs.statSync(optimizedPath);

  // Guardar en DB con el hash en las notas para futuras comprobaciones
  await prisma.photo.create({
    data: {
      userId,
      filename: optimizedFilename,
      url: getFileUrl(optimizedFilename),
      mimetype: 'image/jpeg',
      sizeBytes: stats.size,
      latitude: lat,
      longitude: lng,
      altitude: exifData.altitude,
      gpsSpeed: exifData.gpsSpeed,
      gpsBearing: exifData.gpsBearing,
      notes: `Auto-importado desde ${teamName} | Hash: ${fileHash} | Original: ${originalFilename}`,
      takenAt,
      exifMake: exifData.exifMake,
      exifModel: exifData.exifModel,
      exifIso: exifData.exifIso,
      exifAperture: exifData.exifAperture,
      exifShutter: exifData.exifShutter,
      exifFocalLen: exifData.exifFocalLen,
    },
  });

  console.log(`   ✅ ${originalFilename}`);
}

/**
 * Escanea una carpeta de equipo e importa las fotos nuevas
 */
async function scanTeamFolder(teamFolderPath: string, teamName: string): Promise<ImportResult> {
  const result: ImportResult = { success: 0, skipped: 0, errors: 0 };

  // Obtener o crear usuario virtual para el equipo
  let user = await prisma.user.findUnique({
    where: { email: `${teamName.toLowerCase().replace(/\s+/g, '-')}@tagmap.internal` }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: teamName,
        email: `${teamName.toLowerCase().replace(/\s+/g, '-')}@tagmap.internal`,
        password: 'N/A', // Sin login
        role: 'WORKER',
        phone: 'Auto-generado por carpeta',
      }
    });
    console.log(`   👤 Usuario virtual creado: ${teamName}`);
  }

  // Crear subcarpeta "procesadas" si no existe
  const processedDir = path.join(teamFolderPath, 'procesadas');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  // Escanear fotos en la carpeta raíz del equipo
  const files = fs.readdirSync(teamFolderPath);
  const photoFiles = files.filter(f => 
    /\.(jpg|jpeg|png)$/i.test(f) && !f.startsWith('.')
  );

  for (const photoFile of photoFiles) {
    const photoPath = path.join(teamFolderPath, photoFile);
    
    // Solo procesar archivos (ignorar carpetas)
    if (!fs.statSync(photoPath).isFile()) {
      continue;
    }

    try {
      await importPhoto(photoPath, user.id, teamName);
      
      // Mover a carpeta "procesadas"
      const processedPath = path.join(processedDir, photoFile);
      fs.renameSync(photoPath, processedPath);
      
      result.success++;
    } catch (error) {
      result.errors++;
      console.error(`   ❌ Error procesando ${photoFile}:`, error instanceof Error ? error.message : error);
    }
  }

  return result;
}

/**
 * Escanea todas las carpetas de equipos
 */
async function scanAllFolders(): Promise<void> {
  if (!fs.existsSync(WATCH_DIR)) {
    console.log(`⚠️  Directorio de observación no existe: ${WATCH_DIR}`);
    return;
  }

  isScanning = true;
  console.log(`\n🔍 Escaneando carpetas en ${WATCH_DIR}...`);

  const folders = fs.readdirSync(WATCH_DIR);
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const folderName of folders) {
    const folderPath = path.join(WATCH_DIR, folderName);
    
    // Solo procesar directorios
    if (!fs.statSync(folderPath).isDirectory()) {
      continue;
    }

    // Ignorar carpetas ocultas
    if (folderName.startsWith('.')) {
      continue;
    }

    console.log(`\n📁 Procesando: ${folderName}`);
    
    try {
      const result = await scanTeamFolder(folderPath, folderName);
      totalSuccess += result.success;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      
      if (result.success > 0 || result.errors > 0) {
        console.log(`   Importadas: ${result.success} | Errores: ${result.errors}`);
      } else {
        console.log(`   Sin fotos nuevas`);
      }
    } catch (error) {
      console.error(`   ❌ Error procesando carpeta ${folderName}:`, error);
      totalErrors++;
    }
  }

  if (totalSuccess > 0 || totalErrors > 0) {
    console.log(`\n📊 Total: ${totalSuccess} importadas, ${totalErrors} errores\n`);
  }

  // Actualizar estado
  lastScanDate = new Date();
  lastScanResult = { success: totalSuccess, skipped: totalSkipped, errors: totalErrors };
  isScanning = false;
}

/**
 * Inicia el servicio de observación de carpetas
 */
export function startFolderWatcher(): void {
  const enabled = process.env.ENABLE_FOLDER_WATCHER === 'true';
  
  if (!enabled) {
    console.log('📂 Folder watcher deshabilitado (ENABLE_FOLDER_WATCHER != true)');
    return;
  }

  console.log('📂 Folder watcher iniciado');
  console.log(`   Directorio: ${WATCH_DIR}`);
  console.log(`   Intervalo: ${SCAN_INTERVAL / 1000}s`);

  // Escaneo inicial
  scanAllFolders().catch(err => {
    console.error('❌ Error en escaneo inicial:', err);
  });

  // Escaneo periódico
  setInterval(() => {
    scanAllFolders().catch(err => {
      console.error('❌ Error en escaneo periódico:', err);
    });
  }, SCAN_INTERVAL);
}
