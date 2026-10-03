// prisma/seed.ts
// Creates the first admin (admins can't be created through the app).
// Run with: npx prisma db seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
