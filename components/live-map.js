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
  busPosition,
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
        <Marker icon={busIcon} position={[busPosition.lat, busPosition.lng]}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">Bilis Sedang Beroperasi</p>
              <p className="text-sm text-slate-500">
                Lat {busPosition.lat.toFixed(5)} | Lng {busPosition.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
        {autoCenter ? <RecenterMap center={[busPosition.lat, busPosition.lng]} /> : null}
      </MapContainer>
    </div>
  );
}
