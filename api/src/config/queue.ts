import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_URL?.includes("redis://")
    ? new URL(process.env.REDIS_URL).hostname
    : "localhost",
  port: 6379,
};

export const reportQueue = new Queue("weekly-report", { connection });
export const budgetAlertQueue = new Queue("budget-alert", { connection });


