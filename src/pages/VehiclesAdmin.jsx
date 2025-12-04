import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiTrash, HiPencil, HiPlus } from "react-icons/hi2";

export default function VehiclesAdmin() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // add | edit
  const [form, setForm] = useState(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // Load drivers
  async function loadDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("full_name");
    setDrivers(data || []);
  }

  // Load vehicles
  async function loadVehicles() {
    setLoadingPage(true);

    let query = supabase.from("vehicles").select("*");

    if (search) {
      query = query.ilike("plate_number", `%${search}%`);
    }

    const { data, error } = await query;

    setLoadingPage(false);

    if (error) return;

    setVehicles(data || []);
  }

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, [search]);

  // Open modal to add
  const openAddModal = () => {
    setForm({
      plate_number: "",
      brand: "",
      model: "",
      seats: 7,
      status: "available",
      driver_id: "",
      note: "",
    });
    setModalMode("add");
    setModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (v) => {
    setForm({
      id: v.id,
      plate_number: v.plate_number ?? "",
      brand: v.brand ?? "",
      model: v.model ?? "",
      seats: v.seats ?? 7,
      status: v.status ?? "available",
      driver_id: v.driver_id ?? "",
      note: v.note ?? "",
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  // Delete
  const handleDelete = async (id) => {
    if (!confirm("Xóa xe này?")) return;

    setLoadingDelete(true);

    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    setLoadingDelete(false);

    if (error) {
      showToast("Xóa thất bại!", "error");
      return;
    }

    showToast("Đã xóa xe!", "success");
    loadVehicles();
  };

  // Save
  const handleSave = async () => {
    if (!form) return;

    setLoadingSave(true);

    const payload = {
      plate_number: form.plate_number,
      brand: form.brand,
      model: form.model,
      seats: Number(form.seats),
      status: form.status,
      driver_id: form.driver_id || null,
      note: form.note,
    };

    let error = null;

    if (modalMode === "add") {
      const res = await supabase.from("vehicles").insert(payload);
      error = res.error;
    } else {
      const res = await supabase.from("vehicles").update(payload).eq("id", form.id);
      error = res.error;
    }

    setLoadingSave(false);

    if (error) {
      showToast("Lưu thất bại!", "error");
      return;
    }

    showToast("Lưu thành công!", "success");
    setModalOpen(false);
    setForm(null);
    loadVehicles();
  };

  return (
    <div className="p-6 text-slate-200 relative">

      <h1 className="text-2xl font-bold mb-6">Quản lý xe</h1>

      {/* SEARCH + ADD */}
      <div className="flex items-center gap-4 mb-6">
        <input
          placeholder="Tìm biển số..."
          className="bg-slate-800 p-2 rounded w-[220px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 rounded flex items-center gap-2 hover:bg-blue-500"
        >
          <HiPlus /> Thêm xe
        </button>
      </div>

      {/* VEHICLES LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow"
          >
            <div className="font-semibold text-lg mb-1">{v.plate_number}</div>
            <div className="text-slate-400 text-sm">
              {v.brand} {v.model} • {v.seats} chỗ
            </div>
            <div className="mt-2 text-sm">
              <strong>Trạng thái:</strong> {v.status}
            </div>

            <div className="mt-1 text-sm">
              <strong>Tài xế:</strong>{" "}
              {drivers.find((d) => d.id === v.driver_id)?.full_name || "—"}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => openEditModal(v)}
                className="p-2 rounded hover:bg-slate-600"
              >
                <HiPencil />
              </button>

              <button
                onClick={() => handleDelete(v.id)}
                className="p-2 rounded hover:bg-red-600 hover:text-white"
              >
                <HiTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL (SAFE RENDER) */}
      {modalOpen && form && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="relative bg-[#1E293B] p-6 rounded-xl w-[420px] max-h-[85vh] overflow-y-auto">

            {loadingSave && (
              <div className="absolute inset-0 bg-black/50 flex justify-center items-center rounded-xl">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Thêm xe" : "Sửa xe"}
            </h2>

            <div className="space-y-3 text-sm">
              <Field label="Biển số" value={form.plate_number} onChange={(v)=>setForm({...form, plate_number:v})}/>
              <Field label="Hãng" value={form.brand} onChange={(v)=>setForm({...form, brand:v})}/>
              <Field label="Dòng xe" value={form.model} onChange={(v)=>setForm({...form, model:v})}/>
              <Field label="Số ghế" value={form.seats} onChange={(v)=>setForm({...form, seats:v})}/>

              <div>
                <div className="text-xs mb-1">Trạng thái</div>
                <select
                  className="p-2 bg-slate-700 rounded w-full"
                  value={form.status}
                  onChange={(e)=>setForm({...form, status:e.target.value})}
                >
                  <option value="available">Đang rảnh</option>
                  <option value="in_service">Đang chạy</option>
                  <option value="repairing">Đang sửa</option>
                </select>
              </div>

              <div>
                <div className="text-xs mb-1">Tài xế phụ trách</div>
                <select
                  className="p-2 bg-slate-700 rounded w-full"
                  value={form.driver_id || ""}
                  onChange={(e)=>setForm({...form, driver_id:e.target.value})}
                >
                  <option value="">— Không có —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <Field label="Ghi chú" value={form.note} onChange={(v)=>setForm({...form, note:v})}/>
            </div>

            <div className="flex justify-end mt-4 gap-3">
              <button className="px-4 py-2 bg-slate-600 rounded" onClick={()=>setModalOpen(false)}>
                Đóng
              </button>
              <button className="px-4 py-2 bg-blue-600 rounded" onClick={handleSave}>
                Lưu
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PAGE LOADING */}
      {(loadingPage || loadingDelete) && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[999]">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
            ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs mb-1">{label}</div>
      <input
        className="p-2 bg-slate-700 rounded w-full"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
