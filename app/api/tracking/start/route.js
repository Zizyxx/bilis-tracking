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

  const store = await updateStore((current) => {
    const validFleet = getFleetOptions(current.settings.totalBuses);
    const busNumber = validFleet.includes(payload?.busNumber)
      ? payload.busNumber
      : validFleet[0];

    return {
      ...current,
      buses: current.buses.map((bus) =>
        bus.number === busNumber
          ? {
              ...bus,
              isTracking: true,
              driverId: auth.id,
              statusText: `Bilis ${busNumber} sedang dalam perjalanan.`,
              updatedAt: new Date().toISOString()
            }
          : bus
      ),
      drivers: current.drivers.map((driver) =>
        driver.id === auth.id ? { ...driver, status: "Aktif" } : driver
      )
    };
  });

  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  return NextResponse.json({ success: true, snapshot });
}
