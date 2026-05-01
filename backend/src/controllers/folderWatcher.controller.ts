import { Request, Response } from 'express';
import { getWatcherStatus, scanAllFolders } from '../services/folderWatcher';

/**
 * Obtiene el estado del folder watcher
 */
export const getStatus = async (req: Request, res: Response) => {
  const status = getWatcherStatus();
  
  res.json({
    success: true,
    data: status,
  });
};

/**
 * Dispara una sincronización manual inmediata
 */
export const triggerSync = async (req: Request, res: Response) => {
  const status = getWatcherStatus();
  
  if (!status.enabled) {
    return res.status(400).json({
      success: false,
      message: 'Folder watcher está deshabilitado',
    });
  }
  
  if (status.isScanning) {
    return res.status(400).json({
      success: false,
      message: 'Ya hay una sincronización en curso',
    });
  }
  
  // Disparar sincronización en background
  scanAllFolders().catch(err => {
    console.error('❌ Error en sincronización manual:', err);
  });
  
  res.json({
    success: true,
    message: 'Sincronización iniciada',
  });
};
