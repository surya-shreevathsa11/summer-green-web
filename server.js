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

connectDB().then(() => {
  const port = process.env.PORT;
  app.listen(port, () => {
    console.log("Server running at port", port);
  });
});
