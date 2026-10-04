// app/api/me/route.ts
// STUDENT or LECTURER: see and edit their own profile
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT", "LECTURER");
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      student: {
        select: {
          matricNo: true,
          department: true,
          level: true,
          _count: { select: { enrollments: true } },
          device: { select: { model: true, platform: true, createdAt: true } },
        },
      },
      lecturer: {
        select: { staffId: true, department: true, _count: { select: { courses: true } } },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { student, lecturer, ...basic } = user;
  return NextResponse.json({ user: basic, student, lecturer });
}

const patchSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").optional(),
  department: z.string().trim().min(1).optional(), // students only
  level: z.number().int().min(100).max(900).optional(), // students only
});

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT", "LECTURER");
  if (auth.error) return auth.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }
  const { fullName, department, level } = parsed.data;

  if (auth.user.role === "LECTURER" && (department !== undefined || level !== undefined)) {
    return NextResponse.json({ error: "Your department is managed by the admin" }, { status: 400 });
  }

  await prisma.$transaction([
    ...(fullName !== undefined
      ? [prisma.user.update({ where: { id: auth.user.id }, data: { fullName } })]
      : []),
    ...(auth.user.role === "STUDENT" && (department !== undefined || level !== undefined)
      ? [prisma.student.update({ where: { userId: auth.user.id }, data: { department, level } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
