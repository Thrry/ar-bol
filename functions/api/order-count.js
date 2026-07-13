const STRIPE_CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";
const DEFAULT_EDITION_SIZE = 50;
const DEFAULT_BASE_ORDERED = 15;
const MAX_PAGES = 20;

function json(body, status, cacheControl) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "no-store",
    },
  });
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function unixSince(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;
  return Math.floor(timestamp / 1000);
}

function csvValues(raw) {
  if (!raw) return new Set();
  return new Set(
    String(raw)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function stripeAuthHeader(secretKey) {
  return "Basic " + btoa(secretKey + ":");
}

function matchesArbolSession(session, paymentLinkIds) {
  if (paymentLinkIds.size > 0) {
    return paymentLinkIds.has(session.payment_link);
  }

  return typeof session.client_reference_id === "string"
    && session.client_reference_id.indexOf("arbol_") === 0;
}

async function fetchPaidCheckoutCount(env, since) {
  const paymentLinkIds = csvValues(env.STRIPE_PAYMENT_LINK_IDS);
  let count = 0;
  let startingAfter = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams();
    params.set("limit", "100");
    params.set("status", "complete");
    if (since) params.set("created[gte]", String(since));
    if (startingAfter) params.set("starting_after", startingAfter);

    const response = await fetch(STRIPE_CHECKOUT_SESSIONS_URL + "?" + params.toString(), {
      headers: {
        authorization: stripeAuthHeader(env.STRIPE_SECRET_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("stripe_error_" + response.status);
    }

    const body = await response.json();
    const sessions = Array.isArray(body.data) ? body.data : [];
    sessions.forEach((session) => {
      if (
        session
        && session.payment_status === "paid"
        && matchesArbolSession(session, paymentLinkIds)
      ) {
        count += 1;
      }
    });

    if (!body.has_more || sessions.length === 0) break;
    startingAfter = sessions[sessions.length - 1].id;
  }

  return count;
}

function payload(baseOrdered, stripePaid, editionSize, synced, detail) {
  const totalOrdered = Math.min(editionSize, baseOrdered + stripePaid);
  return {
    ok: true,
    synced,
    editionSize,
    baseOrdered,
    stripePaid,
    totalOrdered,
    available: Math.max(editionSize - totalOrdered, 0),
    detail: detail || null,
  };
}

export async function onRequestGet({ env }) {
  const editionSize = positiveInt(env.ARBOL_EDITION_SIZE, DEFAULT_EDITION_SIZE);
  const baseOrdered = Math.min(
    positiveInt(env.ARBOL_ORDER_BASE_COUNT, DEFAULT_BASE_ORDERED),
    editionSize,
  );
  const since = unixSince(env.ARBOL_STRIPE_COUNT_SINCE);

  if (!env.STRIPE_SECRET_KEY) {
    return json(
      payload(baseOrdered, 0, editionSize, false, "missing_stripe_secret_key"),
      200,
      "no-store",
    );
  }

  try {
    const stripePaid = await fetchPaidCheckoutCount(env, since);
    return json(
      payload(baseOrdered, stripePaid, editionSize, true),
      200,
      "public, max-age=60, s-maxage=300",
    );
  } catch (error) {
    return json(
      payload(baseOrdered, 0, editionSize, false, error.message || "stripe_error"),
      200,
      "no-store",
    );
  }
}
