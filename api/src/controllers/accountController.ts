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

    const existing = await prisma.account.findFirst({
      where: { userId, accountName: data.accountName, accountType: data.accountType as any },
    });

    if (existing) {
      const updated = await prisma.account.update({
        where: { id: existing.id },
        data: { balance: { increment: data.balance } },
      });
      res.json({ account: updated, merged: true });
      return;
    }

    const account = await prisma.account.create({
      data: { ...data, userId },
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

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const account = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw ApiError.notFound("Account not found");
    }

    await prisma.account.delete({ where: { id } });

    res.json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
}