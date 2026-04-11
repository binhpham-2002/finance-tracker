import { Router } from "express";
import { setBudget, getBudgets } from "../controllers/budgetController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", setBudget);
router.get("/", getBudgets);

export default router;
