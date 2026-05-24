import { Router } from 'express';
import multer from 'multer';
import { identificarAnimalController } from '../../controllers/identificacion.controller';

const router = Router();

// Configuramos multer para procesar form-data en memoria (evita escribir en disco)
const upload = multer({ 
  storage: multer.memoryStorage(),
  // Limits se configuran también a nivel de multer por seguridad
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB absolute limit, se rechaza antes de llegar al controller
  }
});

/**
 * @route POST /api/v1/identificacion/identificar
 * @description Identifica un animal a partir de una imagen
 */
router.post('/identificar', upload.single('archivo'), identificarAnimalController);

export default router;
