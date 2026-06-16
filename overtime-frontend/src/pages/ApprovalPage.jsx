import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import overtimeApi from "../services/overtimeApi";
import { Alert, Badge, Button, Card, Input, Table, Textarea, thClass, tdClass } from "../components/ui";

function detectDeviceInfo() {
  const ua = navigator.userAgent;

  let os = "Unknown OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return `${os} - ${browser}`;
}

export default function ApprovalPage() {
  const { token } = useParams();

  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [validatorName, setValidatorName] = useState(
    localStorage.getItem("validatorName") || ""
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [exited, setExited] = useState(false);
  const [validationMethod, setValidationMethod] = useState("PER_NAME");
  const [totalBillableHours, setTotalBillableHours] = useState(0);
  const [totalNonBillableHours, setTotalNonBillableHours] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const result = await overtimeApi.getApprovalByToken(token);
      setData(result.data);

      const initializedMembers = result.data.members.map((member) => ({
        ...member,
        billable_hours: Number(member.billable_hours) || 0,
        non_billable_hours: Number(member.non_billable_hours) || 0,
        remark: member.validation_remark || "",
      }));

      setMembers(initializedMembers);

      const lastValidatedBy = result.data.members.find((m) => m.validated_by)?.validated_by;
      if (lastValidatedBy && !localStorage.getItem("validatorName")) {
        setValidatorName(lastValidatedBy);
      }

      if (result.data.validationMethod === "TOTAL") {
        setValidationMethod("TOTAL");
        setTotalBillableHours(Number(result.data.totalBillableHours) || 0);
        setTotalNonBillableHours(Number(result.data.totalNonBillableHours) || 0);
      }

      if (result.data.status === "APPROVED") {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data approval.");
    }
  }

  function updateHours(id, field, value) {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, [field]: Number(value) } : member
      )
    );
  }

  function updateRemark(id, value) {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, remark: value } : member))
    );
  }

  async function submitApproval() {
    setError("");
    setMessage("");

    if (!validatorName.trim()) {
      setError("Mohon isi nama Anda sebelum submit.");
      return;
    }

    const sumOvertime = members.reduce((sum, m) => sum + Number(m.overtime_hours), 0);

    if (validationMethod === "TOTAL") {
      const totalSum = Number(totalBillableHours) + Number(totalNonBillableHours);

      if (totalSum !== sumOvertime) {
        setError(
          `Total Billable + Total Non Billable harus sama dengan total OT seluruh anggota (${sumOvertime})`
        );
        return;
      }
    } else {
      for (const member of members) {
        const total = Number(member.billable_hours) + Number(member.non_billable_hours);

        if (total !== Number(member.overtime_hours)) {
          setError(
            `${member.employee_name}: Billable + Non Billable harus sama dengan OT Total`
          );
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      localStorage.setItem("validatorName", validatorName.trim());

      await overtimeApi.submitApproval(token, {
        members,
        validatorName: validatorName.trim(),
        validatorDevice: detectDeviceInfo(),
        validationMethod,
        totalBillableHours: validationMethod === "TOTAL" ? Number(totalBillableHours) : undefined,
        totalNonBillableHours: validationMethod === "TOTAL" ? Number(totalNonBillableHours) : undefined,
      });

      setMessage(
        submitted
          ? "Perubahan berhasil disimpan. Anda masih dapat mengedit kembali bila diperlukan."
          : "Approval berhasil disubmit. Anda masih dapat mengedit kembali bila ada kesalahan input."
      );
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Submit gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (exited) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <img src="/logo.png" alt="Logo" className="mx-auto mb-4 h-14 w-14 object-contain" />
          <h2 className="text-lg font-semibold text-slate-800">Terima kasih</h2>
          <p className="mt-1 text-sm text-slate-500">
            Anda dapat menutup halaman ini sekarang.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <h2 className="text-lg font-medium text-slate-600">Loading...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain" />
          <div className="leading-tight">
            <div className="text-2xl font-bold tracking-wide">
              OVERTIME <span className="text-black">SYSTEM</span>
            </div>
            <div className="text-xs uppercase tracking-widest text-red-200">
              Validation Reminder
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Nama Project
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{data.project}</h1>
              <p className="mt-1 text-sm text-slate-500">{data.approver}</p>
            </div>

            {submitted && <Badge color="green">Sudah Divalidasi</Badge>}
          </div>

          <Alert type="error">{error}</Alert>
          <Alert type="success">{message}</Alert>

          <p className="mb-4 text-sm text-slate-500">
            Mohon periksa dan isi pembagian jam <strong>Billable</strong> dan{" "}
            <strong>Non Billable</strong>, serta tambahkan{" "}
            <strong>Remark</strong> jika ada penjelasan terkait isian Anda.
          </p>

          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Metode Validasi
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setValidationMethod("PER_NAME")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  validationMethod === "PER_NAME"
                    ? "bg-black text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Validasi Per Nama
              </button>
              <button
                type="button"
                onClick={() => setValidationMethod("TOTAL")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  validationMethod === "TOTAL"
                    ? "bg-black text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Validasi Total
              </button>
            </div>
          </div>

          {validationMethod === "TOTAL" && (() => {
            const sumOvertime = members.reduce((sum, m) => sum + Number(m.overtime_hours), 0);
            const enteredTotal = Number(totalBillableHours) + Number(totalNonBillableHours);
            const remaining = sumOvertime - enteredTotal;

            return (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm text-slate-500">
                  Isi total jam <strong>Billable</strong> dan <strong>Non Billable</strong>{" "}
                  untuk seluruh project. Total keduanya harus sama dengan total OT seluruh
                  anggota ({sumOvertime}).
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Total Billable
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={totalBillableHours}
                      onChange={(e) => setTotalBillableHours(e.target.value)}
                      className="w-32"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Total Non Billable
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={totalNonBillableHours}
                      onChange={(e) => setTotalNonBillableHours(e.target.value)}
                      className="w-32"
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Total OT
                    </div>
                    <div className="text-lg font-bold text-slate-800">{sumOvertime}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Total Billable
                    </div>
                    <div className="text-lg font-bold text-slate-800">
                      {Number(totalBillableHours) || 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Total Non Billable
                    </div>
                    <div className="text-lg font-bold text-slate-800">
                      {Number(totalNonBillableHours) || 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Belum Teridentifikasi
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        remaining === 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {remaining}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mb-4 max-w-sm">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Nama Anda (Validator)
              </span>
              <Input
                placeholder="contoh: Achmad Mutaqin"
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
              />
            </label>
          </div>

          <Table>
            <thead>
              <tr>
                <th className={thClass}>NIP</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Periode</th>
                <th className={thClass}>OT Total</th>
                <th className={thClass}>Billable</th>
                <th className={thClass}>Non Billable</th>
                <th className={thClass}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className={tdClass}>{member.nip || "-"}</td>
                  <td className={tdClass}>{member.employee_name}</td>
                  <td className={tdClass}>{member.overtime_period || "-"}</td>
                  <td className={tdClass}>{member.overtime_hours}</td>
                  <td className={tdClass}>
                    <Input
                      type="number"
                      min="0"
                      value={member.billable_hours}
                      onChange={(e) => updateHours(member.id, "billable_hours", e.target.value)}
                      className="w-24"
                      disabled={validationMethod === "TOTAL"}
                    />
                  </td>
                  <td className={tdClass}>
                    <Input
                      type="number"
                      min="0"
                      value={member.non_billable_hours}
                      onChange={(e) =>
                        updateHours(member.id, "non_billable_hours", e.target.value)
                      }
                      className="w-24"
                      disabled={validationMethod === "TOTAL"}
                    />
                  </td>
                  <td className={tdClass}>
                    <Textarea
                      rows={1}
                      placeholder="Penjelasan (opsional)"
                      value={member.remark}
                      onChange={(e) => updateRemark(member.id, e.target.value)}
                      className="min-w-[180px] font-sans"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={submitApproval} disabled={submitting}>
              {submitting ? "Menyimpan..." : submitted ? "Update Approval" : "Submit Approval"}
            </Button>

            <Button variant="secondary" onClick={() => setExited(true)}>
              Keluar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
