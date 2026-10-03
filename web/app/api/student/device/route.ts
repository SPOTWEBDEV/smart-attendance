// app/api/student/device/route.ts
// STUDENT: bind a new phone AFTER an admin has reset the old one.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStudentByUserId } from "@/lib/student";

const schema = z.object({
  deviceId: z.string().min(8),
  deviceModel: z.string().optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  try {
    const device = await prisma.device.create({
      data: {
        studentId: student.id,
        deviceId: parsed.data.deviceId,
        model: parsed.data.deviceModel,
        platform: parsed.data.platform,
      },
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a device, or this phone belongs to another student. Ask the admin to reset it." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/student/device  ->  { device: { deviceId, model } | null }
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "STUDENT");
  if (auth.error) return auth.error;

  const student = await getStudentByUserId(auth.user.id);
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const device = await prisma.device.findUnique({
    where: { studentId: student.id },
    select: { deviceId: true, model: true },
  });
  return NextResponse.json({ device });
}
