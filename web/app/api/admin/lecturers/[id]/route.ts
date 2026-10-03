// app/api/admin/lecturers/[id]/route.ts
// ADMIN: activate or deactivate a lecturer account  (:id = Lecturer id)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next 15. On Next 14 use { params: { id: string } }
) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "isActive (true/false) is required" }, { status: 400 });
  }

  const lecturer = await prisma.lecturer.findUnique({ where: { id }, select: { userId: true } });
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: lecturer.userId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ ok: true });
}
