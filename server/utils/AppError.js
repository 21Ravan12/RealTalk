// utils/AppError.js
export default class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // sadece bilinen hatalar için
    Error.captureStackTrace(this, this.constructor);
  }
}
