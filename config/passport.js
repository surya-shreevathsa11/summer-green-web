import passport from "passport";
import GoogleOidcStrategy from "passport-google-oidc";
import User from "../models/user.model.js";

passport.use(
  "google",
  new GoogleOidcStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI,
      scope: ["openid", "profile", "email"],
    },
    async function verify(issuer, profile, done) {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;

        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.create({
            googleId,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value,
          });
        }

        return done(null, user);
      } catch (err) {
        done(err, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
