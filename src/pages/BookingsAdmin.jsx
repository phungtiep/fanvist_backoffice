import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiTrash, HiPencil } from "react-icons/hi2";

export default function BookingsAdmin() {
  const today = new Date();
  const next = new Date();
  next.setDate(today.getDate() + 30);

  const defaultFrom = today.toISOString().split("T")[0];
  const defaultTo = next.toISOString().split("T")[0];

  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [form, setForm] = useState(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [toast, setToast] = useState(null);

  // ⭐ NEW: drivers + vehicles
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function groupByDate(list) {
    const groups = {};
    list.forEach((b) => {
      if (!groups[b.date]) groups[b.date] = [];
      groups[b.date].push(b);
    });
    return Object.entries(groups);
  }

  function rowToForm(row) {
    return {
      id: row.id,
      full_name: row.full_name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      route: row.route ?? "",
      car_type: row.car_type ?? "",
      pickup_place: row.pickup_place ?? "",
      dropoff_place: row.dropoff_place ?? "",
      date: row.date ?? "",
      time: row.time ?? "",
      round_trip: row.round_trip ?? false,
      return_date: row.return_date ?? "",
      return_time: row.return_time ?? "",
      note: row.note ?? "",
      adult_count: row.adult_count ?? 0,
      child_count: row.child_count ?? 0,
      total_price: row.total_price ?? 0,

      // ⭐ NEW – map vào form
      driver_id: row.driver_id ?? "",
      vehicle_id: row.vehicle_id ?? "",
    };
  }

  async function load() {
    setLoadingPage(true);

    let query = supabase.from("bookings").select("*");

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    query = query.gte("date", fromDate).lte("date", toDate);

    const { data, error } = await query;
    setLoadingPage(false);

    if (error) return;
    if (!data) return;

    setBookings(
      [...data].sort((a, b) => {
        const d1 = new Date(a.date);
        const d2 = new Date(b.date);
        if (d1.getTime() !== d2.getTime()) return d1 - d2;
        return (a.time || "").localeCompare(b.time || "");
      })
    );
  }

  // ⭐ NEW: load drivers + vehicles
  async function loadDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("full_name");
    setDrivers(data || []);
  }

  async function loadVehicles() {
    const { data } = await supabase.from("vehicles").select("*").order("plate_number");
    setVehicles(data || []);
  }

  useEffect(() => {
    load();
  }, [search, fromDate, toDate]);

  // ⭐ load drivers + vehicles khi vào trang
  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("rt-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const b = payload.new;
          if (b.date >= fromDate && b.date <= toDate) {
            setBookings((prev) =>
              [...prev, b].sort((a, b) => {
                const d1 = new Date(a.date);
                const d2 = new Date(b.date);
                if (d1 !== d2) return d1 - d2;
                return (a.time || "").localeCompare(b.time || "");
              })
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fromDate, toDate]);

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa booking?")) return;

    setLoadingDelete(true);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    setLoadingDelete(false);

    if (error) {
      showToast("Không thể xóa booking!", "error");
      return;
    }

    showToast("Đã xóa booking!", "success");
    load();
  };

  const openViewModal = (row) => {
    setForm(rowToForm(row));
    setModalMode("view");
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setForm(rowToForm(row));
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form) return;

    setLoadingSave(true);

    const payload = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      route: form.route,
      car_type: form.car_type,
      pickup_place: form.pickup_place,
      dropoff_place: form.dropoff_place,
      date: form.date,
      time: form.time,
      round_trip: form.round_trip,
      return_date: form.return_date,
      return_time: form.return_time,
      note: form.note,
      adult_count: form.adult_count,
      child_count: form.child_count,
      total_price: form.total_price,

      // ⭐ NEW – save driver + vehicle
      driver_id: form.driver_id || null,
      vehicle_id: form.vehicle_id || null,
    };

    const { error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", form.id);

    setLoadingSave(false);

    if (error) {
      showToast("Lưu thất bại!", "error");
      return;
    }

    showToast("Lưu thành công!", "success");
    setModalOpen(false);
    setForm(null);
    load();
  };

  const grouped = groupByDate(bookings);

  /* ------------------------------------------------------------
      UI – filter, accordion, desktop grid, modal giữ nguyên
  ------------------------------------------------------------ */

  return (
    <div className="p-6 text-slate-200 relative">

      <h1 className="text-2xl font-bold mb-6">Quản lý Booking (30 ngày tới)</h1>

      {/* FILTER CARD — như cũ */}
      <div className="bg-slate-800/60 p-4 rounded-xl mb-6 shadow-lg border border-slate-700">
        <label className="text-xs text-slate-400 mb-1 block">Tìm kiếm</label>
        <input
          placeholder="Nhập tên hoặc số điện thoại..."
          className="bg-slate-700 p-3 rounded-lg w-full mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <label className="text-xs text-slate-400 mb-1 block">Từ ngày</label>
        <input
          type="date"
          className="bg-slate-700 p-3 rounded-lg w-full mb-4"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <label className="text-xs text-slate-400 mb-1 block">Đến ngày</label>
        <input
          type="date"
          className="bg-slate-700 p-3 rounded-lg w-full mb-4"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <button
          onClick={() => {
            setFromDate(defaultFrom);
            setToDate(defaultTo);
          }}
          className="w-full py-2 bg-blue-600 rounded-lg font-medium"
        >
          30 ngày tới
        </button>
      </div>

      {/* MOBILE ACCORDION */}
      <div className="sm:hidden space-y-4">
        {grouped.map(([date, items]) => (
          <MobileAccordionDay
            key={date}
            date={date}
            items={items}
            formatDateVN={formatDateVN}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            handleDelete={handleDelete}
          />
        ))}
      </div>

      {/* DESKTOP GRID */}
      <div className="hidden sm:block">
        {grouped.map(([date, items]) => (
          <div key={date} className="mb-10">
            <h2 className="text-xl font-bold mb-4">📅 {formatDateVN(date)}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((b) => (
                <div
                  key={b.id}
                  onClick={() => openViewModal(b)}
                  className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow cursor-pointer hover:border-slate-500 transition"
                >
                  <div className="font-semibold text-lg">{b.full_name}</div>
                  <div className="text-slate-400 text-sm">
                    {b.route} • {b.car_type}
                  </div>

                  <div className="mt-2 text-sm space-y-1">
                    <div><strong>SĐT:</strong> {b.phone}</div>
                    <div><strong>Giờ đi:</strong> {b.time}</div>
                    {b.round_trip && (
                      <div><strong>Khứ hồi:</strong> {b.return_date} • {b.return_time}</div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-green-400 font-bold text-lg">
                      {b.total_price.toLocaleString("vi-VN")} đ
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(b); }}
                        className="p-2 rounded hover:bg-slate-700"
                      >
                        <HiPencil />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                        className="p-2 rounded hover:bg-red-700 text-red-300 hover:text-white"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && form && (
        <ModalViewEdit
          form={form}
          setForm={setForm}
          modalMode={modalMode}
          setModalOpen={setModalOpen}
          handleSave={handleSave}
          loadingSave={loadingSave}
          drivers={drivers}
          vehicles={vehicles}
        />
      )}

      {(loadingPage || loadingDelete) && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[999]">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

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

/* ------------------------------------------------------------
   MOBILE ACCORDION — giữ nguyên như bạn đã có
------------------------------------------------------------ */
function MobileAccordionDay({
  date,
  items,
  formatDateVN,
  openViewModal,
  openEditModal,
  handleDelete
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-4 py-3 bg-slate-800 text-left font-semibold"
      >
        <span>📅 {formatDateVN(date)}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3 bg-slate-900">
          {items.map((b) => (
            <div
              key={b.id}
              onClick={() => openViewModal(b)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow cursor-pointer hover:border-slate-500 transition"
            >
              <div className="font-semibold text-lg">{b.full_name}</div>
              <div className="text-slate-400 text-sm">
                {b.route} • {b.car_type}
              </div>

              <div className="mt-2 text-sm space-y-1">
                <div><strong>SĐT:</strong> {b.phone}</div>
                <div><strong>Giờ đi:</strong> {b.time}</div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-green-400 font-bold text-lg">
                  {b.total_price.toLocaleString("vi-VN")} đ
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(b); }}
                    className="p-2 rounded hover:bg-slate-700"
                  >
                    <HiPencil />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                    className="p-2 rounded hover:bg-red-700 text-red-300 hover:text-white"
                  >
                    <HiTrash />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   MODAL VIEW / EDIT – thêm chọn tài xế + xe
------------------------------------------------------------ */
function ModalViewEdit({
  form,
  setForm,
  modalMode,
  setModalOpen,
  handleSave,
  loadingSave,
  drivers,
  vehicles
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="relative bg-[#1E293B] p-6 rounded-lg w-[480px] max-h-[80vh] overflow-y-auto">

        {loadingSave && (
          <div className="absolute inset-0 bg-black/40 flex justify-center items-center rounded-lg z-[60]">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">
          {modalMode === "view" ? "Chi tiết Booking" : "Sửa Booking"}
        </h2>

        <div className="space-y-3 text-sm">
          {/* Các field cũ giữ nguyên */}
          <Field label="Họ tên" readOnly={modalMode==="view"} value={form.full_name} onChange={v=>setForm({...form,full_name:v})}/>
          <Field label="Số điện thoại" readOnly={modalMode==="view"} value={form.phone} onChange={v=>setForm({...form,phone:v})}/>
          <Field label="Email" readOnly={modalMode==="view"} value={form.email} onChange={v=>setForm({...form,email:v})}/>
          <Field label="Tuyến đường" readOnly={modalMode==="view"} value={form.route} onChange={v=>setForm({...form,route:v})}/>
          <Field label="Loại xe" readOnly={modalMode==="view"} value={form.car_type} onChange={v=>setForm({...form,car_type:v})}/>
          <Field label="Điểm đón" readOnly={modalMode==="view"} value={form.pickup_place} onChange={v=>setForm({...form,pickup_place:v})}/>
          <Field label="Điểm trả" readOnly={modalMode==="view"} value={form.dropoff_place} onChange={v=>setForm({...form,dropoff_place:v})}/>
          <Field label="Ngày đi" readOnly={modalMode==="view"} value={form.date} onChange={v=>setForm({...form,date:v})}/>
          <Field label="Giờ đi" readOnly={modalMode==="view"} value={form.time} onChange={v=>setForm({...form,time:v})}/>

          {/* ⭐⭐⭐ NEW — chọn tài xế */}
          <div>
            <div className="text-xs mb-1">Tài xế</div>
            {modalMode === "view" ? (
              <div className="p-2 bg-slate-700 rounded">
                {drivers.find(d => d.id === form.driver_id)?.full_name || "—"}
              </div>
            ) : (
              <select
                className="p-2 w-full bg-slate-700 rounded"
                value={form.driver_id || ""}
                onChange={(e)=>setForm({...form, driver_id: e.target.value })}
              >
                <option value="">— Chưa chọn —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ⭐⭐⭐ NEW — chọn xe */}
          <div>
            <div className="text-xs mb-1">Xe</div>
            {modalMode === "view" ? (
              <div className="p-2 bg-slate-700 rounded">
                {vehicles.find(v => v.id === form.vehicle_id)?.plate_number || "—"}
              </div>
            ) : (
              <select
                className="p-2 w-full bg-slate-700 rounded"
                value={form.vehicle_id || ""}
                onChange={(e)=>setForm({...form, vehicle_id: e.target.value })}
              >
                <option value="">— Chưa chọn —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} • {v.brand} {v.model}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* FIELD tiếp tục */}
          <Field label="Ngày về" readOnly={modalMode==="view"} value={form.return_date} onChange={v=>setForm({...form,return_date:v})}/>
          <Field label="Giờ về" readOnly={modalMode==="view"} value={form.return_time} onChange={v=>setForm({...form,return_time:v})}/>
          <Field label="Số người lớn" readOnly={modalMode==="view"} value={String(form.adult_count)} onChange={v=>setForm({...form,adult_count:Number(v)})}/>
          <Field label="Số trẻ em" readOnly={modalMode==="view"} value={String(form.child_count)} onChange={v=>setForm({...form,child_count:Number(v)})}/>
          <Field label="Tổng tiền" readOnly={modalMode==="view"} value={String(form.total_price)} onChange={v=>setForm({...form,total_price:Number(v)})}/>
          <Field label="Ghi chú" readOnly={modalMode==="view"} value={form.note} onChange={v=>setForm({...form,note:v})}/>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { setModalOpen(false); }}
            className="px-4 py-2 bg-slate-600 rounded"
          >
            Đóng
          </button>

          {modalMode === "edit" && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              Lưu
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

/* FIELD COMPONENT */
function Field({ label, readOnly, value, onChange }) {
  return (
    <div>
      <div className="text-xs mb-1">{label}</div>

      {readOnly ? (
        <div className="p-2 bg-slate-700 rounded min-h-[36px]">
          {value || "—"}
        </div>
      ) : (
        <input
          className="w-full p-2 bg-slate-700 rounded"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

