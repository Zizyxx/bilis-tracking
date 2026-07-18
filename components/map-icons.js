import L from "leaflet";

export const busIcon = L.divIcon({
  className: "",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:999px;background:linear-gradient(145deg,#1457d5,#0f2f73);box-shadow:0 12px 24px rgba(20,87,213,.28);border:3px solid rgba(255,255,255,.85);">
      <span style="font-size:22px;line-height:1;">🚌</span>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23]
});

export const stopIcon = L.divIcon({
  className: "",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:#ffffff;border:2px solid #1457d5;box-shadow:0 8px 20px rgba(15,23,42,.12);">
      <div style="width:10px;height:10px;border-radius:999px;background:#1457d5;"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

export const chargingStationIcon = L.divIcon({
  className: "",
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:linear-gradient(145deg,#22c55e,#166534);box-shadow:0 8px 20px rgba(34,197,94,.25);border:2px solid rgba(255,255,255,.9);">
      <span style="font-size:20px;line-height:1;">⚡</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

