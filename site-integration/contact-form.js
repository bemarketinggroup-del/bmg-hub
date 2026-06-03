/*
 * BMG website integration.
 * Replace BMG_BACKEND_ENDPOINT with the Vercel URL after deploy.
 */

const BMG_BACKEND_ENDPOINT = "https://your-bmg-hub.vercel.app/api/leads";

async function sendBmgLead(data) {
  const response = await fetch(BMG_BACKEND_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      service: data.service,
      message: data.message,
      metadata: {
        page: window.location.href,
        userAgent: navigator.userAgent
      }
    })
  });

  if (!response.ok) {
    throw new Error("Impossibile inviare la richiesta");
  }

  return response.json();
}
