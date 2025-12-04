import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { supabase } from "../lib/supabase";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);

  /* ============================================================
     ⭐ LOGOUT — XÓA FULL CACHE (desktop + mobile)
  ============================================================ */
  const handleLogout = async () => {
    // 1) Supabase logout
    await supabase.auth.signOut();

    // 2) Clear storages
    localStorage.clear();
    sessionStorage.clear();

    // 3) Clear Service Worker Cache
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    // 4) Clear IndexedDB
    if (window.indexedDB) {
      try {
        const dbs = await window.indexedDB.databases();
        dbs.forEach((db) => {
          window.indexedDB.deleteDatabase(db.name);
        });
      } catch (e) {}
    }

    // 5) Force reload
    navigate("/admin/login");
    setTimeout(() => window.location.reload(true), 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">

      {/* ⭐ MOBILE TOP BAR */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <button onClick={() => setOpenMenu(true)}>
          <HiMenu size={28} />
        </button>
        <span className="text-lg font-semibold">Fanvist Backoffice</span>
        <div className="w-8" />
      </div>

      {/* ⭐ DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-slate-800 bg-slate-950">
        <Sidebar onLogout={handleLogout} />
      </aside>

      {/* ⭐ MOBILE BACKDROP */}
      {openMenu && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setOpenMenu(false)}
        ></div>
      )}

      {/* ⭐ MOBILE SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 w-64 h-full bg-slate-900 z-50 transform 
          transition-transform duration-300 ease-out lg:hidden shadow-xl 
          ${openMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
          <span className="text-lg font-semibold">Menu</span>
          <button onClick={() => setOpenMenu(false)}>
            <HiX size={28} />
          </button>
        </div>

        {/* ⭐ SCROLLABLE mobile menu */}
        <div className="h-full overflow-y-auto">
          <Sidebar
            onLogout={handleLogout}   // <--- FIX: Logout dùng bản xoá cache
            closeMenu={() => setOpenMenu(false)}
          />
        </div>
      </aside>

      {/* ⭐ MAIN CONTENT */}
      <main className="flex-1 w-full p-6 bg-gradient-to-br from-slate-950 to-slate-900 min-h-screen">
        {children}
      </main>
    </div>
  );
}

/* ============================================================
   ⭐ SIDEBAR — dùng cho cả mobile & desktop
============================================================ */
function Sidebar({ onLogout, closeMenu }) {
  const handleClick = () => {
    if (closeMenu) closeMenu();
  };

  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded text-sm transition 
     ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"}`;

  return (
    <nav className="flex flex-col p-4 gap-2">
      <div className="text-xl font-semibold mb-2">Fanvist Backoffice</div>

      <NavLink to="/admin/bookings" className={linkClass} onClick={handleClick}>
        Quản lý Booking
      </NavLink>

      <NavLink to="/admin/routes" className={linkClass} onClick={handleClick}>
        Tuyến đường & Giá
      </NavLink>

      <NavLink to="/admin/cars" className={linkClass} onClick={handleClick}>
        Quản lý xe
      </NavLink>

      <NavLink to="/admin/drivers" className={linkClass} onClick={handleClick}>
        Quản lý tài xế
      </NavLink>

      <NavLink to="/admin/vehicles" className={linkClass} onClick={handleClick}>
        Quản lý xe công ty
      </NavLink>

      <NavLink to="/admin/schedule" className={linkClass} onClick={handleClick}>
        Calendar phân công
      </NavLink>

      <NavLink to="/admin/driver-salary" className={linkClass} onClick={handleClick}>
        Lương tài xế
      </NavLink>

      <NavLink to="/admin/revenue" className={linkClass} onClick={handleClick}>
        Báo cáo doanh thu
      </NavLink>

      {/* ⭐ LOGOUT — FULL CACHE CLEAN */}
      <button
        onClick={() => {
          handleClick();
          onLogout(); // <--- Dùng hàm xoá cache full
        }}
        className="mt-6 px-4 py-2 text-left bg-slate-800 rounded hover:bg-slate-700 transition text-sm"
      >
        Đăng xuất
      </button>
    </nav>
  );
}
