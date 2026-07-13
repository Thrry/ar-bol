const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";
const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_OWNER_EMAIL = "contact@ar-bol.fr";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function listIdsFromEnv(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function contactLabel(source) {
  if (source === "order") return "Demande de commande";
  if (source === "waitlist") return "Liste d'attente";
  return "Nouveau contact";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendOwnerNotification(env, contact) {
  const ownerEmail = cleanText(env.ARBOL_OWNER_EMAIL, 254) || DEFAULT_OWNER_EMAIL;
  const ownerName = cleanText(env.ARBOL_OWNER_NAME, 80) || "Kevin Guiri Couderc";
  const senderEmail = cleanText(env.BREVO_SENDER_EMAIL, 254) || ownerEmail;
  const senderName = cleanText(env.BREVO_SENDER_NAME, 80) || "Ar-bol";
  const title = contactLabel(contact.source);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const lines = [
    ["Type", title],
    ["Email", contact.email],
    ["Nom", fullName || "-"],
    ["Composition", contact.variant || "-"],
  ];

  const htmlRows = lines.map(function ([label, value]) {
    return "<tr><th align=\"left\" style=\"padding:6px 12px 6px 0\">" + escapeHtml(label) + "</th><td style=\"padding:6px 0\">" + escapeHtml(value) + "</td></tr>";
  }).join("");

  const textContent = [
    "Nouvelle inscription Ar-bol",
    "",
    "Type : " + title,
    "Email : " + contact.email,
    "Nom : " + (fullName || "-"),
    "Composition : " + (contact.variant || "-"),
  ].join("\n");

  const response = await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: ownerEmail, name: ownerName }],
      replyTo: { email: contact.email, name: fullName || contact.email },
      subject: "Ar-bol - " + title,
      htmlContent: "<h1>Nouvelle inscription Ar-bol</h1><table>" + htmlRows + "</table>",
      textContent,
    }),
  });

  return response.ok;
}

export async function onRequestPost({ request, env }) {
  if (!env.BREVO_API_KEY) {
    return json({ ok: false, error: "missing_brevo_api_key" }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const email = cleanText(payload.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 422);
  }

  const firstName = cleanText(payload.firstName, 80);
  const lastName = cleanText(payload.lastName, 80);
  const source = cleanText(payload.source, 40) || "site";
  const variant = cleanText(payload.variant, 40);

  const attributes = {};
  if (firstName) attributes.FIRSTNAME = firstName;
  if (lastName) attributes.LASTNAME = lastName;

  const brevoPayload = {
    email,
    updateEnabled: true,
  };

  const listIds = listIdsFromEnv(env.BREVO_LIST_IDS);
  if (listIds.length) brevoPayload.listIds = listIds;
  if (Object.keys(attributes).length) brevoPayload.attributes = attributes;

  const response = await fetch(BREVO_CONTACTS_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(brevoPayload),
  });

  if (!response.ok) {
    let detail = null;
    try {
      const errorBody = await response.json();
      detail = errorBody.code || errorBody.message || null;
    } catch (error) {
      detail = response.statusText || null;
    }

    return json({ ok: false, error: "brevo_error", detail }, 502);
  }

  let notificationSent = false;
  try {
    notificationSent = await sendOwnerNotification(env, {
      email,
      firstName,
      lastName,
      source,
      variant,
    });
  } catch (error) {
    notificationSent = false;
  }

  return json({ ok: true, source, variant, notificationSent }, 200);
}
