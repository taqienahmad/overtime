# Materi Sosialisasi — Overtime System Management

> Dokumen ini berisi outline & narasi per slide yang bisa langsung dipindahkan
> ke PowerPoint. Setiap bagian = 1 slide. Screenshot ada di folder
> `docs/screenshots/`.

---

## Slide 1 — Cover

**Judul:** Sosialisasi Penggunaan Overtime System Management
**Sub judul:** Aplikasi Pengelolaan & Approval Overtime Karyawan
**Catatan:** Logo perusahaan, nama presenter, tanggal sosialisasi.

---

## Slide 2 — Latar Belakang

**Judul:** Mengapa Kita Butuh Sistem Ini?

Proses overtime selama ini dilakukan manual:
- Data overtime dikirim via Excel melalui email
- Approval/validasi Billable vs Non-Billable dilakukan manual oleh PM/Approver
- Rekap & laporan dibuat manual setiap bulan

**Masalah:** rawan human error, sulit tracking status, tidak ada histori/audit
trail yang rapi.

**Solusi:** Overtime System Management — satu aplikasi web terpusat untuk
upload data, distribusi approval, validasi, histori, dan laporan.

---

## Slide 3 — Komponen Sistem

| Komponen | Fungsi |
|---|---|
| **Frontend (Web App)** | Tampilan yang dibuka WFM/Admin — upload data, dashboard, approval, history |
| **Backend (API)** | Mengolah data, menyimpan ke database, mengirim email, autentikasi |
| **Database (PostgreSQL)** | Menyimpan data overtime, user, project, history validasi |
| **Email Queue** | Mengirim email approval otomatis di belakang layar (dengan retry) |

---

## Slide 4 — Peran Pengguna (User Roles)

| Role | Akses |
|---|---|
| **ADMIN / WFM** | Login ke web app — upload data, kelola user, kelola email template, kirim approval, lihat dashboard, laporan, audit log |
| **Approver (PIC Project)** | **Tidak perlu login** — cukup klik link unik dari email untuk validasi overtime timnya |

---

## Slide 5 — Alur Kerja End-to-End

**Judul:** Alur Proses Overtime, dari Upload hingga Laporan

```
1. WFM upload Excel (Nama, NIP, Email, Project, Total OT, Periode)
        │
2. Data masuk dengan status "PENDING"
        │
3. Sistem mengelompokkan otomatis per Project + Approver
        │
4. WFM klik "Create Session & Send Email" → email approval terkirim
        │
5. Approver klik link → validasi (Per Nama / Total: Billable vs Non-Billable)
        │
6. Data pindah ke "History" (status VALIDATED/APPROVED)
        │
7. Dashboard Summary & Reports menampilkan rekap keseluruhan
```

---

## Slide 6 — Halaman Login

**Screenshot:** `screenshots/01-login.png`

**Penjelasan:**
- Setiap user WFM/Admin login menggunakan **email & password**.
- Setelah login berhasil, sistem memberikan token akses yang dipakai untuk
  mengakses seluruh halaman & data.
- Tanpa login, data tidak bisa diakses sama sekali.

---

## Slide 7 — Dashboard: Approval Pending

**Screenshot:** `screenshots/02-dashboard.png` (bagian atas)

**Penjelasan:**
- Halaman utama setelah login, menampilkan overtime yang **masih menunggu
  dikirim/divalidasi**.
- 4 kartu ringkasan: **Pending Groups, Total Projects, Total Members, Total
  Hours**.
- Tabel grup overtime (dikelompokkan per Project + Approver) dengan tombol
  **"Create Session & Send Email"** — sekali klik untuk membuat link approval
  dan mengirim email ke PM/Approver.
- 3 grafik analitik: ringkasan overtime per project, tren overtime harian, dan
  status pengiriman email.

---

## Slide 8 — Dashboard: Summary & Reports

**Screenshot:** `screenshots/02-dashboard.png` (bagian bawah)

**Penjelasan:**
- Statistik **keseluruhan** (pending + sudah divalidasi), bisa difilter
  berdasarkan **periode tanggal upload**.
