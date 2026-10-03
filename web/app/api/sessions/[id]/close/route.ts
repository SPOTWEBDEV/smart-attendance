// app/api/sessions/[id]/close/route.ts
// LECTURER: close a session (the beacon stops and nobody else can mark)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const { id } = await params;

  const lecturer = await getLecturerByUserId(auth.user.id);
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const result = await prisma.session.updateMany({
    where: { id, lecturerId: lecturer.id, status: "OPEN" },
    data: { status: "CLOSED", endsAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Session not found or already closed" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
