import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

export const protect = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) throw new AppError("Not authenticated", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
};
