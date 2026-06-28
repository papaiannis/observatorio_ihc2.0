/** Cliente anon: para verificar tokens de usuarios */
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
/**
 * Crea un cliente Supabase autenticado con el token JWT del usuario.
 * Usar en operaciones donde RLS debe evaluar auth.uid() correctamente.
 * @param userToken - JWT de acceso del usuario obtenido en el authMiddleware
 */
export declare function createAuthenticatedClient(userToken: string): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
//# sourceMappingURL=supabase.d.ts.map