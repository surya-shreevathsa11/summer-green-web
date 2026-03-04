(function () {
  "use strict";
  var CART_STORAGE_KEY = "summer-green-booking-cart";
  var POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var bookingCart = [];
  try {
    var saved = sessionStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) bookingCart = parsed;
    }
  } catch (_) {}

  var currentUser = null;

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function persistCart() {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(bookingCart));
    } catch (_) {}
  }

  function removeFromCart(roomId) {
    bookingCart = bookingCart.filter(function (r) { return r.id !== roomId; });
    persistCart();
    updateCartUI();
  }

  function updateCartUI() {
    var countEl = $("#navCartCount");
    if (countEl) {
      countEl.textContent = bookingCart.length;
      countEl.setAttribute("data-count", bookingCart.length);
    }
    var listEl = $("#cartList");
    var emptyEl = $("#cartEmpty");
    var footerEl = $("#cartFooter");
    var totalEl = $("#cartTotal");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (bookingCart.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (footerEl) footerEl.style.display = "none";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    if (footerEl) footerEl.style.display = "block";
    var total = 0;
    bookingCart.forEach(function (room) {
      total += room.price;
      var item = document.createElement("div");
      item.className = "cart__item";
      item.innerHTML =
        '<div class="cart__item-info">' +
          '<div class="cart__item-name">' + escapeHtml(room.name) + '</div>' +
          '<div class="cart__item-price">&euro;' + room.price + ' / night</div>' +
        '</div>' +
        '<button type="button" class="cart__item-remove" data-remove="' + room.id + '">Remove</button>';
      listEl.appendChild(item);
    });
    listEl.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeFromCart(Number(btn.dataset.remove));
      });
    });
    if (totalEl) totalEl.textContent = "€" + total;
  }

  function showStep(stepId) {
    $$(".cart-step").forEach(function (el) {
      el.classList.add("cart-step--hidden");
    });
    var step = document.getElementById(stepId);
    if (step) step.classList.remove("cart-step--hidden");
  }

  function checkAuth(cb) {
    fetch("/api/auth/status", { credentials: "same-origin" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        currentUser = data.loggedIn ? data.user : null;
        if (cb) cb(currentUser);
      })
      .catch(function () { if (cb) cb(null); });
  }

  function onProceedToCheckout() {
    if (bookingCart.length === 0) return;
    checkAuth(function (user) {
      if (!user) {
        try {
          sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, "cart");
        } catch (_) {}
        window.location.href = "/";
        return;
      }
      showStep("stepCheckout");
      var today = new Date().toISOString().slice(0, 10);
      var checkInEl = $("#checkoutCheckIn");
      var checkOutEl = $("#checkoutCheckOut");
      if (checkInEl) checkInEl.min = today;
      if (checkOutEl) checkOutEl.min = today;
    });
  }

  function init() {
    updateCartUI();
    checkAuth();

    var list = $("#cartList");
    if (list) {
      list.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-remove]");
        if (btn) removeFromCart(Number(btn.dataset.remove));
      });
    }

    var cartCheckoutBtn = $("#cartCheckoutBtn");
    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        onProceedToCheckout();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var checkInEl = $("#checkoutCheckIn");
  if (checkInEl) {
    checkInEl.addEventListener("change", function () {
      var checkOut = $("#checkoutCheckOut");
      if (checkOut && checkInEl.value) checkOut.min = checkInEl.value;
    });
  }

  var checkoutForm = $("#checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var errEl = $("#checkoutError");
      var adults = parseInt($("#checkoutAdults").value, 10) || 1;
      var checkIn = $("#checkoutCheckIn").value;
      var checkOut = $("#checkoutCheckOut").value;
      errEl.textContent = "";
      if (adults < 1) {
        errEl.textContent = "At least 1 adult is required.";
        return;
      }
      if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
        errEl.textContent = "Check-out must be after check-in.";
        return;
      }
      showStep("stepTerms");
    });
  }

  var termsAccept = $("#termsAccept");
  var termsProceedBtn = $("#termsProceedBtn");
  if (termsAccept && termsProceedBtn) {
    termsAccept.addEventListener("change", function () {
      termsProceedBtn.disabled = !termsAccept.checked;
    });
  }
  if (termsProceedBtn) {
    termsProceedBtn.addEventListener("click", function () {
      if (!termsAccept || !termsAccept.checked) return;
      showStep("stepPayment");
    });
  }

  var paymentRedirectBtn = $("#paymentRedirectBtn");
  if (paymentRedirectBtn) {
    paymentRedirectBtn.addEventListener("click", function () {
      alert("Razorpay payment gateway will be integrated once bank details and backend verification are confirmed. Your booking details have been recorded for testing.");
      bookingCart = [];
      try {
        sessionStorage.removeItem(CART_STORAGE_KEY);
      } catch (_) {}
      window.location.href = "/";
    });
  }

  // Post-login redirect: if we landed here after sign-in, go to checkout step
  try {
    if (sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) === "cart" && bookingCart.length > 0) {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      checkAuth(function (user) {
        if (user) {
          showStep("stepCheckout");
          var today = new Date().toISOString().slice(0, 10);
          var ci = $("#checkoutCheckIn");
          var co = $("#checkoutCheckOut");
          if (ci) ci.min = today;
          if (co) co.min = today;
        }
      });
    }
  } catch (_) {}
})();
