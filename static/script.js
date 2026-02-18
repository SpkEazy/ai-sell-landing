// static/script.js
(() => {
  console.log("AuctionInc landing script loaded");

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav toggle
  const navToggle = document.getElementById("navToggle");
  const navMobile = document.getElementById("navMobile");
  if (navToggle && navMobile) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navMobile.hidden = isOpen;
    });

    // Close menu when clicking a link
    navMobile.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        navMobile.hidden = true;
      });
    });
  }

  // Proof scroller controls
  const proofTrack = document.getElementById("proofTrack");
  const proofPrev = document.getElementById("proofPrev");
  const proofNext = document.getElementById("proofNext");

  const scrollByCard = (dir) => {
    if (!proofTrack) return;
    const card = proofTrack.querySelector(".proof__card");
    const cardWidth = card ? card.getBoundingClientRect().width : 320;
    proofTrack.scrollBy({ left: dir * (cardWidth + 12), behavior: "smooth" });
  };

  if (proofPrev) proofPrev.addEventListener("click", () => scrollByCard(-1));
  if (proofNext) proofNext.addEventListener("click", () => scrollByCard(1));

  // -----------------------------
  // Source tracking (UTMs + referrer)
  // -----------------------------
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  const getUtmFromUrl = () => {
    const out = {};
    const params = new URLSearchParams(window.location.search || "");
    UTM_KEYS.forEach((k) => {
      const v = (params.get(k) || "").trim();
      if (v) out[k] = v;
    });
    return out;
  };

  const getStoredUtm = () => {
    try {
      const raw = localStorage.getItem("auctioninc_utms");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const storeUtm = (utms) => {
    try {
      localStorage.setItem("auctioninc_utms", JSON.stringify(utms || {}));
    } catch {}
  };

  const buildAttribution = () => {
    const fromUrl = getUtmFromUrl();
    const stored = getStoredUtm();

    if (Object.keys(fromUrl).length) storeUtm(fromUrl);

    const utms = Object.keys(fromUrl).length ? fromUrl : stored;

    return {
      ...utms,
      referrer: document.referrer || "",
      landing_url: window.location.href || "",
    };
  };

  // Lead form
  const form = document.getElementById("leadForm");
  const submitBtn = document.getElementById("submitBtn");
  const successEl = document.getElementById("formSuccess");
  const failEl = document.getElementById("formFail");

  const setError = (name, msg) => {
    const el = document.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = msg || "";
  };

  const clearErrors = () => {
    ["name", "phone", "email", "address"].forEach((k) => setError(k, ""));
  };

  const showSuccess = () => {
    if (successEl) successEl.hidden = false;
    if (failEl) failEl.hidden = true;
  };

  const showFail = (msg) => {
    if (successEl) successEl.hidden = true;
    if (failEl) failEl.hidden = false;
    console.error(msg || "Lead submit failed");
  };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const clean = (v) => (v || "").trim();

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    if (successEl) successEl.hidden = true;
    if (failEl) failEl.hidden = true;

    const hp = document.getElementById("website");
    if (hp) hp.value = "";

    const name = clean(document.getElementById("name")?.value);
    const phone = clean(document.getElementById("phone")?.value);
    const email = clean(document.getElementById("email")?.value);
    const address = clean(document.getElementById("address")?.value);
    const message = clean(document.getElementById("message")?.value);

    let ok = true;

    if (!name) { setError("name", "Please enter your name."); ok = false; }
    if (!phone || phone.length < 7) { setError("phone", "Please enter a valid contact number."); ok = false; }
    if (!email || !isEmail(email)) { setError("email", "Please enter a valid email address."); ok = false; }
    if (!address) { setError("address", "Please enter the property address."); ok = false; }

    if (!ok) return;

    const attribution = buildAttribution();
    const payload = { name, phone, email, address, message, attribution };

    try {
      if (submitBtn) submitBtn.disabled = true;

      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("API error:", res.status, data);
        showFail(data?.error || "Request failed");
        return;
      }

      // ✅ GA4 conversion event (fires only on successful lead)
      if (typeof window.gtag === "function") {
        window.gtag("event", "sell_your_property_for");
      }

      // success
      form.reset();
      showSuccess();

    } catch (err) {
      showFail(err?.message || String(err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();

