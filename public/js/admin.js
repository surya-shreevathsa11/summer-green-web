(function () {
  "use strict";

  // ─── DOM refs ────────────────────────────────────────────────────────────────
  var viewLogin = document.getElementById("adminLogin");
  var viewOtp = document.getElementById("adminOtp");
  var viewDenied = document.getElementById("adminDenied");
  var viewDashboard = document.getElementById("adminDashboard");

  var adminLoginForm = document.getElementById("adminLoginForm");
  var adminUsername = document.getElementById("adminUsername");
  var adminPassword = document.getElementById("adminPassword");
  var adminPasswordToggle = document.getElementById("adminPasswordToggle");
  var adminLoginError = document.getElementById("adminLoginError");

  var adminOtpForm = document.getElementById("adminOtpForm");
  var adminOtpInput = document.getElementById("adminOtpInput");
  var adminOtpError = document.getElementById("adminOtpError");

  var adminRetryBtn = document.getElementById("adminRetryBtn");
  var adminLogoutBtn = document.getElementById("adminLogoutBtn");
  var adminHeaderSubtitle = document.getElementById("adminHeaderSubtitle");
  var adminHeaderUsername = document.getElementById("adminHeaderUsername");
  var statTotalBookings = document.getElementById("statTotalBookings");
  var statConfirmed = document.getElementById("statConfirmed");
  var statPending = document.getElementById("statPending");
  var statBlockedDates = document.getElementById("statBlockedDates");

  var basePriceGrid = document.getElementById("basePriceGrid");
  var saveBasePriceBtn = document.getElementById("saveBasePriceBtn");
  var basePriceMsg = document.getElementById("basePriceMsg");

  var addSeasonalBtn = document.getElementById("addSeasonalBtn");
  var seasonalList = document.getElementById("seasonalList");
  var seasonalMsg = document.getElementById("seasonalMsg");

  var bookingsBody = document.getElementById("bookingsBody");
  var bookingsEmpty = document.getElementById("bookingsEmpty");

  var blockDatesMsg = document.getElementById("blockDatesMsg");
  var blockRoom = document.getElementById("blockRoom");
  var blockFrom = document.getElementById("blockFrom");
  var blockTo = document.getElementById("blockTo");
  var addBlockDateBtn = document.getElementById("addBlockDateBtn");
  var blockDatesList = document.getElementById("blockDatesList");

  // ─── State ───────────────────────────────────────────────────────────────────
  var loggedInUsername = "";
  var seasonalPrices = [];
  var bookingsCache = [];
  var blockedDatesList = [];

  var roomList = [
    { id: "R1", name: "Sunflower" },
    { id: "R2", name: "Lily" },
    { id: "R3", name: "Marigold" },
    { id: "R4", name: "Lavender" },
    { id: "R5", name: "Dahlia" },
    { id: "R6", name: "Gardenia" },
    { id: "R7", name: "Petunia" },
    { id: "R8", name: "Zinnia" },
  ];

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function showView(id) {
    [viewLogin, viewOtp, viewDenied, viewDashboard].forEach(function (el) {
      if (el) el.style.display = el.id === id ? "block" : "none";
    });
    var body = document.body;
    if (body) {
      if (id === "adminDashboard") body.classList.add("admin--dashboard");
      else body.classList.remove("admin--dashboard");
    }
    if (adminLogoutBtn) {
      adminLogoutBtn.style.display = id === "adminDashboard" ? "" : "none";
    }
    if (adminHeaderSubtitle) {
      adminHeaderSubtitle.style.display = id === "adminDashboard" ? "" : "none";
    }
    if (adminHeaderUsername) {
      adminHeaderUsername.style.display = id === "adminDashboard" ? "" : "none";
      if (id === "adminDashboard") adminHeaderUsername.textContent = loggedInUsername || "";
    }
    if (id === "adminDashboard") refreshStats();
  }

  function refreshStats() {
    var total = bookingsCache.length;
    var confirmed = bookingsCache.filter(function (b) { return b.status === "confirmed"; }).length;
    var pending = bookingsCache.filter(function (b) { return b.status === "pending"; }).length;
    var blockedCount = blockedDatesList.length;
    if (statTotalBookings) statTotalBookings.textContent = total;
    if (statConfirmed) statConfirmed.textContent = confirmed;
    if (statPending) statPending.textContent = pending;
    if (statBlockedDates) statBlockedDates.textContent = blockedCount;
  }

  function switchTab(tabId) {
    var tabs = { bookings: "tabContentBookings", pricing: "tabContentPricing", blockdates: "tabContentBlockDates" };
    var contentId = tabs[tabId];
    if (!contentId) return;
    document.querySelectorAll(".admin__tab-btn").forEach(function (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".admin__tab-content").forEach(function (panel) {
      panel.classList.remove("active");
      panel.style.display = "none";
    });
    var btn = document.getElementById("tabBookings");
    if (tabId === "pricing") btn = document.getElementById("tabPricing");
    if (tabId === "blockdates") btn = document.getElementById("tabBlockDates");
    if (btn) { btn.classList.add("active"); btn.setAttribute("aria-selected", "true"); }
    var panel = document.getElementById(contentId);
    if (panel) { panel.classList.add("active"); panel.style.display = "block"; }
  }

  function setMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.className =
      "admin__msg " + (isError ? "admin__msg--error" : "admin__msg--success");
    el.style.display = text ? "block" : "none";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function apiPost(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {}
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function apiGet(url) {
    return fetch(url, { credentials: "include" }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function apiPatch(url, body) {
    return fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function apiPut(url, body) {
    return fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function apiDelete(url) {
    return fetch(url, {
      method: "DELETE",
      credentials: "include",
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {}
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────────
  function doLogin() {
    var username = adminUsername ? adminUsername.value.trim() : "";
    var password = adminPassword ? adminPassword.value : "";

    if (!username || !password) {
      setMsg(adminLoginError, "Please enter username and password.", true);
      return;
    }

    setMsg(adminLoginError, "");

    apiPost("/api/admin/login", { username: username, password: password })
      .then(function (r) {
        if (r.ok) {
          loggedInUsername = username;
          showView("adminOtp");
          if (adminOtpInput) {
            adminOtpInput.value = "";
            adminOtpInput.focus();
          }
        } else {
          setMsg(
            adminLoginError,
            (r.data && r.data.message) || "Login failed.",
            true
          );
        }
      })
      .catch(function () {
        setMsg(adminLoginError, "Network error. Please try again.", true);
      });
  }

  function doVerifyOtp() {
    var otp = adminOtpInput ? adminOtpInput.value.trim() : "";

    if (!otp) {
      setMsg(adminOtpError, "Please enter the OTP.", true);
      return;
    }
    if (!loggedInUsername) {
      setMsg(adminOtpError, "Session expired. Please sign in again.", true);
      showView("adminLogin");
      return;
    }

    setMsg(adminOtpError, "");

    apiPost("/api/admin/verify-otp", { username: loggedInUsername, otp: otp })
      .then(function (r) {
        if (r.ok) {
          showView("adminDashboard");
          renderBasePrices();
          renderSeasonal();
          loadBlockDates();
          loadBookings();
        } else {
          setMsg(
            adminOtpError,
            (r.data && r.data.message) || "Invalid OTP.",
            true
          );
        }
      })
      .catch(function () {
        setMsg(adminOtpError, "Network error. Please try again.", true);
      });
  }

  // ─── Password toggle ─────────────────────────────────────────────────────────
  if (adminPasswordToggle && adminPassword) {
    adminPasswordToggle.addEventListener("click", function () {
      var isPassword = adminPassword.getAttribute("type") === "password";
      adminPassword.setAttribute("type", isPassword ? "text" : "password");
      var eyeOn = document.querySelector(".admin__eye-icon");
      var eyeOff = document.querySelector(".admin__eye-off-icon");
      if (eyeOn) eyeOn.style.display = isPassword ? "none" : "block";
      if (eyeOff) eyeOff.style.display = isPassword ? "block" : "none";
      adminPasswordToggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );
    });
  }

  // ─── Base prices ─────────────────────────────────────────────────────────────
  function renderBasePrices() {
    if (!basePriceGrid) return;
    basePriceGrid.innerHTML = roomList
      .map(function (r) {
        return (
          '<div class="admin__price-row">' +
          '<label for="bp-' +
          r.id +
          '">' +
          r.name +
          ' <span class="admin__room-id">(' +
          r.id +
          ")</span></label>" +
          '<input type="number" id="bp-' +
          r.id +
          '" data-room="' +
          r.id +
          '" min="0" step="1" value="0" placeholder="0">' +
          "</div>"
        );
      })
      .join("");
  }

  if (saveBasePriceBtn) {
    saveBasePriceBtn.addEventListener("click", function () {
      var payload = roomList.map(function (r) {
        var input = document.getElementById("bp-" + r.id);
        return {
          roomId: r.id,
          pricePerNight: input ? Number(input.value) || 0 : 0,
        };
      });

      apiPut("/api/admin/base-price", { rooms: payload })
        .then(function (r) {
          if (r.ok) {
            setMsg(basePriceMsg, "Base prices updated successfully.", false);
          } else {
            setMsg(
              basePriceMsg,
              (r.data && r.data.message) || "Failed to save.",
              true
            );
          }
        })
        .catch(function () {
          setMsg(basePriceMsg, "Network error. Could not save.", true);
        });
    });
  }

  // ─── Seasonal pricing ─────────────────────────────────────────────────────────
  if (addSeasonalBtn) {
    addSeasonalBtn.addEventListener("click", function () {
      var roomEl = document.getElementById("seasonRoom");
      var fromEl = document.getElementById("seasonFrom");
      var toEl = document.getElementById("seasonTo");
      var priceEl = document.getElementById("seasonPrice");
      var reasonEl = document.getElementById("seasonReason");

      var fromVal = fromEl ? fromEl.value : "";
      var toVal = toEl ? toEl.value : "";
      var priceVal = priceEl ? Number(priceEl.value) : 0;
      var reasonVal = reasonEl ? reasonEl.value.trim() : "";

      if (!fromVal || !toVal) {
        setMsg(seasonalMsg, "Please set from and to dates.", true);
        return;
      }
      if (fromVal >= toVal) {
        setMsg(seasonalMsg, "From date must be before to date.", true);
        return;
      }
      if (!priceVal || priceVal <= 0) {
        setMsg(seasonalMsg, "Please enter a valid price.", true);
        return;
      }

      var entry = {
        roomId: roomEl ? roomEl.value : "R1",
        from: fromVal,
        to: toVal,
        pricePerNight: priceVal,
        reason: reasonVal || "Seasonal",
      };

      // Send to backend
      apiPost("/api/admin/seasonal-price", entry)
        .then(function (r) {
          if (r.ok) {
            seasonalPrices.push(entry);
            setMsg(seasonalMsg, "Seasonal price added.", false);
            renderSeasonal();
            if (fromEl) fromEl.value = "";
            if (toEl) toEl.value = "";
            if (priceEl) priceEl.value = "";
            if (reasonEl) reasonEl.value = "";
          } else {
            setMsg(
              seasonalMsg,
              (r.data && r.data.message) || "Failed to add.",
              true
            );
          }
        })
        .catch(function () {
          setMsg(seasonalMsg, "Network error. Could not add.", true);
        });
    });
  }

  function renderSeasonal() {
    if (!seasonalList) return;
    if (seasonalPrices.length === 0) {
      seasonalList.innerHTML =
        '<p class="admin__empty">No seasonal pricing added yet.</p>';
      return;
    }
    seasonalList.innerHTML = seasonalPrices
      .map(function (s, i) {
        return (
          '<div class="admin__season-item">' +
          "<span>" +
          s.roomId +
          " · " +
          s.from +
          " – " +
          s.to +
          " · ₹" +
          s.pricePerNight +
          "/night" +
          (s.reason ? " <em>(" + s.reason + ")</em>" : "") +
          "</span>" +
          '<button type="button" class="btn btn--outline btn--sm" data-season-index="' +
          i +
          '">Remove</button>' +
          "</div>"
        );
      })
      .join("");

    seasonalList
      .querySelectorAll("[data-season-index]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-season-index"), 10);
          seasonalPrices.splice(idx, 1);
          renderSeasonal();
        });
      });
  }

  // ─── Block dates ─────────────────────────────────────────────────────────────
  function loadBlockDates() {
    apiGet("/api/admin/block-dates")
      .then(function (r) {
        blockedDatesList = (r.data && r.data.data) || [];
        renderBlockDates();
        refreshStats();
      })
      .catch(function () {
        blockedDatesList = [];
        renderBlockDates();
        refreshStats();
      });
  }

  function renderBlockDates() {
    if (!blockDatesList) return;
    if (blockedDatesList.length === 0) {
      blockDatesList.innerHTML =
        '<p class="admin__empty">No blocked dates. Add a block to make a room unavailable for specific dates.</p>';
      return;
    }
    blockDatesList.innerHTML = blockedDatesList
      .map(function (b) {
        var fromStr = b.from ? b.from.toString().slice(0, 10) : "";
        var toStr = b.to ? b.to.toString().slice(0, 10) : "";
        var id = (b._id || b.id || "").toString();
        return (
          '<div class="admin__season-item">' +
          "<span>" +
          (b.roomId || "") +
          " · " +
          fromStr +
          " – " +
          toStr +
          "</span>" +
          '<button type="button" class="btn btn--outline btn--sm" data-block-id="' +
          escapeHtml(id) +
          '">Remove</button>' +
          "</div>"
        );
      })
      .join("");

    blockDatesList.querySelectorAll("[data-block-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-block-id");
        if (!id) return;
        apiDelete("/api/admin/block-dates/" + id).then(function (r) {
          if (r.ok) {
            blockedDatesList = blockedDatesList.filter(
              function (b) {
                return (b._id || b.id || "").toString() !== id;
              }
            );
            renderBlockDates();
            refreshStats();
            setMsg(blockDatesMsg, "Block removed.", false);
          } else {
            setMsg(
              blockDatesMsg,
              (r.data && r.data.message) || "Failed to remove block.",
              true
            );
          }
        });
      });
    });
  }

  if (addBlockDateBtn) {
    addBlockDateBtn.addEventListener("click", function () {
      var fromVal = blockFrom ? blockFrom.value : "";
      var toVal = blockTo ? blockTo.value : "";

      if (!fromVal || !toVal) {
        setMsg(blockDatesMsg, "Please set from and to dates.", true);
        return;
      }
      if (fromVal >= toVal) {
        setMsg(blockDatesMsg, "From date must be before to date.", true);
        return;
      }

      var payload = {
        roomId: blockRoom ? blockRoom.value : "R1",
        from: fromVal,
        to: toVal,
      };

      apiPost("/api/admin/block-dates", payload)
        .then(function (r) {
          if (r.ok && r.data && r.data.data) {
            blockedDatesList.push(r.data.data);
            renderBlockDates();
            refreshStats();
            setMsg(blockDatesMsg, "Dates blocked successfully.", false);
            if (blockFrom) blockFrom.value = "";
            if (blockTo) blockTo.value = "";
          } else {
            setMsg(
              blockDatesMsg,
              (r.data && r.data.message) || "Failed to add block.",
              true
            );
          }
        })
        .catch(function () {
          setMsg(blockDatesMsg, "Network error. Could not add block.", true);
        });
    });
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────────
  var applyFilterBtn = document.getElementById("applyFilterBtn");
  var clearFilterBtn = document.getElementById("clearFilterBtn");
  var filterStatus = document.getElementById("filterStatus");
  var filterUpcoming = document.getElementById("filterUpcoming");

  function buildBookingsUrl() {
    var params = [];
    var status = filterStatus ? filterStatus.value : "";
    var upcoming = filterUpcoming ? filterUpcoming.value : "";
    if (status) params.push("status=" + encodeURIComponent(status));
    if (upcoming) params.push("upcoming=" + encodeURIComponent(upcoming));
    return (
      "/api/admin/bookings" + (params.length ? "?" + params.join("&") : "")
    );
  }

  function loadBookings() {
    if (bookingsBody)
      bookingsBody.innerHTML =
        "<tr><td colspan='9' style='text-align:center;padding:1.5rem;color:#a89878;'>Loading…</td></tr>";
    if (bookingsEmpty) bookingsEmpty.style.display = "none";

    apiGet(buildBookingsUrl())
      .then(function (r) {
        var list = (r.data && r.data.data) || [];
        bookingsCache = list;
        renderBookingsTable(list);
        refreshStats();
      })
      .catch(function () {
        if (bookingsEmpty) {
          bookingsEmpty.textContent = "Could not load bookings.";
          bookingsEmpty.style.display = "block";
        }
        if (bookingsBody) bookingsBody.innerHTML = "";
      });
  }

  if (applyFilterBtn) applyFilterBtn.addEventListener("click", loadBookings);

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", function () {
      if (filterStatus) filterStatus.value = "";
      if (filterUpcoming) filterUpcoming.value = "";
      loadBookings();
    });
  }

  [["tabBookings", "bookings"], ["tabPricing", "pricing"], ["tabBlockDates", "blockdates"]].forEach(function (pair) {
    var btn = document.getElementById(pair[0]);
    if (btn) btn.addEventListener("click", function () { switchTab(pair[1]); });
  });

  function renderBookingsTable(list) {
    if (!bookingsBody) return;

    if (list.length === 0) {
      if (bookingsEmpty) bookingsEmpty.style.display = "block";
      bookingsBody.innerHTML = "";
      return;
    }

    if (bookingsEmpty) bookingsEmpty.style.display = "none";

    var statusBadgeClass = {
      confirmed: "admin__badge--confirmed",
      pending: "admin__badge--pending",
      cancelled: "admin__badge--cancelled",
      blocked: "admin__badge--blocked",
    };

    bookingsBody.innerHTML = list
      .map(function (b) {
        var rooms = b.rooms || [];
        var roomsSummary = rooms
          .map(function (r) {
            return r.roomName || r.roomId || "—";
          })
          .join(", ");
        var totalAdults = rooms.reduce(function (sum, r) { return sum + (r.adults || 0); }, 0);
        var totalKids = rooms.reduce(function (sum, r) { return sum + (r.children || 0); }, 0);
        var guestsText = totalAdults || totalKids ? (totalAdults + "A" + (totalKids ? ", " + totalKids + "K" : "")) : "—";
        var checkIns = rooms
          .map(function (r) {
            return formatDate(r.checkIn);
          })
          .join("<br>");
        var checkOuts = rooms
          .map(function (r) {
            return formatDate(r.checkOut);
          })
          .join("<br>");
        var id = escapeHtml(b._id || b.id || "");
        var currentStatus = b.status || "pending";
        var badgeClass = statusBadgeClass[currentStatus] || "";

        var statusOptions = ["pending", "confirmed", "cancelled", "blocked"]
          .map(function (s) {
            return (
              '<option value="' +
              s +
              '"' +
              (s === currentStatus ? " selected" : "") +
              ">" +
              s.charAt(0).toUpperCase() +
              s.slice(1) +
              "</option>"
            );
          })
          .join("");

        return (
          "<tr data-booking-id='" +
          id +
          "'>" +
          "<td>" +
          "<span class='admin__guest-name'>" +
          escapeHtml((b.guest && b.guest.name) || "—") +
          "</span><br><small>" +
          escapeHtml((b.guest && b.guest.email) || "") +
          "</small></td>" +
          "<td>" +
          escapeHtml((b.guest && b.guest.phone) || "—") +
          "</td>" +
          "<td>" +
          escapeHtml(roomsSummary) +
          "</td>" +
          "<td>" +
          escapeHtml(guestsText) +
          "</td>" +
          "<td>" +
          checkIns +
          "</td>" +
          "<td>" +
          checkOuts +
          "</td>" +
          "<td>₹" +
          (b.totalAmount || 0).toLocaleString("en-IN") +
          "<br><small class='admin__paid'>Paid: ₹" +
          (b.amountPaid || 0).toLocaleString("en-IN") +
          "</small></td>" +
          "<td class='admin__status-cell'>" +
          "<span class='admin__badge " +
          badgeClass +
          "' data-status-badge='" +
          id +
          "'>" +
          currentStatus +
          "</span>" +
          "</td>" +
          "<td class='admin__edit-cell'>" +
          "<button type='button' class='btn btn--ghost btn--sm admin__edit-btn' data-booking-id='" +
          id +
          "'>Edit</button>" +
          "<div class='admin__edit-panel' id='editPanel-" +
          id +
          "' style='display:none;'>" +
          "<select class='admin__status-select' data-booking-id='" +
          id +
          "'>" +
          statusOptions +
          "</select>" +
          "<button type='button' class='admin__status-save btn btn--primary btn--sm' data-booking-id='" +
          id +
          "'>Save</button>" +
          "<button type='button' class='admin__edit-cancel btn btn--ghost btn--sm' data-booking-id='" +
          id +
          "'>✕</button>" +
          "<span class='admin__inline-msg' data-msg-id='" +
          id +
          "'></span>" +
          "</div>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    // Edit button — show panel, hide Edit button
    bookingsBody.querySelectorAll(".admin__edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-booking-id");
        var panel = document.getElementById("editPanel-" + id);
        if (panel) panel.style.display = "flex";
        btn.style.display = "none";
      });
    });

    // Cancel button — hide panel, show Edit button
    bookingsBody
      .querySelectorAll(".admin__edit-cancel")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-booking-id");
          var panel = document.getElementById("editPanel-" + id);
          var editBtn = bookingsBody.querySelector(
            ".admin__edit-btn[data-booking-id='" + id + "']"
          );
          if (panel) panel.style.display = "none";
          if (editBtn) editBtn.style.display = "";
        });
      });

    // Save button
    bookingsBody
      .querySelectorAll(".admin__status-save")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-booking-id");
          var select = bookingsBody.querySelector(
            ".admin__status-select[data-booking-id='" + id + "']"
          );
          var msgEl = bookingsBody.querySelector(
            ".admin__inline-msg[data-msg-id='" + id + "']"
          );
          var badge = bookingsBody.querySelector(
            "[data-status-badge='" + id + "']"
          );
          var status = select ? select.value : "";

          if (!id || !status) return;
          btn.disabled = true;
          if (msgEl) {
            msgEl.textContent = "Saving…";
            msgEl.className = "admin__inline-msg";
          }

          apiPatch("/api/admin/bookings/" + id, { status: status })
            .then(function (r) {
              if (r.ok) {
                if (badge) {
                  badge.textContent = status;
                  badge.className =
                    "admin__badge " + (statusBadgeClass[status] || "");
                }
                if (msgEl) {
                  msgEl.textContent = "✓ Saved";
                  msgEl.className = "admin__inline-msg admin__inline-msg--ok";
                }
                setTimeout(function () {
                  var panel = document.getElementById("editPanel-" + id);
                  var editBtn = bookingsBody.querySelector(
                    ".admin__edit-btn[data-booking-id='" + id + "']"
                  );
                  if (panel) panel.style.display = "none";
                  if (editBtn) editBtn.style.display = "";
                  if (msgEl) msgEl.textContent = "";
                }, 1500);
              } else {
                if (msgEl) {
                  msgEl.textContent = (r.data && r.data.message) || "Failed";
                  msgEl.className = "admin__inline-msg admin__inline-msg--err";
                }
              }
            })
            .catch(function () {
              if (msgEl) {
                msgEl.textContent = "Network error";
                msgEl.className = "admin__inline-msg admin__inline-msg--err";
              }
            })
            .finally(function () {
              btn.disabled = false;
            });
        });
      });
  }

  // ─── Utility ──────────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  // ─── Event listeners ──────────────────────────────────────────────────────────
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      doLogin();
    });
  }

  if (adminOtpForm) {
    adminOtpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      doVerifyOtp();
    });
  }

  if (adminRetryBtn) {
    adminRetryBtn.addEventListener("click", function () {
      showView("adminLogin");
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", function () {
      apiPost("/api/admin/logout", {})
        .then(function (r) {
          loggedInUsername = "";
          showView("adminLogin");
        })
        .catch(function () {
          loggedInUsername = "";
          showView("adminLogin");
        });
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  // ─── Init ────────────────────────────────────────────────────────────────────
  fetch("/api/admin/bookings", { credentials: "include" })
    .then(function (res) {
      if (res.ok) {
        showView("adminDashboard");
        renderBasePrices();
        renderSeasonal();
        loadBlockDates();
        loadBookings();
      } else {
        showView("adminLogin");
      }
    })
    .catch(function () {
      showView("adminLogin");
    });
})();
