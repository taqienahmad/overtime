import { useEffect, useState } from "react";
import {
  UploadCloud,
  Mail,
  History as HistoryIcon,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";
import overtimeApi from "../services/overtimeApi";
import reportsApi from "../services/reportsApi";
import emailScheduleApi from "../services/emailScheduleApi";
import usersApi from "../services/usersApi";
import auditApi from "../services/auditApi";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  StatCard,
  Table,
  thClass,
  tdClass,
} from "../components/ui";
import ResetDatabaseModal from "../components/ResetDatabaseModal";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

const ROLES = ["ADMIN", "WFM", "OPERATIONAL_MANAGER", "UNIT_MANAGER"];
const STATUSES = ["ACTIVE", "INACTIVE"];
const ROLE_LABELS = {
  ADMIN: "Admin",
  WFM: "WFM",
  OPERATIONAL_MANAGER: "Operational Manager",
  UNIT_MANAGER: "Unit Manager",
};

const TABS = [
  { id: "upload", label: "Upload Data", icon: UploadCloud },
  { id: "email-logs", label: "Email Logs", icon: Mail },
  { id: "history", label: "History & Storage", icon: HistoryIcon },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
  { id: "auto-email", label: "Auto Email Schedule", icon: Clock },
  { id: "users", label: "User Management", icon: Users },
  { id: "audit", label: "Audit History", icon: ShieldCheck },
];

