import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "../config/env";

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export { prisma };
