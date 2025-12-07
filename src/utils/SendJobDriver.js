// /utils/sendWebhook.js
import dotenv from "dotenv";
dotenv.config();
export async function sendEmailToDriver(data) {
    const results = {};

    try {
        await fetch(process.env.SEND_EMAIL_DRIVER_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        results.webhook = "ok";
    } catch (err) {
        console.error("Webhook error:", err);
        results.webhook = "fail";
    }

    return results;
}
