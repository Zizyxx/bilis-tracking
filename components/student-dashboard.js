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
    bus: {
      number: "01",
      lat: campusCenter[0],
      lng: campusCenter[1],
      updatedAt: null,
      isTracking: false,
      statusText: "Memuat data operasional...",
      stationName: "Bilis Charging Station"
    },
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
  const closest = useMemo(
    () => getClosestStop(snapshot.bus, snapshot.stops),
    [snapshot.bus, snapshot.stops]
  );
  const selectedEta = selectedStop ? getEtaForStop(snapshot.etas, selectedStop.id) : 0;
  const lastUpdateAgeSeconds = snapshot.bus.updatedAt
    ? Math.floor((Date.now() - new Date(snapshot.bus.updatedAt).getTime()) / 1000)
    : Number.POSITIVE_INFINITY;
  const isGpsOffline = lastUpdateAgeSeconds > snapshot.status.gpsTimeoutSeconds;

  return (
    <main className="student-map relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <LiveMap
          autoCenter={autoCenter}
          busPosition={snapshot.bus}
          center={campusCenter}
          className="h-full w-full"
          onSelectStop={setSelectedStopId}
          route={snapshot.route}
          selectedStopId={selectedStop?.id}
          stops={snapshot.stops}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 sm:p-4 md:p-6">
        <div className="glass-panel fade-up pointer-events-auto mx-auto flex max-w-5xl flex-col gap-3 rounded-[24px] px-4 py-4 text-slate-900 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-4 md:rounded-[28px]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Live Tracking Bilis UIN Jakarta
            </p>
            <h1 className="text-base font-semibold leading-tight sm:text-lg md:text-2xl">
              Pantau posisi bus dan ETA halte tanpa refresh
            </h1>
          </div>
          <div className="flex max-w-full items-center gap-3 self-start rounded-2xl bg-blue-50 px-3 py-2 sm:px-4 md:self-auto md:rounded-full">
            <div
              className={`pulse-dot h-3 w-3 rounded-full ${
                snapshot.bus.isTracking && isConnected && !isGpsOffline ? "bg-green-500" : "bg-slate-300"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                {!snapshot.bus.isTracking
                  ? "Bilis sedang tidak beroperasi"
                  : isGpsOffline
                  ? "Menunggu Sinyal GPS"
                  : isConnected
                  ? "Sinkronisasi Aktif"
                  : "Menyambung Ulang"}
              </p>
              <p className="truncate text-xs text-slate-500">
                Update terakhir {formatUpdatedAt(snapshot.bus.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        className="glass-panel active:scale-95 absolute bottom-[16.5rem] right-3 z-[500] flex h-12 w-12 items-center justify-center rounded-full text-xl text-blue-700 transition hover:bg-white sm:bottom-[17.5rem] sm:right-4 sm:h-14 sm:w-14 sm:text-2xl md:bottom-[14rem] md:right-6"
        onClick={() => setAutoCenter((current) => !current)}
        type="button"
      >
        +
      </button>

      <section className="absolute inset-x-0 bottom-0 z-[500] p-3 sm:p-4 md:p-6">
        <div className="mesh-card mx-auto max-w-5xl rounded-t-[28px] rounded-b-[20px] p-4 text-slate-900 sm:p-5 md:rounded-t-[32px] md:rounded-b-[24px] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 space-y-2 sm:space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Halte Dipantau
              </p>
              <div>
                <h2 className="text-xl font-semibold leading-tight text-blue-950 sm:text-2xl md:text-3xl">
                  {selectedStop?.name || "Memuat halte"}
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                  Bilis aktif: <span className="font-semibold text-blue-700">#{snapshot.bus.number}</span>.{" "}
                  Status operasional:{" "}
                  <span className="font-semibold text-blue-700">
                    {!snapshot.bus.isTracking && snapshot.status.operationalStatus === "Beroperasi"
                      ? "Tidak Beroperasi"
                      : snapshot.status.operationalStatus}
                  </span>. Halte
                  terdekat saat ini{" "}
                  <span className="font-semibold text-blue-700">{closest?.stop?.name || "-"}</span>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[auto,1fr] items-end gap-x-3 self-start md:min-w-[220px] md:self-auto">
              <span className="text-5xl font-semibold leading-none text-blue-700 sm:text-6xl md:text-7xl">
                {selectedEta || "--"}
              </span>
              <div className="pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-600 sm:text-sm">
                  Menit Lagi
                </p>
                <p className="max-w-[180px] text-xs leading-5 text-slate-500 sm:max-w-[240px] sm:text-sm">
                  {snapshot.bus.statusText}
                </p>
                {!snapshot.bus.isTracking ? (
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Posisi standby: {snapshot.bus.stationName}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:mt-5 md:flex-row md:items-center md:justify-between">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
              {snapshot.stops.map((stop) => (
                <button
                  key={stop.id}
                  className={`active:scale-95 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
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
              className="active:scale-95 w-full rounded-full border border-blue-700 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 md:w-auto"
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
