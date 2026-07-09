import { Request, Response, NextFunction } from 'express';
import * as profileService from '../services/profile.service.js';

/**
 * GET /profiles/:username
 * Perfil público de cualquier usuario. No requiere autenticación.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const profile = await profileService.getPublicProfile(username as string);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /profiles/me
 * Actualiza el perfil propio. Solo campos permitidos: avatar_url, preferencias.
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avatar_url, preferencias } = req.body;
    let preferenciasParseadas;
    if (typeof preferencias === 'string') {
      try {
        preferenciasParseadas = JSON.parse(preferencias);
      } catch (e) {
        preferenciasParseadas = preferencias;
      }
    } else {
      preferenciasParseadas = preferencias;
    }

    const updated = await profileService.updateOwnProfile(
      req.user!.id,
      { avatar_url, preferencias: preferenciasParseadas },
      req.user!.token!,
      req.file,
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
