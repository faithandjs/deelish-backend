import { Router } from "express";
import { aiController } from "../controllers/aiController";
import { upload } from "../utils/upload";
import rateLimit from "express-rate-limit";
import expressRateLimit from "express-rate-limit";

const limiter = expressRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: "Too many requests" },
});

const router = Router();

router.post("/analyse", limiter, upload.single("image"), aiController.analyse);

export default router;
