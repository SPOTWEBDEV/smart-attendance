// lib/lecturer-accounts.ts
import { randomInt } from "crypto";
import { prisma } from "./prisma";

// Today's date in Nigeria, formatted 2024-03-11
export const registrationDate = (d = new Date()) =>
  d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

// Staff ID like  ESUT-2024-03-11-4827
// = ESUT + the day the lecturer was registered + a random number (4 digits, more if needed)
export async function generateStaffId() {
  const date = registrationDate();
  for (let digits = 4; digits <= 6; digits++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const random = randomInt(0, 10 ** digits).toString().padStart(digits, "0");
      const id = `ESUT-${date}-${random}`;
      const taken = await prisma.lecturer.findUnique({ where: { staffId: id }, select: { id: true } });
      if (!taken) return id;
    }
  }
  throw new Error("Could not generate a staff ID");
}

// The password a new lecturer starts with, until they change it.
// Default: their own email address (lowercase).
// To give every lecturer the same starting password instead, set LECTURER_DEFAULT_PASSWORD in .env.
export const startingPasswordFor = (email: string) =>
  process.env.LECTURER_DEFAULT_PASSWORD || email.toLowerCase();
