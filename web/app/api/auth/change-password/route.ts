// app/api/auth/change-password/route.ts
// Any signed-in user. A lecturer must use this before anything else
// while they still have the starting password.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: first ?? "Invalid input" }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { passwordHash: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 400, not 401, so the web dashboard doesn't treat it as "session expired"
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "Choose a password that is different from the current one" }, { status: 400 });
  }
  if (
    newPassword.toLowerCase() === user.email.toLowerCase() ||
    (process.env.LECTURER_DEFAULT_PASSWORD && newPassword === process.env.LECTURER_DEFAULT_PASSWORD)
  ) {
    return NextResponse.json({ error: "Choose a password that is not your email or the starting password" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
