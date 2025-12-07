import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    // Tạo Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    /* =======================================================
       Nếu gọi:  /api/routes?code=sg-mn
    ======================================================= */
    if (code) {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Route not found" }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ route: data }),
        { headers: { "Content-Type": "application/json" }}
      );
    }

    /* =======================================================
       Nếu gọi:  /api/routes
    ======================================================= */
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("active", true)
      .order("code", { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ routes: data }),
      { headers: { "Content-Type": "application/json" }}
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
