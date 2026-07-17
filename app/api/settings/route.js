import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, getFleetOptions, readStore, updateStore } from "@/lib/store.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await readStore();
  return NextResponse.json({
    settings: store.settings,
    schedules: store.schedules,
    fleetOptions: getFleetOptions(store.settings.totalBuses)
  });
}

export async function PATCH(request) {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();
  const store = await updateStore((current) => ({
    ...current,
    settings: {
      ...current.settings,
      ...payload,
      totalBuses:
        payload.totalBuses == null ? current.settings.totalBuses : Number(payload.totalBuses)
    }
  }));
  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  return NextResponse.json({ settings: store.settings });
}
