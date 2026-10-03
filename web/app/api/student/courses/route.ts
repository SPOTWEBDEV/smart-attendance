// app/api/student/courses/route.ts
// STUDENT: browse/search courses, with an "enrolled" flag on each
// GET /api/student/courses?q=cpe
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

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const courses = await prisma.course.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { code: "asc" },
    take: 50,
    select: {
      id: true,
      code: true,
      title: true,
      unit: true,
      semester: true,
      session: true,
      lecturer: { select: { user: { select: { fullName: true } } } },
      enrollments: { where: { studentId: student.id }, select: { id: true } },
    },
  });

  return NextResponse.json({
    courses: courses.map(({ enrollments, lecturer, ...c }) => ({
      ...c,
      lecturerName: lecturer.user.fullName,
      enrolled: enrollments.length > 0,
    })),
  });
}
