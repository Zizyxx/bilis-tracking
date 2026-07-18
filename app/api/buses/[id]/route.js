import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { addLog } from "@/lib/logger.mjs";
import { readStore, updateStore } from "@/lib/store.mjs";

export async function PUT(request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await params;
  const payload = await request.json();
  const store = await readStore();

  const existingIndex = store.buses.findIndex((b) => b.id === id);
  if (existingIndex === -1) {
    return NextResponse.json({ error: "Bilis tidak ditemukan." }, { status: 404 });
  }

  const existing = store.buses[existingIndex];

  // Validate duplicate if number changed
  if (payload.number && payload.number !== existing.number) {
    if (store.buses.some((b) => b.number === payload.number)) {
      return NextResponse.json({ error: "Nomor bilis sudah digunakan." }, { status: 400 });
    }
  }

  const updatedBus = {
    ...existing,
    number: payload.number ?? existing.number,
    plate: payload.plate ?? existing.plate,
    status: payload.status ?? existing.status
  };

  const updatedStore = await updateStore((current) => {
    const newBuses = [...current.buses];
    const idx = newBuses.findIndex((b) => b.id === id);
    if (idx !== -1) {
      newBuses[idx] = updatedBus;
    }
    return { ...current, buses: newBuses };
  });

  await addLog(
    "System Admin",
    `Mengubah data armada: Bilis ${updatedBus.number}`,
    "INFO"
  );

  return NextResponse.json({ bus: updatedBus, buses: updatedStore.buses });
}

export async function DELETE(request, { params }) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await params;
  const store = await readStore();
  
  const existing = store.buses.find(b => b.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Bilis tidak ditemukan." }, { status: 404 });
  }

  if (existing.isTracking) {
    return NextResponse.json({ error: "Tidak dapat menghapus bilis yang sedang online/beroperasi." }, { status: 400 });
  }

  const updatedStore = await updateStore((current) => ({
    ...current,
    buses: current.buses.filter((b) => b.id !== id)
  }));

  await addLog(
    "System Admin",
    `Menghapus armada: Bilis ${bus.number}`,
    "WARNING"
  );

  return NextResponse.json({ success: true, buses: updatedStore.buses });
}
