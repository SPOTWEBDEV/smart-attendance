// app/api/admin/lecturers/[id]/route.ts      (:id = Lecturer id)
// ADMIN: edit, reset password, activate/deactivate (PATCH) and delete (DELETE)
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { startingPasswordFor } from "@/lib/lecturer-accounts";

const patchSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    email: z.string().email().transform((s) => s.trim().toLowerCase()).optional(),
    department: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    resetPassword: z.literal(true).optional(), // put the starting password back
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

type Ctx = { params: Promise<{ id: string }> }; // Next 15/16. On Next 14 use { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { fullName, email, department, isActive, resetPassword } = parsed.data;

  const lecturer = await prisma.lecturer.findUnique({
    where: { id },
    select: { userId: true, user: { select: { email: true, mustChangePassword: true } } },
  });
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
  }

  const userData: Prisma.UserUpdateInput = {};
  if (fullName !== undefined) userData.fullName = fullName;
  if (email !== undefined) userData.email = email;
  if (isActive !== undefined) userData.isActive = isActive;

  // Reset on request. Also when the email changes while the lecturer still has the
  // email-based starting password, so their starting password matches the new email.
  const emailChangedBeforeFirstLogin =
    email !== undefined &&
    email !== lecturer.user.email &&
    lecturer.user.mustChangePassword &&
    !process.env.LECTURER_DEFAULT_PASSWORD;

  let startingPassword: string | undefined;
  if (resetPassword || emailChangedBeforeFirstLogin) {
    startingPassword = startingPasswordFor(email ?? lecturer.user.email);
    userData.passwordHash = await hashPassword(startingPassword);
    userData.mustChangePassword = true;
  }

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: lecturer.userId }, data: userData }),
      ...(department !== undefined
        ? [prisma.lecturer.update({ where: { id }, data: { department } })]
        : []),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Another user already uses this email" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, startingPassword });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const { id } = await params;

  const lecturer = await prisma.lecturer.findUnique({
    where: { id },
    select: { userId: true, _count: { select: { courses: true } } },
  });
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
  }

  // Deleting a lecturer who has courses would also wipe those courses' attendance records.
  if (lecturer._count.courses > 0) {
    return NextResponse.json(
      {
        error: `This lecturer has ${lecturer._count.courses} course(s) with attendance records. Deactivate the account instead.`,
      },
      { status: 409 }
    );
  }

  await prisma.user.delete({ where: { id: lecturer.userId } }); // the lecturer profile goes with it
  return NextResponse.json({ ok: true });
}
