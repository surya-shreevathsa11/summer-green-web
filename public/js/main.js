(function () {
  let currentUser = null;
  const POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";
  const VaraApi = window.VaraApi;
  let pendingAuthEmail = "";
  let pendingAuthName = "";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Nav scroll ---
  var navEl = $("#nav");
  if (navEl) {
    window.addEventListener("scroll", () => {
      navEl.classList.toggle("scrolled", window.scrollY > 60);
    });
  }

  // --- Mobile nav toggle ---
  var navToggle = $("#navToggle");
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      var links = $("#navLinks");
      if (links) links.classList.toggle("open");
    });
  }

  // --- Smooth scroll for nav links (Rooms and other # anchors scroll to section; page stays scrollable) ---
  function scrollToSection(selector, offset) {
    var el = typeof selector === "string" ? $(selector) : selector;
    if (!el) return;
    var lenis =
      typeof window.getLenis === "function" ? window.getLenis() : null;
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(el, {
        offset: offset != null ? offset : -80,
        duration: 1.2,
      });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  $$(
    ".nav__links a, .hero .btn, .footer__links a, .section__actions a"
  ).forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href === "#rooms") {
        e.preventDefault();
        scrollToSection("#rooms", -80);
        var navLinks = $("#navLinks");
        if (navLinks) navLinks.classList.remove("open");
        return;
      }
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = $(href);
        if (target) scrollToSection(target, -80);
        $("#navLinks").classList.remove("open");
      }
    });
  });

  // --- Add to cart: open book popup; backend validates session and returns message if not signed in ---
  function onAddToCartClick(id, name, price, capacity) {
    openBookRoomModal(Number(id), name, Number(price), capacity);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add-cart]");
    if (!btn) return;
    var capacity = null;
    if (btn.dataset.maxAdults != null && btn.dataset.maxChildren != null) {
      capacity = {
        adults: parseInt(btn.dataset.maxAdults, 10) || 1,
        children: parseInt(btn.dataset.maxChildren, 10) || 0,
      };
      if (btn.dataset.maxAdultsWithChildren != null)
        capacity.adultsWithChildren = parseInt(btn.dataset.maxAdultsWithChildren, 10);
    }
    var modal = $("#roomsModal");
    if (modal && modal.classList.contains("active")) {
      e.preventDefault();
      onAddToCartClick(
        btn.dataset.addCart,
        btn.dataset.name,
        btn.dataset.price,
        capacity
      );
      return;
    }
    var grid = $("#roomsGrid");
    if (grid && grid.contains(btn)) {
      e.preventDefault();
      onAddToCartClick(
        btn.dataset.addCart,
        btn.dataset.name,
        btn.dataset.price,
        capacity
      );
    }
  });

  function checkDatesAvailability() {
    var checkIn = $("#bookRoomCheckIn") && $("#bookRoomCheckIn").value;
    var checkOut = $("#bookRoomCheckOut") && $("#bookRoomCheckOut").value;
    var availEl = $("#bookRoomAvailability");
    if (!availEl || !pendingBookRoom || !checkIn || !checkOut) {
      if (availEl) availEl.textContent = "";
      return;
    }
    var roomId = "R" + pendingBookRoom.id;
    availEl.textContent = "Checking availability…";
    availEl.classList.remove(
      "form__availability--ok",
      "form__availability--error"
    );
    VaraApi.getPublicQuote({
      roomId: roomId,
      checkIn: checkIn,
      checkOut: checkOut,
      adults: 1,
      children: 0,
    })
      .then(function () {
          availEl.textContent = "Rooms are available.";
          availEl.classList.add("form__availability--ok");
          availEl.classList.remove("form__availability--error");
      })
      .catch(function (err) {
        availEl.textContent = err && err.message ? err.message : "Dates not available.";
        availEl.classList.add("form__availability--error");
        availEl.classList.remove("form__availability--ok");
      });
  }

  var bookRoomCheckIn = $("#bookRoomCheckIn");
  if (bookRoomCheckIn) {
    bookRoomCheckIn.addEventListener("change", function () {
      var co = $("#bookRoomCheckOut");
      if (co && bookRoomCheckIn.value) co.min = bookRoomCheckIn.value;
      checkDatesAvailability();
    });
  }
  var bookRoomCheckOut = $("#bookRoomCheckOut");
  if (bookRoomCheckOut) {
    bookRoomCheckOut.addEventListener("change", checkDatesAvailability);
  }

  function validateBookRoomGuests(adults, children, capacity) {
    if (!capacity || capacity.adults == null || capacity.children == null) return null;
    var a = adults;
    var c = children;
    var maxAdults = capacity.adults;
    var maxChildren = capacity.children;
    var adultsWithChildren = capacity.adultsWithChildren;
    if (adultsWithChildren != null) {
      if (c === 0) {
        if (a > maxAdults) return "Guest limit exceeded. This room allows up to " + maxAdults + " adult(s) when no children, or up to " + adultsWithChildren + " adult(s) and " + maxChildren + " child(ren).";
      } else {
        if (a > adultsWithChildren || c > maxChildren) return "Guest limit exceeded. With children, this room allows up to " + adultsWithChildren + " adult(s) and " + maxChildren + " child(ren).";
      }
    } else {
      if (a > maxAdults || c > maxChildren) return "Guest limit exceeded. This room allows up to " + maxAdults + " adult(s) and " + maxChildren + " child(ren).";
    }
    return null;
  }

  var bookRoomAdultsEl = $("#bookRoomAdults");
  var bookRoomChildrenEl = $("#bookRoomChildren");
  function allowNumericOnly(el) {
    if (!el) return;
    el.addEventListener("input", function () {
      var v = this.value.replace(/\D/g, "");
      if (this.value !== v) this.value = v;
    });
  }
  allowNumericOnly(bookRoomAdultsEl);
  allowNumericOnly(bookRoomChildrenEl);

  var bookRoomForm = $("#bookRoomForm");
  if (bookRoomForm) {
    bookRoomForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!pendingBookRoom) return;
      var errEl = $("#bookRoomError");
      var submitBtn = $("#bookRoomSubmitBtn");
      var roomId = "R" + pendingBookRoom.id;
      var checkIn = $("#bookRoomCheckIn").value;
      var checkOut = $("#bookRoomCheckOut").value;
      var adults = parseInt($("#bookRoomAdults").value, 10) || 1;
      var children = parseInt($("#bookRoomChildren").value, 10) || 0;
      errEl.textContent = "";
      var clientError = validateBookRoomGuests(adults, children, pendingBookRoom.capacity);
      if (clientError) {
        errEl.textContent = clientError;
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      try {
        await VaraApi.getPublicQuote({
          roomId: roomId,
          checkIn: checkIn,
          checkOut: checkOut,
          adults: adults,
          children: children,
        });
        await VaraApi.addGuestCartItem({
            roomId: roomId,
            checkIn: checkIn,
            checkOut: checkOut,
            adults: adults,
            children: children,
        });
        closeAllModals();
        var infoEl = $("#roomAddedInfo");
        var roomAddedModal = $("#roomAddedModal");
        if (infoEl)
          infoEl.textContent =
            pendingBookRoom.name + " — ₹" + pendingBookRoom.price + " / night";
        if (roomAddedModal) openModal("#roomAddedModal");
        pendingBookRoom = null;
        fetchCartCount();
      } catch (err) {
        if (err && err.isAuthError) {
          errEl.textContent = "Please sign in with PIN to add rooms to cart.";
          openModal("#signInModal");
          return;
        }
        errEl.textContent = err && err.message ? err.message : "Could not add to cart.";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- Modal logic ---
  function openModal(id) {
    closeAllModals();
    $(id).classList.add("active");
  }

  function closeAllModals() {
    $$(".modal").forEach((m) => m.classList.remove("active"));
    $$(".form__error").forEach((e) => (e.textContent = ""));
    $$(".form__success").forEach((e) => (e.textContent = ""));
    $$(".form__availability").forEach((e) => {
      e.textContent = "";
      e.classList.remove("form__availability--ok", "form__availability--error");
    });
  }

  $$(".modal__overlay, .modal__close, [data-close]").forEach((el) => {
    el.addEventListener("click", closeAllModals);
  });

  // --- Auth UI: Sign In (when logged out) / Profile dropdown (when logged in) ---
  const DEFAULT_AVATAR_URL = "/img/default-avatar.svg";
  function updateAuthUI() {
    const authBtn = $("#authBtn");
    const navProfile = $("#navProfile");
    const navProfileAvatar = $("#navProfileAvatar");
    const navProfileDropdown = $("#navProfileDropdown");
    if (!authBtn || !navProfile) return;
    if (currentUser) {
      authBtn.style.display = "none";
      navProfile.style.display = "block";
      navProfile.setAttribute("aria-hidden", "false");
      if (navProfileAvatar) {
        navProfileAvatar.src =
          currentUser.avatar && currentUser.avatar.trim()
            ? currentUser.avatar
            : DEFAULT_AVATAR_URL;
        navProfileAvatar.alt = currentUser.name
          ? String(currentUser.name)
          : "Profile";
      }
      if (navProfileDropdown) navProfileDropdown.classList.remove("is-open");
    } else {
      authBtn.style.display = "";
      navProfile.style.display = "none";
      navProfile.setAttribute("aria-hidden", "true");
      if (navProfileAvatar) navProfileAvatar.src = DEFAULT_AVATAR_URL;
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
      navProfileTrigger.setAttribute(
        "aria-expanded",
        isOpen ? "true" : "false"
      );
    });
    navProfileDropdown.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      navProfileDropdown.classList.remove("is-open");
      if (navProfileTrigger)
        navProfileTrigger.setAttribute("aria-expanded", "false");
    });
  }

  const navProfileLogout = $("#navProfileLogout");
  if (navProfileLogout) {
    navProfileLogout.addEventListener("click", () => {
      VaraApi.clearGuestSession();
      currentUser = null;
      updateAuthUI();
      fetchCartCount();
    });
  }
  const navProfileBookings = $("#navProfileBookings");
  if (navProfileBookings) {
    navProfileBookings.addEventListener("click", (e) => {
      e.preventDefault();
      if (navProfileDropdown) navProfileDropdown.classList.remove("is-open");
      const navLinks = $("#navLinks");
      if (navLinks) navLinks.classList.remove("open");

      var listEl = $("#myBookingsList");
      var emptyEl = $("#myBookingsError");
      var emptyMsgEl = $("#myBookingsEmpty");
      if (listEl) listEl.innerHTML = "";
      if (emptyEl) {
        emptyEl.style.display = "none";
        emptyEl.textContent = "";
      }
      if (emptyMsgEl) emptyMsgEl.style.display = "none";

      VaraApi.getGuestBookings()
        .then(function (bookings) {
          if (bookings.length === 0) {
            if (emptyMsgEl) emptyMsgEl.style.display = "block";
          } else if (listEl) {
            listEl.innerHTML = bookings
              .map(function (b) {
                var rooms = b.rooms || [];
                var roomsSummary = rooms
                  .map(function (r) {
                    return r.roomName || r.roomId || "—";
                  })
                  .join(", ");
                var checkIn =
                  rooms[0] && rooms[0].checkIn
                    ? new Date(rooms[0].checkIn).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                var checkOut =
                  rooms[0] && rooms[0].checkOut
                    ? new Date(rooms[0].checkOut).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                var status = (b.status || "pending").toLowerCase();
                var guestName = b.guest && b.guest.name ? b.guest.name : "—";
                return (
                  '<div class="my-bookings__item">' +
                  '<span class="my-bookings__guest">' +
                  guestName.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                  "</span>" +
                  '<span class="my-bookings__rooms">' +
                  roomsSummary.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                  "</span>" +
                  '<span class="my-bookings__dates">' +
                  checkIn +
                  " – " +
                  checkOut +
                  "</span>" +
                  '<span class="my-bookings__total">₹' +
                  (b.totalAmount != null
                    ? Number(b.totalAmount).toLocaleString("en-IN")
                    : "0") +
                  "</span>" +
                  '<span class="my-bookings__status my-bookings__status--' +
                  status +
                  '">' +
                  status +
                  "</span>" +
                  "</div>"
                );
              })
              .join("");
          }
          openModal("#myBookingsModal");
        })
        .catch(function (err) {
          if (emptyEl) {
            emptyEl.textContent =
              err && err.isAuthError
                ? "Please sign in to view bookings."
                : err && err.message
                  ? err.message
                  : "Could not load bookings.";
            emptyEl.style.display = "block";
          }
          openModal("#myBookingsModal");
        });
    });
  }

  // --- Guest PIN Sign In ---
  var guestAuthRequestForm = $("#guestAuthRequestForm");
  var guestAuthVerifyForm = $("#guestAuthVerifyForm");
  var guestAuthError = $("#guestAuthError");
  var guestAuthVerifyError = $("#guestAuthVerifyError");
  var guestAuthRequestBtn = $("#guestAuthRequestBtn");
  var guestAuthVerifyBtn = $("#guestAuthVerifyBtn");
  if (guestAuthRequestForm) {
    guestAuthRequestForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var name = ($("#guestAuthName") && $("#guestAuthName").value || "").trim();
      var email = ($("#guestAuthContact") && $("#guestAuthContact").value || "").trim();
      if (!name || !email) return;
      pendingAuthName = name;
      pendingAuthEmail = email;
      guestAuthError.textContent = "";
      guestAuthError.style.color = "";
      guestAuthRequestBtn.disabled = true;
      try {
        await VaraApi.requestGuestPin({ name: name, email: email, propertySlug: VaraApi.getConfig().propertySlug });
        guestAuthVerifyForm.style.display = "block";
        guestAuthError.style.color = "var(--color-steel-gray)";
        guestAuthError.textContent = "OTP sent to your email. Enter it below to continue.";
      } catch (err) {
        guestAuthError.style.color = "";
        guestAuthError.textContent = err && err.message ? err.message : "Could not send PIN.";
      } finally {
        guestAuthRequestBtn.disabled = false;
      }
    });
  }
  if (guestAuthVerifyForm) {
    guestAuthVerifyForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var pin = ($("#guestAuthPin") && $("#guestAuthPin").value || "").trim();
      if (!pin || !pendingAuthEmail) return;
      guestAuthVerifyError.textContent = "";
      guestAuthVerifyBtn.disabled = true;
      try {
        var payload = await VaraApi.verifyGuestPin({
          name: pendingAuthName,
          email: pendingAuthEmail,
          pin: pin,
          propertySlug: VaraApi.getConfig().propertySlug,
        });
        currentUser =
          (payload && payload.data && payload.data.guest) ||
          payload.guest ||
          { name: pendingAuthName || "Guest", avatar: "/img/default-avatar.svg" };
        updateAuthUI();
        closeAllModals();
        fetchCartCount();
      } catch (err) {
        guestAuthVerifyError.textContent = err && err.message ? err.message : "PIN verification failed.";
      } finally {
        guestAuthVerifyBtn.disabled = false;
      }
    });
  }

  // --- Auth check: used before booking and for redirect after sign-in ---
  async function checkAuth(cb) {
    const token = VaraApi.readGuestToken();
    const profile = VaraApi.readGuestProfile();
    if (token) {
      currentUser = profile || { name: "Guest", avatar: "/img/default-avatar.svg" };
      updateAuthUI();
      fetchCartCount();
      if (cb) cb(currentUser);
      return;
    }
    currentUser = null;
    updateAuthUI();
    const countEl = $("#navCartCount");
    if (countEl) {
      countEl.textContent = "0";
      countEl.setAttribute("data-count", "0");
    }
    if (cb) cb(null);
  }

  async function fetchCartCount() {
    try {
      const cartItems = await VaraApi.getGuestCart();
      const count = Array.isArray(cartItems) ? cartItems.length : 0;
      const countEl = $("#navCartCount");
      if (countEl) {
        countEl.textContent = count;
        countEl.setAttribute("data-count", count);
      }
    } catch (err) {
      if (err && err.isAuthError) {
        const countEl = $("#navCartCount");
        if (countEl) {
          countEl.textContent = "0";
          countEl.setAttribute("data-count", "0");
        }
      }
    }
  }

  let pendingBookRoom = null;

  function openBookRoomModal(roomId, roomName, roomPrice, capacity) {
    var maxAdults = (capacity && capacity.adults != null) ? capacity.adults : 20;
    var maxChildren = (capacity && capacity.children != null) ? capacity.children : 20;
    var maxAdultsWithChildren = (capacity && capacity.adultsWithChildren != null) ? capacity.adultsWithChildren : null;
    pendingBookRoom = {
      id: roomId,
      name: roomName,
      price: roomPrice,
      capacity: capacity ? { adults: maxAdults, children: maxChildren, adultsOnly: capacity.adultsOnly, adultsWithChildren: maxAdultsWithChildren } : null,
    };
    const nameEl = $("#bookRoomName");
    if (nameEl) nameEl.textContent = roomName;
    const errEl = $("#bookRoomError");
    if (errEl) errEl.textContent = "";
    const today = new Date().toISOString().slice(0, 10);
    const checkIn = $("#bookRoomCheckIn");
    const checkOut = $("#bookRoomCheckOut");
    if (checkIn) {
      checkIn.value = "";
      checkIn.min = today;
    }
    if (checkOut) {
      checkOut.value = "";
      checkOut.min = today;
    }
    const adults = $("#bookRoomAdults");
    const children = $("#bookRoomChildren");
    if (adults) {
      adults.setAttribute("min", "1");
      adults.setAttribute("max", String(maxAdults));
      adults.value = Math.min(1, maxAdults);
    }
    if (children) {
      children.setAttribute("min", "0");
      children.setAttribute("max", String(maxChildren));
      children.value = Math.min(0, maxChildren);
    }
    function onChildrenInput() {
      if (maxAdultsWithChildren == null || !children || !adults) return;
      var c = parseInt(children.value, 10) || 0;
      var a = parseInt(adults.value, 10) || 1;
      if (c > 0 && a > maxAdultsWithChildren) {
        adults.value = String(maxAdultsWithChildren);
      }
    }
    function onAdultsInput() {
      if (maxAdultsWithChildren == null || !adults || !children) return;
      var a = parseInt(adults.value, 10) || 1;
      var c = parseInt(children.value, 10) || 0;
      if (a > maxAdultsWithChildren && c > 0) {
        children.value = "0";
      }
    }
    if (adults && adults._bookRoomCapacityListener) {
      adults.removeEventListener("input", adults._bookRoomCapacityListener);
      adults.removeEventListener("change", adults._bookRoomCapacityListener);
      adults._bookRoomCapacityListener = null;
    }
    if (children && children._bookRoomCapacityListener) {
      children.removeEventListener("input", children._bookRoomCapacityListener);
      children.removeEventListener("change", children._bookRoomCapacityListener);
      children._bookRoomCapacityListener = null;
    }
    if (maxAdultsWithChildren != null) {
      if (children) {
        children._bookRoomCapacityListener = onChildrenInput;
        children.addEventListener("input", onChildrenInput);
        children.addEventListener("change", onChildrenInput);
      }
      if (adults) {
        adults._bookRoomCapacityListener = onAdultsInput;
        adults.addEventListener("input", onAdultsInput);
        adults.addEventListener("change", onAdultsInput);
      }
    }
    openModal("#bookRoomModal");
  }

  function updateRoomCartButtons() {
    $$("[data-add-cart]").forEach((btn) => {
      if (btn) btn.textContent = "Add to cart";
    });
  }

  function updateCartUI() {
    fetchCartCount();
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // --- Render rooms ---
  async function renderRooms() {
    try {
      const payload = await VaraApi.getPublicRoomsPayload();
      const rooms = VaraApi.normalizeRooms(payload);
      const grid = $("#roomsGrid");
      if (!grid) return;
      const roomsSorted = rooms.slice().sort((a, b) => Number(a.id) - Number(b.id));
      grid.innerHTML = roomsSorted

        .map((room, idx) => {
          const imgSrc =
            room.images && room.images.banner
              ? room.images.banner
              : "/img/SummerGreenUpdated.jpeg";
          const galleryOnly = [];
          if (room.images && room.images.gallery && room.images.gallery.length)
            galleryOnly.push(...room.images.gallery);
          const roomImagesJson = galleryOnly.length
            ? JSON.stringify(galleryOnly)
            : "";
          const descText = room.description || "";
          const cap = room.capacity || {};
          const maxAdults = cap.adultsOnly != null ? cap.adultsOnly : (cap.adults != null ? cap.adults : 20);
          const maxChildren = cap.children != null ? cap.children : 20;
          const maxAdultsWithChildrenAttr = (cap.adultsOnly != null && cap.adults != null) ? ' data-max-adults-with-children="' + cap.adults + '"' : "";
          return `
        <div class="room-card" data-reveal="slide-down" data-reveal-delay="${Math.min(idx * 100, 400)}"${roomImagesJson ? ' data-room-images="' + roomImagesJson.replace(/"/g, "&quot;") + '" data-room-name="' + (room.name || "").replace(/"/g, "&quot;") + '"' : ""}>
          <div class="room-card__media">
            <img loading="lazy" alt="${escapeHtml(room.name)} cover" src="${imgSrc}">
          </div>
          <div class="room-card__content">
            <span class="room-card__number">0${room.id}</span>
            <h3 class="room-card__name">${escapeHtml(room.name)}</h3>
            <p class="room-card__desc">${escapeHtml(descText)}</p>
            <p class="room-card__price"><span>₹${room.price}</span> / night</p>
            <div class="room-card__actions">
              <button type="button" class="btn btn--outline btn--sm" data-add-cart="${room.id}" data-name="${escapeHtml(room.name)}" data-price="${room.price}" data-max-adults="${maxAdults}" data-max-children="${maxChildren}"${maxAdultsWithChildrenAttr}>Add to cart</button>
            </div>
          </div>
        </div>
      `;
        })
        .join("");
      if (window.refreshScrollReveals) window.refreshScrollReveals();
      updateCartUI();
      updateRoomCartButtons();
      renderGalleryFromPayload(payload);
    } catch {
      /* silent */
    }
  }

  // --- Gallery: backend-first, static fallback ---
  var galleryGrid = $("#galleryGrid");
  var galleryAutoRaf = null;
  var galleryAutoLastTs = 0;
  var galleryAutoPaused = false;
  var galleryAutoSpeed = 0.04;
  function setupGalleryAutoLoop() {
    if (!galleryGrid) return;
    if (galleryAutoRaf) {
      cancelAnimationFrame(galleryAutoRaf);
      galleryAutoRaf = null;
    }
    galleryAutoLastTs = 0;
    $$(".gallery__item--clone").forEach(function (el) {
      el.remove();
    });
    var originals = $$(".gallery__item", galleryGrid);
    if (!originals.length) return;
    galleryGrid.scrollLeft = 0;
    var isTabletOrMobile =
      (window.matchMedia && window.matchMedia("(max-width: 1024px)").matches) ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    galleryAutoSpeed = isTabletOrMobile ? 0.028 : 0.04;
    function tick(ts) {
      if (!galleryGrid) return;
      if (!galleryAutoLastTs) galleryAutoLastTs = ts;
      var dt = Math.min(ts - galleryAutoLastTs, 34);
      galleryAutoLastTs = ts;
      if (!galleryAutoPaused) {
        galleryGrid.scrollLeft += dt * galleryAutoSpeed;
        var maxScrollLeft = Math.max(0, galleryGrid.scrollWidth - galleryGrid.clientWidth);
        if (galleryGrid.scrollLeft >= maxScrollLeft) {
          galleryGrid.scrollLeft = 0;
        }
      }
      galleryAutoRaf = requestAnimationFrame(tick);
    }
    galleryAutoRaf = requestAnimationFrame(tick);
  }
  if (galleryGrid) {
    galleryGrid.addEventListener("mouseenter", function () {
      galleryAutoPaused = true;
    });
    galleryGrid.addEventListener("mouseleave", function () {
      galleryAutoPaused = false;
    });
    galleryGrid.addEventListener("touchstart", function () {
      galleryAutoPaused = true;
    }, { passive: true });
    galleryGrid.addEventListener("touchend", function () {
      galleryAutoPaused = false;
    }, { passive: true });
  }
  function renderGalleryFromPayload(payload) {
    if (!galleryGrid) return;
    var siteGallery = payload && payload.siteGallery ? payload.siteGallery : null;
    var images = siteGallery && Array.isArray(siteGallery.images) ? siteGallery.images : [];
    if (!images.length) return; // keep existing static HTML fallback

    var list = images
      .map(function (item, idx) {
        if (typeof item === "string") {
          return {
            url: item,
            category: "all",
            label: "Gallery",
            delay: 80 + idx * 40,
          };
        }
        return {
          url: item.url || item.imageUrl || "",
          category: item.category || item.type || "all",
          label: item.label || item.title || "Gallery",
          delay: 80 + idx * 40,
        };
      })
      .filter(function (it) {
        return !!it.url;
      });
    if (!list.length) return;

    galleryGrid.innerHTML = list
      .map(function (it) {
        return (
          '<div class="gallery__item" data-category="' +
          (it.category || "all").replace(/"/g, "&quot;") +
          '" data-reveal="slide-down" data-reveal-delay="' +
          (it.delay || 0) +
          '">' +
          '<img class="gallery__img" alt="' +
          (it.label || "").replace(/"/g, "&quot;") +
          '" src="' +
          (it.url || "").replace(/"/g, "&quot;") +
          '" loading="lazy" />' +
          '<div class="gallery__label">' +
          (it.label || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
          "</div></div>"
        );
      })
      .join("");
    setupGalleryAutoLoop();
    if (window.refreshScrollReveals) window.refreshScrollReveals();
  }
  if (galleryGrid) setupGalleryAutoLoop();

  // --- Gallery image click: full-screen popup ---
  if (galleryGrid) {
    galleryGrid.addEventListener("click", function (e) {
      var item = e.target.closest(".gallery__item");
      if (!item || item.classList.contains("hidden")) return;
      var img = item.querySelector(".gallery__img");
      if (!img) return;
      e.preventDefault();
      var lbImg = $("#galleryLightboxImg");
      var lb = $("#galleryLightbox");
      if (lbImg && lb) {
        lbImg.src = img.src || img.currentSrc;
        lbImg.alt = img.alt || "";
        openModal("#galleryLightbox");
      }
    });
  }

  // --- Room card click: open room gallery (banner + gallery images from admin) ---
  var roomGalleryUrls = [];
  var roomGalleryIndex = 0;
  var roomGalleryImg = $("#roomGalleryImg");
  var roomGalleryCounter = $("#roomGalleryCounter");
  var roomGalleryPrev = $("#roomGalleryPrev");
  var roomGalleryNext = $("#roomGalleryNext");

  function toJpegUrl(url) {
    if (!url || typeof url !== "string") return url;
    if (
      url.indexOf("cloudinary.com") !== -1 &&
      url.indexOf("/upload/") !== -1
    ) {
      return url.replace("/upload/", "/upload/f_jpg/");
    }
    return url;
  }

  function updateRoomGalleryImage() {
    if (!roomGalleryImg || !roomGalleryUrls.length) return;
    var idx = roomGalleryIndex;
    if (idx < 0) idx = 0;
    if (idx >= roomGalleryUrls.length) idx = roomGalleryUrls.length - 1;
    roomGalleryIndex = idx;
    roomGalleryImg.src = toJpegUrl(roomGalleryUrls[roomGalleryIndex]);
    roomGalleryImg.alt = "Room image " + (roomGalleryIndex + 1);
    if (roomGalleryCounter) {
      roomGalleryCounter.textContent =
        roomGalleryIndex + 1 + " / " + roomGalleryUrls.length;
    }
    if (roomGalleryPrev)
      roomGalleryPrev.style.visibility =
        roomGalleryUrls.length > 1 ? "visible" : "hidden";
    if (roomGalleryNext)
      roomGalleryNext.style.visibility =
        roomGalleryUrls.length > 1 ? "visible" : "hidden";
  }

  function openRoomGallery(urls, roomName) {
    if (!urls || !urls.length || !roomGalleryImg) return;
    roomGalleryUrls = urls;
    roomGalleryIndex = 0;
    updateRoomGalleryImage();
    openModal("#roomGalleryModal");
  }

  var roomsGridEl = $("#roomsGrid");
  if (roomsGridEl) {
    roomsGridEl.addEventListener("click", function (e) {
      var card = e.target.closest(".room-card");
      if (!card) return;
      if (
        e.target.closest("[data-add-cart]") ||
        e.target.closest(".room-card__actions")
      )
        return;
      var raw = card.getAttribute("data-room-images");
      if (!raw) return;
      var urls = [];
      try {
        urls = JSON.parse(raw);
      } catch (err) {}
      if (!urls.length) return;
      e.preventDefault();
      var name = card.getAttribute("data-room-name") || "";
      openRoomGallery(urls, name);
    });
  }

  if (roomGalleryPrev) {
    roomGalleryPrev.addEventListener("click", function (e) {
      e.preventDefault();
      if (roomGalleryUrls.length <= 1) return;
      roomGalleryIndex =
        (roomGalleryIndex - 1 + roomGalleryUrls.length) %
        roomGalleryUrls.length;
      updateRoomGalleryImage();
    });
  }
  if (roomGalleryNext) {
    roomGalleryNext.addEventListener("click", function (e) {
      e.preventDefault();
      if (roomGalleryUrls.length <= 1) return;
      roomGalleryIndex = (roomGalleryIndex + 1) % roomGalleryUrls.length;
      updateRoomGalleryImage();
    });
  }

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
      slides.findIndex((s) => s.classList.contains("is-active"))
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
    const container = $("#blobCursor");
    const blob = container
      ? container.querySelector(".blob-cursor__blob")
      : null;
    if (!container || !blob) return;

    const isCoarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) return;

    document.documentElement.classList.add("custom-cursor-active");
    document.body.classList.add("custom-cursor-active");

    let x = 0,
      y = 0;
    let rx = 0,
      ry = 0;
    const lerpRate = 0.55;
    let visible = false;
    let hovering = false;
    let down = false;
    let activeHoverEl = null;

    function setVisible(v) {
      visible = v;
      container.classList.toggle("is-visible", v);
    }

    function updateClasses() {
      container.classList.toggle("is-hover", hovering);
      container.classList.toggle("is-down", down);
    }

    window.addEventListener(
      "mousemove",
      (e) => {
        x = e.clientX;
        y = e.clientY;
        setVisible(true);
      },
      { passive: true }
    );

    window.addEventListener("mouseleave", () => setVisible(false));
    window.addEventListener("mousedown", () => {
      down = true;
      updateClasses();
    });
    window.addEventListener("mouseup", () => {
      down = false;
      updateClasses();
    });

    var textSelector =
      "h1, h2, h3, h4, h5, h6, p, .hero__title, .hero__subtitle, .hero__desc, .section__title, .section__subtitle";
    var hoverSelector =
      'a, button, .btn, input, textarea, [role="button"], .room-card, .terms-card, .gallery__item';
    var headerSelector = ".nav, .admin__header, .footer";
    function isOverHeader(el) {
      return el && el.closest && el.closest(headerSelector);
    }
    document.addEventListener("mouseover", (e) => {
      const target =
        e.target && e.target.closest && e.target.closest(hoverSelector);
      const textEl =
        e.target && e.target.closest && e.target.closest(textSelector);
      hovering = Boolean(target);
      container.classList.toggle("is-hover-text", Boolean(textEl));
      container.classList.toggle("is-over-header", isOverHeader(e.target));
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
        container.classList.remove("is-hover-text");
        container.classList.remove("is-over-header");
        if (activeHoverEl) activeHoverEl.classList.remove("cursor-target");
        activeHoverEl = null;
        updateClasses();
        return;
      }
      const stillHover =
        e.relatedTarget.closest && e.relatedTarget.closest(hoverSelector);
      const stillText =
        e.relatedTarget.closest && e.relatedTarget.closest(textSelector);
      hovering = Boolean(stillHover);
      container.classList.toggle("is-hover-text", Boolean(stillText));
      container.classList.toggle(
        "is-over-header",
        isOverHeader(e.relatedTarget)
      );
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
        blob.style.transform =
          "translate(" +
          rx +
          "px," +
          ry +
          "px) translate(-50%,-50%) scale(" +
          scale +
          ")";
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Init ---
  setupDirections();
  setupHeroSlider();
  setupBlobCursor();
  checkAuth(function (user) {
    if (user) {
      try {
        if (sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) === "cart") {
          sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
          window.location.href = "/cart.html";
        }
      } catch (_) {}
    }
  });
  renderRooms();
})();
