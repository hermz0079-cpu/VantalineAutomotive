const ALLOWED_FEES = new Set([39, 49, 59, 75, 95]);

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const secret = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishableKey) return response.status(503).json({ error: "Online payment is not connected yet." });

  try {
    const { amount, name, email, phone, address, postcode, preferredDate, job, details } = request.body || {};
    const fee = Number(amount);
    if (!ALLOWED_FEES.has(fee)) return response.status(400).json({ error: "Invalid call-out amount." });
    if (![name, email, phone, address, postcode, preferredDate, job, details].every(value => String(value || "").trim())) {
      return response.status(400).json({ error: "Complete all required booking details." });
    }

    const params = new URLSearchParams();
    params.set("amount", String(fee * 100));
    params.set("currency", "gbp");
    params.set("automatic_payment_methods[enabled]", "true");
    params.set("description", "Vantaline Plumbing call-out and initial assessment");
    params.set("receipt_email", String(email).trim());
    params.set("metadata[customer_name]", String(name).trim().slice(0, 500));
    params.set("metadata[phone]", String(phone).trim().slice(0, 500));
    params.set("metadata[address]", `${String(address).trim()}, ${String(postcode).trim().toUpperCase()}`.slice(0, 500));
    params.set("metadata[preferred_date]", String(preferredDate).trim().slice(0, 500));
    params.set("metadata[job]", String(job).trim().slice(0, 500));
    params.set("metadata[details]", String(details).trim().slice(0, 500));
    params.set("metadata[callout_fee]", `£${fee}`);

    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const intent = await stripeResponse.json();
    if (!stripeResponse.ok) return response.status(502).json({ error: intent.error?.message || "Payment could not be started." });
    return response.json({ clientSecret: intent.client_secret, publishableKey });
  } catch {
    return response.status(500).json({ error: "Payment could not be started. Please call us." });
  }
}
