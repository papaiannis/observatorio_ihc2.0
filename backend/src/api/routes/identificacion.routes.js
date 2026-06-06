"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const identificacion_controller_1 = require("../../controllers/identificacion.controller");
const router = (0, express_1.Router)();
/**
 * @route POST /api/v1/identificacion/identificar
 * @description Inicia el procesamiento de IA de un avistamiento a partir de su ID y photo_url
 * @body { sighting_id: string, photo_url: string }
 */
router.post('/identificar', identificacion_controller_1.identificarAnimalController);
exports.default = router;
//# sourceMappingURL=identificacion.routes.js.map