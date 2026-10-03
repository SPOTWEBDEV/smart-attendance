// app/api/student/enrollments/[courseId]/route.ts
// STUDENT: drop a course (past attendance records are kept)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> } // Next 15. On Next 14 use { params: { courseId: string } }
) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const { courseId } = await params;

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const result = await prisma.enrollment.deleteMany({
    where: { studentId: student.id, courseId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
