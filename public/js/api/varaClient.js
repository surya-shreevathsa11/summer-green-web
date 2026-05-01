(function (global) {
  "use strict";

  var STORAGE_KEY = "vara_guest_token";
  var USER_STORAGE_KEY = "vara_guest_profile";

  function getConfig() {
    var cfg = global.__VARA_CONFIG || {};
    var baseUrl = (cfg.apiBaseUrl || global.location.origin || "").replace(/\/$/, "");
    var propertySlug = cfg.propertySlug || "";
    return {
      apiBaseUrl: baseUrl,
      propertySlug: propertySlug,
    };
  }

  function readGuestToken() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_err) {
      return null;
    }
  }

  function saveGuestToken(token) {
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_err) {}
  }

  function readGuestProfile() {
    try {
      var raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  function saveGuestProfile(profile) {
    try {
      if (profile) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(USER_STORAGE_KEY);
    } catch (_err) {}
  }

  function clearGuestSession() {
    saveGuestToken(null);
    saveGuestProfile(null);
  }

  function createError(message, status, payload) {
    var err = new Error(message || "Request failed");
    err.status = status || 0;
    err.payload = payload;
    err.isAuthError = status === 401 || status === 403;
    return err;
  }

  function getMessageFromPayload(payload, fallback) {
    if (!payload) return fallback;
    if (typeof payload === "string") return payload;
    return (
      payload.message ||
      payload.error ||
      payload.detail ||
      (payload.meta && payload.meta.message) ||
      fallback
    );
  }

  function parseJsonSafe(response) {
    return response
      .json()
      .catch(function () {
        return null;
      });
  }

  function makeIdempotencyKey() {
    return "vara-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  async function request(path, options) {
    var cfg = getConfig();
    var opts = options || {};
    var method = opts.method || "GET";
    var token = readGuestToken();
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body != null && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (opts.requiresAuth && token) {
      headers.Authorization = "Bearer " + token;
    }
    if (opts.idempotent) {
      headers["X-Idempotency-Key"] = opts.idempotencyKey || makeIdempotencyKey();
    }

    var response = await fetch(cfg.apiBaseUrl + path, {
      method: method,
      headers: headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });

    var payload = await parseJsonSafe(response);
    if (!response.ok) {
      throw createError(
        getMessageFromPayload(payload, "Unable to process request"),
        response.status,
        payload
      );
    }
    return payload;
  }

  async function requestWithRetry(path, options) {
    var opts = options || {};
    var retries = typeof opts.retries === "number" ? opts.retries : 1;
    var lastErr = null;
    for (var attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await request(path, opts);
      } catch (err) {
        lastErr = err;
        var shouldRetry =
          attempt < retries &&
          !err.isAuthError &&
          (err.status === 0 || err.status >= 500);
        if (!shouldRetry) throw err;
        await new Promise(function (resolve) {
          setTimeout(resolve, 250 * (attempt + 1));
        });
      }
    }
    throw lastErr || createError("Request failed", 0, null);
  }

  function normalizeRooms(payload) {
    var list =
      (payload && payload.data && payload.data.rooms) ||
      (payload && payload.rooms) ||
      (payload && payload.data) ||
      [];
    return (Array.isArray(list) ? list : []).map(function (room, idx) {
      var cap = room.capacity || {};
      return {
        id: room.id || room.roomId || String(idx + 1),
        roomId: room.roomId || room.id || "",
        name: room.name || room.title || "Room",
        description: room.description || "",
        price: room.pricePerNight != null ? room.pricePerNight : room.price || 0,
        capacity: {
          adults:
            cap.adultsOnly != null
              ? cap.adultsOnly
              : cap.adults != null
                ? cap.adults
                : 20,
          children: cap.children != null ? cap.children : 20,
          adultsOnly: cap.adultsOnly != null ? cap.adultsOnly : undefined,
          adultsWithChildren: cap.adults != null ? cap.adults : undefined,
        },
        images: room.images || { banner: null, gallery: [] },
      };
    });
  }

  function extractCartItems(payload) {
    var list =
      (payload && payload.data && payload.data.items) ||
      (payload && payload.data && payload.data.cartItems) ||
      (payload && payload.data && payload.data.roomInfo) ||
      (payload && payload.data && payload.data.rooms) ||
      (payload && payload.data && payload.data.cart && payload.data.cart.items) ||
      (payload && payload.data && payload.data.cart && payload.data.cart.cartItems) ||
      (payload && payload.items) ||
      (payload && payload.cartItems) ||
      (payload && payload.roomInfo) ||
      (payload && payload.rooms) ||
      (payload && payload.cart && payload.cart.items) ||
      (payload && payload.cart && payload.cart.cartItems) ||
      (payload && payload.message) ||
      (payload && payload.data) ||
      [];

    if (!Array.isArray(list) && list && typeof list === "object") {
      if (Array.isArray(list.items)) list = list.items;
      else if (Array.isArray(list.cartItems)) list = list.cartItems;
      else if (Array.isArray(list.roomInfo)) list = list.roomInfo;
      else if (Array.isArray(list.rooms)) list = list.rooms;
      else list = [];
    }

    if (!Array.isArray(list)) return [];
    return list;
  }

  function normalizeCartItem(item) {
      var room = (item && item.room) || (item && item.roomDetails) || {};
      var pricing = (item && item.pricing) || {};
    return {
      itemId: (item && (item.itemId || item.id || item.cartItemId)) || null,
      roomId: (item && item.roomId) || room.roomId || room.id || null,
      roomName: (item && item.roomName) || room.name || null,
      checkIn: (item && (item.checkIn || item.startDate)) || null,
      checkOut: (item && (item.checkOut || item.endDate)) || null,
      adults:
        item && item.adults != null
          ? item.adults
          : item && item.guests && item.guests.adults != null
            ? item.guests.adults
            : 1,
      children:
        item && item.children != null
          ? item.children
          : item && item.guests && item.guests.children != null
            ? item.guests.children
            : 0,
      price:
        (item && (item.price || item.total || item.totalAmount || item.payableAmount)) ||
        pricing.total ||
        pricing.totalAmount ||
        0,
      priceBreakdown:
        (item && item.priceBreakdown) ||
        pricing.breakdown ||
        [],
      prepaidOptions: (item && item.prepaidOptions) || [],
      lowerPrepaidAmount: item && item.lowerPrepaidAmount != null ? item.lowerPrepaidAmount : null,
      upperPrepaidAmount: item && item.upperPrepaidAmount != null ? item.upperPrepaidAmount : null,
      type: item && item.type ? item.type : room.type || null,
    };
  }

  function normalizeCart(payload) {
    return extractCartItems(payload).map(normalizeCartItem);
  }

  function normalizeCartSummary(payload, items) {
    var totalPrice =
      (payload && payload.totalPrice) ||
      (payload && payload.data && payload.data.totalPrice) ||
      (payload && payload.cart && payload.cart.totalPrice) ||
      items.reduce(function (sum, it) {
        return sum + (Number(it.price) || 0);
      }, 0);
    return {
      totalPrice: Number(totalPrice) || 0,
      lowerPayableTotal:
        (payload && payload.lowerPayableTotal) ||
        (payload && payload.data && payload.data.lowerPayableTotal) ||
        null,
      upperPayableTotal:
        (payload && payload.upperPayableTotal) ||
        (payload && payload.data && payload.data.upperPayableTotal) ||
        null,
      lowerPercent:
        (payload && payload.lowerPercent) ||
        (payload && payload.data && payload.data.lowerPercent) ||
        null,
      upperPercent:
        (payload && payload.upperPercent) ||
        (payload && payload.data && payload.data.upperPercent) ||
        null,
    };
  }

  function normalizeBookings(payload) {
    var list =
      (payload && payload.data && payload.data.bookings) ||
      (payload && payload.bookings) ||
      (payload && payload.data) ||
      [];
    return Array.isArray(list) ? list : [];
  }

  var VaraApi = {
    getConfig: getConfig,
    readGuestToken: readGuestToken,
    saveGuestToken: saveGuestToken,
    readGuestProfile: readGuestProfile,
    saveGuestProfile: saveGuestProfile,
    clearGuestSession: clearGuestSession,
    createError: createError,
    requestWithRetry: requestWithRetry,
    normalizeRooms: normalizeRooms,
    normalizeCart: normalizeCart,
    normalizeBookings: normalizeBookings,

    async getPublicRooms() {
      var cfg = getConfig();
      if (!cfg.propertySlug) throw createError("Property slug is not configured", 0, null);
      var payload = await requestWithRetry(
        "/api/public/properties/" + encodeURIComponent(cfg.propertySlug) + "/rooms",
        { retries: 1 }
      );
      return normalizeRooms(payload);
    },

    async getPublicRoomsPayload() {
      var cfg = getConfig();
      if (!cfg.propertySlug) throw createError("Property slug is not configured", 0, null);
      return requestWithRetry(
        "/api/public/properties/" + encodeURIComponent(cfg.propertySlug) + "/rooms",
        { retries: 1 }
      );
    },

    async getPublicQuote(input) {
      var cfg = getConfig();
      if (!cfg.propertySlug) throw createError("Property slug is not configured", 0, null);
      return requestWithRetry(
        "/api/public/properties/" + encodeURIComponent(cfg.propertySlug) + "/quote",
        { method: "POST", body: input, retries: 1, idempotent: true }
      );
    },

    async requestGuestPin(input) {
      return requestWithRetry("/api/guest-auth/request-pin", {
        method: "POST",
        body: input,
        retries: 1,
        idempotent: true,
      });
    },

    async verifyGuestPin(input) {
      var payload = await requestWithRetry("/api/guest-auth/verify-pin", {
        method: "POST",
        body: input,
        retries: 1,
        idempotent: true,
      });
      var token =
        (payload && payload.data && (payload.data.token || payload.data.guestToken)) ||
        payload.guestToken ||
        payload.token ||
        payload.jwt ||
        payload.accessToken ||
        null;
      if (!token) {
        throw createError("Guest authentication token missing in response", 0, payload);
      }
      saveGuestToken(token);
      saveGuestProfile((payload && payload.data && payload.data.guest) || payload.guest || null);
      return payload;
    },

    async getGuestRooms() {
      return requestWithRetry("/api/guest/bookings/rooms", {
        requiresAuth: true,
        retries: 1,
      });
    },

    async getGuestQuote(input) {
      return requestWithRetry("/api/guest/bookings/quote", {
        method: "POST",
        requiresAuth: true,
        body: input,
        retries: 1,
        idempotent: true,
      });
    },

    async getGuestCart() {
      var details = await this.getGuestCartDetails();
      return details.items;
    },

    async getGuestCartDetails() {
      var payload = await requestWithRetry("/api/guest/bookings/cart", {
        requiresAuth: true,
        retries: 1,
      });
      var items = normalizeCart(payload);
      return {
        items: items,
        summary: normalizeCartSummary(payload, items),
        raw: payload,
      };
    },

    async addGuestCartItem(input) {
      return requestWithRetry("/api/guest/bookings/cart/items", {
        method: "POST",
        requiresAuth: true,
        body: input,
        retries: 1,
        idempotent: true,
      });
    },

    async deleteGuestCartItem(input) {
      return requestWithRetry("/api/guest/bookings/cart/items", {
        method: "DELETE",
        requiresAuth: true,
        body: input,
        retries: 1,
        idempotent: true,
      });
    },

    async getGuestBookings() {
      var payload = await requestWithRetry("/api/guest/bookings", {
        requiresAuth: true,
        retries: 1,
      });
      return normalizeBookings(payload);
    },

    async createPaymentOrder(input) {
      return requestWithRetry("/api/guest/payments/order", {
        method: "POST",
        requiresAuth: true,
        body: input,
        retries: 1,
        idempotent: true,
      });
    },

    async verifyPayment(input) {
      return requestWithRetry("/api/guest/payments/verify", {
        method: "POST",
        requiresAuth: true,
        body: input,
        retries: 1,
        idempotent: true,
      });
    },
  };

  global.VaraApi = VaraApi;
})(window);
