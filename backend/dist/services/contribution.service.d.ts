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
    static createContribution(user: {
        id: string;
    }, data: ContributionData, file: Express.Multer.File): Promise<{
        contribution_id: any;
        photo_url: string;
    }>;
}
export {};
//# sourceMappingURL=contribution.service.d.ts.map