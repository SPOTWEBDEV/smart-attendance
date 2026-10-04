import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Seeding runs against direct connection string or standard database url
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@school.edu";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const fullName = process.env.ADMIN_NAME ?? "System Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {}, // don't overwrite an existing admin's password
    create: { email, passwordHash, fullName, role: "ADMIN" },
  });

  console.log(`Admin ready: ${admin.email}`);
}

async function main() {
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });