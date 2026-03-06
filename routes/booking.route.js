import express from "express";
const router = express.Router();

import { addToCart } from "../controllers/booking.controller.js";
import isAuthenticated from "../middleware/auth.middleware.js";

router.post("/cart", isAuthenticated, addToCart);

export default router;
