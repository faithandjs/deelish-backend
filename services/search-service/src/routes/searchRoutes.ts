import { Router } from "express";
import { searchController } from "../controllers/searchController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, searchController.search);
router.post("/index", searchController.indexPhoto); // called by social service internally

export default router;
