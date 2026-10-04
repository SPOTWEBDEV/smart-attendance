// app/api/student/analytics/route.ts
// STUDENT: overall attendance, per-course attendance, last 6 weeks, recent check-ins
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";

const MIN_PERCENT = 75;
const WEEKS = 6;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  // --- per course ---
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    select: {
      course: {
        select: { id: true, code: true, title: true, _count: { select: { sessions: true } } },
      },
    },
  });
  const courseIds = enrollments.map((e) => e.course.id);

  const attendances = await prisma.attendance.findMany({
    where: { studentId: student.id, session: { courseId: { in: courseIds } } },
    select: { session: { select: { courseId: true } } },
  });
  const attendedBy = new Map<string, number>();
  for (const a of attendances) {
    attendedBy.set(a.session.courseId, (attendedBy.get(a.session.courseId) ?? 0) + 1);
  }

  const courses = enrollments.map(({ course }) => {
    const total = course._count.sessions;
    const attended = Math.min(attendedBy.get(course.id) ?? 0, total);
    const percent = total ? Math.round((attended / total) * 100) : 0;
    const belowMinimum = total > 0 && percent < MIN_PERCENT;
    // How many classes in a row they must attend to get back to the minimum
    const classesToReachMinimum = belowMinimum
      ? Math.max(0, Math.ceil((MIN_PERCENT * total - 100 * attended) / (100 - MIN_PERCENT)))
      : 0;
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      attended,
      total,
      percent,
      belowMinimum,
      classesToReachMinimum,
    };
  });

  const totalAttended = courses.reduce((n, c) => n + c.attended, 0);
  const totalSessions = courses.reduce((n, c) => n + c.total, 0);
  const overall = {
    attended: totalAttended,
    total: totalSessions,
    percent: totalSessions ? Math.round((totalAttended / totalSessions) * 100) : 0,
  };

  // --- last 6 weeks ---
  const thisWeek = startOfWeek(new Date());
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const s = new Date(thisWeek);
    s.setDate(s.getDate() - 7 * (WEEKS - 1 - i));
    return s;
  });
  const since = weeks[0];
  const counts = new Array(WEEKS).fill(0);

  const lastWeeks = await prisma.attendance.findMany({
    where: { studentId: student.id, markedAt: { gte: since } },
    select: { markedAt: true },
  });
  for (const a of lastWeeks) {
    const idx = Math.floor((startOfWeek(a.markedAt).getTime() - since.getTime()) / (7 * 86_400_000) + 0.5);
    if (idx >= 0 && idx < WEEKS) counts[idx] += 1;
  }
  const weekly = weeks.map((w, i) => ({
    label: w.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    count: counts[i],
  }));

  // --- recent check-ins ---
  const recent = await prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { markedAt: "desc" },
    take: 8,
    select: {
      id: true,
      markedAt: true,
      method: true,
      session: { select: { topic: true, course: { select: { code: true, title: true } } } },
    },
  });

  return NextResponse.json({ minPercent: MIN_PERCENT, overall, courses, weekly, recent });
}
