import type { Request, Response, NextFunction } from "express";
import { photoRepository } from "../db/photoRepository";
import { publish, Events } from "@deelish-be/shared";
import { UpdateFilenameSchema } from "../utils/schemas";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@deelish-be/shared";
import { uploadToBlob, containerClient } from "../utils/upload";

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p);

export const mediaController = {
  // POST /upload — creator only
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ValidationError("No file provided");

      const userId = req.user!.sub;

      // Upload buffer to Azure Blob
      const { filename, url } = await uploadToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      const photo = photoRepository.create({
        user_id: userId,
        filename,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url,
      });

      // Publish to Service Bus
      await publish(Events.PHOTO_CREATED, {
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

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const photo = photoRepository.findById(param(req.params.id));
      if (!photo) throw new NotFoundError("Photo");
      res.json({ success: true, data: photo });
    } catch (e) {
      next(e);
    }
  },

  async getMyUploads(req: Request, res: Response, next: NextFunction) {
    try {
      const photos = photoRepository.findByUserId(req.user!.sub);
      res.json({ success: true, data: photos });
    } catch (e) {
      next(e);
    }
  },

  async updateFilename(req: Request, res: Response, next: NextFunction) {
    try {
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

  // DELETE /media/:id — deletes from Blob and DB
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const photo = photoRepository.findById(param(req.params.id));
      if (!photo) throw new NotFoundError("Photo");
      if (photo.user_id !== req.user!.sub)
        throw new ForbiddenError("You do not own this photo");

      // Delete from Azure Blob
      const blockBlobClient = containerClient.getBlockBlobClient(
        photo.filename,
      );
      await blockBlobClient.deleteIfExists();

      photoRepository.delete(photo.id);

      // Publish to Service Bus
      await publish(Events.PHOTO_DELETED, {
        mediaId: photo.id,
        userId: photo.user_id,
      });

      res.json({ success: true, message: "Photo deleted" });
    } catch (e) {
      next(e);
    }
  },

  // GET /file/:filename — redirect to Azure Blob public URL
  async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = param(req.params.filename);
      const blockBlobClient = containerClient.getBlockBlobClient(filename);

      // Check blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) throw new NotFoundError("File");

      // Redirect to the public blob URL
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.redirect(blockBlobClient.url);
    } catch (e) {
      next(e);
    }
  },
};
