(function () {
  "use strict";
  var POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";
  var VaraApi = window.VaraApi;

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var serverCart = [];

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
    $$(".cart-step").forEach(function (el) { el.classList.add("cart-step--hidden"); });
    var step = document.getElementById(stepId);
    if (step) step.classList.remove("cart-step--hidden");
  }

  function updateNavCartCount(count) {
    var el = $("#navCartCount");
    if (el) {
      el.textContent = count;
      el.setAttribute("data-count", count);
    }
  }

  function fetchCart() {
    return VaraApi.getGuestCart()
      .then(function (items) {
        serverCart = items;
        return { ok: true, unauthorized: false };
      })
      .catch(function (err) {
        serverCart = [];
        return { ok: false, unauthorized: !!(err && err.isAuthError), error: err };
      });
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
      var price = room.price || room.total || 0;
      total += price;
      var checkIn = formatDate(room.checkIn);
      var checkOut = formatDate(room.checkOut);
      var adults = room.adults != null ? room.adults : 1;
      var children = room.children != null ? room.children : 0;
      var roomName = room.roomName || room.roomId || room.name || "Room";
      var itemId = room.itemId || room.id || room.cartItemId || "";
      var breakdown = Array.isArray(room.priceBreakdown) ? room.priceBreakdown : [];
      var breakdownHtml = breakdown.length
        ? '<div class="cart__item-breakdown">' +
          breakdown.map(function (row) {
            var d = row.date != null ? formatDate(row.date) : "";
            var p = row.price != null ? row.price : 0;
            var r = row.reason ? escapeHtml(row.reason) : "";
            return '<div class="cart__item-breakdown__row">' +
              (d ? escapeHtml(d) + " - " : "") +
              "INR " + p + (r ? " (" + r + ")" : "") +
              "</div>";
          }).join("") +
          "</div>"
        : "";

      var item = document.createElement("div");
      item.className = "cart__item";
      item.innerHTML =
        '<div class="cart__item-info">' +
        '<div class="cart__item-name">' + escapeHtml(roomName) + "</div>" +
        '<div class="cart__item-meta">' + checkIn + " - " + checkOut +
        (adults || children ? " - " + adults + " adult(s)" + (children ? ", " + children + " kid(s)" : "") : "") +
        "</div>" +
        '<div class="cart__item-price">INR ' + price + " total</div>" +
        breakdownHtml +
        "</div>" +
        '<button type="button" class="cart__item-remove cursor-target" data-remove data-item-id="' + escapeHtml(String(itemId)) +
        '" data-room-id="' + escapeHtml(room.roomId || "") + '" data-check-in="' + escapeHtml(checkIn) +
        '" data-check-out="' + escapeHtml(checkOut) + '">Remove</button>';
      listEl.appendChild(item);
    });

    listEl.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeFromCart(
          btn.getAttribute("data-item-id"),
          btn.getAttribute("data-room-id"),
          btn.getAttribute("data-check-in"),
          btn.getAttribute("data-check-out")
        );
      });
    });
    if (totalEl) totalEl.textContent = "INR " + total;
    updateNavCartCount(serverCart.length);
  }

  function removeFromCart(itemId, roomId, checkIn, checkOut) {
    VaraApi.deleteGuestCartItem({
      itemId: itemId || undefined,
      roomId: roomId || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
    })
      .then(function () { return fetchCart().then(renderCartList); })
      .catch(function () { fetchCart().then(renderCartList); });
  }

  function onProceedToCheckout() { showStep("stepCheckout"); }

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

  function showSignInRequired() {
    var listEl = $("#cartList");
    var emptyEl = $("#cartEmpty");
    var footerEl = $("#cartFooter");
    if (listEl) listEl.innerHTML = "";
    if (footerEl) footerEl.style.display = "none";
    if (emptyEl) {
      emptyEl.style.display = "block";
      emptyEl.innerHTML = "Please sign in on the home page to view your cart and proceed with booking.<br>" +
        '<button type="button" class="btn btn--primary cart__sign-in-btn cursor-target" id="cartSignInBtn" style="margin-top: 0.75rem;">Go to Sign In</button>';
      var btn = document.getElementById("cartSignInBtn");
      if (btn) {
        btn.addEventListener("click", function () {
          try { sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, "cart"); } catch (_) {}
          window.location.href = "/#rooms";
        });
      }
    }
    updateNavCartCount(0);
  }

  function showCartLoadError(message) {
    var listEl = $("#cartList");
    var emptyEl = $("#cartEmpty");
    var footerEl = $("#cartFooter");
    if (listEl) listEl.innerHTML = "";
    if (footerEl) footerEl.style.display = "none";
    if (emptyEl) {
      emptyEl.style.display = "block";
      emptyEl.innerHTML = (message || "Could not load cart right now.") +
        '<br><a href="/#rooms">Go back to rooms</a>.';
    }
    updateNavCartCount(0);
  }

  function init() {
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () { navLinks.classList.toggle("open"); });
    }

    $("#cartList").innerHTML = "";
    fetchCart().then(function (result) {
      if (result.unauthorized) {
        serverCart = [];
        showSignInRequired();
        return;
      }
      if (!result.ok) {
        var msg =
          result.error && result.error.message
            ? result.error.message
            : "Could not load your cart from API.";
        if (result.error && result.error.status === 404) {
          msg = "Cart API endpoint is unavailable on configured backend. Check apiBaseUrl and guest routes.";
        }
        showCartLoadError(msg);
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
      termsAccept.addEventListener("change", function () { termsProceedBtn.disabled = !termsAccept.checked; });
    }

    if (termsProceedBtn) {
      termsProceedBtn.addEventListener("click", function () {
        if (!termsAccept || !termsAccept.checked) return;
        var name = $("#checkoutName").value.trim();
        var email = $("#checkoutEmail").value.trim();
        var phone = $("#checkoutPhone").value.trim();
        termsProceedBtn.disabled = true;

        var rooms = serverCart.map(function (r) {
          return {
            itemId: r.itemId || r.id || r.cartItemId || undefined,
            roomId: r.roomId,
            checkIn: formatDate(r.checkIn),
            checkOut: formatDate(r.checkOut),
            adults: r.adults != null ? r.adults : 1,
            children: r.children != null ? r.children : 0,
          };
        });

        VaraApi.createPaymentOrder({
          name: name,
          email: email,
          phone: phone,
          guest: { name: name, email: email, phone: phone },
          rooms: rooms,
          propertySlug: VaraApi.getConfig().propertySlug,
        })
          .then(function (result) {
            var bookingData = (result && result.data && result.data.order) || (result && result.data) || result || {};
            var razorpayOrderId = bookingData.razorpayOrderId || bookingData.orderId || bookingData.id;
            var razorpayKey = bookingData.key || bookingData.razorpayKey || bookingData.keyId;
            var payableAmount = bookingData.payableAmount != null ? Number(bookingData.payableAmount) : Number(bookingData.totalAmount || 0);

            if (!razorpayOrderId || !razorpayKey) {
              throw new Error("Could not create payment order. Please try again.");
            }

            closeTermsModal();
            if (!window.Razorpay) {
              alert("Razorpay checkout script not loaded. Please refresh the page and try again.");
              termsProceedBtn.disabled = false;
              return;
            }

            var options = {
              key: razorpayKey,
              amount: Math.round(payableAmount * 100),
              currency: bookingData.currency || "INR",
              order_id: razorpayOrderId,
              name: "Summer Green",
              description: "Room Booking",
              prefill: { name: name, email: email, contact: phone },
              handler: function (response) {
                VaraApi.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })
                  .then(function () { window.location.href = "/?payment=success"; })
                  .catch(function (error) {
                    alert((error && error.message ? error.message : "Could not verify payment.") + " Payment ID: " + response.razorpay_payment_id);
                    termsProceedBtn.disabled = false;
                  });
              },
              modal: { ondismiss: function () { termsProceedBtn.disabled = false; } },
            };

            var rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (response) {
              alert("Payment failed: " + (response.error.description || "Please try again."));
              termsProceedBtn.disabled = false;
            });
            rzp.open();
          })
          .catch(function (err) {
            alert(err && err.message ? err.message : "Something went wrong. Please try again.");
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
