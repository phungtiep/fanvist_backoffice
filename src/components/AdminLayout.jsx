import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { supabase } from "../lib/supabase";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">

      {/* ⭐ TOP BAR MOBILE */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <button onClick={() => setOpenMenu(true)}>
          <HiMenu size={28} />
        </button>
        <span className="text-lg font-semibold">Fanvist Backoffice</span>
        <div className="w-8" />
      </div>

      {/* ⭐ SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-slate-800 bg-slate-950">
        <Sidebar onLogout={handleLogout} />
      </aside>

      {/* ⭐ SIDEBAR MOBILE – SLIDE-IN */}
      {openMenu && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setOpenMenu(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 w-64 h-full bg-slate-900 z-50 transform 
          transition-transform duration-300 ease-out lg:hidden shadow-xl 
          ${openMenu ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* header mobile */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
          <span className="text-lg font-semibold">Menu</span>
          <button onClick={() => setOpenMenu(false)}>
            <HiX size={28} />
          </button>
        </div>

        <Sidebar onLogout={handleLogout} closeMenu={() => setOpenMenu(false)} />
      </aside>

      {/* ⭐ MAIN CONTENT */}
      <main className="flex-1 w-full p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
        {children}
      </main>
    </div>
  );
}

/* ==========================================================================================
   ⭐ SIDEBAR COMPONENT – dùng chung cho cả mobile & desktop
   ========================================================================================== */

function Sidebar({ onLogout, closeMenu }) {
  const handleClick = (callback) => {
    if (closeMenu) closeMenu();
    if (callback) callback();
  };

  return (
    <nav className="flex flex-col p-4 gap-2">
      <div className="text-xl font-semibold mb-2">Fanvist Backoffice</div>

      <NavLink
        to="/admin/bookings"
        onClick={() => handleClick()}
        className={({ isActive }) =>
          `block px-4 py-2 rounded text-sm transition ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Quản lý Booking
      </NavLink>

      <NavLink
        to="/admin/routes"
        onClick={() => handleClick()}
        className={({ isActive }) =>
          `block px-4 py-2 rounded text-sm transition ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Tuyến đường & Giá
      </NavLink>

      <NavLink
        to="/admin/cars"
        onClick={() => handleClick()}
        className={({ isActive }) =>
          `block px-4 py-2 rounded text-sm transition ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Quản lý xe
      </NavLink>
      <NavLink
        to="/admin/drivers"
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Quản lý tài xế
      </NavLink>
      <NavLink
        to="/admin/vehicles"
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Quản lý xe công ty
      </NavLink>
      <NavLink
        to="/admin/schedule"
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-sm ${isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-900"
          }`
        }
      >
        Calendar phân công
      </NavLink>



      <button
        onClick={onLogout}
        className="mt-6 px-4 py-2 text-left bg-slate-800 rounded hover:bg-slate-700 transition text-sm"
      >
        Đăng xuất
      </button>
    </nav>
  );
}
