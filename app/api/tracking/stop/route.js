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
    buses: current.buses.map((bus) =>
      bus.driverId === auth.id
        ? {
            ...bus,
            lat: busDefaultPosition.lat,
            lng: busDefaultPosition.lng,
            isTracking: false,
            driverId: null,
            stationName: current.settings.chargingStationName,
            statusText: `Bilis ${bus.number} berada di ${current.settings.chargingStationName}.`,
            updatedAt: new Date().toISOString()
          }
        : bus
    ),
    drivers: current.drivers.map((driver) =>
      driver.id === auth.id ? { ...driver, status: "Siaga" } : driver
    )
  }));

  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  return NextResponse.json({ success: true, snapshot });
}
