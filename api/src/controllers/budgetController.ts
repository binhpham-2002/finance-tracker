import { Request, Response, NextFunction } from "express";
import { prisma } from "../models/prisma";
import { ApiError } from "../middleware/errorHandler";
import { z } from "zod";

const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2030),
});

export async function setBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createBudgetSchema.parse(req.body);
    const userId = req.user!.userId;

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
        },
      },
      update: { amount: data.amount },
      create: { ...data, userId },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    res.json({ budget });
  } catch (error) {
    next(error);
  }
}

export async function getBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    res.json({ budgets, month, year });
  } catch (error) {
    next(error);
  }
}
