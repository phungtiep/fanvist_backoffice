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

    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [saving, setSaving] = useState(false);

    function showToast(message, type = "success") {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    }

    function formatDateVN(dateStr) {
        const d = new Date(dateStr);
        const dd = `${d.getDate()}`.padStart(2, "0");
        const mm = `${d.getMonth() + 1}`.padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function getMonthRange(date) {
        const y = date.getFullYear();
        const m = date.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        return {
            from: start.toISOString().split("T")[0],
            to: end.toISOString().split("T")[0],
            start,
            end,
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

    async function loadDriversAndVehicles() {
        const [{ data: dDrivers }, { data: dVehicles }] = await Promise.all([
            supabase.from("drivers").select("*").order("full_name"),
            supabase.from("vehicles").select("*").order("plate_number"),
        ]);

        setDrivers(dDrivers || []);
        setVehicles(dVehicles || []);
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

    function getDriverName(id) {
        if (!id) return "Chưa phân công";
        const d = drivers.find((x) => x.id === id);
        return d?.full_name || d?.phone || "Không rõ";
    }

    function getVehicleLabel(id) {
        if (!id) return "Chưa gán xe";
        const v = vehicles.find((x) => x.id === id);
        if (!v) return "Không rõ xe";

        return [v.plate_number, v.brand, v.model].filter(Boolean).join(" • ");
    }

    function openAssignModal(b) {
        setSelectedBooking({
            ...b,
            driver_id: b.driver_id ?? "",
            vehicle_id: b.vehicle_id ?? "",
        });
    }

    async function handleSaveAssign() {
        if (!selectedBooking) return;
        setSaving(true);

        const driverId = selectedBooking.driver_id || null;
        const vehicleId = selectedBooking.vehicle_id || null;

        let commission = 70;

        if (driverId) {
            const { data: info } = await supabase
                .from("drivers")
                .select("commission_percent")
                .eq("id", driverId)
                .single();

            if (info?.commission_percent) commission = info.commission_percent;
        }

        const total = selectedBooking.total_price || 0;
        const driver_pay = Math.round(total * (commission / 100));
        const company_profit = total - driver_pay;

        const { error: assignErr } = await supabase.from("driver_assignments").insert({
            booking_id: selectedBooking.id,
            driver_id: driverId,
            vehicle_id: vehicleId,
            driver_pay,
            company_profit,
            status: "assigned",
        });

        if (assignErr) {
            console.error(assignErr);
            showToast("Không thể lưu phân công!", "error");
            setSaving(false);
            return;
        }

        await supabase
            .from("bookings")
            .update({ driver_id: driverId, vehicle_id: vehicleId })
            .eq("id", selectedBooking.id);

        setSaving(false);
        setSelectedBooking(null);
        showToast("Đã phân công!");
        loadBookings();
    }

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

    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

    const days = buildCalendarDays(currentMonth);

    const bookingsByDate = bookings.reduce((acc, b) => {
        if (!acc[b.date]) acc[b.date] = [];
        acc[b.date].push(b);
        return acc;
    }, {});

    const monthLabel = currentMonth.toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="p-4 text-slate-100 w-full mx-auto pb-20 bg-[#0a0f1a] min-h-screen">

            {/* BACK BUTTON */}
            <button
                onClick={() => navigate(-1)}
                className="mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2"
            >
                ← Quay lại
            </button>

            <h1 className="text-2xl font-bold mb-2">Calendar phân công chuyến</h1>

            <div className="flex justify-center items-center gap-4 mb-4">
                <button onClick={goPrevMonth} className="p-2 rounded bg-slate-700">
                    <HiChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-lg font-semibold">{monthLabel}</div>

                <button onClick={goNextMonth} className="p-2 rounded bg-slate-700">
                    <HiChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 bg-[#0a0d1a] rounded-xl overflow-hidden border border-slate-700 w-full">

                {/* HEADER */}
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                    <div
                        key={d}
                        className="px-2 py-2 text-center text-sm bg-[#0d1326] border-b border-slate-700 text-slate-300"
                    >
                        {d}
                    </div>
                ))}

                {/* DAYS */}
                {days.map((day, idx) => {
                    if (!day)
                        return (
                            <div
                                key={idx}
                                className="h-[95px] bg-[#0c1322]/40 border-r border-b border-slate-700"
                            />
                        );

                    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const list = bookingsByDate[dateStr] || [];
                    const isToday = dateStr === todayStr;

                    return (
                        <div
                            key={dateStr}
                            className={`
                border-r border-b border-slate-700 
                px-2 pt-2 relative
                h-[100px]           /* MOBILE fixed */
                sm:h-auto sm:min-h-[180px]   /* DESKTOP auto height — NO SCROLL */
                bg-[#0c1322]
              `}
                        >
                            {/* DATE CIRCLE */}
                            <div className="flex items-center justify-between mb-1">
                                <div
                                    className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-xs
                    ${isToday ? "bg-blue-500 text-white" : "text-slate-300"}
                  `}
                                >
                                    {day.getDate()}
                                </div>

                                {list.length > 0 && (
                                    <span className="text-[10px] text-slate-400">{list.length}</span>
                                )}
                            </div>

                            {/* EVENTS */}
                            <div className="space-y-1">
                                {list.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => openAssignModal(b)}
                                        className="
                      w-full rounded bg-slate-800/80 
                      hover:bg-slate-700/80 px-2 py-1 
                      text-[10px] border border-slate-700/70 text-left
                    "
                                    >
                                        <div className="flex items-center gap-1">
                                            <span className="text-emerald-300 font-semibold">{b.time}</span>
                                            <span className="truncate flex-1">{b.route}</span>
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

            {/* LOADING */}
            {loading && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* TOAST */}
            {toast && (
                <div
                    className={`
            fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-50
            ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}
          `}
                >
                    {toast.message}
                </div>
            )}

            {/* MODAL */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
                    <div className="bg-[#0d1326] p-5 rounded-xl w-[95%] max-w-[460px] border border-slate-700 relative">
                        {saving && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        <h2 className="text-xl font-bold mb-3">Phân công chuyến</h2>

                        <div className="p-3 border border-slate-700 rounded-lg bg-[#10182f]">
                            <div className="font-semibold text-base">
                                {selectedBooking.full_name} — {selectedBooking.phone}
                            </div>

                            <div className="text-slate-300 mt-1">
                                {selectedBooking.route} • {selectedBooking.car_type}
                            </div>

                            <div className="text-slate-400 text-sm mt-1">
                                Ngày đi: {formatDateVN(selectedBooking.date)} • Giờ:{" "}
                                {selectedBooking.time}
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="text-sm text-slate-300">Tài xế</label>
                            <select
                                value={selectedBooking.driver_id}
                                onChange={(e) =>
                                    setSelectedBooking({ ...selectedBooking, driver_id: e.target.value })
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

                        <div className="mt-3">
                            <label className="text-sm text-slate-300">Xe</label>
                            <select
                                value={selectedBooking.vehicle_id}
                                onChange={(e) =>
                                    setSelectedBooking({ ...selectedBooking, vehicle_id: e.target.value })
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
