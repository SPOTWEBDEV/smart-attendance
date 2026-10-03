// app/api/courses/route.ts
// LECTURER: add the courses they take, and list them
// ADMIN: can list all courses
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const createSchema = z.object({
  code: z.string().min(2).transform((s) => s.trim().toUpperCase()), // e.g. "CPE 401"
  title: z.string().min(2),
  unit: z.number().int().min(1).max(10).optional(),
  semester: z.string().optional(),
  session: z.string().optional(), // e.g. "2025/2026"
});

// POST /api/courses
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

  const lecturer = await prisma.lecturer.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  try {
    const course = await prisma.course.create({
      data: { ...parsed.data, lecturerId: lecturer.id },
    });
    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A course with this code already exists" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/courses
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "LECTURER", "ADMIN");
  if (auth.error) return auth.error;

  let where: Prisma.CourseWhereInput = {};

  if (auth.user.role === "LECTURER") {
    const lecturer = await prisma.lecturer.findUnique({
      where: { userId: auth.user.id },
      select: { id: true },
    });
    if (!lecturer) {
      return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
    }
    where = { lecturerId: lecturer.id }; // lecturers only see their own courses
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      lecturer: { select: { user: { select: { fullName: true } } } },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });

  return NextResponse.json({ courses });
}
