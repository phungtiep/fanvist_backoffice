import dotenv from "dotenv";
dotenv.config();
export async function POST(req) {
    try {
        const body = await req.json();

        const webhookUrl = process.env.SEND_EMAIL_DRIVER_WEBHOOK_URL;
        if (!webhookUrl) {
            return new Response(JSON.stringify({ error: "Webhook URL not set" }), { status: 500 });
        }

        // Backend fetch -> KHÔNG bị CORS
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const result = await res.text();

        return new Response(JSON.stringify({ success: true, result }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
