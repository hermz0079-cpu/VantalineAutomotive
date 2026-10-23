const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
const ALLOWED_ORIGINS = new Set([
  "https://www.vantalineautomotive.co.uk",
  "https://vantalineautomotive.co.uk"
]);

const setCors = (request, response) => {
  const origin = request.headers?.origin;
  if (ALLOWED_ORIGINS.has(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
};

const escapeHtml = value => clean(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export default async function handler(request, response) {
  setCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const bookingEmail = process.env.BOOKING_EMAIL;
  if (!stripeSecret || !resendKey || !bookingEmail) {
    return response.status(503).json({ error: "Booking notification is not connected yet." });
  }

  const paymentIntentId = clean(request.body?.paymentIntentId, 120);
  if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
    return response.status(400).json({ error: "Invalid payment reference." });
  }

  try {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`, {
      headers: { Authorization: `Bearer ${stripeSecret}` }
    });
    const intent = await stripeResponse.json();
    if (!stripeResponse.ok) return response.status(502).json({ error: "The payment could not be verified." });
    if (intent.status !== "succeeded") return response.status(409).json({ error: "The payment has not completed yet." });
    if (intent.amount_received < 5000 || intent.currency !== "gbp" || intent.metadata?.booking_type !== "recovery_deposit") {
      return response.status(400).json({ error: "This is not a valid Vantaline Recovery deposit." });
    }

    const metadata = intent.metadata || {};
    const rows = [
      ["Customer", metadata.customer_name],
      ["Mobile", metadata.phone],
      ["Email", intent.receipt_email],
      ["Service", metadata.service],
      ["Registration", metadata.registration],
      ["Pickup", metadata.pickup],
      ["Destination", metadata.destination],
      ["Agreed total", metadata.agreed_total],
      ["Agreed date/time", metadata.agreed_datetime],
      ["Quote reference", metadata.quote_reference],
      ["Notes", metadata.notes],
      ["Deposit paid", "£50.00"],
      ["Stripe payment", paymentIntentId]
    ];
    const table = rows.map(([label, value]) => `<tr><th style="padding:8px 12px;text-align:left;border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="padding:8px 12px;border-bottom:1px solid #ddd">${escapeHtml(value || "Not provided")}</td></tr>`).join("");

    const mailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `recovery-deposit-${paymentIntentId}`
      },
      body: JSON.stringify({
        from: "Vantaline Recovery Bookings <onboarding@resend.dev>",
        to: [bookingEmail],
        subject: `New £50 recovery deposit — ${clean(metadata.registration, 30) || "vehicle"}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:700px"><h1>New recovery booking deposit</h1><p>A verified £50 deposit has been paid. Contact the customer to confirm dispatch and the remaining balance.</p><table style="border-collapse:collapse;width:100%">${table}</table></div>`
      })
    });
    const mail = await mailResponse.json().catch(() => ({}));
    if (!mailResponse.ok) {
      console.error("Recovery deposit notification failed", mail);
      return response.status(502).json({ error: "Payment verified, but the booking alert could not be sent." });
    }
    return response.json({ notified: true });
  } catch (error) {
    console.error("Recovery deposit notification error", error);
    return response.status(500).json({ error: "The booking notification could not be completed." });
  }
}
