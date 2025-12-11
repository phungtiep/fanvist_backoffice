// src/pages/TaxiDriverLogin.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function TaxiDriverLogin() {
  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ======================================================
  // LOGIN: EMAIL + PASSWORD
  // ======================================================
  async function handlePasswordLogin() {
    if (!email || !password) {
      showToast("Vui lòng nhập email & mật khẩu!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      showToast("Sai email hoặc mật khẩu!");
      return;
    }

    showToast("Đăng nhập thành công!", "success");

    setTimeout(() => {
      window.location.href = "/taxi-driver-report";
    }, 800);
  }

  // ======================================================
  // LOGIN WITH OTP (MAGIC LINK)
  // ======================================================
  async function handleOtpLogin() {
    if (!email) {
      showToast("Vui lòng nhập email!");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/taxi-driver-report` },
    });

    setLoading(false);

    if (error) {
      showToast("Không gửi được mã OTP!");
      return;
    }

    showToast("Đã gửi link đăng nhập vào Email!", "success");
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center px-6">
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl w-full max-w-sm text-slate-200 shadow-xl">
        <h1 className="text-xl font-bold mb-4 text-center">
          Đăng nhập tài xế Taxi
        </h1>

        {/* SELECT LOGIN MODE */}
        <div className="flex mb-4 border border-slate-600 rounded-lg overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm ${
              mode === "password" ? "bg-blue-600" : "bg-slate-700"
            }`}
            onClick={() => setMode("password")}
          >
            Mật khẩu
          </button>
          <button
            className={`flex-1 py-2 text-sm ${
              mode === "otp" ? "bg-blue-600" : "bg-slate-700"
            }`}
            onClick={() => setMode("otp")}
          >
            OTP Email
          </button>
        </div>

        {/* EMAIL INPUT */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 mb-1 block">Email</label>
          <input
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
          />
        </div>

        {/* PASSWORD MODE */}
        {mode === "password" && (
          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-1 block">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••"
            />
          </div>
        )}

        {/* LOGIN BUTTON */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-semibold"
          onClick={mode === "password" ? handlePasswordLogin : handleOtpLogin}
        >
          {mode === "password" ? "Đăng nhập" : "Gửi mã OTP"}
        </button>

        {/* LINK TO SWITCH MODE */}
        <div className="text-center text-xs mt-4 text-slate-400">
          {mode === "password"
            ? "Hoặc dùng đăng nhập qua Email OTP"
            : "Hoặc đăng nhập bằng mật khẩu"}
        </div>

        {/* TOAST */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
              ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
          >
            {toast.message}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[999]">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
