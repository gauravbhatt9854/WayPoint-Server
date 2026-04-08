const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, "SECRET");
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(401);
  }
};

export default authMiddleware;