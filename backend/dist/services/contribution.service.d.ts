interface ContributionData {
    investigation_id: string;
    preliminary_species?: string | undefined;
    survey_answers?: string | undefined;
    observed_at?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    gps_accuracy?: number | undefined;
}
export declare class ContributionService {
    /**
     * Crea una contribución para una investigación activa.
     * @param user - Usuario autenticado (id, email)
     * @param userToken - JWT del usuario para autenticar operaciones RLS en Supabase
     * @param data - Datos del formulario de la contribución
     * @param file - Archivo de imagen subido
     */
    static createContribution(user: {
        id: string;
    }, userToken: string, data: ContributionData, file: Express.Multer.File): Promise<{
        contribution_id: any;
        photo_url: string;
    }>;
}
export {};
//# sourceMappingURL=contribution.service.d.ts.map