"use client";

import { useEffect, useState } from "react";

const navigation = ["Manajemen Halte", "Akun Sopir", "Armada Bilis"];

function AdminLogin({ onLogin, loading, error }) {
  const [form, setForm] = useState({
    identifier: "admin",
    password: "admin123"
  });

  return (
    <section className="mx-auto max-w-md rounded-[32px] bg-white p-6 shadow-sm md:p-8">
      <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/LOGO_UIN.png" alt="Logo UIN" className="h-12 w-auto object-contain mb-4" />
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Login Admin</p>
      <h1 className="mt-3 text-3xl font-semibold text-blue-950">Masuk ke dashboard bilis</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Gunakan akun admin untuk mengelola halte, akun sopir, dan status siaran sistem.
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
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Password"
          type="password"
          value={form.password}
        />
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        <button
          className="active:scale-95 w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          disabled={loading}
          type="submit"
        >
          {loading ? "Memproses..." : "Masuk Sebagai Admin"}
        </button>
      </form>

      <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
        Demo akun: `admin` / `admin123`
      </div>
    </section>
  );
}

export function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loginError, setLoginError] = useState("");
  const [pageError, setPageError] = useState("");
  const [broadcastEnabled, setBroadcastEnabled] = useState(true);
  const [totalBuses, setTotalBuses] = useState(6);
  const [activeBusNumber, setActiveBusNumber] = useState("01");
  const [stops, setStops] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stopForm, setStopForm] = useState({
    faculty: "",
    name: "",
    lat: "",
    lng: ""
  });
  const [editingStop, setEditingStop] = useState(null);
  const [editForm, setEditForm] = useState({
    faculty: "",
    name: "",
    lat: "",
    lng: ""
  });
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverEditForm, setDriverEditForm] = useState({
    name: "",
    email: "",
    username: "",
    password: ""
  });
  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    username: "",
    password: ""
  });

  async function loadSession() {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await response.json();
    setSession(data.user);
    return data.user;
  }

  async function loadDashboard() {
    const [stopsResponse, driversResponse, settingsResponse, stateResponse] = await Promise.all([
      fetch("/api/stops", { cache: "no-store" }),
      fetch("/api/drivers", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/public/state", { cache: "no-store" })
    ]);

    if (stopsResponse.ok) {
      const stopData = await stopsResponse.json();
      setStops(stopData.stops);
    }

    if (driversResponse.ok) {
      const driverData = await driversResponse.json();
      setDrivers(driverData.drivers);
    }

    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      setBroadcastEnabled(settingsData.settings.broadcastEnabled);
      setTotalBuses(settingsData.settings.totalBuses || 6);
    }

    if (stateResponse.ok) {
      const publicState = await stateResponse.json();
      setActiveBusNumber(publicState.bus?.number || "01");
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const user = await loadSession();
        if (user?.role === "admin") {
          await loadDashboard();
        }
        setPageError("");
      } catch {
        setPageError("Gagal memuat dashboard. Silakan refresh halaman.");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
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
          role: "admin",
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
      await loadDashboard();
      setPageError("");
    } catch {
      setLoginError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function addStop(event) {
    event.preventDefault();

    const response = await fetch("/api/stops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(stopForm)
    });
    const data = await response.json();

    if (response.ok) {
      setStops(data.stops);
      setStopForm({
        faculty: "",
        name: "",
        lat: "",
        lng: ""
      });
    }
  }

  function startEditStop(stop) {
    setEditingStop(stop);
    setEditForm({
      faculty: stop.faculty,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng
    });
  }

  async function updateStop(event) {
    event.preventDefault();
    if (!editingStop) return;

    try {
      const response = await fetch(`/api/stops/${editingStop.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();

      if (response.ok) {
        setStops(data.stops);
        setEditingStop(null);
        setPageError("");
      } else {
        setPageError(data.error || "Gagal memperbarui data halte.");
      }
    } catch {
      setPageError("Tidak dapat terhubung ke server untuk memperbarui halte.");
    }
  }

  async function addDriver(event) {
    event.preventDefault();

    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(driverForm)
    });
    const data = await response.json();

    if (response.ok) {
      setDrivers(data.drivers);
      setDriverForm({
        name: "",
        email: "",
        username: "",
        password: ""
      });
    }
  }

  function startEditDriver(driver) {
    setEditingDriver(driver);
    setDriverEditForm({
      name: driver.name,
      email: driver.email,
      username: driver.username,
      password: ""
    });
  }

  async function updateDriver(event) {
    event.preventDefault();
    if (!editingDriver) return;

    try {
      const response = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(driverEditForm)
      });
      const data = await response.json();

      if (response.ok) {
        setDrivers(data.drivers);
        setEditingDriver(null);
        setPageError("");
      } else {
        setPageError(data.error || "Gagal memperbarui data sopir.");
      }
    } catch {
      setPageError("Tidak dapat terhubung ke server untuk memperbarui sopir.");
    }
  }

  async function deleteDriver(driverId) {
    if (!confirm("Apakah Anda yakin ingin menghapus akun sopir ini?")) return;

    try {
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (response.ok) {
        setDrivers(data.drivers);
        setPageError("");
      } else {
        setPageError(data.error || "Gagal menghapus sopir.");
      }
    } catch {
      setPageError("Tidak dapat terhubung ke server untuk menghapus sopir.");
    }
  }


  async function deleteStop(stopId) {
    const response = await fetch(`/api/stops/${stopId}`, {
      method: "DELETE"
    });
    const data = await response.json();

    if (response.ok) {
      setStops(data.stops);
    }
  }

  async function toggleBroadcast() {
    const nextValue = !broadcastEnabled;
    setBroadcastEnabled(nextValue);

    await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        broadcastEnabled: nextValue,
        operationalStatus: nextValue ? "Beroperasi" : "Dinonaktifkan Admin"
      })
    });
  }

  async function updateFleet() {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        totalBuses
      })
    });
    await loadDashboard();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setStops([]);
    setDrivers([]);
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900">Memuat dashboard admin...</main>;
  }

  if (!session || session.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 text-slate-900">
        <AdminLogin error={pageError || loginError} loading={loading} onLogin={handleLogin} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/8f/LOGO_UIN.png" alt="Logo UIN" className="h-8 w-auto object-contain" />
            <h1 className="text-lg font-bold text-blue-950 hidden sm:block">Control Center</h1>
          </div>
          
          <nav className="hidden md:flex space-x-2">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'halte', label: 'Manajemen Halte' },
              { id: 'armada', label: 'Armada Bilis' },
              { id: 'sopir', label: 'Akun Sopir' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block text-sm text-slate-500">
              Hi, <span className="font-semibold text-slate-700">{session.name}</span>
            </div>
            <button 
              onClick={logout} 
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="flex overflow-x-auto border-t border-slate-100 md:hidden no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'halte', label: 'Halte' },
            { id: 'armada', label: 'Armada' },
            { id: 'sopir', label: 'Sopir' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-700' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-7xl w-full px-4 py-6 sm:py-8 sm:px-6 lg:px-8 flex-1">
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
          {/* Hero Banner Section */}
          <div className="relative mb-6 overflow-hidden rounded-[24px] sm:rounded-[32px] bg-blue-950 shadow-sm">
            <img 
              src="https://asset.uinjkt.ac.id/uploads/fmXyXwZY/2025/12/whatsapp-image-2025-12-25-at-171604.jpeg" 
              className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity transition-transform duration-1000 hover:scale-105"
              alt="Bilis UIN Jakarta"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 to-transparent"></div>
            <div className="relative p-6 sm:p-10 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300 mb-2">
                  Dashboard Operasional
                </p>
                <h2 className="text-2xl font-bold text-white sm:text-4xl">Control Center Bilis</h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base leading-relaxed">
                  Pantau dan kelola seluruh armada bus listrik UIN Syarif Hidayatullah Jakarta. Akses manajemen halte, akun sopir, dan status siaran sistem dalam satu pintu.
                </p>
              </div>
              <div className="shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                 <p className="text-xs text-blue-100 uppercase tracking-widest font-semibold mb-2">Status Penyiaran</p>
                 <button
                  className={`flex w-full items-center justify-center gap-3 rounded-xl px-5 py-2.5 text-sm font-semibold transition md:w-auto ${
                    broadcastEnabled ? "bg-green-500 hover:bg-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]" : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  }`}
                  onClick={toggleBroadcast}
                  type="button"
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ${broadcastEnabled ? "bg-white animate-pulse" : "bg-slate-400"}`}
                  />
                  {broadcastEnabled ? "Sistem Aktif (Online)" : "Sistem Dimatikan (Offline)"}
                </button>
              </div>
            </div>
          </div>

          <div className="status-grid mb-6">
            <article className="rounded-[28px] bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Halte Terdaftar</p>
              <p className="mt-3 text-4xl font-semibold text-blue-900">{stops.length}</p>
            </article>
            <article className="rounded-[28px] bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Akun Sopir</p>
              <p className="mt-3 text-4xl font-semibold text-blue-900">{drivers.length}</p>
            </article>
            <article className="rounded-[28px] bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Armada Bilis</p>
              <p className="mt-3 text-4xl font-semibold text-blue-900">{totalBuses}</p>
            </article>
          </div>

          {pageError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          ) : null}
          </div>
        )}

        {activeTab === 'halte' && (
          <div className="animate-fade-in">
            <section className="rounded-[28px] bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-blue-950">Manajemen Halte</h3>
                  <p className="text-sm text-slate-500">CRUD data halte fakultas untuk marker dan ETA.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="min-w-[640px] divide-y divide-slate-200 text-left text-sm md:min-w-full">
                  <thead className="bg-blue-50 text-blue-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Gedung</th>
                      <th className="px-4 py-3 font-semibold">Nama Halte</th>
                      <th className="px-4 py-3 font-semibold">Koordinat</th>
                      <th className="px-4 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stops.map((stop) => (
                      <tr key={stop.id}>
                        <td className="px-4 py-4 font-medium text-slate-700">{stop.faculty}</td>
                        <td className="px-4 py-4 text-slate-600">{stop.name}</td>
                        <td className="px-4 py-4 text-slate-500">
                          {Number(stop.lat).toFixed(4)}, {Number(stop.lng).toFixed(4)}
                        </td>
                        <td className="px-4 py-4 space-x-3">
                          <button
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition active:scale-95 cursor-pointer"
                            onClick={() => startEditStop(stop)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm font-semibold text-red-600 hover:text-red-800 transition active:scale-95 cursor-pointer"
                            onClick={() => deleteStop(stop.id)}
                            type="button"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={addStop}>
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 focus:border-blue-400"
                  onChange={(event) => setStopForm((current) => ({ ...current, faculty: event.target.value }))}
                  placeholder="Singkatan Fakultas"
                  required
                  value={stopForm.faculty}
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 focus:border-blue-400"
                  onChange={(event) => setStopForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nama halte"
                  required
                  value={stopForm.name}
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 focus:border-blue-400"
                  onChange={(event) => setStopForm((current) => ({ ...current, lat: event.target.value }))}
                  placeholder="Latitude"
                  required
                  step="any"
                  type="number"
                  value={stopForm.lat}
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 focus:border-blue-400"
                  onChange={(event) => setStopForm((current) => ({ ...current, lng: event.target.value }))}
                  placeholder="Longitude"
                  required
                  step="any"
                  type="number"
                  value={stopForm.lng}
                />
                <button
                  className="active:scale-95 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 md:col-span-2"
                  type="submit"
                >
                  Tambah Halte Baru
                </button>
              </form>
            </section>
          </div>
        )}

        {activeTab === 'armada' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="space-y-6">
              <section className="rounded-[28px] bg-white p-5 shadow-sm">
                <h3 className="text-xl font-semibold text-blue-950">Armada Bilis</h3>
                <p className="mt-1 text-sm text-slate-500">Atur jumlah bilis aktif yang tersedia untuk dipilih sopir.</p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="total-buses">
                    Total Bilis Kampus
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    id="total-buses"
                    min="1"
                    onChange={(event) => setTotalBuses(Number(event.target.value))}
                    type="number"
                    value={totalBuses}
                  />
                  <button
                    className="active:scale-95 w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                    onClick={updateFleet}
                    type="button"
                  >
                    Simpan Jumlah Bilis
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'sopir' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="space-y-6">
              <section className="rounded-[28px] bg-white p-5 shadow-sm">
                <h3 className="text-xl font-semibold text-blue-950">Akun Sopir</h3>
                <p className="mt-1 text-sm text-slate-500">Tambah akun login sopir untuk panel `/driver`.</p>

                <ul className="mt-4 space-y-3">
                  {drivers.map((driver) => (
                    <li key={driver.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{driver.name}</p>
                          <p className="break-all text-sm text-slate-500">
                            {driver.email} | {driver.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition active:scale-95 cursor-pointer"
                            onClick={() => startEditDriver(driver)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition active:scale-95 cursor-pointer"
                            onClick={() => deleteDriver(driver.id)}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <form className="mt-5 space-y-3" onSubmit={addDriver}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    onChange={(event) => setDriverForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nama sopir"
                    required
                    value={driverForm.name}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    onChange={(event) => setDriverForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email login"
                    required
                    type="email"
                    value={driverForm.email}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    onChange={(event) => setDriverForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="Username"
                    required
                    value={driverForm.username}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                    onChange={(event) => setDriverForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Password"
                    required
                    type="password"
                    value={driverForm.password}
                  />

                  <button
                    className="active:scale-95 w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                    type="submit"
                  >
                    Daftarkan Sopir
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}
      </section>

      {/* Modal Edit Halte */}
      {editingStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 p-4 backdrop-blur-xs transition-all duration-300 animate-fade-in">
          <div className="relative w-full max-w-lg scale-100 transform rounded-[32px] bg-white p-6 shadow-2xl transition-all duration-300 sm:p-8 border border-slate-100 animate-scale-up">
            {/* Close button */}
            <button
              onClick={() => setEditingStop(null)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              type="button"
            >
              ✕
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Manajemen Halte</p>
            <h3 className="mt-2 text-2xl font-semibold text-blue-950">Edit Data Halte</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ubah informasi nama gedung, nama halte, dan koordinat marker peta.
            </p>

            <form className="mt-6 space-y-4" onSubmit={updateStop}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Singkatan Fakultas / Gedung
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setEditForm((current) => ({ ...current, faculty: event.target.value }))}
                  placeholder="Contoh: FST"
                  required
                  value={editForm.faculty}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Nama Halte
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Contoh: Halte FST 1"
                  required
                  value={editForm.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Latitude
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    onChange={(event) => setEditForm((current) => ({ ...current, lat: event.target.value }))}
                    placeholder="Latitude"
                    required
                    step="any"
                    type="number"
                    value={editForm.lat}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Longitude
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    onChange={(event) => setEditForm((current) => ({ ...current, lng: event.target.value }))}
                    placeholder="Longitude"
                    required
                    step="any"
                    type="number"
                    value={editForm.lng}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  onClick={() => setEditingStop(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                  type="submit"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Sopir */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 p-4 backdrop-blur-xs transition-all duration-300 animate-fade-in">
          <div className="relative w-full max-w-lg scale-100 transform rounded-[32px] bg-white p-6 shadow-2xl transition-all duration-300 sm:p-8 border border-slate-100 animate-scale-up">
            {/* Close button */}
            <button
              onClick={() => setEditingDriver(null)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              type="button"
            >
              ✕
            </button>

            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Akun Sopir</p>
            <h3 className="mt-2 text-2xl font-semibold text-blue-950">Edit Akun Sopir</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ubah informasi profil akun sopir dan reset kata sandi jika diperlukan.
            </p>

            <form className="mt-6 space-y-4" onSubmit={updateDriver}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Nama Sopir
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setDriverEditForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nama sopir"
                  required
                  value={driverEditForm.name}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Email Login
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setDriverEditForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email login"
                  required
                  type="email"
                  value={driverEditForm.email}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Username
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setDriverEditForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Username"
                  required
                  value={driverEditForm.username}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Password Baru (Kosongkan jika tidak ingin diubah)
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  onChange={(event) => setDriverEditForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Ketik password baru jika ingin diubah"
                  type="password"
                  value={driverEditForm.password}
                />
              </div>



              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  onClick={() => setEditingDriver(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                  type="submit"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
