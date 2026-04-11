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

async function generateWeeklyReport(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const spending = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: weekAgo, lte: now },
    },
    _sum: { amount: true },
    _count: true,
  });

  const income = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "INCOME",
      date: { gte: weekAgo, lte: now },
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

  const totalExpense = spending.reduce(
    (sum, s) => sum + Number(s._sum.amount ?? 0), 0
  );

  const totalIncome = Number(income._sum.amount ?? 0);

  const report = {
    userId,
    period: {
      from: weekAgo.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    },
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    topCategories: spending
      .map((s) => ({
        category: s.categoryId
          ? categoryMap.get(s.categoryId)?.name ?? "Unknown"
          : "Uncategorized",
        amount: Number(s._sum.amount),
        count: s._count,
      }))
      .sort((a, b) => b.amount - a.amount),
    generatedAt: new Date().toISOString(),
  };

  return report;
}

const reportWorker = new Worker(
  "weekly-report",
  async (job: Job) => {
    const { userId } = job.data;
    const report = await generateWeeklyReport(userId);

    console.log("\n📊 Weekly Report:");
    console.log(`   Period: ${report.period.from} to ${report.period.to}`);
    console.log(`   Income: $${report.totalIncome}`);
    console.log(`   Expenses: $${report.totalExpense}`);
    console.log(`   Savings: $${report.netSavings}`);
    console.log("   Top spending:");
    report.topCategories.forEach((c) => {
      console.log(`     - ${c.category}: $${c.amount} (${c.count} transactions)`);
    });

    return report;
  },
  { connection }
);

reportWorker.on("completed", (job) => {
  console.log(`Weekly report completed for job ${job.id}`);
});

reportWorker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`Weekly report failed for job ${job?.id}:`, err.message);
});

export { reportWorker };