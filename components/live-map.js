"use client";

import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import { busIcon, stopIcon } from "@/components/map-icons";

function SyncMapSize() {
  const map = useMap();

  useEffect(() => {
    const resize = () => map.invalidateSize();
    resize();
    const timer = window.setTimeout(resize, 150);
    window.addEventListener("resize", resize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [map]);

  return null;
}

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, map.getZoom(), {
      animate: true,
      duration: 1.2
    });
  }, [center, map]);

  return null;
}

export function LiveMap({
  center,
  buses = [],
  stops,
  route,
  selectedStopId,
  onSelectStop,
  autoCenter = false,
  className = ""
}) {
  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={16}
        minZoom={15}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
      >
        <SyncMapSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={route.map((point) => [point.lat, point.lng])}
          pathOptions={{ color: "#1457d5", weight: 4, opacity: 0.65, dashArray: "10 12" }}
        />
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            icon={stopIcon}
            position={[stop.lat, stop.lng]}
            eventHandlers={{
              click: () => onSelectStop?.(stop.id)
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{stop.name}</p>
                <p className="text-sm text-slate-500">Kondisi antrean: {stop.queue}</p>
                {selectedStopId === stop.id ? (
                  <p className="text-xs font-semibold text-blue-700">Sedang dipantau</p>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
        {buses.filter((bus) => bus.isTracking).map((bus, _, activeBuses) => {
          const samePosBuses = activeBuses.filter(b => b.lat === bus.lat && b.lng === bus.lng);
          const samePosCount = samePosBuses.length;
          const samePosIndex = samePosBuses.findIndex(b => b.number === bus.number);
          
          let latOffset = 0;
          let lngOffset = 0;
          if (samePosCount > 1) {
            const angle = (samePosIndex / samePosCount) * Math.PI * 2;
            const offsetMeters = 0.00015;
            latOffset = Math.sin(angle) * offsetMeters;
            lngOffset = Math.cos(angle) * offsetMeters;
          }

          return (
            <Marker key={bus.number} icon={busIcon} position={[bus.lat + latOffset, bus.lng + lngOffset]}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">Bilis #{bus.number}</p>
                  <p className="text-sm text-slate-500">
                    Lat {bus.lat.toFixed(5)} | Lng {bus.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {autoCenter && buses.some((b) => b.isTracking) ? (
          <RecenterMap center={[buses.find((b) => b.isTracking).lat, buses.find((b) => b.isTracking).lng]} />
        ) : null}
      </MapContainer>
    </div>
  );
}
