import { InvestigationService } from '../services/investigation.service.js';
export const getActiveInvestigations = async (req, res, next) => {
    try {
        const investigations = await InvestigationService.getActiveInvestigations();
        res.json(investigations);
    }
    catch (error) {
        next(error);
    }
};
export const getInvestigationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const investigation = await InvestigationService.getInvestigationById(id);
        res.json(investigation);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=investigation.controller.js.map