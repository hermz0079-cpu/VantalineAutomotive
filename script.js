let estimate = null;
let stripe = null;
let elements = null;

const showError = (id, message) => {
  const node = document.getElementById(id);
  node.textContent = message;
  node.hidden = !message;
};

document.getElementById("estimate-form").addEventListener("submit", async event => {
  event.preventDefault();
  showError("estimate-error", "");
  document.getElementById("booking").hidden = true;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Calculating…";
  try {
    const job = document.getElementById("job").value;
    const postcode = document.getElementById("postcode").value;
    const response = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, postcode })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    estimate = { ...data, job };
    document.getElementById("job-label").textContent = data.jobLabel;
    document.getElementById("miles").textContent = `Approx. ${data.miles} miles`;
    document.getElementById("guide").textContent = data.guide || "Quoted after inspection";
    document.getElementById("fee").textContent = `£${data.callout}`;
    document.getElementById("booking").hidden = false;
    document.getElementById("booking").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showError("estimate-error", error.message || "Unable to calculate the call-out.");
  } finally {
    button.disabled = false;
    button.textContent = "Get my call-out price";
  }
});

document.getElementById("booking-form").addEventListener("submit", async event => {
  event.preventDefault();
  showError("booking-error", "");
  const button = document.getElementById("start-payment");
  button.disabled = true;
  button.querySelector("span").textContent = "Preparing secure payment…";
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const response = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        amount: estimate.callout,
        postcode: estimate.postcode,
        job: estimate.jobLabel
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    stripe = Stripe(data.publishableKey);
    elements = stripe.elements({
      clientSecret: data.clientSecret,
      appearance: { theme: "stripe", variables: { colorPrimary: "#153f34", borderRadius: "0px" } }
    });
    elements.create("payment", { layout: "tabs" }).mount("#payment-element");
    document.getElementById("booking-form").hidden = true;
    document.getElementById("payment-form").hidden = false;
    document.getElementById("pay-label").textContent = `Pay £${estimate.callout} call-out`;
  } catch (error) {
    showError("booking-error", error.message || "Unable to prepare payment.");
    button.disabled = false;
    button.querySelector("span").textContent = "Continue to secure payment";
  }
});

document.getElementById("payment-form").addEventListener("submit", async event => {
  event.preventDefault();
  showError("payment-error", "");
  const button = document.getElementById("pay-now");
  button.disabled = true;
  const result = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: `${window.location.origin}/success.html` },
    redirect: "if_required"
  });
  if (result.error) {
    showError("payment-error", result.error.message);
    button.disabled = false;
  } else {
    window.location.assign("/success.html");
  }
});
