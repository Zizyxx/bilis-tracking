# Bilis Tracking — Pseudocode Overview

A Next.js web application for live electric bus tracking at UIN Jakarta.
Three user roles: **Student** (public), **Driver**, and **Admin**.

---

## 1. Application Entry & Layout

```
PROGRAM BilisTracking

  ON app start:
    load global stylesheet and Leaflet map stylesheet
    set page metadata (title, description)
    render root HTML layout
      render StudentDashboard as the home page
```

---

## 2. Database Connection (`lib/mongodb.mjs`)

```
FUNCTION getDatabase():
  IF MONGO_URI environment variable is not set THEN
    THROW error "MONGO_URI not configured"

  IF a global MongoDB client promise does not exist THEN
    create new MongoClient(MONGO_URI)
    connect and store the promise globally

  client = AWAIT global client promise
  database = client.db()

  IF database has a valid name THEN
    RETURN database
  ELSE
    RETURN client.db("bilis-tracking")
```

---

## 3. Authentication (`lib/auth.mjs`)

```
CONSTANT JWT_SECRET = env.JWT_SECRET OR "bilis-tracking-dev-secret"
CONSTANT COOKIE_NAME = "bilis_token"

FUNCTION signToken(user):
  RETURN jwt.sign({ id, role, name, email }, JWT_SECRET, expiresIn: 7 days)

FUNCTION verifyToken(token):
  TRY
    RETURN jwt.verify(token, JWT_SECRET)
  CATCH
    RETURN null

FUNCTION getCookieName():
  RETURN COOKIE_NAME
```

---

## 4. State Store (`lib/store.mjs`)

The entire app state lives in a single MongoDB document ("singleton").

### 4a. Reading & Initialising State

```
FUNCTION readStore():
  CALL ensureStore()

FUNCTION ensureStore():
  collection = getCollection("app_state")
  existing = collection.findOne({ key: "singleton" })

  IF existing is initialised THEN
    normalised = normalizeStore(existing)
    collection.updateOne(singleton, normalised)       // keep data clean
    RETURN normalised
  ELSE
    seed = buildSeedState()                           // first-time setup
    collection.updateOne(singleton, seed, upsert)
    RETURN seed
```

### 4b. Seeding Initial State

```
FUNCTION buildSeedState():
  hash admin password "admin123" with bcrypt
  hash driver password "driver123" with bcrypt
  derive route coordinates from seed stops

  RETURN {
    settings: { speed: 15 km/h, totalBuses: 6, operationalStatus: "Beroperasi", ... }
    bus: { number: "01", lat, lng, isTracking: false, ... }
    route: [array of lat/lng waypoints]
    stops: [seed stops]
    drivers: [seed drivers with hashed passwords]
    admins: [{ id: "ADM-01", username: "admin", passwordHash }]
  }
```

### 4c. Normalising State

```
FUNCTION normalizeStore(store):
  IF stops are legacy IDs THEN replace with seed stops
  route = deriveRouteFromStops(stops)      // rebuild route from stop coordinates
  clamp totalBuses between 1 and 20
  ensure busNumber is a valid fleet option
  reset bus position to default if not currently tracking

  RETURN sanitised store object
```

### 4d. Writing State

```
FUNCTION writeStore(nextState):
  normalised = normalizeStore(nextState)
  collection.updateOne(singleton, normalised, upsert)
  RETURN normalised

FUNCTION updateStore(updaterFunction):
  current = readStore()
  next = updaterFunction(current)
  RETURN writeStore(next)
```

### 4e. Public Snapshot (for Students)

```
FUNCTION buildTrackingSnapshot(store):
  FOR each stop in store.stops:
    etaMinutes = calculateEtaMinutes(busLocation, stopLocation)

  RETURN {
    settings, status flags, fleetOptions,
    route, bus position & status,
    stops with coordinates,
    etas: [{ stopId, etaMinutes }]
  }

FUNCTION getPublicState():
  store = readStore()
  RETURN buildTrackingSnapshot(store)
```

---

