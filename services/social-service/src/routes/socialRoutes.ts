import { Router } from "express";
import { socialController } from "../controllers/socialController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Feed and search — any authenticated user
router.get("/photos", authenticate, socialController.getFeed);
router.get("/photos/search", authenticate, socialController.search);

// Single photo — optionally authenticated (shows userRating if logged in)
router.get("/photos/:id", socialController.getPhoto);

// Creator only
router.post(
  "/photos",
  authenticate,
  requireRole("creator"),
  socialController.createPhoto,
);
router.delete(
  "/photos/:id",
  authenticate,
  requireRole("creator"),
  socialController.deletePhoto,
);

// Consumer and creator can both comment and rate
router.post("/photos/:id/comment", authenticate, socialController.addComment);
router.post("/photos/:id/rate", authenticate, socialController.ratePhoto);

export default router;
