import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const connection = {
  host: process.env.REDIS_URL?.includes("redis://")
    ? new URL(process.env.REDIS_URL).hostname
    : "localhost",
  port: 6379,
};

async function checkBudget(userId: string, categoryId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budget = await prisma.budget.findFirst({
    where: { userId, categoryId, month, year },
    include: { category: true },
  });

  if (!budget) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const spending = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  const totalSpent = Number(spending._sum.amount ?? 0);
  const budgetAmount = Number(budget.amount);
  const percentage = Math.round((totalSpent / budgetAmount) * 100);

  return {
    category: budget.category.name,
    budgetAmount,
    totalSpent,
    percentage,
    exceeded: totalSpent > budgetAmount,
  };
}

const budgetWorker = new Worker(
  "budget-alert",
  async (job: Job) => {
    const { userId, categoryId } = job.data;
    const result = await checkBudget(userId, categoryId);

    if (result && result.percentage >= 80) {
      console.log(
        `[Budget Alert] ${result.category}: ${result.percentage}% used ($${result.totalSpent}/$${result.budgetAmount})`
      );
    }

    return result;
  },
  { connection }
);

budgetWorker.on("completed", (job) => {
  console.log(`Budget check completed for job ${job.id}`);
});

budgetWorker.on("failed", (job, err) => {
  console.error(`Budget check failed for job ${job?.id}:`, err.message);
});

export { budgetWorker };
