import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { updateStore, sanitizeUser } from "@/lib/store.mjs";

export async function PUT(request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const resolvedParams = await params;

  let newPasswordHash = null;
  if (payload.password) {
    newPasswordHash = await bcrypt.hash(payload.password, 10);
  }

  const store = await updateStore((current) => ({
    ...current,
    drivers: current.drivers.map((driver) => {
      if (driver.id === resolvedParams.id) {
        const updated = {
          ...driver,
          name: payload.name,
          email: payload.email,
          username: payload.username,
          status: payload.status
        };
        if (newPasswordHash) {
          updated.passwordHash = newPasswordHash;
        }
        return updated;
      }
      return driver;
    })
  }));

  return NextResponse.json({
    drivers: store.drivers.map((entry) => sanitizeUser({ ...entry, role: "driver" }))
  });
}

export async function DELETE(_request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const resolvedParams = await params;
  const store = await updateStore((current) => ({
    ...current,
    drivers: current.drivers.filter((driver) => driver.id !== resolvedParams.id)
  }));

  return NextResponse.json({
    drivers: store.drivers.map((entry) => sanitizeUser({ ...entry, role: "driver" }))
  });
}
