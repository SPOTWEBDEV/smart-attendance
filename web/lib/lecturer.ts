// lib/lecturer.ts
import { prisma } from "./prisma";

// Finds the Lecturer profile for a logged-in user
export function getLecturerByUserId(userId: string) {
  return prisma.lecturer.findUnique({
    where: { userId },
    select: { id: true },
  });
}
