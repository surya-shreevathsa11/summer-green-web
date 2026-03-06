(function () {
  "use strict";
  var POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var serverCart = [];
  var currentUser = null;

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().slice(0, 10);
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

  function updateNavCartCount(count) {
    var el = $("#navCartCount");
    if (el) {
      el.textContent = count;
      el.setAttribute("data-count", count);
    }
  }

  function fetchCart() {
    return fetch("/api/booking/cart", { credentials: "same-origin" })
      .then(function (res) {
        if (res.status === 401) return { unauthorized: true };
        return res.json().then(function (data) {
          if (data.message && Array.isArray(data.message)) {
            serverCart = data.message;
          } else {
            serverCart = [];
          }
          return { ok: res.ok, unauthorized: res.status === 401 };
        });
      })
      .catch(function () { serverCart = []; return { ok: false }; });
  }

  function renderCartList() {
    var listEl = $("#cartList");
    var emptyEl = $("#cartEmpty");
    var footerEl = $("#cartFooter");
    var totalEl = $("#cartTotal");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (serverCart.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      if (footerEl) footerEl.style.display = "none";
      updateNavCartCount(0);
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    if (footerEl) footerEl.style.display = "block";
    var total = 0;
    serverCart.forEach(function (room) {
      var price = room.price || 0;
      total += price;
      var checkIn = formatDate(room.checkIn);
      var checkOut = formatDate(room.checkOut);
      var adults = room.adults != null ? room.adults : (room.children && room.children.adults != null ? room.children.adults : 1);
      var children = room.children != null && typeof room.children === "number" ? room.children : (room.children && room.children.children != null ? room.children.children : 0);
      var roomName = room.roomId || "Room";
      var item = document.createElement("div");
      item.className = "cart__item";
      item.innerHTML =
        '<div class="cart__item-info">' +
          '<div class="cart__item-name">' + escapeHtml(roomName) + '</div>' +
          '<div class="cart__item-meta">' + checkIn + ' – ' + checkOut + (adults || children ? ' · ' + adults + ' adult(s)' + (children ? ', ' + children + ' child(ren)' : '') : '') + '</div>' +
          '<div class="cart__item-price">€' + price + ' total</div>' +
        '</div>' +
        '<button type="button" class="cart__item-remove cursor-target" data-remove data-room-id="' + escapeHtml(room.roomId) + '" data-check-in="' + escapeHtml(checkIn) + '" data-check-out="' + escapeHtml(checkOut) + '">Remove</button>';
      listEl.appendChild(item);
    });
    listEl.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var roomId = btn.getAttribute("data-room-id");
        var checkIn = btn.getAttribute("data-check-in");
        var checkOut = btn.getAttribute("data-check-out");
        removeFromCart(roomId, checkIn, checkOut);
      });
    });
    if (totalEl) totalEl.textContent = "€" + total;
    updateNavCartCount(serverCart.length);
  }

  function removeFromCart(roomId, checkIn, checkOut) {
    fetch("/api/booking/cart", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: roomId, checkIn: checkIn, checkOut: checkOut }),
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        return fetchCart().then(function () {
          renderCartList();
        });
      })
      .catch(function () { fetchCart().then(renderCartList); });
  }

  function onProceedToCheckout() {
    showStep("stepCheckout");
  }

  function openTermsModal() {
    var modal = $("#termsModal");
    if (modal) modal.classList.add("active");
    var cb = $("#termsAccept");
    var btn = $("#termsProceedBtn");
    if (cb) cb.checked = false;
    if (btn) btn.disabled = true;
  }

  function closeTermsModal() {
    var modal = $("#termsModal");
    if (modal) modal.classList.remove("active");
  }

  function init() {
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () {
        navLinks.classList.toggle("open");
      });
    }
    $("#cartList").innerHTML = "";
    fetchCart().then(function (result) {
      if (result.unauthorized) {
        serverCart = [];
        renderCartList();
        return;
      }
      renderCartList();
      try {
        if (sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) === "cart") {
          sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
          if (serverCart.length > 0) showStep("stepCheckout");
        }
      } catch (_) {}
    });

    var cartCheckoutBtn = $("#cartCheckoutBtn");
    if (cartCheckoutBtn) {
      cartCheckoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        onProceedToCheckout();
      });
    }

    var checkoutForm = $("#checkoutForm");
    if (checkoutForm) {
      checkoutForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("#checkoutName").value.trim();
        var email = $("#checkoutEmail").value.trim();
        var phone = $("#checkoutPhone").value.trim();
        var errEl = $("#checkoutError");
        errEl.textContent = "";
        if (!name || !email || !phone) {
          errEl.textContent = "Please fill in name, email and phone.";
          return;
        }
        openTermsModal();
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
        var name = $("#checkoutName").value.trim();
        var email = $("#checkoutEmail").value.trim();
        var phone = $("#checkoutPhone").value.trim();
        termsProceedBtn.disabled = true;
        fetch("/api/booking/checkout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name, email: email, phone: phone }),
        })
          .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
          .then(function (result) {
            if (result.status === 200 && result.data.success && result.data.orderId && result.data.key) {
              closeTermsModal();
              if (window.Razorpay) {
                var options = {
                  key: result.data.key,
                  amount: result.data.amount,
                  order_id: result.data.orderId,
                  name: "Summer Green",
                  description: "Booking",
                  handler: function () { window.location.href = "/?payment=success"; },
                };
                var rzp = new window.Razorpay(options);
                rzp.open();
              } else {
                alert("Razorpay checkout script not loaded. Redirecting to payment page.");
                window.location.href = "/";
              }
            } else {
              alert(result.data.message || "Could not create payment order. Please try again.");
            }
          })
          .catch(function () {
            alert("Something went wrong. Please try again.");
          })
          .finally(function () {
            termsProceedBtn.disabled = false;
          });
      });
    }

    $$("[data-close-terms]").forEach(function (el) {
      el.addEventListener("click", closeTermsModal);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
