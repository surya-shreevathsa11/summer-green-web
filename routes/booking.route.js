import express from "express";
const router = express.Router();

<<<<<<< HEAD
import {
  addToCart,
  availabilityAndPrice,
  listCart,
} from "../controllers/booking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

router.get("/cart", isAuthenticated, listCart);
router.post("/cart", isAuthenticated, addToCart);
router.post("/checkAvailability", availabilityAndPrice);
=======
import { addToCart } from "../controllers/booking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

router.post("/cart", isAuthenticated, addToCart);
>>>>>>> 1399671 (serverjs merge conflict resolved)

export default router;
