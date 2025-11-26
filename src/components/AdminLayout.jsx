import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="text-lg font-semibold tracking-tight">
            Fanvist Backoffice
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Quản lý tuyến & bảng giá
          </div>
        </div>

        <nav className="mt-4 px-2 space-y-1">
          <NavLink
            to="/admin/routes"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm ${isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-900"
              }`
            }
          >
            Tuyến đường & Giá
          </NavLink>
          <NavLink
            to="/admin/cars"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-900"
              }`
            }
          >
            Quản lý xe
          </NavLink>


          {/* Sau này có thêm menu: xe, booking, driver... */}
        </nav>

        <div className="mt-auto px-4 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full text-sm py-2 rounded-md border border-slate-700 hover:bg-slate-900"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 bg-gradient-to-br from-slate-950 to-slate-900">
        {children}
      </main>
    </div>
  );
}
