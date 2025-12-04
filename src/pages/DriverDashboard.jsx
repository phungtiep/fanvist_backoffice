import { useEffect, useState } from "react";

import {
  HiOutlineCalendar,
  HiClipboardCopy,
  HiX,
  HiLogout,
  HiChevronDown,
  HiChevronUp,
  HiUser,
  HiPhone,
  HiLocationMarker,
  HiCurrencyDollar,
  HiClock,
  HiAnnotation,
} from "react-icons/hi";

export default function DriverDashboard() {
  /* ========================= AUTH ========================= */
  const driver = JSON.parse(localStorage.getItem("driver"));
  const driverId = driver?.id;

  if (!driverId) {
    return (
      <div className="text-center p-10 text-white text-lg">
        Chưa đăng nhập...
      </div>
    );
  }

  /* ========================= STATES ========================= */
  const [tab, setTab] = useState("trips");

  const [assignments, setAssignments] = useState([]);
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [openDay, setOpenDay] = useState({});
  const [selectedTripMonth, setSelectedTripMonth] = useState("");

  const [salaryList, setSalaryList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [openSalaryDay, setOpenSalaryDay] = useState({});

  const [modalTrip, setModalTrip] = useState(null);

  /* ========================= HELPERS ========================= */

  const safe = (v, fallback = "") => (v === null || v === undefined ? fallback : v);

  function formatDateVN(dateStr) {
    if (!dateStr) return "--/--/----";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "--/--/----";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /* ========================= LOAD TRIPS ========================= */
  async function loadTrips() {
    try {
      const res = await fetch(`/api/drivertrips?driver_id=${driverId}`);
      const json = await res.json();

      if (!Array.isArray(json)) return;

      // làm sạch dữ liệu
      const cleaned = json.filter((row) => row.date);

      setAssignments(cleaned);

      // GROUP BY DATE
      const grouped = cleaned.reduce((acc, b) => {
        const d = b.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(b);
        return acc;
      }, {});
      setGroupedAssignments(grouped);

      // MONTH LIST
      const months = [...new Set(cleaned.map((b) => b.date.slice(0, 7)))].sort();
      if (!selectedTripMonth && months.length > 0) setSelectedTripMonth(months[0]);
    } catch (e) {
      console.error("Trips API error:", e);
    }
  }

  /* ========================= LOAD SALARY ========================= */
  async function loadSalary() {
    try {
      const res = await fetch(`/api/driversalary?driver_id=${driverId}`);
      const json = await res.json();

      if (!Array.isArray(json)) return;

      const cleaned = json.filter((row) => row.date);

      setSalaryList(cleaned);
    } catch (e) {
      console.error("Salary API error:", e);
    }
  }

  useEffect(() => {
    loadTrips();
    loadSalary();
  }, []);

  useEffect(() => {
    if (tab === "salary") loadSalary();
  }, [tab]);

  /* ========================= GROUP TRIPS BY MONTH ========================= */
  const tripsByMonth = assignments.reduce((acc, b) => {
    const m = b.date.slice(0, 7);
    if (!acc[m]) acc[m] = [];
    acc[m].push(b);
    return acc;
  }, {});

  /* ========================= GROUP SALARY MONTH->DAY ========================= */
  const groupedByMonth = salaryList.reduce((acc, b) => {
    const m = b.date.slice(0, 7);
    if (!acc[m]) acc[m] = [];
    acc[m].push(b);
    return acc;
  }, {});

  Object.keys(groupedByMonth).forEach((month) => {
    groupedByMonth[month] = Object.values(
      groupedByMonth[month].reduce((acc, b) => {
        const d = b.date;

        if (!acc[d]) {
          acc[d] = { date: d, revenue: 0, driverPay: 0, trips: [] };
        }

        acc[d].revenue += b.total_price || 0;
        acc[d].driverPay += b.driver_pay || 0;
        acc[d].trips.push(b);

        return acc;
      }, {})
    );
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();

  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(sortedMonths[0]);
    }
  }, [salaryList]);

  /* ========================= LOGOUT ========================= */
  function logout() {
    localStorage.removeItem("driver");
    window.location.href = "/driver-login";
  }

  /* ========================= UI ========================= */
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 rounded-2xl shadow-lg">

          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow">
            <img src={driver.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Xin chào, {driver.full_name}</h1>
            <p className="text-white/80 text-sm">{driver.phone}</p>
            <p className="text-white/60 text-xs">Bảng điều khiển tài xế</p>
          </div>

          <button
            onClick={logout}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl shadow-md flex items-center gap-1"
          >
            <HiLogout className="text-lg" /> Thoát
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`flex-1 px-4 py-3 rounded-xl font-semibold shadow
            ${tab === "trips" ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-800 text-slate-300"}`}
          onClick={() => setTab("trips")}
        >
          📅 Chuyến được phân công
        </button>

        <button
          className={`flex-1 px-4 py-3 rounded-xl font-semibold shadow
            ${tab === "salary" ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-800 text-slate-300"}`}
          onClick={() => setTab("salary")}
        >
          💰 Bảng lương
        </button>
      </div>

      {/* ========================= TRIPS ========================= */}
      {tab === "trips" && (
        <div className="space-y-4">

          {/* FILTER MONTH */}
          {Object.keys(tripsByMonth).length > 0 && (
            <select
              className="bg-slate-800 border border-slate-700 p-3 rounded-xl mb-4"
              value={selectedTripMonth}
              onChange={(e) => setSelectedTripMonth(e.target.value)}
            >
              {Object.keys(tripsByMonth).sort().map((m) => (
                <option key={m} value={m}>
                  Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                </option>
              ))}
            </select>
          )}

          {/* LIST */}
          {selectedTripMonth &&
            Object.entries(groupedAssignments)
              .filter(([date]) => date.startsWith(selectedTripMonth))
              .map(([date, list]) => (
                <div key={date} className="border border-slate-700 rounded-xl">

                  <button
                    className="w-full flex items-center justify-between p-4 bg-slate-800"
                    onClick={() => setOpenDay((prev) => ({ ...prev, [date]: !prev[date] }))}
                  >
                    <div className="flex items-center gap-3">
                      <HiOutlineCalendar className="text-2xl text-red-300" />
                      <span className="font-semibold text-lg">
                        {formatDateVN(date)} — {list.length} chuyến
                      </span>
                    </div>

                    {openDay[date] ? <HiChevronUp /> : <HiChevronDown />}
                  </button>

                  {openDay[date] && (
                    <div className="p-4 space-y-4 bg-slate-900">
                      {list.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer hover:bg-slate-700"
                          onClick={() => setModalTrip(b)}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="text-lg font-semibold">{b.route}</div>
                              <div className="text-slate-400 text-sm">
                                {b.time} • {b.total_price.toLocaleString("vi-VN")} đ
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
        </div>
      )}

      {/* ========================= SALARY ========================= */}
      {tab === "salary" && (
        <div className="space-y-6">

          <h2 className="text-2xl font-bold">💰 Lương theo tháng</h2>

          {sortedMonths.length > 0 ? (
            <select
              className="bg-slate-800 border border-slate-700 p-3 rounded-xl mb-3"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {sortedMonths.map((m) => (
                <option key={m} value={m}>
                  Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-slate-400">Chưa có lương được duyệt.</div>
          )}

          {/* SUMMARY */}
          {selectedMonth && groupedByMonth[selectedMonth] && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 shadow-lg">
              <h3 className="text-xl font-bold mb-3">
                Tổng lương tháng{" "}
                <span className="text-blue-400">
                  {selectedMonth.slice(5, 7)}/{selectedMonth.slice(0, 4)}
                </span>
              </h3>

              {(() => {
                let revenue = 0,
                  pay = 0,
                  trips = 0;

                groupedByMonth[selectedMonth].forEach((d) => {
                  revenue += d.revenue;
                  pay += d.driverPay;
                  trips += d.trips.length;
                });

                return (
                  <div className="space-y-2">
                    <p>
                      <strong>Doanh thu: </strong>
                      {revenue.toLocaleString("vi-VN")} đ
                    </p>

                    <p className="text-green-400 font-semibold">
                      <strong>Tài xế nhận: </strong>
                      {pay.toLocaleString("vi-VN")} đ
                    </p>

                    <p>
                      <strong>Số chuyến đã duyệt:</strong> {trips}
                    </p>

                    <p>
                      <strong>Số ngày có chuyến:</strong>{" "}
                      {groupedByMonth[selectedMonth].length}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TABLE */}
          {selectedMonth && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700 text-slate-300">
                  <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Doanh thu</th>
                    <th className="p-3">Tài xế nhận</th>
                  </tr>
                </thead>

                <tbody>
                  {groupedByMonth[selectedMonth].map((row) => (
                    <>
                      <tr
                        key={row.date}
                        className="cursor-pointer hover:bg-slate-700"
                        onClick={() =>
                          setOpenSalaryDay((prev) => ({
                            ...prev,
                            [row.date]: !prev[row.date],
                          }))
                        }
                      >
                        <td className="p-3">{formatDateVN(row.date)}</td>
                        <td className="p-3">
                          {row.revenue.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="p-3 text-green-400 font-semibold">
                          {row.driverPay.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>

                      {openSalaryDay[row.date] && (
                        <tr>
                          <td colSpan={3} className="bg-slate-900 p-4">
                            <div className="space-y-4">
                              {row.trips.map((t) => (
                                <div
                                  key={t.id}
                                  className="p-4 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer hover:bg-slate-700"
                                  onClick={() => setModalTrip(t)}
                                >
                                  <div className="text-lg font-semibold">{t.route}</div>
                                  <div className="text-slate-400">
                                    {t.time} • {t.total_price.toLocaleString("vi-VN")} đ
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================= POPUP ========================= */}
      {modalTrip && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-slate-800 w-full max-w-lg rounded-xl p-6 relative border border-slate-600">

            <button
              className="absolute top-3 right-3 text-xl"
              onClick={() => setModalTrip(null)}
            >
              <HiX />
            </button>

            <h2 className="text-2xl font-bold mb-4">{modalTrip.route}</h2>

            <div className="space-y-4 text-sm">

              <div className="flex items-center gap-3">
                <HiUser />
                <span>Tên khách: {modalTrip.full_name}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiPhone />
                <span>SĐT: {modalTrip.phone}</span>

                <button
                  onClick={() => navigator.clipboard.writeText(modalTrip.phone)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  <HiClipboardCopy />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <HiOutlineCalendar />
                <span>Ngày đi: {formatDateVN(modalTrip.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiClock />
                <span>Giờ đi: {modalTrip.time}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiLocationMarker />
                <span>Điểm đón: {modalTrip.pickup_place || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiLocationMarker />
                <span>Điểm trả: {modalTrip.dropoff_place || "—"}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiUser />
                <span>Loại xe: {modalTrip.car_type}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiAnnotation />
                <span>Ghi chú: {modalTrip.note || "—"}</span>
              </div>

              <div className="flex items-center gap-3 text-green-400 font-bold text-xl">
                <HiCurrencyDollar />
                <span>{modalTrip.total_price.toLocaleString("vi-VN")} đ</span>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
