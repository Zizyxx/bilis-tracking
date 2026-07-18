import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, updateStore } from "@/lib/store.mjs";

export async function POST(request) {
  const auth = await requireRole("driver");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json();

  const store = await updateStore((current) => ({
    ...current,
    buses: current.buses.map((bus) =>
      bus.driverId === auth.id
        ? {
            ...bus,
            lat: Number(payload.lat),
            lng: Number(payload.lng),
            updatedAt: new Date().toISOString(),
            isTracking: true,
            stationName: current.settings.chargingStationName,
            statusText: payload.statusText || `Bilis ${bus.number} sedang dalam perjalanan.`
          }
        : bus
    )
  }));

  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:update", snapshot);

  return NextResponse.json({ success: true, snapshot });
}
