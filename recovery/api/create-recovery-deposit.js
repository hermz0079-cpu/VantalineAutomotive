const DEPOSIT_PENCE = 5000;
const SERVICES = new Set([
  "Recovery / towing",
  "Jump start",
  "Accident / winch recovery",
  "Vehicle pull-out / winch-out",
  "Tyre assistance",
  "Fuel delivery",
  "Scheduled vehicle transport",
  "Motorcycle recovery"
]);
const ALLOWED_ORIGINS = new Set([
  "https://www.vantalineautomotive.co.uk",
  "https://vantalineautomotive.co.uk"
]);

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

const setCors = (request, response) => {
  const origin = request.headers?.origin;
  if (ALLOWED_ORIGINS.has(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
};

export default async function handler(request, response) {
  setCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishableKey) {
    return response.status(503).json({ error: "Secure payment is not connected yet. Please call us." });
  }

  try {
    const body = request.body || {};
    const name = clean(body.name);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const service = clean(body.service);
    const registration = clean(body.registration, 30).toUpperCase();
    const pickup = clean(body.pickup);
    const destination = clean(body.destination);
    const agreedDateTime = clean(body.agreedDateTime, 80);
    const agreedQuote = Number(body.agreedQuote);
    const quoteReference = clean(body.quoteReference, 120);
    const notes = clean(body.notes);
    const bookingToken = clean(body.bookingToken, 100);

    if (![name, email, phone, service, registration, pickup, agreedDateTime].every(Boolean)) {
      return response.status(400).json({ error: "Complete all required booking details." });
    }
    if (!SERVICES.has(service)) return response.status(400).json({ error: "Choose a valid recovery service." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ error: "Enter a valid email address." });
    if (phone.replace(/\D/g, "").length < 10) return response.status(400).json({ error: "Enter a valid mobile number." });
    if (!Number.isFinite(agreedQuote) || agreedQuote < 50 || agreedQuote > 10000) {
      return response.status(400).json({ error: "Enter the total price agreed with Vantaline Recovery." });
    }
    if (body.termsAccepted !== "yes") {
      return response.status(400).json({ error: "Confirm that the quote and availability were agreed before paying." });
    }
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(bookingToken)) {
      return response.status(400).json({ error: "Please refresh the page and try again." });
    }

    const params = new URLSearchParams();
    params.set("amount", String(DEPOSIT_PENCE));
    params.set("currency", "gbp");
    params.set("automatic_payment_methods[enabled]", "true");
    params.set("description", "Vantaline Recovery job booking deposit");
    params.set("receipt_email", email);
    params.set("metadata[booking_type]", "recovery_deposit");
    params.set("metadata[booking_token]", bookingToken);
    params.set("metadata[customer_name]", name);
    params.set("metadata[phone]", phone);
    params.set("metadata[service]", service);
    params.set("metadata[registration]", registration);
    params.set("metadata[pickup]", pickup);
    params.set("metadata[destination]", destination || "Not applicable");
    params.set("metadata[agreed_total]", `£${agreedQuote.toFixed(2)}`);
    params.set("metadata[agreed_datetime]", agreedDateTime);
    params.set("metadata[quote_reference]", quoteReference || "Not provided");
    params.set("metadata[notes]", notes || "None");
    params.set("metadata[deposit_amount]", "£50.00");
    params.set("metadata[deposit_terms]", "Credited against agreed recovery total");

    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `recovery-deposit-${bookingToken}`
      },
      body: params
    });
    const intent = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return response.status(502).json({ error: intent.error?.message || "Payment could not be started." });
    }

    return response.json({
      clientSecret: intent.client_secret,
      publishableKey,
      amount: 50
    });
  } catch (error) {
    console.error("Recovery deposit error", error);
    return response.status(500).json({ error: "Payment could not be started. Please call us." });
  }
}
