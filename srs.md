# Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS)
**Nama Proyek:** Sistem Informasi Live Tracking Bilis (Bus Listrik) UIN Syarif Hidayatullah Jakarta
**Versi Dokumen:** 1.0

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini mendefinisikan spesifikasi kebutuhan perangkat lunak untuk sistem *live tracking* Bus Listrik (Bilis) kampus. Dokumen ini menjadi acuan utama bagi *developer* dalam merancang, membangun, dan menguji sistem agar sesuai dengan arsitektur MVP (Minimum Viable Product).

### 1.2 Ruang Lingkup Sistem
Sistem ini berfokus pada pelacakan titik koordinat bus secara *real-time* menggunakan perangkat seluler sopir sebagai alat pemancar GPS. Data lokasi akan didistribusikan ke layar perangkat mahasiswa secara langsung (tanpa *refresh*) menggunakan teknologi WebSockets, lengkap dengan kalkulasi Estimasi Waktu Tiba (ETA) di setiap halte gedung fakultas.

### 1.3 Definisi dan Istilah
* **MVP:** *Minimum Viable Product*, pendekatan rilis produk dengan fitur dasar yang cukup untuk memecahkan masalah utama.
* **ETA:** *Estimated Time of Arrival*, perkiraan waktu tiba bus di halte tertentu dalam satuan menit.
* **WebSocket:** Protokol komunikasi dua arah yang memungkinkan interaksi *real-time* antara *browser* dan *server*.

---

## 2. Arsitektur Sistem & Teknologi (Tech Stack)

Sistem ini dibangun di atas infrastruktur modern dengan pembagian sebagai berikut:
* **Infrastruktur Jaringan & Keamanan:** Cloudflare (sebagai *Reverse Proxy*, CDN untuk *caching* aset statis, SSL/HTTPS *Enforcement*, dan proteksi DDoS).
* **Frontend Web:** Next.js (*Framework* React), Tailwind CSS (*Styling*).
* **Pemetaan Visual:** Leaflet.js dengan integrasi *tiles* dari OpenStreetMap.
* **Backend API & Real-time Engine:** Node.js dipadukan dengan `Socket.io`.
* **Database:** MongoDB (penyimpanan NoSQL fleksibel).

---

## 3. Karakteristik Pengguna (Aktor)

| ID Aktor | Nama Peran | Deskripsi & Hak Akses |
| :--- | :--- | :--- |
| **AKT-01** | **Mahasiswa (Publik)** | Pengguna akhir yang tidak perlu melakukan *login*. Dapat melihat peta interaktif, animasi pergerakan bus, jadwal operasional, dan angka ETA halte. |
| **AKT-02** | **Sopir** | Pengguna yang mengoperasikan bus. Wajib *login* menggunakan *Username*/Email dan *Password*. Bertugas menghidupkan dan mematikan transmisi GPS dari *browser* HP mereka. |
| **AKT-03** | **Admin / Developer** | Pengelola sistem dengan hak akses penuh via *login*. Dapat mengelola data halte (CRUD), akun sopir, dan menyetel jadwal operasional. |

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### 4.1 Modul Autentikasi & Otorisasi
* **F-01.1:** Sistem harus menyediakan halaman *login* terpisah untuk Sopir (`/driver`) dan Admin (`/admin`).
* **F-01.2:** Sistem memvalidasi *Username*/Email dan *Password* yang telah dienkripsi di database.
* **F-01.3:** Sistem menggunakan sesi berbasis JWT (JSON Web Tokens) untuk menjaga status *login* pengguna.

### 4.2 Modul Transmisi Lokasi (Sisi Sopir)
* **F-02.1:** Sistem harus dapat meminta izin akses *Geolocation API* dari *browser* perangkat sopir.
* **F-02.2:** Saat tombol "Mulai Narik" ditekan, sistem harus mengambil titik *Latitude* dan *Longitude* secara berkala (misal: setiap 3-5 detik).
* **F-02.3:** Sistem mengirimkan data koordinat tersebut ke *server* backend Node.js.
* **F-02.4:** Sistem menyediakan tombol "Selesai/Istirahat" untuk memutus pengambilan koordinat secara instan.

### 4.3 Modul Distribusi Data (WebSockets)
* **F-03.1:** *Server* Node.js harus memancarkan ( *broadcast*) koordinat terbaru yang diterima dari sopir ke seluruh koneksi *client* mahasiswa yang sedang aktif.
* **F-03.2:** Sistem harus mampu mendeteksi jika koneksi WebSocket terputus dan mencoba menyambung kembali (*auto-reconnect*) secara otomatis di latar belakang.

