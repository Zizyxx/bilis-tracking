import bcrypt from "bcryptjs";
import {
  busDefaultPosition,
  busRoute,
  chargingStationName,
  scheduleRules,
  stops as seedStops,
  drivers as seedDrivers
} from "./mock-data.js";
import { calculateEtaMinutes } from "./tracking.js";
import { getDatabase } from "./mongodb.mjs";

const COLLECTION_NAME = "app_state";
const DOCUMENT_KEY = "singleton";
const LEGACY_STOP_IDS = new Set(["fst", "fdk", "fikom", "feb", "syarif"]);

function clampTotalBuses(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 6;
  }

  return Math.min(20, Math.max(1, Math.round(numeric)));
}

export function getFleetOptions(totalBuses) {
  return Array.from({ length: clampTotalBuses(totalBuses) }, (_, index) =>
    String(index + 1).padStart(2, "0")
  );
}

function getCollection() {
  return getDatabase().then((database) => database.collection(COLLECTION_NAME));
}

export function deriveRouteFromStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return busRoute;
  }

  const route = stops.map((stop) => ({
    lat: Number(stop.lat),
    lng: Number(stop.lng)
  }));

  if (route.length > 2) {
    route.push({ ...route[0] });
  }

  return route;
}

function normalizeStore(store) {
  const stops = shouldReplaceLegacyStops(store.stops) ? seedStops : store.stops;
  const route = deriveRouteFromStops(stops);
  const defaultBusPoint = busDefaultPosition;
  const shouldResetToDefault = !store.bus?.isTracking;
  const settings = {
    ...store.settings,
    totalBuses: clampTotalBuses(store.settings?.totalBuses ?? 6),
    chargingStationName: store.settings?.chargingStationName || chargingStationName
  };
  const fleetOptions = getFleetOptions(settings.totalBuses);
  const busNumber = fleetOptions.includes(store.bus?.number) ? store.bus.number : fleetOptions[0];

  return {
    ...store,
    settings,
    stops,
    route,
    bus: {
      ...store.bus,
      number: busNumber,
      lat: shouldResetToDefault ? defaultBusPoint.lat : Number(store.bus?.lat ?? defaultBusPoint.lat),
      lng: shouldResetToDefault ? defaultBusPoint.lng : Number(store.bus?.lng ?? defaultBusPoint.lng),
      stationName: store.bus?.stationName || settings.chargingStationName,
      statusText:
        store.bus?.statusText ||
        `Bus berada di ${settings.chargingStationName}.`
    }
  };
}

function shouldReplaceLegacyStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return true;
  }

  return stops.every((stop) => LEGACY_STOP_IDS.has(stop.id));
}

function buildSeedState() {
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const driverPasswordHash = bcrypt.hashSync("driver123", 10);
  const route = deriveRouteFromStops(seedStops);

  return {
    key: DOCUMENT_KEY,
    initialized: true,
    settings: {
      averageSpeedKmh: 15,
      broadcastEnabled: true,
      gpsTimeoutSeconds: 15,
      operationalStatus: "Beroperasi",
      totalBuses: 6,
      chargingStationName
    },
    bus: {
      number: "01",
      lat: busDefaultPosition.lat,
      lng: busDefaultPosition.lng,
      updatedAt: new Date().toISOString(),
      isTracking: false,
      driverId: seedDrivers[0].id,
      routeIndex: 0,
      stationName: chargingStationName,
      statusText: `Bus berada di ${chargingStationName}.`
    },
    route,
    stops: seedStops,
    schedules: scheduleRules,
    drivers: seedDrivers.map((driver, index) => ({
      ...driver,
      username: `driver${index + 1}`,
      passwordHash: driverPasswordHash
    })),
    admins: [
      {
        id: "ADM-01",
        role: "admin",
        name: "Admin Bilis",
        email: "admin@uinjkt.ac.id",
        username: "admin",
        passwordHash: adminPasswordHash
      }
    ]
  };
}

function stripInternalFields(document) {
  if (!document) {
    return null;
  }

  const { _id, ...rest } = document;
  return rest;
}

async function ensureStore() {
  const collection = await getCollection();
  const existing = stripInternalFields(await collection.findOne({ key: DOCUMENT_KEY }));

  if (existing?.initialized) {
    const normalized = normalizeStore(existing);
    await collection.updateOne(
      { key: DOCUMENT_KEY },
      { $set: normalized },
      { upsert: true }
    );
    return normalized;
  }

  const seed = buildSeedState();
  await collection.updateOne(
    { key: DOCUMENT_KEY },
    { $set: seed },
    { upsert: true }
  );

  return seed;
}

export async function readStore() {
  return ensureStore();
}

export async function writeStore(nextState) {
  const collection = await getCollection();
  const normalized = normalizeStore(nextState);

  await collection.updateOne(
    { key: DOCUMENT_KEY },
    { $set: normalized },
    { upsert: true }
  );

  return normalized;
}

export async function updateStore(updater) {
  const current = await readStore();
  const nextState = await updater(current);
  return writeStore(nextState);
}

export function sanitizeUser(user) {
  const sanitized = {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email
  };

  if (user.username) {
    sanitized.username = user.username;
  }
  if (user.status) {
    sanitized.status = user.status;
  }

  return sanitized;
}

export function buildTrackingSnapshot(store) {
  const bus = {
    number: store.bus.number,
    lat: store.bus.lat,
    lng: store.bus.lng,
    updatedAt: store.bus.updatedAt,
    isTracking: store.bus.isTracking,
    statusText: store.bus.statusText,
    stationName: store.bus.stationName
  };

  const etas = store.stops.map((stop) => ({
    stopId: stop.id,
    etaMinutes: store.bus.isTracking ? calculateEtaMinutes(bus, stop) : null
  }));

  return {
    settings: store.settings,
    status: {
      operationalStatus: store.settings.operationalStatus,
      broadcastEnabled: store.settings.broadcastEnabled,
      gpsTimeoutSeconds: store.settings.gpsTimeoutSeconds,
      totalBuses: store.settings.totalBuses
    },
    fleetOptions: getFleetOptions(store.settings.totalBuses),
    route: store.route,
    bus,
    stops: store.stops,
    etas
  };
}

export async function getPublicState() {
  const store = await readStore();
  return buildTrackingSnapshot(store);
}
