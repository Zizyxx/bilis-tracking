import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { readStore, sanitizeUser, updateStore } from "@/lib/store.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await readStore();
  return NextResponse.json({
    drivers: store.drivers.map((driver) => sanitizeUser({ ...driver, role: "driver" }))
  });
}

export async function POST(request) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const driver = {
    id: `DRV-${String(Date.now()).slice(-6)}`,
    role: "driver",
    name: payload.name,
    email: payload.email,
    username: payload.username,
    status: "Siaga",
    passwordHash
  };

  const store = await updateStore((current) => ({
    ...current,
    drivers: [...current.drivers, driver]
  }));

  return NextResponse.json({
    driver: sanitizeUser(driver),
    drivers: store.drivers.map((entry) => sanitizeUser({ ...entry, role: "driver" }))
  });
}
