import express from "express";
const router = express.Router();

import {
  addToCart,
  availabilityAndPrice,
  listCart,
} from "../controllers/booking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

router.get("/cart", isAuthenticated, listCart);
router.post("/cart", isAuthenticated, addToCart);
router.post("/checkAvailability", availabilityAndPrice);

export default router;
