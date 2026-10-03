// app/api/student/sessions/open/route.ts
// STUDENT: open sessions for the courses they take.
// The student app uses this to know which session to scan the beacon for.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const sessions = await prisma.session.findMany({
    where: {
      status: "OPEN",
      course: { enrollments: { some: { studentId: student.id } } },
    },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      topic: true,
      startsAt: true,
      windowMins: true,
      course: { select: { code: true, title: true } },
      attendances: { where: { studentId: student.id }, select: { id: true } },
    },
  });

  const now = Date.now();
  return NextResponse.json({
    sessions: sessions
      .filter((s) => now <= s.startsAt.getTime() + s.windowMins * 60_000)
      .map(({ attendances, ...s }) => ({ ...s, alreadyMarked: attendances.length > 0 })),
  });
}
