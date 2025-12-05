import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function CarsAdmin() {
  const [cars, setCars] = useState([]);
  const [openRow, setOpenRow] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toast, setToast] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [newCar, setNewCar] = useState({
    code: "",
    name_vi: "",
    name_en: "",
    seat_count: "",
    base_price: "",
    image_url: "",
    active: true,
  });

  /* ⭐ KHÓA SCROLL BACKGROUND KHI POPUP MỞ */
  useEffect(() => {
    if (addModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";

    return () => (document.body.style.overflow = "auto");
  }, [addModal]);

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

    await supabase.from("cars").update(payload).eq("id", car.id);

    setSavingId(null);
    setGlobalLoading(false);

    setSavedId(car.id);
    setToast("Đã lưu thay đổi!");
    setTimeout(() => setSavedId(null), 1500);
    setTimeout(() => setToast(""), 1500);

    await loadCars();
    setOpenRow(null);
  };

  const toggleActive = async (car) => {
    setGlobalLoading(true);

    await supabase
      .from("cars")
      .update({ active: !car.active })
      .eq("id", car.id);

    setGlobalLoading(false);

    setToast(!car.active ? "Xe đã được bật hoạt động" : "Xe đã bị vô hiệu hóa");
    setTimeout(() => setToast(""), 1500);

    await loadCars();
  };

  /* ==========================
     ADD CAR SUBMIT
  ========================== */
  const handleAddCar = async () => {
    setGlobalLoading(true);

    const payload = {
      code: newCar.code,
      name_vi: newCar.name_vi,
      name_en: newCar.name_en,
      seat_count: Number(newCar.seat_count),
      base_price: Number(newCar.base_price),
      image_url: newCar.image_url,
      active: true,
    };

    await supabase.from("cars").insert(payload);

    setGlobalLoading(false);
    setAddModal(false);

    setNewCar({
      code: "",
      name_vi: "",
      name_en: "",
      seat_count: "",
      base_price: "",
      image_url: "",
      active: true,
    });

    await loadCars();
  };

  return (
    <div className="space-y-6">

      {/* GLOBAL LOADING */}
      {globalLoading && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg">Đang xử lý...</p>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] px-4 py-2 bg-green-600 text-white rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Quản lý xe</h1>

        <button
          onClick={() => setAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
        >
          + Thêm xe
        </button>
      </div>

      {/* CAR LIST */}
      {loading ? (
        <p className="text-slate-300">Đang tải dữ liệu...</p>
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

      {/* ============================================================
         POPUP ADD CAR (CHUẨN iOS – KHÔNG LỆCH, KHÓA SCROLL)
      ============================================================ */}
      {addModal && (
        <div className="
          fixed inset-0 z-[9999]
          flex items-center justify-center
          bg-black/40 backdrop-blur-xl
          animate-fade-in px-4
        ">
          <div className="
            bg-[#111827] text-white 
            w-full max-w-md mx-auto
            rounded-[28px] p-6
            shadow-[0_20px_40px_rgba(0,0,0,0.55)]
            animate-ios-popup
          ">
            
            <h2 className="text-xl font-semibold mb-4 text-center">Thêm xe mới</h2>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <Input label="Code" value={newCar.code} onChange={(e) => setNewCar({ ...newCar, code: e.target.value })} />
              <Input label="Tên (VI)" value={newCar.name_vi} onChange={(e) => setNewCar({ ...newCar, name_vi: e.target.value })} />
              <Input label="Tên (EN)" value={newCar.name_en} onChange={(e) => setNewCar({ ...newCar, name_en: e.target.value })} />
              <Input label="Số ghế" type="number" value={newCar.seat_count} onChange={(e) => setNewCar({ ...newCar, seat_count: e.target.value })} />
              <Input label="Giá cơ bản" type="number" value={newCar.base_price} onChange={(e) => setNewCar({ ...newCar, base_price: e.target.value })} />
              <Input label="Image URL" value={newCar.image_url} onChange={(e) => setNewCar({ ...newCar, image_url: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600"
              >
                Đóng
              </button>

              <button
                onClick={handleAddCar}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
              >
                Thêm xe
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* ============================================================
   CAR ROW
============================================================ */
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
  const ref = useRef(null);

  return (
    <div className="border border-slate-800 bg-slate-900 rounded-xl">

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-800"
      >
        <div className="flex items-center gap-4">
          <span className="text-slate-200">{car.code}</span>
          <span className="text-slate-400">{car.name_vi}</span>

          <span
            className={`text-xs px-2 py-1 rounded ${
              car.active
                ? "bg-green-600/30 text-green-300"
                : "bg-red-600/30 text-red-300"
            }`}
          >
            {car.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div
          className={`text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </div>
      </button>

      <div
        ref={ref}
        className="overflow-hidden transition-all duration-300"
        style={{ height: open ? ref.current?.scrollHeight : 0 }}
      >
        <div className="px-6 pb-6 pt-3 space-y-4 bg-slate-900/70">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Code" value={car.code} onChange={(e) => handleValue(car.id, "code", e.target.value)} />
            <Input label="Tên (VI)" value={car.name_vi} onChange={(e) => handleValue(car.id, "name_vi", e.target.value)} />
            <Input label="Tên (EN)" value={car.name_en} onChange={(e) => handleValue(car.id, "name_en", e.target.value)} />
            <Input label="Số ghế" type="number" value={car.seat_count} onChange={(e) => handleValue(car.id, "seat_count", e.target.value)} />
            <Input label="Giá cơ bản" type="number" value={car.base_price} onChange={(e) => handleValue(car.id, "base_price", e.target.value)} />
            <Input label="Image URL" value={car.image_url || ""} onChange={(e) => handleValue(car.id, "image_url", e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleActive(car)}
              className={`px-4 py-2 rounded-xl ${
                car.active ? "bg-rose-600" : "bg-emerald-600"
              }`}
            >
              {car.active ? "Disable" : "Enable"}
            </button>

            <button
              onClick={() => saveCar(car)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white"
            >
              {savingId === car.id ? "Đang lưu…" : "Lưu"}
            </button>

            {savedId === car.id && (
              <span className="text-green-400 animate-pulse">✓ Đã lưu</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ============================================================
   INPUT COMPONENT
============================================================ */
function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        {...props}
        className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
      />
    </div>
  );
}

/* ============================================================
   ANIMATIONS (ADD TO globals.css)
============================================================ */
/*
@keyframes ios-popup {
  0% { opacity: 0; transform: scale(0.9) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-ios-popup {
  animation: ios-popup 0.25s ease-out;
}

@keyframes fade-in {
  0% { opacity: 0 }
  100% { opacity: 1 }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
*/
