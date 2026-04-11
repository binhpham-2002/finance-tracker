import { Router } from "express";
import { register, login } from "../controllers/authController";
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

export default router;
