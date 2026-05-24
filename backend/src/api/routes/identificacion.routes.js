"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const identificacion_controller_1 = require("../../controllers/identificacion.controller");
const router = (0, express_1.Router)();
// Configuramos multer para procesar form-data en memoria (evita escribir en disco)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    // Limits se configuran también a nivel de multer por seguridad
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB absolute limit, se rechaza antes de llegar al controller
    }
});
/**
 * @route POST /api/v1/identificacion/identificar
 * @description Identifica un animal a partir de una imagen
 */
router.post('/identificar', upload.single('archivo'), identificacion_controller_1.identificarAnimalController);
exports.default = router;
//# sourceMappingURL=identificacion.routes.js.map