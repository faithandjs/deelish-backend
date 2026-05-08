import { Router } from "express";
import { mediaController } from "../controllers/mediaController";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../utils/upload";

const router = Router();

// Public — serves image files directly (frontend <img src="..."> calls this)
router.get("/file/:filename", mediaController.serveFile);

// Authenticated
router.get("/:id", authenticate, mediaController.getById);
router.get(
  "/my/uploads",
  authenticate,
  requireRole("creator"),
  mediaController.getMyUploads,
);

// Creator only
router.post(
  "/upload",
  authenticate,
  requireRole("creator"),
  upload.single("image"),
  mediaController.upload,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("creator"),
  mediaController.updateFilename,
);
router.delete(
  "/:id",
  authenticate,
  requireRole("creator"),
  mediaController.delete,
);

export default router;
