import type { Request, Response, NextFunction } from "express";
import { searchRepository } from "../db/searchRepository";
import { SearchQuerySchema } from "../utils/schemas";
import { ValidationError } from "@deelish-be/shared";
import { z } from "zod";

const IndexSchema = z.object({
  photo_id: z.string(),
  title: z.string(),
  caption: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  location: z.string().optional().default(""),
  people: z.array(z.string()).default([]),
  username: z.string(),
  url: z.string(),
  created_at: z.string(),
});
export const searchController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SearchQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const { q, page, limit } = parsed.data;
      const offset = (page - 1) * limit;

      const hits = searchRepository.query(q, limit, offset);
      const total = searchRepository.count(q);

      // Parse tags and people back to arrays for the response
      const results = hits.map((hit) => ({
        ...hit,
        tags: hit.tags.split(" ").filter(Boolean),
        people: hit.people.split(" ").filter(Boolean),
      }));

      res.json({
        success: true,
        data: {
          results,
          query: q,
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (e) {
      next(e);
    }
  },
  indexPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = IndexSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const d = parsed.data;
      searchRepository.index({
        photo_id: d.photo_id,
        title: d.title,
        caption: d.caption,
        tags: d.tags.join(" "), // FTS needs space-separated string
        location: d.location,
        people: d.people.join(" "),
        username: d.username,
        url: d.url,
        created_at: d.created_at,
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
  removeFromIndex(req: Request, res: Response, next: NextFunction) {
    try {
      const param = (p: string | string[]): string =>
        Array.isArray(p) ? p[0] : p;
      searchRepository.remove(param(req.params.photoId));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
};
