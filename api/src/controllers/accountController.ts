import { Request, Response, NextFunction } from "express";
import { prisma } from "../models/prisma";
import { ApiError } from "../middleware/errorHandler";
import { z } from "zod";

const createAccountSchema = z.object({
  accountName: z.string().min(1).max(100),
  accountType: z.enum(["CHECKING", "SAVINGS", "CREDIT_CARD", "INVESTMENT", "OTHER"]),
  balance: z.number().default(0),
  currency: z.string().length(3).default("USD"),
});

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createAccountSchema.parse(req.body);
    const userId = req.user!.userId;

    const account = await prisma.account.create({
      data: {
        ...data,
        balance: data.balance,
        userId,
      },
    });

    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
}

export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
}
