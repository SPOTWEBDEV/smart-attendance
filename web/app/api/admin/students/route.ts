// app/api/admin/students/route.ts
// ADMIN: list/search students, with their linked phone
// GET /api/admin/students?q=ada
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN");
  if (auth.error) return auth.error;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const students = await prisma.student.findMany({
    where: q
      ? {
          OR: [
            { matricNo: { contains: q, mode: "insensitive" } },
            { user: { fullName: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { matricNo: "asc" },
    take: 100,
    select: {
      id: true,
      matricNo: true,
      department: true,
      level: true,
      user: { select: { fullName: true, email: true } },
      device: { select: { model: true, platform: true, createdAt: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json({ students });
}
