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
import { EventEmitter } from "events";

const globalForEvents = globalThis;
if (!globalForEvents.__appEventEmitter) {
  globalForEvents.__appEventEmitter = new EventEmitter();
  globalForEvents.__appEventEmitter.setMaxListeners(100);
}
export const appEventEmitter = globalForEvents.__appEventEmitter;

const LEGACY_STOP_IDS = new Set(["fst", "fdk", "fikom", "feb", "syarif", "fitk"]);


export function deriveRouteFromStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return busRoute;
  const route = stops.map((stop) => ({ lat: Number(stop.lat), lng: Number(stop.lng) }));
  if (route.length > 2) route.push({ ...route[0] });
  return route;
}

function shouldReplaceLegacyStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return true;
  if (stops.some((stop) => stop.id === "fitk" || stop.id === "fdi")) return true;
  return stops.every((stop) => LEGACY_STOP_IDS.has(stop.id));
}

// -------------------------------------------------------------
// DAO / REPOSITORY LOGIC (ERD)
// -------------------------------------------------------------

async function getCol(name) {
  const db = await getDatabase();
  return db.collection(name);
}

// Ensure the 4 ERD collections have initial seed data if empty
async function ensureSeed() {
  const systemSettingsCol = await getCol("system_settings");
  const accountsCol = await getCol("accounts");
  const busStopsCol = await getCol("bus_stops");
  const busesCol = await getCol("buses");

  const adminAccount = await accountsCol.findOne({ role: "ADMIN" });
  if (adminAccount) {
    // Check if buses collection is empty (e.g. migrating from old version)
    const busesCount = await busesCol.countDocuments();
    if (busesCount === 0) {
      const fleetOptions = getFleetOptions(6);
      const busesDocs = fleetOptions.map(number => ({
        id: `BUS-${number}`,
        number: number,
        plate: `B 100${number} XYZ`,
        status: "Aktif"
      }));
      await busesCol.insertMany(busesDocs);
    }
    
    // Check if drivers are empty (e.g. migrating from old version)
    const driversCount = await accountsCol.countDocuments({ role: "DRIVER" });
    if (driversCount === 0) {
      const driverPasswordHash = bcrypt.hashSync("driver123", 10);
      await accountsCol.insertMany([
        {
          account_id: "DRV-01",
          username: "sopir_01",
          password_hash: driverPasswordHash,
          role: "DRIVER",
          nama: "Ahmad Fauzi",
          email: "ahmad.fauzi@uinjkt.ac.id",
          status_akun: "ACTIVE",
          data_shift: ""
        },
        {
          account_id: "DRV-02",
          username: "sopir_02",
          password_hash: driverPasswordHash,
          role: "DRIVER",
          nama: "Rizky Hidayat",
          email: "rizky.hidayat@uinjkt.ac.id",
          status_akun: "INACTIVE",
          data_shift: ""
        }
      ]);
    }
    return; // Already seeded
  }

  console.log("Seeding ERD database...");
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const driverPasswordHash = bcrypt.hashSync("driver123", 10);

  // Seed System Settings
  await systemSettingsCol.insertOne({
    setting_id: "DEFAULT_SETTING",
    batas_maksimal_armada: 6,
    waktu_update: new Date(),
    updated_by_account_id: "ADM-01",
    // Preserve old fields in this collection
    averageSpeedKmh: 15,
    broadcastEnabled: true,
    gpsTimeoutSeconds: 15,
    operationalStatus: "Beroperasi",
    chargingStationName: chargingStationName
  });

  // Seed Accounts
  const adminDoc = {
    account_id: "ADM-01",
    username: "admin",
    password_hash: adminPasswordHash,
    role: "ADMIN",
    nama: "Admin Bilis",
    email: "admin@uinjkt.ac.id",
    status_akun: "ACTIVE",
    data_shift: ""
  };

  const driverDocs = seedDrivers.map((driver, idx) => ({
    account_id: driver.id,
    username: `driver${idx + 1}`,
    password_hash: driverPasswordHash,
    role: "DRIVER",
    nama: driver.name,
    email: driver.email,
    status_akun: "ACTIVE",
    data_shift: ""
  }));

  await accountsCol.insertMany([adminDoc, ...driverDocs]);

  // Seed Bus Stops
  const stopsDocs = seedStops.map(stop => ({
    Halte_id: stop.id,
    nama_halte: stop.name,
    faculty: stop.faculty,
    latitude: stop.lat,
    longitude: stop.lng,
    status_halte: "ACTIVE",
    updated_by_account_id: "ADM-01"
  }));
  await busStopsCol.insertMany(stopsDocs);

  // Seed Buses
  const fleetOptions = getFleetOptions(6);
  const busesDocs = fleetOptions.map(number => ({
    id: `BUS-${number}`,
    number: number,
    plate: `B 100${number} XYZ`,
    status: "Aktif"
  }));
  await busesCol.insertMany(busesDocs);
}

