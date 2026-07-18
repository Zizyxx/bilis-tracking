"use client";

import { useEffect, useRef, useState } from "react";
import { busRoute } from "@/lib/mock-data";

function CoordinateLine({ latitude, longitude }) {
  if (latitude == null || longitude == null) {
    return <p className="text-xs text-slate-400">Latitude/Longitude belum tersedia.</p>;
  }

  return (
    <p className="text-xs text-slate-400">
      Latitude {latitude.toFixed(6)} | Longitude {longitude.toFixed(6)}
    </p>
  );
}

function DriverLogin({ onLogin, error, loading }) {
  const [form, setForm] = useState({
    identifier: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="mx-auto max-w-md rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-8">
      <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/LOGO_UIN.png" alt="Logo UIN" className="h-12 w-auto object-contain mb-4" />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Login Sopir</p>
      <h1 className="mt-3 text-2xl font-semibold text-blue-950 sm:text-3xl">Masuk ke panel kendali bus</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Gunakan akun sopir untuk memulai atau menghentikan transmisi GPS dari browser HP.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onLogin(form);
        }}
      >
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
          onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
          placeholder="Username atau email"
          value={form.identifier}
        />
        <div className="relative">
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        <button
          className="active:scale-95 w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          disabled={loading}
          type="submit"
        >
          {loading ? "Memproses..." : "Masuk Sebagai Sopir"}
        </button>
      </form>


    </section>
  );
}

