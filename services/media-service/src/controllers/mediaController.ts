import type { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { photoRepository } from "../db/photoRepository";
import { eventBus, Events } from "@deelish-be/shared";
import { UpdateFilenameSchema } from "../utils/schemas";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@deelish-be/shared";
import http from "http";

export const mediaController = {
  // POST /media/upload — creator only
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ValidationError("No file provided");

      const userId = req.user!.sub;
      const baseUrl = process.env.MEDIA_BASE_URL ?? "http://localhost:3002";
      const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:3000";
      const url = `${gatewayUrl}/media/file/${req.file.filename}`;

      const photo = photoRepository.create({
        user_id: userId,
        filename: req.file.filename,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url,
      });

      // Notify other services
      eventBus.emit(Events.PHOTO_CREATED, {
        mediaId: photo.id,
        userId: photo.user_id,
        url: photo.url,
        originalName: photo.original_name,
        size: photo.size,
        uploadedAt: photo.uploaded_at,
      });

      res.status(201).json({ success: true, data: photo });
    } catch (e) {
      next(e);
    }
  },

  // GET /media/:id — any authenticated user
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const param = (p: string | string[]): string =>
        Array.isArray(p) ? p[0] : p;
      const photo = photoRepository.findById(param(req.params.id));
      if (!photo) throw new NotFoundError("Photo");
      res.json({ success: true, data: photo });
    } catch (e) {
      next(e);
    }
  },

  // GET /media/my — creator sees their own uploads
  async getMyUploads(req: Request, res: Response, next: NextFunction) {
    try {
      const photos = photoRepository.findByUserId(req.user!.sub);
      res.json({ success: true, data: photos });
    } catch (e) {
      next(e);
    }
  },

  // PATCH /media/:id — metadata edit, creator only, must own the photo
  async updateFilename(req: Request, res: Response, next: NextFunction) {
    try {
      const param = (p: string | string[]): string =>
        Array.isArray(p) ? p[0] : p;
      const photo = photoRepository.findById(param(req.params.id));
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      const result = UpdateFilenameSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.message);

      const updated = photoRepository.updateFilename(
        photo.id,
        result.data.originalName,
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      next(e);
    }
  },

  // DELETE /media/:id — creator only, must own the photo
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const param = (p: string | string[]): string =>
        Array.isArray(p) ? p[0] : p;
      const photo = photoRepository.findById(param(req.params.id));
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      const filePath = path.join(
        process.env.UPLOADS_DIR ?? "./uploads",
        photo.filename,
      );
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      photoRepository.delete(photo.id);

      // Notify social and search directly via HTTP (event bus doesn't work cross-container)
      const socialUrl =
        process.env.SOCIAL_SERVICE_URL ?? "http://localhost:3003";
      const searchUrl =
        process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005";

      // Fire and forget — don't await, don't fail upload if these are slow
      http
        .request(`${socialUrl}/photos/${photo.id}`, { method: "DELETE" })
        .end();
      http
        .request(`${searchUrl}/index/${photo.id}`, { method: "DELETE" })
        .end();

      res.json({ success: true, message: "Photo deleted" });
    } catch (e) {
      next(e);
    }
  },

  // GET /media/file/:filename — serves the actual image file (public, no auth)
  serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const param = (p: string | string[]): string =>
        Array.isArray(p) ? p[0] : p;
      const filePath = path.join(
        path.resolve(process.env.UPLOADS_DIR ?? "./uploads"),
        path.basename(param(req.params.filename)),
      );
      if (!fs.existsSync(filePath)) throw new NotFoundError("File");

      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // ← add this
      res.setHeader("Access-Control-Allow-Origin", "*"); // ← add this
      res.sendFile(filePath);
    } catch (e) {
      next(e);
    }
  },
};
