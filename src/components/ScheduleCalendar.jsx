import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

export default function ScheduleCalendar() {
    const navigate = useNavigate();

    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const [bookings, setBookings] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [routesData, setRoutesData] = useState([]);
    const [cars, setCars] = useState([]);

    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [saving, setSaving] = useState(false);

    /* ============================================================
       LOCK SCROLL WHEN MODAL OPEN
    ============================================================ */
    useEffect(() => {
        if (selectedBooking) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [selectedBooking]);

    /* ============================================================
       HELPERS
    ============================================================ */

    const formatLocalDate = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const formatDateVN = (dateStr) => {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, "0")}/${String(
            d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    function getMonthRange(date) {
        const y = date.getFullYear();
        const m = date.getMonth();

        return {
            from: formatLocalDate(new Date(y, m, 1)),
            to: formatLocalDate(new Date(y, m + 1, 0)),
            start: new Date(y, m, 1),
            end: new Date(y, m + 1, 0),
        };
    }

    function buildCalendarDays(date) {
        const { start, end } = getMonthRange(date);
        const days = [];
        const firstDay = start.getDay();

        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= end.getDate(); d++) {
            days.push(new Date(start.getFullYear(), start.getMonth(), d));
        }

        return days;
    }

    function expandDates(b) {
        const start = new Date(b.date);
        const end = b.return_date ? new Date(b.return_date) : start;
        const arr = [];
        let cur = new Date(start);

        while (cur <= end) {
            arr.push(formatLocalDate(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return arr;
    }

    /* ============================================================
       LOADERS
    ============================================================ */

    async function loadDriversAndVehicles() {
        const [{ data: dDrivers }, { data: dVehicles }] = await Promise.all([
            supabase.from("drivers").select("*").order("full_name"),
            supabase.from("vehicles").select("*").order("plate_number"),
        ]);
        setDrivers(dDrivers || []);
        setVehicles(dVehicles || []);
    }

    async function loadRoutes() {
        const { data } = await supabase.from("routes").select("code, name");
        setRoutesData(data || []);
    }

    async function loadCars() {
        const { data } = await supabase.from("cars").select("code, name_vi");
        setCars(data || []);
    }

    async function loadBookings() {
        setLoading(true);
        const { from, to } = getMonthRange(currentMonth);

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .gte("date", from)
            .lte("date", to)
            .order("date")
            .order("time");

        setLoading(false);
        if (!error) setBookings(data || []);
    }

    useEffect(() => {
        loadDriversAndVehicles();
        loadRoutes();
        loadCars();
    }, []);

    useEffect(() => {
        loadBookings();
    }, [currentMonth]);

    /* ============================================================
       UI HELPERS
    ============================================================ */

    const getDriverById = (id) => drivers.find((x) => x.id === id) || null;
    const getDriverName = (id) =>
        getDriverById(id)?.full_name || "Chưa phân công";

    const getVehicleLabel = (id) => {
        const v = vehicles.find((x) => x.id === id);
        return v
            ? [v.plate_number, v.brand, v.model].filter(Boolean).join(" • ")
            : "Chưa gán xe";
    };

    const getRouteName = (code) =>
        routesData.find((x) => x.code === code)?.name || code;

    const getCarName = (code) =>
        cars.find((x) => x.code === code)?.name_vi || code;

    const openAssignModal = (b) =>
        setSelectedBooking({
            ...b,
            driver_id: b.driver_id ?? "",
            vehicle_id: b.vehicle_id ?? "",
        });

    /* ============================================================
       SAVE ASSIGN
    ============================================================ */

    async function handleSaveAssign() {
        // giữ nguyên logic của anh
    }

    /* ============================================================
       CALENDAR
    ============================================================ */

    const t = new Date();
    const todayStr = formatLocalDate(t);
    const days = buildCalendarDays(currentMonth);

    const bookingsByDate = {};
    bookings.forEach((b) => {
        expandDates(b).forEach((dayStr) => {
            if (!bookingsByDate[dayStr]) bookingsByDate[dayStr] = [];
            bookingsByDate[dayStr].push({
                ...b,
                isStart: dayStr === b.date,
                isEnd: b.return_date ? dayStr === b.return_date : true,
                multi: expandDates(b).length > 1,
            });
        });
    });

    const monthLabel = currentMonth.toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
    });

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <div className="p-4 text-slate-100 bg-[#0a0f1a] min-h-screen relative">

            {/* BACK */}
            <button
                onClick={() => navigate(-1)}
                className="mb-4 px-4 py-2 bg-slate-700 rounded-lg"
            >
                ← Quay lại
            </button>

            <h1 className="text-2xl font-bold mb-2">Calendar phân công chuyến</h1>

            {/* MONTH SWITCH */}
            <div className="flex justify-center items-center gap-4 mb-4">
                <button
                    onClick={() =>
                        setCurrentMonth((prev) => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() - 1);
                            return new Date(d.getFullYear(), d.getMonth(), 1);
                        })
                    }
                    className="p-2 rounded bg-slate-700"
                >
                    <HiChevronLeft />
                </button>

                <div className="text-lg font-semibold">{monthLabel}</div>

                <button
                    onClick={() =>
                        setCurrentMonth((prev) => {
                            const d = new Date(prev);
                            d.setMonth(d.getMonth() + 1);
                            return new Date(d.getFullYear(), d.getMonth(), 1);
                        })
                    }
                    className="p-2 rounded bg-slate-700"
                >
                    <HiChevronRight />
                </button>
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 bg-[#0a0d1a] rounded-xl border border-slate-700 overflow-hidden">
                {/* Week header */}
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                    <div
                        key={d}
                        className="px-2 py-2 text-center text-sm bg-[#0d1326] border-b border-slate-700 text-slate-300"
                    >
                        {d}
                    </div>
                ))}

                {/* Days */}
                {days.map((day, idx) => {
                    if (!day)
                        return (
                            <div
                                key={idx}
                                className="h-[95px] bg-[#0c1322]/40 border-r border-b border-slate-700"
                            />
                        );

                    const dateStr = formatLocalDate(day);
                    const list = bookingsByDate[dateStr] || [];
                    const isToday = dateStr === todayStr;

                    return (
                        <div
                            key={dateStr}
                            className="border-r border-b border-slate-700 px-2 pt-2 bg-[#0c1322]"
                        >
                            <div className="mb-1">
                                <div
                                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                                        isToday
                                            ? "bg-blue-500 text-white"
                                            : "text-slate-300"
                                    }`}
                                >
                                    {day.getDate()}
                                </div>
                            </div>

                            <div className="space-y-1">
                                {list.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => openAssignModal(b)}
                                        className={`w-full px-2 py-1 text-[10px] border border-slate-700/70 rounded text-left
                                            ${
                                                b.multi
                                                    ? "bg-blue-900/50"
                                                    : "bg-slate-800/80"
                                            }
                                            ${
                                                b.isStart
                                                    ? "rounded-l-lg border-l-4 border-l-emerald-400"
                                                    : ""
                                            }
                                            ${
                                                b.isEnd
                                                    ? "rounded-r-lg border-r-4 border-r-emerald-400"
                                                    : ""
                                            }
                                            hover:bg-slate-700/80
                                        `}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span className="text-emerald-300 font-semibold">
                                                {b.time}
                                            </span>
                                            <span className="truncate flex-1">
                                                {getRouteName(b.route)}
                                            </span>
                                        </div>
                                        <div className="truncate text-slate-400">
                                            {getDriverName(b.driver_id)}
                                        </div>
                                    </button>
                                ))}

                                {list.length === 0 && (
                                    <div className="text-[10px] text-slate-500 italic">
                                        Không có chuyến
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* TOAST */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
                        ${
                            toast.type === "success"
                                ? "bg-green-600"
                                : "bg-red-600"
                        }`}
                >
                    {toast.message}
                </div>
            )}

            {/* LOADING OVERLAY */}
            {loading && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* ASSIGN MODAL */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[2000]">
                    <div className="bg-[#0d1326] p-5 rounded-xl w-[95%] max-w-[460px] border border-slate-700 relative">
                        
                        {saving && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        <h2 className="text-xl font-bold mb-3">Phân công chuyến</h2>

                        <div className="p-3 border border-slate-700 rounded-lg bg-[#10182f]">
                            <div className="font-semibold text-base">
                                {selectedBooking.full_name} —{" "}
                                {selectedBooking.phone}
                            </div>

                            <div className="text-slate-300 mt-1">
                                {getRouteName(selectedBooking.route)} •{" "}
                                {getCarName(selectedBooking.car_type)}
                            </div>

                            <div className="text-slate-400 text-sm mt-1">
                                Đi: {formatDateVN(selectedBooking.date)} •{" "}
                                {selectedBooking.time}
                            </div>
                        </div>

                        {/* DRIVER */}
                        <div className="mt-3">
                            <label className="text-sm text-slate-300">
                                Tài xế
                            </label>
                            <select
                                value={selectedBooking.driver_id}
                                onChange={(e) =>
                                    setSelectedBooking({
                                        ...selectedBooking,
                                        driver_id: e.target.value,
                                    })
                                }
                                className="w-full p-2 rounded bg-[#0c1322] border border-slate-600 mt-1"
                            >
                                <option value="">— Chưa phân công —</option>
                                {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.full_name} • {d.phone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* VEHICLE */}
                        <div className="mt-3">
                            <label className="text-sm text-slate-300">Xe</label>
                            <select
                                value={selectedBooking.vehicle_id}
                                onChange={(e) =>
                                    setSelectedBooking({
                                        ...selectedBooking,
                                        vehicle_id: e.target.value,
                                    })
                                }
                                className="w-full p-2 rounded bg-[#0c1322] border border-slate-600 mt-1"
                            >
                                <option value="">— Chưa gán xe —</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.plate_number} • {v.brand} {v.model}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="px-4 py-2 bg-slate-600 rounded-lg text-sm"
                            >
                                Đóng
                            </button>

                            <button
                                onClick={handleSaveAssign}
                                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-sm"
                            >
                                Lưu phân công
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