export function DriverConsole() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [statusText, setStatusText] = useState("Siap menerima izin GPS dari browser.");
  const [position, setPosition] = useState({
    latitude: busRoute[0].lat,
    longitude: busRoute[0].lng
  });
  const [demoRoute, setDemoRoute] = useState(busRoute);
  const [buses, setBuses] = useState([]);
  const [selectedBusNumber, setSelectedBusNumber] = useState("01");
  const watchIdRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const [sessionResponse, stateResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/public/state", { cache: "no-store" })
        ]);

        const data = await sessionResponse.json();
        const state = await stateResponse.json();

        setSession(data.user);

        if (Array.isArray(state.buses) && state.buses.length > 0) {
          setBuses(state.buses);
        }
        if (Array.isArray(state.route) && state.route.length > 0) {
          setDemoRoute(state.route);
        }
        
        const driverBus = state.buses?.find(b => b.driverId === data.user?.id) || state.buses?.[0];

        if (driverBus?.number) {
          setSelectedBusNumber(driverBus.number);
        }
        if (driverBus?.lat != null && driverBus?.lng != null) {
          setPosition({
            latitude: driverBus.lat,
            longitude: driverBus.lng
          });
        }
        if (driverBus?.statusText) {
          setStatusText(driverBus.statusText);
        }
        if (driverBus?.isTracking) {
          setIsTracking(true);
        }
        setPageError("");
      } catch {
        setPageError("Gagal memuat data awal dari server. Silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    return () => {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (fallbackTimerRef.current) {
        window.clearInterval(fallbackTimerRef.current);
      }
    };
  }, []);

  async function handleLogin(form) {
    setLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: "driver",
          identifier: form.identifier,
          password: form.password
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || "Login gagal.");
        return;
      }

      setSession(data.user);
    } catch {
      setLoginError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function sendLocation(latitude, longitude, nextStatusText = `Bilis ${selectedBusNumber} sedang dalam perjalanan.`) {
    setPosition({ latitude, longitude });
    setStatusText(nextStatusText);

    await fetch("/api/tracking/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lat: latitude,
        lng: longitude,
        statusText: nextStatusText
      })
    });
  }

  async function startTracking() {
    if (isTracking) {
      return;
    }

    setStatusText(`Mengaktifkan Bilis ${selectedBusNumber}...`);

    const response = await fetch("/api/tracking/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        busNumber: selectedBusNumber
      })
    });

    if (!response.ok) {
      setStatusText("Sesi sopir tidak valid. Silakan login ulang.");
      return;
    }

    setIsTracking(true);

    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (geoPosition) => {
          sendLocation(
            geoPosition.coords.latitude,
            geoPosition.coords.longitude,
            `Koordinat Bilis ${selectedBusNumber} berhasil dikirim ke server.`
          );
        },
        () => {
          setStatusText(`GPS gagal dibaca. Bilis ${selectedBusNumber} beralih ke mode demo rute kampus.`);
          let routeIndex = 0;
          fallbackTimerRef.current = window.setInterval(() => {
            routeIndex = (routeIndex + 1) % demoRoute.length;
            sendLocation(
              demoRoute[routeIndex].lat,
              demoRoute[routeIndex].lng,
              `Mode demo aktif. Bilis ${selectedBusNumber} sedang dipancarkan.`
            );
          }, 4000);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 7000
        }
      );
      return;
    }

    setStatusText(`Geolocation tidak tersedia. Bilis ${selectedBusNumber} memakai mode demo rute kampus.`);
    let routeIndex = 0;
    fallbackTimerRef.current = window.setInterval(() => {
      routeIndex = (routeIndex + 1) % demoRoute.length;
      sendLocation(
        demoRoute[routeIndex].lat,
        demoRoute[routeIndex].lng,
        `Mode demo aktif. Bilis ${selectedBusNumber} sedang dipancarkan.`
      );
    }, 4000);
  }

  async function stopTracking() {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (fallbackTimerRef.current) {
      window.clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    await fetch("/api/tracking/stop", { method: "POST" });
    setIsTracking(false);
    setStatusText(`Bilis ${selectedBusNumber} terparkir (istirahat).`);
  }

  async function logout() {
    await stopTracking();
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-900">Memuat panel sopir...</main>;
  }

  if (!session || session.role !== "driver") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,87,213,0.18),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-6 text-slate-900 sm:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
          <DriverLogin error={pageError || loginError} loading={loading} onLogin={handleLogin} />
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,87,213,0.18),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-4 text-slate-900 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col justify-between rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:min-h-[calc(100vh-4rem)] sm:rounded-[36px] sm:p-6 md:p-10">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/LOGO_UIN.png" alt="Logo UIN" className="h-10 w-auto object-contain mb-1" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
                Driver Console
              </p>
              <h1 className="max-w-xl text-2xl font-semibold leading-tight text-blue-950 sm:text-3xl md:text-5xl">
                Aktifkan live tracking bilis dalam beberapa detik.
              </h1>
            </div>
            <button
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
              onClick={logout}
              type="button"
            >
              Logout
            </button>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
            Login sebagai <span className="font-semibold text-blue-700">{session.name}</span>. Pilih nomor bilis
            yang sedang Anda operasikan, lalu mulai pengiriman GPS.
          </p>

          <div className="grid gap-2 sm:max-w-xs">
            <label className="text-sm font-semibold text-slate-700" htmlFor="bus-number">
              Nomor Bilis
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
              disabled={isTracking}
              id="bus-number"
              onChange={(event) => setSelectedBusNumber(event.target.value)}
              value={selectedBusNumber}
            >
              {buses.filter(b => b.status === "Aktif").map((bus) => (
                <option key={bus.id} value={bus.number}>
                  Bilis {bus.number} {bus.plate ? `(${bus.plate})` : ''}
                </option>
              ))}
              {buses.length === 0 && (
                <option value="01">Bilis 01</option>
              )}
            </select>
          </div>
        </div>

        <section className="my-6 flex flex-1 flex-col items-center justify-center gap-6 sm:my-10 sm:gap-8">
          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full border-8 border-white text-center shadow-[0_0_0_14px_rgba(20,87,213,0.06)] transition sm:h-48 sm:w-48 sm:shadow-[0_0_0_20px_rgba(20,87,213,0.06)] md:h-56 md:w-56 ${
              isTracking
                ? "bg-green-50 shadow-[0_0_45px_rgba(34,197,94,0.28)]"
                : "bg-slate-100 shadow-[0_0_30px_rgba(148,163,184,0.12)]"
            }`}
          >
            <div className="space-y-3">
              <div
                className={`mx-auto h-5 w-5 rounded-full ${
                  isTracking ? "animate-pulse bg-green-500" : "bg-slate-300"
                }`}
              />
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                {isTracking ? "Transmisi Aktif" : "Mode Siaga"}
              </p>
              <p className="px-4 text-base font-semibold text-blue-950 sm:px-6 sm:text-lg">
                Bilis {selectedBusNumber}
              </p>
            </div>
          </div>

          <div className="grid w-full gap-4">
            <button
              className="active:scale-95 min-h-24 rounded-[24px] bg-blue-600 px-6 py-7 text-xl font-semibold text-white shadow-[0_25px_40px_rgba(20,87,213,0.28)] transition hover:bg-blue-700 sm:min-h-32 sm:rounded-[30px] sm:px-8 sm:py-10 sm:text-2xl"
              onClick={startTracking}
              type="button"
            >
              Mulai Narik Bilis {selectedBusNumber}
            </button>
            <button
              className="active:scale-95 min-h-20 rounded-[22px] border-2 border-red-500 bg-white px-6 py-5 text-lg font-semibold text-red-600 transition hover:bg-red-50 sm:min-h-24 sm:rounded-[26px] sm:px-8 sm:py-7 sm:text-xl"
              onClick={stopTracking}
              type="button"
            >
              Selesai Narik (Istirahat)
            </button>
          </div>
        </section>

        <footer className="space-y-2 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 sm:space-y-3 sm:rounded-[24px]">
          <p className="text-sm font-medium leading-6 text-slate-700">{statusText}</p>
          <div className="overflow-hidden text-ellipsis">
            <CoordinateLine latitude={position.latitude} longitude={position.longitude} />
          </div>
          {pageError ? <p className="text-xs text-red-600">{pageError}</p> : null}
        </footer>
      </div>
    </main>
  );
}
