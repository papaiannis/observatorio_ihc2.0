import app from './app.js';
import { env } from './infrastructure/config.js';
app.listen(env.PORT, () => {
    console.log(`🚀 BioLife API (Node.js) iniciada en el puerto ${env.PORT}`);
    console.log(`🌍 Entorno: ${env.NODE_ENV}`);
    console.log(`🤖 Modelo: ${env.HF_MODEL_ID}`);
});
//# sourceMappingURL=server.js.map