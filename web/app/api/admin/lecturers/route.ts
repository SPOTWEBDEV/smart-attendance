// app/api/admin/lecturers/route.ts
// ADMIN ONLY: create and list lecturers
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { generateStaffId, startingPasswordFor } from "@/lib/lecturer-accounts";

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  department: z.string().min(1),
});

// POST /api/admin/lecturers   body: { fullName, email, department }
// The staff ID and starting password are generated here.
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

  const { fullName, email, department } = parsed.data;

  try {
    const staffId = await generateStaffId();
    const startingPassword = startingPasswordFor(email);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(startingPassword),
        mustChangePassword: true, // they must pick their own password on first sign-in
        fullName,
        role: "LECTURER",
        createdById: auth.user.id,
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

    return NextResponse.json({ lecturer: user, startingPassword }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
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
      user: { select: { id: true, fullName: true, email: true, isActive: true, mustChangePassword: true } },
      _count: { select: { courses: true } },
    },
  });

  return NextResponse.json({ lecturers });
}
