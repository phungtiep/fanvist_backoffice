// src/pages/BookingsAdmin.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { HiTrash, HiPencil, HiPlus } from "react-icons/hi2";

/* =========================================================================
   MAIN COMPONENT — BOOKINGS ADMIN
=========================================================================== */

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

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [cars, setCars] = useState([]);

  // 👉 state cho popup confirm xoá
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    id: null,
  });

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  /* =========================================================================
     HELPERS
  ========================================================================= */

  function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
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
      driver_id: row.driver_id ?? "",
      vehicle_id: row.vehicle_id ?? "",
    };
  }

  function getRouteName(code) {
    const route = routes.find((r) => r.code === code);
    return route ? route.name : code;
  }

  function getCarName(code) {
    const car = cars.find((c) => c.code === code);
    return car ? car.name_vi : code;
  }

  /* =========================================================================
     LOADERS
  ========================================================================= */

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

    if (!error && data) {
      setBookings(
        [...data].sort((a, b) => {
          const d1 = new Date(a.date);
          const d2 = new Date(b.date);
          if (d1 - d2 !== 0) return d1 - d2;
          return (a.time || "").localeCompare(b.time || "");
        })
      );
    }
  }

  async function loadDrivers() {
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .order("full_name");
    setDrivers(data || []);
  }

  async function loadVehicles() {
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .order("plate_number");
    setVehicles(data || []);
  }

  async function loadRoutes() {
    const { data } = await supabase
      .from("routes")
      .select("code,name")
      .order("name");
    setRoutes(data || []);
  }

  async function loadCars() {
    const { data } = await supabase
      .from("cars")
      .select("id, code, name_vi, seat_count, base_price")
      .order("seat_count");
    setCars(data || []);
  }

  useEffect(() => {
    load();
  }, [search, fromDate, toDate]);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
    loadRoutes();
    loadCars();
  }, []);

  /* =========================================================================
     FIX SCROLL — LOCK BODY WHEN MODAL OPEN
  ========================================================================= */

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [modalOpen]);

  /* =========================================================================
     DELETE BOOKING (DÙNG POPUP CONFIRM)
  ========================================================================= */

  // Khi bấm nút xoá -> chỉ mở popup
  const askDelete = (id) => {
    setConfirmDelete({ show: true, id });
  };

  // Khi bấm "Xoá" trong popup
  const handleConfirmDelete = async () => {
    if (!confirmDelete.id) return;

    setLoadingDelete(true);

    const { error } = await supabase.rpc("delete_booking_cascade", {
      p_booking_id: confirmDelete.id,
    });

    setLoadingDelete(false);
    setConfirmDelete({ show: false, id: null });

    if (error) return showToast("Không thể xóa booking!", "error");

    showToast("Đã xóa booking!", "success");
    load();
  };

  /* =========================================================================
     SAVE (ADD / EDIT) — GIỮ NGUYÊN LOGIC CỦA BẠN
  ========================================================================= */

  const handleSave = async () => {
    if (!form) return;
    setLoadingSave(true);

    const payload = {
      ...form,
      driver_id: form.driver_id || null,
      vehicle_id: form.vehicle_id || null,
    };

    let error;
    if (modalMode === "add") {
      const res = await supabase.from("bookings").insert(payload);
      error = res.error;
    } else {
      const res = await supabase
        .from("bookings")
        .update(payload)
        .eq("id", form.id);
      error = res.error;
    }

    setLoadingSave(false);

    if (error) return showToast("Lưu thất bại!", "error");

    showToast("Lưu thành công!", "success");
    setModalOpen(false);
    load();
  };

  /* =========================================================================
     UI
  ========================================================================= */

  const grouped = groupByDate(bookings);

  return (
    <div className="p-6 text-slate-200 relative">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Quản lý Booking (30 ngày tới)
        </h1>
        <button
          className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2"
          onClick={() => {
            setForm(rowToForm({}));
            setModalMode("add");
            setModalOpen(true);
          }}
        >
          <HiPlus /> Thêm Booking
        </button>
      </div>

      {/* FILTER */}
      <div className="bg-slate-800/60 p-4 rounded-xl mb-6 border border-slate-700">
        <input
          placeholder="Tìm kiếm tên hoặc số điện thoại..."
          className="bg-slate-700 p-3 rounded-lg w-full mb-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className="bg-slate-700 p-3 rounded-lg"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="bg-slate-700 p-3 rounded-lg"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button
          className="w-full py-2 mt-3 bg-blue-600 rounded-lg"
          onClick={() => {
            setFromDate(defaultFrom);
            setToDate(defaultTo);
          }}
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
            openViewModal={(r) => {
              setForm(rowToForm(r));
              setModalMode("view");
              setModalOpen(true);
            }}
            openEditModal={(r) => {
              setForm(rowToForm(r));
              setModalMode("edit");
              setModalOpen(true);
            }}
            askDelete={askDelete}
            getRouteName={getRouteName}
            getCarName={getCarName}
          />
        ))}
      </div>

      {/* DESKTOP GRID */}
      <div className="hidden sm:block">
        {grouped.map(([date, items]) => (
          <div key={date} className="mb-10">
            <h2 className="text-xl font-bold mb-4">
              📅 {formatDateVN(date)}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setForm(rowToForm(b));
                    setModalMode("view");
                    setModalOpen(true);
                  }}
                  className="bg-[#1E2538] border border-slate-600/40 rounded-2xl p-5 shadow-lg
                    cursor-pointer hover:border-blue-500/50 hover:shadow-blue-900/30 transition-all"
                >
                  <div className="text-xl font-semibold text-white mb-1">
                    {b.full_name}
                  </div>

                  <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
                    <span>{getRouteName(b.route)}</span>
                    <span className="text-slate-500">•</span>
                    <span className="px-2 py-0.5 bg-slate-700/60 rounded-lg text-xs border border-slate-600 whitespace-nowrap">
                      {getCarName(b.car_type)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-400 mb-4">
                    <div>SĐT: {b.phone}</div>
                    <div>Giờ đi: {b.time}</div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-green-400 font-bold text-2xl">
                      {b.total_price.toLocaleString("vi-VN")} đ
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm(rowToForm(b));
                          setModalMode("edit");
                          setModalOpen(true);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-700 transition"
                      >
                        <HiPencil className="text-slate-200" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          askDelete(b.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-600/70 text-red-400 hover:text-white transition"
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

      {/* LOADING OVERLAY */}
      {(loadingPage || loadingDelete) && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[999]">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* MODAL VIEW / EDIT / ADD */}
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
          routes={routes}
          cars={cars}
        />
      )}

      {/* POPUP CONFIRM XOÁ BOOKING */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500]">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-[90%] max-w-sm">
            <h3 className="text-lg font-semibold mb-2 text-red-400">
              Xóa booking?
            </h3>
            <p className="text-sm text-slate-200 mb-4">
              Bạn có chắc chắn muốn xóa booking này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-slate-600 text-sm"
                onClick={() => setConfirmDelete({ show: false, id: null })}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-sm hover:bg-red-500"
                onClick={handleConfirmDelete}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   MOBILE ACCORDION
=========================================================================== */

function MobileAccordionDay({
  date,
  items,
  formatDateVN,
  openViewModal,
  openEditModal,
  askDelete,
  getRouteName,
  getCarName,
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
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-slate-500 transition"
            >
              <div className="font-semibold text-lg">{b.full_name}</div>

              <div className="text-slate-400 text-sm">
                {getRouteName(b.route)} • {getCarName(b.car_type)}
              </div>

              <div className="text-sm mt-2">
                <div>SĐT: {b.phone}</div>
                <div>Giờ đi: {b.time}</div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-green-400 font-bold">
                  {b.total_price.toLocaleString("vi-VN")} đ
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(b);
                    }}
                    className="p-2 rounded hover:bg-slate-700"
                  >
                    <HiPencil />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      askDelete(b.id);
                    }}
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

