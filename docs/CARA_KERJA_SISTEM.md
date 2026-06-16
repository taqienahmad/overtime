# Cara Kerja Overtime System Management

Dokumen ini menjelaskan secara umum bagaimana sistem **Overtime System Management**
berjalan, mulai dari data overtime diunggah sampai akhirnya disetujui dan dilaporkan.
Dokumen ditulis untuk audiens non-teknis (manajemen) maupun developer baru yang ingin
memahami gambaran besar sistem sebelum masuk ke detail kode.

---

## 1. Tujuan Sistem

Setiap periode, tim **Workforce Management (WFM)** menerima data jam overtime
karyawan dari berbagai project (dalam bentuk file Excel). Data ini harus:

1. Diunggah ke sistem.
2. Dikelompokkan per **Project** dan **Approver** (PIC/Manager Project).
3. Dikirim ke Approver untuk **divalidasi** (dipisah menjadi jam **Billable** dan
   **Non-Billable**).
4. Disimpan sebagai **history** setelah divalidasi.
5. Dirangkum dalam **laporan/dashboard** untuk monitoring manajemen.

Sistem ini menggantikan proses manual (kirim Excel via email, isi manual, rekap
manual) dengan satu aplikasi web terpusat.

---

## 2. Komponen Utama Sistem

Secara garis besar sistem terdiri dari 3 bagian:

| Komponen | Fungsi |
|---|---|
| **Frontend (Web App)** | Tampilan yang dibuka WFM/Admin di browser — upload data, lihat dashboard, kirim email approval, lihat history. |
| **Backend (Server/API)** | "Otak" sistem — memproses data, menyimpan ke database, mengirim email, menjaga keamanan login. |
| **Database** | Tempat semua data disimpan secara permanen (data overtime, user, project, history validasi, log email). |

Selain itu ada **antrian email (email queue)** yang bertugas mengirim email approval
di belakang layar, supaya proses upload/aksi di web tidak perlu menunggu email
benar-benar terkirim.

---

## 3. Peran Pengguna (User Roles)

| Role | Akses |
|---|---|
| **ADMIN / WFM** | Login ke web app. Bisa upload data, mengelola user, mengelola template email, mengirim approval, melihat dashboard & laporan, melihat audit log. |
| **Approver (PIC Project)** | **Tidak perlu login**. Menerima link unik via email, lalu membuka halaman approval untuk memvalidasi jam overtime timnya. |

---

## 4. Alur Kerja End-to-End

Berikut alur utama dari data masuk sampai jadi laporan:

```
 1) UPLOAD DATA
    WFM mengunggah file Excel (Nama, NIP, Email, Project, Total Overtime, Periode)
            │
            ▼
 2) DATA MASUK SEBAGAI "PENDING"
    Setiap baris Excel tersimpan sebagai record overtime dengan status PENDING
            │
            ▼
 3) DASHBOARD - PENDING OVERTIME (GROUPED)
    Sistem otomatis mengelompokkan data per (Project + Email Approver)
    Dashboard menampilkan ringkasan: jumlah project, jumlah anggota, total jam
            │
            ▼
 4) "CREATE SESSION & SEND EMAIL"
    WFM klik tombol di dashboard untuk setiap grup yang belum dikirim
       -> Sistem membuat "approval session" + link unik (token)
       -> Email berisi link tersebut dikirim ke Approver (background queue)
            │
            ▼
 5) APPROVER MEMBUKA LINK (tanpa login)
    Approver melihat daftar overtime timnya, lalu memvalidasi dengan 2 metode:
       a. Per Nama  -> isi Billable/Non-Billable untuk setiap orang
       b. Total     -> isi Total Billable & Total Non-Billable untuk seluruh tim
                       (sistem otomatis membagi proporsional ke setiap orang)
            │
            ▼
 6) DATA BERPINDAH KE "HISTORY"
    Setelah disubmit, status record menjadi VALIDATED/APPROVED
    Muncul di halaman History, dikelompokkan per Project + Approver,
    bisa di-expand untuk lihat detail per nama
            │
            ▼
 7) DASHBOARD - SUMMARY & REPORTS
    Semua data (pending maupun yang sudah divalidasi) dirangkum menjadi:
       - Total Records, Pending, Validated, Approved
       - Total Jam Overtime, Billable, Non-Billable, Billable %
       - Breakdown per Project
       - Tren overtime harian (14 hari terakhir)
       - Status pengiriman email (Terkirim / Belum Dikirim)
```

---

## 5. Penjelasan Per Halaman (Frontend)

### a. Dashboard
Halaman utama setelah login. Terbagi 2 bagian besar:

1. **Approval Pending** — overtime yang *masih menunggu* dikirim/divalidasi.
   - 4 kartu ringkasan: Pending Groups, Total Projects, Total Members, Total Hours.
   - Tabel grup overtime + tombol **"Create Session & Send Email"**.
   - 3 grafik analitik: Ringkasan Overtime per Project, Tren Overtime harian,
     Status pengiriman email.
2. **Summary & Reports** — statistik *keseluruhan* (pending + sudah divalidasi),
   bisa difilter per periode tanggal upload.
   - Kartu Summary (Total Records, Validated, Billable Hours, dll).
   - Tabel & grafik breakdown per Project.

