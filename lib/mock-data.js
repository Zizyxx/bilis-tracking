export const campusCenter = [-6.3078, 106.7553];
export const busDefaultPosition = { lat: -6.307295, lng: 106.755949 };
export const chargingStationName = "Bilis Charging Station";

export const busRoute = [
  busDefaultPosition,
  { lat: -6.3043, lng: 106.7569 },
  { lat: -6.3052, lng: 106.7588 },
  { lat: -6.307, lng: 106.7598 },
  { lat: -6.3092, lng: 106.7589 },
  { lat: -6.3112, lng: 106.7569 },
  { lat: -6.3115, lng: 106.7541 },
  { lat: -6.3094, lng: 106.7528 },
  { lat: -6.3069, lng: 106.7522 },
  { lat: -6.3047, lng: 106.7543 }
];

export const stops = [
  {
    id: "rektorat",
    name: "Halte Rektorat",
    faculty: "Rektorat",
    lat: -6.306783,
    lng: 106.756293,
    queue: "Lengang"
  },
  {
    id: "triguna",
    name: "Halte Triguna",
    faculty: "Triguna",
    lat: -6.305943,
    lng: 106.755931,
    queue: "Lengang"
  },
  {
    id: "ushuludin",
    name: "Halte Ushuludin",
    faculty: "Ushuludin",
    lat: -6.306515,
    lng: 106.753845,
    queue: "Lengang"
  },
  {
    id: "perpustakaan",
    name: "Halte Perpustakaan",
    faculty: "Perpustakaan",
    lat: -6.306204,
    lng: 106.753388,
    queue: "Lengang"
  },
  {
    id: "plt",
    name: "Halte PLT",
    faculty: "PLT",
    lat: -6.305912,
    lng: 106.75305,
    queue: "Lengang"
  },
  {
    id: "fst-1",
    name: "Halte FST 1",
    faculty: "FST",
    lat: -6.306021,
    lng: 106.752565,
    queue: "Lengang"
  },
  {
    id: "fst-2",
    name: "Halte FST 2",
    faculty: "FST",
    lat: -6.306654,
    lng: 106.752499,
    queue: "Lengang"
  },
  {
    id: "fitk",
    name: "Halte FITK",
    faculty: "FITK",
    lat: -6.307518,
    lng: 106.755595,
    queue: "Lengang"
  }
];

export const drivers = [
  {
    id: "DRV-01",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@uinjkt.ac.id",
    status: "Aktif"
  },
  {
    id: "DRV-02",
    name: "Rizky Hidayat",
    email: "rizky.hidayat@uinjkt.ac.id",
    status: "Siaga"
  }
];

export const scheduleRules = [
  {
    id: "SCH-01",
    title: "Operasional Reguler Senin - Kamis",
    time: "07.00 - 17.00",
    note: "Tracking aktif sepanjang jam kuliah reguler."
  },
  {
    id: "SCH-02",
    title: "Jumat Istirahat / Jumatan",
    time: "11.30 - 13.00",
    note: "Sistem otomatis menyiarkan status istirahat ke semua klien."
  }
];
