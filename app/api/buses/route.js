import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { addLog } from "@/lib/logger.mjs";
import { readStore, updateStore } from "@/lib/store.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await readStore();
  return NextResponse.json({ buses: store.buses });
}

export async function POST(request) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const store = await readStore();

  if (store.buses.some((b) => b.number === payload.number)) {
    return NextResponse.json({ error: "Nomor bilis sudah digunakan." }, { status: 400 });
  }

  const bus = {
    id: `BUS-${Date.now()}`,
    number: payload.number,
    plate: payload.plate || "",
    status: payload.status || "Aktif"
  };

  const updatedStore = await updateStore((current) => ({
    ...current,
    buses: [...current.buses, bus]
  }));

  await addLog(
    "System Admin",
    `Menambahkan armada baru: Bilis ${bus.number} (${bus.plate})`,
    "SUCCESS"
  );

  return NextResponse.json({ bus, buses: updatedStore.buses });
}
