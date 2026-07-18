import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth.mjs";
import { addLog } from "@/lib/logger.mjs";
import { broadcastEvent } from "@/lib/realtime.mjs";
import { buildTrackingSnapshot, readStore, updateStore } from "@/lib/store.mjs";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth instanceof Response) {
    return auth;
  }

  const store = await readStore();
  return NextResponse.json({
    settings: store.settings,
    schedules: store.schedules,
    fleetOptions: store.buses.filter(b => b.status === "Aktif").map(b => b.number)
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
      averageSpeedKmh:
        payload.averageSpeedKmh == null ? current.settings.averageSpeedKmh : Number(payload.averageSpeedKmh),
      broadcastEnabled:
        payload.broadcastEnabled == null ? current.settings.broadcastEnabled : Boolean(payload.broadcastEnabled),
      gpsTimeoutSeconds:
        payload.gpsTimeoutSeconds == null ? current.settings.gpsTimeoutSeconds : Number(payload.gpsTimeoutSeconds),
      operationalStatus: payload.operationalStatus || current.settings.operationalStatus
    }
  }));
  const snapshot = buildTrackingSnapshot(store);
  broadcastEvent("tracking:snapshot", snapshot);

  await addLog(
    "System Admin",
    `Mengubah pengaturan sistem (Broadcast: ${payload.broadcastEnabled !== undefined ? payload.broadcastEnabled : store.settings.broadcastEnabled})`,
    "INFO"
  );

  return NextResponse.json({ success: true, settings: store.settings });
}
