import { Request, Response, NextFunction } from 'express';
import { exportDarwinCoreCSV } from '../services/export.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * GET /api/export/csv?investigation_id=<uuid>
 * Descarga un archivo CSV con los registros validados en formato Darwin Core.
 * El parámetro investigation_id es opcional: si se omite, exporta todos los validados.
 * Solo accesible por Especialistas y Administradores.
 */
export const exportCsvController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { investigation_id } = req.query;

    // Validar que el UUID tenga formato correcto si se provee
    if (investigation_id && typeof investigation_id === 'string') {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(investigation_id)) {
        throw new AppError('El investigation_id debe ser un UUID válido.', 400);
      }
    }

    const csv = await exportDarwinCoreCSV(
      typeof investigation_id === 'string' ? investigation_id : undefined,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = investigation_id
      ? `observatorio_${investigation_id}_${timestamp}.csv`
      : `observatorio_global_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
