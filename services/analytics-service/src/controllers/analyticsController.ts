import type { Request, Response, NextFunction } from "express";
import { statsRepository } from "../db/statsRepository";
import { NotFoundError } from "@deelish-be/shared";

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p);

export const analyticsController = {
  async getCreatorStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = param(req.params.userId);
      const stats = statsRepository.get(userId);

      // Return zeroed stats if creator has no activity yet
      res.json({
        success: true,
        data: stats ?? {
          user_id: userId,
          photo_count: 0,
          total_ratings: 0,
          comment_count: 0,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      next(e);
    }
  },
};
