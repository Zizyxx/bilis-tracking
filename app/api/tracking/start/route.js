import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, updateStore } from "@/lib/store.mjs";
import { addLog } from "@/lib/logger.mjs";

export async function POST(request) {
  const auth = await requireRole("driver");
  if (auth instanceof Response) {
    return auth;
  }

  const payload = await request.json().catch(() => ({}));

  const store = await updateStore((current) => {
    const validFleet = current.buses.filter(b => b.status === "Aktif").map(b => b.number);
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

  const busNumber = store.buses.find(b => b.driverId === auth.id)?.number || "Tidak Diketahui";
  await addLog(
    auth.name,
    `Mulai siaran langsung (live tracking) Bilis ${busNumber}`,
    "INFO"
  );

  return NextResponse.json({ success: true, snapshot });
}
