1. User visits your app and clicks "Login with Google"
   ↓
2. Browser hits GET /api/auth/google
   ↓
3. passport.authenticate("google") redirects the browser to Google's servers
   (e.g. https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...)
   ↓
4. User logs in on Google's login page
   ↓
5. Google redirects the browser back to your callbackURL
   → GET /api/auth/google/callback?code=xyz&state=abc
   ↓
6. passport.authenticate("google") on that route exchanges the code for tokens,
   then calls your verify function in passport.js
   ↓
7. verify finds/creates the user, calls done(null, user)
   ↓
8. passport serializes the user, sets the session cookie
   ↓
9. res.redirect("/") sends user to your app, now logged in
