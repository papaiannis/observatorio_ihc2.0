declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string | undefined;
        token?: string;  // JWT de acceso del usuario para operaciones RLS en Supabase
      };
    }
  }
}

export {};
