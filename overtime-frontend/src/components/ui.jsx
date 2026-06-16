export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`mb-6 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {title && (
        <div className="mb-3 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Alert({ type = "error", children }) {
  if (!children) return null;

  const styles =
    type === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-green-50 text-green-700 border-green-200";

  return (
    <div className={`mb-4 rounded-md border px-4 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-black text-white hover:bg-red-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
    danger: "bg-red-700 text-white hover:bg-red-800",
    outline: "border border-red-700 text-red-700 hover:bg-red-50",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Table({ children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export const thClass = "border-b border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-600";
export const tdClass = "border-b border-slate-100 px-4 py-2 text-slate-700";

export function Badge({ children, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
    black: "bg-black text-white",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon, accent = "red" }) {
  const accents = {
    red: "bg-red-50 text-red-700",
    black: "bg-slate-100 text-slate-800",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {icon && (
        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${accents[accent]}`}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

export function Input(props) {
  return (
    <input
      className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
      {...props}
    />
  );
}

export function Select(props) {
  return (
    <select
      className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
      {...props}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
      {...props}
    />
  );
}
