/* =========================================================
   Ar-bol V2 — interactions
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Langue ---------- */
  var saved = null;
  try { saved = localStorage.getItem("arbol-lang"); } catch (e) {}
  if (saved === "fr" || saved === "en") setLang(saved);
  function setLang(lang) {
    root.setAttribute("lang", lang);
    root.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-setlang]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-setlang") === lang);
    });
    try { localStorage.setItem("arbol-lang", lang); } catch (e) {}
  }
  document.querySelectorAll("[data-setlang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-setlang")); });
  });

  /* ---------- Révélations (état visible verrouillé par filet) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    root.classList.add("js");
    var pending = reveals.slice();
    var check = function () {
      if (!pending.length) return;
      var vh = window.innerHeight || root.clientHeight;
      var still = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i], r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > -40) reveal(el); else still.push(el);
      }
      pending = still;
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    window.addEventListener("load", check);
    check();
    setTimeout(check, 120); setTimeout(check, 450); setTimeout(check, 1000);
  }
  function reveal(el) {
    if (el.__rv) return; el.__rv = true;
    el.classList.add("in");
    setTimeout(function () {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
    }, 1250);
  }

  /* ---------- Trait qui se dessine ---------- */
  var rules = Array.prototype.slice.call(document.querySelectorAll("[data-draw]"));
  if (!reduce) rules.forEach(function (r) { r.style.transform = "scaleX(0)"; });
  function drawRules() {
    var vh = window.innerHeight;
    rules.forEach(function (r) {
      if (r.__drawn) return;
      var b = r.getBoundingClientRect();
      if (b.top < vh * 0.85) {
        r.__drawn = true;
        if (reduce) { r.style.transform = "none"; return; }
        var start = null, dur = 900;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          r.style.transform = "scaleX(" + e + ")";
          if (p < 1) requestAnimationFrame(step); else r.style.transform = "none";
        };
        requestAnimationFrame(step);
        setTimeout(function () { r.style.transform = "none"; }, dur + 400);
      }
    });
  }

  /* ---------- Scroll : progression, parallaxe, badge ---------- */
  var progress = document.getElementById("progress");
  var pars = Array.prototype.slice.call(document.querySelectorAll("[data-par]")).map(function (el) {
    return { host: el, target: el.querySelector(".par-inner") || el, speed: parseFloat(el.getAttribute("data-par")) || 0.08 };
  });
  var badge = document.getElementById("floatBadge");
  var reserveSec = document.getElementById("reserver");

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var st = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;
      var docH = document.documentElement.scrollHeight - vh;
      if (progress) progress.style.width = (docH > 0 ? (st / docH) * 100 : 0) + "%";

      if (!reduce) {
        var cy = vh / 2;
        for (var i = 0; i < pars.length; i++) {
          var p = pars[i], r = p.host.getBoundingClientRect();
          var off = (r.top + r.height / 2) - cy;
          p.target.style.transform = "translate3d(0," + (-off * p.speed).toFixed(1) + "px,0)";
        }
      }

      // badge : visible après le hero, masqué quand la commande est à l'écran
      if (badge) {
        var rs = reserveSec.getBoundingClientRect();
        var show = st > vh * 0.85 && rs.top > vh * 0.55;
        badge.classList.toggle("show", show);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", function () { onScroll(); drawRules(); }, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", function () { onScroll(); drawRules(); });
  onScroll(); drawRules();

  /* ---------- Commande / paiement ---------- */
  var state = { variant: null };
  var variantSlugs = { Unan: "unan", Daou: "daou", Tri: "tri", Pevar: "pevar" };
  var variantsBySlug = { unan: "Unan", daou: "Daou", tri: "Tri", pevar: "Pevar" };
  var apiMeta = document.querySelector('meta[name="chatweb-api-base"]');
  var chatwebApiBase = apiMeta ? apiMeta.getAttribute("content").replace(/\/$/, "") : "";
  var chatwebProduct = null;
  var chatwebProducts = {};
  var chatwebVariants = {};
  var chatwebShippingRule = null;
  var chatwebShopReady = false;
  var syncEditionFromProduct = function () {};
  var emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function langHtml(fr, en) {
    return '<span lang="fr">' + fr + '</span><span lang="en">' + en + '</span>';
  }
  function chatwebPost(path, payload) {
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function (key) { body.set(key, payload[key]); });
    return fetch(chatwebApiBase + path, {
      method: "POST",
      headers: { accept: "application/json" },
      body: body
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "chatweb_request_failed");
        return data;
      });
    });
  }
  function submitChatwebContact(email) {
    return chatwebPost("/newsletter-subscriptions", {
      "contact[email]": email,
      "contact[consent]": "1",
      website: ""
    });
  }
  function currentProduct() {
    if (!state.variant) return null;
    return chatwebProduct || chatwebProducts[variantSlugs[state.variant]] || null;
  }
  function currentVariant() {
    return state.variant ? chatwebVariants[variantSlugs[state.variant]] : null;
  }
  function formatMoney(amount, currency) {
    var locale = root.getAttribute("data-lang") === "en" ? "en-GB" : "fr-FR";
    return new Intl.NumberFormat(locale, { style: "currency", currency: (currency || "eur").toUpperCase(), maximumFractionDigits: 0 }).format(amount / 100);
  }
  function setShopMessage(fr, en, error) {
    if (!secureNote) return;
    secureNote.innerHTML = langHtml(fr, en);
    secureNote.classList.toggle("error", !!error);
  }
  function updateProductPrice() {
    var product = currentProduct();
    if (!product) return;
    var price = formatMoney(product.unit_amount, product.currency);
    var shopPrice = document.getElementById("shopPrice");
    var recapTotal = document.getElementById("recapTotal");
    if (shopPrice) shopPrice.textContent = price;
    if (recapTotal) recapTotal.textContent = price;
    if (payBtn) {
      var payFr = payBtn.querySelector('span[lang="fr"]');
      var payEn = payBtn.querySelector('span[lang="en"]');
      if (payFr) payFr.textContent = "Payer — " + new Intl.NumberFormat("fr-FR", { style: "currency", currency: product.currency.toUpperCase(), maximumFractionDigits: 0 }).format(product.unit_amount / 100);
      if (payEn) payEn.textContent = "Pay — " + new Intl.NumberFormat("en-GB", { style: "currency", currency: product.currency.toUpperCase(), maximumFractionDigits: 0 }).format(product.unit_amount / 100);
    }
  }
  var steps = document.querySelectorAll(".panel .step");
  var dots = document.querySelectorAll("#stepsInd .dot");
  function gotoStep(n) {
    steps.forEach(function (s) { s.classList.toggle("active", s.getAttribute("data-step") === String(n)); });
    dots.forEach(function (d) { var dn = parseInt(d.getAttribute("data-step"), 10); d.classList.toggle("active", dn === n); d.classList.toggle("done", dn < n); });
  }
  var varCards = document.querySelectorAll("#varChoices .var-card");
  var toStep2 = document.getElementById("toStep2");
  varCards.forEach(function (card) {
    card.addEventListener("click", function () {
      varCards.forEach(function (c) { c.classList.remove("sel"); });
      card.classList.add("sel");
      state.variant = card.getAttribute("data-var");
      updateProductPrice();
      toStep2.disabled = false;
    });
  });
  function fillRecap() {
    var rv = document.getElementById("recapVar");
    rv.innerHTML = state.variant ? '<span style="font-family:var(--serif);font-size:1.1rem">' + state.variant + "</span>" : "—";
  }
  var fName = document.getElementById("fName");
  var lName = document.getElementById("lName");
  var email = document.getElementById("email");
  var payBtn = document.getElementById("pay");
  var secureNote = document.querySelector(".secure-note");
  function validPay() {
    var okName = fName.value.trim().length > 0;
    var okEmail = emailRe.test(email.value.trim());
    payBtn.disabled = !(okName && okEmail && state.variant && currentProduct() && chatwebShippingRule && chatwebShopReady);
  }
  [fName, lName, email].forEach(function (inp) { inp.addEventListener("input", validPay); });

  document.querySelectorAll("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () { var n = parseInt(b.getAttribute("data-next"), 10); if (n === 2) { fillRecap(); validPay(); } gotoStep(n); });
  });
  document.querySelectorAll("[data-prev]").forEach(function (b) {
    b.addEventListener("click", function () { gotoStep(parseInt(b.getAttribute("data-prev"), 10)); });
  });
  payBtn.addEventListener("click", function () {
    if (payBtn.disabled) return;
    var product = currentProduct();
    var variant = currentVariant();
    var labels = payBtn.querySelectorAll("span[lang]");
    payBtn.disabled = true;
    labels.forEach(function (s) { s.dataset.orig = s.textContent; s.textContent = s.getAttribute("lang") === "fr" ? "Ouverture Stripe…" : "Opening Stripe…"; });
    try {
      sessionStorage.setItem("arbolPendingOrder", JSON.stringify({
        variant: state.variant
      }));
    } catch (e) {}
    var checkoutPayload = {
      "checkout[product_slug]": product.slug,
      "checkout[quantity]": "1",
      "checkout[customer_email]": email.value.trim(),
      "checkout[customer_name]": (fName.value.trim() + " " + lName.value.trim()).trim(),
      "checkout[shipping_rule_id]": String(chatwebShippingRule.id)
    };
    if (chatwebProduct && variant) checkoutPayload["checkout[variant_slug]"] = variant.slug;
    chatwebPost("/shop/checkout", checkoutPayload).then(function (data) {
      if (!data.checkout_url) throw new Error("checkout_url_missing");
      window.location.href = data.checkout_url;
    }).catch(function () {
      labels.forEach(function (s) { s.textContent = s.dataset.orig || s.textContent; });
      setShopMessage("Le paiement est momentanément indisponible. Réessayez dans un instant.", "Payment is temporarily unavailable. Please try again shortly.", true);
      validPay();
    });
  });
  document.getElementById("restart").addEventListener("click", function () {
    state = { variant: null };
    varCards.forEach(function (c) { c.classList.remove("sel"); });
    toStep2.disabled = true; payBtn.disabled = true;
    fName.value = ""; lName.value = ""; email.value = "";
    gotoStep(1);
  });
  (function restoreStripeReturn() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    var pending = {};
    try { pending = JSON.parse(sessionStorage.getItem("arbolPendingOrder") || "{}"); } catch (e) {}
    var variant = variantsBySlug[params.get("composition")] || pending.variant || "—";
    var confVar = document.getElementById("confVar");
    var confVarEn = document.getElementById("confVarEn");
    if (confVar) confVar.textContent = variant;
    if (confVarEn) confVarEn.textContent = variant;
    try { sessionStorage.removeItem("arbolPendingOrder"); } catch (e) {}
    gotoStep(3);
    if (reserveSec) reserveSec.scrollIntoView({ block: "start" });
  })();

  fetch(chatwebApiBase + "/shop", { headers: { accept: "application/json" } })
    .then(function (res) { if (!res.ok) throw new Error("shop_unavailable"); return res.json(); })
    .then(function (data) {
      var shop = data.shop || {};
      var products = shop.products || [];
      chatwebProducts = {};
      products.forEach(function (product) { chatwebProducts[product.slug] = product; });
      chatwebProduct = products.find(function (product) { return (product.variants || []).length > 0; }) || null;
      chatwebVariants = {};
      ((chatwebProduct && chatwebProduct.variants) || []).forEach(function (variant) {
        chatwebVariants[variant.slug] = variant;
      });
      varCards.forEach(function (card) {
        var slug = variantSlugs[card.getAttribute("data-var")];
        var variant = chatwebVariants[slug] || (chatwebProducts[slug] ? { slug: slug } : null);
        card.disabled = !variant;
        var image = card.querySelector("img");
        if (image && variant && variant.image_url) image.src = variant.image_url;
      });
      chatwebShippingRule = (shop.shipping_rules || [])[0] || null;
      chatwebShopReady = !!shop.checkout_available && !!chatwebShippingRule && varCards.length > 0 && Array.prototype.some.call(varCards, function (card) { return !card.disabled; });
      var displayProduct = chatwebProduct || products[0];
      if (displayProduct) {
        var shopPrice = document.getElementById("shopPrice");
        if (shopPrice) shopPrice.textContent = formatMoney(displayProduct.unit_amount, displayProduct.currency);
        syncEditionFromProduct(displayProduct);
      }
      if (chatwebShopReady) {
        setShopMessage("Paiement sécurisé par Stripe, géré par la boutique Ar-bol dans Chatweb.", "Secure Stripe payment managed by the Ar-bol shop in Chatweb.", false);
      } else {
        setShopMessage("La boutique est en cours d’activation.", "The shop is being activated.", true);
      }
      validPay();
    }).catch(function () {
      setShopMessage("La boutique est momentanément indisponible.", "The shop is temporarily unavailable.", true);
    });

  /* ---------- Édition : jauge de rareté ---------- */
  var tally = document.getElementById("tally");
  if (tally) {
    var editionSize = parseInt(tally.getAttribute("data-edition-size"), 10) || 50;
    var orderedCount = parseInt(tally.getAttribute("data-ordered-count"), 10) || 0;
    var orderedLabel = document.getElementById("orderedCount");
    var availableLabel = document.getElementById("availableCount");

    function clampCount(value) {
      var parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed)) return orderedCount;
      return Math.max(0, Math.min(parsed, editionSize));
    }

    function paintTally(count) {
      ticks.forEach(function (tick, index) {
        tick.classList.toggle("on", index < count);
      });
    }

    function setEditionCount(count) {
      orderedCount = clampCount(count);
      tally.setAttribute("data-ordered-count", String(orderedCount));
      if (orderedLabel) orderedLabel.textContent = String(orderedCount);
      if (availableLabel) availableLabel.textContent = String(Math.max(editionSize - orderedCount, 0));
      if (tallyDone) paintTally(orderedCount);
    }

    syncEditionFromProduct = function (product) {
      var stock = typeof product.stock_quantity === "number" ? product.stock_quantity : null;
      var sold = typeof product.sold_quantity === "number" ? product.sold_quantity : null;
      if (typeof product.edition_size === "number") editionSize = product.edition_size;
      else if (stock !== null && sold !== null) editionSize = stock + sold;
      if (stock !== null && sold === null) sold = Math.max(editionSize - stock, 0);
      if (sold !== null) {
        tally.setAttribute("data-edition-size", String(editionSize));
        setEditionCount(sold);
      }
    };

    for (var ti = 0; ti < editionSize; ti++) tally.appendChild(document.createElement("i"));
    var ticks = tally.querySelectorAll("i");
    var tallyDone = false;
    var fillTally = function () {
      if (tallyDone) return;
      var r = tally.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.85 && r.bottom > 0) {
        tallyDone = true;
        if (reduce) { paintTally(orderedCount); return; }
        for (var i = 0; i < orderedCount; i++) {
          (function (k) { setTimeout(function () { ticks[k].classList.add("on"); }, 150 + k * 60); })(i);
        }
      }
    };
    window.addEventListener("scroll", fillTally, { passive: true });
    window.addEventListener("load", fillTally);
    fillTally(); setTimeout(fillTally, 300); setTimeout(fillTally, 900);
  }

  /* ---------- Liste d'attente ---------- */
  var wlForm = document.getElementById("wlForm");
  if (wlForm) {
    wlForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = document.getElementById("wlEmail");
      var consent = document.getElementById("wlConsent");
      var done = document.getElementById("wlDone");
      var btn = wlForm.querySelector("button[type='submit']");
      var ok = emailRe.test(inp.value.trim());
      if (!ok) { inp.focus(); inp.style.borderColor = "#b66"; return; }
      if (!consent.checked) { consent.focus(); return; }
      inp.style.borderColor = "";
      btn.disabled = true;
      done.innerHTML = langHtml("Enregistrement…", "Saving…");
      submitChatwebContact(inp.value.trim()).then(function () {
        wlForm.style.display = "none";
        done.innerHTML = langHtml("Merci — confirmez maintenant votre inscription par email.", "Thank you — now confirm your subscription by email.");
      }).catch(function () {
        btn.disabled = false;
        inp.focus();
        inp.style.borderColor = "#b66";
        done.innerHTML = langHtml("Impossible d'enregistrer cet email pour le moment.", "This email could not be saved right now.");
      });
    });
  }

  /* ---------- Repli gracieux des images ---------- */
  function guardSlots() {
    document.querySelectorAll("image-slot[src]").forEach(function (slot) {
      if (slot.__guarded || !slot.shadowRoot) return;
      var img = slot.shadowRoot.querySelector("img");
      if (!img) return;
      slot.__guarded = true;
      var drop = function () {
        if ((slot.getAttribute("src") || "").indexOf("data:") === 0) return;
        slot.removeAttribute("src");
      };
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) drop();
      img.addEventListener("error", drop);
    });
  }
  window.addEventListener("load", guardSlots);
  setTimeout(guardSlots, 600);
  setTimeout(guardSlots, 2500);
})();
