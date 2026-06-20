import { Request, Response, NextFunction } from 'express';
import { InvestigationService } from '../services/investigation.service.js';

export const getActiveInvestigations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investigations = await InvestigationService.getActiveInvestigations();
    res.json(investigations);
  } catch (error) {
    next(error);
  }
};

export const getInvestigationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const investigation = await InvestigationService.getInvestigationById(id);
    res.json(investigation);
  } catch (error) {
    next(error);
  }
};
