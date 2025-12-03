import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiTrash, HiPencil, HiPlus } from "react-icons/hi2";

export default function DriversAdmin() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // view | edit | create
  const [form, setForm] = useState(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2200);
  }

  // 1️⃣ Load drivers
  async function load() {
    setLoadingPage(true);

    let query = supabase.from("drivers").select("*").order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    setLoadingPage(false);

    if (error) {
      console.error("LOAD ERROR:", error);
      return;
    }

    setDrivers(data);
  }

  useEffect(() => { load(); }, [search]);

  // 2️⃣ Delete driver
  async function handleDelete(id) {
    if (!confirm("Xóa tài xế này?")) return;

    setLoadingDelete(true);
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    setLoadingDelete(false);

    if (error) return showToast("Không thể xóa!", "error");

    showToast("Đã xóa!", "success");
    load();
  }

  // 3️⃣ Open modals
  const openCreateModal = () => {
    setForm({
      full_name: "",
      phone: "",
      email: "",
      birthdate: "",
      personal_number: "",
      address: "",
      avatar_url: "",
      base_salary: 0,
      commission_rate: 0
    });
    setModalMode("create");
    setModalOpen(true);
  };

  const openViewModal = (driver) => {
    setForm({ ...driver });
    setModalMode("view");
    setModalOpen(true);
  };

  const openEditModal = (driver) => {
    setForm({ ...driver });
    setModalMode("edit");
    setModalOpen(true);
  };

  // 4️⃣ Save (create + update)
  async function handleSave() {
    if (!form) return;

    setLoadingSave(true);

    let query =
      modalMode === "create"
        ? supabase.from("drivers").insert([{ ...form }])
        : supabase.from("drivers").update({ ...form }).eq("id", form.id);

    const { error } = await query;

    setLoadingSave(false);

    if (error) {
      console.error("SAVE ERROR:", error);
      return showToast("Lưu thất bại!", "error");
    }

    showToast("Lưu thành công!", "success");
    setModalOpen(false);
    setForm(null);
    load();
  }

  return (
    <div className="p-6 text-slate-200 relative">
      <h1 className="text-2xl font-bold mb-6">Quản lý Tài xế</h1>

      {/* SEARCH + ADD */}
      <div className="flex gap-3 mb-6">
        <input
          placeholder="Tìm tài xế theo tên / SĐT..."
          className="bg-slate-800 p-3 rounded w-full outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={openCreateModal}
          className="px-4 py-3 bg-blue-600 rounded hover:bg-blue-500 flex items-center gap-2"
        >
          <HiPlus /> Thêm
        </button>
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((d) => (
          <div
            key={d.id}
            onClick={() => openViewModal(d)}
            className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow hover:border-slate-500 transition cursor-pointer"
          >
            <div className="font-semibold text-lg">{d.full_name}</div>

            <div className="text-sm mt-1 text-slate-300">
              📞 {d.phone}
            </div>

            <div className="text-sm">
              🚗 GPLX: {d.personal_number || "—"}
            </div>

            <div className="text-sm text-green-400 font-semibold mt-2">
              Lương cứng: {d.base_salary.toLocaleString("vi-VN")} đ
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                className="p-2 hover:bg-slate-700 rounded"
                onClick={(e) => { e.stopPropagation(); openEditModal(d); }}
              >
                <HiPencil />
              </button>

              <button
                className="p-2 hover:bg-red-700 rounded text-red-300 hover:text-white"
                onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
              >
                <HiTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && form && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="relative bg-[#1E293B] p-6 rounded-lg w-[480px] max-h-[80vh] overflow-y-auto">

            {loadingSave && (
              <div className="absolute inset-0 bg-black/40 flex justify-center items-center rounded-lg">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            <h2 className="text-xl font-bold mb-4">
              {modalMode === "view"
                ? "Chi tiết tài xế"
                : modalMode === "edit"
                ? "Sửa tài xế"
                : "Thêm tài xế"}
            </h2>

            <div className="space-y-3 text-sm">
              <Field label="Họ tên" readOnly={modalMode === "view"} value={form.full_name} onChange={(v)=>setForm({...form,full_name:v})}/>
              <Field label="Số điện thoại" readOnly={modalMode === "view"} value={form.phone} onChange={(v)=>setForm({...form,phone:v})}/>
              <Field label="Email" readOnly={modalMode === "view"} value={form.email} onChange={(v)=>setForm({...form,email:v})}/>
              <Field label="Ngày sinh" type="date" readOnly={modalMode === "view"} value={form.birthdate} onChange={(v)=>setForm({...form,birthdate:v})}/>
              <Field label="GPLX" readOnly={modalMode === "view"} value={form.personal_number} onChange={(v)=>setForm({...form,personal_number:v})}/>
              <Field label="Địa chỉ" readOnly={modalMode === "view"} value={form.address} onChange={(v)=>setForm({...form,address:v})}/>
              <Field label="Lương cứng" type="number" readOnly={modalMode === "view"} value={form.base_salary} onChange={(v)=>setForm({...form,base_salary:Number(v)})}/>
              <Field label="Hoa hồng (%)" type="number" readOnly={modalMode === "view"} value={form.commission_rate} onChange={(v)=>setForm({...form,commission_rate:Number(v)})}/>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-slate-600 rounded" onClick={() => { setModalOpen(false); setForm(null); }}>Đóng</button>
              {modalMode !== "view" && (
                <button className="px-4 py-2 bg-blue-600 rounded" onClick={handleSave}>Lưu</button>
              )}
            </div>
          </div>
        </div>
      )}

      {(loadingPage || loadingDelete) && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[999]">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
          ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* FIELD REUSABLE COMPONENT */
function Field({ label, value, readOnly, onChange, type = "text" }) {
  return (
    <div>
      <div className="text-xs mb-1">{label}</div>

      {readOnly ? (
        <div className="p-2 bg-slate-700 rounded min-h-[36px]">{value || "—"}</div>
      ) : (
        <input
          type={type}
          className="w-full p-2 bg-slate-700 rounded"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
