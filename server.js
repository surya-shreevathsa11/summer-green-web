import express from "express";
import cors from "cors";
import path from "path";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";

//specific to esm
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { ROOMS } from "./constants.js";

import connectDB from "./db.js";

const app = express();

app.use(express.json({ limit: "128kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

import authRouter from "./routes/authRoutes.js";

app.use("/api/auth", authRouter);
app.get("/api/booking/rooms", (_req, res) => {
  res.json({ success: true, rooms: ROOMS });
});

const adminEmails = (process.env.ADMIN_EMAIL || "").split(",").map((e) => e.trim()).filter(Boolean);
function isAdmin(req) {
  return req.isAuthenticated() && req.user?.email && adminEmails.includes(req.user.email);
}
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/api/admin/me", (req, res) => {
  const loggedIn = req.isAuthenticated();
  if (!loggedIn) return res.status(403).json({ isAdmin: false, loggedIn: false });
  if (!isAdmin(req)) return res.status(403).json({ isAdmin: false, loggedIn: true });
  res.json({ isAdmin: true, user: req.user });
});
app.get("/api/admin/bookings", (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
  res.json({ success: true, bookings: [] });
});

connectDB().then(() => {
  const port = process.env.PORT;
  app.listen(port, () => {
    console.log("Server running at port", port);
  });
});