## 5. Tracking Calculations (`lib/tracking.js`)

```
CONSTANT EARTH_RADIUS = 6371 km
CONSTANT AVERAGE_SPEED = 15 km/h

FUNCTION haversineDistance(pointA, pointB):
  convert lat/lng deltas to radians
  apply Haversine formula
  RETURN distance in kilometres

FUNCTION calculateEtaMinutes(busLocation, stopLocation):
  distance = haversineDistance(busLocation, stopLocation)
  eta = (distance / AVERAGE_SPEED) * 60
  RETURN max(1, round(eta))           // minimum 1 minute

FUNCTION getClosestStop(busLocation, stops):
  FOR each stop:
    distance = haversineDistance(busLocation, stop)
  RETURN the stop with the smallest distance
```

---

## 6. API Authentication Helpers (`lib/api-auth.mjs`)

```
FUNCTION findUserByCredentials(role, identifier, password):
  store = readStore()
  collection = store.admins IF role == "admin" ELSE store.drivers
  user = find entry where email OR username == identifier

  IF user not found THEN RETURN null
  IF bcrypt.compare(password, user.passwordHash) fails THEN RETURN null
  RETURN sanitizeUser(user)

FUNCTION getSessionUser():
  token = read "bilis_token" cookie
  payload = verifyToken(token)
  IF payload is null THEN RETURN null
  RETURN { id, role, name, email } from payload

FUNCTION requireRole(role):
  user = getSessionUser()
  IF user is null OR user.role != role THEN
    RETURN 401 "Akses ditolak"
  RETURN user

FUNCTION withSessionCookie(response, user):
  sign JWT for user
  set httpOnly cookie "bilis_token" (expires 7 days)
  RETURN response

FUNCTION clearSessionCookie(response):
  set "bilis_token" cookie with maxAge = 0 (delete it)
  RETURN response
```

---

## 7. API Routes

### 7a. Auth — Login (`POST /api/auth/login`)

```
RECEIVE { role, identifier, password }
IF any field is missing THEN RETURN 400

user = findUserByCredentials(role, identifier, password)
IF user is null THEN RETURN 401 "Login gagal"

RETURN 200 { user } WITH session cookie set
```

### 7b. Auth — Logout (`POST /api/auth/logout`)

```
RETURN 200 { success: true } WITH session cookie cleared
```

### 7c. Auth — Session (`GET /api/auth/session`)

```
user = getSessionUser()
RETURN 200 { user }      // user is null if not logged in
```

### 7d. Public State (`GET /api/public/state`)

```
// No authentication required — accessible by students
state = getPublicState()
RETURN 200 state
```

### 7e. Drivers (`GET /api/drivers`) — Admin only

```
REQUIRE role "admin"
store = readStore()
RETURN 200 { drivers: sanitized list }
```

### 7f. Create Driver (`POST /api/drivers`) — Admin only

```
REQUIRE role "admin"
RECEIVE { name, email, username, password }

hash password with bcrypt
driver = {
  id: "DRV-" + timestamp,
  role: "driver",
  name, email, username,
  status: "Siaga",
  passwordHash
}

updateStore → append driver to drivers list
RETURN 200 { driver, drivers }
```

### 7g. Update Driver (`PUT /api/drivers/[id]`) — Admin only

```
REQUIRE role "admin"
RECEIVE { name, email, username, password }

IF password is provided THEN
  hash password with bcrypt

updateStore → find driver by id, update fields:
  set name, email, username
  IF new password hash exists THEN set passwordHash

RETURN 200 { drivers: sanitized list }
```

### 7h. Delete Driver (`DELETE /api/drivers/[id]`) — Admin only

```
REQUIRE role "admin"

updateStore → filter out driver where id matches params
RETURN 200 { drivers: sanitized list }
```

### 7i. Settings (`GET /api/settings`) — Admin only

```
REQUIRE role "admin"
store = readStore()
RETURN 200 { settings, schedules, fleetOptions }
```

### 7j. Update Settings (`PATCH /api/settings`) — Admin only

