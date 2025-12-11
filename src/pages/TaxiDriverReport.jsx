// src/pages/TaxiDriverReport.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

function formatDateToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function TaxiDriverReport() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [driverSession, setDriverSession] = useState(null);
  const [driverTaxi, setDriverTaxi] = useState(null);

  const [form, setForm] = useState({
    report_date: formatDateToday(),
    be_revenue: "",
    sm_revenue: "",
    cash_revenue: "",
    be_wallet_start: "",
    be_wallet_end: "",
    sm_wallet_start: "",
    sm_wallet_end: "",
    fuel_cost: "",
    other_cost: "",
    note: "",
  });

  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ========================================
  // LOAD SESSION + VÍ ĐẦU NGÀY
  // ========================================
  useEffect(() => {
    const raw = localStorage.getItem("taxi_driver_session");
    if (!raw) return;

    try {
      const session = JSON.parse(raw);
      if (session && session.driverTaxiId) {
        setDriverSession(session);
        loadDriverAndLastReport(session.driverTaxiId);
      }
    } catch (e) {
      console.error("Invalid taxi_driver_session", e);
    }
  }, []);

  async function loadDriverAndLastReport(driverTaxiId) {
    setLoading(true);

    // 1) Lấy info driver_taxi
    const { data: driver, error: errDriver } = await supabase
      .from("driver_taxi")
      .select("*")
      .eq("id", driverTaxiId)
      .maybeSingle();

    if (errDriver || !driver) {
      setLoading(false);
      showToast("Không tìm thấy hồ sơ tài xế!", "error");
      return;
    }

    setDriverTaxi(driver);

    // 2) Lấy report gần nhất
    const { data: lastReport, error: errLast } = await supabase
      .from("driver_taxi_daily_reports")
      .select("be_wallet_end, sm_wallet_end, report_date")
      .eq("driver_taxi_id", driverTaxiId)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLoading(false);

    let beStart = 0;
    let smStart = 0;

    if (lastReport && !errLast) {
      beStart = Number(lastReport.be_wallet_end || 0);
      smStart = Number(lastReport.sm_wallet_end || 0);
    } else {
      beStart = Number(driver.be_wallet_init || 0);
      smStart = Number(driver.sm_wallet_init || 0);
    }

    setForm((prev) => ({
      ...prev,
      report_date: formatDateToday(),
      be_wallet_start: String(beStart),
      sm_wallet_start: String(smStart),
      be_wallet_end: "",
      sm_wallet_end: "",
    }));
  }

  // ========================================
  // SAVE REPORT
  // ========================================
  async function saveReport() {
    if (!driverSession?.driverTaxiId) {
      showToast("Bạn chưa đăng nhập!", "error");
      return;
    }

    if (!form.report_date) {
      showToast("Chưa chọn ngày báo cáo", "error");
      return;
    }

    const payload = {
      driver_taxi_id: driverSession.driverTaxiId,
      report_date: form.report_date,

      be_revenue: Number(form.be_revenue || 0),
      sm_revenue: Number(form.sm_revenue || 0),
      cash_revenue: Number(form.cash_revenue || 0),

      be_wallet_start: Number(form.be_wallet_start || 0),
      be_wallet_end: Number(form.be_wallet_end || 0),

      sm_wallet_start: Number(form.sm_wallet_start || 0),
      sm_wallet_end: Number(form.sm_wallet_end || 0),

      fuel_cost: Number(form.fuel_cost || 0),
      other_cost: Number(form.other_cost || 0),

      note: form.note || "",
    };

    setLoading(true);

    const { error } = await supabase
      .from("driver_taxi_daily_reports")
      .insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      showToast("Lưu báo cáo thất bại!", "error");
      return;
    }

    showToast("Đã gửi báo cáo!", "success");

    // Clear field doanh thu, ví cuối, chi phí; giữ nguyên ví đầu để lần sau sửa lại
    setForm((prev) => ({
      ...prev,
      be_revenue: "",
      sm_revenue: "",
      cash_revenue: "",
      be_wallet_end: "",
      sm_wallet_end: "",
      fuel_cost: "",
      other_cost: "",
      note: "",
      report_date: formatDateToday(),
    }));
  }

  // ========================================
  // RENDER
  // ========================================

  if (!driverSession) {
    return (
      <div className="min-h-screen bg-[#0b111f] flex items-center justify-center text-slate-200">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 max-w-sm text-center">
          <div className="font-semibold mb-2">Bạn chưa đăng nhập</div>
          <div className="text-sm text-slate-400">
            Vui lòng đăng nhập ở trang{" "}
            <code className="bg-slate-900 px-1 rounded">/taxi/driver/login</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b111f] text-slate-100 p-4">
      <div className="max-w-xl mx-auto bg-slate-900/70 border border-slate-700 rounded-xl p-5">
        <h1 className="text-xl font-bold mb-3 text-center">
          Báo cáo doanh thu Taxi – Tài xế
        </h1>

        {/* Thông tin tài xế */}
        {driverTaxi && (
          <div className="bg-slate-800/70 border border-slate-600 rounded-lg p-3 mb-5 text-sm">
            <div>
              <b>Tài xế:</b> {driverTaxi.full_name}
            </div>
            <div>
              <b>SĐT:</b> {driverTaxi.phone}
            </div>
            <div>
              <b>Biển số:</b> {driverTaxi.car_plate || "—"}
            </div>
            <div>
              <b>Tỉ lệ tài xế:</b> {Number(driverTaxi.driver_share || 0)}%
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4 text-sm">
          <Input
            label="Ngày báo cáo"
            type="date"
            value={form.report_date}
            onChange={(v) => setForm({ ...form, report_date: v })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Doanh thu BE (tổng)"
              value={form.be_revenue}
              onChange={(v) => setForm({ ...form, be_revenue: v })}
            />
            <Input
              label="Doanh thu Xanh SM (tổng)"
              value={form.sm_revenue}
              onChange={(v) => setForm({ ...form, sm_revenue: v })}
            />
          </div>

          <Input
            label="Tổng tiền mặt đã thu trong ngày"
            value={form.cash_revenue}
            onChange={(v) => setForm({ ...form, cash_revenue: v })}
          />

          {/* Ví BE */}
          <div className="border border-slate-700 rounded-lg p-3">
            <div className="font-semibold mb-2 text-amber-300">
              Ví BE trong app
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ví đầu ngày"
                value={form.be_wallet_start}
                readOnly
              />
              <Input
                label="Ví cuối ngày"
                value={form.be_wallet_end}
                onChange={(v) => setForm({ ...form, be_wallet_end: v })}
              />
            </div>
          </div>

          {/* Ví Xanh SM */}
          <div className="border border-slate-700 rounded-lg p-3">
            <div className="font-semibold mb-2 text-emerald-300">
              Ví Xanh SM trong app
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ví đầu ngày"
                value={form.sm_wallet_start}
                readOnly
              />
              <Input
                label="Ví cuối ngày"
                value={form.sm_wallet_end}
                onChange={(v) => setForm({ ...form, sm_wallet_end: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <TextArea
            label="Ghi chú"
            value={form.note}
            onChange={(v) => setForm({ ...form, note: v })}
          />

          <button
            onClick={saveReport}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2 rounded font-semibold mt-2"
          >
            {loading ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </div>
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

function Input({ label, type = "number", value, onChange, readOnly }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        className={`w-full bg-slate-700 px-3 py-2 rounded text-sm ${
          readOnly ? "opacity-80 cursor-not-allowed" : ""
        }`}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange && onChange(e.target.value)}
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
