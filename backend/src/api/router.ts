import { Router } from 'express';
import identificacionRoutes from './routes/identificacion.routes.js';
import authRoutes from './routes/auth.routes.js';
import investigationRoutes from './routes/investigation.routes.js';
import contributionRoutes from './routes/contribution.routes.js';
import speciesRoutes from './routes/species.routes.js';
import feedRoutes from './routes/feed.routes.js';
import exportRoutes from './routes/export.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import commentRoutes from './routes/comment.routes.js';
import likeRoutes from './routes/like.routes.js';
import profileRoutes from './routes/profile.routes.js';

const apiRouter = Router();

// Semana 1 & 2
apiRouter.use('/identificacion', identificacionRoutes);
apiRouter.use('/investigations', investigationRoutes);
apiRouter.use('/contributions', contributionRoutes);
apiRouter.use('/', authRoutes);

// Semana 3: Curaduría, Feed, Exportación y Notificaciones
apiRouter.use('/species', speciesRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/export', exportRoutes);
apiRouter.use('/notifications', notificationRoutes);

// Semana 4: Interacciones sociales, suscripciones y perfiles
apiRouter.use('/comments', commentRoutes);
apiRouter.use('/likes', likeRoutes);
apiRouter.use('/profiles', profileRoutes);

export default apiRouter;

