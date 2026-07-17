import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { readStore, updateStore } from "@/lib/store.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await readStore();
  return NextResponse.json({ stops: store.stops });
}

export async function POST(request) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const stop = {
    id: `STOP-${Date.now()}`,
    faculty: payload.faculty,
    name: payload.name,
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    queue: payload.queue || "Lengang"
  };

  const store = await updateStore((current) => ({
    ...current,
    stops: [...current.stops, stop]
  }));

  return NextResponse.json({ stop, stops: store.stops });
}
