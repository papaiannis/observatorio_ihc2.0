"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./infrastructure/config");
app_1.default.listen(config_1.env.PORT, () => {
    console.log(`🚀 BioLife API (Node.js) iniciada en el puerto ${config_1.env.PORT}`);
    console.log(`🌍 Entorno: ${config_1.env.NODE_ENV}`);
    console.log(`🤖 Modelo: ${config_1.env.HF_MODEL_ID}`);
});
//# sourceMappingURL=server.js.map