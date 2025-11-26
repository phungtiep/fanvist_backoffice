import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function CarsAdmin() {
    const [cars, setCars] = useState([]);
    const [openRow, setOpenRow] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [savedId, setSavedId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [globalLoading, setGlobalLoading] = useState(false); // ⭐ FULLSCREEN LOADING
    const [toast, setToast] = useState("");

    // ================= LOAD CARS =================
    useEffect(() => {
        loadCars();
    }, []);

    async function loadCars() {
        setGlobalLoading(true);
        const { data } = await supabase
            .from("cars")
            .select("*")
            .order("seat_count", { ascending: true });

        setCars(data || []);
        setGlobalLoading(false);
        setLoading(false);
    }

    // ================= HANDLE EDIT FIELD =================
    const handleValue = (id, key, value) => {
        setCars((prev) =>
            prev.map((c) =>
                c.id === id
                    ? {
                        ...c,
                        [key]:
                            key === "seat_count" || key === "base_price"
                                ? Number(value)
                                : value,
                    }
                    : c
            )
        );
    };

    // ================= SAVE CAR =================
    const saveCar = async (car) => {
        setSavingId(car.id);
        setGlobalLoading(true);

        const payload = {
            code: car.code,
            name_vi: car.name_vi,
            name_en: car.name_en,
            seat_count: car.seat_count,
            base_price: car.base_price,
            image_url: car.image_url,
            active: car.active,
        };

        const { error } = await supabase
            .from("cars")
            .update(payload)
            .eq("id", car.id);

        setSavingId(null);
        setGlobalLoading(false);

        if (!error) {
            setSavedId(car.id);
            setToast("Đã lưu thay đổi!");

            setTimeout(() => setSavedId(null), 1500);
            setTimeout(() => setToast(""), 1500);
        }

        await loadCars();
        setOpenRow(null);
    };

    // ================= TOGGLE ACTIVE =================
    const toggleActive = async (car) => {
        setGlobalLoading(true);

        await supabase
            .from("cars")
            .update({ active: !car.active })
            .eq("id", car.id);

        setGlobalLoading(false);

        setToast(
            !car.active ? "Xe đã được bật hoạt động" : "Xe đã bị vô hiệu hóa"
        );
        setTimeout(() => setToast(""), 1500);

        await loadCars();
    };

    return (
        <div className="space-y-6">

            {/* ⭐ GLOBAL FULLSCREEN LOADING */}
            {globalLoading && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-white text-lg font-medium">
                        Đang xử lý...
                    </p>
                </div>
            )}

            {/* ⭐ TOAST */}
            {toast && (
                <div className="fixed top-4 right-4 px-4 py-2 bg-green-600 text-white rounded-xl shadow-lg animate-fade">
                    {toast}
                </div>
            )}

            <h1 className="text-2xl font-semibold text-white">Quản lý xe</h1>
            <p className="text-slate-400">Thêm, chỉnh sửa và quản lý danh sách xe.</p>

            {loading ? (
                <div className="text-slate-300 animate-pulse py-6">
                    Đang tải dữ liệu xe...
                </div>
            ) : (
                <div className="space-y-3">
                    {cars.map((car) => (
                        <CarRow
                            key={car.id}
                            car={car}
                            open={openRow === car.id}
                            onToggle={() =>
                                setOpenRow(openRow === car.id ? null : car.id)
                            }
                            handleValue={handleValue}
                            saveCar={saveCar}
                            savingId={savingId}
                            savedId={savedId}
                            toggleActive={toggleActive}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* =================================================================
   ROW COMPONENT
================================================================= */
function CarRow({
    car,
    open,
    onToggle,
    handleValue,
    saveCar,
    savingId,
    savedId,
    toggleActive,
}) {
    const contentRef = useRef(null);

    return (
        <div className="border border-slate-800 bg-slate-900 rounded-xl overflow-hidden">

            {/* HEADER */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-800 transition"
            >
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 font-medium">{car.code}</span>
                    <span className="text-slate-400">{car.name_vi}</span>

                    <span
                        className={`text-xs px-2 py-1 rounded ${
                            car.active
                                ? "bg-green-700/40 text-green-300"
                                : "bg-red-700/40 text-red-300"
                        }`}
                    >
                        {car.active ? "Active" : "Inactive"}
                    </span>
                </div>

                <div
                    className={`text-slate-500 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                    }`}
                >
                    ▼
                </div>
            </button>

            {/* CONTENT */}
            <div
                ref={contentRef}
                className={`overflow-hidden transition-all duration-300 ease-out ${
                    open
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-2 pointer-events-none"
                }`}
                style={{
                    height: open ? contentRef.current?.scrollHeight : 0,
                }}
            >
                <div className="px-6 pb-6 pt-3 space-y-4 bg-slate-900/60 border-t border-slate-800">

                    {/* FORM */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Input label="Code" value={car.code} onChange={(e) => handleValue(car.id, "code", e.target.value)} />

                        <Input label="Tên (VI)" value={car.name_vi} onChange={(e) => handleValue(car.id, "name_vi", e.target.value)} />

                        <Input label="Tên (EN)" value={car.name_en} onChange={(e) => handleValue(car.id, "name_en", e.target.value)} />

                        <Input label="Số ghế" type="number" value={car.seat_count} onChange={(e) => handleValue(car.id, "seat_count", e.target.value)} />

                        <Input label="Giá cơ bản" type="number" value={car.base_price} onChange={(e) => handleValue(car.id, "base_price", e.target.value)} />

                        <Input label="Image URL" value={car.image_url || ""} onChange={(e) => handleValue(car.id, "image_url", e.target.value)} />
                    </div>

                    {/* BUTTONS */}
                    <div className="flex items-center gap-3">

                        {/* ENABLE / DISABLE */}
                        <button
                            onClick={() => toggleActive(car)}
                            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                                car.active
                                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                        >
                            {car.active ? "Disable" : "Enable"}
                        </button>

                        {/* SAVE BUTTON */}
                        <button
                            onClick={() => saveCar(car)}
                            disabled={savingId === car.id}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-md disabled:opacity-50"
                        >
                            {savingId === car.id ? "Đang lưu…" : "Lưu thay đổi"}
                        </button>

                        {/* BADGE ✓ */}
                        {savedId === car.id && (
                            <span className="text-green-400 text-sm font-medium animate-pulse">
                                ✓ Đã lưu
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* =================================================================
   INPUT COMPONENT
================================================================= */
function Input({ label, ...props }) {
    return (
        <div>
            <label className="text-sm text-slate-400">{label}</label>
            <input
                {...props}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 
                rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
        </div>
    );
}
