// app/api/sessions/[id]/route.ts
// LECTURER: one session with everyone who was marked present
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next 15. On Next 14 use { params: { id: string } }
) {
  const auth = await requireRole(req, "LECTURER");
  if (auth.error) return auth.error;

  const { id } = await params;

  const lecturer = await getLecturerByUserId(auth.user.id);
  if (!lecturer) {
    return NextResponse.json({ error: "Lecturer profile not found" }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { id, lecturerId: lecturer.id },
    select: {
      id: true,
      topic: true,
      status: true,
      startsAt: true,
      endsAt: true,
      windowMins: true,
      course: { select: { id: true, code: true, title: true } },
      attendances: {
        orderBy: { markedAt: "asc" },
        select: {
          id: true,
          method: true,
          note: true,
          rssi: true,
          markedAt: true,
          student: {
            select: { id: true, matricNo: true, user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}
