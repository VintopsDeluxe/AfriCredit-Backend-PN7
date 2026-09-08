// src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

/**
 * Middleware to verify JWT authentication token
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized: Missing token', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Unauthorized: Invalid or expired token', 401));
  }
};

/**
 * Middleware to authorize specific user roles
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient privileges', 403));
    }
    next();
  };
};

export const authorizeAdmin = authorizeRoles('admin');