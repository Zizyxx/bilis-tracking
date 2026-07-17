import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, getFleetOptions, updateStore } from "@/lib/store.mjs";

export async function POST(request) {
  const auth = await requireRole("driver");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json().catch(() => ({}));

  const store = await updateStore((current) => ({
    ...current,
    bus: {
      ...current.bus,
      number: getFleetOptions(current.settings.totalBuses).includes(payload?.busNumber)
        ? payload.busNumber
        : current.bus.number,
      isTracking: true,
      driverId: auth.id,
      statusText: `Bilis ${
        getFleetOptions(current.settings.totalBuses).includes(payload?.busNumber)
          ? payload.busNumber
          : current.bus.number
      } sedang mengirim lokasi secara real-time.`,
      updatedAt: new Date().toISOString()
    },
    drivers: current.drivers.map((driver) =>
      driver.id === auth.id ? { ...driver, status: "Aktif" } : driver
    )
  }));

  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  return NextResponse.json({ success: true, snapshot });
}
