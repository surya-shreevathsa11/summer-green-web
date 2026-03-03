(function () {
  let currentUser = null;
  let revealIO = null;
  const revealEls = new Set();
  let hasScrolledDeep = false;

  /* Room cover images: 1st–5th and extras for more rooms */
  const roomCoverImages = [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&h=1200&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&h=1200&q=80",
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Scroll text flow reveal (reference-like) ---
  function enhanceClipReveal(el) {
    if (el.classList.contains("reveal-clip")) return;
    const text = el.textContent;
    el.textContent = "";
    el.classList.add("reveal-clip");
    const inner = document.createElement("span");
    inner.className = "reveal-clip__inner";
    inner.textContent = text;
    el.appendChild(inner);
  }

  function setupRevealObserver() {
    if (revealIO) return;
    revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealIO.unobserve(entry.target);
        });
      },
      { root: null, threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
  }

  function registerReveals(root = document) {
    setupRevealObserver();
    const els = Array.from(root.querySelectorAll("[data-reveal]"));
    els.forEach((el) => {
      const type = el.dataset.reveal;
      const delay = Number(el.dataset.revealDelay || 0);
      if (Number.isFinite(delay) && delay > 0) {
        el.style.setProperty("--reveal-delay", `${delay}ms`);
      }
      if (type === "clip") enhanceClipReveal(el);
      if (type === "slide-down" || type === "flow") {
        el.classList.add(
          type === "slide-down" ? "reveal-slide-down" : "reveal-flow",
        );
      } else {
        el.classList.add("reveal");
      }
      revealEls.add(el);
    });
    els.forEach((el) => revealIO.observe(el));
  }

  function resetReveals() {
    if (!revealIO) return;
    revealEls.forEach((el) => {
      el.classList.remove("is-visible");
      revealIO.observe(el);
    });
  }

  function setupRevealResetOnTop() {
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY || 0;
        if (y > 400) hasScrolledDeep = true;
        if (hasScrolledDeep && y < 40) {
          hasScrolledDeep = false;
          resetReveals();
        }
      },
      { passive: true },
    );
  }

  // --- Nav scroll ---
  window.addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", window.scrollY > 60);
  });

  // --- Mobile nav toggle ---
  $("#navToggle").addEventListener("click", () => {
    $("#navLinks").classList.toggle("open");
  });

  // --- Smooth scroll for nav links ---
  $$(
    ".nav__links a, .hero .btn, .footer__links a, .section__actions a",
  ).forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = $(href);
        if (target) target.scrollIntoView({ behavior: "smooth" });
        $("#navLinks").classList.remove("open");
      }
    });
  });

  // --- Modal logic ---
  function openModal(id) {
    closeAllModals();
    $(id).classList.add("active");
  }

  function closeAllModals() {
    $$(".modal").forEach((m) => m.classList.remove("active"));
    $$(".form__error").forEach((e) => (e.textContent = ""));
    $$(".form__success").forEach((e) => (e.textContent = ""));
  }

  $$(".modal__overlay, .modal__close").forEach((el) => {
    el.addEventListener("click", closeAllModals);
  });

  // --- Auth button ---
  $("#authBtn").addEventListener("click", () => {
    if (currentUser) {
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        currentUser = null;
        updateAuthUI();
      });
    } else {
      openModal("#signInModal");
    }
  });

  // --- Google Sign In ---
  $("#googleSignInBtn").addEventListener("click", () => {
    window.location.href = "/api/auth/google";
  });

  // --- Check auth on load (Google OAuth sets session server-side) ---
  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.loggedIn) {
        currentUser = data.user;
        updateAuthUI();
      }
    } catch {
      /* silent */
    }
  }

  // --- Check auth status on load ---
  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.loggedIn) {
        currentUser = data.user;
        updateAuthUI();
      }
    } catch {
      /* silent */
    }
  }

  // --- Render rooms ---
  async function renderRooms() {
    try {
      const res = await fetch("/api/booking/rooms");
      const data = await res.json();
      if (!data.success) return;
      const grid = $("#roomsGrid");
      grid.innerHTML = data.rooms
        .map(
          (room, idx) => `
        <div class="room-card" data-reveal="slide-down" data-reveal-delay="${Math.min(idx * 100, 400)}">
          <div class="room-card__media">
            <img loading="lazy" alt="${room.name} cover" src="${roomCoverImages[idx % roomCoverImages.length]}">
          </div>
          <span class="room-card__number">0${room.id}</span>
          <h3 class="room-card__name">${room.name}</h3>
          <p class="room-card__desc">${room.description}</p>
          <p class="room-card__price"><span>&euro;${room.price}</span> / night</p>
          <button class="btn btn--outline btn--sm" data-book="${room.id}" data-name="${room.name}">Book Now</button>
        </div>
      `,
        )
        .join("");
      registerReveals(grid);

      grid.addEventListener("click", (e) => {
        const bookBtn = e.target.closest("[data-book]");
        if (!bookBtn) return;
        if (!currentUser) {
          openModal("#signInModal");
          return;
        }
        $("#bookingRoomId").value = bookBtn.dataset.book;
        $("#bookingRoomName").textContent = bookBtn.dataset.name;
        openModal("#bookingModal");
      });
    } catch {
      /* silent */
    }
  }

  // --- Booking form ---
  $("#bookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const roomId = $("#bookingRoomId").value;
    const checkIn = $("#bookingCheckIn").value;
    const checkOut = $("#bookingCheckOut").value;
    const guests = $("#bookingGuests").value;
    try {
      const res = await fetch("/api/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, checkIn, checkOut, guests }),
      });
      const data = await res.json();
      if (data.success) {
        $("#bookingSuccess").textContent = "Booking confirmed!";
        $("#bookingError").textContent = "";
        setTimeout(closeAllModals, 1500);
        $("#bookingForm").reset();
      } else {
        $("#bookingError").textContent = data.message;
      }
    } catch {
      $("#bookingError").textContent = "Connection error";
    }
  });

  // --- Gallery filter ---
  $$(".gallery__filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".gallery__filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      $$(".gallery__item").forEach((item) => {
        if (filter === "all" || item.dataset.category === filter) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });
    });
  });

  // --- Contact form ---
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Message sent. We will get back to you soon.");
    $("#contactForm").reset();
  });

  // --- Directions button (maps) ---
  function setupDirections() {
    const btn = $("#getDirectionsBtn");
    if (!btn) return;
    const address = "Via dei Cipressi 42, Tuscany, Italy";
    btn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    btn.target = "_blank";
  }

  // --- Hero slider (4 images, 5s) ---
  function setupHeroSlider() {
    const slides = Array.from(document.querySelectorAll(".hero__slide"));
    if (slides.length < 2) return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let idx = Math.max(
      0,
      slides.findIndex((s) => s.classList.contains("is-active")),
    );
    function show(nextIdx) {
      slides[idx].classList.remove("is-active");
      slides[nextIdx].classList.add("is-active");
      idx = nextIdx;
    }

    let timer = setInterval(() => {
      const next = (idx + 1) % slides.length;
      show(next);
    }, 5000);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        clearInterval(timer);
        timer = setInterval(() => {
          const next = (idx + 1) % slides.length;
          show(next);
        }, 5000);
      }
    });
  }

  // --- Custom cursor (site-wide) ---
  function setupCursor() {
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    if (!dot || !ring) return;

    const isCoarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) return;

    document.documentElement.classList.add("custom-cursor-active");
    document.body.classList.add("custom-cursor-active");

    let x = 0,
      y = 0;
    let rx = 0,
      ry = 0;
    let hasMoved = false;
    let hovering = false;
    let down = false;
    let activeHoverEl = null;

    function setVisible(v) {
      dot.classList.toggle("is-visible", v);
      ring.classList.toggle("is-visible", v);
    }

    function updateRingClasses() {
      ring.classList.toggle("is-hover", hovering);
      ring.classList.toggle("is-down", down);
    }

    window.addEventListener(
      "mousemove",
      (e) => {
        x = e.clientX;
        y = e.clientY;
        hasMoved = true;
        setVisible(true);
        dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      },
      { passive: true },
    );

    window.addEventListener("mouseleave", () => setVisible(false));
    window.addEventListener("mousedown", () => {
      down = true;
      updateRingClasses();
    });
    window.addEventListener("mouseup", () => {
      down = false;
      updateRingClasses();
    });

    document.addEventListener("mouseover", (e) => {
      const target =
        e.target &&
        e.target.closest &&
        e.target.closest('a, button, .btn, input, textarea, [role="button"]');
      hovering = Boolean(target);
      if (activeHoverEl && activeHoverEl !== target) {
        activeHoverEl.classList.remove("cursor-target");
      }
      activeHoverEl = target || null;
      if (activeHoverEl) {
        activeHoverEl.classList.add("cursor-target");
      }
      updateRingClasses();
    });

    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget) {
        hovering = false;
        if (activeHoverEl) activeHoverEl.classList.remove("cursor-target");
        activeHoverEl = null;
        updateRingClasses();
        return;
      }
      const stillHover =
        e.relatedTarget.closest &&
        e.relatedTarget.closest(
          'a, button, .btn, input, textarea, [role="button"]',
        );
      hovering = Boolean(stillHover);
      if (!hovering && activeHoverEl) {
        activeHoverEl.classList.remove("cursor-target");
        activeHoverEl = null;
      }
      updateRingClasses();
    });

    function tick() {
      if (hasMoved) {
        rx += (x - rx) * 0.18;
        ry += (y - ry) * 0.18;
        const scale = down ? 0.88 : hovering ? 1.22 : 1;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Init ---
  registerReveals();
  setupRevealResetOnTop();
  setupDirections();
  setupHeroSlider();
  setupCursor();
  checkAuth();
  renderRooms();
})();
