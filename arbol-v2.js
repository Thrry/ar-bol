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
  var stripeLinks = {
    Unan: "https://buy.stripe.com/test_14A7sN3Rv1lN5vo1Un7Zu00",
    Daou: "https://buy.stripe.com/test_9B6cN773H4xZf5YeH97Zu01",
    Tri: "https://buy.stripe.com/test_5kQaEZbjX4xZcXQ0Qj7Zu02",
    Pevar: "https://buy.stripe.com/test_bJefZjco1c0r2jc0Qj7Zu03"
  };
  var variantSlugs = { Unan: "unan", Daou: "daou", Tri: "tri", Pevar: "pevar" };
  var variantsBySlug = { unan: "Unan", daou: "Daou", tri: "Tri", pevar: "Pevar" };
  var emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function langHtml(fr, en) {
    return '<span lang="fr">' + fr + '</span><span lang="en">' + en + '</span>';
  }
  function submitBrevoContact(payload) {
    return fetch("api/brevo-contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("brevo_contact_failed");
      return res.json();
    });
  }
  function buildStripeUrl(variant) {
    var link = stripeLinks[variant];
    if (!link) return null;
    var slug = variantSlugs[variant] || variant.toLowerCase();
    var url = new URL(link);
    url.searchParams.set("client_reference_id", "arbol_" + slug + "_" + Date.now());
    url.searchParams.set("utm_source", "arbol_site");
    url.searchParams.set("utm_medium", "website");
    url.searchParams.set("utm_campaign", "edition_lancement");
    url.searchParams.set("utm_content", slug);
    return url.toString();
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
    payBtn.disabled = !(okName && okEmail && state.variant);
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
    var stripeUrl = buildStripeUrl(state.variant);
    if (!stripeUrl) {
      if (secureNote) {
        secureNote.innerHTML = langHtml("Lien Stripe manquant pour cette composition.", "Stripe payment link is missing for this composition.");
        secureNote.classList.add("error");
      }
      return;
    }
    var labels = payBtn.querySelectorAll("span[lang]");
    payBtn.disabled = true;
    labels.forEach(function (s) { s.dataset.orig = s.textContent; s.textContent = s.getAttribute("lang") === "fr" ? "Ouverture Stripe…" : "Opening Stripe…"; });
    try {
      sessionStorage.setItem("arbolPendingOrder", JSON.stringify({
        variant: state.variant
      }));
    } catch (e) {}
    submitBrevoContact({
      source: "order",
      email: email.value.trim(),
      firstName: fName.value.trim(),
      lastName: lName.value.trim(),
      variant: state.variant
    }).then(function () {
      window.location.href = stripeUrl;
    }).catch(function () {
      window.location.href = stripeUrl;
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
    document.getElementById("confVar").textContent = variant;
    document.getElementById("confVarEn").textContent = variant;
    try { sessionStorage.removeItem("arbolPendingOrder"); } catch (e) {}
    gotoStep(3);
    if (reserveSec) reserveSec.scrollIntoView({ block: "start" });
  })();

  /* ---------- Édition : jauge de rareté (50 traits, 12 commandés) ---------- */
  var tally = document.getElementById("tally");
  if (tally) {
    for (var ti = 0; ti < 50; ti++) tally.appendChild(document.createElement("i"));
    var ticks = tally.querySelectorAll("i");
    var tallyDone = false;
    var fillTally = function () {
      if (tallyDone) return;
      var r = tally.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.85 && r.bottom > 0) {
        tallyDone = true;
        if (reduce) { for (var i = 0; i < 12; i++) ticks[i].classList.add("on"); return; }
        for (var i = 0; i < 12; i++) {
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
      var done = document.getElementById("wlDone");
      var btn = wlForm.querySelector("button[type='submit']");
      var ok = emailRe.test(inp.value.trim());
      if (!ok) { inp.focus(); inp.style.borderColor = "#b66"; return; }
      inp.style.borderColor = "";
      btn.disabled = true;
      done.innerHTML = langHtml("Enregistrement…", "Saving…");
      submitBrevoContact({
        source: "waitlist",
        email: inp.value.trim()
      }).then(function () {
        wlForm.style.display = "none";
        done.innerHTML = langHtml("Merci — vous êtes sur la liste.", "Thank you — you're on the list.");
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
