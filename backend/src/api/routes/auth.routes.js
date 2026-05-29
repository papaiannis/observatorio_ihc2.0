"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../../controllers/auth.controller");
const router = (0, express_1.Router)();
// Endpoint directo, sin middlewares pesados intermediarios
router.post('/auth/login', auth_controller_1.handleLogin);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map