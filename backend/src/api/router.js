"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const identificacion_routes_1 = __importDefault(require("./routes/identificacion.routes"));
// import wildlifeRoutes from './routes/wildlife.routes'; // TODO: Implementar su propio controller
const apiRouter = (0, express_1.Router)();
apiRouter.use('/identificacion', identificacion_routes_1.default);
// apiRouter.use('/wildlife', wildlifeRoutes);
exports.default = apiRouter;
//# sourceMappingURL=router.js.map