### b. Upload & Reports
- **Upload Data**: unggah file Excel data overtime baru, lihat daftar upload
  terakhir.
- **Email Logs**: riwayat pengiriman email approval (sukses/gagal).
- **History & Storage**: daftar file Excel yang pernah diupload + kelola
  penyimpanan file di server.
- **Danger Zone**: reset data transaksi (khusus admin, butuh konfirmasi password).

### c. History
- Menampilkan data overtime yang **sudah divalidasi/approved**, dikelompokkan
  per Project + Approver (satu baris = satu sesi approval).
- Klik baris untuk *expand* dan melihat detail per nama (NIP, jam OT, Billable,
  Non-Billable, remark).
- Menunjukkan metode validasi yang dipakai: **"Validasi Total"** atau
  **"Validasi Per Nama"**.
- Bisa download CSV dan hapus data history lama.

### d. User Management
- Kelola akun WFM/Admin yang bisa login ke sistem (tambah user, ubah role,
  reset password, ubah status aktif/nonaktif).

### e. Email Template
- Mengatur isi (subject & body) email reminder validasi yang dikirim ke Approver.

### f. Audit History
- Mencatat aktivitas penting di sistem (siapa upload, siapa kirim email, siapa
  reset data, dll) untuk keperluan audit/tracing.

### g. Approval Page (untuk Approver, tanpa login)
- Dibuka melalui link unik dari email.
- Menampilkan nama project, daftar anggota & jam overtime.
- Approver memilih metode validasi (Per Nama / Total), mengisi pembagian
  Billable & Non-Billable, lalu submit.

---

## 6. Apa yang Terjadi "Di Belakang Layar"

- **Login & Keamanan**: setiap user WFM login dengan email & password. Sistem
  memberikan "tiket akses" (token) yang dipakai setiap kali membuka halaman/
  data — sehingga tanpa login, data tidak bisa diakses.
- **Pengiriman Email**: ketika WFM klik "Create Session & Send Email", sistem
  tidak langsung mengirim email saat itu juga, melainkan menaruh tugas
  "kirim email" ke dalam **antrian (queue)**. Antrian ini akan mencoba mengirim
  email, dan jika gagal akan **dicoba ulang otomatis** (sampai 3x), sehingga
  proses di web tetap cepat dan tidak macet menunggu server email.
- **Approval Token**: setiap link approval bersifat unik dan acak (UUID),
  sehingga tidak bisa ditebak oleh pihak lain.
- **Validasi "Total"**: jika Approver memilih metode Total, sistem akan membagi
  Total Billable/Non-Billable yang diisi secara **proporsional** berdasarkan jam
  overtime masing-masing anggota — sehingga laporan per-orang maupun per-project
  tetap konsisten dengan angka total yang dimasukkan Approver.

---

## 7. Ringkasan Status Data

Setiap record overtime melewati status berikut:

```
PENDING  ──(approver submit approval)──►  VALIDATED + APPROVED
   │
   └─ muncul di Dashboard "Approval Pending"     └─ muncul di "History"
```

Status email pengiriman approval:

```
Belum Dikirim  ──(klik Create Session & Send Email)──►  Terkirim
                                                    └─► (jika sudah divalidasi) Sudah Divalidasi
```

---

## 8. Teknologi yang Digunakan (Ringkas, untuk Developer Baru)

- **Frontend**: React + Vite + Tailwind CSS (tampilan web, halaman Dashboard,
  Upload, History, dll).
- **Backend**: NestJS (Node.js) — menyediakan API untuk frontend, mengatur
  login, validasi data, dan logika bisnis.
- **Database**: PostgreSQL (schema `overtime`) — menyimpan data overtime, user,
  project, sesi approval, log email & audit.
- **Queue**: BullMQ + Redis — mengantrikan dan mengirim email approval secara
  asynchronous dengan retry otomatis.
- **Grafik**: Recharts — untuk visualisasi (donut chart, trend chart) di
  Dashboard.

---

## 9. Pertanyaan Umum (FAQ)

**Q: Approver harus install aplikasi atau punya akun?**
A: Tidak. Approver hanya menerima email berisi link, klik link tersebut, isi
form di browser, lalu submit.

**Q: Apa bedanya "Validasi Per Nama" dan "Validasi Total"?**
A:
- *Per Nama*: Approver mengisi Billable/Non-Billable untuk setiap anggota
  satu per satu.
- *Total*: Approver hanya mengisi total Billable & Non-Billable untuk seluruh
  tim sekaligus; sistem yang membagi secara proporsional ke masing-masing orang.

**Q: Kalau email belum terkirim, apakah datanya hilang?**
A: Tidak. Data tetap ada di status "Pending"/"Belum Dikirim", dan WFM bisa klik
ulang "Create Session & Send Email" kapan saja.

**Q: Bagaimana cara melihat berapa total jam overtime perusahaan bulan ini?**
A: Lihat bagian **Summary & Reports** di Dashboard, gunakan filter periode
tanggal untuk menyaring data sesuai kebutuhan.

**Q: Apakah data yang sudah divalidasi bisa dihapus?**
A: Bisa, melalui halaman History (tombol "Hapus Data Lama") atau Upload &
Reports > Danger Zone, namun disarankan untuk download CSV terlebih dahulu
sebagai backup karena tindakan ini tidak bisa dibatalkan.
