// src/pages/TaxiDriverLogin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useNavigate } from "react-router-dom";

export default function TaxiDriverLogin() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); // CCCD
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }

  async function handleLogin() {
    if (!phone || !password) return showToast("Nhập đủ thông tin!");

    setLoading(true);

    // ❌ KHÔNG DÙNG AUTH — chỉ query bảng driver_taxi
    const { data, error } = await supabase
      .from("driver_taxi")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    setLoading(false);

    if (error || !data) return showToast("Sai số điện thoại!");

    if (data.driver_id !== password) return showToast("Sai mật khẩu CCCD!");

    // ✔ CREATE LOCAL SESSION (NO AUTH)
    const session = {
      driverTaxiId: data.id,
      full_name: data.full_name,
      phone: data.phone,
      car_plate: data.car_plate,
    };

    localStorage.setItem("taxi_driver_session", JSON.stringify(session));

    showToast("Đăng nhập thành công!", "success");

    setTimeout(() => navigate("/taxi/driver/report"), 500);
  }

  return (
    <div className="min-h-screen bg-[#0b111f] flex items-center justify-center p-6 text-slate-200">
      <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-slate-700">
        <h1 className="text-xl font-bold mb-4 text-center">Đăng nhập Taxi</h1>

        <label className="text-sm">Số điện thoại</label>
        <input
          className="w-full p-2 rounded bg-slate-700 mt-1 mb-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <label className="text-sm">Mật khẩu (CCCD)</label>
        <input
          type="password"
          className="w-full p-2 rounded bg-slate-700 mt-1 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 bg-blue-600 rounded hover:bg-blue-500"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-2 rounded text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
