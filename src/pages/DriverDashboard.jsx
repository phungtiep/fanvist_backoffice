import { useEffect, useState } from "react";

export default function DriverDashboard() {
  /* ========================= AUTH =============================== */
  const driver = JSON.parse(localStorage.getItem("driver"));
  const driverId = driver?.id;

  if (!driverId) {
    return (
      <div className="text-center p-10 text-white text-lg">
        Chưa đăng nhập...
      </div>
    );
  }

  /* ========================= STATES ============================ */
  const [tab, setTab] = useState("trips");

  const [assignments, setAssignments] = useState([]);
  const [groupedAssignments, setGroupedAssignments] = useState({});
  const [openDay, setOpenDay] = useState({});
  const [selectedTripMonth, setSelectedTripMonth] = useState("");

  const [salaryList, setSalaryList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [openSalaryDay, setOpenSalaryDay] = useState({});

  const [modalTrip, setModalTrip] = useState(null);

  /* ========================= API CALLS ========================== */

  async function loadTrips() {
    try {
      const res = await fetch(`/api/drivertrips?driver_id=${driverId}`);
      const data = await res.json();

      setAssignments(data || []);

      // group by date
      const grouped = data.reduce((acc, row) => {
        if (!row.bookings) return acc;

        const d = row.bookings.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(row);

        return acc;
      }, {});

      setGroupedAssignments(grouped);

      // get months
      const months = [
        ...new Set(
          data
            .filter((r) => r.bookings?.date)
            .map((r) => r.bookings.date.slice(0, 7))
        ),
      ].sort();

      if (!selectedTripMonth && months.length > 0) {
        setSelectedTripMonth(months[0]);
      }
    } catch (err) {
      console.error("Trips API error:", err);
    }
  }

  async function loadSalary() {
    try {
      const res = await fetch(`/api/driversalary?driver_id=${driverId}`);
      const data = await res.json();

      setSalaryList(data || []);
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

  /* ========================= HELPERS ============================= */

  function formatDateVN(dateStr) {
    if (!dateStr) return "--/--/----";
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /* ========================= SALARY GROUPING ====================== */

  const groupedByMonth = salaryList.reduce((acc, item) => {
    const m = item.bookings?.date?.slice(0, 7);
    if (!m) return acc;
    if (!acc[m]) acc[m] = [];
    acc[m].push(item);
    return acc;
  }, {});

  Object.keys(groupedByMonth).forEach((month) => {
    groupedByMonth[month] = Object.values(
      groupedByMonth[month].reduce((acc, item) => {
        const d = item.bookings.date;
        if (!acc[d]) {
          acc[d] = {
            date: d,
            revenue: 0,
            driverPay: 0,
            trips: [],
          };
        }
        acc[d].revenue += item.bookings.total_price;
        acc[d].driverPay += item.driver_pay;
        acc[d].trips.push(item);
        return acc;
      }, {})
    );
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();

  useEffect(() => {
    if (sortedMonths.length && !selectedMonth) {
      setSelectedMonth(sortedMonths[0]);
    }
  }, [salaryList]);

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

  /* ========================= LOGOUT =============================== */

  function logout() {
    localStorage.removeItem("driver");
    window.location.href = "/driver-login";
  }

  /* ========================= UI ================================= */

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-4 bg-emerald-600 p-4 rounded-2xl shadow-lg">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow">
            <img
              src={driver.avatar_url}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold">Xin chào, {driver.full_name}</h1>
            <p className="text-white/80 text-sm">{driver.phone}</p>
            <p className="text-white/60 text-xs">Bảng điều khiển tài xế</p>
          </div>

          <button
            onClick={logout}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`flex-1 px-4 py-3 rounded-xl ${
            tab === "trips"
              ? "bg-emerald-600"
              : "bg-slate-800"
          }`}
          onClick={() => setTab("trips")}
        >
          📅 Chuyến được phân công
        </button>

        <button
          className={`flex-1 px-4 py-3 rounded-xl ${
            tab === "salary"
              ? "bg-emerald-600"
              : "bg-slate-800"
          }`}
          onClick={() => setTab("salary")}
        >
          💰 Bảng lương
        </button>
      </div>

      {/* ====================== TRIPS TAB ============================ */}
      {tab === "trips" && (
        <div className="space-y-4">

          {/* Month selector */}
          {Object.keys(groupedAssignments).length > 0 && (
            <select
              className="bg-slate-800 p-3 rounded-xl mb-4"
              value={selectedTripMonth}
              onChange={(e) => setSelectedTripMonth(e.target.value)}
            >
              {[
                ...new Set(
                  assignments
                    .filter((a) => a.bookings?.date)
                    .map((a) => a.bookings.date.slice(0, 7))
                ),
              ]
                .sort()
                .map((m) => (
                  <option key={m} value={m}>
                    Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                  </option>
                ))}
            </select>
          )}

          {/* SORT + RENDER */}
          {selectedTripMonth && (() => {
            const today = new Date().toISOString().slice(0, 10);

            const sortedDays = Object.entries(groupedAssignments)
              .filter(([d]) => d.startsWith(selectedTripMonth))
              .sort(([d1], [d2]) => {
                if (d1 === today) return -1;
                if (d2 === today) return 1;
                return new Date(d1) - new Date(d2);
              });

            return sortedDays.map(([date, trips]) => (
              <div key={date} className="border border-slate-700 rounded-xl">

                {/* HEADER */}
                <button
                  className={`w-full flex items-center justify-between p-4 ${
                    date === today ? "bg-emerald-700" : "bg-slate-800"
                  }`}
                  onClick={() =>
                    setOpenDay((prev) => ({ ...prev, [date]: !prev[date] }))
                  }
                >
                  <span className="font-semibold text-lg">
                    {formatDateVN(date)} — {trips.length} chuyến
                    {date === today && " (Hôm nay)"}
                  </span>

                  {openDay[date] ? "▲" : "▼"}
                </button>

                {/* LIST TRIPS */}
                {openDay[date] && (
                  <div className="p-4 space-y-4 bg-slate-900">
                    {trips.map((a) => (
                      <div
                        key={a.id}
                        className="p-4 bg-slate-800 rounded-lg border border-slate-700"
                        onClick={() => setModalTrip(a.bookings)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="text-lg font-semibold">
                              {a.bookings.route}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {a.bookings.time} —{" "}
                              {a.bookings.total_price.toLocaleString("vi-VN")} đ
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
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ====================== SALARY TAB =========================== */}
      {tab === "salary" && (
        <div className="space-y-6">

          <h2 className="text-2xl font-bold">💰 Lương theo tháng</h2>

          {sortedMonths.length > 0 ? (
            <select
              className="bg-slate-800 p-3 rounded-xl mb-3"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {sortedMonths.map((m) => (
                <option value={m} key={m}>
                  Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-slate-400">Chưa có lương.</p>
          )}

          {/* Summary */}
          {monthSummary && (
            <div className="p-5 rounded-xl bg-slate-800 border border-slate-700">
              <h3 className="text-xl font-bold mb-3">
                Tháng {selectedMonth.slice(5, 7)}/{selectedMonth.slice(0, 4)}
              </h3>
              <p>Doanh thu: {monthSummary.revenue.toLocaleString("vi-VN")} đ</p>
              <p className="text-green-400 font-semibold">
                Tài xế nhận: {monthSummary.pay.toLocaleString("vi-VN")} đ
              </p>
              <p>Số chuyến: {monthSummary.totalTrips}</p>
              <p>Số ngày có chuyến: {monthSummary.totalDays}</p>
            </div>
          )}

          {/* TABLE */}
          {selectedMonth && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
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
                          <td colSpan={3} className="p-4 bg-slate-900">
                            {row.trips.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => setModalTrip(t.bookings)}
                                className="p-4 bg-slate-800 rounded-lg border border-slate-700 mb-3"
                              >
                                <div className="font-semibold text-lg">
                                  {t.bookings.route}
                                </div>
                                <div className="text-slate-400">
                                  {t.bookings.time} —{" "}
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

      {/* MODAL */}
      {modalTrip && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg relative">
            <button
              className="absolute right-3 top-3"
              onClick={() => setModalTrip(null)}
            >
              ✖
            </button>

            <h2 className="text-2xl font-bold">{modalTrip.route}</h2>

            <div className="space-y-2 mt-4">
              <p>Khách: {modalTrip.full_name}</p>
              <p>SĐT: {modalTrip.phone}</p>
              <p>Ngày: {formatDateVN(modalTrip.date)}</p>
              <p>Giờ: {modalTrip.time}</p>
              <p>Đón: {modalTrip.pickup_place}</p>
              <p>Trả: {modalTrip.dropoff_place}</p>
              <p>Loại xe: {modalTrip.car_type}</p>
              <p>Ghi chú: {modalTrip.note}</p>
              <p className="text-green-400 text-xl font-bold">
                {modalTrip.total_price.toLocaleString("vi-VN")} đ
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
