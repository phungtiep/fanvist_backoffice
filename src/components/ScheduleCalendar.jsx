import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
    HiChevronLeft,
    HiChevronRight,
} from "react-icons/hi2";

export default function ScheduleCalendar() {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    const [bookings, setBookings] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [saving, setSaving] = useState(false);

    function showToast(message, type = "success") {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    }

    // 🔧 format dd/mm/yyyy
    function formatDateVN(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    // 🔧 tính range của tháng
    function getMonthRange(date) {
        const y = date.getFullYear();
        const m = date.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        const from = start.toISOString().split("T")[0];
        const to = end.toISOString().split("T")[0];
        return { from, to, start, end };
    }

    // 🔧 xây grid ngày (bao gồm padding đầu tháng)
    function buildCalendarDays(date) {
        const { start, end } = getMonthRange(date);
        const days = [];
        const firstDayOfWeek = start.getDay(); // 0 = Chủ nhật

        // padding trước ngày 1 (để canh đúng thứ)
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        for (let d = 1; d <= end.getDate(); d++) {
            days.push(new Date(start.getFullYear(), start.getMonth(), d));
        }

        return days;
    }

    // 🔄 load drivers + vehicles
    async function loadDriversAndVehicles() {
        const [{ data: dDrivers }, { data: dVehicles }] = await Promise.all([
            supabase.from("drivers").select("*").order("full_name"),
            supabase.from("vehicles").select("*").order("plate_number"),
        ]);

        setDrivers(dDrivers || []);
        setVehicles(dVehicles || []);
    }

    // 🔄 load bookings trong tháng
    async function loadBookings() {
        setLoading(true);
        const { from, to } = getMonthRange(currentMonth);

        const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .gte("date", from)
            .lte("date", to)
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        setLoading(false);

        if (error) {
            console.error(error);
            showToast("Không tải được dữ liệu booking", "error");
            return;
        }

        setBookings(data || []);
    }

    useEffect(() => {
        loadDriversAndVehicles();
    }, []);

    useEffect(() => {
        loadBookings();
    }, [currentMonth]);

    // group booking theo date string
    const bookingsByDate = bookings.reduce((acc, b) => {
        const key = b.date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
    }, {});

    const days = buildCalendarDays(currentMonth);

    const monthLabel = currentMonth.toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
    });

    // 🧠 helpers hiển thị label tài xế / xe
    // 🧠 helpers hiển thị label tài xế / xe
    function getDriverName(id) {
        if (!id) return "Chưa phân công";

        const driver = drivers.find((d) => d.id === id);

        if (!driver) return "Không tìm thấy tài xế";

        return driver.full_name || driver.phone_number || "Không rõ tên";
    }

    function getVehicleLabel(id) {
        if (!id) return "Chưa gán xe";

        const v = vehicles.find((x) => x.id === id);
        if (!v) return "Không tìm thấy xe";

        const plate = v.plate_number || "";      // tránh undefined
        const info = [v.brand, v.model].filter(Boolean).join(" ");

        // Không có biển số, không có brand/model
        if (!plate && !info) return "Xe chưa đủ thông tin";

        // Chỉ có brand/model
        if (!plate) return info;

        // Chỉ có biển số
        if (!info) return plate;

        // Có cả hai
        return `${plate} • ${info}`;
    }




    // mở modal phân công
    function openAssignModal(booking) {
        // map row → local state
        setSelectedBooking({
            ...booking,
            driver_id: booking.driver_id ?? "",
            vehicle_id: booking.vehicle_id ?? "",
        });
    }

    // lưu phân công (update driver_id + vehicle_id)
    async function handleSaveAssign() {
        if (!selectedBooking) return;

        setSaving(true);

        const payload = {
            driver_id: selectedBooking.driver_id || null,
            vehicle_id: selectedBooking.vehicle_id || null,
        };

        const { error } = await supabase
            .from("bookings")
            .update(payload)
            .eq("id", selectedBooking.id);

        setSaving(false);

        if (error) {
            console.error(error);
            showToast("Lưu phân công thất bại!", "error");
            return;
        }

        showToast("Đã lưu phân công!", "success");
        setSelectedBooking(null);
        loadBookings();
    }

    // chuyển tháng
    function goPrevMonth() {
        setCurrentMonth((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return new Date(d.getFullYear(), d.getMonth(), 1);
        });
    }

    function goNextMonth() {
        setCurrentMonth((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return new Date(d.getFullYear(), d.getMonth(), 1);
        });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    return (
        <div className="p-6 text-slate-200 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Calendar phân công chuyến</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Xem booking theo lịch và gán tài xế / xe cho từng chuyến.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-2 rounded-xl border border-slate-700">
                    <button
                        onClick={goPrevMonth}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <HiChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                        {monthLabel}
                    </span>
                    <button
                        onClick={goNextMonth}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <HiChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-3 sm:p-4 shadow-lg">
                {/* header thứ */}
                <div className="grid grid-cols-7 text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                        <div key={d} className="text-center py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* days grid */}
                <div className="grid grid-cols-7 gap-[2px] sm:gap-1 text-xs">
                    {days.map((day, idx) => {
                        if (!day) {
                            return (
                                <div
                                    key={idx}
                                    className="min-h-[70px] sm:min-h-[90px] bg-slate-900/40 rounded-lg border border-transparent"
                                />
                            );
                        }

                        const dateStr = day.toISOString().split("T")[0];
                        const dayBookings = bookingsByDate[dateStr] || [];
                        const isToday = dateStr === todayStr;

                        return (
                            <div
                                key={dateStr}
                                className={`flex flex-col rounded-lg border px-1.5 py-1.5 sm:px-2 sm:py-2 min-h-[90px] sm:min-h-[110px] 
                  bg-slate-900/60 ${isToday
                                        ? "border-blue-500/70 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                                        : "border-slate-700/70"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] sm:text-xs text-slate-400">
                                        {formatDateVN(dateStr)}
                                    </span>
                                    <span className="text-[11px] px-1.5 rounded-full bg-slate-800/80 text-slate-300">
                                        {dayBookings.length}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-700">
                                    {dayBookings.map((b) => (
                                        <button
                                            key={b.id}
                                            onClick={() => openAssignModal(b)}
                                            className="w-full text-left rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-1.5 py-1"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-semibold text-emerald-300">
                                                    {b.time}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-[90px] sm:max-w-[120px]">
                                                    {b.route}
                                                </span>
                                            </div>
                                            <div className="mt-0.5 text-[10px] text-slate-300 truncate">
                                                {getDriverName(b.driver_id)}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate">
                                                {getVehicleLabel(b.vehicle_id)}
                                            </div>
                                        </button>
                                    ))}

                                    {dayBookings.length === 0 && (
                                        <div className="text-[10px] text-slate-500 italic">
                                            Không có chuyến
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[70]
          ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
                >
                    {toast.message}
                </div>
            )}

            {/* Modal phân công */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[80]">
                    <div className="relative bg-[#0f172a] p-6 rounded-xl w-[95%] max-w-[480px] max-h-[85vh] overflow-y-auto border border-slate-700">
                        {saving && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl z-[90]">
                                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        <h2 className="text-xl font-bold mb-4">
                            Phân công chuyến
                        </h2>

                        <div className="space-y-3 text-sm">
                            <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700">
                                <div className="font-semibold text-base">
                                    {selectedBooking.full_name} — {selectedBooking.phone}
                                </div>
                                <div className="text-slate-300 mt-1">
                                    {selectedBooking.route} • {selectedBooking.car_type}
                                </div>
                                <div className="text-slate-400 text-xs mt-1">
                                    Ngày đi: {formatDateVN(selectedBooking.date)} • Giờ:{" "}
                                    {selectedBooking.time}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs mb-1 text-slate-300">Tài xế</div>
                                <select
                                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm"
                                    value={selectedBooking.driver_id || ""}
                                    onChange={(e) =>
                                        setSelectedBooking((prev) => ({
                                            ...prev,
                                            driver_id: e.target.value || "",
                                        }))
                                    }
                                >
                                    <option value="">— Chưa phân công —</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.full_name} • {d.phone}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="text-xs mb-1 text-slate-300">Xe</div>
                                <select
                                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-sm"
                                    value={selectedBooking.vehicle_id || ""}
                                    onChange={(e) =>
                                        setSelectedBooking((prev) => ({
                                            ...prev,
                                            vehicle_id: e.target.value || "",
                                        }))
                                    }
                                >
                                    <option value="">— Chưa gán xe —</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate_number} • {v.brand} {v.model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="px-4 py-2 rounded bg-slate-600 text-sm"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleSaveAssign}
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
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