// Read entire state from 4 collections into old Next.js format
async function getFullStateFromDB() {
  await ensureSeed();

  const systemSettingsCol = await getCol("system_settings");
  const accountsCol = await getCol("accounts");
  const busStopsCol = await getCol("bus_stops");
  const trackingLogsCol = await getCol("tracking_logs");
  const busesCol = await getCol("buses");

  const settingsDoc = await systemSettingsCol.findOne({ setting_id: "DEFAULT_SETTING" }) || {};
  
  const stopsDocs = await busStopsCol.find({}).toArray();
  let stops = stopsDocs.map(doc => ({
    id: doc.Halte_id,
    name: doc.nama_halte,
    faculty: doc.faculty || doc.nama_halte,
    lat: doc.latitude,
    lng: doc.longitude
  }));

  if (shouldReplaceLegacyStops(stops)) {
      stops = seedStops;
  }

  const allAccounts = await accountsCol.find({}).toArray();
  const drivers = allAccounts
    .filter(acc => acc.role === "DRIVER")
    .map(acc => ({
      id: acc.account_id,
      name: acc.nama,
      email: acc.email,
      username: acc.username,
      passwordHash: acc.password_hash,
      status: acc.status_akun === "ACTIVE" ? "Aktif" : "Non-Aktif"
    }));

  const admins = allAccounts
    .filter(acc => acc.role === "ADMIN")
    .map(acc => ({
      id: acc.account_id,
      name: acc.nama,
      email: acc.email,
      username: acc.username,
      passwordHash: acc.password_hash,
      role: "admin" // UI expects lowercase
    }));

  const settings = {
    averageSpeedKmh: settingsDoc.averageSpeedKmh ?? 15,
    broadcastEnabled: settingsDoc.broadcastEnabled ?? true,
    gpsTimeoutSeconds: settingsDoc.gpsTimeoutSeconds ?? 15,
    operationalStatus: settingsDoc.operationalStatus ?? "Beroperasi",
    totalBuses: settingsDoc.batas_maksimal_armada ?? 6, // Kept for legacy support
    chargingStationName: settingsDoc.chargingStationName ?? chargingStationName
  };

  const route = deriveRouteFromStops(stops);
  
  // Find ACTIVE tracking sessions
  const activeTrackings = await trackingLogsCol.find({ status_tracking: "ACTIVE" }).toArray();
  
  const busesDocs = await busesCol.find({}).sort({ number: 1 }).toArray();
  const fleetOptions = busesDocs.filter(b => b.status === "Aktif").map(b => b.number);
  
  const buses = busesDocs.map((busDoc) => {
    const number = busDoc.number;
    const bilisName = `BR${number}`;
    const activeLog = activeTrackings.find(log => log.nomor_bilis === bilisName);

    const isTracking = !!activeLog;
    return {
      id: busDoc.id,
      number,
      plate: busDoc.plate,
      status: busDoc.status,
      lat: isTracking ? activeLog.latitude : busDefaultPosition.lat,
      lng: isTracking ? activeLog.longitude : busDefaultPosition.lng,
      updatedAt: isTracking ? (activeLog.waktu_update?.toISOString() || new Date().toISOString()) : new Date().toISOString(),
      isTracking,
      driverId: isTracking ? activeLog.account_id : null,
      stationName: settings.chargingStationName,
      statusText: isTracking ? `Bilis ${number} sedang dalam perjalanan.` : `Bilis ${number} terparkir di ${settings.chargingStationName}.`
    };
  });

  return {
    settings,
    stops,
    route,
    buses,
    schedules: scheduleRules, // static data
    drivers,
    admins
  };
}

