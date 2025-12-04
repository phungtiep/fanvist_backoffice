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
  /* ============================================================
     AUTH
  ============================================================ */
  const driver = JSON.parse(localStorage.getItem("driver"));
  const driverId = driver?.id;

  if (!driverId) {
    return (
      <div className="text-center p-10 text-white text-lg">
        Chưa đăng nhập...
      </div>
    );
  }

  /* ============================================================
     STATES
  ============================================================ */
  const [tab, setTab] = useState("trips");

  const [assignments, setAssignments] = useState([]);
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [openDay, setOpenDay] = useState({});
  const [selectedTripMonth, setSelectedTripMonth] = useState("");

  const [salaryList, setSalaryList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [openSalaryDay, setOpenSalaryDay] = useState({});

  const [modalTrip, setModalTrip] = useState(null);

  /* ============================================================
     LOAD TRIPS (API)
  ============================================================ */
  async function loadTrips() {
    try {
      const res = await fetch(`/api/drivertrips?driver_id=${driverId}`);
      const json = await res.json();

      if (!Array.isArray(json)) {
        console.error("Trips API returned invalid format:", json);
        return;
      }

      // BỎ row null bookings
      const cleaned = json.filter((r) => r.bookings && r.bookings.date);
      setAssignments(cleaned);

      // GROUP BY DATE
      const grouped = cleaned.reduce((acc, row) => {
        const b = row.bookings;
        const d = b.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(row);
        return acc;
      }, {});
      setGroupedAssignments(grouped);

      const months = [
        ...new Set(cleaned.map((r) => r.bookings.date.slice(0, 7))),
      ].sort();

      if (!selectedTripMonth && months.length > 0) {
        setSelectedTripMonth(months[0]);
      }
    } catch (err) {
      console.error("Trips API error:", err);
    }
  }

  /* ============================================================
     LOAD SALARY (API)
  ============================================================ */
  async function loadSalary() {
    try {
      const res = await fetch(`/api/driversalary?driver_id=${driverId}`);
      const json = await res.json();

      if (!Array.isArray(json)) {
        console.error("Salary API returned invalid format:", json);
        return;
      }

      const cleaned = json.filter((r) => r.bookings && r.bookings.date);
      setSalaryList(cleaned);
    } catch (err) {
      console.error("Salary API error:", err);
    }
  }

  useEffect(() => {
    loadTrips();
    loadSalary();
  }, []);

  useEffect(() => {
    if (tab === "salary") loadSalary();
  }, [tab]);

  /* ============================================================
     HELPERS
  ============================================================ */
  function formatDateVN(dateStr) {
    if (!dateStr) return "--/--/----";
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /* ============================================================
     GROUP TRIPS BY MONTH
  ============================================================ */
  const tripsByMonth = assignments.reduce((acc, item) => {
    const m = item.bookings.date.slice(0, 7);
    if (!acc[m]) acc[m] = [];
    acc[m].push(item);
    return acc;
  }, {});

  /* ============================================================
     GROUP SALARY month -> day
  ============================================================ */
  const groupedByMonth = salaryList.reduce((acc, item) => {
    const m = item.bookings.date.slice(0, 7);
    if (!acc[m]) acc[m] = [];
    acc[m].push(item);
    return acc;
  }, {});

  Object.keys(groupedByMonth).forEach((month) => {
    groupedByMonth[month] = Object.values(
      groupedByMonth[month].reduce((acc, item) => {
        const d = item.bookings.date;
        if (!acc[d]) acc[d] = { date: d, revenue: 0, driverPay: 0, trips: [] };
        acc[d].revenue += item.bookings.total_price;
        acc[d].driverPay += item.driver_pay;
        acc[d].trips.push(item);
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

  /* ============================================================
     MONTH SUMMARY
  ============================================================ */
  const monthSummary = selectedMonth
    ? (() => {
        const days = groupedByMonth[selectedMonth] || [];
        let revenue = 0,
          pay = 0,
          trips = 0;

        days.forEach((d) => {
          revenue += d.revenue;
          pay += d.driverPay;
          trips += d.trips.length;
        });

        return {
          revenue,
          pay,
          totalTrips: trips,
          totalDays: days.length,
        };
      })()
    : null;

  /* ============================================================
     LOGOUT
  ============================================================ */
  function logout() {
    localStorage.removeItem("driver");
    window.location.href = "/driver-login";
  }

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 rounded-2xl shadow-lg">

          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow">
            <img src={driver.avatar_url} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold">Xin chào, {driver.full_name}</h1>
            <p className="text-white/80 text-sm">{driver.phone}</p>
          </div>

          <button
            onClick={logout}
            className="px-3 py-2 bg-red-500 rounded-xl hover:bg-red-600 flex items-center gap-2"
          >
            <HiLogout /> Thoát
          </button>

        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`flex-1 px-4 py-3 rounded-xl font-semibold ${
            tab === "trips" ? "bg-emerald-600" : "bg-slate-800"
          }`}
          onClick={() => setTab("trips")}
        >
          📅 Chuyến được phân công
        </button>

        <button
          className={`flex-1 px-4 py-3 rounded-xl font-semibold ${
            tab === "salary" ? "bg-emerald-600" : "bg-slate-800"
          }`}
          onClick={() => setTab("salary")}
        >
          💰 Bảng lương
        </button>
      </div>

      {/* ============================================================
           TRIPS TAB
      ============================================================ */}
      {tab === "trips" && (
        <div className="space-y-4">

          {/* FILTER */}
          {Object.keys(tripsByMonth).length > 0 && (
            <select
              className="bg-slate-800 p-3 rounded-xl border border-slate-700"
              value={selectedTripMonth}
              onChange={(e) => setSelectedTripMonth(e.target.value)}
            >
              {Object.keys(tripsByMonth)
                .sort()
                .map((m) => (
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
              .map(([date, trips]) => (
                <div key={date} className="border border-slate-700 rounded-xl">

                  <button
                    className="w-full flex justify-between p-4 bg-slate-800"
                    onClick={() =>
                      setOpenDay((p) => ({ ...p, [date]: !p[date] }))
                    }
                  >
                    <div className="flex items-center gap-3">
                      <HiOutlineCalendar className="text-2xl text-red-300" />
                      <span className="font-semibold">
                        {formatDateVN(date)} — {trips.length} chuyến
                      </span>
                    </div>

                    {openDay[date] ? <HiChevronUp /> : <HiChevronDown />}
                  </button>

                  {openDay[date] && (
                    <div className="p-4 space-y-4 bg-slate-900">
                      {trips.map((a) => {
                        const b = a.bookings;
                        if (!b) return null;
                        return (
                          <div
                            key={a.id}
                            className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 cursor-pointer"
                            onClick={() => setModalTrip(b)}
                          >
                            <div className="flex justify-between">
                              <div>
                                <div className="text-lg font-semibold">
                                  {b.route}
                                </div>
                                <div className="text-slate-400">
                                  {b.time} • {b.total_price.toLocaleString("vi-VN")} đ
                                </div>
                              </div>

                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  a.status === "assigned"
                                    ? "bg-yellow-600"
                                    : a.status === "completed"
                                    ? "bg-green-600"
                                    : "bg-slate-600"
                                }`}
                              >
                                {a.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              ))}
        </div>
      )}

      {/* ============================================================
           SALARY TAB
      ============================================================ */}
      {tab === "salary" && (
        <div className="space-y-6">

          <h2 className="text-xl font-bold">💰 Lương theo tháng</h2>

          {sortedMonths.length > 0 && (
            <select
              className="bg-slate-800 p-3 rounded-xl border border-slate-700"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {sortedMonths.map((m) => (
                <option key={m} value={m}>
                  Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                </option>
              ))}
            </select>
          )}

          {monthSummary && (
            <div className="p-5 bg-slate-800 rounded-xl border border-slate-700">
              <h3 className="font-bold text-xl mb-2">
                Tổng lương tháng {selectedMonth}
              </h3>
              <p>Doanh thu: {monthSummary.revenue.toLocaleString("vi-VN")} đ</p>
              <p className="text-green-400 font-bold">
                Tài xế nhận: {monthSummary.pay.toLocaleString("vi-VN")} đ
              </p>
              <p>Số chuyến: {monthSummary.totalTrips}</p>
              <p>Số ngày có chuyến: {monthSummary.totalDays}</p>
            </div>
          )}

          {/* TABLE */}
          {selectedMonth && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Doanh thu</th>
                    <th className="p-3">Tài xế</th>
                  </tr>
                </thead>

                <tbody>
                  {groupedByMonth[selectedMonth].map((row) => (
                    <>
                      <tr
                        key={row.date}
                        className="cursor-pointer hover:bg-slate-700"
                        onClick={() =>
                          setOpenSalaryDay((p) => ({
                            ...p,
                            [row.date]: !p[row.date],
                          }))
                        }
                      >
                        <td className="p-3">{formatDateVN(row.date)}</td>
                        <td className="p-3">
                          {row.revenue.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="p-3 text-green-400 font-bold">
                          {row.driverPay.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>

                      {openSalaryDay[row.date] && (
                        <tr>
                          <td colSpan={3} className="bg-slate-900 p-4">
                            {row.trips.map((t) => (
                              <div
                                key={t.id}
                                className="p-3 bg-slate-800 rounded-lg border border-slate-700 mb-3 cursor-pointer"
                                onClick={() => setModalTrip(t.bookings)}
                              >
                                <div className="font-bold">
                                  {t.bookings.route}
                                </div>
                                <div className="text-slate-400 text-sm">
                                  {t.bookings.time} —
                                  {t.bookings.total_price.toLocaleString(
                                    "vi-VN"
                                  )}{" "}
                                  đ
                                </div>
                              </div>
                            ))}
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

      {/* ============================================================
           POPUP TRIP
      ============================================================ */}
      {modalTrip && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-lg p-6 rounded-xl relative">

            <button
              className="absolute top-3 right-3"
              onClick={() => setModalTrip(null)}
            >
              <HiX className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold mb-4">{modalTrip.route}</h2>

            <div className="space-y-4">

              <div className="flex items-center gap-3">
                <HiUser />
                <span>{modalTrip.full_name}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiPhone />
                <span>{modalTrip.phone}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(modalTrip.phone)}
                  className="p-2 bg-slate-700 rounded"
                >
                  <HiClipboardCopy />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <HiOutlineCalendar />
                <span>{formatDateVN(modalTrip.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiClock />
                <span>{modalTrip.time}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiLocationMarker />
                <span>{modalTrip.pickup_place}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiLocationMarker />
                <span>{modalTrip.dropoff_place}</span>
              </div>

              <div className="flex items-center gap-3">
                <HiAnnotation />
                <span>{modalTrip.note || "—"}</span>
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
