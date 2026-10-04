// lib/auth.ts
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type AuthUser = { id: string; role: Role; mustChangePassword: boolean };

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

export async function signToken(user: { id: string; role: Role }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

async function userFromToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  // A bad, expired or tampered token just means "not signed in"
  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret);
    userId = payload.sub;
  } catch {
    return null;
  }
  if (!userId) return null;

  // Re-check the DB so deactivated accounts lose access immediately.
  // Database errors are NOT swallowed here: they show up in the terminal instead of
  // quietly looking like "signed out" (for example, a missing migration).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, mustChangePassword: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, role: user.role, mustChangePassword: user.mustChangePassword };
}

// Token can come from the Authorization header (mobile app)
// or the "token" cookie (web dashboard).
function readToken(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies.get("token")?.value ?? null;
}

// For API routes
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  return userFromToken(readToken(req));
}

// For server components and layouts (reads the cookie)
export async function getServerUser(): Promise<AuthUser | null> {
  const store = await cookies();
  return userFromToken(store.get("token")?.value);
}

// Any signed-in user, even one who still has to change their password.
// Only used by the change-password route.
export async function requireUser(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    } as const;
  }
  return { user, error: null } as const;
}

// Usage:
//   const auth = await requireRole(req, "ADMIN");
//   if (auth.error) return auth.error;
//   const user = auth.user;
// A user who still has the starting password is blocked here until they change it.
export async function requireRole(req: NextRequest, ...roles: Role[]) {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    } as const;
  }
  if (!roles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  if (user.mustChangePassword) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Please change your starting password first", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 }
      ),
    } as const;
  }
  return { user, error: null } as const;
}
