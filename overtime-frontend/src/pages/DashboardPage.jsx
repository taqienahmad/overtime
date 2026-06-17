import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  FolderKanban,
  Users,
  Clock,
  Send,
  Calendar,
  Inbox,
  FileSpreadsheet,
  CheckCircle2,
  Percent,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import overtimeApi from "../services/overtimeApi";
import reportsApi from "../services/reportsApi";
import { Alert, Button, Card, Input, StatCard, Table, thClass, tdClass } from "../components/ui";

const PRIMARY = "#D71920";
const COLORS = ["#D71920", "#3B82F6", "#F59E0B", "#22C55E", "#8B5CF6", "#0EA5E9", "#EC4899"];

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EmailStatusBadge({ group }) {
  if (!group.last_email_sent_at) {
    return (
      <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-[#D71920]">
        Belum Dikirim
      </span>
    );
  }

  if (group.last_email_status === "APPROVED") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Sudah Divalidasi
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
      Terkirim
    </span>
  );
}

function KpiCard({ label, value, icon, color, gradient }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-4xl font-bold text-[#0F172A]">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
          {icon}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 rounded-b-2xl opacity-70"
        style={{ background: gradient }}
      />
    </motion.div>
  );
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-16 rounded bg-slate-200" />
      <div className="mt-4 h-12 w-12 rounded-full bg-slate-100" />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
      <Inbox size={36} strokeWidth={1.5} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [groups, setGroups] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState({});

  // Reports state
  const [summary, setSummary] = useState(null);
  const [byProject, setByProject] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    loadGroups();
    loadTrend();
    loadReports();
  }, []);

  async function loadTrend() {
    try {
      const result = await overtimeApi.getTrend(14);
      setTrend(result.data.data);
    } catch (err) {
      // trend chart will fall back to empty state
    }
  }

  async function loadReports() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;

    try {
      const [summaryRes, byProjectRes] = await Promise.all([
        reportsApi.getSummary(params),
        reportsApi.getByProject(params),
      ]);

      setSummary(summaryRes.data.data);
      setByProject(byProjectRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat data laporan.");
    }
  }

  async function loadGroups() {
    setLoading(true);
    try {
      const result = await overtimeApi.getGrouped();
      setGroups(result.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal memuat data overtime."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCreateAndSend(group) {
    setError("");
    setMessage("");

    try {
      const sessionResult = await overtimeApi.createApprovalSession({
        email: group.employee_email,
        project: group.project_name,
      });

      const approvalUrl = `${window.location.origin}/approval/${sessionResult.data.token}`;

      await overtimeApi.sendApprovalEmail({
        email: group.employee_email,
        project: group.project_name,
        approvalUrl,
      });

      setMessage(
        `Approval session dibuat & email terkirim ke ${group.employee_email} (${group.project_name})`
      );

      loadGroups();
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal membuat approval session / kirim email."
      );
    }
  }

  const totalGroups = groups.length;
  const totalMembers = groups.reduce((sum, g) => sum + Number(g.total_members || 0), 0);
  const totalHours = groups.reduce((sum, g) => sum + Number(g.total_hours || 0), 0);
  const totalProjects = new Set(groups.map((g) => g.project_name)).size;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const dateRangeLabel = `${weekAgo.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const overtimeByProject = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      const key = g.project_name || "Lainnya";
      map.set(key, (map.get(key) || 0) + Number(g.total_hours || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [groups]);

  const trendData = useMemo(
    () =>
      trend.map((t) => ({
        date: new Date(t.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        hours: t.total_hours,
      })),
    [trend]
  );

  const maxHours = Math.max(
    1,
    ...byProject.map((row) => Number(row.total_overtime_hours) || 0)
  );

  const emailStatusData = useMemo(() => {
    const sent = groups.filter((g) => g.last_email_sent_at).length;
    const notSent = groups.length - sent;
    return [
      { name: "Terkirim", value: sent },
      { name: "Belum Dikirim", value: notSent },
    ];
  }, [groups]);

  return (
    <div>
      {/* Dashboard header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold leading-tight text-[#0F172A]">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pantau overtime yang menunggu approval dan ringkasan laporan sistem
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <Calendar size={16} className="text-[#D71920]" />
          {dateRangeLabel}
        </div>
      </div>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{message}</Alert>

      {/* ================= Section: Approval Pending ================= */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-[#D71920]">
          <ClipboardList size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Approval Pending</h2>
          <p className="text-sm text-slate-500">
            Ringkasan overtime yang menunggu approval
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Pending Groups"
              value={totalGroups}
              icon={<ClipboardList size={22} className="text-[#D71920]" />}
              color="bg-red-50"
              gradient="linear-gradient(90deg, #D71920, #F87171)"
            />
            <KpiCard
              label="Total Projects"
              value={totalProjects}
              icon={<FolderKanban size={22} className="text-[#3B82F6]" />}
              color="bg-blue-50"
              gradient="linear-gradient(90deg, #3B82F6, #93C5FD)"
            />
            <KpiCard
              label="Total Members"
              value={totalMembers}
              icon={<Users size={22} className="text-[#8B5CF6]" />}
              color="bg-purple-50"
              gradient="linear-gradient(90deg, #8B5CF6, #C4B5FD)"
            />
            <KpiCard
              label="Total Hours"
              value={totalHours}
              icon={<Clock size={22} className="text-[#22C55E]" />}
              color="bg-green-50"
              gradient="linear-gradient(90deg, #22C55E, #86EFAC)"
            />
          </>
        )}
      </div>

      {/* Pending overtime table */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-[22px] font-semibold text-[#0F172A]">Pending Overtime (Grouped)</h2>
          <p className="text-sm text-slate-500">
            Klik tombol untuk membuat sesi approval dan mengirim email
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState label="Tidak ada overtime yang menunggu approval" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Project</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Approver Email</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Members</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hours</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status Email</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Last Sent</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>

              <tbody>
                {groups.map((group) => {
                  const rowKey = `${group.employee_email}-${group.project_name}`;
                  const isExpanded = !!expanded[rowKey];
                  const members = group.members || [];
                  return (
                    <Fragment key={rowKey}>
                      <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                        <td className="px-3 py-4">
                          <button
                            onClick={() => toggleExpand(rowKey)}
                            className="flex items-center justify-center text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-5 py-4 font-medium text-[#0F172A]">{group.project_name}</td>
                        <td className="px-5 py-4 text-slate-600">{group.employee_email}</td>
                        <td className="px-5 py-4 text-slate-600">{group.total_members}</td>
                        <td className="px-5 py-4 text-slate-600">{group.total_hours}</td>
                        <td className="px-5 py-4">
                          <EmailStatusBadge group={group} />
                        </td>
                        <td className="px-5 py-4 text-slate-500">{formatDateTime(group.last_email_sent_at)}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleCreateAndSend(group)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#D71920] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-red-200"
                          >
                            <Send size={14} />
                            {group.last_email_sent_at ? "Kirim Ulang Email" : "Create Session & Send Email"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td></td>
                          <td colSpan={7} className="px-4 pb-4 pt-1">
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-white">
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">NIP</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">Nama</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">Jabatan</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">Schedule</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">Periode</th>
                                    <th colSpan={4} className="border-b border-r border-slate-200 px-3 py-1 text-center font-semibold text-blue-600 bg-blue-50">SPL Before</th>
                                    <th colSpan={3} className="border-b border-r border-slate-200 px-3 py-1 text-center font-semibold text-green-600 bg-green-50">SPL After</th>
                                    <th colSpan={2} className="border-b border-r border-slate-200 px-3 py-1 text-center font-semibold text-yellow-700 bg-yellow-50">SPL Total</th>
                                    <th colSpan={3} className="border-b border-r border-slate-200 px-3 py-1 text-center font-semibold text-purple-600 bg-purple-50">Actual Attendance</th>
                                    <th colSpan={4} className="border-b border-r border-slate-200 px-3 py-1 text-center font-semibold text-orange-600 bg-orange-50">OT Calculate</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">SPL Indeks</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-600">SPL Total OT</th>
                                    <th rowSpan={2} className="border-b border-r border-slate-200 px-3 py-2 font-semibold text-emerald-700 bg-emerald-50">Overtime Paid</th>
                                    <th rowSpan={2} className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600">Note</th>
                                  </tr>
                                  <tr className="bg-white">
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-blue-500 bg-blue-50">Shift</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-blue-500 bg-blue-50">Duty On</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-blue-500 bg-blue-50">Duty Off</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-blue-500 bg-blue-50">Duration</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-green-500 bg-green-50">Break</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-green-500 bg-green-50">OT</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-green-500 bg-green-50">Duration</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-yellow-600 bg-yellow-50">Break</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-yellow-600 bg-yellow-50">OT</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-purple-500 bg-purple-50">Duty On</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-purple-500 bg-purple-50">Duty Off</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-purple-500 bg-purple-50">Code</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-orange-500 bg-orange-50">1.5</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-orange-500 bg-orange-50">2</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-orange-500 bg-orange-50">3</th>
                                    <th className="border-b border-r border-slate-200 px-3 py-1 font-medium text-orange-500 bg-orange-50">4</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map((m) => (
                                    <tr key={m.id} className="border-t border-slate-100 hover:bg-white">
                                      <td className="border-r border-slate-100 px-3 py-2 text-slate-700">{m.nip || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 whitespace-nowrap text-slate-700">{m.employee_name}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 whitespace-nowrap text-slate-600">{m.job_position || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-slate-600">{m.schedule || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 whitespace-nowrap text-slate-600">{m.overtime_period || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-blue-700">{m.shift || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-blue-700">{m.duty_on_before || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-blue-700">{m.duty_off_before || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-blue-700">{m.duration_before ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-green-700">{m.break_after ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-green-700">{m.ot_after ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-green-700">{m.duration_after ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-yellow-700">{m.spl_total_break ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-yellow-700">{m.spl_total_ot ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-purple-700">{m.actual_duty_on || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-purple-700">{m.actual_duty_off || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-purple-700">{m.attendance_code || "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-orange-700">{m.ot_calc_1_5 ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-orange-700">{m.ot_calc_2 ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-orange-700">{m.ot_calc_3 ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-orange-700">{m.ot_calc_4 ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 text-slate-700">{m.spl_indeks_total ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 font-semibold text-slate-800">{m.overtime_hours ?? "-"}</td>
                                      <td className="border-r border-slate-100 px-3 py-2 font-semibold text-emerald-700">
                                        {m.overtime_paid != null ? Number(m.overtime_paid).toLocaleString("id-ID") : "-"}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">{m.note || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-[#0F172A]">Overtime Summary</h3>
          {overtimeByProject.length === 0 ? (
            <EmptyState label="Belum ada data overtime" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={overtimeByProject}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {overtimeByProject.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-[#0F172A]">Overtime Trend</h3>
          {trendData.every((t) => t.hours === 0) ? (
            <EmptyState label="Belum ada data overtime dalam 14 hari terakhir" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="hours"
                  name="Jam Overtime"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  fill="url(#trendColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-[#0F172A]">Email Delivery Status</h3>
          {groups.length === 0 ? (
            <EmptyState label="Belum ada data email" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={emailStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  <Cell fill="#22C55E" />
                  <Cell fill="#D71920" />
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ================= Section: Summary & Reports ================= */}
      <div className="my-8 border-t border-dashed border-slate-200" />

      <div className="-mx-6 rounded-3xl bg-slate-50/70 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#3B82F6]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Summary & Reports</h2>
            <p className="text-sm text-slate-500">
              Statistik keseluruhan data overtime berdasarkan periode upload
            </p>
          </div>
        </div>

        <Card title="Filter Periode (created_at)">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm text-slate-600">
              Dari
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="flex flex-col text-sm text-slate-600">
              Sampai
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <Button onClick={loadReports}>Terapkan</Button>
            {(from || to) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  loadReports();
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </Card>

        {summary && (
          <Card title="Summary">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="Total Records"
                value={summary.total_records}
                icon={<FileSpreadsheet size={22} />}
                accent="black"
              />
              <StatCard
                label="Pending"
                value={summary.pending_count}
                icon={<Clock size={22} />}
                accent="red"
              />
              <StatCard
                label="Validated"
                value={summary.validated_count}
                icon={<CheckCircle2 size={22} />}
                accent="blue"
              />
              <StatCard
                label="Approved"
                value={summary.approved_count}
                icon={<CheckCircle2 size={22} />}
                accent="green"
              />
              <StatCard
                label="Total OT Hours"
                value={summary.total_overtime_hours}
                icon={<Clock size={22} />}
                accent="black"
              />
              <StatCard
                label="Billable Hours"
                value={summary.total_billable_hours}
                icon={<CheckCircle2 size={22} />}
                accent="green"
              />
              <StatCard
                label="Non-Billable Hours"
                value={summary.total_non_billable_hours}
                icon={<Clock size={22} />}
                accent="red"
              />
              <StatCard
                label="Billable %"
                value={`${summary.billable_percentage}%`}
                icon={<Percent size={22} />}
                accent="blue"
              />
            </div>
          </Card>
        )}

        <Card title="By Project">
          <div className="mb-4 space-y-2">
            {byProject.map((row) => {
              const hours = Number(row.total_overtime_hours) || 0;
              const widthPct = (hours / maxHours) * 100;

              return (
                <div key={row.project_name}>
                  <div className="mb-1 text-sm text-slate-600">
                    {row.project_name} ({hours}h)
                  </div>
                  <div className="h-4 max-w-md rounded bg-slate-100">
                    <div
                      className="h-4 rounded bg-[#D71920]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Table>
            <thead>
              <tr>
                <th className={thClass}>Project</th>
                <th className={thClass}>Total Records</th>
                <th className={thClass}>Pending</th>
                <th className={thClass}>Validated</th>
                <th className={thClass}>Total OT Hours</th>
                <th className={thClass}>Billable</th>
                <th className={thClass}>Non-Billable</th>
                <th className={thClass}>Billable %</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((row) => (
                <tr key={row.project_name}>
                  <td className={tdClass}>{row.project_name}</td>
                  <td className={tdClass}>{row.total_records}</td>
                  <td className={tdClass}>{row.pending_count}</td>
                  <td className={tdClass}>{row.validated_count}</td>
                  <td className={tdClass}>{row.total_overtime_hours}</td>
                  <td className={tdClass}>{row.total_billable_hours}</td>
                  <td className={tdClass}>{row.total_non_billable_hours}</td>
                  <td className={tdClass}>{row.billable_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
