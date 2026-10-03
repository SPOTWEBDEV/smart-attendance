// app/api/admin/lecturers/route.ts
// ADMIN ONLY: create and list lecturers
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  staffId: z.string().min(1),
  department: z.string().min(1),
});

// POST /api/admin/lecturers
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { fullName, email, password, staffId, department } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        fullName,
        role: "LECTURER",
        createdById: auth.user.id, // which admin added this lecturer
        lecturer: { create: { staffId, department } },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        lecturer: { select: { id: true, staffId: true, department: true } },
      },
    });

    return NextResponse.json({ lecturer: user }, { status: 201 });
  } catch (e) {
    // P2002 = unique constraint (email or staffId already exists)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email or staff ID already exists" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/admin/lecturers
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const lecturers = await prisma.lecturer.findMany({
    orderBy: { user: { createdAt: "desc" } },
    select: {
      id: true,
      staffId: true,
      department: true,
      user: { select: { id: true, fullName: true, email: true, isActive: true } },
      _count: { select: { courses: true } },
    },
  });

  return NextResponse.json({ lecturers });
}
