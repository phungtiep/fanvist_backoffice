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
  const [approving, setApproving] = useState(false); // ✅ trạng thái duyệt lương

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ======= FORMAT DATE =======
  function formatDateVN(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // ======= LOAD DRIVERS =======
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name");

      if (error) {
        console.error(error);
        showToast("Không tải được danh sách tài xế", "error");
        return;
      }

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
    const { data: driver, error: drvErr } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .single();

    if (drvErr || !driver) {
      console.error(drvErr);
      showToast("Không tìm thấy tài xế", "error");
      setLoading(false);
      return;
    }

    // 2) Các chuyến đã phân công cho tài xế trong khoảng ngày
    const { data: rows, error } = await supabase
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

    (rows || []).forEach((r) => {
      const tripTotal = r.booking?.total_price || 0;
      const dp = r.driver_pay || 0;
      const cp = r.company_profit || 0;

      revenue += tripTotal;
      driverPay += dp;
      profit += cp;
    });

    // + lương cơ bản
    const baseSalary = driver.base_salary || 0;
    driverPay += baseSalary;

    setSummary({
      driver,
      revenue,
      driverPay,
      baseSalary,
      commission: driver.commission_percent || 0,
      profit,
    });

    setDetails(rows || []);
    setLoading(false);
  }

  // ======= APPROVE HELPERS =======

  // ✅ Duyệt 1 chuyến
  async function approveOne(assignmentId) {
    if (!driverId) {
      showToast("Chọn tài xế trước khi duyệt lương", "error");
      return;
    }

    setApproving(true);

    const { error } = await supabase
      .from("driver_assignments")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .eq("driver_id", driverId);

    setApproving(false);

    if (error) {
      console.error(error);
      showToast("Duyệt lương chuyến thất bại", "error");
      return;
    }

    showToast("Đã duyệt lương chuyến!", "success");
    loadSalary();
  }

  // ✅ Duyệt lương theo ngày (dựa vào fromDate = toDate, dùng assigned_at)
  async function approveDay() {
    if (!driverId) {
      showToast("Chọn tài xế trước khi duyệt lương", "error");
      return;
    }
    if (!fromDate || fromDate !== toDate) {
      showToast(
        "Để duyệt theo ngày, hãy chọn cùng 1 ngày ở cả 'Từ ngày' và 'Đến ngày'",
        "error"
      );
      return;
    }

    setApproving(true);

    const { error } = await supabase
      .from("driver_assignments")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate);

    setApproving(false);

    if (error) {
      console.error(error);
      showToast("Duyệt lương theo ngày thất bại", "error");
      return;
    }

    showToast("Đã duyệt lương cho ngày này!", "success");
    loadSalary();
  }

  // ✅ Duyệt lương theo khoảng ngày (thường là cả tháng hiện tại)
  async function approveRange() {
    if (!driverId) {
      showToast("Chọn tài xế trước khi duyệt lương", "error");
      return;
    }

    setApproving(true);

    const { error } = await supabase
      .from("driver_assignments")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq("driver_id", driverId)
      .gte("assigned_at", fromDate)
      .lte("assigned_at", toDate);

    setApproving(false);

    if (error) {
      console.error(error);
      showToast("Duyệt lương tháng / khoảng ngày thất bại", "error");
      return;
    }

    showToast("Đã duyệt lương cho khoảng ngày này!", "success");
    loadSalary();
  }

  return (
    <div className="p-6 text-slate-200">
      <h1 className="text-2xl font-bold mb-6">Tính lương tài xế</h1>

      {/* FILTER + SUMMARY */}
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

        {/* SUMMARY + BUTTON DUYỆT */}
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

            {/* NÚT DUYỆT THEO NGÀY / THÁNG */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={approveDay}
                disabled={
                  !driverId || approving || !fromDate || fromDate !== toDate
                }
                className={`px-3 py-2 rounded-lg text-sm ${
                  !driverId || fromDate !== toDate
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                Duyệt lương ngày {fromDate === toDate && formatDateVN(fromDate)}
              </button>

              <button
                onClick={approveRange}
                disabled={!driverId || approving}
                className={`px-3 py-2 rounded-lg text-sm ${
                  !driverId || approving
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                Duyệt lương từ {formatDateVN(fromDate)} đến{" "}
                {formatDateVN(toDate)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BẢNG CHI TIẾT */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 font-semibold flex items-center justify-between">
          <span>
            Chi tiết chuyến{" "}
            {loading && (
              <span className="text-xs text-slate-400"> (đang tải...)</span>
            )}
          </span>
          {approving && (
            <span className="text-xs text-emerald-400">
              Đang cập nhật trạng thái lương...
            </span>
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
                <th className="px-3 py-2 text-center">Trạng thái</th>
                <th className="px-3 py-2 text-center">Duyệt</th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}

              {details.map((r) => {
                // LẤY NGÀY ĐI: ưu tiên booking.date, fallback assigned_at
                const rideDate = r.booking?.date || r.assigned_at;
                const dateLabel = rideDate
                  ? new Date(rideDate).toLocaleDateString("vi-VN")
                  : "—";

                const tripTotal = r.booking?.total_price || 0;
                const driverAmount = r.driver_pay || 0;
                const companyProfit = r.company_profit || 0;

                const isPaid = !!r.paid;

                return (
                  <tr key={r.id} className="border-t border-slate-700">
                    <td className="px-3 py-2">{dateLabel}</td>

                    <td className="px-3 py-2">
                      {r.booking?.route || "—"}
                    </td>

                    <td className="px-3 py-2">
                      {r.vehicle?.plate_number || "—"}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {tripTotal.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-emerald-400">
                      {driverAmount.toLocaleString("vi-VN")} đ
                    </td>

                    <td className="px-3 py-2 text-right text-yellow-300">
                      {companyProfit.toLocaleString("vi-VN")} đ
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-2 text-center">
                      {isPaid ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-300">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-600/40 text-slate-300">
                          Chưa duyệt
                        </span>
                      )}
                    </td>

                    {/* Nút duyệt từng chuyến */}
                    <td className="px-3 py-2 text-center">
                      {isPaid ? (
                        <button
                          disabled
                          className="px-3 py-1 text-xs rounded-lg bg-emerald-700/30 text-emerald-300 cursor-default"
                        >
                          Đã duyệt
                        </button>
                      ) : (
                        <button
                          onClick={() => approveOne(r.id)}
                          disabled={approving}
                          className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
                        >
                          Duyệt chuyến
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
