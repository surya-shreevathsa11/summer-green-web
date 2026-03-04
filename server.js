import express from "express";
import cors from "cors";
import path from "path";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import MongoStore from "connect-mongo";

import "./config/passport.js";

//specific to esm
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { ROOMS } from "./constants.js";

import connectDB from "./db.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: "128kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60 * 24,
    }),

    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false, // true in production (HTTPS)
      sameSite: "lax",
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

import authRouter from "./routes/auth.routes.js";

app.use("/api/auth", authRouter);

import { addInitalPrices } from "./config/addInitialRoom.js";
addInitalPrices();

connectDB().then(() => {
  const port = process.env.PORT;
  app.listen(port, () => {
    console.log("Server running at port", port);
  });
});