// Compute diffs and persist to the 4 ERD collections
async function saveDiffToDB(current, next) {
  const systemSettingsCol = await getCol("system_settings");
  const accountsCol = await getCol("accounts");
  const busStopsCol = await getCol("bus_stops");
  const trackingLogsCol = await getCol("tracking_logs");

  // 1. Diffs for system settings
  if (JSON.stringify(current.settings) !== JSON.stringify(next.settings)) {
    await systemSettingsCol.updateOne(
      { setting_id: "DEFAULT_SETTING" },
      {
        $set: {
          batas_maksimal_armada: next.settings.totalBuses,
          waktu_update: new Date(),
          averageSpeedKmh: next.settings.averageSpeedKmh,
          broadcastEnabled: next.settings.broadcastEnabled,
          gpsTimeoutSeconds: next.settings.gpsTimeoutSeconds,
          operationalStatus: next.settings.operationalStatus,
          chargingStationName: next.settings.chargingStationName
        }
      },
      { upsert: true }
    );
  }

  // 2. Diffs for stops
  if (JSON.stringify(current.stops) !== JSON.stringify(next.stops)) {
    await busStopsCol.deleteMany({});
    const stopsDocs = next.stops.map(stop => ({
      Halte_id: stop.id,
      nama_halte: stop.name,
      faculty: stop.faculty || stop.name,
      latitude: stop.lat,
      longitude: stop.lng,
      status_halte: "ACTIVE",
      updated_by_account_id: "ADM-01"
    }));
    if (stopsDocs.length > 0) {
      await busStopsCol.insertMany(stopsDocs);
    }
  }

  // 3. Diffs for Drivers
  for (const driver of next.drivers) {
    await accountsCol.updateOne(
      { account_id: driver.id },
      {
        $set: {
          username: driver.username,
          password_hash: driver.passwordHash,
          role: "DRIVER",
          nama: driver.name,
          email: driver.email,
          status_akun: driver.status === "Aktif" ? "ACTIVE" : "INACTIVE",
          data_shift: ""
        }
      },
      { upsert: true }
    );
  }
  
  const nextDriverIds = next.drivers.map(d => d.id);
  await accountsCol.deleteMany({ role: "DRIVER", account_id: { $nin: nextDriverIds } });

  // 4. Diffs for buses -> Tracking Logs
  for (const nextBus of next.buses) {
    const currentBus = current.buses.find(b => b.number === nextBus.number);
    const bilisName = `BR${nextBus.number}`;

    const wasTracking = currentBus?.isTracking || false;
    const isTracking = nextBus.isTracking;

    if (!wasTracking && isTracking) {
      // START TRACKING -> insert new ACTIVE log
      await trackingLogsCol.insertOne({
        tracking_id: globalThis.crypto.randomUUID(),
        account_id: nextBus.driverId,
        halte_tujuan_id: null,
        setting_id: "DEFAULT_SETTING",
        nomor_bilis: bilisName,
        latitude: nextBus.lat,
        longitude: nextBus.lng,
        status_tracking: "ACTIVE",
        waktu_mulai: new Date(),
        waktu_update: new Date(),
        waktu_selesai: null
      });
    } else if (wasTracking && isTracking) {
      // CONTINUING TRACKING -> update ACTIVE log locations
      await trackingLogsCol.updateOne(
        { nomor_bilis: bilisName, status_tracking: "ACTIVE" },
        {
          $set: {
            latitude: nextBus.lat,
            longitude: nextBus.lng,
            waktu_update: new Date()
          }
        }
      );
    } else if (wasTracking && !isTracking) {
      // STOP TRACKING -> mark log as INACTIVE
      await trackingLogsCol.updateMany(
        { nomor_bilis: bilisName, status_tracking: "ACTIVE" },
        {
          $set: {
            status_tracking: "INACTIVE",
            waktu_selesai: new Date()
          }
        }
      );
    }
  }
}

