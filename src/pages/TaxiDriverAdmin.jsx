// ==========================================
// src/pages/TaxiDriverAdmin.jsx
// ==========================================

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi2";

/* --------------------------
   INPUT FIELD COMPONENT
--------------------------- */
function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-xs mb-1 block">{label}</label>
      <input
        type={type}
        className="w-full p-2 bg-slate-700 rounded text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* --------------------------
   TOAST HELPER
--------------------------- */
function showToastSetter(setToast, message, type = "success") {
  setToast({ message, type });
  setTimeout(() => setToast(null), 2500);
}

/* ===========================================================
   MAIN COMPONENT
=========================================================== */
export default function TaxiDriverAdmin() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    id: null,
    full_name: "",
    phone: "",
    driver_id: "",
    car_plate: "",
    be_wallet_init: "",
    sm_wallet_init: "",
    driver_share: "",
    note: "",
  });

  /* --------------------------
      LOAD DRIVERS
  --------------------------- */
  async function loadDrivers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_taxi")
      .select("*")
      .order("full_name", { ascending: true });

    setLoading(false);

    if (error) {
      console.error(error);
      return showToastSetter(setToast, "Không tải được danh sách!", "error");
    }

    setDrivers(data || []);
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  /* --------------------------
      SAVE DRIVER
  --------------------------- */
  async function handleSave() {
    if (!form.full_name || !form.phone) {
      return showToastSetter(setToast, "Tên và SĐT không được trống!", "error");
    }
    if (!form.driver_id) {
      return showToastSetter(setToast, "Mã tài xế / CCCD không được trống!", "error");
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      driver_id: form.driver_id.trim(),
      car_plate: form.car_plate.trim(),
      be_wallet_init: Number(form.be_wallet_init) || 0,
      sm_wallet_init: Number(form.sm_wallet_init) || 0,
      driver_share: Number(form.driver_share) || 0,
      note: form.note || "",
    };

    setLoading(true);

    let res;
    if (editMode) {
      res = await supabase.from("driver_taxi").update(payload).eq("id", form.id);
    } else {
      res = await supabase.from("driver_taxi").insert(payload);
    }

    setLoading(false);

    if (res.error) {
      console.error(res.error);
      return showToastSetter(setToast, "Lưu thất bại!", "error");
    }

    showToastSetter(setToast, "Đã lưu thành công!");
    setModalOpen(false);
    loadDrivers();
  }

  /* --------------------------
      DELETE DRIVER
  --------------------------- */
  async function deleteDriver(id) {
    if (!confirm("Bạn chắc chắn muốn xóa tài xế này?")) return;

    setLoading(true);
    const { error } = await supabase
      .from("driver_taxi")
      .delete()
      .eq("id", id);
    setLoading(false);

    if (error) {
      console.error(error);
      return showToastSetter(setToast, "Xóa thất bại!", "error");
    }

    showToastSetter(setToast, "Đã xóa!");
    loadDrivers();
  }

  /* --------------------------
      OPEN ADD / EDIT MODAL
  --------------------------- */
  function openAddModal() {
    setEditMode(false);
    setForm({
      id: null,
      full_name: "",
      phone: "",
      driver_id: "",
      car_plate: "",
      be_wallet_init: "",
      sm_wallet_init: "",
      driver_share: "",
      note: "",
    });
    setModalOpen(true);
  }

  function openEditModal(d) {
    setEditMode(true);
    setForm({
      id: d.id,
      full_name: d.full_name,
      phone: d.phone,
      driver_id: d.driver_id,
      car_plate: d.car_plate,
      be_wallet_init: d.be_wallet_init,
      sm_wallet_init: d.sm_wallet_init,
      driver_share: d.driver_share,
      note: d.note || "",
    });
    setModalOpen(true);
  }

  /* ===========================================================
      RENDER UI
  =========================================================== */
  return (
    <div className="p-6 text-slate-200">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý tài xế Taxi</h1>
        <button
          className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2"
          onClick={openAddModal}
        >
          <HiPlus /> Thêm tài xế taxi
        </button>
      </div>

      {/* ============================
           DESKTOP TABLE (md+)
      ============================ */}
      <div className="hidden md:block bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex justify-between">
          <span className="font-semibold text-sm">Danh sách tài xế</span>
          {loading && <span className="text-xs text-slate-400">Đang tải...</span>}
        </div>

        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-300 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Tên tài xế</th>
              <th className="px-3 py-2 text-left">SĐT</th>
              <th className="px-3 py-2 text-left">Biển số xe</th>
              <th className="px-3 py-2 text-left">Mã tài xế</th>
              <th className="px-3 py-2 text-right">BE đầu ngày</th>
              <th className="px-3 py-2 text-right">SM đầu ngày</th>
              <th className="px-3 py-2 text-right">% tài xế</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {drivers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-slate-400">
                  Chưa có tài xế nào
                </td>
              </tr>
            )}

            {drivers.map((d) => (
              <tr
                key={d.id}
                className="border-t border-slate-800 hover:bg-slate-800/40"
              >
                <td className="px-3 py-2">{d.full_name}</td>
                <td className="px-3 py-2">{d.phone}</td>
                <td className="px-3 py-2">{d.car_plate}</td>
                <td className="px-3 py-2">{d.driver_id}</td>
                <td className="px-3 py-2 text-right">{d.be_wallet_init}</td>
                <td className="px-3 py-2 text-right">{d.sm_wallet_init}</td>
                <td className="px-3 py-2 text-right">{d.driver_share}%</td>

                <td className="px-3 py-2 flex justify-end gap-2">
                  <button
                    className="p-2 bg-slate-700 rounded hover:bg-slate-600"
                    onClick={() => openEditModal(d)}
                  >
                    <HiPencil />
                  </button>

                  <button
                    className="p-2 bg-red-700 rounded hover:bg-red-600"
                    onClick={() => deleteDriver(d.id)}
                  >
                    <HiTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============================
           MOBILE CARDS (< md)
      ============================ */}
      <div className="md:hidden space-y-4 mt-4">
        {drivers.map((d) => (
          <div
            key={d.id}
            className="bg-slate-800/80 p-4 rounded-xl border border-slate-700"
          >
            <div className="font-semibold text-lg">{d.full_name}</div>
            <div className="text-sm text-slate-300">
              <b>SĐT:</b> {d.phone}
            </div>

            <div className="text-sm text-slate-300">
              <b>Biển số:</b> {d.car_plate}
            </div>

            <div className="text-sm text-slate-300">
              <b>Mã tài xế:</b> {d.driver_id}
            </div>

            <div className="text-sm text-slate-300">
              <b>BE:</b> {d.be_wallet_init} • <b>SM:</b> {d.sm_wallet_init}
            </div>

            <div className="text-sm text-slate-300 mb-3">
              <b>% tài xế:</b> {d.driver_share}%
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => openEditModal(d)}
                className="px-3 py-2 bg-slate-700 rounded flex items-center gap-1"
              >
                <HiPencil /> Sửa
              </button>

              <button
                onClick={() => deleteDriver(d.id)}
                className="px-3 py-2 bg-red-700 rounded flex items-center gap-1"
              >
                <HiTrash /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ============================
           MODAL ADD / EDIT
      ============================ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1500] px-3">
          <div className="bg-slate-800 w-full max-w-md p-6 rounded-xl border border-slate-600">
            <h2 className="text-xl font-bold mb-4">
              {editMode ? "Sửa tài xế taxi" : "Thêm tài xế taxi"}
            </h2>

            <div className="space-y-3">
              <Field
                label="Tên tài xế"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
              />

              <Field
                label="Số điện thoại"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />

              <Field
                label="Biển số xe"
                value={form.car_plate}
                onChange={(v) => setForm({ ...form, car_plate: v })}
              />

              <Field
                label="Mã tài xế / CCCD (driver_id)"
                placeholder="Ví dụ: 079123456789"
                value={form.driver_id}
                onChange={(v) => setForm({ ...form, driver_id: v })}
              />

              <Field
                label="Ví BE đầu ngày"
                type="number"
                value={form.be_wallet_init}
                onChange={(v) => setForm({ ...form, be_wallet_init: v })}
              />

              <Field
                label="Ví SM đầu ngày"
                type="number"
                value={form.sm_wallet_init}
                onChange={(v) => setForm({ ...form, sm_wallet_init: v })}
              />

              <Field
                label="% tài xế nhận"
                type="number"
                placeholder="Ví dụ: 50"
                value={form.driver_share}
                onChange={(v) => setForm({ ...form, driver_share: v })}
              />

              <Field
                label="Ghi chú"
                type="text"
                value={form.note}
                onChange={(v) => setForm({ ...form, note: v })}
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="px-4 py-2 bg-slate-600 rounded"
                onClick={() => setModalOpen(false)}
              >
                Hủy
              </button>

              <button
                className="px-4 py-2 bg-blue-600 rounded"
                onClick={handleSave}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------
          TOAST
      ------------------------- */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg text-white z-[2000]
          ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
