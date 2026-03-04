(function () {
  let currentUser = null;

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

  // --- Nav scroll ---
  var navEl = $('#nav');
  if (navEl) {
    window.addEventListener('scroll', () => {
      navEl.classList.toggle('scrolled', window.scrollY > 60);
    });
  }

  // --- Mobile nav toggle ---
  var navToggle = $('#navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      var links = $('#navLinks');
      if (links) links.classList.toggle('open');
    });
  }

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

  // --- Booking cart (in-memory) ---
  let bookingCart = [];

  function addToCart(room) {
    if (bookingCart.some((r) => r.id === room.id)) return;
    bookingCart.push(room);
    updateCartUI();
  }

  function removeFromCart(roomId) {
    bookingCart = bookingCart.filter((r) => r.id !== roomId);
    updateCartUI();
    updateRoomCartButtons();
  }

  function updateRoomCartButtons() {
    $$("[data-add-cart]").forEach((btn) => {
      const id = Number(btn.dataset.addCart);
      btn.textContent = bookingCart.some((r) => r.id === id) ? "Added" : "Add to cart";
    });
  }

  function updateCartUI() {
    const countEl = $("#navCartCount");
    if (countEl) {
      countEl.textContent = bookingCart.length;
      countEl.setAttribute("data-count", bookingCart.length);
    }
    const listEl = $("#cartList");
    const emptyEl = $("#cartEmpty");
    const footerEl = $("#cartFooter");
    const totalEl = $("#cartTotal");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (bookingCart.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (footerEl) footerEl.style.display = "none";
      updateRoomCartButtons();
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    if (footerEl) footerEl.style.display = "block";
    let total = 0;
    bookingCart.forEach((room) => {
      total += room.price;
      const item = document.createElement("div");
      item.className = "cart__item";
      item.innerHTML = `
        <div class="cart__item-info">
          <div class="cart__item-name">${escapeHtml(room.name)}</div>
          <div class="cart__item-price">&euro;${room.price} / night</div>
        </div>
        <button type="button" class="cart__item-remove" data-remove="${room.id}">Remove</button>
      `;
      listEl.appendChild(item);
    });
    listEl.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeFromCart(Number(btn.dataset.remove));
      });
    });
    if (totalEl) totalEl.textContent = `€${total}`;
    updateRoomCartButtons();
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  $("#navCart").addEventListener("click", (e) => {
    e.preventDefault();
    openModal("#cartModal");
    updateCartUI();
  });

  $("#cartCheckoutBtn").addEventListener("click", () => {
    if (bookingCart.length === 0) return;
    // TODO: Restore sign-in check when verification is set up — require currentUser before opening checkout:
    // if (!currentUser) { closeAllModals(); openModal("#signInModal"); return; }
    closeAllModals();
    const today = new Date().toISOString().slice(0, 10);
    $("#checkoutCheckIn").min = today;
    $("#checkoutCheckOut").min = today;
    openModal("#checkoutModal");
  });

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
            <img loading="lazy" alt="${escapeHtml(room.name)} cover" src="${roomCoverImages[idx % roomCoverImages.length]}">
          </div>
          <span class="room-card__number">0${room.id}</span>
          <h3 class="room-card__name">${escapeHtml(room.name)}</h3>
          <p class="room-card__desc">${escapeHtml(room.description)}</p>
          <p class="room-card__price"><span>&euro;${room.price}</span> / night</p>
          <button type="button" class="btn btn--outline btn--sm" data-add-cart="${room.id}" data-name="${escapeHtml(room.name)}" data-price="${room.price}">Add to cart</button>
        </div>
      `).join('');
      if (window.refreshScrollReveals) window.refreshScrollReveals();

      grid.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-add-cart]");
        if (!btn) return;
        const id = Number(btn.dataset.addCart);
        const name = btn.dataset.name;
        const price = Number(btn.dataset.price);
        addToCart({ id, name, price });
        updateRoomCartButtons();
        openModal("#cartModal");
        updateCartUI();
      });
    } catch {
      /* silent */
    }
  }

  $("#checkoutCheckIn").addEventListener("change", () => {
    const checkIn = $("#checkoutCheckIn").value;
    if (checkIn) $("#checkoutCheckOut").min = checkIn;
  });

  // --- Checkout form (details + dates + guests) ---
  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#checkoutName").value.trim();
    const email = $("#checkoutEmail").value.trim();
    const phone = $("#checkoutPhone").value.trim();
    const checkIn = $("#checkoutCheckIn").value;
    const checkOut = $("#checkoutCheckOut").value;
    const adults = parseInt($("#checkoutAdults").value, 10) || 1;
    const children = parseInt($("#checkoutChildren").value, 10) || 0;
    const errEl = $("#checkoutError");
    errEl.textContent = "";
    if (adults < 1) {
      errEl.textContent = "At least 1 adult is required.";
      return;
    }
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      errEl.textContent = "Check-out must be after check-in.";
      return;
    }
    closeAllModals();
    openModal("#termsModal");
  });

  // --- Terms: scroll wheel only scrolls terms content, not background ---
  (function () {
    const termsScroll = document.getElementById("termsScroll");
    if (termsScroll) {
      termsScroll.addEventListener("wheel", function (e) {
        e.stopPropagation();
      }, { passive: true });
    }
  })();

  // --- Terms: enable Proceed when checkbox checked ---
  $("#termsAccept").addEventListener("change", () => {
    $("#termsProceedBtn").disabled = !$("#termsAccept").checked;
  });

  $("#termsProceedBtn").addEventListener("click", () => {
    if (!$("#termsAccept").checked) return;
    closeAllModals();
    openModal("#paymentModal");
  });

  // --- Payment: Razorpay redirect placeholder ---
  $("#paymentRedirectBtn").addEventListener("click", () => {
    closeAllModals();
    alert("Razorpay payment gateway will be integrated once bank details and backend verification are confirmed. Your booking details have been recorded for testing.");
    bookingCart = [];
    updateCartUI();
    $("#checkoutForm").reset();
    $("#termsAccept").checked = false;
    $("#termsProceedBtn").disabled = true;
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

  // --- Blob cursor (site-wide) — single blob, small, transparent ---
  function setupBlobCursor() {
    const container = $('#blobCursor');
    const blob = container ? container.querySelector('.blob-cursor__blob') : null;
    if (!container || !blob) return;

    const isCoarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) return;

    document.documentElement.classList.add("custom-cursor-active");
    document.body.classList.add("custom-cursor-active");

    let x = 0, y = 0;
    let rx = 0, ry = 0;
    const lerpRate = 0.42;
    let visible = false;
    let hovering = false;
    let down = false;
    let activeHoverEl = null;

    function setVisible(v) {
      visible = v;
      container.classList.toggle('is-visible', v);
    }

    function updateClasses() {
      container.classList.toggle('is-hover', hovering);
      container.classList.toggle('is-down', down);
    }

    window.addEventListener('mousemove', (e) => {
      x = e.clientX;
      y = e.clientY;
      setVisible(true);
    }, { passive: true });

    window.addEventListener('mouseleave', () => setVisible(false));
    window.addEventListener('mousedown', () => { down = true; updateClasses(); });
    window.addEventListener('mouseup', () => { down = false; updateClasses(); });

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
      updateClasses();
    });

    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget) {
        hovering = false;
        if (activeHoverEl) activeHoverEl.classList.remove("cursor-target");
        activeHoverEl = null;
        updateClasses();
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
      updateClasses();
    });

    function tick() {
      if (visible) {
        rx += (x - rx) * lerpRate;
        ry += (y - ry) * lerpRate;
        var scale = down ? 0.9 : hovering ? 1.24 : 1;
        blob.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%) scale(' + scale + ')';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Init ---
  setupDirections();
  setupHeroSlider();
  setupBlobCursor();
  checkAuth();
  renderRooms();
})();
