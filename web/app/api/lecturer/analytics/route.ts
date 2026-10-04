// app/api/lecturer/analytics/route.ts
// LECTURER: totals, attendance trend, per-course averages and students at risk
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

const MIN_PERCENT = 75;
const MIN_SESSIONS_FOR_RISK = 3; // don't call anyone "at risk" after only one or two classes
const TREND_LENGTH = 8;

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const lecturer = await getLecturerByUserId(auth.user.id);
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const courses = await prisma.course.findMany({
    where: { lecturerId: lecturer.id },
    select: {
      id: true,
      code: true,
      title: true,
      enrollments: {
        select: {
          student: { select: { id: true, matricNo: true, user: { select: { fullName: true } } } },
        },
      },
      sessions: {
        orderBy: { startsAt: "desc" },
        select: { id: true, startsAt: true, status: true, _count: { select: { attendances: true } } },
      },
    },
  });

  // how many classes each student attended, per course
  const attendances = await prisma.attendance.findMany({
    where: { session: { lecturerId: lecturer.id } },
    select: { studentId: true, session: { select: { courseId: true } } },
  });
  const attendedBy = new Map<string, number>();
  for (const a of attendances) {
    const key = `${a.session.courseId}:${a.studentId}`;
    attendedBy.set(key, (attendedBy.get(key) ?? 0) + 1);
  }

  const studentIds = new Set<string>();
  let sessionsHeld = 0;
  let openSessions = 0;
  let presentTotal = 0;
  let expectedTotal = 0;

  const trendAll: { id: string; code: string; startsAt: Date; present: number; enrolled: number; percent: number }[] = [];
  const atRiskAll: { studentId: string; fullName: string; matricNo: string; courseCode: string; percent: number }[] = [];

  const courseStats = courses.map((c) => {
    const enrolled = c.enrollments.length;
    const sessions = c.sessions.length;
    c.enrollments.forEach((e) => studentIds.add(e.student.id));
    sessionsHeld += sessions;

    let present = 0;
    for (const s of c.sessions) {
      present += s._count.attendances;
      if (s.status === "OPEN") openSessions += 1;
      trendAll.push({
        id: s.id,
        code: c.code,
        startsAt: s.startsAt,
        present: s._count.attendances,
        enrolled,
        percent: enrolled ? Math.min(100, Math.round((s._count.attendances / enrolled) * 100)) : 0,
      });
    }
    presentTotal += present;
    expectedTotal += sessions * enrolled;

    let atRisk = 0;
    if (sessions >= MIN_SESSIONS_FOR_RISK) {
      for (const e of c.enrollments) {
        const attended = Math.min(attendedBy.get(`${c.id}:${e.student.id}`) ?? 0, sessions);
        const percent = Math.round((attended / sessions) * 100);
        if (percent < MIN_PERCENT) {
          atRisk += 1;
          atRiskAll.push({
            studentId: e.student.id,
            fullName: e.student.user.fullName,
            matricNo: e.student.matricNo,
            courseCode: c.code,
            percent,
          });
        }
      }
    }

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      enrolled,
      sessions,
      avgPercent: enrolled && sessions ? Math.min(100, Math.round((present / (sessions * enrolled)) * 100)) : 0,
      atRisk,
    };
  });

  // newest 8 classes, shown oldest -> newest
  const trend = trendAll
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, TREND_LENGTH)
    .reverse();

  atRiskAll.sort((a, b) => a.percent - b.percent);

  return NextResponse.json({
    minPercent: MIN_PERCENT,
    minSessionsForRisk: MIN_SESSIONS_FOR_RISK,
    totals: {
      courses: courses.length,
      students: studentIds.size,
      sessions: sessionsHeld,
      openSessions,
      avgPercent: expectedTotal ? Math.min(100, Math.round((presentTotal / expectedTotal) * 100)) : 0,
      atRiskCount: atRiskAll.length,
    },
    courses: courseStats,
    trend,
    atRisk: atRiskAll.slice(0, 5),
  });
}
