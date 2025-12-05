import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/* ============================================================
   CONSTANTS
============================================================ */
const PRICE_FIELDS = [
  { key: "price_4", label: "4 chỗ" },
  { key: "price_7", label: "7 chỗ" },
  { key: "price_9", label: "Limo 9" },
  { key: "price_11", label: "Limo 11" },
  { key: "price_16", label: "16 chỗ" },
  { key: "price_19", label: "Limo 19" },
  { key: "price_24", label: "Limo 24" },
  { key: "price_29", label: "29 chỗ" },
  { key: "price_45", label: "45 chỗ" },
  { key: "price_carnival", label: "Carnival" },
  { key: "price_sedona", label: "Sedona" },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function RoutesAdmin() {
  const [routes, setRoutes] = useState([]);
  const [openRow, setOpenRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [globalLoading, setGlobalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState(null);

  /* LOAD ROUTES */
  useEffect(() => {
    loadRoutes();
  }, []);

  async function loadRoutes() {
    setGlobalLoading(true);
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("code", { ascending: true });

    if (error) setError(error.message);

    setRoutes(data || []);
    setLoading(false);
    setGlobalLoading(false);
  }

  /* UPDATE STATE */
  const handleValue = (id, key, value) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [key]: value === "" ? null : Number(value) } : r
      )
    );
  };

  const handleNameChange = (id, value) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: value } : r))
    );
  };

  /* SAVE ROUTE */
  const saveRoute = async (route) => {
    setSavingId(route.id);
    setGlobalLoading(true);

    const payload = { name: route.name };
    PRICE_FIELDS.forEach(({ key }) => (payload[key] = route[key] ?? null));

    await supabase.from("routes").update(payload).eq("id", route.id);

    setSavingId(null);
    setGlobalLoading(false);
    setSavedId(route.id);

    setToast("Đã lưu thay đổi!");
    setTimeout(() => setToast(""), 1500);

    await loadRoutes();
    setOpenRow(null);

    setTimeout(() => setSavedId(null), 1500);
  };

  /* DELETE ROUTE */
  const handleDeleteConfirmed = async () => {
    if (!deletingRoute) return;

    setGlobalLoading(true);

    await supabase.from("routes").delete().eq("id", deletingRoute.id);

    setDeletingRoute(null);
    await loadRoutes();
    setGlobalLoading(false);
  };

  /* UI */
  return (
    <div className="space-y-6 min-h-screen-dvh">

      {/* GLOBAL LOADING */}
      {globalLoading && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-4 text-white text-lg font-medium">Đang xử lý...</p>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 px-4 py-2 bg-green-600 text-white rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tuyến đường & bảng giá</h1>
          <p className="text-slate-400 text-sm">Thêm, chỉnh sửa và xóa tuyến đường.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm text-white"
        >
          + Thêm tuyến
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-slate-300 text-center">Đang tải dữ liệu…</p>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <AccordionRow
              key={route.id}
              route={route}
              open={openRow === route.id}
              onToggle={() => setOpenRow(openRow === route.id ? null : route.id)}
              handleValue={handleValue}
              handleNameChange={handleNameChange}
              saveRoute={saveRoute}
              savingId={savingId}
              savedId={savedId}
              onDelete={() => setDeletingRoute(route)}
            />
          ))}
        </div>
      )}

      {/* MODALS */}
      <AddRouteModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={loadRoutes}
        setGlobalLoading={setGlobalLoading}
      />

      <DeleteConfirm
        open={!!deletingRoute}
        route={deletingRoute}
        onClose={() => setDeletingRoute(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}

/* ============================================================
   ACCORDION ROW
============================================================ */
function AccordionRow({
  route,
  open,
  onToggle,
  handleValue,
  handleNameChange,
  saveRoute,
  savingId,
  savedId,
  onDelete,
}) {
  const contentRef = useRef(null);

  return (
    <div className="border border-slate-800 bg-slate-900 rounded-xl">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-800"
      >
        <div className="flex items-center gap-4">
          <span className="text-slate-100 font-semibold">{route.code}</span>
          <span className="text-slate-400">{route.name}</span>
        </div>

        <div
          className={`text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▲
        </div>
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{
          height: open ? contentRef.current?.scrollHeight : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-6 pb-6 pt-4 space-y-4 bg-slate-900/60 border-t border-slate-800">
          <div>
            <label className="text-sm text-slate-400">Tên tuyến</label>
            <input
              value={route.name || ""}
              onChange={(e) => handleNameChange(route.id, e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PRICE_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-slate-400">{f.label}</label>
                <input
                  type="number"
                  value={route[f.key] ?? ""}
                  onChange={(e) => handleValue(route.id, f.key, e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm"
            >
              Xóa tuyến
            </button>

            <div className="flex items-center gap-3">
              {savedId === route.id && (
                <span className="text-green-300 text-sm animate-pulse">✓ Đã lưu</span>
              )}

              <button
                onClick={() => saveRoute(route)}
                disabled={savingId === route.id}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50"
              >
                {savingId === route.id ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   POPUP MODAL — FIXED WITH 100dvh SUPPORT
============================================================ */
function AddRouteModal({ open, onClose, onCreated, setGlobalLoading }) {
  const [form, setForm] = useState(() => {
    const base = { code: "", name: "" };
    PRICE_FIELDS.forEach(({ key }) => (base[key] = null));
    return base;
  });

  // prevent body scroll
  useEffect(() => {
    document.documentElement.classList.toggle("overflow-hidden", open);
  }, [open]);

  const handleChange = (key, value, isNum = false) =>
    setForm((p) => ({
      ...p,
      [key]: isNum ? (value === "" ? null : Number(value)) : value,
    }));

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;

    setGlobalLoading(true);
    await supabase.from("routes").insert([{ ...form, active: true }]);
    setGlobalLoading(false);

    onCreated();
    onClose();

    setForm({ code: "", name: "" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg z-[9998] flex items-center justify-center px-4">

      <div className="
        bg-slate-900 border border-slate-700
        rounded-3xl shadow-2xl
        w-full max-w-lg
        flex flex-col
        max-h-screen-dvh
        overflow-hidden
        animate-popup
      ">

        {/* HEADER */}
        <div className="p-6 pb-3">
          <h2 className="text-xl font-semibold text-white text-center">Thêm tuyến mới</h2>
        </div>

        {/* CONTENT (scrollable) */}
        <div className="px-6 space-y-4 overflow-y-auto flex-1 pb-4">
          <Input label="Mã tuyến" value={form.code} onChange={(e) => handleChange("code", e.target.value)} />
          <Input label="Tên tuyến" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRICE_FIELDS.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type="number"
                value={form[f.key] ?? ""}
                onChange={(e) => handleChange(f.key, e.target.value, true)}
              />
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 pt-3 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white">
            Hủy
          </button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
            Thêm tuyến
          </button>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   DELETE CONFIRM
============================================================ */
function DeleteConfirm({ open, onClose, onConfirm, route }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">

        <h2 className="text-lg text-white font-semibold mb-2">Xóa tuyến?</h2>
        <p className="text-slate-300 text-sm mb-6">
          Bạn có chắc muốn xóa tuyến <span className="font-semibold">{route?.code}</span>?
        </p>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-xl">Hủy</button>
          <button onClick={onConfirm} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Xóa</button>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   INPUT
============================================================ */
function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
      />
    </div>
  );
}

/* ============================================================
   ANIMATION CSS
============================================================ */
/*
.animate-popup {
  animation: popup 0.25s ease-out;
}
@keyframes popup {
  from { opacity: 0; transform: scale(.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
*/
