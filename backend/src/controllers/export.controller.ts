import { Request, Response, NextFunction } from 'express';
import {
  exportDarwinCoreCSV,
  exportSingleSighting,
  exportProjectSightings,
  exportMySightings
} from '../services/export.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Helper para mandar la respuesta con headers de CSV o XLSX
 */
function sendExportResponse(res: Response, filenameBase: string, data: string | Buffer, format: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const isXlsx = format === 'xlsx';
  const filename = `${filenameBase}_${timestamp}.${isXlsx ? 'xlsx' : 'csv'}`;

  if (isXlsx) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  }
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data);
}

/**
 * GET /api/v1/export/csv?investigation_id=<uuid>
 * Existente: Descarga un archivo CSV Darwin Core.
 */
export const exportCsvController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { investigation_id } = req.query;
    if (investigation_id && typeof investigation_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(investigation_id)) {
        throw new AppError('El investigation_id debe ser un UUID válido.', 400);
      }
    }

    const csv = await exportDarwinCoreCSV(
      typeof investigation_id === 'string' ? investigation_id : undefined,
    );

    const filenameBase = investigation_id ? `gaia_proyecto_${investigation_id}` : `gaia_dataset_global`;
    sendExportResponse(res, filenameBase, csv, 'csv');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/export/sighting/:id?format=csv|xlsx
 */
export const exportSingleSightingController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sightingId = typeof req.params.id === 'string' ? req.params.id : (Array.isArray(req.params.id) ? String(req.params.id[0]) : '');
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const token = req.user?.token;

    if (!sightingId) throw new AppError('sightingId requerido', 400);

    const data = await exportSingleSighting(sightingId, format, token);
    sendExportResponse(res, `gaia_avistamiento_${sightingId}`, data, format);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/export/project/:id?format=csv|xlsx&only_validated=true|false
 */
export const exportProjectController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const investigationId = typeof req.params.id === 'string' ? req.params.id : (Array.isArray(req.params.id) ? String(req.params.id[0]) : '');
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const onlyValidated = req.query.only_validated === 'true';
    const token = req.user?.token;

    if (!investigationId) throw new AppError('investigationId requerido', 400);

    const data = await exportProjectSightings(investigationId, format, onlyValidated, token);
    sendExportResponse(res, `gaia_proyecto_${investigationId}`, data, format);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/export/my?format=csv|xlsx
 */
export const exportMyController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id || '';
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const token = req.user?.token;

    if (!userId) throw new AppError('Usuario no autenticado', 401);

    const data = await exportMySightings(userId, format, token);
    sendExportResponse(res, `gaia_mis_avistamientos`, data, format);
  } catch (error) {
    next(error);
  }
};
