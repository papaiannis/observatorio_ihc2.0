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
}
//# sourceMappingURL=investigation.service.d.ts.map