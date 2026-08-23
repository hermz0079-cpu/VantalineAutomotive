import crypto from "node:crypto";

export const config = {
  api: { bodyParser: false }
};

const readRawBody = request => new Promise((resolve, reject) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(Buffer.from(chunk)));
  request.on("end", () => resolve(Buffer.concat(chunks)));
  request.on("error", reject);
});

const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verifyStripeSignature = (payload, signatureHeader, secret) => {
  const parts = String(signatureHeader || "").split(",");
  const timestamp = parts.find(part => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter(part => part.startsWith("v1=")).map(part => part.slice(3));
  if (!timestamp || !signatures.length) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload.toString("utf8")}`)
    .digest("hex");
  return signatures.some(signature => safeEqual(signature, expected));
};

const escapeHtml = value => String(value || "Not provided")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  const bookingEmail = process.env.BOOKING_EMAIL;
  if (!webhookSecret || !resendKey || !bookingEmail) {
    return response.status(503).json({ error: "Booking notifications are not configured" });
  }

  try {
    const rawBody = await readRawBody(request);
    if (!verifyStripeSignature(rawBody, request.headers["stripe-signature"], webhookSecret)) {
      return response.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.type !== "payment_intent.succeeded") return response.status(200).json({ received: true });

    const payment = event.data?.object || {};
    const meta = payment.metadata || {};
    const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" })
      .format((payment.amount_received || payment.amount || 0) / 100);
    const rows = [
      ["Customer", meta.customer_name],
      ["Phone", meta.phone],
      ["Email", payment.receipt_email],
      ["Address", meta.address],
      ["Job", meta.job],
      ["Preferred date", meta.preferred_date],
      ["Job details", meta.details],
      ["Call-out paid", meta.callout_fee || amount],
      ["Stripe payment ID", payment.id]
    ];
    const htmlRows = rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px;border:1px solid #d9e1dd;font-weight:700">${escapeHtml(label)}</td>
        <td style="padding:10px;border:1px solid #d9e1dd">${escapeHtml(value)}</td>
      </tr>`).join("");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `stripe-${event.id}`
      },
      body: JSON.stringify({
        from: "Vantaline Plumbing Bookings <onboarding@resend.dev>",
        to: [bookingEmail],
        subject: `New paid plumbing booking — ${amount} — ${meta.job || "Call-out"}`,
        html: `<div style="font-family:Arial,sans-serif;color:#153f34;max-width:680px">
          <h1>New paid plumbing booking</h1>
          <p>Stripe has confirmed the customer's call-out payment.</p>
          <table style="border-collapse:collapse;width:100%">${htmlRows}</table>
          <p style="margin-top:20px;color:#52645e">Open Stripe to verify or refund this payment.</p>
        </div>`
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Resend error", emailResponse.status, error);
      return response.status(502).json({ error: "Email delivery failed" });
    }

    return response.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error", error);
    return response.status(500).json({ error: "Webhook failed" });
  }
}