export default function UploadPage() {
  const [tab, setTab] = useState("upload");

  // Upload state
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // Reports state
  const [emailLogs, setEmailLogs] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [storage, setStorage] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Auto email schedule state
  const [schedule, setSchedule] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleRunning, setScheduleRunning] = useState(false);

  // User management state
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "WFM",
  });

  // Audit history state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(20);
  const [auditAction, setAuditAction] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadReports();
    loadSchedule();
    loadUsers();
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [auditPage]);

  async function loadSchedule() {
    try {
      const res = await emailScheduleApi.getSchedule();
      setSchedule(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat jadwal email otomatis.");
    }
  }

  function toggleScheduleDay(day) {
    setSchedule((prev) => {
      const days = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day];

      return { ...prev, days_of_week: days };
    });
  }

  async function handleSaveSchedule() {
    setError("");
    setMessage("");
    setScheduleSaving(true);

    try {
      const res = await emailScheduleApi.updateSchedule({
        enabled: schedule.enabled,
        daysOfWeek: schedule.days_of_week,
        hour: Number(schedule.hour),
        minute: Number(schedule.minute),
        timezone: schedule.timezone,
      });

      setSchedule(res.data.data);
      setMessage("Jadwal email otomatis berhasil disimpan.");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan jadwal.");
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleRunScheduleNow() {
    setError("");
    setMessage("");
    setScheduleRunning(true);

    try {
      const res = await emailScheduleApi.runNow();
      setMessage(
        `Pengiriman manual selesai: ${res.data.sentCount} email dikirim, ${res.data.skippedCount} dilewati (tanpa email approver), dari ${res.data.totalGroups} grup pending.`
      );
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menjalankan pengiriman.");
    } finally {
      setScheduleRunning(false);
    }
  }

  async function loadReports() {
    try {
      const [emailLogsRes, uploadsRes, storageRes] = await Promise.all([
        reportsApi.getEmailLogs(),
        reportsApi.getUploads(),
        reportsApi.getStorage(),
      ]);

      setEmailLogs(emailLogsRes.data);
      setUploads(uploadsRes.data.data);
      setStorage(storageRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data laporan.");
    }
  }

  async function handleDownloadTemplate() {
    setError("");

    try {
      const result = await overtimeApi.downloadUploadTemplate();
      const blob = new Blob([result.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "overtime_upload_template.xlsx";
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengunduh template.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setUploadResult(null);

    if (!file) {
      setError("Pilih file Excel terlebih dahulu.");
      return;
    }

    try {
      const response = await overtimeApi.uploadExcel(file);
      setUploadResult(response.data);
      loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Upload gagal.");
    }
  }

  async function handleDeleteFile(fileName) {
    if (!window.confirm(`Hapus file "${fileName}" dari storage?`)) return;

    try {
      await reportsApi.deleteStorageFile(fileName);
      const storageRes = await reportsApi.getStorage();
      setStorage(storageRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menghapus file.");
    }
  }

  async function handleResetDatabase(password) {
    setError("");
    setMessage("");

    try {
      await reportsApi.resetDatabase(password);
      setMessage("Data transaksi berhasil dibersihkan.");
      setShowResetModal(false);
      loadReports();
    } catch (err) {
      throw new Error(err.response?.data?.message || "Gagal membersihkan data.");
    }
  }

  async function loadUsers() {
    try {
      const result = await usersApi.getAll();
      setUsers(result.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data user.");
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await usersApi.create(userForm);
      setMessage(`User ${userForm.email} berhasil dibuat.`);
      setUserForm({ name: "", email: "", password: "", role: "WFM" });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal membuat user.");
    }
  }

  async function handleRoleChange(user, role) {
    setError("");
    setMessage("");

    try {
      await usersApi.update(user.id, { role });
      setMessage(`Role ${user.email} diubah ke ${role}.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengubah role.");
    }
  }

  async function handleStatusChange(user, status) {
    setError("");
    setMessage("");

    try {
      await usersApi.update(user.id, { status });
      setMessage(`Status ${user.email} diubah ke ${status}.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengubah status.");
    }
  }

  async function handleResetPassword(user) {
    const newPassword = window.prompt(
      `Masukkan password baru untuk ${user.email} (minimal 6 karakter):`
    );

    if (!newPassword) return;

    setError("");
    setMessage("");

    try {
      await usersApi.resetPassword(user.id, newPassword);
      setMessage(`Password ${user.email} berhasil direset.`);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal reset password.");
    }
  }

  async function loadAuditLogs() {
    try {
      const params = { page: auditPage, limit: auditLimit };
      if (auditAction) params.action = auditAction;

      const result = await auditApi.getAll(params);
      setAuditLogs(result.data.data);
      setAuditTotal(result.data.total);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat audit log.");
    }
  }

  function handleAuditFilter() {
    setAuditPage(1);
    loadAuditLogs();
  }

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));

  return (
    <div>
      <PageHeader title="Upload & Settings" subtitle="Kelola data overtime dan pantau laporan sistem" />

      <Alert type="error">{error}</Alert>
      <Alert type="success">{message}</Alert>

      {/* Tab navigation */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-red-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="space-y-4">
          <Card title="Upload Data Overtime" subtitle="Unggah file Excel berisi data overtime karyawan">
            <p className="mb-3 text-sm text-slate-500">
              Format kolom Excel: <strong>NIP</strong>, <strong>Nama</strong>,{" "}
              <strong>Email Address</strong>, <strong>Project</strong>,{" "}
              <strong>Total Overtime (Hours)</strong>, dan <strong>Periode Overtime</strong>{" "}
              (contoh: "01-15 Juni 2026"). Download template di bawah ini untuk memastikan
              format sesuai sebelum diisi dan diupload kembali.
            </p>

            <div className="mb-4">
              <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
                Download Template Excel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-sm text-slate-700"
              />
              <Button type="submit">Upload</Button>
            </form>

            {uploadResult && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={20} className="flex-shrink-0" />
                <div>
                  <p className="font-medium">Upload berhasil!</p>
                  <p>
                    File: {uploadResult.fileName} &middot; Total Baris: {uploadResult.totalRows} &middot;{" "}
                    Berhasil Diinput: {uploadResult.inserted}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card title="Upload Terbaru" subtitle="5 file terakhir yang diupload">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>File Name</th>
                  <th className={thClass}>Uploaded By</th>
                  <th className={thClass}>Uploaded At</th>
                  <th className={thClass}>Total Records</th>
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 5).map((upload) => (
                  <tr key={upload.id}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-slate-400" />
                        {upload.file_name}
                      </div>
                    </td>
                    <td className={tdClass}>{upload.uploaded_by}</td>
                    <td className={tdClass}>{new Date(upload.uploaded_at).toLocaleString()}</td>
                    <td className={tdClass}>{upload.total_records}</td>
                  </tr>
                ))}
                {uploads.length === 0 && (
                  <tr>
                    <td className={tdClass} colSpan={4}>
                      Belum ada upload.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {tab === "email-logs" && (
        <div className="space-y-4">
          {emailLogs && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard
                  label="Total Email"
                  value={emailLogs.stats.total}
                  icon={<Mail size={22} />}
                  accent="black"
                />
                <StatCard
                  label="Sent"
                  value={emailLogs.stats.sent_count}
                  icon={<CheckCircle2 size={22} />}
                  accent="green"
                />
                <StatCard
                  label="Failed"
                  value={emailLogs.stats.failed_count}
                  icon={<AlertTriangle size={22} />}
                  accent="red"
                />
              </div>

              <Card title="Email Logs">
                <Table>
                  <thead>
                    <tr>
                      <th className={thClass}>Recipient</th>
                      <th className={thClass}>Subject</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Error</th>
                      <th className={thClass}>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.recent.map((log) => (
                      <tr key={log.id}>
                        <td className={tdClass}>{log.recipient}</td>
                        <td className={tdClass}>{log.subject}</td>
                        <td className={tdClass}>
                          <Badge color={log.status === "SENT" ? "green" : "red"}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className={tdClass}>{log.error_message || "-"}</td>
                        <td className={tdClass}>{new Date(log.sent_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <Card title="Upload History">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>File Name</th>
                  <th className={thClass}>Uploaded By</th>
                  <th className={thClass}>Uploaded At</th>
                  <th className={thClass}>Total Records</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id}>
                    <td className={tdClass}>{upload.file_name}</td>
                    <td className={tdClass}>{upload.uploaded_by}</td>
                    <td className={tdClass}>{new Date(upload.uploaded_at).toLocaleString()}</td>
                    <td className={tdClass}>{upload.total_records}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {storage && (
            <Card title="Storage (uploads/)" subtitle={`Total Files: ${storage.totalFiles} | Total Size: ${formatBytes(storage.totalSizeBytes)}`}>
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                <HardDrive size={16} />
                Kelola file Excel yang tersimpan di server
              </div>
              <Table>
                <thead>
                  <tr>
                    <th className={thClass}>File Name</th>
                    <th className={thClass}>Size</th>
                    <th className={thClass}>Modified At</th>
                    <th className={thClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {storage.files.map((file) => (
                    <tr key={file.name}>
                      <td className={tdClass}>{file.name}</td>
                      <td className={tdClass}>{formatBytes(file.sizeBytes)}</td>
                      <td className={tdClass}>{new Date(file.modifiedAt).toLocaleString()}</td>
                      <td className={tdClass}>
                        <Button variant="danger" onClick={() => handleDeleteFile(file.name)}>
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {tab === "auto-email" && schedule && (
        <div className="space-y-4">
          <Card
            title="Auto Email Schedule"
            subtitle="Kirim otomatis 'Create Session & Send Email' untuk semua grup overtime pending sesuai jadwal."
          >
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                  schedule.enabled ? "bg-red-700" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    schedule.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {schedule.enabled ? "Aktif" : "Tidak Aktif"}
                </div>
                <div className="text-xs text-slate-500">
                  Jika aktif, sistem akan otomatis mengirim email approval untuk semua project
                  yang masih pending pada hari & jam yang dipilih.
                </div>
              </div>
            </div>

            <div className="mb-4">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Hari Pengiriman
              </span>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleScheduleDay(day.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      schedule.days_of_week.includes(day.value)
                        ? "bg-black text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Jam</span>
                <Select
                  value={schedule.hour}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, hour: e.target.value }))}
                  className="w-24"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Menit</span>
                <Select
                  value={schedule.minute}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, minute: e.target.value }))}
                  className="w-24"
                >
                  {Array.from({ length: 60 }, (_, m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Zona Waktu</span>
                <Select
                  value={schedule.timezone}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-48"
                >
                  <option value="Asia/Jakarta">WIB - Asia/Jakarta</option>
                  <option value="Asia/Makassar">WITA - Asia/Makassar</option>
                  <option value="Asia/Jayapura">WIT - Asia/Jayapura</option>
                </Select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSaveSchedule} disabled={scheduleSaving}>
                {scheduleSaving ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
              <Button variant="secondary" onClick={handleRunScheduleNow} disabled={scheduleRunning}>
                {scheduleRunning ? "Mengirim..." : "Kirim Sekarang (Test)"}
              </Button>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {schedule.last_run_date && (
                <p>Terakhir dijalankan otomatis: {schedule.last_run_date}</p>
              )}
              {schedule.updated_at && (
                <p>
                  Terakhir diubah: {new Date(schedule.updated_at).toLocaleString()}
                  {schedule.updated_by ? ` oleh ${schedule.updated_by}` : ""}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "danger" && (
        <div className="space-y-4">
          <Card title="Danger Zone" className="border border-red-200">
            <p className="mb-3 text-sm text-slate-600">
              Reset data transaksi (overtime records, uploads, approval sessions, validations,
              email logs, audit logs). Data user, project, dan email template tidak terhapus.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <Button variant="danger" onClick={() => setShowResetModal(true)}>
              Reset Data Transaksi
            </Button>
          </Card>

          {showResetModal && (
            <ResetDatabaseModal
              onConfirm={handleResetDatabase}
              onCancel={() => setShowResetModal(false)}
            />
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <Card title="Tambah User">
            <form onSubmit={handleCreateUser} className="flex flex-wrap items-end gap-3">
              <Input
                placeholder="Nama"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
              <Input
                placeholder="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required
                minLength={6}
              />
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <Button type="submit">Tambah</Button>
            </form>
          </Card>

          <Card title="Daftar User">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Nama</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Dibuat</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className={tdClass}>{user.name}</td>
                    <td className={tdClass}>{user.email}</td>
                    <td className={tdClass}>
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <Badge color={user.status === "ACTIVE" ? "green" : "red"}>
                          {user.status}
                        </Badge>
                        <Select
                          value={user.status}
                          onChange={(e) => handleStatusChange(user, e.target.value)}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className={tdClass}>{new Date(user.created_at).toLocaleString()}</td>
                    <td className={tdClass}>
                      <Button variant="secondary" onClick={() => handleResetPassword(user)}>
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-sm text-slate-600">
                Action
                <Input
                  placeholder="contoh: LOGIN, UPLOAD_EXCEL"
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                />
              </label>
              <Button onClick={handleAuditFilter}>Filter</Button>
              {auditAction && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAuditAction("");
                    setAuditPage(1);
                    loadAuditLogs();
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            <Table>
              <thead>
                <tr>
                  <th className={thClass}>Waktu</th>
                  <th className={thClass}>User</th>
                  <th className={thClass}>Action</th>
                  <th className={thClass}>Reference Table</th>
                  <th className={thClass}>Reference ID</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={tdClass}>{new Date(log.created_at).toLocaleString()}</td>
                    <td className={tdClass}>{log.user_email || "-"}</td>
                    <td className={tdClass}>{log.action}</td>
                    <td className={tdClass}>{log.reference_table || "-"}</td>
                    <td className={tdClass}>{log.reference_id ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="secondary"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(auditPage - 1)}
              >
                Prev
              </Button>
              <span className="text-sm text-slate-600">
                Page {auditPage} of {auditTotalPages} ({auditTotal} total)
              </span>
              <Button
                variant="secondary"
                disabled={auditPage >= auditTotalPages}
                onClick={() => setAuditPage(auditPage + 1)}
              >
                Next
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
