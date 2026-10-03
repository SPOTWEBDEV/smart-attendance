// app/api/auth/register/route.ts
// Student self-registration. The student's phone is bound at sign-up:
// one student = one device, and one device = one student.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  matricNo: z.string().min(3).transform((s) => s.trim().toUpperCase()),
  department: z.string().min(1),
  level: z.number().int().min(100).max(900), // 100, 200, 300 ...
  // Sent by the Expo app (generate once and keep it in expo-secure-store)
  deviceId: z.string().min(8),
  deviceModel: z.string().optional(),
  platform: z.enum(["android", "ios"]).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const d = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email.toLowerCase(),
        passwordHash: await hashPassword(d.password),
        fullName: d.fullName,
        role: "STUDENT",
        student: {
          create: {
            matricNo: d.matricNo,
            department: d.department,
            level: d.level,
            device: {
              create: {
                deviceId: d.deviceId,
                model: d.deviceModel,
                platform: d.platform,
              },
            },
          },
        },
      },
      select: { id: true, fullName: true, email: true, role: true },
    });

    const token = await signToken({ id: user.id, role: user.role });
    return NextResponse.json({ token, user }, { status: 201 });
  } catch (e) {
    // P2002 = email, matric number or this phone is already registered
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Email, matric number or this device is already registered. " +
            "If you changed phones, ask the admin to reset your device.",
        },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
