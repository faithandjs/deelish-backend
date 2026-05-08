import { Router } from "express";
import { authController } from "../controllers/authController";
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: "Too many attempts, try again later" },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: "Too many reset attempts" },
});

const router = Router();

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.get("/.well-known/public-key", authController.getPublicKey);

export default router;
