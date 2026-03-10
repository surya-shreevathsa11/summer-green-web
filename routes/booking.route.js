import express from "express";
const router = express.Router();

import {
  addToCart,
  availabilityAndPrice,
  listCart,
  listRooms,
  deleteRoomFromCart,
  bookRooms,
  listBookings,
} from "../controllers/booking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

// Public gallery (no auth) for main page
import { getGallery } from "../controllers/admin.gallery.controller.js";
router.get("/gallery", getGallery);

router.get("/rooms", listRooms);
router.get("/bookings", isAuthenticated, listBookings);
router.get("/cart", isAuthenticated, listCart);
router.post("/cart", isAuthenticated, addToCart);
router.post("/checkAvailability", availabilityAndPrice);
router.delete("/cart", isAuthenticated, deleteRoomFromCart);

//booking
router.post("/checkout", isAuthenticated, bookRooms);

export default router;
