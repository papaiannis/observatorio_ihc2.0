import { Router } from 'express';
import identificacionRoutes from './routes/identificacion.routes.js';
import authRoutes from './routes/auth.routes.js';
import investigationRoutes from './routes/investigation.routes.js';
import contributionRoutes from './routes/contribution.routes.js';

const apiRouter = Router();

apiRouter.use('/identificacion', identificacionRoutes);
apiRouter.use('/investigations', investigationRoutes);
apiRouter.use('/contributions', contributionRoutes);
apiRouter.use('/', authRoutes);

export default apiRouter;
