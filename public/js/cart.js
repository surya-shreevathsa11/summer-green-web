(function () {
  "use strict";
  var POST_LOGIN_REDIRECT_KEY = "summer-green-post-login";
  var VaraApi = window.VaraApi;

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var serverCart = [];
  var cartSummary = {
    totalPrice: 0,
    lowerPayableTotal: null,
    upperPayableTotal: null,
    lowerPercent: null,
    upperPercent: null,
  };
  var selectedPaymentPlan = null;

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
    return VaraApi.getGuestCartDetails()
      .then(function (details) {
        serverCart = (details && details.items) || [];
        cartSummary = (details && details.summary) || cartSummary;
        return { ok: true, unauthorized: false };
      })
      .catch(function (err) {
        serverCart = [];
        cartSummary = {
          totalPrice: 0,
          lowerPayableTotal: null,
          upperPayableTotal: null,
          lowerPercent: null,
          upperPercent: null,
        };
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
      selectedPaymentPlan = null;
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
      var breakdownId = "breakdown-" + (room.itemId || room.roomId || Math.random().toString(36).slice(2));
      var hasBreakdown = breakdown.length > 0;
      var breakdownHtml = hasBreakdown
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
        '<div class="cart__item-card">' +
          '<div class="cart__item-info">' +
            '<div class="cart__item-name">' + escapeHtml(roomName) + "</div>" +
            '<div class="cart__item-meta">' + checkIn + " to " + checkOut +
              (adults || children ? " - " + adults + " adult(s)" + (children ? ", " + children + " kid(s)" : "") : "") +
            "</div>" +
            '<div class="cart__item-price">INR ' + price + "</div>" +
            (hasBreakdown
              ? '<button type="button" class="cart__details-toggle" data-toggle-breakdown="' + escapeHtml(breakdownId) + '">View detailed pricing</button>'
              : "") +
            (hasBreakdown
              ? '<div id="' + escapeHtml(breakdownId) + '" class="cart__details-wrap" style="display:none;">' + breakdownHtml + "</div>"
              : "") +
          "</div>" +
          '<button type="button" class="cart__item-remove cursor-target" aria-label="Remove room" title="Remove room" data-remove data-item-id="' + escapeHtml(String(itemId)) +
          '" data-room-id="' + escapeHtml(room.roomId || "") + '" data-check-in="' + escapeHtml(checkIn) +
          '" data-check-out="' + escapeHtml(checkOut) + '">✕</button>' +
        "</div>";
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
    listEl.querySelectorAll("[data-toggle-breakdown]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("data-toggle-breakdown");
        var el = targetId ? document.getElementById(targetId) : null;
        if (!el) return;
        var isHidden = el.style.display === "none";
        el.style.display = isHidden ? "block" : "none";
        btn.textContent = isHidden ? "Hide detailed pricing" : "View detailed pricing";
      });
    });
    var totalFromBackend =
      cartSummary && cartSummary.totalPrice != null
        ? Number(cartSummary.totalPrice)
        : total;
    if (totalEl) totalEl.textContent = "INR " + totalFromBackend;
    var payableEl = $("#cartPayableSummary");
    if (payableEl) {
      var lower = cartSummary && cartSummary.lowerPayableTotal != null ? Number(cartSummary.lowerPayableTotal) : null;
      var upper = cartSummary && cartSummary.upperPayableTotal != null ? Number(cartSummary.upperPayableTotal) : null;
      var lowerPct = cartSummary && cartSummary.lowerPercent != null ? Number(cartSummary.lowerPercent) : null;
      var upperPct = cartSummary && cartSummary.upperPercent != null ? Number(cartSummary.upperPercent) : null;
      if (lower != null || upper != null) {
        payableEl.style.display = "block";
        if (!selectedPaymentPlan && lower != null) {
          selectedPaymentPlan = {
            kind: "lower",
            percent: lowerPct,
            payableAmount: lower,
            refundAvailable: false,
            optionId: "standard",
          };
        }
        var selectedLabel = selectedPaymentPlan
          ? "Selected: " + (selectedPaymentPlan.percent != null ? selectedPaymentPlan.percent + "%" : "custom") +
            " (" + (selectedPaymentPlan.refundAvailable ? "refundable" : "non-refundable") + ")"
          : "Select a payment option";
        payableEl.innerHTML =
          '<div class="cart__payable-title">Estimated advance (pay after approval)</div>' +
          '<div class="cart__payment-options">' +
          (lower != null
            ? '<label class="cart__payment-option"><input type="radio" name="cartPayOption" value="lower"' +
              (selectedPaymentPlan && selectedPaymentPlan.kind === "lower" ? " checked" : "") +
              '><span>Pay ' + (lowerPct != null ? lowerPct : "30") + '% (non-refundable) <strong>INR ' + lower + "</strong></span></label>"
            : "") +
          (upper != null
            ? '<label class="cart__payment-option"><input type="radio" name="cartPayOption" value="upper"' +
              (selectedPaymentPlan && selectedPaymentPlan.kind === "upper" ? " checked" : "") +
              '><span>Pay ' + (upperPct != null ? upperPct : "50") + '% (refundable) <strong>INR ' + upper + "</strong></span></label>"
            : "") +
          '<div class="cart__payment-selected">' + escapeHtml(selectedLabel) + "</div>" +
          "</div>";

        payableEl.querySelectorAll('input[name="cartPayOption"]').forEach(function (input) {
          input.addEventListener("change", function () {
            if (input.value === "lower") {
              selectedPaymentPlan = {
                kind: "lower",
                percent: lowerPct,
                payableAmount: lower,
                refundAvailable: false,
                optionId: "standard",
              };
            } else if (input.value === "upper") {
              selectedPaymentPlan = {
                kind: "upper",
                percent: upperPct,
                payableAmount: upper,
                refundAvailable: true,
                optionId: "primary",
              };
            }
            renderCartList();
          });
        });
      } else {
        payableEl.style.display = "none";
        payableEl.innerHTML = "";
        selectedPaymentPlan = null;
      }
    }
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
    var payableEl = $("#cartPayableSummary");
    if (payableEl) {
      payableEl.style.display = "none";
      payableEl.innerHTML = "";
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
    var payableEl = $("#cartPayableSummary");
    if (payableEl) {
      payableEl.style.display = "none";
      payableEl.innerHTML = "";
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
        var errEl = $("#checkoutError");
        termsProceedBtn.disabled = true;

        VaraApi.createBookingRequest({
          name: name,
          email: email,
          phone: phone,
        })
          .then(function () {
            closeTermsModal();
            serverCart = [];
            selectedPaymentPlan = null;
            renderCartList();
            updateNavCartCount(0);
            showStep("stepRequestSuccess");
            try {
              sessionStorage.setItem("summer-green-open-bookings", "1");
            } catch (_) {}
          })
          .catch(function (err) {
            closeTermsModal();
            if (errEl) {
              errEl.textContent =
                err && err.message
                  ? err.message
                  : "Could not submit booking request. Please try again.";
            } else {
              alert(err && err.message ? err.message : "Could not submit booking request. Please try again.");
            }
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
