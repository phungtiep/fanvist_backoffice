import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    // Đã login rồi thì không cần vào lại trang login
    navigate("/admin/routes");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message || "Đăng nhập thất bại");
    } else {
      navigate("/admin/routes");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold mb-2 text-white">
          Fanvist Backoffice
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Đăng nhập để quản lý tuyến đường và bảng giá.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-slate-300">
              Email admin
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-slate-300">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 px-3 py-2 rounded-md">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2 text-sm font-medium rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-500">
          Tài khoản admin được tạo trong Supabase Auth.  
          Vào Authentication → Users để tạo/email/password.
        </p>
      </div>
    </div>
  );
}
