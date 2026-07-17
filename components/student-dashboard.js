"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { campusCenter, stops as seedStops } from "@/lib/mock-data";
import { getClosestStop } from "@/lib/tracking";

const LiveMap = dynamic(
  () => import("@/components/live-map").then((module) => module.LiveMap),
  { ssr: false }
);

function formatUpdatedAt(value) {
  if (!value) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function getEtaForStop(etas, stopId) {
  return etas.find((entry) => entry.stopId === stopId)?.etaMinutes ?? 0;
}

export function StudentDashboard() {
  const [snapshot, setSnapshot] = useState({
    buses: [
      {
        number: "01",
        lat: campusCenter[0],
        lng: campusCenter[1],
        updatedAt: null,
        isTracking: false,
        statusText: "Memuat data operasional...",
        stationName: "Bilis Charging Station"
      }
    ],
    route: [],
    stops: seedStops,
    etas: [],
    status: {
      broadcastEnabled: true,
      operationalStatus: "Memuat",
      gpsTimeoutSeconds: 15,
      totalBuses: 6
    },
    fleetOptions: ["01", "02", "03", "04", "05", "06"]
  });
  const [selectedStopId, setSelectedStopId] = useState(seedStops[0].id);
  const [autoCenter, setAutoCenter] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let pollingTimer;

    async function loadState() {
      try {
        const response = await fetch("/api/public/state", { cache: "no-store" });
        const data = await response.json();
        if (isMounted) {
          setSnapshot(data);
          setSelectedStopId((current) => current || data.stops[0]?.id || seedStops[0].id);
          setIsConnected(true);
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    }

    loadState();
    pollingTimer = window.setInterval(loadState, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(pollingTimer);
    };
  }, []);

  const selectedStop = snapshot.stops.find((stop) => stop.id === selectedStopId) ?? snapshot.stops[0];
  const activeBuses = Array.isArray(snapshot.buses) ? snapshot.buses.filter((b) => b.isTracking) : [];
  const isAnyBusTracking = activeBuses.length > 0;

  const closestBus = useMemo(() => {
    if (activeBuses.length === 0) return null;
    let closest = null;
    let minDistance = Infinity;
    for (const bus of activeBuses) {
      const match = getClosestStop(bus, snapshot.stops);
      if (match && match.distance < minDistance) {
        minDistance = match.distance;
        closest = { bus, stop: match.stop };
      }
    }
    return closest;
  }, [activeBuses, snapshot.stops]);

  const selectedEtaObj = snapshot.etas.find((eta) => eta.stopId === selectedStop?.id);
  const selectedEta = selectedEtaObj?.etaMinutes ?? 0;
  const nearestBusNum = selectedEtaObj?.nearestBus;
  
  const isGpsOffline = isAnyBusTracking && activeBuses.every((bus) => {
    const age = bus.updatedAt ? Math.floor((Date.now() - new Date(bus.updatedAt).getTime()) / 1000) : Infinity;
    return age > snapshot.status.gpsTimeoutSeconds;
  });

  const latestUpdate = activeBuses.reduce((latest, bus) => {
    if (!bus.updatedAt) return latest;
    const dt = new Date(bus.updatedAt).getTime();
    return dt > latest ? dt : latest;
  }, 0);
  const latestUpdateString = latestUpdate > 0 ? new Date(latestUpdate).toISOString() : null;

  return (
    <main className="student-map relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <LiveMap
          autoCenter={autoCenter}
          buses={snapshot.buses}
          center={campusCenter}
          className="h-full w-full"
          onSelectStop={setSelectedStopId}
          route={snapshot.route}
          selectedStopId={selectedStop?.id}
          stops={snapshot.stops}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-2 sm:p-4 md:p-6">
        <div className="glass-panel fade-up pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 rounded-[20px] px-3 py-3 text-slate-900 sm:gap-3 sm:rounded-[24px] sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:rounded-[28px]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700 sm:text-xs sm:tracking-[0.28em]">
              Live Tracking Bilis UIN Jakarta
            </p>
            <h1 className="mt-1 hidden text-base font-semibold leading-tight sm:block sm:text-lg md:text-2xl">
              Pantau posisi bus dan ETA halte tanpa refresh
            </h1>
          </div>
          <div className="flex max-w-full items-center gap-2 self-start rounded-xl bg-blue-50 px-2 py-1.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-2 md:self-auto md:rounded-full">
            <div
              className={`pulse-dot h-2 w-2 sm:h-3 sm:w-3 rounded-full ${
                isAnyBusTracking && isConnected && !isGpsOffline ? "bg-green-500" : "bg-slate-300"
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-900 sm:text-sm">
                {!isAnyBusTracking
                  ? "Bilis sedang tidak beroperasi"
                  : isGpsOffline
                  ? "Menunggu Sinyal GPS"
                  : isConnected
                  ? "Sinkronisasi Aktif"
                  : "Menyambung Ulang"}
              </p>
              <p className="truncate text-[10px] text-slate-500 sm:text-xs">
                Update terakhir {formatUpdatedAt(latestUpdateString)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        className="glass-panel active:scale-95 absolute bottom-[13rem] right-2 z-[500] flex h-10 w-10 items-center justify-center rounded-full text-lg text-blue-700 transition hover:bg-white sm:bottom-[17.5rem] sm:right-4 sm:h-14 sm:w-14 sm:text-2xl md:bottom-[14rem] md:right-6"
        onClick={() => setAutoCenter((current) => !current)}
        type="button"
      >
        +
      </button>

      <section className="absolute inset-x-0 bottom-0 z-[500] p-2 sm:p-4 md:p-6">
        <div className="mesh-card mx-auto max-w-5xl rounded-t-[24px] rounded-b-[16px] p-3 text-slate-900 sm:rounded-t-[28px] sm:rounded-b-[20px] sm:p-5 md:rounded-t-[32px] md:rounded-b-[24px] md:p-6">
          <div className="flex flex-col gap-2 sm:gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-1 sm:space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs sm:tracking-[0.28em]">
                Halte Dipantau
              </p>
              <div>
                <h2 className="text-lg font-semibold leading-tight text-blue-950 sm:text-2xl md:text-3xl">
                  {selectedStop?.name || "Memuat halte"}
                </h2>
                <p className="mt-1 max-w-2xl text-[10px] leading-snug text-slate-500 sm:mt-2 sm:text-sm sm:leading-5">
                  Bilis aktif: <span className="font-semibold text-blue-700">{isAnyBusTracking ? activeBuses.map((b) => `#${b.number}`).join(", ") : "-"}</span>.{" "}
                  Status:{" "}
                  <span className="font-semibold text-blue-700">
                    {!isAnyBusTracking && snapshot.status.operationalStatus === "Beroperasi"
                      ? "Tidak Beroperasi"
                      : snapshot.status.operationalStatus}
                  </span>. Halte
                  terdekat:{" "}
                  <span className="font-semibold text-blue-700">{closestBus ? `${closestBus.stop.name} (Bilis #${closestBus.bus.number})` : "-"}</span>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[auto,1fr] items-end gap-x-3 self-start sm:mt-0 md:min-w-[220px] md:self-auto">
              <span className="text-4xl font-semibold leading-none text-blue-700 sm:text-6xl md:text-7xl">
                {selectedEta || "--"}
              </span>
              <div className="pb-1 sm:pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-600 sm:text-sm sm:tracking-[0.24em]">
                  Menit Lagi {nearestBusNum ? `(Bilis #${nearestBusNum})` : ""}
                </p>
                <p className="max-w-[180px] text-[10px] leading-snug text-slate-500 sm:max-w-[240px] sm:text-sm sm:leading-5">
                  {isAnyBusTracking ? `${activeBuses.length} bilis sedang beroperasi.` : "Memuat data operasional..."}
                </p>
                {!isAnyBusTracking ? (
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400 sm:mt-1">
                    Posisi standby: {snapshot.settings?.chargingStationName || "Charging Station"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:mt-4 md:mt-5 md:flex-row md:items-center md:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {snapshot.stops.map((stop) => (
                <button
                  key={stop.id}
                  className={`active:scale-95 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                    stop.id === selectedStop?.id
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  }`}
                  onClick={() => setSelectedStopId(stop.id)}
                  type="button"
                >
                  {stop.faculty}
                </button>
              ))}
            </div>

            <button
              className="active:scale-95 w-full rounded-full border border-blue-700 bg-white px-4 py-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50 sm:px-5 sm:py-3 sm:text-sm md:w-auto"
              onClick={async () => {
                const response = await fetch("/api/public/state", { cache: "no-store" });
                const data = await response.json();
                setSnapshot(data);
                setAutoCenter(true);
              }}
              type="button"
            >
              Refresh Peta
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
