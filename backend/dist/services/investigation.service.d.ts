export declare class InvestigationService {
    /**
     * Obtiene todas las investigaciones activas.
     * Filtra por status = 'active' y end_date >= hoy.
     */
    static getActiveInvestigations(): Promise<{
        id: any;
        title: any;
        description: any;
        start_date: any;
        end_date: any;
        survey_questions: any;
    }[]>;
    /**
     * Obtiene el detalle de una investigación por ID
     */
    static getInvestigationById(id: string): Promise<any>;
    /**
     * Crea una nueva investigación (solo especialistas)
     */
    static createInvestigation(userToken: string, payload: any): Promise<any>;
    /**
     * Obtiene las investigaciones creadas por el usuario autenticado
     */
    static getMyInvestigations(userId: string): Promise<any[]>;
    /**
     * Actualiza una investigación. RLS asegurará que solo el creador pueda hacerlo.
     */
    static updateInvestigation(id: string, userToken: string, payload: any): Promise<any>;
    /**
     * Marca una investigación como "archived" (borrado lógico).
     * RLS asegurará que solo el creador pueda hacerlo.
     */
    static deleteInvestigation(id: string, userToken: string): Promise<boolean>;
}
//# sourceMappingURL=investigation.service.d.ts.map