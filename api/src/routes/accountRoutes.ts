import { Router } from "express";
import { createAccount, getAccounts, getCategories, deleteAccount } from "../controllers/accountController";
import { authenticate } from "../middleware/auth";
const router = Router();

router.use(authenticate);

router.post("/", createAccount);
router.get("/", getAccounts);
router.get("/categories", getCategories);
router.delete("/:id", deleteAccount);

export default router;