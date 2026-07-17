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
const LEGACY_STOP_IDS = new Set(["fst", "fdk", "fikom", "feb", "syarif", "fitk"]);


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
  const settings = {
    ...store.settings,
    totalBuses: clampTotalBuses(store.settings?.totalBuses ?? 6),
    chargingStationName: store.settings?.chargingStationName || chargingStationName
  };
  const fleetOptions = getFleetOptions(settings.totalBuses);

  let buses = Array.isArray(store.buses) ? store.buses : [];
  if (buses.length === 0 && store.bus) {
    buses = [store.bus]; // Migrate old data
  }

  // Ensure all fleet options have a bus object
  buses = fleetOptions.map((number) => {
    const existing = buses.find((b) => b.number === number);
    const isTracking = existing?.isTracking ?? false;

    return {
      number,
      lat: isTracking ? Number(existing?.lat ?? defaultBusPoint.lat) : defaultBusPoint.lat,
      lng: isTracking ? Number(existing?.lng ?? defaultBusPoint.lng) : defaultBusPoint.lng,
      updatedAt: existing?.updatedAt || new Date().toISOString(),
      isTracking,
      driverId: existing?.driverId || null,
      stationName: existing?.stationName || settings.chargingStationName,
      statusText: existing?.statusText || `Bus berada di ${settings.chargingStationName}.`
    };
  });

  const { bus, ...restStore } = store;

  return {
    ...restStore,
    settings,
    stops,
    route,
    buses
  };
}

function shouldReplaceLegacyStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return true;
  }

  // Force update if "fitk" or the bad "fdi" id is present in the database's stops
  if (stops.some((stop) => stop.id === "fitk" || stop.id === "fdi")) {
    return true;
  }

  return stops.every((stop) => LEGACY_STOP_IDS.has(stop.id));
}

function buildSeedState() {
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const driverPasswordHash = bcrypt.hashSync("driver123", 10);
  const route = deriveRouteFromStops(seedStops);

  const fleetOptions = getFleetOptions(6);
  const buses = fleetOptions.map((number) => ({
    number,
    lat: busDefaultPosition.lat,
    lng: busDefaultPosition.lng,
    updatedAt: new Date().toISOString(),
    isTracking: false,
    driverId: null,
    stationName: chargingStationName,
    statusText: `Bilis ${number} berada di ${chargingStationName}.`
  }));

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
    buses,
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
  const activeBuses = store.buses.filter((b) => b.isTracking);

  const etas = store.stops.map((stop) => {
    if (activeBuses.length === 0) {
      return { stopId: stop.id, etaMinutes: null };
    }
    const minEta = Math.min(...activeBuses.map((bus) => calculateEtaMinutes(bus, stop, store.stops)));
    return { stopId: stop.id, etaMinutes: minEta };
  });

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
    buses: store.buses,
    stops: store.stops,
    etas
  };
}

export async function getPublicState() {
  const store = await readStore();
  return buildTrackingSnapshot(store);
}
