import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, TrendingUp, Calendar, Zap, User, LogOut } from "lucide-react";
import Connect_Context from "../../context/Connectcontext";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useContext(Connect_Context);

  const navItems = [
    { id: "progress", label: "Progress", icon: TrendingUp, path: "/" },
    { id: "history", label: "History", icon: Calendar, path: "/history" },
    { id: "ai", label: "AI Action", icon: Zap, path: "/ai" },
  ];

  const activeTab = location.pathname.includes("history")
    ? "history"
    : location.pathname.includes("ai")
    ? "ai"
    : "progress";

  return (
    <>
      {/* ================= DESKTOP NAVBAR ================= */}
      <div className="hidden md:flex fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-40 px-6 py-4 justify-between items-center">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="bg-indigo-600 rounded-lg p-1.5">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">
            FitMetrics
          </span>
        </div>

        {/* Nav Items */}
        <div className="flex gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* User / Logout */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
            <User size={16} />
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* ================= MOBILE NAVBAR ================= */}
      <div className="md:hidden fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-40 pb-safe">
        <div className="flex justify-around items-center p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                activeTab === item.id
                  ? "text-indigo-400"
                  : "text-slate-500"
              }`}
            >
              <item.icon
                size={20}
                strokeWidth={activeTab === item.id ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}

          {/* Logout */}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-rose-400"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Exit</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
