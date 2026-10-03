// app/api/admin/students/[id]/device/route.ts
// ADMIN: reset a student's bound device (lost or changed phone).
// After this the student can register the new phone via the app.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// :id is the Student id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next 15. On Next 14 use { params: { id: string } }
) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const { id } = await params;

  const result = await prisma.device.deleteMany({ where: { studentId: id } });
  if (result.count === 0) {
    return NextResponse.json({ error: "No device found for this student" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
