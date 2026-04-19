import exifr from 'exifr';
import path from 'path';

export interface PhotoMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsSpeed?: number;    // km/h
  gpsBearing?: number;  // grados (0-360)
  takenAt?: Date;
  exifMake?: string;    // fabricante cámara
  exifModel?: string;   // modelo cámara
  exifIso?: number;     // ISO
  exifAperture?: number; // f/número
  exifShutter?: number;  // segundos (ej. 0.001 = 1/1000s)
  exifFocalLen?: number; // mm
}

/**
 * Extrae metadatos GPS y EXIF completos de una imagen.
 * Optimizado para fotos de OpenCamera que incluye campos extendidos.
 */
export async function extractExifData(filePath: string): Promise<PhotoMetadata> {
  try {
    const exif = await exifr.parse(filePath, {
      gps: true,
      tiff: true,
      exif: true,
      translateValues: true,
      translateKeys: true,
    });

    if (!exif) return {};

    const result: PhotoMetadata = {};

    // GPS
    if (exif.latitude != null && exif.longitude != null) {
      result.latitude = exif.latitude;
      result.longitude = exif.longitude;
    }
    if (exif.altitude != null) result.altitude = exif.altitude;
    if (exif.GPSSpeed != null) {
      // GPSSpeed en EXIF es km/h si GPSSpeedRef='K', millas si 'M', nudos si 'N'
      const ref = exif.GPSSpeedRef || 'K';
      let speed = exif.GPSSpeed;
      if (ref === 'M') speed *= 1.60934;  // millas → km
      else if (ref === 'N') speed *= 1.852; // nudos → km
      result.gpsSpeed = Math.round(speed * 10) / 10;
    }
    if (exif.GPSImgDirection != null) result.gpsBearing = exif.GPSImgDirection;

    // Fecha de captura
    const dateSource = exif.DateTimeOriginal || exif.DateTime || exif.CreateDate;
    if (dateSource) {
      const parsed = new Date(dateSource);
      if (!isNaN(parsed.getTime())) result.takenAt = parsed;
    }

    // Cámara
    if (exif.Make) result.exifMake = String(exif.Make).trim();
    if (exif.Model) result.exifModel = String(exif.Model).trim();

    // Exposición
    if (exif.ISO != null) result.exifIso = Number(exif.ISO);
    if (exif.FNumber != null) result.exifAperture = exif.FNumber;
    if (exif.ExposureTime != null) result.exifShutter = exif.ExposureTime;
    if (exif.FocalLength != null) result.exifFocalLen = exif.FocalLength;

    return result;
  } catch (err) {
    console.warn(`[EXIF] No se pudo leer metadatos de ${path.basename(filePath)}:`, err);
    return {};
  }
}
