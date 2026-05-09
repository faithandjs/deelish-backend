import type { Request, Response, NextFunction } from "express";
import os from "os";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { analyse } from "../utils/analyser";
import { ValidationError } from "@deelish-be/shared";

export const aiController = {
  async analyse(req: Request, res: Response, next: NextFunction) {
    let tmpPath: string | null = null;

    try {
      if (!req.file) throw new ValidationError("No image provided");

      // Write buffer to a temp file so the analyser has a path to work with
      // (Azure CV SDK also accepts a buffer directly — swap trivially when live)
      tmpPath = path.join(
        os.tmpdir(),
        `${uuidv4()}${path.extname(req.file.originalname)}`,
      );
      fs.writeFileSync(tmpPath, req.file.buffer);

      const result = await analyse(tmpPath, req.file.mimetype);

      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    } finally {
      // Always clean up temp file
      if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  },
};
