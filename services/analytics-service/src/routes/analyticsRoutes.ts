import { Router } from "express";
import { analyticsController } from "../controllers/analyticsController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Any authenticated user can view a creator's public stats
router.get("/stats/:userId", authenticate, analyticsController.getCreatorStats);

export default router;
