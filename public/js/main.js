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

  $$(".modal__overlay, .modal__close, [data-close]").forEach((el) => {
    el.addEventListener("click", closeAllModals);
  });

  // --- Auth UI: Sign In (when logged out) / Profile dropdown (when logged in) ---
  function updateAuthUI() {
    const authBtn = $("#authBtn");
    const navProfile = $("#navProfile");
    const navProfileName = $("#navProfileName");
    const navProfileDropdown = $("#navProfileDropdown");
    if (!authBtn || !navProfile) return;
    if (currentUser) {
      authBtn.style.display = "none";
      navProfile.style.display = "block";
      navProfile.setAttribute("aria-hidden", "false");
      if (navProfileName) {
        navProfileName.textContent = currentUser.name || currentUser.email || "Profile";
      }
      if (navProfileDropdown) navProfileDropdown.classList.remove("is-open");
    } else {
      authBtn.style.display = "";
      navProfile.style.display = "none";
      navProfile.setAttribute("aria-hidden", "true");
      if (navProfileDropdown) navProfileDropdown.classList.remove("is-open");
    }
  }

  $("#authBtn").addEventListener("click", () => {
    openModal("#signInModal");
  });

  updateAuthUI();

  // --- Profile dropdown ---
  const navProfileTrigger = $("#navProfileTrigger");
  const navProfileDropdown = $("#navProfileDropdown");
  if (navProfileTrigger && navProfileDropdown) {
    navProfileTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = navProfileDropdown.classList.toggle("is-open");
      navProfileTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    navProfileDropdown.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      navProfileDropdown.classList.remove("is-open");
      if (navProfileTrigger) navProfileTrigger.setAttribute("aria-expanded", "false");
    });
  }

  const navProfileLogout = $("#navProfileLogout");
  if (navProfileLogout) {
    navProfileLogout.addEventListener("click", () => {
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        currentUser = null;
        updateAuthUI();
      });
    });
  }
  const navProfileBookings = $("#navProfileBookings");
  if (navProfileBookings) {
    navProfileBookings.addEventListener("click", () => {
      if (navProfileDropdown) navProfileDropdown.classList.remove("is-open");
      const navLinks = $("#navLinks");
      if (navLinks) navLinks.classList.remove("open");
    });
  }

  // --- Google Sign In ---
  $("#googleSignInBtn").addEventListener("click", () => {
    window.location.href = "/api/auth/google";
  });

  // --- Check auth on load (Google OAuth sets session server-side) ---
  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/status", { credentials: "same-origin" });
      const data = await res.json();
      if (data.loggedIn) {
        currentUser = data.user;
        updateAuthUI();
        try {
          if ((sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) === "checkout" || sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) === "cart") && bookingCart.length > 0) {
            sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, "cart");
            window.location.href = "/cart";
          }
        } catch (_) {}
      }
    } catch {
      /* silent */
    }
  }

  // --- Booking cart (persisted in sessionStorage so it survives OAuth redirect) ---
  const CART_STORAGE_KEY = "summer-green-booking-cart";
  const POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";

  let bookingCart = [];
  try {
    const saved = sessionStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) bookingCart = parsed;
    }
  } catch (_) {}

  function persistCart() {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(bookingCart));
    } catch (_) {}
  }

  function addToCart(room) {
    if (bookingCart.some((r) => r.id === room.id)) return false;
    bookingCart.push(room);
    persistCart();
    updateCartUI();
    return true;
  }

  function removeFromCart(roomId) {
    bookingCart = bookingCart.filter((r) => r.id !== roomId);
    persistCart();
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
      updateCartUI();
      updateRoomCartButtons();

      grid.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-add-cart]");
        if (!btn) return;
        e.preventDefault();
        const id = Number(btn.dataset.addCart);
        const name = btn.dataset.name;
        const price = Number(btn.dataset.price);
        var added = addToCart({ id, name, price });
        updateRoomCartButtons();
        updateCartUI();
        if (added) {
          var infoEl = $("#roomAddedInfo");
          var modal = $("#roomAddedModal");
          if (infoEl) infoEl.textContent = name + " — \u20AC" + price + " / night";
          if (modal) openModal("#roomAddedModal");
        }
      });
    } catch {
      /* silent */
    }
  }

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

    var textSelector = 'h1, h2, h3, h4, h5, h6, p, .hero__title, .hero__subtitle, .hero__desc, .section__title, .section__subtitle';
    var hoverSelector = 'a, button, .btn, input, textarea, [role="button"], .room-card, .gallery__item';
    document.addEventListener("mouseover", (e) => {
      const target =
        e.target &&
        e.target.closest &&
        e.target.closest(hoverSelector);
      const textEl = e.target && e.target.closest && e.target.closest(textSelector);
      hovering = Boolean(target);
      container.classList.toggle('is-hover-text', Boolean(textEl));
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
        container.classList.remove('is-hover-text');
        if (activeHoverEl) activeHoverEl.classList.remove("cursor-target");
        activeHoverEl = null;
        updateClasses();
        return;
      }
      const stillHover =
        e.relatedTarget.closest &&
        e.relatedTarget.closest(hoverSelector);
      const stillText = e.relatedTarget.closest && e.relatedTarget.closest(textSelector);
      hovering = Boolean(stillHover);
      container.classList.toggle('is-hover-text', Boolean(stillText));
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
