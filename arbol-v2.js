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
  setLang(saved === "fr" || saved === "en" ? saved : (root.getAttribute("lang") === "en" ? "en" : "fr"));
  function setLang(lang) {
    root.setAttribute("lang", lang);
    root.setAttribute("data-lang", lang);
    document.querySelectorAll("[data-setlang]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-setlang") === lang);
    });
    document.querySelectorAll("#varChoices .var-card").forEach(function (card) {
      var name = (card.querySelector(".nm") || {}).textContent || card.getAttribute("data-variant-slug");
      var decrease = card.querySelector("[data-quantity-decrease]");
      var increase = card.querySelector("[data-quantity-increase]");
      var input = card.querySelector("[data-quantity]");
      if (decrease) decrease.setAttribute("aria-label", (lang === "fr" ? "Réduire la quantité de " : "Decrease quantity of ") + name);
      if (increase) increase.setAttribute("aria-label", (lang === "fr" ? "Augmenter la quantité de " : "Increase quantity of ") + name);
      if (input) input.setAttribute("aria-label", (lang === "fr" ? "Quantité de " : "Quantity of ") + name);
    });
    try { localStorage.setItem("arbol-lang", lang); } catch (e) {}
    if (state && currentProduct()) {
      updateProductPrice();
      renderShippingChoices();
    }
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
    if ("IntersectionObserver" in window) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -10% 0px" });
      reveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
      reveals.forEach(reveal);
    }
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
  function drawRule(r) {
    if (r.__drawn) return;
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
  if ("IntersectionObserver" in window) {
    var ruleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        drawRule(entry.target);
        ruleObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -15% 0px" });
    rules.forEach(function (r) { ruleObserver.observe(r); });
  } else {
    rules.forEach(drawRule);
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
      if (progress) progress.style.transform = "scaleX(" + (docH > 0 ? st / docH : 0) + ")";

      var parallaxEnabled = !reduce && window.innerWidth > 820 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (parallaxEnabled) {
        var cy = vh / 2;
        for (var i = 0; i < pars.length; i++) {
          var p = pars[i], r = p.host.getBoundingClientRect();
          var off = (r.top + r.height / 2) - cy;
          p.target.style.transform = "translate3d(0," + (-off * p.speed).toFixed(1) + "px,0)";
        }
      } else {
        for (var j = 0; j < pars.length; j++) pars[j].target.style.transform = "none";
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
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  onScroll();

  /* ---------- Commande / paiement ---------- */
  var state = { quantities: { unan: 0, daou: 0, tri: 0, pevar: 0 }, shippingRuleId: null };
  var maximumTotalQuantity = 20;
  var variantFallbackNames = { unan: "Unan", daou: "Daou", tri: "Tri", pevar: "Pevar" };
  var variantImageSources = {
    unan: "assets/photo-unan-noir-noir.webp",
    daou: "assets/photo-daou-noir-bois-clair.webp",
    tri: "assets/photo-tri-blanc-bois-clair.webp",
    pevar: "assets/photo-pevar-blanc-noir.webp"
  };
  var stripeReturnSlug = null;
  var apiMeta = document.querySelector('meta[name="chatweb-api-base"]');
  var chatwebApiBase = apiMeta ? apiMeta.getAttribute("content").replace(/\/$/, "") : "";
  var chatwebProduct = null;
  var chatwebProducts = {};
  var chatwebVariants = {};
  var chatwebShippingRules = [];
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
    if (chatwebProduct) return chatwebProduct;
    var selected = selectedItems()[0];
    return selected ? chatwebProducts[selected.slug] || null : null;
  }
  function totalQuantity() {
    return Object.keys(state.quantities).reduce(function (sum, slug) { return sum + (state.quantities[slug] || 0); }, 0);
  }
  function selectedItems() {
    return Object.keys(state.quantities).filter(function (slug) { return state.quantities[slug] > 0; }).map(function (slug) {
      var variant = chatwebVariants[slug];
      return {
        slug: slug,
        name: (variant && variant.name) || variantFallbackNames[slug] || slug,
        quantity: state.quantities[slug]
      };
    });
  }
  function currentShippingRule() {
    return chatwebShippingRules.find(function (rule) { return String(rule.id) === String(state.shippingRuleId); }) || null;
  }
  function orderSummary(items) {
    return (items || []).map(function (item) { return item.quantity + " × " + item.name; }).join(", ") || "—";
  }
  function setConfirmationSummary(items, fallbackName, fallbackQuantity) {
    var summary = orderSummary(items && items.length ? items : [ { name: fallbackName || "Ar-bol", quantity: fallbackQuantity || 1 } ]);
    var confSummary = document.getElementById("confSummary");
    var confSummaryEn = document.getElementById("confSummaryEn");
    if (confSummary) confSummary.textContent = summary;
    if (confSummaryEn) confSummaryEn.textContent = summary;
  }
  function setConfirmationDelivery(name, totalFr, totalEn) {
    var shippingFr = document.getElementById("confShipping");
    var shippingEn = document.getElementById("confShippingEn");
    var amountFr = document.getElementById("confTotal");
    var amountEn = document.getElementById("confTotalEn");
    if (shippingFr) shippingFr.textContent = name || "—";
    if (shippingEn) shippingEn.textContent = name || "—";
    if (amountFr) amountFr.textContent = totalFr || "—";
    if (amountEn) amountEn.textContent = totalEn || "—";
  }
  function formatMoneyForLocale(amount, currency, locale) {
    var hasCents = Math.abs(amount || 0) % 100 !== 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0
    }).format((amount || 0) / 100);
  }
  function formatMoney(amount, currency) {
    return formatMoneyForLocale(amount, currency, root.getAttribute("data-lang") === "en" ? "en-GB" : "fr-FR");
  }
  function shippingAmountFor(rule, product) {
    if (!rule || !product) return null;
    var subtotal = product.unit_amount * totalQuantity();
    if (rule.pickup || (typeof rule.free_over_amount === "number" && subtotal >= rule.free_over_amount)) return 0;
    return Number(rule.amount) || 0;
  }
  function currentSubtotalAmount() {
    var product = currentProduct();
    return product ? product.unit_amount * totalQuantity() : null;
  }
  function currentTotalAmount() {
    var product = currentProduct();
    if (!product) return null;
    var shippingAmount = shippingAmountFor(currentShippingRule(), product);
    var subtotal = currentSubtotalAmount();
    return shippingAmount === null ? subtotal : subtotal + shippingAmount;
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
    var subtotalAmount = currentSubtotalAmount();
    var subtotal = formatMoney(subtotalAmount, product.currency);
    var shippingRule = currentShippingRule();
    var shippingAmount = shippingAmountFor(shippingRule, product);
    var totalAmount = shippingAmount === null ? subtotalAmount : subtotalAmount + shippingAmount;
    var total = formatMoney(totalAmount, product.currency);
    var shopPrice = document.getElementById("shopPrice");
    var shopPayable = document.getElementById("shopPayable");
    var recapSubtotal = document.getElementById("recapSubtotal");
    var recapShippingPrice = document.getElementById("recapShippingPrice");
    var recapTotal = document.getElementById("recapTotal");
    if (shopPrice) shopPrice.textContent = price;
    if (shopPayable) shopPayable.textContent = subtotal;
    if (recapSubtotal) recapSubtotal.textContent = subtotal;
    if (recapShippingPrice) recapShippingPrice.textContent = shippingAmount === null ? "—" : formatMoney(shippingAmount, product.currency);
    if (recapTotal) recapTotal.textContent = shippingAmount === null ? "—" : total;
    if (payBtn) {
      var payFr = payBtn.querySelector('span[lang="fr"]');
      var payEn = payBtn.querySelector('span[lang="en"]');
      if (payFr) payFr.textContent = "Payer — " + formatMoneyForLocale(totalAmount, product.currency, "fr-FR");
      if (payEn) payEn.textContent = "Pay — " + formatMoneyForLocale(totalAmount, product.currency, "en-GB");
    }
  }
  var shippingChoices = document.getElementById("shippingChoices");
  var toStep3 = document.getElementById("toStep3");
  function shippingRuleMeta(rule, product) {
    if (rule.pickup) return langHtml("À convenir après fabrication", "Arranged after production");
    if (typeof rule.free_over_amount === "number") {
      return langHtml(
        "Offert dès " + formatMoneyForLocale(rule.free_over_amount, product.currency, "fr-FR"),
        "Free from " + formatMoneyForLocale(rule.free_over_amount, product.currency, "en-GB")
      );
    }
    return langHtml("Tarif ajouté au paiement", "Price added at payment");
  }
  function shippingRulePrice(rule, product) {
    var amount = shippingAmountFor(rule, product);
    if (amount === 0) return langHtml("Gratuit", "Free");
    return langHtml(
      formatMoneyForLocale(amount, product.currency, "fr-FR"),
      formatMoneyForLocale(amount, product.currency, "en-GB")
    );
  }
  function renderShippingChoices() {
    if (!shippingChoices) return;
    var product = currentProduct() || chatwebProduct || Object.keys(chatwebProducts).map(function (slug) { return chatwebProducts[slug]; })[0];
    shippingChoices.setAttribute("aria-busy", "false");
    shippingChoices.innerHTML = "";
    if (!product || chatwebShippingRules.length === 0) {
      shippingChoices.className = "shipping-state is-error";
      shippingChoices.innerHTML = langHtml(
        "Aucun mode de livraison n’est disponible pour le moment.",
        "No delivery method is currently available."
      );
      state.shippingRuleId = null;
      if (toStep3) toStep3.disabled = true;
      return;
    }
    if (!currentShippingRule()) state.shippingRuleId = null;
    shippingChoices.className = "shipping-choices";
    chatwebShippingRules.forEach(function (rule) {
      var option = document.createElement("label");
      option.className = "shipping-option";
      option.title = rule.name;

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "shipping_rule";
      input.value = String(rule.id);
      input.checked = String(rule.id) === String(state.shippingRuleId);
      input.setAttribute("aria-label", rule.name);

      var mark = document.createElement("span");
      mark.className = "shipping-option-mark";
      mark.setAttribute("aria-hidden", "true");

      var copy = document.createElement("span");
      copy.className = "shipping-option-copy";
      var name = document.createElement("strong");
      name.className = "shipping-option-name";
      name.textContent = rule.name;
      var meta = document.createElement("span");
      meta.className = "shipping-option-meta";
      meta.innerHTML = shippingRuleMeta(rule, product);
      copy.appendChild(name);
      copy.appendChild(meta);

      var price = document.createElement("span");
      price.className = "shipping-option-price";
      price.innerHTML = shippingRulePrice(rule, product);

      option.appendChild(input);
      option.appendChild(mark);
      option.appendChild(copy);
      option.appendChild(price);
      option.classList.toggle("sel", input.checked);
      input.addEventListener("change", function () {
        if (!input.checked) return;
        state.shippingRuleId = String(rule.id);
        shippingChoices.querySelectorAll(".shipping-option").forEach(function (item) { item.classList.remove("sel"); });
        option.classList.add("sel");
        if (toStep3) toStep3.disabled = false;
        updateProductPrice();
      });
      shippingChoices.appendChild(option);
    });
    if (toStep3) toStep3.disabled = !currentShippingRule();
  }
  var steps = document.querySelectorAll(".panel .step");
  var dots = document.querySelectorAll("#stepsInd .dot");
  function gotoStep(n) {
    steps.forEach(function (s) { s.classList.toggle("active", s.getAttribute("data-step") === String(n)); });
    dots.forEach(function (d) { var dn = parseInt(d.getAttribute("data-step"), 10); d.classList.toggle("active", dn === n); d.classList.toggle("done", dn < n); });
  }
  var varCards = document.querySelectorAll("#varChoices .var-card");
  var toStep2 = document.getElementById("toStep2");
  function syncQuantityControls() {
    var total = totalQuantity();
    var basketTotal = document.getElementById("basketTotal");
    var basketTotalEn = document.getElementById("basketTotalEn");
    if (basketTotal) basketTotal.textContent = String(total);
    if (basketTotalEn) basketTotalEn.textContent = String(total);
    varCards.forEach(function (card) {
      var slug = card.getAttribute("data-variant-slug");
      var available = card.getAttribute("data-available") !== "false";
      var quantity = state.quantities[slug] || 0;
      var input = card.querySelector("[data-quantity]");
      var decrease = card.querySelector("[data-quantity-decrease]");
      var increase = card.querySelector("[data-quantity-increase]");
      input.value = String(quantity);
      input.max = String(quantity + Math.max(0, maximumTotalQuantity - total));
      input.disabled = !available;
      decrease.disabled = !available || quantity <= 0;
      increase.disabled = !available || total >= maximumTotalQuantity;
      card.classList.toggle("sel", quantity > 0);
      card.classList.toggle("is-disabled", !available);
    });
    toStep2.disabled = total < 1 || !currentProduct();
  }
  function setVariantQuantity(slug, value) {
    var current = state.quantities[slug] || 0;
    var parsed = parseInt(value, 10);
    var allowed = current + Math.max(0, maximumTotalQuantity - totalQuantity());
    state.quantities[slug] = Math.max(0, Math.min(Number.isFinite(parsed) ? parsed : 0, allowed));
    syncQuantityControls();
    if (chatwebShippingRules.length > 0) renderShippingChoices();
    updateProductPrice();
    if (payBtn) validPay();
  }
  function setQuantityLimit(product) {
    var stock = Number(product && product.stock_quantity);
    maximumTotalQuantity = Math.max(1, Math.min(20, Number.isFinite(stock) ? stock : 20));
    var runningTotal = 0;
    Object.keys(state.quantities).forEach(function (slug) {
      state.quantities[slug] = Math.min(state.quantities[slug], Math.max(0, maximumTotalQuantity - runningTotal));
      runningTotal += state.quantities[slug];
    });
    var helpFr = document.querySelector('#quantityHelp [lang="fr"]');
    var helpEn = document.querySelector('#quantityHelp [lang="en"]');
    if (helpFr) helpFr.innerHTML = 'Choisissez la quantité de chaque modèle — <b id="basketTotal">' + totalQuantity() + '</b> sur ' + maximumTotalQuantity + ' exemplaires.';
    if (helpEn) helpEn.innerHTML = 'Choose a quantity for each model — <b id="basketTotalEn">' + totalQuantity() + '</b> of ' + maximumTotalQuantity + ' pieces.';
    syncQuantityControls();
  }
  varCards.forEach(function (card) {
    var slug = card.getAttribute("data-variant-slug");
    var input = card.querySelector("[data-quantity]");
    card.querySelector("[data-quantity-decrease]").addEventListener("click", function () { setVariantQuantity(slug, (state.quantities[slug] || 0) - 1); });
    card.querySelector("[data-quantity-increase]").addEventListener("click", function () { setVariantQuantity(slug, (state.quantities[slug] || 0) + 1); });
    input.addEventListener("input", function () {
      if (input.value !== "") setVariantQuantity(slug, input.value);
    });
    input.addEventListener("change", function () { setVariantQuantity(slug, input.value); });
  });
  syncQuantityControls();
  function fillRecap() {
    var rv = document.getElementById("recapVar");
    var shippingName = document.getElementById("recapShippingName");
    rv.textContent = "";
    selectedItems().forEach(function (item) {
      var line = document.createElement("span");
      line.textContent = item.quantity + " × " + item.name;
      rv.appendChild(line);
    });
    if (!rv.children.length) rv.textContent = "—";
    if (shippingName) shippingName.textContent = currentShippingRule() ? currentShippingRule().name : "—";
    updateProductPrice();
  }
  var fName = document.getElementById("fName");
  var lName = document.getElementById("lName");
  var email = document.getElementById("email");
  var payBtn = document.getElementById("pay");
  var secureNote = document.querySelector(".secure-note");
  function validPay() {
    var okName = fName.value.trim().length > 0;
    var okEmail = emailRe.test(email.value.trim());
    payBtn.disabled = !(okName && okEmail && totalQuantity() >= 1 && currentProduct() && currentShippingRule() && chatwebShopReady);
  }
  [fName, lName, email].forEach(function (inp) { inp.addEventListener("input", validPay); });

  document.querySelectorAll("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = parseInt(b.getAttribute("data-next"), 10);
      if (n === 3) { fillRecap(); validPay(); }
      gotoStep(n);
    });
  });
  document.querySelectorAll("[data-prev]").forEach(function (b) {
    b.addEventListener("click", function () { gotoStep(parseInt(b.getAttribute("data-prev"), 10)); });
  });
  payBtn.addEventListener("click", function () {
    if (payBtn.disabled) return;
    var product = currentProduct();
    var items = selectedItems();
    var shippingRule = currentShippingRule();
    var totalAmount = currentTotalAmount();
    var labels = payBtn.querySelectorAll("span[lang]");
    payBtn.disabled = true;
    labels.forEach(function (s) { s.dataset.orig = s.textContent; s.textContent = s.getAttribute("lang") === "fr" ? "Ouverture Stripe…" : "Opening Stripe…"; });
    try {
      sessionStorage.setItem("arbolPendingOrder", JSON.stringify({
        items: items,
        shipping_name: shippingRule.name,
        total_fr: formatMoneyForLocale(totalAmount, product.currency, "fr-FR"),
        total_en: formatMoneyForLocale(totalAmount, product.currency, "en-GB")
      }));
    } catch (e) {}
    var checkoutPayload = {
      "checkout[product_slug]": product.slug,
      "checkout[customer_email]": email.value.trim(),
      "checkout[customer_name]": (fName.value.trim() + " " + lName.value.trim()).trim(),
      "checkout[shipping_rule_id]": String(shippingRule.id)
    };
    items.forEach(function (item, index) {
      checkoutPayload["checkout[items][" + index + "][variant_slug]"] = item.slug;
      checkoutPayload["checkout[items][" + index + "][quantity]"] = String(item.quantity);
    });
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
    state = { quantities: { unan: 0, daou: 0, tri: 0, pevar: 0 }, shippingRuleId: null };
    if (shippingChoices) {
      shippingChoices.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = false; });
      shippingChoices.querySelectorAll(".shipping-option").forEach(function (option) { option.classList.remove("sel"); });
    }
    toStep2.disabled = true;
    if (toStep3) toStep3.disabled = true;
    payBtn.disabled = true;
    syncQuantityControls();
    updateProductPrice();
    fName.value = ""; lName.value = ""; email.value = "";
    gotoStep(1);
  });
  (function restoreStripeReturn() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    var pending = {};
    try { pending = JSON.parse(sessionStorage.getItem("arbolPendingOrder") || "{}"); } catch (e) {}
    stripeReturnSlug = params.get("composition") || pending.variant_slug || null;
    var variantName = pending.variant_name || variantFallbackNames[stripeReturnSlug] || pending.variant || "—";
    setConfirmationSummary(pending.items, variantName, pending.quantity);
    setConfirmationDelivery(pending.shipping_name, pending.total_fr, pending.total_en);
    try { sessionStorage.removeItem("arbolPendingOrder"); } catch (e) {}
    gotoStep(4);
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
      document.querySelectorAll(".vrow-name[data-variant-slug]").forEach(function (name) {
        var variant = chatwebVariants[name.getAttribute("data-variant-slug")];
        if (variant && variant.name) name.textContent = variant.name;
      });
      varCards.forEach(function (card) {
        var slug = card.getAttribute("data-variant-slug");
        var legacyProduct = chatwebProducts[slug];
        var variant = chatwebVariants[slug] || (legacyProduct ? { slug: slug, name: legacyProduct.name, image_url: legacyProduct.image_url } : null);
        card.setAttribute("data-available", variant ? "true" : "false");
        var name = card.querySelector(".nm");
        var image = card.querySelector("img");
        if (name && variant && variant.name) name.textContent = variant.name;
        if (image && variantImageSources[slug]) image.src = variantImageSources[slug];
        if (image && variant && variant.name) image.alt = variant.name;
      });
      chatwebShippingRules = shop.shipping_rules || [];
      renderShippingChoices();
      chatwebShopReady = !!shop.checkout_available && chatwebShippingRules.length > 0 && varCards.length > 0 && Array.prototype.some.call(varCards, function (card) { return card.getAttribute("data-available") === "true"; });
      var displayProduct = chatwebProduct || products[0];
      if (displayProduct) {
        var shopPrice = document.getElementById("shopPrice");
        var shopPayable = document.getElementById("shopPayable");
        if (shopPrice) shopPrice.textContent = formatMoney(displayProduct.unit_amount, displayProduct.currency);
        if (shopPayable) shopPayable.textContent = formatMoney(displayProduct.unit_amount, displayProduct.currency);
        setQuantityLimit(displayProduct);
        syncEditionFromProduct(displayProduct);
      }
      syncQuantityControls();
      if (chatwebShopReady) {
        setShopMessage("Paiement sécurisé par Stripe, géré par la boutique Ar-bol dans Chatweb.", "Secure Stripe payment managed by the Ar-bol shop in Chatweb.", false);
      } else {
        setShopMessage("La boutique est en cours d’activation.", "The shop is being activated.", true);
      }
      validPay();
    }).catch(function () {
      chatwebShippingRules = [];
      renderShippingChoices();
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
    if ("IntersectionObserver" in window) {
      var tallyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          fillTally();
          tallyObserver.disconnect();
        });
      }, { rootMargin: "0px 0px -15% 0px" });
      tallyObserver.observe(tally);
    } else {
      fillTally();
    }
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
