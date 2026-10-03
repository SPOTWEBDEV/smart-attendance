// app/api/courses/[id]/summary/route.ts
// LECTURER: attendance percentage for every enrolled student in their course
// ADMIN: the same for any course
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

const MIN_PERCENT = 75; // typical minimum to sit the exam; change to your school's rule

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, "LECTURER", "ADMIN");
  if (auth.error) return auth.error;

  const { id: courseId } = await params;

  const where: Prisma.CourseWhereInput = { id: courseId };
  if (auth.user.role === "LECTURER") {
    const lecturer = await getLecturerByUserId(auth.user.id);
    if (!lecturer) {
      return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
    }
    where.lecturerId = lecturer.id; // lecturers only see their own courses
  }

  const course = await prisma.course.findFirst({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      lecturer: { select: { user: { select: { fullName: true } } } },
    },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const totalSessions = await prisma.session.count({ where: { courseId } });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: {
      student: {
        select: {
          id: true,
          matricNo: true,
          user: { select: { fullName: true } },
          _count: { select: { attendances: { where: { session: { courseId } } } } },
        },
      },
    },
  });

  const students = enrollments
    .map(({ student }) => {
      const attended = student._count.attendances;
      const percent = totalSessions ? Math.round((attended / totalSessions) * 100) : 0;
      return {
        studentId: student.id,
        matricNo: student.matricNo,
        fullName: student.user.fullName,
        attended,
        percent,
        belowMinimum: totalSessions > 0 && percent < MIN_PERCENT,
      };
    })
    .sort((a, b) => a.matricNo.localeCompare(b.matricNo));

  return NextResponse.json({
    course: { id: course.id, code: course.code, title: course.title },
    lecturerName: course.lecturer.user.fullName,
    totalSessions,
    minPercent: MIN_PERCENT,
    students,
  });
}
