// src/pages/TripLogAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiSave, HiRefresh } from "react-icons/hi";

export default function TripLogAdmin() {
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

  const [details, setDetails] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ======= FORMAT DATE =======
  function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("vi-VN");
  }

  // ======= LOAD DATA =======
  async function loadRoutes() {
    try {
      const { data } = await supabase.from("routes").select("code,name");
      setRoutes(data || []);
    } catch (err) {
      console.error("Load routes error:", err);
    }
  }

  function getRouteName(code) {
    if (!code) return "—";
    const found = routes.find((r) => String(r.code) === String(code));
    return found?.name || code;
  }

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

  useEffect(() => {
    loadTripLog();
  }, [driverId, fromDate, toDate, routes]); // Reload when routes load too

  async function loadTripLog() {
    setLoading(true);
    try {
      let query = supabase
        .from("driver_assignments")
        .select(`
          *,
          booking:bookings (*),
          vehicle:vehicles (plate_number),
          driver:drivers (full_name, commission_percent)
        `);

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by booking date
      const dFrom = new Date(fromDate);
      const dTo = new Date(toDate);
      dTo.setHours(23, 59, 59, 999);

      const filtered = (data || []).filter((r) => {
        if (!r.booking?.date) return false;
        const d = new Date(r.booking.date);
        return d >= dFrom && d <= dTo;
      });

      // Sort by date then time
      filtered.sort((a, b) => {
        const d_a = new Date(a.booking.date + "T" + (a.booking.time || "00:00"));
        const d_b = new Date(b.booking.date + "T" + (b.booking.time || "00:00"));
        return d_a - d_b;
      });

      setDetails(filtered);
    } catch (err) {
      console.error("Load trip log error:", err);
      showToast("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }

  // ======= SAVE ROW =======
  async function handleUpdateRow(row) {
    setSavingId(row.id);
    try {
      const revenue = row.booking?.total_price || 0;
      const commission = row.driver?.commission_percent || 70;
      const tollFees = Number(row.toll_fees || 0);
      const driverPay = Math.round((revenue - tollFees) * (commission / 100));
      const companyProfit = revenue - driverPay - tollFees;


      const { error } = await supabase
        .from("driver_assignments")
        .update({
          toll_fees: tollFees,
          company_profit: companyProfit,
          driver_pay: driverPay,
          note: row.note
        })
        .eq("id", row.id);

      if (error) throw error;
      showToast("Đã cập nhật chuyến xe");
      
      // Update local state instead of full reload to be snappy
      setDetails(prev => prev.map(item => item.id === row.id ? { ...item, company_profit: companyProfit, driver_pay: driverPay } : item));
    } catch (err) {
      console.error("Update error:", err);
      showToast("Cập nhật thất bại", "error");
    } finally {
      setSavingId(null);
    }
  }

  const handleTollChange = (id, val) => {
    setDetails(prev => prev.map(item => item.id === id ? { ...item, toll_fees: val } : item));
  };

  const handleNoteChange = (id, val) => {
    setDetails(prev => prev.map(item => item.id === id ? { ...item, note: val } : item));
  };

  return (
    <div className="p-6 text-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nhật ký & Lương theo chuyến</h1>
        <button 
            onClick={loadTripLog}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 flex items-center gap-2"
        >
            <HiRefresh className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">Tài xế</div>
            <select
              className="w-full h-11 px-3 bg-slate-700 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Tất cả tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Từ ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded border border-slate-600"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Đến ngày</div>
            <input
              type="date"
              className="w-full h-11 px-3 bg-slate-700 rounded border border-slate-600"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/70 text-slate-300 font-medium">
              <tr>
                <th className="px-4 py-3 text-left">Ngày & Giờ</th>
                <th className="px-4 py-3 text-left">Tuyến / Tài xế</th>
                <th className="px-4 py-3 text-right">Doanh thu</th>
                <th className="px-4 py-3 text-right text-emerald-400">Lương xế</th>
                <th className="px-4 py-3 text-center">Phí cầu đường (VNĐ)</th>
                <th className="px-4 py-3 text-right text-yellow-300">Lợi nhuận</th>
                <th className="px-4 py-3 text-left">Ghi chú</th>
                <th className="px-4 py-3 text-center">Lưu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {details.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500 italic">
                    Không tìm thấy dữ liệu trong khoảng thời gian này.
                  </td>
                </tr>
              )}
              {details.map((r) => {
                const revenue = r.booking?.total_price || 0;
                const commission = r.driver?.commission_percent || 70;
                const tollFees = Number(r.toll_fees || 0);
                const driverPay = Math.round((revenue - tollFees) * (commission / 100));
                const profit = revenue - driverPay - tollFees;


                return (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{formatDateVN(r.booking?.date)}</div>
                      <div className="text-xs text-slate-400">{r.booking?.time || "--:--"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate max-w-[150px] font-medium" title={getRouteName(r.booking?.route)}>
                        {getRouteName(r.booking?.route)}
                      </div>
                      <div className="text-xs text-blue-400">
                        {r.driver?.full_name || "—"} • {r.vehicle?.plate_number || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-300">
                      {revenue.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {driverPay.toLocaleString("vi-VN")}
                      <div className="text-[10px] opacity-70">({commission}%)</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-right text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        value={r.toll_fees || ""}
                        onChange={(e) => handleTollChange(r.id, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? "text-yellow-300" : "text-red-400"}`}>
                      {profit.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                        value={r.note || ""}
                        onChange={(e) => handleNoteChange(r.id, e.target.value)}
                        placeholder="..."
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleUpdateRow(r)}
                        disabled={savingId === r.id}
                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-50 transition-colors"
                        title="Lưu lại"
                      >
                        {savingId === r.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <HiSave className="w-4 h-4" />
                        )}
                      </button>
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
        <div className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[9999] animate-bounce-in
          ${toast.type === "success" ? "bg-emerald-600 border-l-4 border-emerald-400" : "bg-red-600 border-l-4 border-red-400"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
