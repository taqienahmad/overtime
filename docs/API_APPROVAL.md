# API_APPROVAL.md

## Objective

Mengelola proses approval/validasi overtime oleh Approver (PIC/Manager Project).

---

## Approval Workflow

```text
Upload Excel
      ↓
Grouping by Project + Email Approver (GET /overtime/grouped)
      ↓
Generate Approval Token (POST /overtime/approval-session)
      ↓
Send Email (POST /overtime/send-email)
      ↓
Open Approval Portal (GET /overtime/approval/:token) — tanpa login
      ↓
Pilih Metode Validasi: Per Nama atau Total
      ↓
Submit Approval (POST /overtime/approval-submit/:token)
```

---

# Endpoint

## Get Pending Overtime

```http
GET /api/overtime/pending
```

Memerlukan login (JWT). Mengembalikan seluruh record dengan
`validation_type IS NULL` (belum divalidasi).

---

## Get Grouped Overtime

```http
GET /api/overtime/grouped
```

Memerlukan login (JWT) dengan role `ADMIN`. Mengelompokkan overtime yang
masih pending berdasarkan `project_name` + `employee_email` (approver),
beserta status pengiriman email & validasi terakhir.

---

## Get Daily Overtime Trend

```http
GET /api/overtime/trend?days=14
```

Memerlukan login (JWT) dengan role `ADMIN`. Mengembalikan total jam overtime
per hari (default 14 hari terakhir, berdasarkan `overtime_records.created_at`)
untuk grafik tren di Dashboard.

### Response

```json
{
  "success": true,
  "data": [
    { "date": "2026-06-01", "total_hours": 12 },
    { "date": "2026-06-02", "total_hours": 0 }
  ]
}
```

---

## Get Validation History

```http
GET /api/overtime/history
```

Memerlukan login (JWT) dengan role `ADMIN`. Mengembalikan seluruh record
yang sudah divalidasi (`validation_type IS NOT NULL`), termasuk informasi
sesi approval (`validation_method`, `session_total_billable_hours`,
`session_total_non_billable_hours`).

## Delete Validation History

```http
DELETE /api/overtime/history
```

Memerlukan login (JWT) dengan role `ADMIN`. Menghapus seluruh record yang
sudah divalidasi beserta `overtime_validations`-nya (tidak dapat dibatalkan).

---

## Create Approval Session

```http
POST /api/overtime/approval-session
```

Memerlukan login (JWT) dengan role `ADMIN`.

### Request

```json
{
  "email": "project91@email.com",
  "project": "Project91"
}
```

### Response

```json
{
  "success": true,
  "token": "uuid",
  "approvalUrl": "http://localhost:3000/approval/uuid",
  "data": { "id": 1, "approver_email": "...", "project_name": "...", "approval_token": "...", "status": "PENDING" }
}
```

---

## Get Approval Data

```http
GET /api/overtime/approval/:token
```

Endpoint publik (tanpa login), digunakan oleh halaman Approval Portal.
Mengembalikan daftar member overtime untuk project + approver terkait token,
serta `validationMethod`, `totalBillableHours`, `totalNonBillableHours` dari
sesi approval (jika sudah pernah disubmit).

---

## Submit Approval

```http
POST /api/overtime/approval-submit/:token
```

Endpoint publik (tanpa login); `approval_token` (UUID) adalah satu-satunya
bentuk otorisasi.

### Request — Metode "Per Nama" (`validationMethod = "PER_NAME"`)

```json
{
  "validationMethod": "PER_NAME",
  "validatorName": "Budi",
  "validatorDevice": "Chrome / Windows",
  "members": [
    {
      "id": 1,
      "billable_hours": 1,
      "non_billable_hours": 1,
      "remark": "optional, maks 1000 karakter"
    }
  ]
}
```

### Request — Metode "Total" (`validationMethod = "TOTAL"`)

```json
{
  "validationMethod": "TOTAL",
  "validatorName": "Budi",
  "validatorDevice": "Chrome / Windows",
  "totalBillableHours": 3,
  "totalNonBillableHours": 7,
  "members": [
    { "id": 1, "billable_hours": 0, "non_billable_hours": 0 },
    { "id": 2, "billable_hours": 0, "non_billable_hours": 0 }
  ]
}
```

Pada metode `TOTAL`, nilai `billable_hours`/`non_billable_hours` pada
`members` diabaikan untuk perhitungan — sistem membagi
`totalBillableHours`/`totalNonBillableHours` ke setiap member secara
**proporsional** berdasarkan `overtime_hours` masing-masing terhadap total OT
seluruh anggota, lalu menyimpan hasilnya ke
`overtime_records.billable_hours`/`non_billable_hours`. `members[].remark`
(jika diisi) tetap disimpan per record.

### Success Response

```json
{
  "success": true,
  "message": "Approval berhasil disubmit"
}
```

---

## Business Rules

### Rule 1 — Metode Per Nama

```text
Billable Hours + Non Billable Hours = Overtime Hours (per member)
```

Jika tidak sama, request ditolak dengan `400 Bad Request`.

### Rule 2 — Metode Total

```text
Total Billable Hours + Total Non Billable Hours
  = SUM(Overtime Hours) seluruh member pada project + approver tersebut
```

Jika tidak sama, request ditolak dengan `400 Bad Request`. Sisa pembulatan
dari pembagian proporsional dialokasikan ke member terakhir agar total tetap
konsisten dengan input Approver.

### Rule 3

Default value sebelum divalidasi:

```text
billable_hours = 0
non_billable_hours = 0
status = PENDING
```

### Rule 4

Setelah submit approval:

```text
overtime_records.status = VALIDATED
overtime_records.validation_type = APPROVED
overtime_approval_sessions.status = APPROVED
overtime_approval_sessions.validation_method = PER_NAME | TOTAL
```

Setiap perubahan dicatat ke `overtime.overtime_validations` sebagai audit
trail.

### Rule 5

Approval hanya dapat dilakukan menggunakan `approval_token` yang valid (UUID
yang tersimpan di `overtime_approval_sessions`).
