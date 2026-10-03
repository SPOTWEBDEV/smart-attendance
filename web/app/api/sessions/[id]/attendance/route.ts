// app/api/sessions/[id]/attendance/route.ts
// STUDENT: mark attendance. This is where all the checks come together.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { verifyBeaconCode } from "@/lib/beacon";

const schema = z.object({
  deviceId: z.string().min(8),
  beaconCode: z.string().regex(/^\d{6}$/), // code the phone picked up over Bluetooth
  rssi: z.number().int().optional(),       // Bluetooth signal strength
  biometricVerified: z.literal(true),      // app confirms fingerprint/face passed
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Biometric check and beacon code are required" },
      { status: 400 }
    );
  }
  const { deviceId, beaconCode, rssi } = parsed.data;

  const student = await prisma.student.findUnique({
    where: { userId: auth.user.id },
    select: { id: true, device: { select: { deviceId: true, isApproved: true } } },
  });
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      courseId: true,
      status: true,
      startsAt: true,
      windowMins: true,
      beaconSecret: true,
    },
  });

  // 1. Session must be open
  if (!session || session.status !== "OPEN") {
    return NextResponse.json({ error: "This session is not open" }, { status: 404 });
  }

  // 2. Must be inside the attendance window
  const windowEnd = session.startsAt.getTime() + session.windowMins * 60_000;
  if (Date.now() > windowEnd) {
    return NextResponse.json({ error: "The attendance window has closed" }, { status: 410 });
  }

  // 3. Student must take this course
  const enrolled = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: session.courseId } },
    select: { id: true },
  });
  if (!enrolled) {
    return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
  }

  // 4. Must be the student's own registered phone
  if (!student.device || !student.device.isApproved || student.device.deviceId !== deviceId) {
    return NextResponse.json(
      { error: "This is not your registered device" },
      { status: 403 }
    );
  }

  // 5. Must have picked up the lecturer's live beacon code (proves they're in the room)
  if (!verifyBeaconCode(session.beaconSecret, beaconCode)) {
    return NextResponse.json(
      { error: "Beacon code is invalid or expired. Move closer to the lecturer and try again." },
      { status: 403 }
    );
  }

  // 6. Save (the database blocks a second mark for the same session)
  try {
    const attendance = await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        deviceId,
        method: "BIOMETRIC",
        beaconCode,
        rssi,
      },
      select: { id: true, markedAt: true },
    });
    return NextResponse.json({ attendance }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Attendance already marked" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
