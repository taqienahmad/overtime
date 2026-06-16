# API_EMAIL.md

## Objective

Mengirim email approval/validasi overtime kepada Approver (PIC Project).

---

## Email Flow

```text
Admin klik "Create Session & Send Email"
        ↓
POST /api/overtime/approval-session  (generate token)
        ↓
POST /api/overtime/send-email
        ↓
Job ditambahkan ke queue BullMQ ("email")
        ↓
EmailProcessor mengambil job & memanggil EmailService
        ↓
Ambil template dari overtime.email_templates (name = approval_reminder)
        ↓
Ambil daftar CC & TO tambahan dari overtime.project_email_recipients
        ↓
Kirim email via Nodemailer (SMTP Gmail)
        ↓
Catat hasil ke overtime.email_logs (status SENT / FAILED)
```

Jika pengiriman gagal, BullMQ akan mencoba ulang otomatis hingga 3x dengan
exponential backoff (delay awal 5 detik).

---

## Endpoint

### Send Approval Email

```http
POST /api/overtime/send-email
```

Memerlukan login (JWT) dengan role `ADMIN`.

### Request

```json
{
  "email": "project91@email.com",
  "project": "Project91",
  "approvalUrl": "http://localhost:5173/approval/<token>"
}
```

| Field        | Type   | Keterangan                                        |
| ------------ | ------ | -------------------------------------------------- |
| email        | string | Email approver utama (penerima TO)                  |
| project      | string | Nama project, dipakai untuk lookup CC/TO tambahan   |
| approvalUrl  | string | Link approval portal berisi token, dibuat dari hasil `POST /api/overtime/approval-session` |

Endpoint ini **tidak langsung mengirim email** — request hanya menambahkan job
ke queue dan langsung mengembalikan response sukses.

### Success Response

```json
{
  "success": true,
  "message": "Email sedang diproses di background"
}
```

---

## CC & TO Tambahan

Selain `email` (TO utama), sistem otomatis menambahkan penerima dari tabel
`overtime.project_email_recipients` berdasarkan `project_name`:

- `type = 'TO'` → ditambahkan ke daftar penerima TO
- `type = 'CC'` → ditambahkan ke daftar CC

---

## Email Template

Subject & body email diambil dari tabel `overtime.email_templates`
(`name = 'approval_reminder'`), dapat diedit melalui halaman **Email Template**
di frontend. Placeholder yang didukung:

| Placeholder       | Diganti dengan                  |
| ----------------- | -------------------------------- |
| `{Project Name}`  | Nama project                     |
| `{Approval Link}` | URL approval portal (`approvalUrl`) |

Body disimpan sebagai plain text dengan newline (`\n`), dan dikonversi menjadi
`<br>` saat dikirim sebagai email HTML.

---

## Technology

```text
Nodemailer (SMTP Gmail, kredensial dari MAIL_USER / MAIL_PASSWORD)
BullMQ + Redis (queue "email", retry otomatis 3x, exponential backoff)
```

---

## Email Logs

Setiap percobaan pengiriman (sukses maupun gagal) dicatat ke tabel
`overtime.email_logs` dengan kolom `recipient`, `subject`, `status`
(`SENT`/`FAILED`), `error_message`, `reference_id` (id
`overtime_approval_sessions`), `sent_at`. Riwayat ini dapat dilihat melalui
`GET /api/reports/email-logs` (halaman **Upload & Reports > Email Logs**).
