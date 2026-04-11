import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  deleteTransaction,
  getMonthlySummary,
  triggerWeeklyReport,
} from "../controllers/transactionController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createTransaction);
router.get("/", getTransactions);
router.get("/summary", getMonthlySummary);
router.delete("/:id", deleteTransaction);
router.post("/report", triggerWeeklyReport);

export default router;
