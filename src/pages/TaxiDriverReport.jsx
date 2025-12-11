// src/pages/TaxiDriverReport.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

function formatDateToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatVNAmount(v) {
  if (!v) return "0";
  return Number(v).toLocaleString("vi-VN");
}

export default function TaxiDriverReport() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [driverTaxiId, setDriverTaxiId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);

  const [form, setForm] = useState({
    report_date: formatDateToday(),
    be_revenue: "",
    sm_revenue: "",
    be_wallet: "",
    sm_wallet: "",
    fuel_cost: "",
    other_cost: "",
    note: "",
  });

  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ======================================================
  // LOAD DRIVER ID theo user login (auth)
  // ======================================================
  useEffect(() => {
    async function loadDriver() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Bạn chưa đăng nhập!", "error");
        return;
      }

      // tìm driver_taxi dựa vào user_id
      const { data, error } = await supabase
        .from("driver_taxi")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        showToast("Không tìm thấy hồ sơ tài xế taxi!");
        return;
      }

      setDriverTaxiId(data.id);
      setDriverInfo(data);
    }

    loadDriver();
  }, []);

  // ======================================================
  // HANDLE SAVE REPORT
  // ======================================================
  async function saveReport() {
    if (!driverTaxiId) {
      showToast("Không có mã tài xế taxi!");
      return;
    }

    const payload = {
      driver_taxi_id: driverTaxiId,
      report_date: form.report_date,
      be_revenue: Number(form.be_revenue || 0),
      sm_revenue: Number(form.sm_revenue || 0),
      be_wallet: Number(form.be_wallet || 0),
      sm_wallet: Number(form.sm_wallet || 0),
      fuel_cost: Number(form.fuel_cost || 0),
      other_cost: Number(form.other_cost || 0),
      total_revenue:
        Number(form.be_revenue || 0) + Number(form.sm_revenue || 0),
      note: form.note,
    };

    setLoading(true);

    const { error } = await supabase
      .from("driver_taxi_daily_reports")
      .insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      showToast("Lưu thất bại!", "error");
      return;
    }

    showToast("Đã gửi báo cáo!", "success");

    // clear form
    setForm({
      report_date: formatDateToday(),
      be_revenue: "",
      sm_revenue: "",
      be_wallet: "",
      sm_wallet: "",
      fuel_cost: "",
      other_cost: "",
      note: "",
    });
  }

  // ======================================================
  // UI
  // ======================================================
  if (!driverTaxiId) {
    return (
      <div className="p-6 text-center text-slate-300">
        Đang tải thông tin tài xế…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto text-slate-100">
      <h1 className="text-xl font-bold mb-4 text-center">
        Báo cáo doanh thu Taxi – Tài xế
      </h1>

      {/* Thông tin tài xế */}
      <div className="bg-slate-800 p-4 rounded-lg mb-5 border border-slate-600">
        <div className="text-sm">
          <div><b>Tên tài xế:</b> {driverInfo?.driver_name || "—"}</div>
          <div><b>Biển số:</b> {driverInfo?.car_plate || "—"}</div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <Input
          label="Ngày báo cáo"
          type="date"
          value={form.report_date}
          onChange={(v) => setForm({ ...form, report_date: v })}
        />

        <Input
          label="Doanh thu BE"
          value={form.be_revenue}
          onChange={(v) => setForm({ ...form, be_revenue: v })}
        />

        <Input
          label="Doanh thu Xanh SM"
          value={form.sm_revenue}
          onChange={(v) => setForm({ ...form, sm_revenue: v })}
        />

        <Input
          label="Ví BE cuối ngày"
          value={form.be_wallet}
          onChange={(v) => setForm({ ...form, be_wallet: v })}
        />

        <Input
          label="Ví Xanh SM cuối ngày"
          value={form.sm_wallet}
          onChange={(v) => setForm({ ...form, sm_wallet: v })}
        />

        <Input
          label="Tiền nhiên liệu"
          value={form.fuel_cost}
          onChange={(v) => setForm({ ...form, fuel_cost: v })}
        />

        <Input
          label="Chi phí khác"
          value={form.other_cost}
          onChange={(v) => setForm({ ...form, other_cost: v })}
        />

        <TextArea
          label="Ghi chú"
          value={form.note}
          onChange={(v) => setForm({ ...form, note: v })}
        />

        <button
          onClick={saveReport}
          className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-white font-semibold"
        >
          Gửi báo cáo
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
            ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {toast.msg}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[999]">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ====================================
   SMALL INPUT COMPONENTS
==================================== */

function Input({ label, type = "number", value, onChange }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        className="w-full bg-slate-700 px-3 py-2 rounded text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <textarea
        rows={3}
        className="w-full bg-slate-700 px-3 py-2 rounded text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