- Kartu Summary: Total Records, Pending, Validated, Approved, Total OT Hours,
  Billable Hours, Non-Billable Hours, Billable %.
- Tabel & grafik breakdown per Project — memudahkan manajemen memantau beban
  overtime tiap project.

---

## Slide 9 — Upload & Reports

**Screenshot:** `screenshots/03-upload.png`

**Penjelasan:**
- **Upload Data**: unggah file Excel data overtime baru. Format kolom: NIP,
  Nama, Email Address, Project, Total Overtime (Hours), Periode Overtime.
- Tersedia tombol **Download Template Excel** agar format selalu sesuai.
- **Upload Terbaru**: daftar file yang baru diupload, beserta jumlah record.
- Tab lain di halaman ini:
  - **Email Logs** — riwayat pengiriman email approval (sukses/gagal)
  - **History & Storage** — kelola file Excel yang pernah diupload
  - **Danger Zone** — reset data transaksi (khusus admin, perlu konfirmasi password)

---

## Slide 10 — History (Histori Validasi/Approval)

**Screenshot:** `screenshots/04-history.png`

**Penjelasan:**
- Menampilkan data overtime yang **sudah divalidasi/approved**, dikelompokkan
  per Project + Approver Email.
- Klik baris untuk **expand** dan melihat detail per nama (NIP, jam OT,
  Billable, Non-Billable, remark).
- Kolom **Metode Validasi** menunjukkan apakah Approver memvalidasi **Per
  Nama** atau **Total**.
- Tersedia tombol **Download CSV** dan **Hapus Data Lama** (dengan
  konfirmasi, sebaiknya download dulu sebagai backup).

---

## Slide 11 — User Management

**Screenshot:** `screenshots/05-users.png`

**Penjelasan:**
- Khusus untuk akun yang bisa login ke aplikasi (role ADMIN/WFM).
- **Tambah User**: input Nama, Email, Password, dan Role.
- **Daftar User**: kelola role, status (Active/Inactive), serta tombol
  **Reset Password**.
- Approver/PIC project **tidak perlu** akun di sini — mereka cukup menerima
  email link approval.

---

## Slide 12 — Email Template

**Screenshot:** `screenshots/06-email-template.png`

**Penjelasan:**
- Mengatur **subject & body** email reminder validasi yang dikirim ke
  Approver.
- Gunakan placeholder `{Project Name}` dan `{Approval Link}` agar otomatis
  terisi nama project dan link approval saat email dikirim.
- Daftar **Projects** di sisi kiri untuk mengatur penerima (TO/CC) per
  project — termasuk fitur **Bulk Import Recipient**.

---

## Slide 13 — Audit History

**Screenshot:** `screenshots/07-audit-logs.png`

**Penjelasan:**
- Mencatat seluruh aktivitas penting di sistem: LOGIN, UPLOAD_EXCEL,
  CREATE_APPROVAL_SESSION, SEND_APPROVAL_EMAIL, SUBMIT_APPROVAL,
  UPDATE_EMAIL_TEMPLATE, RESET_TRANSACTIONAL_DATA, dll.
- Mencatat **waktu**, **user**, **action**, serta **referensi tabel/ID**
  terkait — penting untuk keperluan audit dan tracing jika ada masalah data.
- Bisa difilter berdasarkan jenis action.

---

## Slide 14 — Approval Page: Tampilan Awal & Validasi Per Nama

**Screenshot:** `screenshots/08-approval-form.png`

**Penjelasan:**
- Approver **tidak perlu login** — cukup klik link unik (token acak/UUID)
  yang dikirim via email (contoh: `.../approval/db19511f-ce23-4676-bd38-...`).
- Halaman menampilkan **Nama Project**, **Email Approver**, dan tabel daftar
  anggota beserta **OT Total** (jam overtime) masing-masing.
- Tersedia 2 pilihan **Metode Validasi**: **Validasi Per Nama** (default) dan
  **Validasi Total**.
- Kolom **Billable** dan **Non Billable** akan otomatis terisi sesuai data
  yang sudah pernah divalidasi sebelumnya (jika ada).
