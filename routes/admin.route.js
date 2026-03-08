import { Router } from "express";
import { verifyJWT } from "../middleware/admin.middleware.js";

import {
  getBooking,
  updateBooking,
  updateBasePrices,
  addSeasonalPrice,
  getSeasonalPrices,
  deleteSeasonalPrice,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/bookings", verifyJWT, getBooking); // Get all bookings
router.patch("/bookings/:bookingId", verifyJWT, updateBooking); // Update booking

router.put("/base-price", verifyJWT, updateBasePrices);
router.post("/seasonal-price", verifyJWT, addSeasonalPrice);
router.get("/seasonal-price", verifyJWT, getSeasonalPrices);
router.delete("/seasonal-price/:id", verifyJWT, deleteSeasonalPrice);
export default router;
