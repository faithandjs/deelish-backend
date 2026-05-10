// services/social-service/src/routes/socialRoutes.ts
import { Router } from "express";
import { socialController } from "../controllers/socialController";
import { authenticate, requireRole } from "../middleware/auth";
import { upload } from "../utils/upload"; // ← add this

const router = Router();

// Public
router.get("/photos", socialController.getFeed);
router.get("/photos/search", socialController.search);
router.get("/photos/:id", socialController.getPhoto);

// Creator only
router.post(
  "/photos",
  authenticate,
  requireRole("creator"),
  upload.single("file"), // ← multer runs here, puts file on req.file
  socialController.createPhoto,
);
router.patch(
  "/photos/:id",
  authenticate,
  requireRole("creator"),
  socialController.updatePhoto,
);
router.delete(
  "/photos/:id",
  authenticate,
  requireRole("creator"),
  socialController.deletePhoto,
);

// Any authenticated user
router.post(
  "/photos/:id/comment",
  authenticate,
  requireRole("consumer"),
  socialController.addComment,
);
router.post(
  "/photos/:id/rate",
  authenticate,
  requireRole("consumer"),
  socialController.ratePhoto,
);

export default router;