### 4.4 Modul Peta & Visualisasi (Sisi Mahasiswa)
* **F-04.1:** Sistem harus merender peta kampus menggunakan Leaflet.js yang disesuaikan dengan batas wilayah (*bounding box*) kampus.
* **F-04.2:** Sistem harus meletakkan *marker* ikon halte berdasarkan data yang ditarik dari MongoDB.
* **F-04.3:** Sistem harus menganimasikan pergerakan ikon bus (*sliding marker*) di atas peta setiap kali menerima pembaruan koordinat dari WebSocket, tanpa me-*refresh* seluruh peta.

### 4.5 Modul Kalkulasi Estimasi Waktu Tiba (ETA)
* **F-05.1:** *Server* harus menghitung jarak lurus antara koordinat bus saat ini dengan koordinat halte fakultas menggunakan algoritma *Haversine Formula*.
* **F-05.2:** Jarak yang didapat dikonversi menjadi estimasi waktu (menit) berdasarkan variabel kecepatan rata-rata operasional bus (misal: 15 km/jam).
* **F-05.3:** Angka ETA ini dikirimkan bersamaan dengan paket data WebSocket untuk diperbarui di UI mahasiswa.

### 4.6 Modul Penjadwalan & Operasional
* **F-06.1:** Sistem memiliki fitur *Cron Job* (penjadwalan otomatis di Node.js) yang memonitor jam dan hari.
* **F-06.2:** Jika waktu menunjukkan jadwal istirahat (misal: Jumat 11.30 - 13.00), sistem otomatis mengirimkan status "Istirahat/Jum'atan" ke seluruh *client*, dan mematikan pergerakan bus di peta.

### 4.7 Modul Manajemen Data (Sisi Admin)
* **F-07.1:** Sistem memungkinkan admin untuk Menambah, Membaca, Memperbarui, dan Menghapus (CRUD) daftar halte (Nama Gedung Fakultas, Latitude, Longitude).
* **F-07.2:** Sistem memungkinkan admin untuk mendaftarkan akun baru untuk sopir bilis.

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 5.1 Kinerja dan Skalabilitas (Performance)
* **NF-01:** Aplikasi *frontend* (Next.js) harus dimuat kurang dari 3 detik pada jaringan 4G stabil.
* **NF-02:** *Server* WebSockets harus mampu menangani minimal 500 koneksi mahasiswa serentak tanpa jeda *delay* lebih dari 2 detik pada pergerakan bus.
* **NF-03:** Cloudflare harus dikonfigurasi untuk melakukan *cache* pada aset statis (gambar marker, file CSS Tailwind, script Next.js) agar menghemat *bandwidth server* utama hingga 70%.

### 5.2 Keamanan Data (Security)
* **NF-04:** Kata sandi Admin dan Sopir wajib di-hash menggunakan algoritma *bcrypt* (minimum *salt round* 10) sebelum masuk ke MongoDB.
* **NF-05:** Cloudflare memaksakan (*enforce*) protokol HTTPS/SSL yang ketat. Pengguna yang mengakses via HTTP akan otomatis dialihkan (*redirect*) ke HTTPS.
* **NF-06:** *Endpoint* API untuk mengirim lokasi bus dan manajemen admin harus diproteksi dengan verifikasi token (JWT).

### 5.3 Ketersediaan dan Ketahanan (Reliability)
* **NF-07:** Jika terjadi gagal fungsi pada GPS sopir (misal sinyal hilang), sistem di halaman mahasiswa akan memunculkan indikator status *offline* atau "Menunggu Sinyal GPS" setelah 15 detik tidak menerima *ping* koordinat.

## 6. Kebutuhan Antarmuka Pengguna (UI/UX Requirements)

### 6.1 Karakteristik Desain Visual & Tema
Sistem menggunakan gaya *Modern-Clean* yang memprioritaskan ruang putih (*white space*) untuk keterbacaan tinggi di luar ruangan, warna biru untuk membangun struktur dan hierarki informasi, serta hijau sebagai aksen untuk menunjukkan tindakan positif atau status operasional.

| Elemen Desain | Deskripsi & Implementasi (Referensi Tailwind CSS) |
| :--- | :--- |
| **Warna Latar Utama** | Putih bersih (`bg-white` atau `bg-slate-50`) untuk memberikan kesan luas dan menonjolkan elemen peta. |
| **Warna Utama (Primary)** | Biru (`bg-blue-600` hingga `text-blue-900`) digunakan pada *header*, ikon halte, dan teks informasi utama. |
| **Aksen (Functional)** | Hijau (`bg-green-500`, `text-green-600`) khusus digunakan untuk tombol "Mulai", indikator status "Beroperasi", dan animasi sinyal *live tracking*. |
| **Warna Sekunder** | Abu-abu (`text-gray-500`) untuk teks pendukung/sub-judul. Merah (`bg-red-500`) khusus untuk tombol "Berhenti" atau peringatan. |
| **Tipografi** | Font *Sans-Serif* modern (seperti Inter atau Roboto) yang dioptimalkan untuk layar ponsel dengan tingkat kontras tinggi. |