export async function readStore() {
  return getFullStateFromDB();
}

export async function writeStore(nextState) {
  const current = await getFullStateFromDB();
  
  // Re-normalize NextState to make sure properties exist
  const settings = {
    ...nextState.settings,
    totalBuses: nextState.settings?.totalBuses ?? 6
  };
  let buses = Array.isArray(nextState.buses) ? nextState.buses : current.buses;
  
  buses = buses.map((nextBus) => {
    const existing = current.buses.find((b) => b.number === nextBus.number);
    const isTracking = nextBus.isTracking ?? existing?.isTracking ?? false;
    
    return {
      id: nextBus.id || existing?.id,
      number: nextBus.number,
      plate: nextBus.plate || existing?.plate,
      status: nextBus.status || existing?.status,
      lat: nextBus.lat ?? existing?.lat ?? busDefaultPosition.lat,
      lng: nextBus.lng ?? existing?.lng ?? busDefaultPosition.lng,
      updatedAt: nextBus.updatedAt ?? existing?.updatedAt ?? new Date().toISOString(),
      isTracking,
      driverId: nextBus.driverId !== undefined ? nextBus.driverId : (existing?.driverId || null),
      stationName: nextBus.stationName ?? existing?.stationName ?? settings.chargingStationName,
      statusText: nextBus.statusText ?? existing?.statusText ?? (isTracking ? `Bilis ${nextBus.number} sedang dalam perjalanan.` : `Bilis ${nextBus.number} terparkir di ${settings.chargingStationName}.`)
    };
  });
  
  nextState.settings = settings;
  nextState.buses = buses;
  nextState.route = deriveRouteFromStops(nextState.stops);

  await saveDiffToDB(current, nextState);
  
  appEventEmitter.emit('stateUpdate', buildTrackingSnapshot(nextState));
  return nextState;
}

export async function updateStore(updater) {
  const current = await getFullStateFromDB();
  const nextState = await updater(current);
  return writeStore(nextState);
}

export function sanitizeUser(user) {
  const sanitized = { id: user.id, role: user.role, name: user.name, email: user.email };
  if (user.username) sanitized.username = user.username;
  if (user.status) sanitized.status = user.status;
  return sanitized;
}

export function buildTrackingSnapshot(store) {
  const activeBuses = store.buses.filter((b) => b.isTracking);

  const etas = store.stops.map((stop) => {
    if (activeBuses.length === 0) {
      return { stopId: stop.id, etaMinutes: null, nearestBus: null };
    }
    let minEta = Infinity;
    let nearestBus = null;
    for (const bus of activeBuses) {
      const eta = calculateEtaMinutes(bus, stop, store.stops);
      if (eta < minEta) {
        minEta = eta;
        nearestBus = bus.number;
      }
    }
    return { stopId: stop.id, etaMinutes: minEta, nearestBus };
  });

  return {
    settings: store.settings,
    status: {
      operationalStatus: store.settings.operationalStatus,
      broadcastEnabled: store.settings.broadcastEnabled,
      gpsTimeoutSeconds: store.settings.gpsTimeoutSeconds,
      totalBuses: store.settings.totalBuses
    },
    fleetOptions: store.buses.filter(b => b.status === 'Aktif').map(b => b.number),
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
