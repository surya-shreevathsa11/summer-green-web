// middleware/isAuthenticated.js
const isAuthenticated = (req, res, next) => {
  console.log("headers log mid", req.headers);
  if (req.isAuthenticated()) {
    return next(); // session valid, user exists
  }
  res.status(401).json({ message: "Unauthorized" });
};

export default isAuthenticated;
