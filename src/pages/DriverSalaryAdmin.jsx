// src/pages/DriverSalaryAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function DriverSalaryAdmin() {
  // ======= DEFAULT DATE =======
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // ======= STATE =======
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);

  const [summary, setSummary] = useState({
    driver: null,
    revenue: 0,
    driverPay: 0,
    baseSalary: 0,
    commission: 0,
    profit: 0,
  });

  const [details, setDetails] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }

  // ======= FORMAT DATE =======
  function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("vi-VN");
  }

  // ======= LOAD ROUTES =======
  async function loadRoutes() {
    try {
      const res = await fetch("/api/routes");
      const json = await res.json();

      if (Array.isArray(json)) setRoutes(json);
      else if (json.routes) setRoutes(json.routes);
      else setRoutes([]);

    } catch (err) {
      console.error("Load routes error:", err);
    }
  }

  function getRouteName(code) {
    if (!code) return "—";
    const key = code.toString().trim().toLowerCase();
    const found = routes.find(
      (r) => r.code?.toString().trim().toLowerCase() === key
    );
    return found?.name || code;
  }

  // ======= LOAD DRIVERS =======
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name");

      setDrivers(data || []);
    })();

    loadRoutes();
  }, []);

  // ======= LOAD SALARY (with corrected date filter) =======
  useEffect(() => {
    if (!driverId) return;
    loadSalary();
  }, [driverId, fromDate, toDate]);

  async function loadSalary() {
    setLoading(true);

    // Load driver info
    const { data: driver } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .single();

    if (!driver) {
      showToast("Không tìm thấy tài xế", "error");
      setLoading(false);
      return;
    }

    // Load ALL trips for this driver (no date filter yet)
    const { data: rows } = await supabase
      .from("driver_assignments")
      .select(`
        *,
        booking:bookings (*),
        vehicle:vehicles (plate_number)
      `)
      .eq("driver_id", driverId);

    // Convert from/to date into Date objects
    const dFrom = new Date(fromDate);
    const dTo = new Date(toDate);

    // Filter by booking.date instead of assigned_at
    const filtered = (rows || []).filter((r) => {
      if (!r.booking?.date) return false;

      const d = new Date(r.booking.date);
      if (isNaN(d)) return false;

      return d >= dFrom && d <= dTo;
    });

    // Sort by booking.date ascending
    filtered.sort(
      (a, b) => new Date(a.booking.date) - new Date(b.booking.date)
    );

    setDetails(filtered);

    // ===== CALCULATE TOTALS =====
    let revenue = 0;
    filtered.forEach((r) => (revenue += r.booking?.total_price || 0));

    const baseSalary = driver.base_salary || 0;
    const commissionPercent = driver.commission_percent || 0;
    const rate = commissionPercent / 100;

    const commissionMoney = revenue * rate;
    const driverPay = baseSalary + commissionMoney;
    const profit = revenue - commissionMoney;

    setSummary({
      driver,
      revenue,
      baseSalary,
      commission: commissionPercent,
      driverPay,
      profit,
    });

    setLoading(false);
  }

  // ===== APPROVE FUNCTIONS =====
  async function approveOne(id) {
    await supabase
      .from("driver_assignments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("id", id);

    showToast("Đã duyệt chuyến");
    loadSalary();
  }

  async function approveRange() {
    await supabase
      .from("driver_assignments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("driver_id", driverId);

    showToast("Đã duyệt khoảng ngày!");
    loadSalary();
  }

  // ===== RENDER =====
  return (
    <div className="p-6 text-slate-200">

      <h1 className="text-2xl font-bold mb-6">Tính lương tài xế</h1>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-4 mb-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div>
            <div className="text-xs text-slate-400 mb-1">Tài xế</div>
            <select
              className="w-full h-11 px-3 bg-slate-700 rounded"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Chọn tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} • {d.phone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Từ ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Đến ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* SUMMARY */}
        {summary.driver && (
          <div className="bg-slate-900/50 p-4 rounded border border-slate-700">

            <p><strong>Tài xế:</strong> {summary.driver.full_name}</p>
            <p><strong>Lương cơ bản:</strong> {summary.baseSalary.toLocaleString("vi-VN")} đ</p>
            <p><strong>% hoa hồng:</strong> {summary.commission}%</p>
            <p><strong>Doanh thu:</strong> {summary.revenue.toLocaleString("vi-VN")} đ</p>
            <p><strong>Tổng lương:</strong> {summary.driverPay.toLocaleString("vi-VN")} đ</p>
            <p><strong>Lợi nhuận công ty:</strong> {summary.profit.toLocaleString("vi-VN")} đ</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={approveRange}
                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
              >
                Duyệt khoảng ngày
              </button>
            </div>
          </div>
        )}

      </div>

      {/* TABLE */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 font-semibold">
          Chi tiết chuyến
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Tuyến</th>
                <th className="px-3 py-2">Biển số</th>
                <th className="px-3 py-2 text-right">Doanh thu</th>
                <th className="px-3 py-2 text-right">Tài xế nhận</th>
                <th className="px-3 py-2 text-right">Lợi nhuận</th>
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2 text-center">Duyệt</th>
              </tr>
            </thead>

            <tbody>
              {details.map((r) => {
                const total = r.booking?.total_price || 0;
                const rate = summary.commission / 100;
                const driverMoney = total * rate;
                const companyMoney = total - driverMoney;

                return (
                  <tr key={r.id} className="border-t border-slate-700">

                    <td className="px-3 py-2">{formatDateVN(r.booking?.date)}</td>

                    <td className="px-3 py-2">{getRouteName(r.booking?.route)}</td>

                    <td className="px-3 py-2">{r.vehicle?.plate_number || "—"}</td>

                    <td className="px-3 py-2 text-right">
                      {total.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-emerald-400">
                      {driverMoney.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-yellow-300">
                      {companyMoney.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-center">
                      {r.paid ? (
                        <span className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 text-xs">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-slate-600/40 text-slate-300 text-xs">
                          Chưa duyệt
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {r.paid ? (
                        <button disabled className="px-3 py-1 text-xs rounded bg-emerald-700/30 text-emerald-300">
                          Đã duyệt
                        </button>
                      ) : (
                        <button
                          onClick={() => approveOne(r.id)}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500"
                        >
                          Duyệt
                        </button>
                      )}
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
        <div className="fixed top-5 right-5 px-4 py-2 rounded bg-emerald-600 text-white shadow-lg">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
