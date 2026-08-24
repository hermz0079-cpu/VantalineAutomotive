import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

const readRawBody = request => new Promise((resolve, reject) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(Buffer.from(chunk)));
  request.on("end", () => resolve(Buffer.concat(chunks)));
  request.on("error", reject);
});

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verifyRetellSignature = (payload, signatureHeader, secret) => {
  const match = String(signatureHeader || "").match(/v=(\d+),d=([a-f0-9]+)/i);
  if (!match) return false;

  const timestampText = match[1];
  const ageMs = Math.abs(Date.now() - Number(timestampText));
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload.toString("utf8") + timestampText)
    .digest("hex");

  return safeEqual(match[2], expected);
};

const displayValue = value => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "Not provided";
  return String(value);
};

const escapeHtml = value => displayValue(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const retellKey = process.env.RETELL_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const bookingEmail = process.env.BOOKING_EMAIL;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ||
    "Vantaline Plumbing Calls <notifications@vantalineautomotive.co.uk>";

  if (!retellKey || !resendKey || !bookingEmail) {
    return response.status(503).json({ error: "Call notifications are not configured" });
  }

  try {
    const rawBody = await readRawBody(request);
    const signature = request.headers["x-retell-signature"];

    if (!verifyRetellSignature(rawBody, signature, retellKey)) {
      return response.status(401).json({ error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    if (payload.event !== "call_analyzed") {
      return response.status(200).json({ received: true });
    }

    const call = payload.call || {};
    const analysis = call.call_analysis || {};
    const data = analysis.custom_analysis_data || {};
    const durationSeconds = Math.round((Number(call.duration_ms) || 0) / 1000);
    const urgent = data.active_leak === true ||
      /urgent|emergency|flood|burst/i.test(
        [data.urgency, data.issue_summary, analysis.call_summary].filter(Boolean).join(" ")
      );

    const rows = [
      ["Customer", data.customer_name],
      ["Callback number", data.callback_number || call.from_number],
      ["Service postcode", data.service_postcode],
      ["Service address", data.service_address],
      ["Issue", data.issue_summary],
      ["Active leak / flooding", data.active_leak],
      ["Urgency", data.urgency],
      ["Customer type", data.customer_status],
      ["Preferred visit", data.preferred_visit_time],
      ["Outcome", data.outcome],
      ["Access / parking notes", data.access_notes],
      ["Call summary", analysis.call_summary],
      ["Call successful", analysis.call_successful],
      ["Caller sentiment", analysis.user_sentiment],
      ["Call duration", durationSeconds ? `${durationSeconds} seconds` : null],
      ["Retell call ID", call.call_id]
    ];

    const htmlRows = rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px;border:1px solid #d9e1dd;font-weight:700;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:10px;border:1px solid #d9e1dd">${escapeHtml(value)}</td>
      </tr>`
    ).join("");

    const customer = displayValue(data.customer_name || call.from_number || "Unknown caller");
    const postcode = displayValue(data.service_postcode || "No postcode");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `retell-${call.call_id || crypto.randomUUID()}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [bookingEmail],
        subject: `${urgent ? "URGENT — " : ""}New missed-call plumbing lead — ${customer} — ${postcode}`,
        html: `<div style="font-family:Arial,sans-serif;color:#153f34;max-width:720px">
          <h1>${urgent ? "Urgent missed-call lead" : "New missed-call lead"}</h1>
          <p>Vantaline Plumbing's AI receptionist has completed a customer call.</p>
          <table style="border-collapse:collapse;width:100%">${htmlRows}</table>
          <p style="margin-top:20px;color:#52645e">Review the call in Retell and contact the customer to confirm availability and pricing.</p>
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
    console.error("Retell webhook error", error);
    return response.status(500).json({ error: "Webhook failed" });
  }
}
