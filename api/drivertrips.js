import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  const url = new URL(req.url);
  const driver_id = url.searchParams.get("driver_id");

  if (!driver_id) {
    return new Response(
      JSON.stringify({ error: "Missing driver_id" }),
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from("driver_assignments")
    .select(
      `
        id, status, driver_pay,
        bookings (
          id, full_name, phone, date, time, route,
          pickup_place, dropoff_place, total_price, car_type, note
        )
      `
    )
    .eq("driver_id", driver_id)
    .order("id", { ascending: true });

  return new Response(JSON.stringify(data ?? []), {
    headers: { "Content-Type": "application/json" }
  });
}
