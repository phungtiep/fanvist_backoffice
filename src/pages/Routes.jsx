import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RoutesAdmin() {
  const [routes, setRoutes] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const loadRoutes = async () => {
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setRoutes(data);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleChange = (id, field, value) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [field]: value === "" ? null : Number(value) } : r
      )
    );
  };

  const saveRoute = async (route) => {
    setSavingId(route.id);

    const { error } = await supabase
      .from("routes")
      .update({
        name: route.name,
        price_4: route.price_4,
        price_7: route.price_7,
        price_9: route.price_9,
        price_11: route.price_11,
        price_16: route.price_16,
        price_19: route.price_19,
        price_24: route.price_24,
        price_29: route.price_29,
        price_45: route.price_45,
        price_carnival: route.price_carnival,
        price_sedona: route.price_sedona,
      })
      .eq("id", route.id);

    setSavingId(null);
    if (!error) loadRoutes();
  };

  const priceFields = [
    "price_4",
    "price_7",
    "price_9",
    "price_11",
    "price_16",
    "price_19",
    "price_24",
    "price_29",
    "price_45",
    "price_carnival",
    "price_sedona",
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>Backoffice CMS – Quản lý tuyến & bảng giá</h1>

      <table border={1} cellPadding={6} style={{ width: "100%", marginTop: 16 }}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên tuyến</th>
            {priceFields.map((p) => (
              <th key={p}>{p}</th>
            ))}
            <th></th>
          </tr>
        </thead>

        <tbody>
          {routes.map((r) => (
            <tr key={r.id}>
              <td>{r.code}</td>
              <td>
                <input
                  value={r.name || ""}
                  onChange={(e) =>
                    setRoutes((prev) =>
                      prev.map((x) =>
                        x.id === r.id ? { ...x, name: e.target.value } : x
                      )
                    )
                  }
                />
              </td>

              {priceFields.map((field) => (
                <td key={field}>
                  <input
                    type="number"
                    value={r[field] ?? ""}
                    onChange={(e) => handleChange(r.id, field, e.target.value)}
                    style={{ width: 90 }}
                  />
                </td>
              ))}

              <td>
                <button onClick={() => saveRoute(r)} disabled={savingId === r.id}>
                  {savingId === r.id ? "Đang lưu..." : "Lưu"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
