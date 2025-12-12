// src/pages/TaxiAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

/* ============================
   HELPERS
============================ */

function formatVNAmount(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "0 đ";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateInput(d) {
  return d.toISOString().slice(0, 10);
}

/* ============================
   MAIN COMPONENT
============================ */

export default function TaxiAdmin() {
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDateInput(today));
  const [toDate, setToDate] = useState(formatDateInput(today));

  const [selectedDriver, setSelectedDriver] = useState("all");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [reports, setReports] = useState([]);
  const [driverTaxiMap, setDriverTaxiMap] = useState({});

  function showToast(message, type = "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }

  /* ============================
      LOAD META: driver_taxi
  ============================ */
  async function loadMeta() {
    const { data, error } = await supabase.from("driver_taxi").select("*");

    if (error) {
      console.error(error);
      showToast("Lỗi tải danh sách tài xế", "error");
      return;
    }

    const map = {};
    (data || []).forEach((t) => {
      map[t.id] = t;
    });
    setDriverTaxiMap(map);
  }

  /* ============================
      LOAD REPORTS
  ============================ */
  async function loadReports() {
    setLoading(true);

    let query = supabase
      .from("driver_taxi_daily_reports")
      .select("*")
      .gte("report_date", fromDate)
      .lte("report_date", toDate);

    if (selectedDriver !== "all") {
      query = query.eq("driver_taxi_id", selectedDriver);
    }

    const { data, error } = await query.order("report_date", {
      ascending: true,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      showToast("Lỗi tải báo cáo", "error");
      return;
    }

    const enriched = (data || []).map((r) => {
      const taxi = driverTaxiMap[r.driver_taxi_id] || {};

      const be_rev = Number(r.be_revenue || 0);
      const sm_rev = Number(r.sm_revenue || 0);
      const fuel = Number(r.fuel_cost || 0);
      const other = Number(r.other_cost || 0);
      const cash = Number(r.cash_revenue || 0);

      /* =======================
          PHÍ SM = 28%
      ======================== */
      const sm_fee = Math.round(sm_rev * 0.28);

      /* =======================
          DOANH THU TRƯỚC & SAU PHÍ
      ======================== */
      const revenue_before_fee = be_rev + sm_rev;
      const revenue_after_fee = be_rev + (sm_rev - sm_fee);

      /* =======================
          VÍ
      ======================== */
      const be_start = Number(r.be_wallet_start || 0);
      const be_end = Number(r.be_wallet_end || 0);
      const sm_start = Number(r.sm_wallet_start || 0);
      const sm_end = Number(r.sm_wallet_end || 0);

      const delta_be = be_end - be_start;
      const delta_sm = sm_end - sm_start;

      /* =======================
          LƯƠNG THEO %
      ======================== */
      const share = Number(taxi.driver_share || 0);
      const driver_salary = (revenue_after_fee * share) / 100;

      const diff = driver_salary - cash;
      const driver_take = diff > 0 ? diff : 0;
      const driver_payback = diff < 0 ? -diff : 0;

      const owner_profit =
        revenue_after_fee - driver_salary - fuel - other;

      return {
        ...r,
        driverName: taxi.full_name || "Không rõ tài xế",
        driverPhone: taxi.phone || "",
        carPlate: taxi.car_plate || "—",
        driverShare: share,

        sm_fee,
        revenue_before_fee,
        revenue_after_fee,

        gross: revenue_after_fee,
        delta_be,
        delta_sm,
        driver_salary,
        driver_take,
        driver_payback,
        owner_profit,
      };
    });

    setReports(enriched);
  }

  /* ============================
      SUMMARY
  ============================ */
  const totalRevBefore = reports.reduce(
    (s, r) => s + (r.revenue_before_fee || 0),
    0
  );

  const totalSmFee = reports.reduce((s, r) => s + (r.sm_fee || 0), 0);

  const totalRevAfter = reports.reduce(
    (s, r) => s + (r.revenue_after_fee || 0),
    0
  );

  const totalDriverSalary = reports.reduce(
    (s, r) => s + Number(r.driver_salary || 0),
    0
  );

  const totalDriverTake = reports.reduce(
    (s, r) => s + Number(r.driver_take || 0),
    0
  );

  const totalDriverPayback = reports.reduce(
    (s, r) => s + Number(r.driver_payback || 0),
    0
  );

  const totalOwnerProfit = reports.reduce(
    (s, r) => s + Number(r.owner_profit || 0),
    0
  );

  const totalFuel = reports.reduce((s, r) => s + Number(r.fuel_cost || 0), 0);

  const totalOther = reports.reduce(
    (s, r) => s + Number(r.other_cost || 0),
    0
  );

  /* ============================
      EFFECTS
  ============================ */
  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (Object.keys(driverTaxiMap).length > 0) {
      loadReports();
    }
  }, [fromDate, toDate, selectedDriver, driverTaxiMap]);

  /* ============================
      RENDER
  ============================ */

  return (
    <div className="p-6 text-slate-200">

      {/* ============================
          HEADER + FILTERS
      ============================ */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          Quản lý Taxi – Bảng lương & ví
        </h1>

        <div className="flex gap-3 items-end">
          {/* SELECT DRIVER */}
          <div>
            <label className="text-xs text-slate-400">Tài xế</label>
            <select
              className="bg-slate-700 px-3 py-2 rounded block"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              <option value="all">Tất cả tài xế</option>
              {Object.values(driverTaxiMap).map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Từ ngày</label>
            <input
              type="date"
              className="bg-slate-700 px-3 py-2 rounded block"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Đến ngày</label>
            <input
              type="date"
              className="bg-slate-700 px-3 py-2 rounded block"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            className="px-4 py-2 bg-blue-600 rounded"
            onClick={() => {
              const d = formatDateInput(new Date());
              setFromDate(d);
              setToDate(d);
            }}
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* ============================
          TOP SUMMARY (3 BOX)
      ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Doanh thu trước phí"
          value={totalRevBefore}
          color="text-blue-300"
        />
        <SummaryCard
          label="Tổng phí SM (28%)"
          value={totalSmFee}
          color="text-red-300"
        />
        <SummaryCard
          label="Doanh thu sau phí"
          value={totalRevAfter}
          color="text-emerald-300"
        />
      </div>

      {/* ============================
          SUMMARY BLOCK CŨ
      ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

        <SummaryCard
          label="Tổng lương tài xế (theo %)"
          value={totalDriverSalary}
          color="text-emerald-400"
        />

        <SummaryCard
          label="Tổng chủ xe lợi nhuận"
          value={totalOwnerProfit}
          color="text-yellow-300"
        />

        <SummaryCard
          label="Tổng chi phí (nhiên liệu + khác)"
          value={totalFuel + totalOther}
          color="text-red-400"
        />

        <SummaryCard
          label="Doanh thu sau phí"
          value={totalRevAfter}
          color="text-blue-400"
        />
      </div>

      {/* ============================
          EXTRA SUMMARY
      ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SummaryCard
          label="Công ty cần trả thêm cho tài xế"
          value={totalDriverTake}
          color="text-emerald-300"
        />
        <SummaryCard
          label="Tài xế phải nộp lại công ty"
          value={totalDriverPayback}
          color="text-red-300"
        />
      </div>

      {/* ============================
          TABLE DỮ LIỆU
      ============================ */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex justify-between items-center">
          <span className="font-semibold text-sm">Danh sách báo cáo</span>
          {loading && (
            <span className="text-xs text-slate-400">Đang tải...</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-300 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Ngày</th>
                <th className="px-3 py-2 text-left">Tài xế</th>
                <th className="px-3 py-2 text-right">Doanh thu</th>
                <th className="px-3 py-2 text-left">Ví BE</th>
                <th className="px-3 py-2 text-left">Ví Xanh SM</th>
                <th className="px-3 py-2 text-right">Lương tài xế</th>
                <th className="px-3 py-2 text-right">Chủ xe lợi nhuận</th>
                <th className="px-3 py-2 text-left">Ghi chú</th>
              </tr>
            </thead>

            <tbody>
              {reports.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {reports.map((r) => {
                const beDeltaClass =
                  r.delta_be > 0
                    ? "text-emerald-300"
                    : r.delta_be < 0
                    ? "text-red-300"
                    : "text-slate-300";

                const smDeltaClass =
                  r.delta_sm > 0
                    ? "text-emerald-300"
                    : r.delta_sm < 0
                    ? "text-red-300"
                    : "text-slate-300";

                return (
                  <tr
                    key={r.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    {/* NGÀY */}
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold">
                        {formatDateVN(r.report_date)}
                      </div>
                    </td>

                    {/* TÀI XẾ */}
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold">{r.driverName}</div>
                      {r.driverPhone && (
                        <div className="text-xs text-slate-400">
                          {r.driverPhone}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Biển số: {r.carPlate}
                      </div>
                      <div className="text-[11px] text-amber-300 mt-1">
                        Tài xế {r.driverShare}% • Chủ {100 - r.driverShare}%
                      </div>
                    </td>

                    {/* DOANH THU */}
                    <td className="px-3 py-3 align-top text-right">
                      <div className="font-semibold text-emerald-300">
                        {formatVNAmount(r.revenue_after_fee)}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1">
                        Trước phí: {formatVNAmount(r.revenue_before_fee)}
                      </div>

                      <div className="text-[11px] text-red-400 mt-1">
                        Phí SM (28%): {formatVNAmount(r.sm_fee)}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1">
                        BE: {formatVNAmount(r.be_revenue)} • SM:{" "}
                        {formatVNAmount(r.sm_revenue)}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Tiền mặt: {formatVNAmount(r.cash_revenue)}
                      </div>
                    </td>

                    {/* VÍ BE */}
                    <td className="px-3 py-3 align-top">
                      <div className="text-xs text-slate-300">
                        Đầu: {formatVNAmount(r.be_wallet_start)}
                      </div>
                      <div className="text-xs text-slate-300">
                        Cuối: {formatVNAmount(r.be_wallet_end)}
                      </div>
                      <div className={`text-[11px] mt-1 ${beDeltaClass}`}>
                        Δ {formatVNAmount(r.delta_be)}
                      </div>
                    </td>

                    {/* VÍ SM */}
                    <td className="px-3 py-3 align-top">
                      <div className="text-xs text-slate-300">
                        Đầu: {formatVNAmount(r.sm_wallet_start)}
                      </div>
                      <div className="text-xs text-slate-300">
                        Cuối: {formatVNAmount(r.sm_wallet_end)}
                      </div>
                      <div className={`text-[11px] mt-1 ${smDeltaClass}`}>
                        Δ {formatVNAmount(r.delta_sm)}
                      </div>
                    </td>

                    {/* LƯƠNG */}
                    <td className="px-3 py-3 align-top text-right">
                      <div className="font-semibold text-emerald-300">
                        {formatVNAmount(r.driver_salary)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        TX nhận thêm:{" "}
                        <span className="text-emerald-300">
                          {formatVNAmount(r.driver_take)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        TX nộp lại:{" "}
                        <span className="text-red-300">
                          {formatVNAmount(r.driver_payback)}
                        </span>
                      </div>
                    </td>

                    {/* OWNER PROFIT */}
                    <td className="px-3 py-3 align-top text-right">
                      <div className="font-semibold text-yellow-300">
                        {formatVNAmount(r.owner_profit)}
                      </div>
                    </td>

                    {/* NOTE */}
                    <td className="px-3 py-3 align-top max-w-[240px]">
                      <div className="text-xs text-slate-300 whitespace-pre-wrap">
                        {r.note || "—"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
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
  );
}

/* ==================================
   SUMMARY CARD
================================== */
function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>
        {formatVNAmount(value)}
      </div>
    </div>
  );
}
