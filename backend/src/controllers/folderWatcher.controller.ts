import { Request, Response } from 'express';
import { getWatcherStatus } from '../services/folderWatcher';

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
