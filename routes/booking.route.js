import express from "express";
const router = express.Router();

import {
  addToCart,
  availabilityAndPrice,
  listCart,
  listRooms,
  deleteRoomFromCart,
  createCheckoutOrder,
} from "../controllers/booking.controller.js";

router.get("/rooms", listRooms);
router.get("/cart", listCart);
router.post("/cart", addToCart);
router.post("/checkAvailability", availabilityAndPrice);
router.delete("/cart", deleteRoomFromCart);
router.post("/checkout", createCheckoutOrder);

export default router;
