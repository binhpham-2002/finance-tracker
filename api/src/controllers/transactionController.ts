import { Request, Response, NextFunction } from "express";
import { prisma } from "../models/prisma";
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "../utils/validators";
import { ApiError } from "../middleware/errorHandler";
import { getCache, setCache, deleteCache } from "../services/cacheService";
import { budgetAlertQueue } from "../config/queue";
import { reportQueue } from "../config/queue";

async function autoCategorizeFetch(description: string, merchant?: string): Promise<string | null> {
  try {
    const axios = require("axios");
    const res = await axios.post("http://localhost:8000/api/ml/categorize", {
      description,
      merchant: merchant || "",
    });
    console.log("[ML Debug] response:", JSON.stringify(res.data));
    console.log("[ML Debug] sent:", description, merchant);
    if (res.data.category_id && res.data.confidence && res.data.confidence > 0.1) {
      return res.data.category_id;
    }
    return null;
  } catch (err: any) {
    console.log("[ML Debug] error:", err.message);
    return null;
  }
}

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

    let finalCategoryId = data.categoryId;
    if (!finalCategoryId) {
      const predictedId = await autoCategorizeFetch(data.description, data.merchant);
      console.log("[ML Debug] predicted:", predictedId);
      if (predictedId) {
        finalCategoryId = predictedId;
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        merchant: data.merchant,
        isRecurring: data.isRecurring,
        categoryId: finalCategoryId || undefined,
        date: new Date(data.date),
        userId,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { id: true, accountName: true } },
      },
    });

    const txAccount = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (txAccount) {
      const isCreditCard = txAccount.accountType === "CREDIT_CARD";
      if (data.type === "EXPENSE") {
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: isCreditCard ? { increment: Number(data.amount) } : { decrement: Number(data.amount) } },
        });
      } else if (data.type === "INCOME") {
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: isCreditCard ? { decrement: Number(data.amount) } : { increment: Number(data.amount) } },
        });
      }
    }

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

    const where: Record<string, unknown> = { userId };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);
      where.date = dateFilter;
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
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const existing = await prisma.transaction.findFirst({
    where: { id: id, userId: userId as string },
    });

    if (!existing) {
      throw ApiError.notFound("Transaction not found");
    }

    await prisma.transaction.delete({ where: { id: id } });

    const delAccount = await prisma.account.findUnique({ where: { id: existing.accountId } });
    if (delAccount) {
      const isCreditCard = delAccount.accountType === "CREDIT_CARD";
      if (existing.type === "EXPENSE") {
        await prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: isCreditCard ? { decrement: Number(existing.amount) } : { increment: Number(existing.amount) } },
        });
      } else if (existing.type === "INCOME") {
        await prisma.account.update({
          where: { id: existing.accountId },
          data: { balance: isCreditCard ? { increment: Number(existing.amount) } : { decrement: Number(existing.amount) } },
        });
      }
    }

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

export async function triggerWeeklyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    await reportQueue.add("generate-report", { userId });

    res.json({ message: "Weekly report queued" });
  } catch (error) {
    next(error);
  }
}

export async function deleteAllTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    await prisma.transaction.deleteMany({
      where: { userId },
    });

    await deleteCache(`summary:${userId}:*`);

    res.json({ message: "All transactions deleted" });
  } catch (error) {
    next(error);
  }
}
