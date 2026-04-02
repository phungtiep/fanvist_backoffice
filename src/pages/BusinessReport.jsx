// src/pages/BusinessReport.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import { HiTrendingUp, HiTrendingDown, HiCash, HiChip, HiCalendar, HiChartBar } from "react-icons/hi";

export default function BusinessReport() {
  const [activeTab, setActiveTab] = useState("month"); // 'day', 'month', 'year'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ bookings: [], assignments: [] });
  
  // FILTERS
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateRange, setDateRange] = useState({
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  });

  // ======= FETCH DATA =======
  async function loadData() {
    setLoading(true);
    try {
      let bQuery = supabase.from("bookings").select("date, total_price");
      let aQuery = supabase.from("driver_assignments").select(`
        driver_pay,
        toll_fees,
        booking:bookings!inner(date)
      `);

      if (activeTab === "day") {
        bQuery = bQuery.gte("date", dateRange.from).lte("date", dateRange.to);
        aQuery = aQuery.gte("booking.date", dateRange.from).lte("booking.date", dateRange.to);
      } else if (activeTab === "month") {
        const firstDay = `${selectedYear}-01-01`;
        const lastDay = `${selectedYear}-12-31`;
        bQuery = bQuery.gte("date", firstDay).lte("date", lastDay);
        aQuery = aQuery.gte("booking.date", firstDay).lte("booking.date", lastDay);
      }
      // For 'year', we load all data (might need pagination or limits for large scale, but fine for now)

      const [{ data: bData }, { data: aData }] = await Promise.all([
        bQuery,
        aQuery
      ]);

      setData({ bookings: bData || [], assignments: aData || [] });
    } catch (err) {
      console.error("Load report error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, selectedYear, dateRange]);

  // ======= CALCULATIONS =======
  const stats = useMemo(() => {
    const reportMap = new Map();

    // 1. Group Bookings (Revenue)
    data.bookings.forEach((b) => {
      let key;
      const d = new Date(b.date);
      if (activeTab === "day") key = b.date;
      else if (activeTab === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else key = `${d.getFullYear()}`;

      if (!reportMap.has(key)) reportMap.set(key, { key, revenue: 0, salary: 0, toll: 0, profit: 0 });
      reportMap.get(key).revenue += b.total_price || 0;
    });

    // 2. Group Assignments (Driver Pay, Toll Fees)
    data.assignments.forEach((a) => {
      let key;
      const d = new Date(a.booking?.date);
      if (activeTab === "day") key = a.booking?.date;
      else if (activeTab === "month") key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else key = `${d.getFullYear()}`;

      if (!reportMap.has(key)) reportMap.set(key, { key, revenue: 0, salary: 0, toll: 0, profit: 0 });
      reportMap.get(key).salary += a.driver_pay || 0;
      reportMap.get(key).toll += a.toll_fees || 0;
    });

    // 3. Finalize
    const list = Array.from(reportMap.values()).map(item => ({
      ...item,
      profit: item.revenue - item.salary - item.toll
    })).sort((a, b) => a.key.localeCompare(b.key));

    const totalRevenue = list.reduce((s, x) => s + x.revenue, 0);
    const totalSalary = list.reduce((s, x) => s + x.salary, 0);
    const totalToll = list.reduce((s, x) => s + x.toll, 0);
    const totalProfit = totalRevenue - totalSalary - totalToll;

    return { list, totalRevenue, totalSalary, totalToll, totalProfit };
  }, [data, activeTab]);


  // ======= RENDER HELPERS =======
  const formatMoney = (v) => v.toLocaleString("vi-VN") + " đ";
  const getLabel = (key) => {
    if (activeTab === "day") return new Date(key).toLocaleDateString("vi-VN");
    if (activeTab === "month") {
       const [y, m] = key.split("-");
       return `Tháng ${m}/${y}`;
    }
    return `Năm ${key}`;
  };

  return (
    <div className="p-6 text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Báo cáo kinh doanh
          </h1>
          <p className="text-slate-400 text-sm mt-1">Phân tích doanh thu, chi phí và lợi nhuận</p>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 self-start">
          {[
            { id: "day", label: "Theo Ngày", icon: <HiCalendar /> },
            { id: "month", label: "Theo Tháng", icon: <HiChartBar /> },
            { id: "year", label: "Theo Năm", icon: <HiTrendingUp /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 mb-8 flex flex-wrap items-center gap-6">
        {activeTab === "day" && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Khoảng ngày</span>
            <input 
              type="date" 
              className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
            <span className="text-slate-600">→</span>
            <input 
              type="date" 
              className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        )}

        {activeTab === "month" && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chọn năm</span>
            <select 
              className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        <button 
          onClick={loadData}
          className="ml-auto px-5 py-2 bg-slate-700/50 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? "Đang tải..." : "Cập nhật dữ liệu"}
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard 
          title="Tổng Doanh Thu" 
          value={stats.totalRevenue} 
          icon={<HiCash className="text-blue-400 text-3xl" />} 
          bgColor="bg-blue-500/10"
          borderColor="border-blue-500/20"
          valueColor="text-blue-400"
        />
        <KPICard 
          title="Tổng Lương Xế" 
          value={stats.totalSalary} 
          icon={<HiChip className="text-rose-400 text-3xl" />} 
          bgColor="bg-rose-500/10"
          borderColor="border-rose-500/20"
          valueColor="text-rose-400"
        />
        <KPICard 
          title="Tổng Cầu Đường" 
          value={stats.totalToll} 
          icon={<HiChartBar className="text-amber-400 text-3xl" />} 
          bgColor="bg-amber-500/10"
          borderColor="border-amber-500/20"
          valueColor="text-amber-400"
        />
        <KPICard 
          title="Lợi Nhuận Thực" 
          value={stats.totalProfit} 
          icon={<HiTrendingUp className="text-emerald-400 text-3xl" />} 
          bgColor="bg-emerald-500/10"
          borderColor="border-emerald-500/20"
          valueColor="text-emerald-400"
        />
      </div>


      {/* CHART & TABLE */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Breakdown Table */}
        <div className="xl:col-span-2 bg-slate-900/40 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-md">
          <div className="px-6 py-4 border-b border-slate-700/50 font-bold text-lg flex items-center justify-between">
             <span>Chi tiết {activeTab === 'day' ? 'từng ngày' : activeTab === 'month' ? 'từng tháng' : 'từng năm'}</span>
             {loading && <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/40 text-slate-400 font-semibold text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-4 text-left">Thời gian</th>
                  <th className="px-4 py-4 text-right">Doanh thu</th>
                  <th className="px-4 py-4 text-right text-rose-300">Lương xế</th>
                  <th className="px-4 py-4 text-right text-amber-300">Cầu đường</th>
                  <th className="px-4 py-4 text-right text-emerald-300">Lợi nhuận</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/50">
                {stats.list.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500 italic text-base">Không có dữ liệu cho khoảng thời gian này.</td>
                  </tr>
                )}
                {stats.list.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-800/30 transition-colors duration-200">
                    <td className="px-4 py-4 font-semibold">{getLabel(row.key)}</td>
                    <td className="px-4 py-4 text-right">{formatMoney(row.revenue)}</td>
                    <td className="px-4 py-4 text-right text-rose-400">{formatMoney(row.salary)}</td>
                    <td className="px-4 py-4 text-right text-amber-400">{formatMoney(row.toll)}</td>
                    <td className="px-4 py-4 text-right text-emerald-400 font-bold">{formatMoney(row.profit)}</td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Chart Visual */}
        <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-md">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
             <HiChartBar className="text-blue-400" />
             Biểu đồ so sánh
          </h3>
          
          <div className="space-y-6">
             {stats.list.map((row) => {
                const maxVal = Math.max(...stats.list.map(x => x.revenue), 1);
                const widthRev = (row.revenue / maxVal) * 100;
                const widthProfit = (row.profit / maxVal) * 100;

                return (
                   <div key={row.key} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                         <span>{getLabel(row.key)}</span>
                         <span>{Math.round(row.profit / (row.revenue || 1) * 100)}% lãi</span>
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative group">
                         <div 
                          className="h-full bg-blue-500/60 transition-all duration-700 ease-out absolute left-0" 
                          style={{ width: `${widthRev}%` }}
                          title={`Doanh thu: ${formatMoney(row.revenue)}`}
                         />
                         <div 
                          className="h-full bg-emerald-500 transition-all duration-1000 ease-out absolute left-0" 
                          style={{ width: `${widthProfit}%` }}
                          title={`Lợi nhuận: ${formatMoney(row.profit)}`}
                         />
                      </div>
                   </div>
                );
             })}

             {stats.list.length === 0 && (
                <div className="h-40 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                   Chưa có dữ liệu biểu đồ
                </div>
             )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center gap-6 text-xs text-slate-500 font-medium">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/60 rounded"></div> Doanh thu
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div> Lợi nhuận
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, bgColor, borderColor, valueColor, subtitle }) {
  return (
    <div className={`${bgColor} ${borderColor} border rounded-3xl p-6 backdrop-blur-sm shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-4">
        <div>
           <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
           {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="p-3 bg-slate-950/20 rounded-2xl">
           {icon}
        </div>
      </div>
      <div className={`text-2xl font-black ${valueColor}`}>
        {value.toLocaleString("vi-VN")} đ
      </div>
    </div>
  );
}
