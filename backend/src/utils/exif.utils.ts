import exifr from 'exifr';
import path from 'path';

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  takenAt?: Date;
}

/**
 * Extrae metadatos GPS y fecha de una imagen usando datos EXIF.
 * Si no hay datos EXIF, retorna un objeto vacío (best-effort).
 */
export async function extractExifData(filePath: string): Promise<PhotoMetadata> {
  try {
    const exif = await exifr.parse(filePath, {
      gps: true,
      tiff: true,
      exif: true,
      translateValues: true,
    });

    if (!exif) return {};

    const result: PhotoMetadata = {};

    // GPS
    if (exif.latitude != null && exif.longitude != null) {
      result.latitude = exif.latitude;
      result.longitude = exif.longitude;
    }
    if (exif.altitude != null) {
      result.altitude = exif.altitude;
    }

    // Fecha de captura
    const dateSource = exif.DateTimeOriginal || exif.DateTime || exif.CreateDate;
    if (dateSource) {
      const parsed = new Date(dateSource);
      if (!isNaN(parsed.getTime())) {
        result.takenAt = parsed;
      }
    }

    return result;
  } catch (err) {
    console.warn(`[EXIF] No se pudo leer metadatos de ${path.basename(filePath)}:`, err);
    return {};
  }
}
