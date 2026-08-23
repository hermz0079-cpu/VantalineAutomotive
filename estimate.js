const BASE_POSTCODE = "HA9 8HE";

const JOBS = {
  "toilet-remove": ["Remove an existing toilet", "£80–£180"],
  "toilet-install": ["Install a toilet — like-for-like", "£180–£350"],
  "fridge-connect": ["Connect a plumbed fridge freezer", "£80–£180"],
  "washing-machine": ["Connect a washing machine", "£80–£160"],
  dishwasher: ["Connect a dishwasher", "£90–£180"],
  "tap-change": ["Replace a tap — like-for-like", "£100–£250"],
  "shower-head": ["Replace a shower head and hose", "£70–£140"],
  "mixer-shower": ["Replace an exposed mixer shower", "£180–£450"],
  "blocked-sink": ["Clear a blocked sink or basin", "£100–£250"],
  "blocked-toilet": ["Clear a blocked toilet", "£150–£350+"],
  "blocked-drain": ["Clear a simple accessible drain", "£150–£450+"],
  other: ["Other or complex plumbing problem", null]
};

async function coordinates(postcode) {
  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.result && { latitude: data.result.latitude, longitude: data.result.longitude };
}

function milesBetween(a, b) {
  const rad = value => value * Math.PI / 180;
  const lat = rad(b.latitude - a.latitude);
  const lon = rad(b.longitude - a.longitude);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(lon / 2) ** 2;
  return Math.ceil(3958.8 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 1.25);
}

function callout(miles) {
  if (miles <= 3) return 39;
  if (miles <= 6) return 49;
  if (miles <= 10) return 59;
  if (miles <= 15) return 75;
  if (miles <= 20) return 95;
  return null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  try {
    const { postcode, job } = request.body || {};
    if (!postcode || !JOBS[job]) return response.status(400).json({ error: "Enter your postcode and choose a job." });
    const [base, destination] = await Promise.all([coordinates(BASE_POSTCODE), coordinates(String(postcode).trim().toUpperCase())]);
    if (!base || !destination) return response.status(400).json({ error: "We could not recognise that postcode." });
    const miles = milesBetween(base, destination);
    const fee = callout(miles);
    if (!fee) return response.status(400).json({ error: "This postcode is outside our normal 20-mile area. Please call us." });
    return response.json({
      postcode: String(postcode).trim().toUpperCase(),
      miles,
      callout: fee,
      jobLabel: JOBS[job][0],
      guide: JOBS[job][1]
    });
  } catch {
    return response.status(500).json({ error: "We could not calculate the price. Please try again." });
  }
}
