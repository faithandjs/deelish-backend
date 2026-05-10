import { Router } from "express";
import { searchController } from "../controllers/searchController";

const router = Router();

router.get("/", searchController.search); // remove authenticate
router.post("/index", searchController.indexPhoto); // called by social service internally
router.delete("/index/:photoId", searchController.removeFromIndex);

export default router;
