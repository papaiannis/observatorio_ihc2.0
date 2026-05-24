import { Router } from 'express';
import identificacionRoutes from './routes/identificacion.routes';
// import wildlifeRoutes from './routes/wildlife.routes'; // TODO: Implementar su propio controller

const apiRouter = Router();

apiRouter.use('/identificacion', identificacionRoutes);
// apiRouter.use('/wildlife', wildlifeRoutes);

export default apiRouter;
