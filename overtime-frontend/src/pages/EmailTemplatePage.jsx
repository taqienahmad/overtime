import { useEffect, useMemo, useState } from "react";
import { Mail, UploadCloud, FolderKanban, Plus, Search } from "lucide-react";
import emailTemplateApi from "../services/emailTemplateApi";
import projectRecipientsApi from "../services/projectRecipientsApi";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Textarea,
} from "../components/ui";

function parseEmails(text) {
  return Array.from(
    new Set(
      text
        .split(/[\n,;]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    )
  );
}

const VIEW_TEMPLATE = "__template__";
const VIEW_BULK_IMPORT = "__bulk_import__";
const VIEW_NEW_PROJECT = "__new_project__";

export default function EmailTemplatePage() {
  const [view, setView] = useState(VIEW_TEMPLATE);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Email template state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Project recipients state
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({ project_name: "", to: "", cc: "" });
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    loadTemplate();
    loadRecipients();
  }, []);

  async function loadTemplate() {
    try {
      const result = await emailTemplateApi.getApprovalReminder();
      setSubject(result.data.data.subject);
      setBody(result.data.data.body);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat template email.");
    }
  }

  async function loadRecipients() {
    try {
      const result = await projectRecipientsApi.getAll();
      setRecipients(result.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data recipient.");
    }
  }

  const groups = useMemo(() => {
    return recipients.reduce((acc, row) => {
      if (!acc[row.project_name]) {
        acc[row.project_name] = { to: [], cc: [] };
      }
      acc[row.project_name][row.type.toLowerCase()].push(row);
      return acc;
    }, {});
  }, [recipients]);

  const projectNames = useMemo(() => {
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .filter((name) => name.toLowerCase().includes(search.toLowerCase()));
  }, [groups, search]);

  async function handleSaveTemplate(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await emailTemplateApi.updateApprovalReminder({ subject, body });
      setMessage("Template email berhasil disimpan.");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan template email.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const toEmails = parseEmails(form.to);
    const ccEmails = parseEmails(form.cc);

    if (toEmails.length === 0 && ccEmails.length === 0) {
      setError("Masukkan minimal satu email TO atau CC.");
      return;
    }

    const jobs = [
      ...toEmails.map((email) => ({ project_name: form.project_name, email, type: "TO" })),
      ...ccEmails.map((email) => ({ project_name: form.project_name, email, type: "CC" })),
    ];

    const results = await Promise.allSettled(
      jobs.map((dto) => projectRecipientsApi.create(dto))
    );

    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0 && failed.length < results.length) {
      setMessage(
        `${results.length - failed.length} email berhasil ditambahkan, ${failed.length} gagal (mungkin sudah terdaftar).`
      );
    } else if (failed.length === results.length) {
      setError("Gagal menambahkan email (mungkin sudah terdaftar).");
    } else {
      setMessage(`${results.length} email berhasil ditambahkan untuk project ${form.project_name}.`);
    }

    const projectName = form.project_name;
    setForm({ project_name: "", to: "", cc: "" });
    setView(projectName);
    loadRecipients();
  }

  async function handleDelete(id) {
    if (!window.confirm("Hapus recipient ini?")) return;

    setError("");
    setMessage("");

    try {
      await projectRecipientsApi.remove(id);
      loadRecipients();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menghapus recipient.");
    }
  }

  async function handleDownloadTemplate() {
    setError("");

    try {
      const result = await projectRecipientsApi.downloadTemplate();
      const blob = new Blob([result.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "project_recipients_template.xlsx";
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengunduh template.");
    }
  }

  async function handleBulkUpload(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!uploadFile) {
      setError("Pilih file Excel terlebih dahulu.");
      return;
    }

    try {
      const result = await projectRecipientsApi.bulkUpload(uploadFile);
      const { inserted, skipped, errors } = result.data;

      let summary = `${inserted} email berhasil ditambahkan, ${skipped} dilewati (sudah ada).`;
      if (errors.length > 0) {
        summary += ` ${errors.length} baris error: ${errors.join("; ")}`;
      }

      setMessage(summary);
      setUploadFile(null);
      loadRecipients();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengupload file.");
    }
  }

  function selectProject(name) {
    setError("");
    setMessage("");
    setForm({ project_name: name, to: "", cc: "" });
    setView(name);
  }

  function selectNewProject() {
    setError("");
    setMessage("");
    setForm({ project_name: "", to: "", cc: "" });
    setView(VIEW_NEW_PROJECT);
  }

  const sidebarItemClass = (active) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
      active ? "bg-red-700 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div>
      <PageHeader title="Email Template" />

      <Alert type="error">{error}</Alert>
      <Alert type="success">{message}</Alert>

      <div className="flex gap-4">
        {/* Sidebar (Outlook-style folder list) */}
        <div className="w-64 flex-shrink-0 rounded-xl border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            <button
              type="button"
              className={sidebarItemClass(view === VIEW_TEMPLATE)}
              onClick={() => setView(VIEW_TEMPLATE)}
            >
              <Mail size={16} />
              Template Reminder
            </button>
            <button
              type="button"
              className={sidebarItemClass(view === VIEW_BULK_IMPORT)}
              onClick={() => setView(VIEW_BULK_IMPORT)}
            >
              <UploadCloud size={16} />
              Bulk Import Recipient
            </button>
          </nav>

          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Projects
            </span>
            <button
              type="button"
              onClick={selectNewProject}
              title="Tambah Project Baru"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-700"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative mt-2 mb-2">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>

          <nav className="max-h-[50vh] space-y-1 overflow-y-auto">
            {projectNames.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">Belum ada project.</p>
            )}
            {projectNames.map((name) => (
              <button
                key={name}
                type="button"
                className={sidebarItemClass(view === name)}
                onClick={() => selectProject(name)}
              >
                <FolderKanban size={16} className="flex-shrink-0" />
                <span className="flex-1 truncate text-left">{name}</span>
                <span className="flex gap-1">
                  {groups[name].to.length > 0 && (
                    <Badge color={view === name ? "black" : "slate"}>
                      TO {groups[name].to.length}
                    </Badge>
                  )}
                  {groups[name].cc.length > 0 && (
                    <Badge color={view === name ? "black" : "blue"}>
                      CC {groups[name].cc.length}
                    </Badge>
                  )}
                </span>
              </button>
            ))}
            {view === VIEW_NEW_PROJECT && (
              <div className={sidebarItemClass(true)}>
                <Plus size={16} />
                Project Baru
              </div>
            )}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {view === VIEW_TEMPLATE && (
            <Card title="Template Reminder Validasi Overtime">
              <p className="mb-4 text-sm text-slate-500">
                Gunakan placeholder <code className="rounded bg-slate-100 px-1">{"{Project Name}"}</code>{" "}
                dan <code className="rounded bg-slate-100 px-1">{"{Approval Link}"}</code> untuk
                menyisipkan nama project dan link approval saat email dikirim.
              </p>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Subject</span>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Body Email</span>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={20}
                    required
                  />
                </label>

                <Button type="submit">Simpan Template</Button>
              </form>
            </Card>
          )}

          {view === VIEW_BULK_IMPORT && (
            <Card title="Bulk Import Recipient via Excel">
              <p className="mb-3 text-sm text-slate-500">
                Download template Excel, isi kolom <strong>Project Name</strong>,{" "}
                <strong>Email</strong>, dan <strong>Type</strong> (TO/CC), lalu upload kembali
                file tersebut untuk menambahkan banyak recipient sekaligus.
              </p>

              <div className="mb-4">
                <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
                  Download Template Excel
                </Button>
              </div>

              <form onSubmit={handleBulkUpload} className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    File Excel (.xlsx / .xls)
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block text-sm text-slate-600"
                  />
                </label>

                <Button type="submit">Upload Excel</Button>
              </form>
            </Card>
          )}

          {(view === VIEW_NEW_PROJECT || (view !== VIEW_TEMPLATE && view !== VIEW_BULK_IMPORT)) && (
            <>
              <Card
                title={
                  view === VIEW_NEW_PROJECT
                    ? "Tambah Project & Recipient Baru"
                    : `Tambah Recipient - ${view}`
                }
              >
                <p className="mb-3 text-sm text-slate-500">
                  Untuk satu project, masukkan satu atau lebih email TO dan/atau CC, dipisahkan
                  dengan baris baru atau koma. Email <Badge color="blue">CC</Badge> akan otomatis
                  di-CC saat email approval untuk project tersebut dikirim. Email{" "}
                  <Badge color="slate">TO</Badge> ditambahkan sebagai penerima utama tambahan.
                </p>

                <form onSubmit={handleCreate} className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Nama Project</span>
                    <Input
                      placeholder="contoh: Project A"
                      value={form.project_name}
                      onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                      className="w-full max-w-md"
                      readOnly={view !== VIEW_NEW_PROJECT}
                      required
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Email TO (satu per baris atau pisahkan koma)
                      </span>
                      <Textarea
                        placeholder={"abd@email.com"}
                        value={form.to}
                        onChange={(e) => setForm({ ...form, to: e.target.value })}
                        rows={4}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Email CC (satu per baris atau pisahkan koma)
                      </span>
                      <Textarea
                        placeholder={"asd@email.com\nadf@email.com\ndgrg@email.com"}
                        value={form.cc}
                        onChange={(e) => setForm({ ...form, cc: e.target.value })}
                        rows={4}
                      />
                    </label>
                  </div>

                  <Button type="submit">Simpan Recipient</Button>
                </form>
              </Card>

              {view !== VIEW_NEW_PROJECT && groups[view] && (
                <Card title={`Daftar Recipient - ${view}`}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-slate-400">To</div>
                      {groups[view].to.length === 0 && <p className="text-sm text-slate-400">-</p>}
                      <div className="flex flex-wrap gap-2">
                        {groups[view].to.map((row) => (
                          <span
                            key={row.id}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                          >
                            {row.email}
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-slate-400 hover:text-red-600"
                              title="Hapus"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-slate-400">Cc</div>
                      {groups[view].cc.length === 0 && <p className="text-sm text-slate-400">-</p>}
                      <div className="flex flex-wrap gap-2">
                        {groups[view].cc.map((row) => (
                          <span
                            key={row.id}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                          >
                            {row.email}
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="text-blue-400 hover:text-red-600"
                              title="Hapus"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
