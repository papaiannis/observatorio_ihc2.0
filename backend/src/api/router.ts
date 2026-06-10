import { Router } from 'express';
import identificacionRoutes from './routes/identificacion.routes.js';
import authRoutes from './routes/auth.routes.js';
// import wildlifeRoutes from './routes/wildlife.routes.js'; // TODO: Implementar su propio controller

const apiRouter = Router();

apiRouter.use('/identificacion', identificacionRoutes);
apiRouter.use('/', authRoutes);
// apiRouter.use('/wildlife', wildlifeRoutes);

export default apiRouter;
