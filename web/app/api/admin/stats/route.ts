// app/api/admin/stats/route.ts
// ADMIN: numbers for the dashboard overview
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [students, lecturers, courses, sessions, openSessions, attendanceToday] =
    await Promise.all([
      prisma.student.count(),
      prisma.lecturer.count(),
      prisma.course.count(),
      prisma.session.count(),
      prisma.session.count({ where: { status: "OPEN" } }),
      prisma.attendance.count({ where: { markedAt: { gte: startOfToday } } }),
    ]);

  return NextResponse.json({ students, lecturers, courses, sessions, openSessions, attendanceToday });
}
