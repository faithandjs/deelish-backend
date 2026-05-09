import type { Request, Response, NextFunction } from "express";
import { photoRepository } from "../db/photoRepository";
import { commentRepository } from "../db/commentRepository";
import { ratingRepository } from "../db/ratingRepository";
import { cached, invalidate } from "../utils/cache";
import {
  CreatePhotoSchema,
  CommentSchema,
  RatingSchema,
  PaginationSchema,
  SearchSchema,
} from "../utils/schemas";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  eventBus,
  Events,
} from "@deelish-be/shared";
import http from "http";

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p);

function parsePhoto(photo: ReturnType<typeof photoRepository.findById>) {
  if (!photo) return null;
  return {
    ...photo,
    tags: JSON.parse(photo.tags),
    people: JSON.parse(photo.people),
  };
}

function notifySearchService(doc: object) {
  const body = JSON.stringify(doc);
  const req = http.request({
    hostname: "localhost",
    port: 3005,
    path: "/search/index",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  });
  req.write(body);
  req.end();
  // Fire and forget — search index failure should not break photo creation
}
export const socialController = {
  // POST /social/photos
  // Called by creator after media upload succeeds — links media record to social record
  async createPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const result = CreatePhotoSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const { mediaId, url } = req.body as { mediaId: string; url: string };
      if (!mediaId || !url)
        throw new ValidationError("mediaId and url are required");

      const photo = photoRepository.create({
        mediaId,
        userId: req.user!.sub,
        username: req.user!.username,
        url,
        ...result.data,
      });

      invalidate("feed:1", "feed:all");
      notifySearchService({
        photo_id: photo.id,
        title: photo.title,
        caption: photo.caption ?? "",
        tags: JSON.parse(photo.tags),
        location: photo.location ?? "",
        people: JSON.parse(photo.people),
        username: photo.username,
        url: photo.url,
        created_at: photo.created_at,
      });
      res.status(201).json({ success: true, data: parsePhoto(photo) });
    } catch (e) {
      next(e);
    }
  },

  // GET /social/photos?page=1&limit=20
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = PaginationSchema.parse(req.query);
      const offset = (page - 1) * limit;
      const cacheKey = `feed:${page}:${limit}`;

      const photos = cached(cacheKey, () =>
        photoRepository.getFeed(limit, offset),
      );
      const total = cached("feed:count", () => photoRepository.getTotalCount());

      res.json({
        success: true,
        data: {
          photos: photos.map(parsePhoto),
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

  // GET /social/photos/search?q=sunset&page=1
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, page, limit } = SearchSchema.parse(req.query);
      const offset = (page - 1) * limit;
      const cacheKey = `search:${q}:${page}:${limit}`;

      const photos = cached(cacheKey, () =>
        photoRepository.search(q, limit, offset),
      );

      res.json({
        success: true,
        data: {
          photos: photos.map(parsePhoto),
          query: q,
          page,
          limit,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  // GET /social/photos/:id
  async getPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const cacheKey = `photo:${id}`;

      const photo = cached(cacheKey, () => photoRepository.findById(id));
      if (!photo) throw new NotFoundError("Photo");

      const comments = commentRepository.findByPhotoId(id);
      const rating = ratingRepository.getAverage(id);

      // If authenticated, include user's own rating
      let userRating: number | null = null;
      if (req.user) {
        const r = ratingRepository.getUserRating(id, req.user.sub);
        userRating = r?.value ?? null;
      }

      res.json({
        success: true,
        data: {
          ...parsePhoto(photo),
          comments,
          avgRating: Number(rating.avg.toFixed(1)),
          ratingCount: rating.count,
          userRating,
        },
      });
    } catch (e) {
      next(e);
    }
  },

  // POST /social/photos/:id/comment
  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = photoRepository.findById(id);
      if (!photo) throw new NotFoundError("Photo");

      const result = CommentSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const comment = commentRepository.create({
        photoId: id,
        userId: req.user!.sub,
        username: req.user!.username,
        body: result.data.body,
      });

      invalidate(`photo:${id}`);
      eventBus.emit(Events.COMMENT_CREATED, {
        photoOwnerId: photo.user_id,
        photoId: id,
        commenterId: req.user!.sub,
      });

      res.status(201).json({ success: true, data: comment });
    } catch (e) {
      next(e);
    }
  },

  // POST /social/photos/:id/rate
  async ratePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = photoRepository.findById(id);
      if (!photo) throw new NotFoundError("Photo");

      const result = RatingSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const rating = ratingRepository.upsert({
        photoId: id,
        userId: req.user!.sub,
        value: result.data.value,
      });

      invalidate(`photo:${id}`, `feed:1:20`);
      eventBus.emit(Events.RATING_CREATED, {
        photoOwnerId: photo.user_id,
        photoId: id,
        raterId: req.user!.sub,
      });
      res.json({ success: true, data: rating });
    } catch (e) {
      next(e);
    }
  },

  // DELETE /social/photos/:id — creator can delete their own post
  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = photoRepository.findById(id);
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      photoRepository.delete(photo.media_id);
      invalidate(`photo:${id}`, "feed:count");

      res.json({ success: true, message: "Photo deleted" });
    } catch (e) {
      next(e);
    }
  },
};