### 6.2 Antarmuka Halaman Mahasiswa (Layar Pantau - `/`)
Fokus utama halaman ini adalah kecepatan penyampaian informasi (ETA) dan visibilitas pergerakan bus tanpa elemen visual yang menumpuk.

* **Peta Penuh (Full-Screen Map):** Kanvas Leaflet.js mengambil 100% tinggi dan lebar layar ponsel (`h-screen w-screen`). Latar belakang peta (tiles) menggunakan tema terang/standar.
* **Pita Status Global (Top Bar):** Baris melayang berwarna putih transparan (`bg-white/90 backdrop-blur`) di bagian atas layar. Menampilkan teks biru tebal untuk judul dan titik hijau berkedip (`animate-pulse bg-green-500`) sebagai penanda koneksi WebSockets aktif.
* **Panel Informasi Bawah (Bottom Sheet):** Panel melengkung berwarna putih (`bg-white rounded-t-2xl shadow-lg`) di area bawah layar yang selalu terlihat, berisi:
* Nama halte terdekat atau yang dipilih pengguna (Teks biru tua).
* Angka Estimasi Waktu Tiba (ETA) berukuran besar dengan warna biru, disertai teks "Menit Lagi" berwarna hijau.
* Tombol "Refresh Peta" berbentuk pil berwarna putih dengan garis luar biru (`border border-blue-600 text-blue-600`).
* **Tombol Re-Center (FAB):** Tombol melayang berbentuk lingkaran putih di atas peta dengan ikon panah biru, berfungsi mengembalikan fokus kamera ke posisi bus terbaru.

### 6.3 Antarmuka Halaman Sopir (Panel Kendali - `/driver`)
Antarmuka dirancang seringkas mungkin agar sopir dapat mengoperasikannya dalam hitungan detik tanpa harus melihat layar terlalu lama.

* **Tata Letak Bebas Gangguan:** Latar belakang putih bersih tanpa peta atau elemen dekoratif.
* **Tombol Aksi Raksasa:**
* Tombol **"Mulai Narik"**: Menggunakan latar biru utama (`bg-blue-600 text-white rounded-xl`). Sangat besar dan memenuhi setengah layar.
* Tombol **"Selesai / Istirahat"**: Menggunakan garis luar biru dan teks peringatan merah (`border-2 border-red-500 text-red-600`) yang diletakkan di bagian bawah agar tidak tidak sengaja tertekan.
* **Indikator Transmisi Aktif:** Area melingkar di tengah layar yang akan menyala dengan aksen hijau lembut (`shadow-[0_0_20px_rgba(34,197,94,0.3)]`) saat GPS aktif mengirim data.
* **Teks Kordinat Sistem:** Teks ukuran kecil berwarna abu-abu (`text-xs text-gray-400`) di area paling bawah untuk menampilkan detail *Latitude/Longitude* sebagai validasi bahwa perangkat berfungsi.

### 6.4 Antarmuka Halaman Admin (Dasbor Manajemen - `/admin`)
Dasbor responsif yang memadukan tabel data yang terstruktur rapi dan panel kontrol sistem.

* **Bilah Samping (Sidebar):** Berwarna biru tua (`bg-blue-900 text-white`) memuat navigasi ke "Manajemen Halte", "Akun Sopir", dan "Jadwal Operasional".
* **Area Konten Utama:** Berlatar putih (`bg-white`) dengan susunan *card* informasi bersudut tumpul (`rounded-xl`).
* **Tabel Data Halte:** Tabel bersih dengan garis pemisah abu-abu tipis. Baris judul kolom menggunakan latar biru sangat muda (`bg-blue-50 text-blue-800`). Tombol aksi (Edit/Hapus) disorot dengan teks biru atau merah.
* **Sakelar Darurat (Master Toggle):** *Toggle switch* di sudut kanan atas dasbor. Menyala hijau saat operasional normal, dan dapat digeser (berubah abu-abu/putih) untuk mematikan penyiaran WebSockets secara menyeluruh.

### 6.5 Panduan Animasi & Interaksi
Animasi tidak digunakan untuk dekorasi, melainkan untuk memperjelas umpan balik sistem kepada pengguna.

* **Transisi Marker Peta:** *Marker* bus di Leaflet.js wajib menggunakan teknik animasi geser (*sliding marker* atau interpolasi koordinat) agar pergerakan bus di peta terlihat berjalan mulus, tidak melompat-lompat secara kasar saat data WebSockets terbaru diterima.
* **Efek Tekan Sentuhan:** Semua tombol menggunakan efek `active:scale-95` dan perubahan warna `hover:bg-blue-700` pada Tailwind untuk memberikan umpan balik taktil saat layar ponsel disentuh.
* **Status Pemuatan (Loading State):** Menggunakan animasi *skeleton loading* (kotak abu-abu berkedip halus `bg-slate-200 animate-pulse`) pada area teks ETA saat sistem masih menghitung jarak awal.