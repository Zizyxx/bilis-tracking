const EARTH_RADIUS_KM = 6371;
const AVERAGE_SPEED_KMH = 8;
const ROUTE_WINDING_FACTOR = 1.5;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistance(pointA, pointB) {
  const latDelta = toRadians(pointB.lat - pointA.lat);
  const lngDelta = toRadians(pointB.lng - pointA.lng);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const angle =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
}

export function calculateEtaMinutes(busLocation, stopLocation, stops) {
  if (!stops || stops.length === 0) {
    const straightDistanceKm = haversineDistance(busLocation, stopLocation);
    const etaMinutes = (straightDistanceKm / AVERAGE_SPEED_KMH) * 60;
    return Math.max(1, Math.round(etaMinutes));
  }

  const targetStopIndex = stops.findIndex((s) => s.id === stopLocation.id);
  if (targetStopIndex === -1) {
    const straightDistanceKm = haversineDistance(busLocation, stopLocation);
    const etaMinutes = (straightDistanceKm / AVERAGE_SPEED_KMH) * 60;
    return Math.max(1, Math.round(etaMinutes));
  }

  let minSegmentDist = Infinity;
  let nextStopIndex = 0;
  let distToNext = 0;

  for (let i = 0; i < stops.length; i++) {
    const j = (i + 1) % stops.length;
    const v = stops[i];
    const w = stops[j];
    const p = busLocation;

    const l2 = (v.lat - w.lat) ** 2 + (v.lng - w.lng) ** 2;
    let t = 0;
    if (l2 > 0) {
      t = ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / l2;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = v.lat + t * (w.lat - v.lat);
    const projLng = v.lng + t * (w.lng - v.lng);

    const distSq = (p.lat - projLat) ** 2 + (p.lng - projLng) ** 2;

    if (distSq < minSegmentDist) {
      minSegmentDist = distSq;
      nextStopIndex = j;
      distToNext = haversineDistance(busLocation, stops[j]);
    }
  }

  let totalDistanceKm = distToNext;
  let currentIndex = nextStopIndex;
  
  while (currentIndex !== targetStopIndex) {
    const nextIdx = (currentIndex + 1) % stops.length;
    totalDistanceKm += haversineDistance(stops[currentIndex], stops[nextIdx]);
    currentIndex = nextIdx;
  }

  const etaMinutes = (totalDistanceKm / AVERAGE_SPEED_KMH) * 60;
  return Math.max(1, Math.round(etaMinutes));
}

export function getClosestStop(busLocation, stops) {
  return stops.reduce((closest, stop) => {
    const distance = haversineDistance(busLocation, stop);
    if (!closest || distance < closest.distance) {
      return { stop, distance };
    }

    return closest;
  }, null);
}
