import type { Request, Response, NextFunction } from "express";
import { photoRepository } from "../db/photoRepository";
import { commentRepository } from "../db/commentRepository";
import { ratingRepository } from "../db/ratingRepository";
import { cached, invalidate } from "../utils/cache";
import { uploadToMedia, deleteFromMedia } from "../utils/mediaClient";
import {
  CreatePhotoSchema,
  CommentSchema,
  RatingSchema,
  PaginationSchema,
  SearchSchema,
  UpdatePhotoSchema,
} from "../utils/schemas";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  publish,
  Events,
} from "@deelish-be/shared";
import http from "http";
import https from "https";

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
  const searchHost = process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005";
  const url = new URL("/search/index", searchHost);
  const body = JSON.stringify(doc);

  const client = searchHost.startsWith("https") ? https : http;
  const req = client.request({
    hostname: url.hostname,
    port: url.port
      ? Number(url.port)
      : searchHost.startsWith("https")
        ? 443
        : 3005,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  });
  req.on("error", (err) =>
    console.error("[search] index notification failed:", err.message),
  );
  req.write(body);
  req.end();
}

export const socialController = {
  async createPhoto(req: Request, res: Response, next: NextFunction) {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    try {
      if (!req.file) throw new ValidationError("No image file provided");

      const authHeader = req.headers.authorization;
      if (!authHeader)
        throw new ValidationError("Missing authorization header");

      const result = CreatePhotoSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const mediaRecord = await uploadToMedia(req.file, authHeader);

      const photo = photoRepository.create({
        mediaId: mediaRecord.id,
        userId: req.user!.sub,
        username: req.user!.username,
        url: mediaRecord.url,
        ...result.data,
      });

      // Publish to Service Bus
      await publish(Events.PHOTO_CREATED, {
        mediaId: mediaRecord.id,
        userId: req.user!.sub,
        url: mediaRecord.url,
        originalName: mediaRecord.original_name,
        size: mediaRecord.size,
        uploadedAt: mediaRecord.uploaded_at,
      });

      invalidate("feed:1", "feed:all", "feed:count");

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
        data: { photos: photos.map(parsePhoto), query: q, page, limit },
      });
    } catch (e) {
      next(e);
    }
  },

  async getPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = cached(`photo:${id}`, () => photoRepository.findById(id));
      if (!photo) throw new NotFoundError("Photo");

      const comments = commentRepository.findByPhotoId(id);
      const rating = ratingRepository.getAverage(id);
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

      // Publish to Service Bus
      await publish(Events.COMMENT_CREATED, {
        photoOwnerId: photo.user_id,
        photoId: id,
        commenterId: req.user!.sub,
      });

      res.status(201).json({ success: true, data: comment });
    } catch (e) {
      next(e);
    }
  },

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

      invalidate(`photo:${id}`, "feed:1:20");

      // Publish to Service Bus
      await publish(Events.RATING_CREATED, {
        photoOwnerId: photo.user_id,
        photoId: id,
        raterId: req.user!.sub,
      });

      res.json({ success: true, data: rating });
    } catch (e) {
      next(e);
    }
  },

  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = photoRepository.findById(id);
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      const authHeader = req.headers.authorization!;

      deleteFromMedia(photo.media_id, authHeader);
      photoRepository.delete(photo.media_id);

      // Publish to Service Bus
      await publish(Events.PHOTO_DELETED, {
        mediaId: photo.media_id,
        userId: req.user!.sub,
      });

      invalidate(`photo:${id}`, "feed:count", "feed:1:20");

      res.json({ success: true, message: "Photo deleted" });
    } catch (e) {
      next(e);
    }
  },

  async updatePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = param(req.params.id);
      const photo = photoRepository.findById(id);
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      const result = UpdatePhotoSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const updated = photoRepository.update(id, result.data);
      invalidate(`photo:${id}`, "feed:1:20");

      res.json({ success: true, data: parsePhoto(updated!) });
    } catch (e) {
      next(e);
    }
  },
};
