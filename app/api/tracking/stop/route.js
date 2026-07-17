import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, updateStore } from "@/lib/store.mjs";
import { busDefaultPosition } from "@/lib/mock-data.js";

export async function POST() {
  const auth = await requireRole("driver");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await updateStore((current) => ({
    ...current,
    bus: {
      ...current.bus,
      lat: busDefaultPosition.lat,
      lng: busDefaultPosition.lng,
      isTracking: false,
      stationName: current.settings.chargingStationName,
      statusText: `Bilis ${current.bus.number} berada di ${current.settings.chargingStationName}.`,
      updatedAt: new Date().toISOString()
    },
    drivers: current.drivers.map((driver) =>
      driver.id === auth.id ? { ...driver, status: "Siaga" } : driver
    )
  }));

  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  return NextResponse.json({ success: true, snapshot });
}
