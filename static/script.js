(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Debug helper (safe to leave in; remove later if you want)
  console.log("AuctionInc landing script loaded");

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav toggle
  const navToggle = $("#navToggle");
  const navMobile = $("#navMobile");

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      navMobile.hidden = isOpen;
      navToggle.textContent = isOpen ? "☰" : "✕";
    });

    navMobile.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      navToggle.setAttribute("aria-expanded", "false");
      navMobile.hidden = true;
      navToggle.textContent = "☰";
    });
  }

  // Proof slider controls
  const track = $("#proofTrack");
  const prev = $("#proofPrev");
  const next = $("#proofNext");

  const scrollByCard = (dir) => {
    if (!track) return;
    const card = track.querySelector(".proof__card");
    const amount = card ? card.getBoundingClientRect().width + 12 : 260;
    track.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  prev?.addEventListener("click", () => scrollByCard(-1));
  next?.addEventListener("click", () => scrollByCard(1));

  // Lead form validation + submit
  const form = $("#leadForm");
  const success = $("#formSuccess");
  const failBox = $("#formFail");

  if (!form) {
    console.error("leadForm not found — check that <form id='leadForm'> exists in index.html");
    return;
  }

  const setError = (name, msg) => {
    const el = document.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = msg || "";
  };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());

  const isPhone = (v) => {
    const s = String(v || "").trim();
    const digits = s.replace(/\D/g, "");
    const charsOk = /^[+()\-\s\d]+$/.test(s);
    return charsOk && digits.length >= 9;
  };

  const validate = (data) => {
    let ok = true;

    if (!data.name || data.name.trim().length < 2) {
      setError("name", "Please complete the form field.");
      ok = false;
    } else setError("name", "");

    if (!isPhone(data.phone)) {
      setError("phone", "Input is not a valid contact number");
      ok = false;
    } else setError("phone", "");

    if (!isEmail(data.email)) {
      setError("email", "Input is not a valid email address!");
      ok = false;
    } else setError("email", "");

    if (!data.address || data.address.trim().length < 6) {
      setError("address", "Please enter the property address.");
      ok = false;
    } else setError("address", "");

    return ok;
  };

  ["name", "phone", "email", "address"].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener("input", () => setError(id, ""));
  });

  const setLoading = (isLoading) => {
    const btn = $("#submitBtn") || form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? "0.82" : "1";
    btn.style.cursor = isLoading ? "not-allowed" : "pointer";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (success) success.hidden = true;
    if (failBox) failBox.hidden = true;

    const data = {
      // renamed honeypot key to avoid autofill issues
      website: $("#company")?.value || "",
      name: $("#name")?.value || "",
      phone: $("#phone")?.value || "",
      email: $("#email")?.value || "",
      address: $("#address")?.value || "",
      message: $("#message")?.value || "",
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };

    if (!validate(data)) return;

    try {
      setLoading(true);

      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || out?.ok !== true) throw new Error(out?.error || "Request failed");

      form.reset();
      if (success) success.hidden = false;
    } catch (err) {
      console.error("Lead submit failed:", err);
      if (failBox) failBox.hidden = false;
    } finally {
      setLoading(false);
    }
  });
})();
