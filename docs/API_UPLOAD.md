# API_UPLOAD.md

## Objective

API untuk mengunggah file overtime Excel dan menyimpan data ke PostgreSQL.

---

## Endpoint

### Download Template Excel

```http
GET /api/overtime/upload-template
```

Memerlukan login (JWT) dengan role `ADMIN`. Mengembalikan file `.xlsx` berisi
kolom header yang harus diisi sebelum diupload.

### Upload Excel

```http
POST /api/overtime/upload
```

Memerlukan login (JWT) dengan role `ADMIN`.

Content-Type:

```text
multipart/form-data
```

---

## Request

| Parameter | Type       | Required |
| --------- | ---------- | -------- |
| file      | Excel File | Yes      |

### Kolom Excel

| Kolom                     | Disimpan ke                         | Wajib |
| ------------------------- | ------------------------------------ | ----- |
| NIP                        | `overtime_records.nip`                | Tidak |
| Nama                       | `overtime_records.employee_name`      | Ya    |
| Email Address              | `overtime_records.employee_email`     | Tidak (lihat catatan auto-fill) |
| Project                    | `overtime_records.project_name`       | Ya    |
| Total Overtime (Hours)     | `overtime_records.overtime_hours`      | Ya    |
| Periode Overtime           | `overtime_records.overtime_period`     | Tidak |

> Catatan auto-fill email: jika kolom **Email Address** kosong, sistem akan
> mencoba mengisi `employee_email` dari `overtime.project_email_recipients`
> (`type = 'TO'`) berdasarkan nama project.

---

## Process Flow

```text
User Upload Excel (via halaman Upload Data)
        ↓
NestJS baca file Excel (ExcelService)
        ↓
Insert overtime_uploads (file_name, uploaded_by)
        ↓
Untuk setiap baris:
  - jika Email Address kosong -> cari dari project_email_recipients (TO)
  - Insert overtime_records (status PENDING, billable_hours/non_billable_hours = 0)
        ↓
Audit log "UPLOAD_EXCEL"
        ↓
Return Upload Result
```

---

## Database Tables

### overtime_uploads

Menyimpan informasi file yang diupload (`file_name`, `uploaded_by`, `uploaded_at`).

### overtime_records

Menyimpan data overtime setiap member, termasuk `nip`, `overtime_period`,
`status` (`PENDING` saat baru diupload), `billable_hours`/`non_billable_hours`
(default 0, diisi saat approval).

---

## Success Response

```json
{
  "success": true,
  "uploadId": 12,
  "fileName": "dummy_ot.xlsx",
  "totalRows": 13,
  "inserted": 13
}
```

---

## Error Response

```json
{
  "success": false,
  "message": "File tidak ditemukan"
}
```
