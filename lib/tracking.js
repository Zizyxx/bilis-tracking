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

  let closestStopIndex = 0;
  let minDistanceToBus = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const dist = haversineDistance(busLocation, stops[i]);
    if (dist < minDistanceToBus) {
      minDistanceToBus = dist;
      closestStopIndex = i;
    }
  }

  const targetStopIndex = stops.findIndex((s) => s.id === stopLocation.id);
  if (targetStopIndex === -1) {
    const straightDistanceKm = haversineDistance(busLocation, stopLocation);
    const etaMinutes = (straightDistanceKm / AVERAGE_SPEED_KMH) * 60;
    return Math.max(1, Math.round(etaMinutes));
  }

  let totalDistanceKm = minDistanceToBus;
  let currentIndex = closestStopIndex;
  
  while (currentIndex !== targetStopIndex) {
    const nextIndex = (currentIndex + 1) % stops.length;
    totalDistanceKm += haversineDistance(stops[currentIndex], stops[nextIndex]);
    currentIndex = nextIndex;
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
