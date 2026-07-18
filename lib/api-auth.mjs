import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCookieName, signToken, verifyToken } from "./auth.mjs";
import { readStore, sanitizeUser } from "./store.mjs";

export async function findUserByCredentials(role, identifier, password) {
  const store = await readStore();
  const collection = role === "admin" ? store.admins : store.drivers;
  const user = collection.find(
    (entry) => entry.email === identifier || entry.username === identifier
  );

  if (!user) {
    return null;
  }

  if (role === "driver" && user.status !== "Aktif") {
    throw new Error("Akun dinonaktifkan");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  return sanitizeUser({
    ...user,
    role
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    role: payload.role,
    name: payload.name,
    email: payload.email
  };
}

export async function requireRole(role) {
  const user = await getSessionUser();

  if (!user || user.role !== role) {
    return NextResponse.json(
      { error: "Akses ditolak." },
      { status: 401 }
    );
  }

  return user;
}

export function withSessionCookie(response, user) {
  response.cookies.set(getCookieName(), signToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(getCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
