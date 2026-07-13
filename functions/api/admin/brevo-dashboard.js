const BREVO_API_BASE = "https://api.brevo.com/v3";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function authToken(request) {
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken) return headerToken.trim();

  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();

  const url = new URL(request.url);
  return (url.searchParams.get("token") || "").trim();
}

function requireAdmin(request, env) {
  if (!env.ARBOL_ADMIN_TOKEN) return false;
  return authToken(request) === env.ARBOL_ADMIN_TOKEN;
}

async function brevoGet(env, path) {
  const response = await fetch(BREVO_API_BASE + path, {
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  return { ok: true, status: response.status, body };
}

async function handleAdminDashboard(request, env) {
  if (!requireAdmin(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.BREVO_API_KEY) {
    return json({ ok: false, error: "missing_brevo_api_key" }, 500);
  }

  const [events, contacts, senders, domains] = await Promise.all([
    brevoGet(env, "/smtp/statistics/events?limit=100&offset=0&sort=desc&days=7"),
    brevoGet(env, "/contacts?limit=50&offset=0&sort=desc"),
    brevoGet(env, "/senders"),
    brevoGet(env, "/senders/domains"),
  ]);

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    ownerEmail: env.ARBOL_OWNER_EMAIL || "contact@ar-bol.fr",
    senderEmail: env.BREVO_SENDER_EMAIL || "kevinguiricouderc@gmail.com",
    events: events.ok ? (events.body.events || []) : [],
    contacts: contacts.ok ? (contacts.body.contacts || []) : [],
    senders: senders.ok ? (senders.body.senders || []) : [],
    domains: domains.ok ? (domains.body.domains || []) : [],
    errors: {
      events: events.ok ? null : events.body,
      contacts: contacts.ok ? null : contacts.body,
      senders: senders.ok ? null : senders.body,
      domains: domains.ok ? null : domains.body,
    },
  }, 200);
}

export async function onRequestGet({ request, env }) {
  try {
    return await handleAdminDashboard(request, env);
  } catch (error) {
    return json({
      ok: false,
      error: "admin_dashboard_error",
      detail: error && error.message ? error.message : String(error),
    }, 500);
  }
}
