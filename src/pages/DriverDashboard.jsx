import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  const [salaryList, setSalaryList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [openSalaryDay, setOpenSalaryDay] = useState({});

  const [modalTrip, setModalTrip] = useState(null);

  /* ============================================================
       LOAD TRIPS
  ============================================================ */
  async function loadTrips() {
    const { data, error } = await supabase
      .from("driver_assignments")
      .select(
        `
        id, status, driver_pay,
        bookings (
          id, full_name, phone, date, time, route,
          pickup_place, dropoff_place, total_price, car_type, note
        )
      `
      )
      .eq("driver_id", driverId)
      .order("id", { ascending: true });

    if (!error && data) {
      setAssignments(data);

      const grouped = data.reduce((acc, row) => {
        const d = row.bookings.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(row);
        return acc;
      }, {});

      setGroupedAssignments(grouped);
    }
  }

  /* ============================================================
       LOAD SALARY (FULL DETAILS)
  ============================================================ */
  async function loadSalary() {
    const { data, error } = await supabase
      .from("driver_assignments")
      .select(
        `
        id,
        driver_pay,
        paid,
        paid_at,
        bookings (
          id,
          full_name,
          phone,
          date,
          time,
          route,
          pickup_place,
          dropoff_place,
          total_price,
          car_type,
          note
        )
      `
      )
      .eq("driver_id", driverId)
      .eq("paid", true)
      .order("paid_at", { ascending: false });

    if (!error && data) {
      setSalaryList(data);
    }
  }

  useEffect(() => {
    loadTrips();
    loadSalary();
  }, []);

  /* ============================================================
       HELPERS
  ============================================================ */
  function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  /* ============================================================
       GROUP SALARY BY MONTH -> DAY
  ============================================================ */

  const groupedByMonth = salaryList.reduce((acc, item) => {
    const month = item.bookings.date.slice(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(item);
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

  useEffect(() => {
    const months = Object.keys(groupedByMonth);
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]);
    }
  }, [salaryList]);

  const totalSalary = salaryList.reduce((s, x) => s + x.driver_pay, 0);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {driver.full_name}</h1>
          <p className="text-slate-400">Bảng điều khiển tài xế</p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg"
        >
          <HiLogout /> Đăng xuất
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`px-4 py-2 rounded-lg ${
            tab === "trips" ? "bg-blue-600" : "bg-slate-700"
          }`}
          onClick={() => setTab("trips")}
        >
          📅 Chuyến được phân công
        </button>

        <button
          className={`px-4 py-2 rounded-lg ${
            tab === "salary" ? "bg-blue-600" : "bg-slate-700"
          }`}
          onClick={() => setTab("salary")}
        >
          💰 Bảng lương
        </button>
      </div>

      {/* ============================================================
           TAB TRIPS
      ============================================================ */}
      {tab === "trips" && (
        <div className="space-y-4">
          {Object.keys(groupedAssignments).length === 0 && (
            <div className="text-center text-slate-400">
              Chưa có chuyến nào được phân công.
            </div>
          )}

          {Object.entries(groupedAssignments).map(([date, trips]) => (
            <div key={date} className="border border-slate-700 rounded-xl">
              <button
                className="w-full flex items-center justify-between p-4 bg-slate-800"
                onClick={() =>
                  setOpenDay((prev) => ({ ...prev, [date]: !prev[date] }))
                }
              >
                <div className="flex items-center gap-3">
                  <HiOutlineCalendar className="text-2xl text-red-300" />
                  <span className="font-semibold text-lg">
                    {formatDateVN(date)} — {trips.length} chuyến
                  </span>
                </div>

                {openDay[date] ? (
                  <HiChevronUp className="text-xl" />
                ) : (
                  <HiChevronDown className="text-xl" />
                )}
              </button>

              {openDay[date] && (
                <div className="p-4 space-y-4 bg-slate-900">
                  {trips.map((a) => {
                    const b = a.bookings;
                    return (
                      <div
                        key={a.id}
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
           TAB SALARY
      ============================================================ */}
      {tab === "salary" && (
        <div>

          <h2 className="text-2xl font-bold mb-4">💰 Lương theo tháng</h2>

          {/* SELECT MONTH */}
          {Object.keys(groupedByMonth).length > 0 ? (
            <select
              className="bg-slate-800 border border-slate-700 p-3 rounded-xl mb-6"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Object.keys(groupedByMonth).map((m) => (
                <option key={m} value={m}>
                  Tháng {m.slice(5, 7)}/{m.slice(0, 4)}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-slate-400">Chưa có lương được duyệt.</div>
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
                                  className="p-4 border border-slate-700 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700"
                                  onClick={() => setModalTrip(t.bookings)}
                                >
                                  <div className="font-semibold text-lg">
                                    {t.bookings.route}
                                  </div>
                                  <div className="text-slate-400">
                                    {t.bookings.time} —{" "}
                                    {t.bookings.total_price.toLocaleString(
                                      "vi-VN"
                                    )}
                                    đ
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

      {/* ============================================================
           POPUP TRIP DETAILS
      ============================================================ */}
      {modalTrip && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
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
