// app/api/sessions/[id]/manual/route.ts
// LECTURER: mark a student present by hand (phone died, etc.). A reason is required.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

const schema = z.object({
  studentId: z.string().min(1),
  note: z.string().min(3, "Please give a reason"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const lecturer = await getLecturerByUserId(auth.user.id);
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { id, lecturerId: lecturer.id },
    select: { id: true, courseId: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const enrolled = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId: parsed.data.studentId, courseId: session.courseId },
    },
    select: { id: true },
  });
  if (!enrolled) {
    return NextResponse.json({ error: "Student is not enrolled in this course" }, { status: 400 });
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId: parsed.data.studentId,
        method: "MANUAL",
        note: parsed.data.note,
      },
      select: { id: true, markedAt: true },
    });
    return NextResponse.json({ attendance }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Student is already marked present" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
