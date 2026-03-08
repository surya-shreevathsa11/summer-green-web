import { Router } from "express";
import { verifyJWT } from "../middleware/admin.middleware.js";

import { getBooking, updateBooking } from "../controllers/admin.controller.js";

const router = Router();

router.get("/bookings", verifyJWT, getBooking); // Get all bookings
router.patch("/bookings/:bookingId", verifyJWT, updateBooking); // Update booking

export default router;
