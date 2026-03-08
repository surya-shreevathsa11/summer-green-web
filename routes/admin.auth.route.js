import { Router } from "express";
import { login, verifyOTP } from "../controllers/admin.auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/verify-otp", verifyOTP);

export default router;
