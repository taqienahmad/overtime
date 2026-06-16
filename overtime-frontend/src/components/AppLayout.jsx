import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  History,
  Mail,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email-template", label: "Email Template", icon: Mail },
  { to: "/history", label: "History", icon: History },
  { to: "/upload", label: "Upload & Settings", icon: UploadCloud },
];

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function AppLayout() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const initials = (user?.name || "AM")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Top navbar */}
      <header
        className="sticky top-0 z-30 flex h-[70px] items-center text-white shadow-md"
        style={{ backgroundColor: "#D71920" }}
      >
        <div className="flex h-full w-full items-center gap-6 px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-11 w-11 object-contain" />
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-wide">
                OVERTIME <span className="text-white/80">SYSTEM</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">
                Management
              </div>
            </div>
          </div>

          <nav className="ml-2 hidden flex-1 items-center gap-1 overflow-x-auto lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-[#D71920] shadow-sm"
                        : "text-white/85 hover:bg-white/15 hover:text-white"
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={2} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right text-xs text-white/80 md:block">
              <div className="font-medium text-white">{today}</div>
            </div>

            <button
              className="relative rounded-full p-2 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#D71920]">
                3
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-white/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#D71920]">
                  {initials}
                </div>
                <div className="hidden text-left text-sm leading-tight md:block">
                  <div className="font-semibold text-white">{user?.name}</div>
                  <div className="text-xs text-white/75">{user?.role}</div>
                </div>
                <ChevronDown size={16} className="hidden text-white/75 md:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 text-slate-700 shadow-lg">
                  <div className="px-4 py-2 text-sm">
                    <div className="font-semibold text-slate-800">{user?.name}</div>
                    <div className="text-xs text-slate-400">{user?.email}</div>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50">
                    <UserIcon size={15} />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="absolute left-0 top-full flex w-full gap-1 overflow-x-auto bg-[#D71920] px-4 pb-2 pt-1 lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white text-[#D71920]"
                      : "text-white/85 hover:bg-white/15 hover:text-white"
                  }`
                }
              >
                <Icon size={14} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
