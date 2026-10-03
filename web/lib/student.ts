// lib/student.ts
import { prisma } from "./prisma";

// Finds the Student profile for a logged-in user
export function getStudentByUserId(userId: string) {
  return prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
}