- Jika sudah pernah disubmit, akan muncul badge **"Sudah Divalidasi"** di
  kanan atas dan tombol berubah menjadi **"Update Approval"** — Approver masih
  bisa mengedit ulang bila ada kesalahan.

---

## Slide 15 — Approval Page: Mengisi Form (Validasi Per Nama)

**Screenshot:** `screenshots/09-approval-filled-per-nama.png`

**Penjelasan langkah pengisian:**
1. Isi **"Nama Anda (Validator)"** — nama PM/Approver yang melakukan validasi.
2. Untuk setiap baris anggota, isi kolom **Billable** dan **Non Billable**.
   - **Aturan penting:** `Billable + Non Billable` harus **sama persis**
     dengan nilai **OT Total** pada baris tersebut. Jika tidak sama, sistem
     akan menampilkan pesan error saat submit.
3. Kolom **Remark** (opsional) — isi penjelasan tambahan, misalnya alasan
   kategori billable/non-billable.
4. Setelah semua baris terisi sesuai, klik **"Submit Approval"** /
   **"Update Approval"**.

---

## Slide 16 — Approval Page: Validasi Total

**Screenshot:** `screenshots/10-approval-validasi-total.png`

**Penjelasan:**
- Jika Approver memilih **"Validasi Total"**, kolom Billable/Non Billable per
  anggota menjadi **terkunci** (tidak bisa diisi manual satu-satu).
- Approver hanya mengisi 2 angka di bagian atas: **Total Billable** dan
  **Total Non Billable** untuk **seluruh project**.
- Sistem menampilkan 4 kartu bantuan:
  - **Total OT** — total jam overtime seluruh anggota (harus jadi acuan)
  - **Total Billable** — sesuai input
  - **Total Non Billable** — sesuai input
  - **Belum Teridentifikasi** — selisih yang masih harus diisi (harus
    menjadi **0**, ditandai warna **hijau**, sebelum bisa submit)
- Setelah total cocok (Belum Teridentifikasi = 0), sistem akan **membagi
  secara proporsional** ke setiap anggota berdasarkan jam overtime
  masing-masing, lalu Approver klik **"Submit Approval"**.
- Setelah submit, data otomatis berpindah ke halaman **History** dan dapat
  dipantau oleh Admin/WFM.

---

## Slide 17 — Hal Penting di Balik Layar

- **Keamanan login**: token akses diperlukan untuk membuka semua halaman/data.
- **Email Queue**: pengiriman email tidak langsung (real-time), tapi masuk
  antrian dan otomatis dicoba ulang hingga 3x jika gagal — proses di web tetap
  cepat.
- **Approval Token**: setiap link approval unik dan acak (UUID), tidak bisa
  ditebak pihak lain.
- **Validasi "Total"**: dibagi proporsional berdasarkan jam overtime tiap
  anggota agar laporan tetap konsisten dengan angka total yang diisi Approver.

---

## Slide 18 — FAQ

**Q: Approver harus install aplikasi atau punya akun?**
A: Tidak. Cukup klik link di email, isi form, submit.

**Q: Apa beda "Validasi Per Nama" dan "Validasi Total"?**
A: Per Nama = isi satu-satu per anggota. Total = isi total tim, sistem bagi
otomatis secara proporsional.

**Q: Kalau email belum terkirim, data hilang?**
A: Tidak. Data tetap "Pending"/"Belum Dikirim", WFM bisa klik ulang "Create
Session & Send Email" kapan saja.

**Q: Bisa lihat total jam overtime perusahaan bulan ini?**
A: Bisa, lihat Dashboard > Summary & Reports, gunakan filter periode tanggal.

**Q: Data yang sudah divalidasi bisa dihapus?**
A: Bisa, lewat History atau Upload & Reports > Danger Zone — disarankan
download CSV dulu sebagai backup karena tidak bisa dibatalkan.

---

## Slide 19 — Penutup

- Ringkasan benefit: proses lebih cepat, transparan, terdokumentasi
  (audit trail), dan minim human error.
- Kontak/PIC untuk pertanyaan & dukungan teknis.
- Sesi tanya jawab.
