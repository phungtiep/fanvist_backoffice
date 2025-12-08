// src/pages/DriverSalaryAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function DriverSalaryAdmin() {
  // ======= DATE DEFAULT =======
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
    setTimeout(() => setToast(null), 2500);
  }

  // ======= FORMAT DATE =======
  function formatDateVN(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

  // ======= LOAD SALARY =======
  useEffect(() => {
    if (!driverId) return;
    loadSalary();
  }, [driverId, fromDate, toDate]);

  async function loadSalary() {
    setLoading(true);

    // Driver info
    const { data: driver, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .single();

    if (error || !driver) {
      console.error(error);
      showToast("Không tải được tài xế", "error");
      setLoading(false);
      return;
    }

    // Trips list
    const { data: rows, error: err2 } = await supabase
      .from("driver_assignments")
      .select(
        `
        *,
        booking:bookings!fk_driver_assignments_booking (*),
        vehicle:vehicles!fk_driver_assignments_vehicle (plate_number, brand)
      `
      )
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate);

    if (err2) {
      console.error(err2);
      showToast("Không tải được danh sách chuyến", "error");
      setLoading(false);
      return;
    }

    // Sort by booking.date
    const sorted = [...(rows || [])].sort((a, b) => {
      const da = new Date(a.booking?.date || 0);
      const db = new Date(b.booking?.date || 0);
      return da - db;
    });

    setDetails(sorted);

    // ======= TÍNH LƯƠNG CHUẨN % =======
    let revenue = 0;
    sorted.forEach((r) => {
      revenue += r.booking?.total_price || 0;
    });

    const baseSalary = driver.base_salary || 0;
    const commissionPercent = driver.commission_percent || 0; // luôn % (20 = 20%)
    const rate = commissionPercent / 100; // convert to decimal

    const commissionMoney = revenue * rate; // tiền hoa hồng
    const driverPay = baseSalary + commissionMoney;
    const profit = revenue - driverPay;

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

  // ====== APPROVE ONE =======
  async function approveOne(id) {
    setApproving(true);
    await supabase
      .from("driver_assignments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("id", id);

    setApproving(false);
    showToast("Đã duyệt chuyến", "success");
    loadSalary();
  }

  // ====== APPROVE DAY =======
  async function approveDay() {
    if (fromDate !== toDate) {
      showToast("Từ ngày và đến ngày phải giống nhau", "error");
      return;
    }

    setApproving(true);
    await supabase
      .from("driver_assignments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate);

    setApproving(false);
    showToast("Đã duyệt lương ngày!", "success");
    loadSalary();
  }

  // ====== APPROVE RANGE =======
  async function approveRange() {
    setApproving(true);
    await supabase
      .from("driver_assignments")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate);

    setApproving(false);
    showToast("Đã duyệt lương!", "success");
    loadSalary();
  }

  // ======= RENDER =======
  return (
    <div className="p-6 text-slate-200">
      <h1 className="text-2xl font-bold mb-6">Tính lương tài xế</h1>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Driver */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Tài xế</div>
            <select
              className="w-full h-11 px-3 bg-slate-700 rounded text-sm"
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

          {/* From date */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Từ ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To date */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Đến ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

        </div>

        {/* SUMMARY */}
        {summary.driver && (
          <div className="bg-slate-900/60 p-4 rounded border border-slate-700 text-sm">
            <p><strong>Tài xế:</strong> {summary.driver.full_name}</p>
            <p><strong>Lương cơ bản:</strong> {summary.baseSalary.toLocaleString("vi-VN")} đ</p>
            <p><strong>% hoa hồng:</strong> {summary.commission}%</p>
            <p><strong>Doanh thu:</strong> {summary.revenue.toLocaleString("vi-VN")} đ</p>
            <p><strong>Tổng lương:</strong> {summary.driverPay.toLocaleString("vi-VN")} đ</p>
            <p><strong>Lợi nhuận công ty:</strong> {summary.profit.toLocaleString("vi-VN")} đ</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={approveDay}
                disabled={!driverId || fromDate !== toDate}
                className="px-3 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
              >
                Duyệt ngày
              </button>

              <button
                onClick={approveRange}
                disabled={!driverId}
                className="px-3 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
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
          Chi tiết chuyến {loading && <span className="text-xs text-slate-400"> (đang tải...)</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Ngày</th>
                <th className="px-3 py-2 text-left">Tuyến</th>
                <th className="px-3 py-2 text-left">Biển số</th>
                <th className="px-3 py-2 text-right">Doanh thu</th>
                <th className="px-3 py-2 text-right">Tài xế nhận</th>
                <th className="px-3 py-2 text-right">Lợi nhuận</th>
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2 text-center">Duyệt</th>
              </tr>
            </thead>

            <tbody>
              {details.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {details.map((r) => {
                const tripTotal = r.booking?.total_price || 0;
                const rate = summary.commission / 100;
                const driverMoney = tripTotal * rate;
                const companyMoney = tripTotal - driverMoney;

                return (
                  <tr key={r.id} className="border-t border-slate-700">
                    <td className="px-3 py-2">{formatDateVN(r.booking?.date)}</td>

                    <td className="px-3 py-2">{getRouteName(r.booking?.route)}</td>

                    <td className="px-3 py-2">{r.vehicle?.plate_number || "—"}</td>

                    <td className="px-3 py-2 text-right">{tripTotal.toLocaleString("vi-VN")} đ</td>

                    <td className="px-3 py-2 text-right text-emerald-400">
                      {driverMoney.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-yellow-300">
                      {companyMoney.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-center">
                      {r.paid ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-300">Đã duyệt</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-600/40 text-slate-300">Chưa duyệt</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {r.paid ? (
                        <button disabled className="px-3 py-1 text-xs rounded-lg bg-emerald-700/30 text-emerald-300">
                          Đã duyệt
                        </button>
                      ) : (
                        <button
                          onClick={() => approveOne(r.id)}
                          disabled={approving}
                          className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
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
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg z-[999] text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
