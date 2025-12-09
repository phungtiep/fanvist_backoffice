// src/pages/RevenueDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

// 🔧 Lấy ngày đầu tháng & cuối tháng hiện tại
function getCurrentMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10)
  };
}

export default function RevenueDashboard() {
  const { from, to } = getCurrentMonthRange();

  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);

  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalDriver: 0,
    totalProfit: 0,
    byDate: [],
  });

  const [toast, setToast] = useState(null);
  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function loadData() {
    setLoading(true);

    // 1️⃣ Lấy doanh thu booking theo booking.date
    const { data: bookings, error: err1 } = await supabase
      .from("bookings")
      .select("date,total_price")
      .gte("date", fromDate)
      .lte("date", toDate);

    // 2️⃣ Lấy lương & lợi nhuận từ driver_assignments (lọc theo booking.date)
    const { data: assignments, error: err2 } = await supabase
      .from("driver_assignments")
      .select(`
        driver_pay,
        company_profit,
        booking:bookings!inner(date)
      `)
      .gte("booking.date", fromDate)
      .lte("booking.date", toDate);

    setLoading(false);

    if (err1 || err2) {
      console.error(err1 || err2);
      showToast("Không tải được dữ liệu");
      return;
    }

    const map = new Map();

    // 3️⃣ Gộp DOANH THU theo bookings
    (bookings || []).forEach((b) => {
      const key = b.date;
      if (!map.has(key)) {
        map.set(key, { date: key, revenue: 0, driver: 0, profit: 0 });
      }
      map.get(key).revenue += b.total_price || 0;
    });

    // 4️⃣ Gộp LƯƠNG & LỢI NHUẬN theo driver_assignments
    (assignments || []).forEach((a) => {
      const key = a.booking?.date;
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, { date: key, revenue: 0, driver: 0, profit: 0 });
      }

      map.get(key).driver += a.driver_pay || 0;
      map.get(key).profit += a.company_profit || 0;
    });

    const byDate = Array.from(map.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const totalRevenue = byDate.reduce((s, d) => s + d.revenue, 0);
    const totalDriver = byDate.reduce((s, d) => s + d.driver, 0);
    const totalProfit = byDate.reduce((s, d) => s + d.profit, 0);

    setSummary({ totalRevenue, totalDriver, totalProfit, byDate });
  }

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  return (
    <div className="p-6 text-slate-200">
      <h1 className="text-2xl font-bold mb-6">Báo cáo doanh thu</h1>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl mb-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">Từ ngày</div>
            <input
              type="date"
              className="w-full p-2 bg-slate-700 rounded"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Đến ngày</div>
            <input
              type="date"
              className="w-full p-2 bg-slate-700 rounded"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              className="w-full py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-500"
              onClick={loadData}
            >
              Làm mới
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700 mt-4">
          <SummaryCard label="Tổng doanh thu" value={summary.totalRevenue} color="text-blue-400" />
          <SummaryCard label="Tổng lương tài xế" value={summary.totalDriver} color="text-emerald-400" />
          <SummaryCard label="Tổng lợi nhuận" value={summary.totalProfit} color="text-yellow-400" />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex justify-between">
          <span className="font-semibold">Theo ngày</span>
          {loading && <span className="text-xs text-slate-400">Đang tải...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Ngày</th>
                <th className="px-3 py-2 text-right">Doanh thu</th>
                <th className="px-3 py-2 text-right">Tài xế nhận</th>
                <th className="px-3 py-2 text-right">Lợi nhuận</th>
              </tr>
            </thead>

            <tbody>
              {summary.byDate.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400">Không có dữ liệu</td>
                </tr>
              )}

              {summary.byDate.map((d) => (
                <tr key={d.date} className="border-t border-slate-800 hover:bg-slate-800/60">
                  <td className="px-3 py-2">{new Date(d.date).toLocaleDateString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right">{d.revenue.toLocaleString("vi-VN")} đ</td>
                  <td className="px-3 py-2 text-right text-emerald-400">{d.driver.toLocaleString("vi-VN")} đ</td>
                  <td className="px-3 py-2 text-right text-yellow-300">{d.profit.toLocaleString("vi-VN")} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${color}`}>
        {value.toLocaleString("vi-VN")} đ
      </div>
    </div>
  );
}
