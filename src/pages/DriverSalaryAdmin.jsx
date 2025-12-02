// src/pages/DriverSalaryAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function DriverSalaryAdmin() {
  // ======= DATE DEFAULT: đầu – cuối tháng hiện tại =======
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // ======= STATE =======
  const [drivers, setDrivers] = useState([]);
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

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
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
  }, []);

  // ======= LOAD SALARY =======
  useEffect(() => {
    if (!driverId) return;
    loadSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId, fromDate, toDate]);

  async function loadSalary() {
    setLoading(true);

    // 1) Info tài xế
    const { data: driver } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .single();

    if (!driver) {
      setLoading(false);
      return;
    }

    // 2) Các chuyến đã phân công cho tài xế
    const { data: rows, error } = await supabase
      .from("driver_assignments")
      .select(`
        *,
        booking:bookings!fk_driver_assignments_booking (*, route, total_price, date),
        vehicle:vehicles!fk_driver_assignments_vehicle (plate_number, brand)
      `)
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate)
      .order("assigned_at", { ascending: true });

    if (error) {
      console.error(error);
      showToast("Không load được dữ liệu lương", "error");
      setLoading(false);
      return;
    }

    // 3) Tính tổng
    let revenue = 0;
    let driverPay = 0;
    let profit = 0;

    rows.forEach((r) => {
      revenue += r.booking?.total_price || 0;
      driverPay += r.driver_pay || 0;
      profit += r.company_profit || 0;
    });

    // + lương cơ bản
    driverPay += driver.base_salary || 0;

    setSummary({
      driver,
      revenue,
      driverPay,
      baseSalary: driver.base_salary || 0,
      commission: driver.commission_percent || 0,
      profit,
    });

    setDetails(rows || []);
    setLoading(false);
  }

  return (
    <div className="p-6 text-slate-200">
      <h1 className="text-2xl font-bold mb-6">Tính lương tài xế</h1>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tài xế */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Tài xế</div>
            <select
              className="w-full p-2 bg-slate-700 rounded"
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

          {/* Từ ngày */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Từ ngày</div>
            <input
              type="date"
              className="w-full p-2 bg-slate-700 rounded"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* Đến ngày */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Đến ngày</div>
            <input
              type="date"
              className="w-full p-2 bg-slate-700 rounded"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* SUMMARY */}
        {summary.driver && (
          <div className="bg-slate-900/60 p-4 rounded border border-slate-700 text-sm leading-6">
            <p>
              <strong>Tài xế:</strong> {summary.driver.full_name}
            </p>
            <p>
              <strong>% chia:</strong> {summary.commission}%
            </p>
            <p>
              <strong>Lương cơ bản:</strong>{" "}
              {summary.baseSalary.toLocaleString("vi-VN")} đ
            </p>
            <p>
              <strong>Doanh thu:</strong>{" "}
              {summary.revenue.toLocaleString("vi-VN")} đ
            </p>
            <p>
              <strong>Tổng lương tài xế:</strong>{" "}
              {summary.driverPay.toLocaleString("vi-VN")} đ
            </p>
            <p>
              <strong>Lợi nhuận công ty:</strong>{" "}
              {summary.profit.toLocaleString("vi-VN")} đ
            </p>
          </div>
        )}
      </div>

      {/* BẢNG CHI TIẾT */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 font-semibold">
          Chi tiết chuyến{" "}
          {loading && (
            <span className="text-xs text-slate-400"> (đang tải...)</span>
          )}
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
              </tr>
            </thead>
            <tbody>
              {details.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {details.map((r) => {
                // 🔧 LẤY NGÀY ĐI: ưu tiên booking.date, fallback assigned_at
                const rideDate = r.booking?.date || r.assigned_at;
                const dateLabel = rideDate
                  ? new Date(rideDate).toLocaleDateString("vi-VN")
                  : "—";

                return (
                  <tr key={r.id} className="border-t border-slate-700">
                    <td className="px-3 py-2">{dateLabel}</td>

                    <td className="px-3 py-2">{r.booking?.route || "—"}</td>

                    <td className="px-3 py-2">
                      {r.vehicle?.plate_number || "—"}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {(r.booking?.total_price || 0).toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-emerald-400">
                      {(r.driver_pay || 0).toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-yellow-300">
                      {(r.company_profit || 0).toLocaleString("vi-VN")} đ
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
