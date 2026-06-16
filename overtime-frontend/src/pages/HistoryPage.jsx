import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import overtimeApi from "../services/overtimeApi";
import { Alert, Badge, Button, Card, PageHeader, Table, thClass, tdClass } from "../components/ui";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setError("");

    try {
      const result = await overtimeApi.getHistory();
      setHistory(result.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal memuat history."
      );
    }
  }

  function handleDownloadCsv() {
    if (history.length === 0) return;

    const headers = [
      "id",
      "nip",
      "employee_name",
      "employee_email",
      "project_name",
      "overtime_period",
      "overtime_hours",
      "billable_hours",
      "non_billable_hours",
      "status",
      "validation_type",
      "validation_method",
      "session_total_billable_hours",
      "session_total_non_billable_hours",
      "validation_remark",
      "validated_by",
      "validated_device",
      "validated_at",
    ];

    const rows = history.map((row) =>
      headers.map((key) => `"${row[key] ?? ""}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `overtime_history_${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function handleDeleteHistory() {
    const confirmed = window.confirm(
      "Yakin ingin menghapus semua data history (yang sudah divalidasi/approved)? Pastikan sudah didownload terlebih dahulu."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const result = await overtimeApi.deleteHistory();
      setMessage(`${result.data.deleted} data history berhasil dihapus.`);
      loadHistory();
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal menghapus history."
      );
    }
  }

  const groups = useMemo(() => {
    const map = new Map();

    for (const row of history) {
      const key = `${row.project_name}__${row.employee_email}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          project_name: row.project_name,
          employee_email: row.employee_email,
          validation_method: row.validation_method,
          session_total_billable_hours: row.session_total_billable_hours,
          session_total_non_billable_hours: row.session_total_non_billable_hours,
          validated_by: row.validated_by,
          validated_at: row.validated_at,
          members: [],
        });
      }

      const group = map.get(key);
      group.members.push(row);

      if (row.validated_at && (!group.validated_at || row.validated_at > group.validated_at)) {
        group.validated_at = row.validated_at;
      }
    }

    return Array.from(map.values()).map((group) => ({
      ...group,
      total_members: group.members.length,
      total_hours: group.members.reduce((sum, m) => sum + Number(m.overtime_hours || 0), 0),
      total_billable: group.members.reduce((sum, m) => sum + Number(m.billable_hours || 0), 0),
      total_non_billable: group.members.reduce((sum, m) => sum + Number(m.non_billable_hours || 0), 0),
    }));
  }, [history]);

  function toggleExpand(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div>
      <PageHeader title="History Validasi / Approval">
        <Button variant="secondary" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
        <Button variant="danger" onClick={handleDeleteHistory}>
          Hapus Data Lama
        </Button>
      </PageHeader>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{message}</Alert>

      <Card>
        <Table>
          <thead>
            <tr>
              <th className={thClass}></th>
              <th className={thClass}>Project</th>
              <th className={thClass}>Approver Email</th>
              <th className={thClass}>Total Members</th>
              <th className={thClass}>Total OT</th>
              <th className={thClass}>Total Billable</th>
              <th className={thClass}>Total Non Billable</th>
              <th className={thClass}>Metode Validasi</th>
              <th className={thClass}>Divalidasi Oleh</th>
              <th className={thClass}>Tanggal Validasi</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleExpand(group.key)}
                >
                  <td className={tdClass}>
                    {expanded[group.key] ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                  </td>
                  <td className={tdClass}>{group.project_name}</td>
                  <td className={tdClass}>{group.employee_email}</td>
                  <td className={tdClass}>{group.total_members}</td>
                  <td className={tdClass}>{group.total_hours}</td>
                  <td className={tdClass}>
                    {group.validation_method === "TOTAL"
                      ? group.session_total_billable_hours ?? "-"
                      : group.total_billable}
                  </td>
                  <td className={tdClass}>
                    {group.validation_method === "TOTAL"
                      ? group.session_total_non_billable_hours ?? "-"
                      : group.total_non_billable}
                  </td>
                  <td className={tdClass}>
                    {group.validation_method === "TOTAL" ? (
                      <Badge color="blue">Validasi Total</Badge>
                    ) : (
                      <Badge color="slate">Validasi Per Nama</Badge>
                    )}
                  </td>
                  <td className={tdClass}>{group.validated_by || "-"}</td>
                  <td className={tdClass}>{group.validated_at}</td>
                </tr>

                {expanded[group.key] && (
                  <tr>
                    <td className={tdClass}></td>
                    <td className={tdClass} colSpan={9}>
                      <div className="overflow-x-auto rounded-md border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr>
                              <th className={thClass}>NIP</th>
                              <th className={thClass}>Nama</th>
                              <th className={thClass}>Periode</th>
                              <th className={thClass}>OT Total</th>
                              <th className={thClass}>Billable</th>
                              <th className={thClass}>Non Billable</th>
                              <th className={thClass}>Status</th>
                              <th className={thClass}>Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.members.map((member) => (
                              <tr key={member.id}>
                                <td className={tdClass}>{member.nip || "-"}</td>
                                <td className={tdClass}>{member.employee_name}</td>
                                <td className={tdClass}>{member.overtime_period || "-"}</td>
                                <td className={tdClass}>{member.overtime_hours}</td>
                                <td className={tdClass}>{member.billable_hours}</td>
                                <td className={tdClass}>{member.non_billable_hours}</td>
                                <td className={tdClass}>
                                  <Badge color={member.status === "VALIDATED" ? "green" : "slate"}>
                                    {member.status}
                                  </Badge>
                                </td>
                                <td className={tdClass}>{member.validation_remark || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
