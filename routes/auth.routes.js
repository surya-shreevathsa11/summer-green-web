import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/google", passport.authenticate("google"));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    console.log(res);
    res.redirect("/");
  },
);

router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      loggedIn: true,
      user: req.user,
    });
  }

  res.json({ loggedIn: false });
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

export default router;
