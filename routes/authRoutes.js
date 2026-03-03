import express from "express";
import passport from "passport";
import GoogleOidcStrategy from "passport-google-oidc";

const router = express.Router();

// --- OIDC Strategy ---
passport.use(
  new GoogleOidcStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI,
      scope: ["openid", "email", "profile"],
    },
    (issuer, profile, done) => {
      // issuer = 'https://accounts.google.com'
      const user = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatar: profile.photos?.[0]?.value,
      };

      return done(null, user);
    },
  ),
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// --- Routes ---

// Trigger Google OIDC login
router.get("/google", passport.authenticate("google"));

// Google redirects back here
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  },
);

// Auth status
router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });

    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

export default router;
