import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function DriverLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1️⃣ Lấy tài xế theo phone
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("phone", phone)
      .eq("is_active", true)
      .single();

    setLoading(false);

    if (error || !data) {
      setError("Sai số điện thoại hoặc tài xế không tồn tại.");
      return;
    }

    // 2️⃣ password = personal_number
    if (password !== data.personal_number) {
      setError("Mật khẩu không đúng!");
      return;
    }

    // 3️⃣ Lưu session
    localStorage.setItem("driver", JSON.stringify(data));

    // 4️⃣ Chuyển tới dashboard tài xế
    window.location.href = "/driver-dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-xl w-[360px] border border-slate-700 shadow-lg">
        
        <h1 className="text-2xl font-bold mb-6 text-center">
          Đăng nhập tài xế
        </h1>

        {error && (
          <div className="mb-4 p-2 bg-red-700 rounded text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <label className="text-sm mb-1 block">Số điện thoại</label>
            <input
              type="text"
              className="w-full p-3 bg-slate-700 rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0912345678"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block">Mật khẩu (số CCCD)</label>
            <input
              type="password"
              className="w-full p-3 bg-slate-700 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập số CCCD / CMND"
            />
          </div>

          <button
            className="w-full py-3 bg-blue-600 rounded-lg font-semibold"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

        </form>
      </div>
    </div>
  );
}
