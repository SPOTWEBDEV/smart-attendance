// app/api/sessions/[id]/beacon/route.ts
// LECTURER: get the current beacon code to broadcast.
// The lecturer app calls this every ~25 seconds and advertises the new code.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getLecturerByUserId } from "@/lib/lecturer";
import { generateBeaconCode } from "@/lib/beacon";

export async function GET(
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

  const session = await prisma.session.findFirst({
    where: { id, lecturerId: lecturer.id, status: "OPEN" },
    select: { beaconSecret: true, startsAt: true, windowMins: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Open session not found" }, { status: 404 });
  }

  const { code, expiresInSec } = generateBeaconCode(session.beaconSecret);
  const windowEndsAt = new Date(session.startsAt.getTime() + session.windowMins * 60_000);

  return NextResponse.json({ code, expiresInSec, windowEndsAt });
}
