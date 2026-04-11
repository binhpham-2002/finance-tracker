import { Router } from "express";
import { createAccount, getAccounts } from "../controllers/accountController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createAccount);
router.get("/", getAccounts);

export default router;
