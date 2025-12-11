// src/pages/TaxiAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

/* ============================
   HELPERS
============================ */

function formatDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function formatVNAmount(v) {
  if (!v || Number.isNaN(v)) return "0 đ";
  return `${Number(v).toLocaleString("vi-VN")} đ`;
}

function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

// Tính trạng thái ví BE / SM
function getWalletStatus(wallet, baseline) {
  const w = Number(wallet || 0);
  const b = Number(baseline || 0);
  const delta = w - b;

  if (delta === 0) {
    return {
      delta,
      label: "Đúng chuẩn",
      color: "text-slate-300",
      bg: "bg-slate-800/50",
    };
  }

  if (delta > 0) {
    return {
      delta,
      label: `Dư ${delta.toLocaleString("vi-VN")} đ`,
      color: "text-emerald-400",
      bg: "bg-emerald-900/40",
    };
  }

  return {
    delta,
    label: `Thiếu ${Math.abs(delta).toLocaleString("vi-VN")} đ`,
    color: "text-red-400",
    bg: "bg-red-900/40",
  };
}

/* ============================
   MAIN COMPONENT
============================ */

export default function TaxiAdmin() {
  const today = new Date();

  const [fromDate, setFromDate] = useState(formatDateInput(today));
  const [toDate, setToDate] = useState(formatDateInput(today));

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [reports, setReports] = useState([]);

  const [driverTaxiMap, setDriverTaxiMap] = useState({});
  const [baselineMap, setBaselineMap] = useState({});
  const [driversMap, setDriversMap] = useState({});

  function showToast(message, type = "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }

  /* ============================
    LOAD META
  ============================ */
  async function loadMeta() {
    // driver_taxi
    const { data: taxiList } = await supabase.from("driver_taxi").select("*");
    const mapTaxi = {};
    (taxiList || []).forEach((t) => (mapTaxi[t.id] = t));
    setDriverTaxiMap(mapTaxi);

    // baselines
    const { data: baselines } = await supabase
      .from("taxi_app_baselines")
      .select("*");

    const mapBase = {};
    (baselines || []).forEach((b) => (mapBase[b.driver_taxi_id] = b));
    setBaselineMap(mapBase);

    // drivers
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, full_name, phone");

    const mapDrivers = {};
    (drivers || []).forEach((d) => (mapDrivers[d.id] = d));
    setDriversMap(mapDrivers);
  }

  /* ============================
    LOAD REPORTS
  ============================ */
  async function loadReports() {
    setLoading(true);

    const { data } = await supabase
      .from("driver_taxi_daily_reports")
      .select("*")
      .gte("report_date", fromDate)
      .lte("report_date", toDate)
      .order("report_date", { ascending: false });

    setLoading(false);

    const enriched = (data || []).map((r) => {
      const taxi = driverTaxiMap[r.driver_taxi_id] || {};
      const baseline = baselineMap[r.driver_taxi_id] || {};
      const driver = driversMap[taxi.driver_id] || {};

      const beStatus = getWalletStatus(r.be_wallet, baseline.be_baseline);
      const smStatus = getWalletStatus(r.sm_wallet, baseline.sm_baseline);

      return {
        ...r,
        driverName: driver.full_name || "Không rõ tài xế",
        driverPhone: driver.phone || "",
        carPlate: taxi.car_plate || "—",
        beBaseline: baseline.be_baseline || 0,
        smBaseline: baseline.sm_baseline || 0,
        beStatus,
        smStatus,
        totalDelta: (beStatus.delta || 0) + (smStatus.delta || 0),
      };
    });

    setReports(enriched);
  }

  /* ============================
    SUMMARY VALUES
  ============================ */

  const totalRevenue = reports.reduce(
    (s, r) => s + Number(r.total_revenue || 0),
    0
  );

  const totalPositive = reports.reduce((s, r) => {
    return s + Math.max(0, r.beStatus.delta) + Math.max(0, r.smStatus.delta);
  }, 0);

  const totalNegative = reports.reduce((s, r) => {
    return s + Math.abs(Math.min(0, r.beStatus.delta)) + Math.abs(Math.min(0, r.smStatus.delta));
  }, 0);

  const netWallet = totalPositive - totalNegative;

  /* ============================
    EFFECTS
  ============================ */

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (
      Object.keys(driverTaxiMap).length &&
      Object.keys(baselineMap).length &&
      Object.keys(driversMap).length
    ) {
      loadReports();
    }
  }, [fromDate, toDate, driverTaxiMap, baselineMap, driversMap]);

  /* ============================
    RENDER
  ============================ */
  return (
    <div className="p-6 text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Quản lý Taxi (Báo cáo ngày)</h1>

        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-700 px-3 py-2 rounded block"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-700 px-3 py-2 rounded block"
            />
          </div>

          <button
            onClick={() => {
              const d = formatDateInput(new Date());
              setFromDate(d);
              setToDate(d);
            }}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Tổng doanh thu" value={totalRevenue} color="text-blue-400" />
        <SummaryCard label="Tổng ví dương (tài xế nhận)" value={totalPositive} color="text-emerald-400" />
        <SummaryCard label="Tổng ví âm (tài xế hoàn)" value={totalNegative} color="text-red-400" />
        <SummaryCard
          label="Net ví (dương: chủ trả / âm: tài xế trả)"
          value={netWallet}
          color={netWallet >= 0 ? "text-emerald-300" : "text-red-300"}
        />
      </div>
      {/* TABLE */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
        {/* HEADER TABLE */}
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="font-semibold text-sm">
            Danh sách báo cáo theo ngày
          </span>
          {loading && <span className="text-xs text-slate-400">Đang tải...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-300 text-xs uppercase">
              <tr>
                <th className="px-3 py-3 text-left">Ngày</th>
                <th className="px-3 py-3 text-left">Tài xế</th>
                <th className="px-3 py-3 text-left">Xe</th>
                <th className="px-3 py-3 text-right">Doanh thu</th>

                {/* BE */}
                <th className="px-3 py-3 text-left">BE</th>

                {/* SM */}
                <th className="px-3 py-3 text-left">Xanh SM</th>

                <th className="px-3 py-3 text-right">Nhiên liệu</th>
                <th className="px-3 py-3 text-right">Chi phí khác</th>
                <th className="px-3 py-3 text-left">Ghi chú</th>
              </tr>
            </thead>

            <tbody>
              {/* NO DATA */}
              {reports.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                    Không có dữ liệu trong khoảng ngày đã chọn
                  </td>
                </tr>
              )}

              {/* DATA ROWS */}
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-800 hover:bg-slate-800/40 transition"
                >
                  {/* NGÀY */}
                  <td className="px-3 py-3 align-top font-medium text-slate-100">
                    {formatDateVN(r.report_date)}
                  </td>

                  {/* TÀI XẾ */}
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold">{r.driverName}</div>
                    {r.driverPhone && (
                      <div className="text-xs text-slate-400">{r.driverPhone}</div>
                    )}
                  </td>

                  {/* XE */}
                  <td className="px-3 py-3 align-top">
                    <div className="font-mono">{r.carPlate}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ID: {r.driver_taxi_id?.slice(0, 8)}…
                    </div>
                  </td>

                  {/* DOANH THU */}
                  <td className="px-3 py-3 align-top text-right">
                    <div className="font-semibold text-emerald-300">
                      {formatVNAmount(r.total_revenue)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      BE: {formatVNAmount(r.be_revenue)} • SM:{" "}
                      {formatVNAmount(r.sm_revenue)}
                    </div>
                  </td>

                  {/* BE (Wallet Display) */}
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-300">
                        Ví thực tế: {formatVNAmount(r.be_wallet)}
                      </div>

                      <div className="text-xs text-slate-400">
                        Chuẩn: {formatVNAmount(r.beBaseline)}
                      </div>

                      {/* STATUS BOX */}
                      <div
                        className={`text-[11px] px-2 py-1 rounded ${r.beStatus.bg} ${r.beStatus.color}`}
                      >
                        {r.beStatus.label}
                      </div>
                    </div>
                  </td>

                  {/* XANH SM */}
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-300">
                        Ví thực tế: {formatVNAmount(r.sm_wallet)}
                      </div>

                      <div className="text-xs text-slate-400">
                        Chuẩn: {formatVNAmount(r.smBaseline)}
                      </div>

                      <div
                        className={`text-[11px] px-2 py-1 rounded ${r.smStatus.bg} ${r.smStatus.color}`}
                      >
                        {r.smStatus.label}
                      </div>
                    </div>
                  </td>

                  {/* NHIÊN LIỆU */}
                  <td className="px-3 py-3 text-right align-top">
                    {formatVNAmount(r.fuel_cost)}
                  </td>

                  {/* CHI PHÍ KHÁC */}
                  <td className="px-3 py-3 text-right align-top">
                    {formatVNAmount(r.other_cost)}
                  </td>

                  {/* GHI CHÚ */}
                  <td className="px-3 py-3 align-top max-w-[220px]">
                    <div className="text-xs text-slate-300 whitespace-pre-wrap">
                      {r.note || "—"}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[999]">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUMMARY CARD COMPONENT
=========================================================================== */
function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>
        {formatVNAmount(value)}
      </div>
    </div>
  );
}