```
REQUIRE role "admin"
RECEIVE partial settings payload

updateStore → merge payload into current settings
broadcast "tracking:snapshot" event to connected clients
RETURN 200 { settings }
```

### 7k. Stops (`GET /api/stops`) — Admin only

```
REQUIRE role "admin"
store = readStore()
RETURN 200 { stops }
```

### 7l. Create Stop (`POST /api/stops`) — Admin only

```
REQUIRE role "admin"
RECEIVE { faculty, name, lat, lng, queue }

stop = {
  id: "STOP-" + timestamp,
  faculty, name,
  lat: Number(lat), lng: Number(lng),
  queue: payload.queue OR "Lengang"
}

updateStore → append stop to stops list
RETURN 200 { stop, stops }
```

### 7m. Update Stop (`PUT /api/stops/[id]`) — Admin only

```
REQUIRE role "admin"
RECEIVE { faculty, name, lat, lng, queue }

updateStore → find stop by id, update fields:
  set faculty, name
  set lat = Number(lat), lng = Number(lng)
  set queue = payload.queue OR stop.queue

RETURN 200 { stops }
```

### 7n. Delete Stop (`DELETE /api/stops/[id]`) — Admin only

```
REQUIRE role "admin"

updateStore → filter out stop where id matches params
RETURN 200 { stops }
```

### 7o. Start Tracking (`POST /api/tracking/start`) — Driver only

```
REQUIRE role "driver"
RECEIVE optional { busNumber }

updateStore:
  IF busNumber is a valid fleet option THEN set bus.number = busNumber
  set bus.isTracking = true
  set bus.driverId = auth.id
  set bus.statusText = "Bilis XX sedang mengirim lokasi secara real-time."
  set driver.status = "Aktif"

broadcast "tracking:snapshot" to clients
RETURN 200 { success, snapshot }
```

### 7p. Update Location (`POST /api/tracking/location`) — Driver only

```
REQUIRE role "driver"
RECEIVE { lat, lng, statusText }

updateStore:
  set bus.lat, bus.lng = payload coordinates
  set bus.updatedAt = now
  set bus.isTracking = true
  set bus.driverId = auth.id
  set bus.statusText = payload.statusText OR "Bus sedang bergerak."

broadcast "tracking:update" to clients
RETURN 200 { success, snapshot }
```

### 7q. Stop Tracking (`POST /api/tracking/stop`) — Driver only

```
REQUIRE role "driver"

updateStore:
  reset bus.lat, bus.lng to default charging station position
  set bus.isTracking = false
  set bus.statusText = "Bilis XX berada di [charging station]."
  set driver.status = "Siaga"

broadcast "tracking:snapshot" to clients
RETURN 200 { success, snapshot }
```

---

## 8. Helper Utilities

```
FUNCTION sanitizeUser(user):
  RETURN { id, role, name, email }
    + username if present
    + status if present
  // strips passwordHash and internal fields

FUNCTION getFleetOptions(totalBuses):
  RETURN ["01", "02", ..., "0N"] for N buses (zero-padded, clamped 1–20)

FUNCTION deriveRouteFromStops(stops):
  IF stops is empty THEN RETURN default busRoute
  route = stops mapped to { lat, lng }
  IF more than 2 stops THEN append first stop to close the loop
  RETURN route
```

---

## 9. System Flow Summary

```
STUDENT visits site:
  → GET /api/public/state  →  sees bus location, route, stops, ETAs on map

DRIVER logs in:
  → POST /api/auth/login (role: "driver")
  → POST /api/tracking/start
  → repeatedly POST /api/tracking/location  (GPS coordinates)
  → POST /api/tracking/stop  when done

ADMIN logs in:
  → POST /api/auth/login (role: "admin")
  → manage drivers   (GET / POST /api/drivers, PUT / DELETE /api/drivers/[id])
  → manage stops     (GET / POST /api/stops, PUT / DELETE /api/stops/[id])
  → manage settings  (GET / PATCH /api/settings)
```
