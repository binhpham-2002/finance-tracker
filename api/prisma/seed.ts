import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Food & Dining", icon: "🍔", color: "#EF4444", isDefault: true },
  { name: "Transportation", icon: "🚗", color: "#F59E0B", isDefault: true },
  { name: "Housing", icon: "🏠", color: "#3B82F6", isDefault: true },
  { name: "Utilities", icon: "💡", color: "#8B5CF6", isDefault: true },
  { name: "Healthcare", icon: "🏥", color: "#EC4899", isDefault: true },
  { name: "Entertainment", icon: "🎬", color: "#10B981", isDefault: true },
  { name: "Shopping", icon: "🛍️", color: "#F97316", isDefault: true },
  { name: "Education", icon: "📚", color: "#06B6D4", isDefault: true },
  { name: "Savings", icon: "💰", color: "#22C55E", isDefault: true },
  { name: "Income", icon: "💵", color: "#14B8A6", isDefault: true },
  { name: "Other", icon: "📌", color: "#6B7280", isDefault: true },
];

async function main() {
  console.log("Seeding categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log(`Done! Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