/* =========================================================================
   MODAL — VIEW / EDIT / ADD
=========================================================================== */

function ModalViewEdit({
  form,
  setForm,
  modalMode,
  setModalOpen,
  handleSave,
  loadingSave,
  drivers,
  vehicles,
  routes,
  cars,
}) {
  const readOnly = modalMode === "view";

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
      <div className="bg-[#1E293B] p-6 rounded-xl w-[520px] max-h-[85vh] overflow-y-auto border border-slate-700 relative">
        {loadingSave && (
          <div className="absolute inset-0 bg-black/40 flex justify-center items-center rounded-xl">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">
          {modalMode === "add"
            ? "Thêm Booking"
            : modalMode === "edit"
            ? "Sửa Booking"
            : "Chi tiết Booking"}
        </h2>

        <div className="space-y-3 text-sm">
          <Field
            label="Họ tên"
            readOnly={readOnly}
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <Field
            label="Số điện thoại"
            readOnly={readOnly}
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Field
            label="Email"
            readOnly={readOnly}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />

          <SelectField
            label="Tuyến đường"
            readOnly={readOnly}
            value={form.route}
            onChange={(v) => setForm({ ...form, route: v })}
            options={routes.map((r) => ({ value: r.code, label: r.name }))}
          />
          <SelectField
            label="Loại xe"
            readOnly={readOnly}
            value={form.car_type}
            onChange={(v) => setForm({ ...form, car_type: v })}
            options={cars.map((c) => ({ value: c.code, label: c.name_vi }))}
          />

          <Field
            label="Điểm đón"
            readOnly={readOnly}
            value={form.pickup_place}
            onChange={(v) => setForm({ ...form, pickup_place: v })}
          />
          <Field
            label="Điểm trả"
            readOnly={readOnly}
            value={form.dropoff_place}
            onChange={(v) => setForm({ ...form, dropoff_place: v })}
          />

          <InputDateTime
            label="Ngày đi"
            type="date"
            readOnly={readOnly}
            value={form.date}
            onChange={(v) => setForm({ ...form, date: v })}
          />
          <InputDateTime
            label="Giờ đi"
            type="time"
            readOnly={readOnly}
            value={form.time}
            onChange={(v) => setForm({ ...form, time: v })}
          />

          <InputDateTime
            label="Ngày về (khứ hồi)"
            type="date"
            readOnly={readOnly}
            value={form.return_date}
            onChange={(v) => setForm({ ...form, return_date: v })}
          />
          <InputDateTime
            label="Giờ về (khứ hồi)"
            type="time"
            readOnly={readOnly}
            value={form.return_time}
            onChange={(v) => setForm({ ...form, return_time: v })}
          />

          <SelectField
            label="Tài xế"
            readOnly={readOnly}
            value={form.driver_id}
            onChange={(v) => setForm({ ...form, driver_id: v })}
            options={drivers.map((d) => ({
              value: d.id,
              label: `${d.full_name} • ${d.phone}`,
            }))}
          />

          <SelectField
            label="Xe"
            readOnly={readOnly}
            value={form.vehicle_id}
            onChange={(v) => setForm({ ...form, vehicle_id: v })}
            options={vehicles.map((x) => ({
              value: x.id,
              label: x.plate_number,
            }))}
          />

          <Field
            label="Số người lớn"
            readOnly={readOnly}
            value={form.adult_count}
            onChange={(v) =>
              setForm({ ...form, adult_count: Number(v) || 0 })
            }
          />
          <Field
            label="Số trẻ em"
            readOnly={readOnly}
            value={form.child_count}
            onChange={(v) =>
              setForm({ ...form, child_count: Number(v) || 0 })
            }
          />

          <Field
            label="Tổng tiền"
            readOnly={readOnly}
            value={form.total_price}
            onChange={(v) =>
              setForm({ ...form, total_price: Number(v) || 0 })
            }
          />
          <Field
            label="Ghi chú"
            readOnly={readOnly}
            value={form.note}
            onChange={(v) => setForm({ ...form, note: v })}
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            className="px-4 py-2 bg-slate-600 rounded"
            onClick={() => setModalOpen(false)}
          >
            Đóng
          </button>
          {modalMode !== "view" && (
            <button
              className="px-4 py-2 bg-blue-600 rounded"
              onClick={handleSave}
            >
              Lưu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   FIELD COMPONENTS
=========================================================================== */

function Field({ label, readOnly, value, onChange }) {
  return (
    <div>
      <label className="text-xs mb-1 block">{label}</label>
      {readOnly ? (
        <div className="p-2 bg-slate-700 rounded">{value || "—"}</div>
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

function InputDateTime({ label, type, readOnly, value, onChange }) {
  return (
    <div>
      <label className="text-xs mb-1 block">{label}</label>
      {readOnly ? (
        <div className="p-2 bg-slate-700 rounded">{value || "—"}</div>
      ) : (
        <input
          type={type}
          className="w-full p-2 bg-slate-700 rounded"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function SelectField({ label, readOnly, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs mb-1 block">{label}</label>
      {readOnly ? (
        <div className="p-2 bg-slate-700 rounded">
          {options.find((o) => o.value === value)?.label || "—"}
        </div>
      ) : (
        <select
          className="w-full p-2 bg-slate-700 rounded"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Chọn —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
