// app/api/sessions/route.ts
// LECTURER: open a class session, and list their sessions
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

const createSchema = z.object({
  courseId: z.string().min(1),
  topic: z.string().optional(),
  windowMins: z.number().int().min(1).max(120).optional(), // default 15 in the schema
});

// Never send beaconSecret to clients
const publicFields = {
  id: true,
  courseId: true,
  topic: true,
  status: true,
  startsAt: true,
  endsAt: true,
  windowMins: true,
} as const;

// POST /api/sessions   body: { courseId, topic?, windowMins? }
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
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

  // The course must belong to this lecturer
  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, lecturerId: lecturer.id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Only one open session per course at a time
  const alreadyOpen = await prisma.session.findFirst({
    where: { courseId: course.id, status: "OPEN" },
    select: { id: true },
  });
  if (alreadyOpen) {
    return NextResponse.json(
      { error: "This course already has an open session. Close it first.", sessionId: alreadyOpen.id },
      { status: 409 }
    );
  }

  const session = await prisma.session.create({
    data: {
      courseId: course.id,
      lecturerId: lecturer.id,
      topic: parsed.data.topic,
      windowMins: parsed.data.windowMins,
      beaconSecret: randomBytes(32).toString("hex"),
    },
    select: publicFields,
  });

  return NextResponse.json({ session }, { status: 201 });
}

// GET /api/sessions?courseId=...
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const lecturer = await getLecturerByUserId(auth.user.id);
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const courseId = req.nextUrl.searchParams.get("courseId") ?? undefined;

  const sessions = await prisma.session.findMany({
    where: { lecturerId: lecturer.id, courseId },
    orderBy: { startsAt: "desc" },
    take: 100,
    select: {
      ...publicFields,
      course: { select: { code: true, title: true } },
      _count: { select: { attendances: true } },
    },
  });

  return NextResponse.json({ sessions });
}
