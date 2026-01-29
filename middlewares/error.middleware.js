import AppError from "../utils/AppError.js";

const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Default values
  error.statusCode = error.statusCode || 500;
  error.message = error.message || "Internal Server Error";

  // Development vs Production (optional)
  if (process.env.NODE_ENV === "development") {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      stack: error.stack,
    });
  }

  // Production
  return res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

export default errorMiddleware;
