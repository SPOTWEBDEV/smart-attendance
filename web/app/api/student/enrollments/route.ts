// app/api/student/enrollments/route.ts
// STUDENT: register for a course, and list the courses they take
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";

const schema = z.object({ courseId: z.string().min(1) });

// POST /api/student/enrollments   body: { "courseId": "..." }
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, code: true, title: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  try {
    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.id, courseId: course.id },
    });
    return NextResponse.json({ enrollment, course }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "You are already enrolled" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/student/enrollments
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          unit: true,
          lecturer: { select: { user: { select: { fullName: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ enrollments });
}
