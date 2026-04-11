import { Request, Response, NextFunction } from "express";
import { prisma } from "../models/prisma";
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "../utils/validators";
import { ApiError } from "../middleware/errorHandler";
import { getCache, setCache, deleteCache } from "../services/cacheService";
import { budgetAlertQueue } from "../config/queue";

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTransactionSchema.parse(req.body);
    const userId = req.user!.userId;

    const account = await prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });

    if (!account) {
      throw ApiError.notFound("Account not found");
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { id: true, accountName: true } },
      },
    });

    await deleteCache(`summary:${userId}:*`);
    
    if (data.type === "EXPENSE" && data.categoryId) {
      await budgetAlertQueue.add("check-budget", {
        userId,
        categoryId: data.categoryId,
      });
    }
    
    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const query = transactionQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const where: any = { userId };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const skip = (query.page - 1) * query.limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          account: { select: { id: true, accountName: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw ApiError.notFound("Transaction not found");
    }

    await prisma.transaction.delete({ where: { id } });

    await deleteCache(`summary:${userId}:*`);

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    next(error);
  }
}

export async function getMonthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    const cacheKey = `summary:${userId}:${month}:${year}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const spending = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const totals = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const categoryIds = spending
      .map((s) => s.categoryId)
      .filter(Boolean) as string[];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const spendingByCategory = spending.map((s) => ({
      category: s.categoryId ? categoryMap.get(s.categoryId) : { name: "Uncategorized" },
      total: s._sum.amount,
      count: s._count,
    }));

    const totalIncome = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
    const totalExpense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;

    const result = {
      month,
      year,
      totalIncome,
      totalExpense,
      netSavings: Number(totalIncome) - Number(totalExpense),
      spendingByCategory,
    };

    await setCache(cacheKey, result);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
